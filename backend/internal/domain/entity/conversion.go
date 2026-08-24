package entity

import (
	"time"

	"gorm.io/gorm"
)

type ConversionType string
type ConversionStatus string

const (
	ConversionTypeGoldToSpace ConversionType = "GOLD_TO_SPACE"
	ConversionTypeSpaceToGold ConversionType = "SPACE_TO_GOLD"

	ConversionStatusPending   ConversionStatus = "PENDING"
	ConversionStatusCompleted ConversionStatus = "COMPLETED"
	ConversionStatusFailed    ConversionStatus = "FAILED"
)

type GoldSpaceConversion struct {
	gorm.Model
	PlayerID uint `gorm:"index;not null"`
	Player   *Player

	Type         ConversionType   `gorm:"not null"`
	GoldAmount   uint64           `gorm:"not null"`
	SpaceAmount  uint64           `gorm:"not null"`
	ExchangeRate uint             `gorm:"not null;default:100"` // Gold per SPACE

	TxSignature *string          `gorm:"uniqueIndex"` // Solana transaction
	Status      ConversionStatus `gorm:"not null;default:PENDING"`
	CompletedAt *time.Time
}

func (GoldSpaceConversion) TableName() string {
	return "gold_space_conversions"
}
