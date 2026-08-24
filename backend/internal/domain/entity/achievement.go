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
	ID          string            `gorm:"primaryKey"` // e.g., "first_kill"
	Name        string            `gorm:"not null"`
	Description string
	Icon        string
	Rarity      AchievementRarity `gorm:"not null;default:COMMON"`
	RewardGold  uint              `gorm:"default:0"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Achievement) TableName() string {
	return "achievements"
}

// SeedAchievements returns initial achievements
func SeedAchievements() []Achievement {
	return []Achievement{
		{
			ID:          "first_kill",
			Name:        "First Blood",
			Description: "Destroy your first alien",
			Icon:        "🎯",
			Rarity:      AchievementRarityCommon,
			RewardGold:  10,
		},
		{
			ID:          "score_10k",
			Name:        "Score Master",
			Description: "Reach 10,000 points",
			Icon:        "⭐",
			Rarity:      AchievementRarityRare,
			RewardGold:  50,
		},
		{
			ID:          "score_100k",
			Name:        "Score Legend",
			Description: "Reach 100,000 points",
			Icon:        "🌟",
			Rarity:      AchievementRarityEpic,
			RewardGold:  200,
		},
		{
			ID:          "games_100",
			Name:        "Century Player",
			Description: "Play 100 games",
			Icon:        "🎮",
			Rarity:      AchievementRarityRare,
			RewardGold:  100,
		},
		{
			ID:          "nft_mint_first",
			Name:        "NFT Collector",
			Description: "Mint your first NFT",
			Icon:        "🖼️",
			Rarity:      AchievementRarityEpic,
			RewardGold:  0,
		},
		{
			ID:          "guild_founder",
			Name:        "Guild Master",
			Description: "Create a guild",
			Icon:        "🏛️",
			Rarity:      AchievementRarityLegendary,
			RewardGold:  500,
		},
		{
			ID:          "tournament_win",
			Name:        "Champion",
			Description: "Win a tournament",
			Icon:        "🏆",
			Rarity:      AchievementRarityLegendary,
			RewardGold:  1000,
		},
	}
}
