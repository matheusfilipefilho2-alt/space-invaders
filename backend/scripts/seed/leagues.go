package main

import (
	"context"
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

// SeedLeagues populates the leagues table with initial tier data
func SeedLeagues(ctx context.Context, db *gorm.DB) error {
	log.Println("\n📊 Seeding Leagues...")

	// Check if already seeded
	var count int64
	if err := db.Model(&entity.League{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("   ⏭️  Leagues already seeded (%d records), skipping...", count)
		return nil
	}

	// Get seed data from entity
	leagues := entity.SeedLeagues()

	// Insert each league
	for _, league := range leagues {
		if err := db.WithContext(ctx).Create(&league).Error; err != nil {
			return err
		}
		log.Printf("   ✓ %s (%d - %d points) %s",
			league.Name, league.MinPoints, league.MaxPoints, league.Icon)
	}

	log.Printf("   ✅ Successfully seeded %d leagues\n", len(leagues))
	return nil
}
