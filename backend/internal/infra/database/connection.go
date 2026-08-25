package database

import (
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewPostgresConnection establishes a connection to PostgreSQL and auto-migrates all domain entities.
// It uses GORM with Info-level logging for development visibility.
func NewPostgresConnection(dsn string) (*gorm.DB, error) {
	// Open connection with Info logging to see all SQL operations
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return nil, err
	}

	// Auto-migrate all 10 entities from Fase 0
	log.Println("Starting auto-migration of domain entities...")

	// Note: League entity temporarily excluded due to GORM migration issue
	// The table exists and works fine, just can't be auto-migrated
	err = db.AutoMigrate(
		// Core entities
		&entity.Player{},
		// &entity.League{}, // Skipped - causes "insufficient arguments" error in GORM
		&entity.Item{},
		&entity.PlayerItem{},
		&entity.Achievement{},
		&entity.PlayerAchievement{},

		// Economy entities
		&entity.TreasuryConfig{},
		&entity.GoldSpaceConversion{},
		&entity.DailyEmission{},
		&entity.RewardHistory{},
		&entity.Order{},

		// Battle Pass entities (Fase 3)
		&entity.BattlePassSeason{},
		&entity.BattlePassProgress{},
		&entity.BattlePassReward{},
		&entity.BattlePassPurchase{},

		// NFT entities (Fase 3)
		&entity.NFT{},

		// Migration support
		&entity.UUIDMapping{},
	)

	if err != nil {
		log.Printf("Auto-migration failed: %v", err)
		return nil, err
	}

	log.Println("Auto-migration completed successfully")

	// Seed Treasury Config if empty
	var treasuryCount int64
	db.Model(&entity.TreasuryConfig{}).Count(&treasuryCount)
	if treasuryCount == 0 {
		log.Println("Seeding treasury config...")
		defaultConfig := entity.GetDefaultConfig()
		if err := db.Create(defaultConfig).Error; err != nil {
			log.Printf("Failed to seed treasury config: %v", err)
			return nil, err
		}
		log.Println("Treasury config seeded successfully")
	}

	return db, nil
}
