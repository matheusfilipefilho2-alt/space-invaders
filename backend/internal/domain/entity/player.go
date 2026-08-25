package entity

import (
	"time"

	"gorm.io/gorm"
)

type Player struct {
	gorm.Model
	Username      string  `gorm:"uniqueIndex;not null"`
	Email         string  `gorm:"uniqueIndex"`
	EmailVerified bool
	PasswordHash  string  `gorm:"not null"`
	WalletAddress *string `gorm:"uniqueIndex"`

	// Stats
	HighScore  uint64
	TotalGames uint
	TotalKills uint
	LastPlayed *time.Time

	// Economy
	GoldBalance  uint64
	SpaceBalance uint64
	SolanaWallet *string `gorm:"index"` // Player's Solana wallet address for SPACE tokens

	// Progression
	LeagueID   uint
	RankPoints uint
	League     *League

	// Notifications
	NotifyOffers       bool
	NotifyAchievements bool
	NotifyShop         bool

	// Relations
	GuildID *uint
}

func (Player) TableName() string {
	return "players"
}
