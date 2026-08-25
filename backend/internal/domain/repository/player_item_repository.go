package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type PlayerItemRepository interface {
	Create(ctx context.Context, pi *entity.PlayerItem) error
	FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerItem, error)
	FindByPlayerAndItem(ctx context.Context, playerID, itemID uint) (*entity.PlayerItem, error)
	Update(ctx context.Context, pi *entity.PlayerItem) error
	UnequipAllByCategory(ctx context.Context, playerID uint, category entity.ItemCategory) error
}
