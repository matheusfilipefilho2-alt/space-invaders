package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type AchievementRepository interface {
	// CRUD operations
	Create(ctx context.Context, achievement *entity.Achievement) error
	FindByID(ctx context.Context, id string) (*entity.Achievement, error)
	Update(ctx context.Context, achievement *entity.Achievement) error
	Delete(ctx context.Context, id string) error

	// Custom finders
	FindAll(ctx context.Context) ([]*entity.Achievement, error)
	FindByRarity(ctx context.Context, rarity entity.AchievementRarity) ([]*entity.Achievement, error)
}
