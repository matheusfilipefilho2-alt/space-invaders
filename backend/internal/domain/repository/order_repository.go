package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

// OrderRepository defines the interface for order operations
type OrderRepository interface {
	// Create creates a new order
	Create(ctx context.Context, order *entity.Order) error

	// FindByID retrieves an order by ID
	FindByID(ctx context.Context, id uint) (*entity.Order, error)

	// FindByExternalID retrieves an order by external ID (AbacatePay ID)
	FindByExternalID(ctx context.Context, externalID string) (*entity.Order, error)

	// FindByPlayerID retrieves orders for a player
	FindByPlayerID(ctx context.Context, playerID uint, limit, offset int) ([]entity.Order, error)

	// Update updates an order
	Update(ctx context.Context, order *entity.Order) error

	// FindPendingExpired finds orders that are pending but expired
	FindPendingExpired(ctx context.Context, limit int) ([]entity.Order, error)
}
