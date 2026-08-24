package database_test

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
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate tables
	err = db.AutoMigrate(
		&entity.Player{},
		&entity.League{},
		&entity.Achievement{},
	)
	require.NoError(t, err)

	// Seed leagues
	leagues := entity.SeedLeagues()
	require.NoError(t, db.Create(&leagues).Error)

	// Seed achievements
	achievements := entity.SeedAchievements()
	require.NoError(t, db.Create(&achievements).Error)

	return db
}

// TestPlayerRepository_Create tests creating a new player
func TestPlayerRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
	}

	err := repo.Create(ctx, player)
	assert.NoError(t, err)
	assert.NotZero(t, player.ID)
}

// TestPlayerRepository_FindByUsername tests finding a player by username
func TestPlayerRepository_FindByUsername(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "findme",
		Email:        "findme@example.com",
		PasswordHash: "hash",
	}
	require.NoError(t, repo.Create(ctx, player))

	// Find by username
	found, err := repo.FindByUsername(ctx, "findme")
	assert.NoError(t, err)
	assert.Equal(t, "findme", found.Username)
	assert.NotNil(t, found.League)
}

// TestPlayerRepository_UpdateGoldBalance tests updating gold balance
func TestPlayerRepository_UpdateGoldBalance(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "rich",
		Email:        "rich@example.com",
		PasswordHash: "hash",
		GoldBalance:  100,
	}
	require.NoError(t, repo.Create(ctx, player))

	// Update balance
	err := repo.UpdateGoldBalance(ctx, player.ID, 50)
	assert.NoError(t, err)

	// Verify
	updated, err := repo.FindByID(ctx, player.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint64(150), updated.GoldBalance)
}

// TestAchievementRepository_FindAll tests finding all achievements
func TestAchievementRepository_FindAll(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewAchievementRepository(db)
	ctx := context.Background()

	// Find all
	achievements, err := repo.FindAll(ctx)
	assert.NoError(t, err)
	assert.Greater(t, len(achievements), 0)
}

// TestAchievementRepository_FindByID tests finding an achievement by ID
func TestAchievementRepository_FindByID(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewAchievementRepository(db)
	ctx := context.Background()

	// Find by ID
	achievement, err := repo.FindByID(ctx, "first_kill")
	assert.NoError(t, err)
	assert.Equal(t, "first_kill", achievement.ID)
	assert.Equal(t, "First Blood", achievement.Name)
}

// TestAchievementRepository_FindByRarity tests finding achievements by rarity
func TestAchievementRepository_FindByRarity(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewAchievementRepository(db)
	ctx := context.Background()

	// Find legendary achievements
	achievements, err := repo.FindByRarity(ctx, entity.AchievementRarityLegendary)
	assert.NoError(t, err)
	assert.Greater(t, len(achievements), 0)
	for _, a := range achievements {
		assert.Equal(t, entity.AchievementRarityLegendary, a.Rarity)
	}
}

// TestLeagueRepository_FindAll tests finding all leagues
func TestLeagueRepository_FindAll(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewLeagueRepository(db)
	ctx := context.Background()

	// Find all
	leagues, err := repo.FindAll(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 6, len(leagues))
	// Should be ordered by min_points
	assert.Equal(t, "Bronze", leagues[0].Name)
	assert.Equal(t, "Master", leagues[5].Name)
}

// TestLeagueRepository_FindByPoints tests finding league by points
func TestLeagueRepository_FindByPoints(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewLeagueRepository(db)
	ctx := context.Background()

	tests := []struct {
		points       uint
		expectedName string
	}{
		{0, "Bronze"},
		{500, "Bronze"},
		{1000, "Silver"},
		{2500, "Gold"},
		{5000, "Platinum"},
		{10000, "Diamond"},
		{20000, "Master"},
	}

	for _, tt := range tests {
		t.Run(tt.expectedName, func(t *testing.T) {
			league, err := repo.FindByPoints(ctx, tt.points)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedName, league.Name)
		})
	}
}
