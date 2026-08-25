package service

import (
	"context"
	"fmt"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type EmissionCalculatorService struct {
	treasuryRepo repository.TreasuryRepository
	priceFetcher repository.PriceFetcher
}

func NewEmissionCalculatorService(
	treasuryRepo repository.TreasuryRepository,
	priceFetcher repository.PriceFetcher,
) *EmissionCalculatorService {
	return &EmissionCalculatorService{
		treasuryRepo: treasuryRepo,
		priceFetcher: priceFetcher,
	}
}

// CalculateDailyEmission calculates the SPACE emission for a given day
// Formula: SPACE_emission = min(gameplay_rewards, (revenue_24h × revenue_share_percent) / price_SPACE)
//
// Parameters:
// - gameplayRewards: Total Gold earned from gameplay in the day (in Gold units)
// - revenue24h: PIX revenue in the last 24h (in cents, e.g., 10000 = R$ 100.00)
// - date: The date for this emission calculation (truncated to day)
//
// Returns:
// - DailyEmission entity with calculated values
func (s *EmissionCalculatorService) CalculateDailyEmission(
	ctx context.Context,
	gameplayRewards uint64,
	revenue24h uint64,
	date time.Time,
) (*entity.DailyEmission, error) {
	// Get treasury config
	config, err := s.treasuryRepo.GetConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get treasury config: %w", err)
	}

	// Get current SPACE price in cents (e.g., 100 = $1.00)
	spacePrice, err := s.priceFetcher.GetSpacePrice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get SPACE price: %w", err)
	}

	if spacePrice == 0 {
		return nil, fmt.Errorf("invalid SPACE price: cannot be zero")
	}

	// Calculate revenue-based emission cap
	// revenue_cap = (revenue_24h × revenue_share_percent) / price_SPACE
	// Example: (10000 cents × 0.30) / 100 cents = 30 SPACE
	revenueShare := uint64(float64(revenue24h) * config.RevenueSharePercent)
	revenueBasedCap := revenueShare / spacePrice // This gives us SPACE tokens

	// Convert gameplay rewards (Gold) to SPACE using conversion ratio
	// Example: 1000 Gold / 100 ratio = 10 SPACE
	gameplaySpaceTokens := gameplayRewards / config.ConversionRatio

	// Take minimum of gameplay rewards and revenue-based cap
	var emissionTokens uint64
	if gameplaySpaceTokens < revenueBasedCap {
		emissionTokens = gameplaySpaceTokens
	} else {
		emissionTokens = revenueBasedCap
	}

	// Apply daily emission limits
	emissionLamports := emissionTokens * LamportsPerSpace
	if emissionLamports > config.MaxEmissionPerDay {
		emissionLamports = config.MaxEmissionPerDay
	}
	if emissionLamports < config.MinEmissionPerDay {
		emissionLamports = config.MinEmissionPerDay
	}

	// Calculate emission limit from revenue
	emissionLimit := revenueBasedCap * LamportsPerSpace

	// Create DailyEmission record
	emission := &entity.DailyEmission{
		Date:              date.UTC().Truncate(24 * time.Hour),
		GameplayRewards:   gameplaySpaceTokens * LamportsPerSpace, // Store in lamports
		PixRevenue24h:     revenue24h,
		SpacePrice:        spacePrice,
		EmissionLimit:     emissionLimit,
		EmissionUsed:      emissionLamports,
		EmissionAvailable: emissionLimit - emissionLamports,
	}

	return emission, nil
}

// SaveDailyEmission saves the calculated emission to the database
func (s *EmissionCalculatorService) SaveDailyEmission(ctx context.Context, emission *entity.DailyEmission) error {
	return s.treasuryRepo.CreateOrUpdateDailyEmission(ctx, emission)
}

// GetTreasuryConfig retrieves the treasury configuration
func (s *EmissionCalculatorService) GetTreasuryConfig(ctx context.Context) (*entity.TreasuryConfig, error) {
	return s.treasuryRepo.GetConfig(ctx)
}

// GetEmissionHistory retrieves emission history for a date range with optional limit
func (s *EmissionCalculatorService) GetEmissionHistory(ctx context.Context, startDate, endDate time.Time, limit int) ([]entity.DailyEmission, error) {
	return s.treasuryRepo.GetEmissionHistory(ctx, startDate, endDate, limit)
}
