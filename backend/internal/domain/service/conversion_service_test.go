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

func setupConversionTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&entity.League{},
		&entity.Player{},
		&entity.TreasuryConfig{},
		&entity.GoldSpaceConversion{},
	)
	require.NoError(t, err)

	// Seed leagues
	leagues := entity.SeedLeagues()
	require.NoError(t, db.Create(&leagues).Error)

	// Seed treasury config
	treasuryConfig := entity.GetDefaultConfig()
	require.NoError(t, db.Create(treasuryConfig).Error)

	return db
}

func TestConversionService_ConvertGoldToSpace_Success(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player with 1000 gold
	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hash",
		GoldBalance:  1000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Convert 500 Gold to SPACE
	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 500)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, conversion)
	assert.Equal(t, uint64(500), conversion.GoldAmount)
	// 500 Gold / 100 ratio = 5 SPACE = 5,000,000,000 lamports
	assert.Equal(t, uint64(5_000_000_000), conversion.SpaceAmount)
	assert.Equal(t, entity.ConversionStatusPending, conversion.Status)
	assert.Equal(t, uint(100), conversion.ExchangeRate)

	// Verify player balance was deducted
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)
	assert.Equal(t, uint64(500), updatedPlayer.GoldBalance) // 1000 - 500 = 500
}

func TestConversionService_ConvertGoldToSpace_InsufficientGold(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player with only 50 gold
	player := &entity.Player{
		Username:     "poorplayer",
		Email:        "poor@example.com",
		PasswordHash: "hash",
		GoldBalance:  50,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Try to convert 500 Gold (more than balance)
	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 500)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conversion)
	assert.Equal(t, service.ErrInsufficientGold, err)

	// Verify player balance unchanged
	updatedPlayer, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)
	assert.Equal(t, uint64(50), updatedPlayer.GoldBalance)
}

func TestConversionService_ConvertGoldToSpace_InvalidAmount(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hash",
		GoldBalance:  1000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Try to convert 0 Gold
	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 0)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conversion)
	assert.Equal(t, service.ErrInvalidAmount, err)
}

func TestConversionService_ConvertGoldToSpace_BelowMinimum(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hash",
		GoldBalance:  1000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Try to convert 50 Gold (less than minimum 100)
	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 50)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, conversion)
	assert.Contains(t, err.Error(), "minimum conversion")
}

func TestConversionService_GetPlayerConversions(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player with 10000 gold
	player := &entity.Player{
		Username:     "richplayer",
		Email:        "rich@example.com",
		PasswordHash: "hash",
		GoldBalance:  10000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	// Create 3 conversions
	amounts := []uint64{1000, 2000, 3000}
	for _, amount := range amounts {
		_, err := svc.ConvertGoldToSpace(ctx, player.ID, amount)
		require.NoError(t, err)
	}

	// Get conversions
	conversions, err := svc.GetPlayerConversions(ctx, player.ID, 10, 0)

	// Assert
	require.NoError(t, err)
	assert.Len(t, conversions, 3)
	// Should be in descending order (most recent first)
	assert.Equal(t, uint64(3000), conversions[0].GoldAmount)
	assert.Equal(t, uint64(2000), conversions[1].GoldAmount)
	assert.Equal(t, uint64(1000), conversions[2].GoldAmount)
}

func TestConversionService_MarkConversionCompleted(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player and conversion
	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hash",
		GoldBalance:  1000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 500)
	require.NoError(t, err)

	// Mark as completed
	txSig := "5a1b2c3d4e5f6g7h8i9j0k"
	err = svc.MarkConversionCompleted(ctx, conversion.ID, txSig)

	// Assert
	require.NoError(t, err)

	// Verify status changed
	updated, err := svc.GetConversion(ctx, conversion.ID)
	require.NoError(t, err)
	assert.Equal(t, entity.ConversionStatusCompleted, updated.Status)
	assert.NotNil(t, updated.TxSignature)
	assert.Equal(t, txSig, *updated.TxSignature)
	assert.NotNil(t, updated.CompletedAt)
}

func TestConversionService_MarkConversionFailed(t *testing.T) {
	db := setupConversionTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	ctx := context.Background()

	// Create player and conversion
	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hash",
		GoldBalance:  1000,
	}
	require.NoError(t, playerRepo.Create(ctx, player))

	conversion, err := svc.ConvertGoldToSpace(ctx, player.ID, 500)
	require.NoError(t, err)

	// Verify gold was deducted
	afterConversion, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)
	assert.Equal(t, uint64(500), afterConversion.GoldBalance) // 1000 - 500 = 500

	// Mark as failed (should refund)
	err = svc.MarkConversionFailed(ctx, conversion.ID)

	// Assert
	require.NoError(t, err)

	// Verify status changed
	updated, err := svc.GetConversion(ctx, conversion.ID)
	require.NoError(t, err)
	assert.Equal(t, entity.ConversionStatusFailed, updated.Status)

	// Verify gold was refunded
	afterRefund, err := playerRepo.FindByID(ctx, player.ID)
	require.NoError(t, err)
	assert.Equal(t, uint64(1000), afterRefund.GoldBalance) // Refunded back to 1000
}
