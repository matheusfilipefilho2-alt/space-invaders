package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type playerItemRepository struct {
	db *gorm.DB
}

// NewPlayerItemRepository creates a new instance of PlayerItemRepository
func NewPlayerItemRepository(db *gorm.DB) repository.PlayerItemRepository {
	return &playerItemRepository{db: db}
}

// Create creates a new player item in the database
func (r *playerItemRepository) Create(ctx context.Context, pi *entity.PlayerItem) error {
	return r.db.WithContext(ctx).Create(pi).Error
}

// FindByPlayerID retrieves all items owned by a player with item details preloaded
func (r *playerItemRepository) FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerItem, error) {
	var playerItems []*entity.PlayerItem
	err := r.db.WithContext(ctx).
		Preload("Item").
		Where("player_id = ?", playerID).
		Find(&playerItems).Error
	if err != nil {
		return nil, err
	}
	return playerItems, nil
}

// FindByPlayerAndItem retrieves a specific player item
func (r *playerItemRepository) FindByPlayerAndItem(ctx context.Context, playerID uint, itemID string) (*entity.PlayerItem, error) {
	var playerItem entity.PlayerItem
	err := r.db.WithContext(ctx).
		Preload("Item").
		Where("player_id = ? AND item_id = ?", playerID, itemID).
		First(&playerItem).Error
	if err != nil {
		return nil, err
	}
	return &playerItem, nil
}

// Update updates an existing player item
func (r *playerItemRepository) Update(ctx context.Context, pi *entity.PlayerItem) error {
	return r.db.WithContext(ctx).Save(pi).Error
}

// UnequipAllByCategory unequips all items of a specific category for a player
// This uses a subquery to find item IDs that match the category
func (r *playerItemRepository) UnequipAllByCategory(ctx context.Context, playerID uint, category entity.ItemCategory) error {
	return r.db.WithContext(ctx).
		Model(&entity.PlayerItem{}).
		Where("player_id = ? AND item_id IN (?)",
			playerID,
			r.db.Model(&entity.Item{}).Select("id").Where("category = ?", category),
		).
		Update("equipped", false).Error
}
