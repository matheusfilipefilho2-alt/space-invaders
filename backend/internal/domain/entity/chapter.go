package entity

import (
	"gorm.io/gorm"
)

type Chapter struct {
	gorm.Model `exhaustruct:"optional"`
	BookID     uint
	Hash       *string `exhaustruct:"optional"`
	Name       string
}

func NewChapter(bookID uint, name string) Chapter {
	return Chapter{
		BookID: bookID,
		Name:   name,
	}
}
