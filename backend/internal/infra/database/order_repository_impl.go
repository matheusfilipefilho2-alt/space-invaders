package database

import (
	"context"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type orderRepository struct {
	db *gorm.DB
}

// NewOrderRepository creates a new order repository instance
func NewOrderRepository(db *gorm.DB) repository.OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) Create(ctx context.Context, order *entity.Order) error {
	return r.db.WithContext(ctx).Create(order).Error
}

func (r *orderRepository) FindByID(ctx context.Context, id uint) (*entity.Order, error) {
	var order entity.Order
	err := r.db.WithContext(ctx).
		Preload("Player").
		First(&order, id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepository) FindByExternalID(ctx context.Context, externalID string) (*entity.Order, error) {
	var order entity.Order
	err := r.db.WithContext(ctx).
		Preload("Player").
		Where("external_id = ?", externalID).
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepository) FindByPlayerID(ctx context.Context, playerID uint, limit, offset int) ([]entity.Order, error) {
	var orders []entity.Order
	err := r.db.WithContext(ctx).
		Where("player_id = ?", playerID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&orders).Error
	return orders, err
}

func (r *orderRepository) Update(ctx context.Context, order *entity.Order) error {
	return r.db.WithContext(ctx).Save(order).Error
}

func (r *orderRepository) FindPendingExpired(ctx context.Context, limit int) ([]entity.Order, error) {
	var orders []entity.Order
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("status = ?", entity.OrderStatusPending).
		Where("expires_at < ?", now).
		Limit(limit).
		Find(&orders).Error
	return orders, err
}
