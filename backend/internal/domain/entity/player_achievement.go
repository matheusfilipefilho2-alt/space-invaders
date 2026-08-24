package entity

import (
	"time"

	"gorm.io/gorm"
)

type PlayerAchievement struct {
	gorm.Model
	PlayerID      uint   `gorm:"uniqueIndex:idx_player_achievement;not null"`
	AchievementID string `gorm:"uniqueIndex:idx_player_achievement;not null"`
	Player        *Player
	Achievement   *Achievement

	UnlockedAt time.Time
	Notified   bool `gorm:"default:false"`
}

func (PlayerAchievement) TableName() string {
	return "player_achievements"
}
