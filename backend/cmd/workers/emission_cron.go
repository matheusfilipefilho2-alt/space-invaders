package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/blockchain"
	"github.com/yourusername/space-invaders/internal/infra/cache"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"github.com/yourusername/space-invaders/internal/infra/external"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	log.Println("Starting Emission Cron Job...")

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

	// Initialize Redis cache
	redisClient, err := cache.NewRedisClient()
	if err != nil {
		log.Printf("Warning: Failed to initialize Redis: %v. Price fetching will not work.", err)
	}

	// Initialize services
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := external.NewCachedPriceFetcher(redisClient)
	emissionService := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)

	// Initialize Solana adapter
	solanaConfig := configs.GetSolanaConfig()
	solanaAdapter, err := blockchain.NewSolanaAdapter(&solanaConfig)
	if err != nil {
		log.Fatalf("Failed to initialize Solana adapter: %v", err)
	}

	// Create job executor
	executor := &EmissionJobExecutor{
		db:              db,
		emissionService: emissionService,
		treasuryRepo:    treasuryRepo,
		solanaAdapter:   solanaAdapter,
	}

	// Setup cron scheduler
	// "0 0 * * *" = Every day at 00:00 UTC
	c := cron.New(cron.WithLocation(time.UTC))
	_, err = c.AddFunc("0 0 * * *", func() {
		log.Println("Executing daily emission calculation...")
		if err := executor.ExecuteDailyEmission(context.Background()); err != nil {
			log.Printf("Error executing daily emission: %v", err)
		}
	})
	if err != nil {
		log.Fatalf("Failed to add cron job: %v", err)
	}

	c.Start()
	log.Println("Emission cron job started. Running daily at 00:00 UTC.")

	// For testing: also execute immediately on startup if --now flag is provided
	if len(os.Args) > 1 && os.Args[1] == "--now" {
		log.Println("Executing emission immediately (--now flag)...")
		if err := executor.ExecuteDailyEmission(context.Background()); err != nil {
			log.Printf("Error executing immediate emission: %v", err)
		}
	}

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutdown signal received, stopping cron...")
	c.Stop()
	log.Println("Emission cron job stopped.")
}

type EmissionJobExecutor struct {
	db              *gorm.DB
	emissionService *service.EmissionCalculatorService
	treasuryRepo    repository.TreasuryRepository
	solanaAdapter   *blockchain.SolanaAdapter
}

func (e *EmissionJobExecutor) ExecuteDailyEmission(ctx context.Context) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	log.Printf("Calculating daily emission for %s", today.Format("2006-01-02"))

	// Check if emission already executed for today
	existing, err := e.treasuryRepo.GetDailyEmission(ctx, today)
	if err == nil && existing != nil && existing.Executed {
		log.Printf("Emission for %s already executed, skipping", today.Format("2006-01-02"))
		return nil
	}

	// TODO: Get actual gameplay rewards and revenue from database
	// For now, using placeholder values
	gameplayRewards := uint64(10000) // TODO: Sum of Gold earned from gameplay yesterday
	revenue24h := uint64(5000)       // TODO: Sum of PIX payments in last 24h (in cents)

	log.Printf("Input data: gameplayRewards=%d Gold, revenue24h=%d cents", gameplayRewards, revenue24h)

	// Calculate emission
	emission, err := e.emissionService.CalculateDailyEmission(ctx, gameplayRewards, revenue24h, today)
	if err != nil {
		return fmt.Errorf("failed to calculate emission: %w", err)
	}

	log.Printf("Calculated emission: %d SPACE (lamports)", emission.EmissionUsed)
	log.Printf("Emission breakdown: limit=%d, used=%d, available=%d",
		emission.EmissionLimit, emission.EmissionUsed, emission.EmissionAvailable)

	// Get treasury wallet address
	config, err := e.treasuryRepo.GetConfig(ctx)
	if err != nil {
		return fmt.Errorf("failed to get treasury config: %w", err)
	}

	if config.TreasuryWalletPubkey == "" {
		return fmt.Errorf("treasury wallet not configured")
	}

	// Mint SPACE to treasury wallet
	txSignature, err := e.solanaAdapter.MintTokens(ctx, config.TreasuryWalletPubkey, emission.EmissionUsed)
	if err != nil {
		return fmt.Errorf("failed to mint tokens to treasury: %w", err)
	}

	log.Printf("Minted %d SPACE to treasury %s, tx: %s",
		emission.EmissionUsed, config.TreasuryWalletPubkey, txSignature)

	// Mark as executed
	emission.Executed = true
	emission.TxHash = txSignature

	// Save emission record
	if err := e.emissionService.SaveDailyEmission(ctx, emission); err != nil {
		return fmt.Errorf("failed to save emission record: %w", err)
	}

	log.Printf("Daily emission completed successfully for %s", today.Format("2006-01-02"))
	return nil
}
