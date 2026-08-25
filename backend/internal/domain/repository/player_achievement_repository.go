package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type PlayerAchievementRepository interface {
	// Create a new player achievement
	Create(ctx context.Context, pa *entity.PlayerAchievement) error

	// Find all achievements for a player
	FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerAchievement, error)

	// Check if player already has this achievement
	ExistsForPlayer(ctx context.Context, playerID uint, achievementID string) (bool, error)
}
