package repository

import (
	"context"

	"github.com/pkg/errors"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

type WriteBookRepository struct {
	db *gorm.DB
}

func NewWriteBookRepository(db *gorm.DB) *WriteBookRepository {
	return &WriteBookRepository{db: db}
}

func (r *WriteBookRepository) Create(ctx context.Context, book *entity.Book) error {
	if err := r.db.WithContext(ctx).Create(book).Error; err != nil {
		return errors.Wrap(err, "db create")
	}

	return nil
}
