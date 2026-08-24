package main

import (
	"context"
	"fmt"
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

// LoadData loads transformed data into PostgreSQL in dependency order
func LoadData(ctx context.Context, db *gorm.DB, data *TransformedData) error {
	log.Println("Starting data load into PostgreSQL...")
	
	// Load in dependency order to satisfy foreign key constraints
	
	// 1. Leagues (no dependencies)
	if err := loadLeagues(ctx, db, data.Leagues); err != nil {
		return fmt.Errorf("failed to load leagues: %w", err)
	}
	
	// 2. Players (depends on Leagues)
	if err := loadPlayers(ctx, db, data.Players); err != nil {
		return fmt.Errorf("failed to load players: %w", err)
	}
	
	// 3. PlayerItems (depends on Players)
	if err := loadPlayerItems(ctx, db, data.PlayerItems); err != nil {
		return fmt.Errorf("failed to load player items: %w", err)
	}
	
	// 4. Achievements (no dependencies)
	if err := loadAchievements(ctx, db, data.Achievements); err != nil {
		return fmt.Errorf("failed to load achievements: %w", err)
	}
	
	// 5. PlayerAchievements (depends on Players and Achievements)
	if err := loadPlayerAchievements(ctx, db, data.PlayerAchievements); err != nil {
		return fmt.Errorf("failed to load player achievements: %w", err)
	}
	
	// 6. GoldSpaceConversions (depends on Players)
	if err := loadGoldSpaceConversions(ctx, db, data.Conversions); err != nil {
		return fmt.Errorf("failed to load gold space conversions: %w", err)
	}
	
	// 7. DailyEmissions (no dependencies)
	if err := loadDailyEmissions(ctx, db, data.DailyEmissions); err != nil {
		return fmt.Errorf("failed to load daily emissions: %w", err)
	}
	
	// 8. RewardHistory (depends on Players)
	if err := loadRewardHistory(ctx, db, data.RewardHistory); err != nil {
		return fmt.Errorf("failed to load reward history: %w", err)
	}
	
	// 9. Orders (depends on Players)
	if err := loadOrders(ctx, db, data.Orders); err != nil {
		return fmt.Errorf("failed to load orders: %w", err)
	}
	
	log.Println("Data load completed successfully!")
	return nil
}

// loadLeagues loads league data (small table, no batching needed)
func loadLeagues(ctx context.Context, db *gorm.DB, leagues []entity.League) error {
	if len(leagues) == 0 {
		log.Println("No leagues to load")
		return nil
	}
	
	log.Printf("Loading %d leagues...", len(leagues))
	
	for _, league := range leagues {
		if err := db.WithContext(ctx).Create(&league).Error; err != nil {
			return fmt.Errorf("failed to insert league %d: %w", league.ID, err)
		}
	}
	
	log.Printf("✓ Loaded %d leagues", len(leagues))
	return nil
}

// loadPlayers loads player data with batch inserts
func loadPlayers(ctx context.Context, db *gorm.DB, players []entity.Player) error {
	if len(players) == 0 {
		log.Println("No players to load")
		return nil
	}
	
	log.Printf("Loading %d players...", len(players))
	
	batchSize := 100
	for i := 0; i < len(players); i += batchSize {
		end := i + batchSize
		if end > len(players) {
			end = len(players)
		}
		
		batch := players[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert players batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d players loaded", end, len(players))
	}
	
	log.Printf("✓ Loaded %d players", len(players))
	return nil
}

// loadPlayerItems loads player items with batch inserts
func loadPlayerItems(ctx context.Context, db *gorm.DB, items []entity.PlayerItem) error {
	if len(items) == 0 {
		log.Println("No player items to load")
		return nil
	}
	
	log.Printf("Loading %d player items...", len(items))
	
	batchSize := 100
	for i := 0; i < len(items); i += batchSize {
		end := i + batchSize
		if end > len(items) {
			end = len(items)
		}
		
		batch := items[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert player items batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d player items loaded", end, len(items))
	}
	
	log.Printf("✓ Loaded %d player items", len(items))
	return nil
}

// loadAchievements loads achievement data (small table, no batching needed)
func loadAchievements(ctx context.Context, db *gorm.DB, achievements []entity.Achievement) error {
	if len(achievements) == 0 {
		log.Println("No achievements to load")
		return nil
	}
	
	log.Printf("Loading %d achievements...", len(achievements))
	
	for _, achievement := range achievements {
		if err := db.WithContext(ctx).Create(&achievement).Error; err != nil {
			return fmt.Errorf("failed to insert achievement %s: %w", achievement.ID, err)
		}
	}
	
	log.Printf("✓ Loaded %d achievements", len(achievements))
	return nil
}

// loadPlayerAchievements loads player achievements with batch inserts
func loadPlayerAchievements(ctx context.Context, db *gorm.DB, playerAchievements []entity.PlayerAchievement) error {
	if len(playerAchievements) == 0 {
		log.Println("No player achievements to load")
		return nil
	}
	
	log.Printf("Loading %d player achievements...", len(playerAchievements))
	
	batchSize := 100
	for i := 0; i < len(playerAchievements); i += batchSize {
		end := i + batchSize
		if end > len(playerAchievements) {
			end = len(playerAchievements)
		}
		
		batch := playerAchievements[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert player achievements batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d player achievements loaded", end, len(playerAchievements))
	}
	
	log.Printf("✓ Loaded %d player achievements", len(playerAchievements))
	return nil
}

// loadGoldSpaceConversions loads conversion records with batch inserts
func loadGoldSpaceConversions(ctx context.Context, db *gorm.DB, conversions []entity.GoldSpaceConversion) error {
	if len(conversions) == 0 {
		log.Println("No gold space conversions to load")
		return nil
	}
	
	log.Printf("Loading %d gold space conversions...", len(conversions))
	
	batchSize := 100
	for i := 0; i < len(conversions); i += batchSize {
		end := i + batchSize
		if end > len(conversions) {
			end = len(conversions)
		}
		
		batch := conversions[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert conversions batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d conversions loaded", end, len(conversions))
	}
	
	log.Printf("✓ Loaded %d gold space conversions", len(conversions))
	return nil
}

// loadDailyEmissions loads daily emission records with batch inserts
func loadDailyEmissions(ctx context.Context, db *gorm.DB, emissions []entity.DailyEmission) error {
	if len(emissions) == 0 {
		log.Println("No daily emissions to load")
		return nil
	}
	
	log.Printf("Loading %d daily emissions...", len(emissions))
	
	batchSize := 100
	for i := 0; i < len(emissions); i += batchSize {
		end := i + batchSize
		if end > len(emissions) {
			end = len(emissions)
		}
		
		batch := emissions[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert emissions batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d emissions loaded", end, len(emissions))
	}
	
	log.Printf("✓ Loaded %d daily emissions", len(emissions))
	return nil
}

// loadRewardHistory loads reward history with batch inserts
func loadRewardHistory(ctx context.Context, db *gorm.DB, rewards []entity.RewardHistory) error {
	if len(rewards) == 0 {
		log.Println("No reward history to load")
		return nil
	}
	
	log.Printf("Loading %d reward history records...", len(rewards))
	
	batchSize := 100
	for i := 0; i < len(rewards); i += batchSize {
		end := i + batchSize
		if end > len(rewards) {
			end = len(rewards)
		}
		
		batch := rewards[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert rewards batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d rewards loaded", end, len(rewards))
	}
	
	log.Printf("✓ Loaded %d reward history records", len(rewards))
	return nil
}

// loadOrders loads order records with batch inserts
func loadOrders(ctx context.Context, db *gorm.DB, orders []entity.Order) error {
	if len(orders) == 0 {
		log.Println("No orders to load")
		return nil
	}
	
	log.Printf("Loading %d orders...", len(orders))
	
	batchSize := 100
	for i := 0; i < len(orders); i += batchSize {
		end := i + batchSize
		if end > len(orders) {
			end = len(orders)
		}
		
		batch := orders[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert orders batch %d-%d: %w", i, end, err)
		}
		
		log.Printf("  Progress: %d/%d orders loaded", end, len(orders))
	}
	
	log.Printf("✓ Loaded %d orders", len(orders))
	return nil
}
