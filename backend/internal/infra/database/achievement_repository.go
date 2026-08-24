package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type achievementRepository struct {
	db *gorm.DB
}

// NewAchievementRepository creates a new instance of AchievementRepository
func NewAchievementRepository(db *gorm.DB) repository.AchievementRepository {
	return &achievementRepository{db: db}
}

// Create creates a new achievement in the database
func (r *achievementRepository) Create(ctx context.Context, achievement *entity.Achievement) error {
	return r.db.WithContext(ctx).Create(achievement).Error
}

// FindByID retrieves an achievement by ID
func (r *achievementRepository) FindByID(ctx context.Context, id string) (*entity.Achievement, error) {
	var achievement entity.Achievement
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&achievement).Error
	if err != nil {
		return nil, err
	}
	return &achievement, nil
}

// Update updates an existing achievement
func (r *achievementRepository) Update(ctx context.Context, achievement *entity.Achievement) error {
	return r.db.WithContext(ctx).Save(achievement).Error
}

// Delete soft deletes an achievement by ID
func (r *achievementRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&entity.Achievement{}).Error
}

// FindAll retrieves all achievements ordered by rarity and name
func (r *achievementRepository) FindAll(ctx context.Context) ([]*entity.Achievement, error) {
	var achievements []*entity.Achievement
	err := r.db.WithContext(ctx).
		Order("rarity DESC, name ASC").
		Find(&achievements).Error
	if err != nil {
		return nil, err
	}
	return achievements, nil
}

// FindByRarity retrieves all achievements of a specific rarity
func (r *achievementRepository) FindByRarity(ctx context.Context, rarity entity.AchievementRarity) ([]*entity.Achievement, error) {
	var achievements []*entity.Achievement
	err := r.db.WithContext(ctx).
		Where("rarity = ?", rarity).
		Order("name ASC").
		Find(&achievements).Error
	if err != nil {
		return nil, err
	}
	return achievements, nil
}
