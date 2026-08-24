package repository

import (
	"github.com/braiphub/go-core/braipfilter"
	"gorm.io/gorm"
)

type ReadChapterReadRepository struct {
	db          *gorm.DB
	braipFilter *braipfilter.DBFilter
}

func NewChapterReadRepository(db *gorm.DB) *ReadChapterReadRepository {
	return &ReadChapterReadRepository{
		db:          db,
		braipFilter: braipfilter.New(),
	}
}
