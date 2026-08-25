package entity

import (
	"gorm.io/gorm"
)

type RewardType string

const (
	RewardTypeGoldEarned  RewardType = "GOLD_EARNED"
	RewardTypeAchievement RewardType = "ACHIEVEMENT"
	RewardTypeLevelUp     RewardType = "LEVEL_UP"
	RewardTypeBattlePass  RewardType = "BATTLE_PASS"
	RewardTypeTournament  RewardType = "TOURNAMENT"
	RewardTypeGuildBonus  RewardType = "GUILD_BONUS"
)

type RewardHistory struct {
	gorm.Model
	PlayerID uint `gorm:"index;not null"`
	Player   *Player

	RewardType        RewardType `gorm:"not null"`
	GoldAmount        uint       `gorm:"default:0"`
	SpaceAmount       uint       `gorm:"default:0"`
	Description       string
	GameScore         uint
	PreviousHighScore uint
}

func (RewardHistory) TableName() string {
	return "reward_history"
}
