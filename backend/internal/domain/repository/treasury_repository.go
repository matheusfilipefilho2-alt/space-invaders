package repository

import (
	"context"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

// TreasuryRepository defines the interface for treasury operations
type TreasuryRepository interface {
	// GetConfig returns the current treasury configuration
	GetConfig(ctx context.Context) (*entity.TreasuryConfig, error)

	// UpdateConfig updates the treasury configuration
	UpdateConfig(ctx context.Context, config *entity.TreasuryConfig) error

	// GetDailyEmission returns the daily emission record for a specific date
	GetDailyEmission(ctx context.Context, date time.Time) (*entity.DailyEmission, error)

	// CreateOrUpdateDailyEmission creates or updates a daily emission record
	CreateOrUpdateDailyEmission(ctx context.Context, emission *entity.DailyEmission) error

	// GetEmissionHistory returns emission records between two dates
	GetEmissionHistory(ctx context.Context, startDate, endDate time.Time) ([]entity.DailyEmission, error)
}
