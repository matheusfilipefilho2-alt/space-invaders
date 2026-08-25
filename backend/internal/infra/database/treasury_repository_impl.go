package database

import (
	"context"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type treasuryRepository struct {
	db *gorm.DB
}

// NewTreasuryRepository creates a new treasury repository instance
func NewTreasuryRepository(db *gorm.DB) repository.TreasuryRepository {
	return &treasuryRepository{db: db}
}

func (r *treasuryRepository) GetConfig(ctx context.Context) (*entity.TreasuryConfig, error) {
	var config entity.TreasuryConfig
	err := r.db.WithContext(ctx).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *treasuryRepository) UpdateConfig(ctx context.Context, config *entity.TreasuryConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

func (r *treasuryRepository) GetDailyEmission(ctx context.Context, date time.Time) (*entity.DailyEmission, error) {
	var emission entity.DailyEmission

	// Normalize date to start of day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	err := r.db.WithContext(ctx).
		Where("date = ?", startOfDay).
		First(&emission).Error

	if err != nil {
		return nil, err
	}

	return &emission, nil
}

func (r *treasuryRepository) CreateOrUpdateDailyEmission(ctx context.Context, emission *entity.DailyEmission) error {
	// Normalize date to start of day
	startOfDay := time.Date(emission.Date.Year(), emission.Date.Month(), emission.Date.Day(), 0, 0, 0, 0, time.UTC)
	emission.Date = startOfDay

	// Try to find existing record
	var existing entity.DailyEmission
	err := r.db.WithContext(ctx).
		Where("date = ?", startOfDay).
		First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Create new record
		return r.db.WithContext(ctx).Create(emission).Error
	} else if err != nil {
		return err
	}

	// Update existing record
	emission.ID = existing.ID
	return r.db.WithContext(ctx).Save(emission).Error
}

func (r *treasuryRepository) GetEmissionHistory(ctx context.Context, startDate, endDate time.Time, limit int) ([]entity.DailyEmission, error) {
	var emissions []entity.DailyEmission

	// Normalize dates
	startOfStartDate := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
	endOfEndDate := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, time.UTC)

	query := r.db.WithContext(ctx).
		Where("date >= ? AND date <= ?", startOfStartDate, endOfEndDate).
		Order("date DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&emissions).Error

	if err != nil {
		return nil, err
	}

	return emissions, nil
}
