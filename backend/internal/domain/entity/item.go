package entity

import (
	"time"
)

type ItemCategory string

const (
	ItemCategorySkin     ItemCategory = "skin"
	ItemCategoryPowerup  ItemCategory = "powerup"
	ItemCategoryBoost    ItemCategory = "boost"
	ItemCategorySpecial  ItemCategory = "special"
	ItemCategoryTheme    ItemCategory = "theme"
	ItemCategoryCosmetic ItemCategory = "cosmetic"
	ItemCategoryUtility  ItemCategory = "utility"
	ItemCategoryCoinPack ItemCategory = "coin_pack"
)

type ItemRarity string

const (
	ItemRarityCommon    ItemRarity = "common"
	ItemRarityUncommon  ItemRarity = "uncommon"
	ItemRarityRare      ItemRarity = "rare"
	ItemRarityEpic      ItemRarity = "epic"
	ItemRarityLegendary ItemRarity = "legendary"
)

type Item struct {
	ID          string       `gorm:"primaryKey;type:text" json:"id"`
	Name        string       `gorm:"not null" json:"name"`
	Description string       `gorm:"type:text" json:"description"`
	Category    ItemCategory `gorm:"not null;index" json:"category"`
	PriceGold   *uint64      `json:"priceGold,omitempty"`
	PriceReal   *float64     `gorm:"type:numeric(10,2)" json:"priceReal,omitempty"`
	CoinAmount  *uint64      `json:"coinAmount,omitempty"`
	Image       string       `json:"image"`
	Rarity      ItemRarity   `gorm:"not null;default:'common';index" json:"rarity"`
	UnlockLevel *uint64      `json:"unlockLevel,omitempty"`
	Permanent   bool         `gorm:"default:false" json:"permanent"`
	Duration    *string      `json:"duration,omitempty"`
	Disabled    bool         `gorm:"default:false" json:"disabled"`
	ComingSoon  bool         `gorm:"default:false" json:"comingSoon"`
	SkinFile    *string      `json:"skinFile,omitempty"`
	IsDefault   bool         `gorm:"default:false" json:"isDefault"`
	IsActive    bool         `gorm:"default:true;index" json:"isActive"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
	DeletedAt   *time.Time   `gorm:"index" json:"deletedAt,omitempty"`
}

func (Item) TableName() string {
	return "items"
}
