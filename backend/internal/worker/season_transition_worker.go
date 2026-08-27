package worker

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

// SeasonTransitionWorker handles Battle Pass season lifecycle
type SeasonTransitionWorker struct {
	battlePassRepo repository.BattlePassRepository
	autoCreate     bool // Whether to automatically create new seasons
}

// NewSeasonTransitionWorker creates a new season transition worker
func NewSeasonTransitionWorker(battlePassRepo repository.BattlePassRepository, autoCreate bool) *SeasonTransitionWorker {
	return &SeasonTransitionWorker{
		battlePassRepo: battlePassRepo,
		autoCreate:     autoCreate,
	}
}

// Run executes the season transition check
func (w *SeasonTransitionWorker) Run(ctx context.Context) error {
	log.Println("🔄 Running season transition worker...")

	// Get current active season
	season, err := w.battlePassRepo.GetCurrentSeason(ctx)
	if err != nil {
		// No active season found - this is okay
		log.Println("ℹ️  No active season found")

		if w.autoCreate {
			log.Println("🆕 Auto-creating new season...")
			return w.createNewSeason(ctx)
		}
		return nil
	}

	// Check if season has expired
	now := time.Now()
	if now.After(season.EndDate) {
		log.Printf("⏰ Season '%s' (ID: %d) has expired. End date: %s\n",
			season.Name, season.ID, season.EndDate.Format("2006-01-02"))

		// Mark season as inactive
		if err := w.expireSeason(ctx, season); err != nil {
			return fmt.Errorf("failed to expire season: %w", err)
		}

		// Create new season if auto-create is enabled
		if w.autoCreate {
			log.Println("🆕 Auto-creating new season...")
			if err := w.createNewSeason(ctx); err != nil {
				return fmt.Errorf("failed to create new season: %w", err)
			}
		}
	} else {
		daysLeft := int(time.Until(season.EndDate).Hours() / 24)
		log.Printf("✅ Season '%s' is active. Days remaining: %d\n", season.Name, daysLeft)
	}

	return nil
}

// expireSeason marks a season as inactive
func (w *SeasonTransitionWorker) expireSeason(ctx context.Context, season *entity.BattlePassSeason) error {
	log.Printf("📦 Archiving season '%s' (ID: %d)...\n", season.Name, season.ID)

	// Update season to inactive
	season.Active = false
	if err := w.battlePassRepo.UpdateSeason(ctx, season); err != nil {
		return fmt.Errorf("failed to update season: %w", err)
	}

	log.Printf("✅ Season '%s' archived successfully\n", season.Name)
	return nil
}

// createNewSeason creates a new Battle Pass season
func (w *SeasonTransitionWorker) createNewSeason(ctx context.Context) error {
	// Get the last season number
	seasonNumber := 1

	// Try to get the most recent season to increment number
	lastSeason, err := w.battlePassRepo.GetCurrentSeason(ctx)
	if err == nil {
		// Extract number from name (e.g., "Season 1: Title" -> 2)
		// For simplicity, just increment from 1
		seasonNumber = int(lastSeason.ID) + 1
	}

	now := time.Now()
	newSeason := &entity.BattlePassSeason{
		Name:        fmt.Sprintf("Season %d: Auto-Generated", seasonNumber),
		Description: "Automatically generated season by the system",
		StartDate:   now,
		EndDate:     now.AddDate(0, 1, 0), // 1 month duration
		Active:      true,
		MaxTier:     50,
		XPPerTier:   100,
		ImageURL:    "https://placeholder.co/800x400/667eea/ffffff?text=Season+" + fmt.Sprint(seasonNumber),
	}

	if err := w.battlePassRepo.CreateSeason(ctx, newSeason); err != nil {
		return fmt.Errorf("failed to create season: %w", err)
	}

	log.Printf("✅ New season created: '%s' (ID: %d)\n", newSeason.Name, newSeason.ID)
	log.Printf("   Start: %s, End: %s\n",
		newSeason.StartDate.Format("2006-01-02"),
		newSeason.EndDate.Format("2006-01-02"))

	return nil
}

// RunDaily runs the worker in a loop, executing once per day
func (w *SeasonTransitionWorker) RunDaily(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start
	if err := w.Run(ctx); err != nil {
		log.Printf("❌ Season transition worker error: %v\n", err)
	}

	// Then run daily
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Season transition worker stopped")
			return
		case <-ticker.C:
			if err := w.Run(ctx); err != nil {
				log.Printf("❌ Season transition worker error: %v\n", err)
			}
		}
	}
}
