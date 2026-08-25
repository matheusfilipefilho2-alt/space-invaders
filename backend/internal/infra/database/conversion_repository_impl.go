package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type conversionRepository struct {
	db *gorm.DB
}

// NewConversionRepository creates a new conversion repository instance
func NewConversionRepository(db *gorm.DB) repository.ConversionRepository {
	return &conversionRepository{db: db}
}

func (r *conversionRepository) Create(ctx context.Context, conversion *entity.GoldSpaceConversion) error {
	return r.db.WithContext(ctx).Create(conversion).Error
}

func (r *conversionRepository) FindByID(ctx context.Context, id uint) (*entity.GoldSpaceConversion, error) {
	var conversion entity.GoldSpaceConversion
	err := r.db.WithContext(ctx).
		Preload("Player").
		First(&conversion, id).Error
	if err != nil {
		return nil, err
	}
	return &conversion, nil
}

func (r *conversionRepository) ListByPlayerID(ctx context.Context, playerID uint, limit, offset int) ([]entity.GoldSpaceConversion, error) {
	var conversions []entity.GoldSpaceConversion
	err := r.db.WithContext(ctx).
		Where("player_id = ?", playerID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&conversions).Error
	return conversions, err
}

func (r *conversionRepository) Update(ctx context.Context, conversion *entity.GoldSpaceConversion) error {
	return r.db.WithContext(ctx).Save(conversion).Error
}

func (r *conversionRepository) FindByTxSignature(ctx context.Context, txSignature string) (*entity.GoldSpaceConversion, error) {
	var conversion entity.GoldSpaceConversion
	err := r.db.WithContext(ctx).
		Where("tx_signature = ?", txSignature).
		First(&conversion).Error
	if err != nil {
		return nil, err
	}
	return &conversion, nil
}

func (r *conversionRepository) ListPending(ctx context.Context, limit int) ([]entity.GoldSpaceConversion, error) {
	var conversions []entity.GoldSpaceConversion
	err := r.db.WithContext(ctx).
		Where("status = ?", entity.ConversionStatusPending).
		Order("created_at ASC").
		Limit(limit).
		Find(&conversions).Error
	return conversions, err
}
