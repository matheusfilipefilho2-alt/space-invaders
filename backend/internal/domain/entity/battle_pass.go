package entity

import (
	"time"

	"gorm.io/gorm"
)

// BattlePassSeason represents a Battle Pass season (30 days)
type BattlePassSeason struct {
	gorm.Model

	Name      string    `gorm:"not null;uniqueIndex"`
	StartDate time.Time `gorm:"not null;index"`
	EndDate   time.Time `gorm:"not null;index"`
	Active    bool      `gorm:"default:false;index"`
	MaxTier   uint      `gorm:"not null;default:50"`

	// XP configuration
	XPPerTier uint `gorm:"not null;default:100"` // XP required per tier

	// Metadata
	Description string
	ImageURL    string
}

// BattlePassProgress tracks player progress in a season
type BattlePassProgress struct {
	gorm.Model

	PlayerID uint             `gorm:"not null;index:idx_player_season"`
	Player   *Player          `gorm:"foreignKey:PlayerID"`
	SeasonID uint             `gorm:"not null;index:idx_player_season;index"`
	Season   *BattlePassSeason `gorm:"foreignKey:SeasonID"`

	// Progress tracking
	XP          uint `gorm:"not null;default:0"`
	CurrentTier uint `gorm:"not null;default:0"`

	// Premium status
	IsPremium bool `gorm:"default:false"`

	// Reward tracking (bitfield for claimed rewards)
	ClaimedFreeTiers    string `gorm:"type:text"` // JSON array of claimed free tier numbers
	ClaimedPremiumTiers string `gorm:"type:text"` // JSON array of claimed premium tier numbers
}

// TableName sets custom table name
func (BattlePassProgress) TableName() string {
	return "battle_pass_progress"
}

// BattlePassReward defines rewards for each tier
type BattlePassReward struct {
	gorm.Model

	SeasonID uint             `gorm:"not null;index:idx_season_tier"`
	Season   *BattlePassSeason `gorm:"foreignKey:SeasonID"`
	Tier     uint             `gorm:"not null;index:idx_season_tier"`

	// Reward type: "free" or "premium"
	Type string `gorm:"not null;type:varchar(20)"`

	// Reward content
	RewardType  string `gorm:"not null;type:varchar(50)"` // gold, space, nft, item, achievement
	GoldAmount  uint   `gorm:"default:0"`
	SpaceAmount uint64 `gorm:"default:0"` // in lamports
	ItemID      *uint  `gorm:"index"`
	Item        *Item  `gorm:"foreignKey:ItemID"`

	// NFT reward (if applicable)
	NFTCollectionID *uint  `gorm:"index"`
	NFTMetadataURI  string // IPFS URI for NFT metadata

	// Display
	Name        string
	Description string
	ImageURL    string
}

// TableName sets custom table name
func (BattlePassReward) TableName() string {
	return "battle_pass_rewards"
}

// BattlePassPurchase tracks premium Battle Pass purchases
type BattlePassPurchase struct {
	gorm.Model

	PlayerID uint             `gorm:"not null;index"`
	Player   *Player          `gorm:"foreignKey:PlayerID"`
	SeasonID uint             `gorm:"not null;index"`
	Season   *BattlePassSeason `gorm:"foreignKey:SeasonID"`

	// Payment details
	Amount       uint   `gorm:"not null"` // Price in cents (BRL)
	PaymentType  string `gorm:"not null;type:varchar(20)"` // pix, credit_card
	Status       string `gorm:"not null;default:'pending';type:varchar(20)"` // pending, completed, failed
	OrderID      string `gorm:"index"` // AbacatePay order ID
	CompletedAt  *time.Time
	FailedAt     *time.Time
	ErrorMessage string
}

// TableName sets custom table name
func (BattlePassPurchase) TableName() string {
	return "battle_pass_purchases"
}
