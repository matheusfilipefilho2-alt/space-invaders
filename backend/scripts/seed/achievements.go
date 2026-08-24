package main

import (
	"context"
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

// SeedAchievements populates the achievements table with initial achievement data
func SeedAchievements(ctx context.Context, db *gorm.DB) error {
	log.Println("\n🏆 Seeding Achievements...")

	// Check if already seeded
	var count int64
	if err := db.Model(&entity.Achievement{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("   ⏭️  Achievements already seeded (%d records), skipping...", count)
		return nil
	}

	// Get seed data from entity
	achievements := entity.SeedAchievements()

	// Insert each achievement
	for _, achievement := range achievements {
		if err := db.WithContext(ctx).Create(&achievement).Error; err != nil {
			return err
		}
		log.Printf("   ✓ %s [%s] - %d gold %s",
			achievement.Name, achievement.Rarity, achievement.RewardGold, achievement.Icon)
	}

	log.Printf("   ✅ Successfully seeded %d achievements\n", len(achievements))
	return nil
}
