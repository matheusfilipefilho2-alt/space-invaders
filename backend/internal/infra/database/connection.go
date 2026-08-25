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

	err = db.AutoMigrate(
		// Core entities
		&entity.Player{},
		&entity.League{},
		&entity.Item{},
		&entity.PlayerItem{},
		&entity.Achievement{},
		&entity.PlayerAchievement{},

		// Economy entities
		&entity.GoldSpaceConversion{},
		&entity.DailyEmission{},
		&entity.RewardHistory{},
		&entity.Order{},

		// Migration support
		&entity.UUIDMapping{},
	)

	if err != nil {
		log.Printf("Auto-migration failed: %v", err)
		return nil, err
	}

	log.Println("Auto-migration completed successfully")

	return db, nil
}
