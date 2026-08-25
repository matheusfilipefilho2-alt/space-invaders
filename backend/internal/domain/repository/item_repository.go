package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type ItemRepository interface {
	Create(ctx context.Context, item *entity.Item) error
	FindByID(ctx context.Context, id uint) (*entity.Item, error)
	FindAll(ctx context.Context) ([]*entity.Item, error)
	FindByCategory(ctx context.Context, category entity.ItemCategory) ([]*entity.Item, error)
	FindActive(ctx context.Context) ([]*entity.Item, error)
}
