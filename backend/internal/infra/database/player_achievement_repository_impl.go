package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type playerAchievementRepositoryImpl struct {
	db *gorm.DB
}

// NewPlayerAchievementRepository creates a new player achievement repository
func NewPlayerAchievementRepository(db *gorm.DB) repository.PlayerAchievementRepository {
	return &playerAchievementRepositoryImpl{db: db}
}

func (r *playerAchievementRepositoryImpl) Create(ctx context.Context, pa *entity.PlayerAchievement) error {
	return r.db.WithContext(ctx).Create(pa).Error
}

func (r *playerAchievementRepositoryImpl) FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerAchievement, error) {
	var pas []*entity.PlayerAchievement
	err := r.db.WithContext(ctx).
		Preload("Achievement").
		Where("player_id = ?", playerID).
		Find(&pas).Error
	return pas, err
}

func (r *playerAchievementRepositoryImpl) ExistsForPlayer(ctx context.Context, playerID uint, achievementID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&entity.PlayerAchievement{}).
		Where("player_id = ? AND achievement_id = ?", playerID, achievementID).
		Count(&count).Error
	return count > 0, err
}
