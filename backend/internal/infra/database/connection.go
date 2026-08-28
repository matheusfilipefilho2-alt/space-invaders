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

	// Auto-migration disabled - using goose migrations instead
	// The database schema is managed by SQL migrations in database/migrations/
	log.Println("Database connection established (schema managed by goose migrations)")

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
