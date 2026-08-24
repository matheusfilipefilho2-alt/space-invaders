package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Test CalculateGoldReward - Bronze League
func TestGameService_CalculateGoldReward_Bronze(t *testing.T) {
	gameService := service.NewGameService(nil) // No repo needed for calculation

	gold := gameService.CalculateGoldReward(1000, 1) // 1000 score, Bronze league (ID=1)

	// Formula: (score / 10) * multiplier
	// Bronze multiplier = 1.0
	// Expected: (1000 / 10) * 1.0 = 100
	assert.Equal(t, uint64(100), gold)
}

// Test CalculateGoldReward - Silver League
func TestGameService_CalculateGoldReward_Silver(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(1000, 2) // 1000 score, Silver league (ID=2)

	// Silver multiplier = 1.2
	// Expected: (1000 / 10) * 1.2 = 120
	assert.Equal(t, uint64(120), gold)
}

// Test CalculateGoldReward - Gold League
func TestGameService_CalculateGoldReward_Gold(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(1000, 3) // 1000 score, Gold league (ID=3)

	// Gold multiplier = 1.5
	// Expected: (1000 / 10) * 1.5 = 150
	assert.Equal(t, uint64(150), gold)
}

// Test CalculateGoldReward - Platinum League
func TestGameService_CalculateGoldReward_Platinum(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(1000, 4) // 1000 score, Platinum league (ID=4)

	// Platinum multiplier = 2.0
	// Expected: (1000 / 10) * 2.0 = 200
	assert.Equal(t, uint64(200), gold)
}

// Test CalculateGoldReward - Zero Score
func TestGameService_CalculateGoldReward_ZeroScore(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(0, 1)

	assert.Equal(t, uint64(0), gold)
}

// Test CalculateGoldReward - High Score
func TestGameService_CalculateGoldReward_HighScore(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(50000, 4) // 50k score, Platinum

	// Expected: (50000 / 10) * 2.0 = 10000
	assert.Equal(t, uint64(10000), gold)
}

// Helper function to setup test database
func setupGameTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&entity.Player{}, &entity.League{})
	require.NoError(t, err)

	// Seed leagues
	leagues := entity.SeedLeagues()
	require.NoError(t, db.Create(&leagues).Error)

	return db
}

// Test EndGame - Success (First Game)
func TestGameService_EndGame_FirstGame(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	// Create test player in Bronze league
	player := &entity.Player{
		Username:     "gamer1",
		Email:        "gamer1@test.com",
		PasswordHash: "hash",
		LeagueID:     1, // Bronze
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// End game with score 1000
	goldEarned, err := gameService.EndGame(ctx, player.ID, 1000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(100), goldEarned) // (1000/10) * 1.0 = 100

	// Verify player was updated
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(1000), updatedPlayer.HighScore)
	assert.Equal(t, uint(1), updatedPlayer.TotalGames)
	assert.Equal(t, uint64(100), updatedPlayer.GoldBalance)
}

// Test EndGame - Update High Score
func TestGameService_EndGame_UpdateHighScore(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	// Create player with existing high score
	player := &entity.Player{
		Username:     "gamer2",
		Email:        "gamer2@test.com",
		PasswordHash: "hash",
		LeagueID:     2, // Silver
		HighScore:    500,
		TotalGames:   1,
		GoldBalance:  50,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// End game with higher score
	goldEarned, err := gameService.EndGame(ctx, player.ID, 1500)

	assert.NoError(t, err)
	assert.Equal(t, uint64(180), goldEarned) // (1500/10) * 1.2 = 180

	// Verify high score was updated
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(1500), updatedPlayer.HighScore)
	assert.Equal(t, uint(2), updatedPlayer.TotalGames)
	assert.Equal(t, uint64(230), updatedPlayer.GoldBalance) // 50 + 180
}

// Test EndGame - Don't Update High Score (Lower Score)
func TestGameService_EndGame_LowerScore(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	// Create player with existing high score
	player := &entity.Player{
		Username:     "gamer3",
		Email:        "gamer3@test.com",
		PasswordHash: "hash",
		LeagueID:     3, // Gold
		HighScore:    2000,
		TotalGames:   5,
		GoldBalance:  500,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// End game with lower score
	goldEarned, err := gameService.EndGame(ctx, player.ID, 800)

	assert.NoError(t, err)
	assert.Equal(t, uint64(120), goldEarned) // (800/10) * 1.5 = 120

	// Verify high score was NOT updated
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(2000), updatedPlayer.HighScore) // Unchanged
	assert.Equal(t, uint(6), updatedPlayer.TotalGames)     // Incremented
	assert.Equal(t, uint64(620), updatedPlayer.GoldBalance) // 500 + 120
}

// Test EndGame - Platinum League Bonus
func TestGameService_EndGame_PlatinumLeague(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	// Create player in Platinum league
	player := &entity.Player{
		Username:     "progamer",
		Email:        "pro@test.com",
		PasswordHash: "hash",
		LeagueID:     4, // Platinum
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// End game with 5000 score
	goldEarned, err := gameService.EndGame(ctx, player.ID, 5000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(1000), goldEarned) // (5000/10) * 2.0 = 1000
}

// Test EndGame - Player Not Found
func TestGameService_EndGame_PlayerNotFound(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	_, err := gameService.EndGame(ctx, 999, 1000)
	assert.Error(t, err)
}

// Test StartGame - Success
func TestGameService_StartGame_Success(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	// Create test player
	player := &entity.Player{
		Username:     "starter",
		Email:        "starter@test.com",
		PasswordHash: "hash",
		LeagueID:     1,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	err := gameService.StartGame(ctx, player.ID)
	assert.NoError(t, err)
}

// Test StartGame - Player Not Found
func TestGameService_StartGame_PlayerNotFound(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	err := gameService.StartGame(ctx, 999)
	assert.Error(t, err)
}

// Test EndGame - Zero Score
func TestGameService_EndGame_ZeroScore(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "zeroscore",
		Email:        "zero@test.com",
		PasswordHash: "hash",
		LeagueID:     1,
		HighScore:    100,
		TotalGames:   1,
		GoldBalance:  50,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	goldEarned, err := gameService.EndGame(ctx, player.ID, 0)

	assert.NoError(t, err)
	assert.Equal(t, uint64(0), goldEarned)

	// Verify player stats
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(100), updatedPlayer.HighScore) // Unchanged
	assert.Equal(t, uint(2), updatedPlayer.TotalGames)
	assert.Equal(t, uint64(50), updatedPlayer.GoldBalance) // No gold added
}

// Test EndGame - Equal Score (should not update high score)
func TestGameService_EndGame_EqualScore(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "equalscore",
		Email:        "equal@test.com",
		PasswordHash: "hash",
		LeagueID:     2,
		HighScore:    1000,
		TotalGames:   3,
		GoldBalance:  200,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	goldEarned, err := gameService.EndGame(ctx, player.ID, 1000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(120), goldEarned) // (1000/10) * 1.2

	// Verify high score unchanged
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(1000), updatedPlayer.HighScore) // Unchanged
	assert.Equal(t, uint(4), updatedPlayer.TotalGames)
	assert.Equal(t, uint64(320), updatedPlayer.GoldBalance)
}

// Test EndGame - Diamond League (2x multiplier)
func TestGameService_EndGame_DiamondLeague(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "diamond",
		Email:        "diamond@test.com",
		PasswordHash: "hash",
		LeagueID:     5, // Diamond
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	goldEarned, err := gameService.EndGame(ctx, player.ID, 3000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(600), goldEarned) // (3000/10) * 2.0
}

// Test EndGame - Master League (2x multiplier)
func TestGameService_EndGame_MasterLeague(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "master",
		Email:        "master@test.com",
		PasswordHash: "hash",
		LeagueID:     6, // Master
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	goldEarned, err := gameService.EndGame(ctx, player.ID, 10000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(2000), goldEarned) // (10000/10) * 2.0
}

// Test EndGame - Multiple Games Accumulate Gold
func TestGameService_EndGame_MultipleGames(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "frequent",
		Email:        "frequent@test.com",
		PasswordHash: "hash",
		LeagueID:     1,
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Play 3 games
	gold1, err := gameService.EndGame(ctx, player.ID, 500)
	require.NoError(t, err)
	assert.Equal(t, uint64(50), gold1)

	gold2, err := gameService.EndGame(ctx, player.ID, 1000)
	require.NoError(t, err)
	assert.Equal(t, uint64(100), gold2)

	gold3, err := gameService.EndGame(ctx, player.ID, 700)
	require.NoError(t, err)
	assert.Equal(t, uint64(70), gold3)

	// Verify final stats
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(1000), updatedPlayer.HighScore) // Highest from 3 games
	assert.Equal(t, uint(3), updatedPlayer.TotalGames)
	assert.Equal(t, uint64(220), updatedPlayer.GoldBalance) // 50 + 100 + 70
}

// Test CalculateGoldReward - Diamond and Master have same multiplier
func TestGameService_CalculateGoldReward_DiamondAndMaster(t *testing.T) {
	gameService := service.NewGameService(nil)

	goldDiamond := gameService.CalculateGoldReward(5000, 5) // Diamond
	goldMaster := gameService.CalculateGoldReward(5000, 6)  // Master

	assert.Equal(t, goldDiamond, goldMaster)
	assert.Equal(t, uint64(1000), goldDiamond) // (5000/10) * 2.0
}

// Test CalculateGoldReward - Invalid League ID (defaults to 1.0)
func TestGameService_CalculateGoldReward_InvalidLeague(t *testing.T) {
	gameService := service.NewGameService(nil)

	gold := gameService.CalculateGoldReward(1000, 999) // Invalid league

	// Should default to 1.0 multiplier
	assert.Equal(t, uint64(100), gold)
}

// Test EndGame - Very High Score
func TestGameService_EndGame_VeryHighScore(t *testing.T) {
	db := setupGameTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	gameService := service.NewGameService(playerRepo)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "highscore",
		Email:        "high@test.com",
		PasswordHash: "hash",
		LeagueID:     4, // Platinum
		HighScore:    0,
		TotalGames:   0,
		GoldBalance:  0,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	goldEarned, err := gameService.EndGame(ctx, player.ID, 100000)

	assert.NoError(t, err)
	assert.Equal(t, uint64(20000), goldEarned) // (100000/10) * 2.0

	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)

	assert.Equal(t, uint64(100000), updatedPlayer.HighScore)
	assert.Equal(t, uint64(20000), updatedPlayer.GoldBalance)
}
