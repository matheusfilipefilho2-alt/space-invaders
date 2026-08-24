package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type LeagueRepository interface {
	// CRUD operations
	Create(ctx context.Context, league *entity.League) error
	FindByID(ctx context.Context, id uint) (*entity.League, error)
	Update(ctx context.Context, league *entity.League) error
	Delete(ctx context.Context, id uint) error

	// Custom finders
	FindAll(ctx context.Context) ([]*entity.League, error)
	FindByPoints(ctx context.Context, points uint) (*entity.League, error)
}
