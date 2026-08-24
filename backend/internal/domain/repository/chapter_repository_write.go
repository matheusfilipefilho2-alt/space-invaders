package repository

import (
	"context"

	"github.com/braiphub/go-core/hashid"
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

type WriteChapterRepository struct {
	db     *gorm.DB
	hasher hashid.Hasher
}

func NewWriteChapterRepository(db *gorm.DB, hasher hashid.Hasher) *WriteChapterRepository {
	return &WriteChapterRepository{
		db:     db,
		hasher: hasher.WithPrefix("cha"),
	}
}

func (r *WriteChapterRepository) Create(ctx context.Context, chapter *entity.Chapter) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(chapter).Error; err != nil {
			return errors.Wrap(err, "db create")
		}

		hash, err := r.hasher.Generate(chapter.ID)
		if err != nil {
			return errors.Wrap(err, "hash generate")
		}

		chapter.Hash = &hash

		if err := tx.Save(chapter).Error; err != nil {
			return errors.Wrap(err, "db save")
		}

		return nil
	})

	if err != nil {
		return errors.Wrap(err, "transaction")
	}

	return nil
}
