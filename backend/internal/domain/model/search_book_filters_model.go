package model

import (
	"github.com/braiphub/go-core/braipfilter"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

type SearchBookFilters struct {
	PerPage int
	Cursor  *string
	Name    *string
}

func (sf SearchBookFilters) Scope(db *gorm.DB) *gorm.DB {
	if sf.Name != nil {
		db.Where("name = ?", *sf.Name)
	}

	return db
}

type SearchBookResponse struct {
	braipfilter.PaginateCursor
	Items []entity.Book
}
