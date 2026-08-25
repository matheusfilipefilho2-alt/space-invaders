package entity

import (
	"time"

	"gorm.io/gorm"
)

type PlayerItem struct {
	gorm.Model
	PlayerID uint `gorm:"index:idx_player_items;not null"`
	Player   *Player

	ItemID   uint `gorm:"not null;index"`
	Item     *Item
	Equipped bool `gorm:"default:false"`

	// NFT tracking (optional)
	NFTMintAddress *string
	IsOnChain      bool       `gorm:"default:false"`
	MintedAt       *time.Time
	BurnedAt       *time.Time
}

func (PlayerItem) TableName() string {
	return "player_items"
}
