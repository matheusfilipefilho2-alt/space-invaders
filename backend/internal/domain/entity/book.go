package entity

import (
	"github.com/yourusername/space-invaders/internal/domain/enum"
	"gorm.io/gorm"
)

type Book struct {
	gorm.Model `exhaustruct:"optional"`
	Hash       string
	Name       string
	BookType   enum.BookType
}

func NewBook(hash, name string, bookType enum.BookType) Book {
	return Book{
		Hash:     hash,
		Name:     name,
		BookType: bookType,
	}
}
