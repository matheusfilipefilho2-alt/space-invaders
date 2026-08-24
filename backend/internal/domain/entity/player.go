package entity

import (
	"time"

	"gorm.io/gorm"
)

type Player struct {
	gorm.Model
	Username     string  `gorm:"uniqueIndex;not null"`
	Email        string  `gorm:"uniqueIndex"`
	EmailVerified bool   `gorm:"default:false"`
	PasswordHash string  `gorm:"not null"`
	WalletAddress *string `gorm:"uniqueIndex"`

	// Stats
	HighScore  uint64     `gorm:"default:0"`
	TotalGames uint       `gorm:"default:0"`
	LastPlayed *time.Time

	// Economy
	GoldBalance  uint64 `gorm:"default:0"`
	SpaceBalance uint64 `gorm:"default:0"`

	// Progression
	LeagueID   uint `gorm:"default:1"`
	RankPoints uint `gorm:"default:0"`
	League     *League

	// Notifications
	NotifyOffers       bool `gorm:"default:true"`
	NotifyAchievements bool `gorm:"default:true"`
	NotifyShop         bool `gorm:"default:false"`

	// Relations
	GuildID *uint
}

func (Player) TableName() string {
	return "players"
}
