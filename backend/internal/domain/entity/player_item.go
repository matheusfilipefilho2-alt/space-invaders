package entity

import (
	"time"

	"gorm.io/gorm"
)

type ItemType string

const (
	ItemTypeSkin      ItemType = "skin"
	ItemTypePowerup   ItemType = "powerup"
	ItemTypeCosmetic  ItemType = "cosmetic"
)

type PlayerItem struct {
	gorm.Model
	PlayerID uint `gorm:"index:idx_player_items;not null"`
	Player   *Player

	ItemID     string   `gorm:"not null"` // e.g., "skin_epic_001"
	ItemType   ItemType `gorm:"not null"`
	ItemName   string
	IsEquipped bool `gorm:"default:false"`
	IsPermanent bool `gorm:"default:true"`

	// NFT tracking
	NFTMintAddress *string
	IsOnChain      bool `gorm:"default:false"`
	MintedAt       *time.Time
	BurnedAt       *time.Time
}

func (PlayerItem) TableName() string {
	return "player_items"
}
