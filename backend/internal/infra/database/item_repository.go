package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type itemRepository struct {
	db *gorm.DB
}

// NewItemRepository creates a new instance of ItemRepository
func NewItemRepository(db *gorm.DB) repository.ItemRepository {
	return &itemRepository{db: db}
}

// Create creates a new item in the database
func (r *itemRepository) Create(ctx context.Context, item *entity.Item) error {
	return r.db.WithContext(ctx).Create(item).Error
}

// FindByID retrieves an item by ID
func (r *itemRepository) FindByID(ctx context.Context, id string) (*entity.Item, error) {
	var item entity.Item
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

// FindAll retrieves all items
func (r *itemRepository) FindAll(ctx context.Context) ([]*entity.Item, error) {
	var items []*entity.Item
	err := r.db.WithContext(ctx).
		Order("category, name").
		Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

// FindByCategory retrieves all items in a specific category
func (r *itemRepository) FindByCategory(ctx context.Context, category entity.ItemCategory) ([]*entity.Item, error) {
	var items []*entity.Item
	err := r.db.WithContext(ctx).
		Where("category = ?", category).
		Order("name").
		Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

// FindActive retrieves all active items
func (r *itemRepository) FindActive(ctx context.Context) ([]*entity.Item, error) {
	var items []*entity.Item
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("category, name").
		Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}
