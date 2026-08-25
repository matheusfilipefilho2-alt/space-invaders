package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type PlayerRepository interface {
	// CRUD operations
	Create(ctx context.Context, player *entity.Player) error
	FindByID(ctx context.Context, id uint) (*entity.Player, error)
	Update(ctx context.Context, player *entity.Player) error
	Delete(ctx context.Context, id uint) error

	// Custom finders
	FindByUsername(ctx context.Context, username string) (*entity.Player, error)
	FindByEmail(ctx context.Context, email string) (*entity.Player, error)
	FindAll(ctx context.Context, limit, offset int) ([]*entity.Player, error)

	// Specialized updates
	UpdateGoldBalance(ctx context.Context, playerID uint, delta int64) error
	UpdateSpaceBalance(ctx context.Context, playerID uint, delta int64) error
	UpdateHighScore(ctx context.Context, playerID uint, newScore uint64) error
	IncrementTotalGames(ctx context.Context, playerID uint) error
	UpdateLeague(ctx context.Context, playerID uint, leagueID uint) error

	// Leaderboard queries
	FindTopByScore(ctx context.Context, limit, offset int) ([]*entity.Player, error)
	FindTopByScoreInLeague(ctx context.Context, leagueID uint, limit, offset int) ([]*entity.Player, error)
}
