package entity

import (
	"github.com/braiphub/go-scaffold/internal/domain/enum"
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
