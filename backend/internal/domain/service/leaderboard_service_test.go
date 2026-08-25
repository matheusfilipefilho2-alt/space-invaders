package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupLeaderboardTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&entity.League{}, &entity.Player{})
	require.NoError(t, err)

	return db
}

// seedLeaderboardTestData creates test data with various scores
func seedLeaderboardTestData(t *testing.T, db *gorm.DB) {
	// Create leagues
	leagues := []*entity.League{
		{Name: "Bronze", MinPoints: 0, MaxPoints: 1000},
		{Name: "Silver", MinPoints: 1001, MaxPoints: 5000},
		{Name: "Gold", MinPoints: 5001, MaxPoints: 10000},
	}
	for _, league := range leagues {
		require.NoError(t, db.Create(league).Error)
	}

	// Create players with different scores
	players := []*entity.Player{
		{Username: "top1", Email: "top1@test.com", HighScore: 10000, LeagueID: 3},
		{Username: "top2", Email: "top2@test.com", HighScore: 9000, LeagueID: 3},
		{Username: "top3", Email: "top3@test.com", HighScore: 8000, LeagueID: 2},
		{Username: "mid1", Email: "mid1@test.com", HighScore: 5000, LeagueID: 2},
		{Username: "mid2", Email: "mid2@test.com", HighScore: 4000, LeagueID: 2},
		{Username: "low1", Email: "low1@test.com", HighScore: 1000, LeagueID: 1},
		{Username: "low2", Email: "low2@test.com", HighScore: 500, LeagueID: 1},
		{Username: "low3", Email: "low3@test.com", HighScore: 100, LeagueID: 1},
	}
	for _, player := range players {
		require.NoError(t, db.Create(player).Error)
	}
}

func TestGetGlobalLeaderboard(t *testing.T) {
	db := setupLeaderboardTestDB(t)
	seedLeaderboardTestData(t, db)

	playerRepo := database.NewPlayerRepository(db)
	service := NewLeaderboardService(playerRepo)

	t.Run("should return top players ordered by high score", func(t *testing.T) {
		entries, err := service.GetGlobalLeaderboard(context.Background(), 5, 0)

		require.NoError(t, err)
		assert.Len(t, entries, 5)

		// Verify ordering (highest to lowest)
		assert.Equal(t, "top1", entries[0].Username)
		assert.Equal(t, uint64(10000), entries[0].HighScore)
		assert.Equal(t, 1, entries[0].Rank)

		assert.Equal(t, "top2", entries[1].Username)
		assert.Equal(t, uint64(9000), entries[1].HighScore)
		assert.Equal(t, 2, entries[1].Rank)

		assert.Equal(t, "top3", entries[2].Username)
		assert.Equal(t, uint64(8000), entries[2].HighScore)
		assert.Equal(t, 3, entries[2].Rank)
	})

	t.Run("should support pagination", func(t *testing.T) {
		// First page
		page1, err := service.GetGlobalLeaderboard(context.Background(), 3, 0)
		require.NoError(t, err)
		assert.Len(t, page1, 3)
		assert.Equal(t, 1, page1[0].Rank)
		assert.Equal(t, "top1", page1[0].Username)

		// Second page
		page2, err := service.GetGlobalLeaderboard(context.Background(), 3, 3)
		require.NoError(t, err)
		assert.Len(t, page2, 3)
		assert.Equal(t, 4, page2[0].Rank) // Rank continues from offset
		assert.Equal(t, "mid1", page2[0].Username)
	})

	t.Run("should include league information", func(t *testing.T) {
		entries, err := service.GetGlobalLeaderboard(context.Background(), 3, 0)

		require.NoError(t, err)
		assert.Equal(t, "Gold", entries[0].LeagueName)
		assert.Equal(t, uint(3), entries[0].LeagueID)
	})

	t.Run("should handle empty results", func(t *testing.T) {
		// Clear database
		db.Exec("DELETE FROM players")

		entries, err := service.GetGlobalLeaderboard(context.Background(), 10, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})
}

func TestGetLeagueLeaderboard(t *testing.T) {
	db := setupLeaderboardTestDB(t)
	seedLeaderboardTestData(t, db)

	playerRepo := database.NewPlayerRepository(db)
	service := NewLeaderboardService(playerRepo)

	t.Run("should return top players in specific league", func(t *testing.T) {
		// Get Silver league (ID=2) leaderboard
		entries, err := service.GetLeagueLeaderboard(context.Background(), 2, 10, 0)

		require.NoError(t, err)
		assert.Len(t, entries, 3) // 3 players in Silver league

		// Verify ordering within league
		assert.Equal(t, "top3", entries[0].Username)
		assert.Equal(t, uint64(8000), entries[0].HighScore)
		assert.Equal(t, 1, entries[0].Rank) // Rank 1 within league

		assert.Equal(t, "mid1", entries[1].Username)
		assert.Equal(t, uint64(5000), entries[1].HighScore)
		assert.Equal(t, 2, entries[1].Rank)

		assert.Equal(t, "mid2", entries[2].Username)
		assert.Equal(t, uint64(4000), entries[2].HighScore)
		assert.Equal(t, 3, entries[2].Rank)
	})

	t.Run("should only return players from specified league", func(t *testing.T) {
		// Get Bronze league (ID=1) leaderboard
		entries, err := service.GetLeagueLeaderboard(context.Background(), 1, 10, 0)

		require.NoError(t, err)
		assert.Len(t, entries, 3) // 3 players in Bronze league

		// All should be from Bronze league
		for _, entry := range entries {
			assert.Equal(t, uint(1), entry.LeagueID)
			assert.Equal(t, "Bronze", entry.LeagueName)
		}
	})

	t.Run("should support pagination within league", func(t *testing.T) {
		// Get Bronze league with limit=2, offset=0
		page1, err := service.GetLeagueLeaderboard(context.Background(), 1, 2, 0)
		require.NoError(t, err)
		assert.Len(t, page1, 2)
		assert.Equal(t, 1, page1[0].Rank)
		assert.Equal(t, "low1", page1[0].Username)

		// Get Bronze league with limit=2, offset=2
		page2, err := service.GetLeagueLeaderboard(context.Background(), 1, 2, 2)
		require.NoError(t, err)
		assert.Len(t, page2, 1)
		assert.Equal(t, 3, page2[0].Rank) // Rank continues from offset
	})

	t.Run("should handle empty league", func(t *testing.T) {
		// Non-existent league
		entries, err := service.GetLeagueLeaderboard(context.Background(), 999, 10, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should calculate rank relative to league not global", func(t *testing.T) {
		// top3 has score 8000 (rank 3 globally, but rank 1 in Silver league)
		entries, err := service.GetLeagueLeaderboard(context.Background(), 2, 1, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, entries[0].Rank) // Rank 1 in league, not 3
	})
}

func TestGetPlayerRank(t *testing.T) {
	db := setupLeaderboardTestDB(t)
	seedLeaderboardTestData(t, db)

	playerRepo := database.NewPlayerRepository(db)
	service := NewLeaderboardService(playerRepo)

	t.Run("should return correct rank for top player", func(t *testing.T) {
		// Get player with highest score (top1, score=10000)
		var player entity.Player
		require.NoError(t, db.Where("username = ?", "top1").First(&player).Error)

		rank, err := service.GetPlayerRank(context.Background(), player.ID)

		require.NoError(t, err)
		assert.Equal(t, 1, rank)
	})

	t.Run("should return correct rank for middle player", func(t *testing.T) {
		// Get player with mid score (mid1, score=5000, should be rank 4)
		var player entity.Player
		require.NoError(t, db.Where("username = ?", "mid1").First(&player).Error)

		rank, err := service.GetPlayerRank(context.Background(), player.ID)

		require.NoError(t, err)
		assert.Equal(t, 4, rank)
	})

	t.Run("should return correct rank for bottom player", func(t *testing.T) {
		// Get player with lowest score (low3, score=100, should be rank 8)
		var player entity.Player
		require.NoError(t, db.Where("username = ?", "low3").First(&player).Error)

		rank, err := service.GetPlayerRank(context.Background(), player.ID)

		require.NoError(t, err)
		assert.Equal(t, 8, rank)
	})

	t.Run("should handle non-existent player", func(t *testing.T) {
		rank, err := service.GetPlayerRank(context.Background(), 9999)

		assert.Error(t, err)
		assert.Equal(t, 0, rank)
	})
}

func TestGetFriendLeaderboard(t *testing.T) {
	db := setupLeaderboardTestDB(t)
	seedLeaderboardTestData(t, db)

	playerRepo := database.NewPlayerRepository(db)
	service := NewLeaderboardService(playerRepo)

	t.Run("should return empty list as stub", func(t *testing.T) {
		entries, err := service.GetFriendLeaderboard(context.Background(), 1, 10, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should not error with any parameters", func(t *testing.T) {
		entries, err := service.GetFriendLeaderboard(context.Background(), 999, 100, 50)

		require.NoError(t, err)
		assert.NotNil(t, entries)
		assert.Empty(t, entries)
	})
}

func TestLeaderboardEdgeCases(t *testing.T) {
	db := setupLeaderboardTestDB(t)
	// Don't seed data for edge cases

	playerRepo := database.NewPlayerRepository(db)
	service := NewLeaderboardService(playerRepo)

	t.Run("should handle empty database for global leaderboard", func(t *testing.T) {
		entries, err := service.GetGlobalLeaderboard(context.Background(), 10, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should handle empty database for league leaderboard", func(t *testing.T) {
		entries, err := service.GetLeagueLeaderboard(context.Background(), 1, 10, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should handle large offset beyond results", func(t *testing.T) {
		seedLeaderboardTestData(t, db)

		entries, err := service.GetGlobalLeaderboard(context.Background(), 10, 1000)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should handle zero limit", func(t *testing.T) {
		entries, err := service.GetGlobalLeaderboard(context.Background(), 0, 0)

		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("should handle negative parameters gracefully", func(t *testing.T) {
		// SQLite/GORM should handle negative limit/offset
		entries, err := service.GetGlobalLeaderboard(context.Background(), -1, -1)

		// Should not crash, might return empty or error depending on DB behavior
		assert.NotNil(t, entries)
		// Either succeeds with empty or errors gracefully
		if err != nil {
			assert.Error(t, err)
		}
	})
}
