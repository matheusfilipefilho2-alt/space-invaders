package database_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTreasuryTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&entity.TreasuryConfig{}, &entity.DailyEmission{})
	require.NoError(t, err)

	// Seed default config
	defaultConfig := entity.GetDefaultConfig()
	require.NoError(t, db.Create(defaultConfig).Error)

	return db
}

func TestTreasuryRepository_GetConfig(t *testing.T) {
	db := setupTreasuryTestDB(t)
	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	config, err := repo.GetConfig(ctx)

	require.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, uint64(100), config.ConversionRatio)
	assert.Equal(t, 0.30, config.RevenueSharePercent)
}

func TestTreasuryRepository_UpdateConfig(t *testing.T) {
	db := setupTreasuryTestDB(t)
	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	// Get config
	config, err := repo.GetConfig(ctx)
	require.NoError(t, err)

	// Update config
	config.MaxEmissionPerDay = 500000
	config.TreasuryWalletPubkey = "test_wallet_pubkey"
	err = repo.UpdateConfig(ctx, config)
	require.NoError(t, err)

	// Verify update
	updated, err := repo.GetConfig(ctx)
	require.NoError(t, err)
	assert.Equal(t, uint64(500000), updated.MaxEmissionPerDay)
	assert.Equal(t, "test_wallet_pubkey", updated.TreasuryWalletPubkey)
}

func TestTreasuryRepository_CreateOrUpdateDailyEmission(t *testing.T) {
	db := setupTreasuryTestDB(t)
	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	date := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)

	emission := &entity.DailyEmission{
		Date:              date,
		PixRevenue24h:     100000,
		SpacePrice:        100,
		GameplayRewards:   50000,
		EmissionLimit:     30000,
		EmissionUsed:      25000,
		EmissionAvailable: 5000,
	}

	err := repo.CreateOrUpdateDailyEmission(ctx, emission)
	require.NoError(t, err)
	assert.NotZero(t, emission.ID)

	// Verify creation
	fetched, err := repo.GetDailyEmission(ctx, date)
	require.NoError(t, err)
	assert.Equal(t, uint64(100000), fetched.PixRevenue24h)
	assert.Equal(t, uint64(25000), fetched.EmissionUsed)

	// Update same date
	emission.EmissionUsed = 30000
	emission.EmissionAvailable = 0
	err = repo.CreateOrUpdateDailyEmission(ctx, emission)
	require.NoError(t, err)

	// Verify update
	updated, err := repo.GetDailyEmission(ctx, date)
	require.NoError(t, err)
	assert.Equal(t, uint64(30000), updated.EmissionUsed)
	assert.Equal(t, uint64(0), updated.EmissionAvailable)
}

func TestTreasuryRepository_GetEmissionHistory(t *testing.T) {
	db := setupTreasuryTestDB(t)
	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	// Create emissions for 3 days
	dates := []time.Time{
		time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 1, 11, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 1, 12, 0, 0, 0, 0, time.UTC),
	}

	for i, date := range dates {
		emission := &entity.DailyEmission{
			Date:              date,
			PixRevenue24h:     uint64((i + 1) * 10000),
			SpacePrice:        100,
			GameplayRewards:   uint64((i + 1) * 5000),
			EmissionLimit:     uint64((i + 1) * 3000),
			EmissionUsed:      uint64((i + 1) * 2500),
			EmissionAvailable: uint64((i + 1) * 500),
		}
		require.NoError(t, repo.CreateOrUpdateDailyEmission(ctx, emission))
	}

	// Get history
	startDate := time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2024, 1, 12, 23, 59, 59, 0, time.UTC)

	history, err := repo.GetEmissionHistory(ctx, startDate, endDate)
	require.NoError(t, err)
	assert.Len(t, history, 3)

	// Verify order (should be ascending by date)
	assert.Equal(t, dates[0].Format("2006-01-02"), history[0].Date.Format("2006-01-02"))
	assert.Equal(t, dates[2].Format("2006-01-02"), history[2].Date.Format("2006-01-02"))
}

func TestTreasuryRepository_GetDailyEmission_NotFound(t *testing.T) {
	db := setupTreasuryTestDB(t)
	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	date := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

	emission, err := repo.GetDailyEmission(ctx, date)
	assert.Error(t, err)
	assert.Nil(t, emission)
}
