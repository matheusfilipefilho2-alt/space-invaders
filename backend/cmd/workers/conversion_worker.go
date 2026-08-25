package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/blockchain"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	pollInterval    = 30 * time.Second  // Poll every 30 seconds
	batchSize       = 10                // Process up to 10 conversions per batch
	processingDelay = 2 * time.Second   // Delay between processing each conversion
)

func main() {
	log.Println("Starting Conversion Worker...")

	// Load config
	if err := configs.LoadConfig(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	dbURL := configs.GetDatabaseURL()
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize repositories and services
	conversionRepo := database.NewConversionRepository(db)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionService := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)

	// Initialize Solana adapter
	solanaConfig := configs.GetSolanaConfig()
	solanaAdapter, err := blockchain.NewSolanaAdapter(&solanaConfig)
	if err != nil {
		log.Fatalf("Failed to initialize Solana adapter: %v", err)
	}

	// Create worker
	worker := &ConversionWorker{
		db:                db,
		conversionService: conversionService,
		conversionRepo:    conversionRepo,
		solanaAdapter:     solanaAdapter,
	}

	// Setup graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutdown signal received, stopping worker...")
		cancel()
	}()

	// Run worker
	log.Printf("Worker started. Polling every %v for pending conversions...", pollInterval)
	worker.Run(ctx)

	log.Println("Conversion Worker stopped.")
}

type ConversionWorker struct {
	db                *gorm.DB
	conversionService *service.ConversionService
	conversionRepo    repository.ConversionRepository
	solanaAdapter     *blockchain.SolanaAdapter
}

func (w *ConversionWorker) Run(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	// Process immediately on startup
	w.processPendingConversions(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("Context cancelled, stopping worker")
			return
		case <-ticker.C:
			w.processPendingConversions(ctx)
		}
	}
}

func (w *ConversionWorker) processPendingConversions(ctx context.Context) {
	// Get pending conversions
	conversions, err := w.conversionRepo.ListPending(ctx, batchSize)
	if err != nil {
		log.Printf("Error fetching pending conversions: %v", err)
		return
	}

	if len(conversions) == 0 {
		log.Println("No pending conversions to process")
		return
	}

	log.Printf("Found %d pending conversions to process", len(conversions))

	for _, conversion := range conversions {
		if err := w.processConversion(ctx, &conversion); err != nil {
			log.Printf("Error processing conversion %d: %v", conversion.ID, err)
			// Mark as failed
			if failErr := w.conversionService.MarkConversionFailed(ctx, conversion.ID); failErr != nil {
				log.Printf("Error marking conversion %d as failed: %v", conversion.ID, failErr)
			}
		} else {
			log.Printf("Successfully processed conversion %d", conversion.ID)
		}

		// Small delay between processing to avoid overwhelming Solana RPC
		time.Sleep(processingDelay)
	}
}

func (w *ConversionWorker) processConversion(ctx context.Context, conversion *entity.GoldSpaceConversion) error {
	log.Printf("Processing conversion %d: %d Gold → %d SPACE (player %d)",
		conversion.ID, conversion.GoldAmount, conversion.SpaceAmount, conversion.PlayerID)

	// Get player to get their Solana wallet address
	var player entity.Player
	if err := w.db.First(&player, conversion.PlayerID).Error; err != nil {
		return fmt.Errorf("failed to get player: %w", err)
	}

	if player.SolanaWallet == nil || *player.SolanaWallet == "" {
		return fmt.Errorf("player %d has no Solana wallet address", player.ID)
	}

	// Mint SPACE tokens to player's wallet
	txSignature, err := w.solanaAdapter.MintTokens(ctx, *player.SolanaWallet, conversion.SpaceAmount)
	if err != nil {
		return fmt.Errorf("failed to mint tokens: %w", err)
	}

	log.Printf("Minted %d SPACE to %s, tx: %s", conversion.SpaceAmount, player.SolanaWallet, txSignature)

	// Mark conversion as completed
	if err := w.conversionService.MarkConversionCompleted(ctx, conversion.ID, txSignature); err != nil {
		return fmt.Errorf("failed to mark conversion as completed: %w", err)
	}

	return nil
}
