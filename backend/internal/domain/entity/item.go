package entity

import (
	"gorm.io/gorm"
)

type ItemCategory string

const (
	ItemCategoryShip       ItemCategory = "ship"
	ItemCategoryWeapon     ItemCategory = "weapon"
	ItemCategoryShield     ItemCategory = "shield"
	ItemCategoryBackground ItemCategory = "background"
)

type Item struct {
	gorm.Model
	Name        string       `gorm:"not null"`
	Description string       `gorm:"type:text"`
	Category    ItemCategory `gorm:"not null;index"`
	PriceGold   uint64       `gorm:"not null"`
	PriceSpace  uint64       `gorm:"default:0"`
	IconURL     string       `gorm:"type:text"`
	IsActive    bool         `gorm:"default:true"`
}

func (Item) TableName() string {
	return "items"
}
