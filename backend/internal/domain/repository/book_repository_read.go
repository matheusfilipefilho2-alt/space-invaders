package repository

import (
	"context"

	"github.com/braiphub/go-core/braipfilter"
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/braiphub/go-scaffold/internal/domain/model"
	"github.com/pkg/errors"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ReadBookReadRepository struct {
	db          *gorm.DB
	braipFilter *braipfilter.DBFilter
}

func NewBookReadRepository(db *gorm.DB) *ReadBookReadRepository {
	return &ReadBookReadRepository{
		db:          db,
		braipFilter: braipfilter.New(),
	}
}

func (r *ReadBookReadRepository) Search(
	ctx context.Context,
	filters model.SearchBookFilters,
) (*model.SearchBookResponse, error) {
	var response model.SearchBookResponse

	tx := r.db.WithContext(ctx).Model(&entity.Book{}).
		Preload(clause.Associations).
		Scopes(filters.Scope)

	cursor, err := r.braipFilter.PaginateCursor(
		filters,
		tx,
		&response.Items,
		"id",
		braipfilter.OrderDESC,
	)
	if err != nil {
		return nil, errors.Wrap(err, "paginate")
	}

	response.PaginateCursor = *cursor

	return &response, nil
}
