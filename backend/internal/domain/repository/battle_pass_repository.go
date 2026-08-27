package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type BattlePassRepository interface {
	// Season management
	GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error)
	GetSeasonByID(ctx context.Context, seasonID uint) (*entity.BattlePassSeason, error)
	GetActiveSeasons(ctx context.Context) ([]entity.BattlePassSeason, error)
	CreateSeason(ctx context.Context, season *entity.BattlePassSeason) error
	UpdateSeason(ctx context.Context, season *entity.BattlePassSeason) error

	// Player progress
	GetPlayerProgress(ctx context.Context, playerID, seasonID uint) (*entity.BattlePassProgress, error)
	CreateProgress(ctx context.Context, progress *entity.BattlePassProgress) error
	AddXP(ctx context.Context, playerID, seasonID uint, xp uint) error
	UpdateTier(ctx context.Context, playerID, seasonID, newTier uint) error

	// Reward management
	GetSeasonRewards(ctx context.Context, seasonID uint) ([]entity.BattlePassReward, error)
	GetTierReward(ctx context.Context, seasonID, tier uint, rewardType string) (*entity.BattlePassReward, error)
	ClaimReward(ctx context.Context, playerID, seasonID, tier uint, rewardType string) error
	IsRewardClaimed(ctx context.Context, playerID, seasonID, tier uint, rewardType string) (bool, error)

	// Premium management
	UpgradeToPremium(ctx context.Context, playerID, seasonID uint) error
	IsPremium(ctx context.Context, playerID, seasonID uint) (bool, error)

	// Leaderboard
	GetTopPlayersBySeason(ctx context.Context, seasonID uint, limit int) ([]entity.BattlePassProgress, error)
}
