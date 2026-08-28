package entity

import "time"

type AchievementRarity string

const (
	AchievementRarityCommon    AchievementRarity = "COMMON"
	AchievementRarityRare      AchievementRarity = "RARE"
	AchievementRarityEpic      AchievementRarity = "EPIC"
	AchievementRarityLegendary AchievementRarity = "LEGENDARY"
)

type Achievement struct {
	ID               string `gorm:"primaryKey"` // e.g., "first_kill"
	Name             string `gorm:"not null"`
	Description      string
	Icon             string
	Rarity           AchievementRarity `gorm:"not null;default:COMMON"`
	RewardGold       uint              `gorm:"default:0"`
	RequirementType  string            `gorm:"not null"` // e.g., "first_kill", "score_milestone", "games_played"
	RequirementValue uint              `gorm:"not null"` // e.g., 1 for first kill, 10000 for score, 100 for games

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Achievement) TableName() string {
	return "achievements"
}

// SeedAchievements returns initial achievements
func SeedAchievements() []Achievement {
	return []Achievement{
		// Score Achievements
		{
			ID:               "score_1k",
			Name:             "First Steps",
			Description:      "Score 1,000 points",
			Icon:             "🎯",
			Rarity:           AchievementRarityCommon,
			RewardGold:       5,
			RequirementType:  "score",
			RequirementValue: 1000,
		},
		{
			ID:               "score_5k",
			Name:             "Rising Star",
			Description:      "Score 5,000 points",
			Icon:             "⭐",
			Rarity:           AchievementRarityCommon,
			RewardGold:       10,
			RequirementType:  "score",
			RequirementValue: 5000,
		},
		{
			ID:               "score_10k",
			Name:             "Elite Pilot",
			Description:      "Score 10,000 points",
			Icon:             "🏆",
			Rarity:           AchievementRarityRare,
			RewardGold:       25,
			RequirementType:  "score",
			RequirementValue: 10000,
		},
		{
			ID:               "score_50k",
			Name:             "Master of Space",
			Description:      "Score 50,000 points",
			Icon:             "👑",
			Rarity:           AchievementRarityEpic,
			RewardGold:       50,
			RequirementType:  "score",
			RequirementValue: 50000,
		},

		// Kill Achievements
		{
			ID:               "kills_50",
			Name:             "Exterminator",
			Description:      "Destroy 50 invaders",
			Icon:             "💥",
			Rarity:           AchievementRarityCommon,
			RewardGold:       5,
			RequirementType:  "kills",
			RequirementValue: 50,
		},
		{
			ID:               "kills_200",
			Name:             "Alien Hunter",
			Description:      "Destroy 200 invaders",
			Icon:             "🔫",
			Rarity:           AchievementRarityRare,
			RewardGold:       15,
			RequirementType:  "kills",
			RequirementValue: 200,
		},
		{
			ID:               "kills_500",
			Name:             "Genocide",
			Description:      "Destroy 500 invaders",
			Icon:             "☠️",
			Rarity:           AchievementRarityEpic,
			RewardGold:       30,
			RequirementType:  "kills",
			RequirementValue: 500,
		},

		// Combo Achievements
		{
			ID:               "combo_10",
			Name:             "On Fire",
			Description:      "Achieve a 10x combo",
			Icon:             "🔥",
			Rarity:           AchievementRarityCommon,
			RewardGold:       10,
			RequirementType:  "combo",
			RequirementValue: 10,
		},
		{
			ID:               "combo_25",
			Name:             "Unstoppable",
			Description:      "Achieve a 25x combo",
			Icon:             "⚡",
			Rarity:           AchievementRarityRare,
			RewardGold:       20,
			RequirementType:  "combo",
			RequirementValue: 25,
		},
		{
			ID:               "combo_50",
			Name:             "God Mode",
			Description:      "Achieve a 50x combo",
			Icon:             "👹",
			Rarity:           AchievementRarityEpic,
			RewardGold:       50,
			RequirementType:  "combo",
			RequirementValue: 50,
		},

		// Survival Achievements
		{
			ID:               "level_5",
			Name:             "Survivor",
			Description:      "Reach level 5",
			Icon:             "🛡️",
			Rarity:           AchievementRarityCommon,
			RewardGold:       10,
			RequirementType:  "level",
			RequirementValue: 5,
		},
		{
			ID:               "level_10",
			Name:             "Veteran",
			Description:      "Reach level 10",
			Icon:             "🎖️",
			Rarity:           AchievementRarityRare,
			RewardGold:       25,
			RequirementType:  "level",
			RequirementValue: 10,
		},
		{
			ID:               "level_20",
			Name:             "Legend",
			Description:      "Reach level 20",
			Icon:             "🌟",
			Rarity:           AchievementRarityEpic,
			RewardGold:       75,
			RequirementType:  "level",
			RequirementValue: 20,
		},

		// Special Achievements
		{
			ID:               "boss_first",
			Name:             "Boss Slayer",
			Description:      "Defeat your first boss",
			Icon:             "🐲",
			Rarity:           AchievementRarityRare,
			RewardGold:       20,
			RequirementType:  "boss_kills",
			RequirementValue: 1,
		},
		{
			ID:               "boss_5",
			Name:             "Dragon Hunter",
			Description:      "Defeat 5 bosses",
			Icon:             "⚔️",
			Rarity:           AchievementRarityEpic,
			RewardGold:       50,
			RequirementType:  "boss_kills",
			RequirementValue: 5,
		},
		{
			ID:               "accuracy_90",
			Name:             "Sharpshooter",
			Description:      "Finish a game with 90%+ accuracy",
			Icon:             "🎯",
			Rarity:           AchievementRarityRare,
			RewardGold:       30,
			RequirementType:  "accuracy",
			RequirementValue: 90,
		},
		{
			ID:               "perfect_accuracy",
			Name:             "Perfect Aim",
			Description:      "Finish a game with 100% accuracy",
			Icon:             "💎",
			Rarity:           AchievementRarityLegendary,
			RewardGold:       100,
			RequirementType:  "accuracy",
			RequirementValue: 100,
		},
	}
}
