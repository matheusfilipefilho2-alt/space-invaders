package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Mock PriceFetcher for testing
type mockPriceFetcher struct {
	price uint64
}

func (m *mockPriceFetcher) GetSpacePrice(ctx context.Context) (uint64, error) {
	return m.price, nil
}

func setupEmissionTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&entity.TreasuryConfig{},
		&entity.DailyEmission{},
	)
	require.NoError(t, err)

	// Seed treasury config
	treasuryConfig := entity.GetDefaultConfig()
	require.NoError(t, db.Create(treasuryConfig).Error)

	return db
}

func TestEmissionCalculatorService_CalculateDailyEmission_GameplayLowerThanRevenue(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 100} // $1.00 per SPACE

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Scenario: Low gameplay rewards, high revenue
	// gameplayRewards: 1000 Gold → 10 SPACE (1000 / 100 ratio)
	// revenue24h: R$ 100.00 = 10000 cents
	// revenue_cap: (10000 × 0.30) / 100 = 30 SPACE
	// Expected emission: min(10, 30) = 10 SPACE = 10,000,000,000 lamports

	emission, err := svc.CalculateDailyEmission(ctx, 1000, 10000, time.Now())

	require.NoError(t, err)
	assert.NotNil(t, emission)
	assert.Equal(t, uint64(10_000_000_000), emission.GameplayRewards) // 10 SPACE in lamports
	assert.Equal(t, uint64(10000), emission.PixRevenue24h)
	assert.Equal(t, uint64(100), emission.SpacePrice)
	assert.Equal(t, uint64(10_000_000_000), emission.EmissionUsed) // 10 SPACE
}

func TestEmissionCalculatorService_CalculateDailyEmission_RevenueLowerThanGameplay(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 100} // $1.00 per SPACE

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Scenario: High gameplay rewards, low revenue
	// gameplayRewards: 10000 Gold → 100 SPACE
	// revenue24h: R$ 10.00 = 1000 cents
	// revenue_cap: (1000 × 0.30) / 100 = 3 SPACE
	// Expected emission: min(100, 3) = 3 SPACE = 3,000,000,000 lamports

	emission, err := svc.CalculateDailyEmission(ctx, 10000, 1000, time.Now())

	require.NoError(t, err)
	assert.Equal(t, uint64(3_000_000_000), emission.EmissionUsed) // 3 SPACE
}

func TestEmissionCalculatorService_CalculateDailyEmission_RespectMaxLimit(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 100}

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Scenario: Very high gameplay and revenue, should hit max daily emission limit
	// gameplayRewards: 1,000,000 Gold → 10,000 SPACE
	// revenue24h: R$ 100,000.00 = 10,000,000 cents
	// revenue_cap: (10,000,000 × 0.30) / 100 = 30,000 SPACE
	// min(10,000, 30,000) = 10,000 SPACE = 10,000,000,000,000 lamports
	// But max_emission_per_day is 1,000,000,000,000 (1,000 SPACE)

	emission, err := svc.CalculateDailyEmission(ctx, 1_000_000, 10_000_000, time.Now())

	require.NoError(t, err)
	// Should be capped at max emission (1,000 SPACE from default config)
	assert.Equal(t, uint64(1_000_000_000_000), emission.EmissionUsed)
}

func TestEmissionCalculatorService_CalculateDailyEmission_DifferentSpacePrice(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 50} // $0.50 per SPACE

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Scenario: Lower SPACE price means higher emission cap
	// gameplayRewards: 10000 Gold → 100 SPACE
	// revenue24h: R$ 10.00 = 1000 cents
	// revenue_cap: (1000 × 0.30) / 50 = 6 SPACE (higher than with $1.00 price)
	// Expected emission: min(100, 6) = 6 SPACE = 6,000,000,000 lamports

	emission, err := svc.CalculateDailyEmission(ctx, 10000, 1000, time.Now())

	require.NoError(t, err)
	assert.Equal(t, uint64(6_000_000_000), emission.EmissionUsed) // 6 SPACE
}

func TestEmissionCalculatorService_SaveDailyEmission(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 100}

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Calculate emission
	today := time.Now().UTC().Truncate(24 * time.Hour)
	emission, err := svc.CalculateDailyEmission(ctx, 1000, 10000, today)
	require.NoError(t, err)

	// Save it
	err = svc.SaveDailyEmission(ctx, emission)
	require.NoError(t, err)

	// Verify saved
	history, err := svc.GetEmissionHistory(ctx, today, today)
	require.NoError(t, err)
	require.Len(t, history, 1)
	assert.Equal(t, emission.EmissionUsed, history[0].EmissionUsed)
}

func TestEmissionCalculatorService_GetEmissionHistory(t *testing.T) {
	db := setupEmissionTestDB(t)
	treasuryRepo := database.NewTreasuryRepository(db)
	priceFetcher := &mockPriceFetcher{price: 100}

	svc := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	ctx := context.Background()

	// Create 3 days of emissions
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := 0; i < 3; i++ {
		date := today.AddDate(0, 0, -i)
		emission, err := svc.CalculateDailyEmission(ctx, uint64((i+1)*1000), 10000, date)
		require.NoError(t, err)
		require.NoError(t, svc.SaveDailyEmission(ctx, emission))
	}

	// Get history
	start := today.AddDate(0, 0, -2)
	history, err := svc.GetEmissionHistory(ctx, start, today)

	require.NoError(t, err)
	assert.Len(t, history, 3)
}
