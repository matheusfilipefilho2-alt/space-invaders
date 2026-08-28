package main

import (
	"context"
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedPlayers populates the players table with test players
func SeedPlayers(ctx context.Context, db *gorm.DB) error {
	log.Println("\n👤 Seeding Players...")

	// Check if already seeded
	var count int64
	if err := db.Model(&entity.Player{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("   ⏭️  Players already seeded (%d records), skipping...", count)
		return nil
	}

	// Hash password for test users
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Create test players
	players := []entity.Player{
		{
			Username:     "test",
			Email:        "test@example.com",
			PasswordHash: string(hashedPassword),
			GoldBalance:  1000,
			HighScore:    5000,
			RankPoints:   1500,
			LeagueID:     2, // Silver
			TotalGames:   50,
			TotalKills:   500,
		},
		{
			Username:     "player1",
			Email:        "player1@example.com",
			PasswordHash: string(hashedPassword),
			GoldBalance:  500,
			HighScore:    3000,
			RankPoints:   800,
			LeagueID:     1, // Bronze
			TotalGames:   20,
			TotalKills:   200,
		},
		{
			Username:     "player2",
			Email:        "player2@example.com",
			PasswordHash: string(hashedPassword),
			GoldBalance:  2000,
			HighScore:    10000,
			RankPoints:   3500,
			LeagueID:     3, // Gold
			TotalGames:   100,
			TotalKills:   1000,
		},
		{
			Username:     "admin",
			Email:        "admin@example.com",
			PasswordHash: string(hashedPassword),
			GoldBalance:  10000,
			HighScore:    50000,
			RankPoints:   15000,
			LeagueID:     5, // Diamond
			TotalGames:   500,
			TotalKills:   5000,
		},
	}

	// Insert each player
	for _, player := range players {
		if err := db.WithContext(ctx).Create(&player).Error; err != nil {
			return err
		}
		log.Printf("   ✓ %s (%s) - %d gold, %d points, high score %d",
			player.Username, player.Email, player.GoldBalance, player.RankPoints, player.HighScore)
	}

	log.Printf("   ✅ Successfully seeded %d players\n", len(players))
	return nil
}
