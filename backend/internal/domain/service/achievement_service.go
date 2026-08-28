package service

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

// AchievementService handles achievement logic
type AchievementService struct {
	achievementRepo repository.AchievementRepository
	playerRepo      repository.PlayerRepository
	paRepo          repository.PlayerAchievementRepository
}

// NewAchievementService creates a new achievement service
func NewAchievementService(
	achievementRepo repository.AchievementRepository,
	playerRepo repository.PlayerRepository,
	paRepo repository.PlayerAchievementRepository,
) *AchievementService {
	return &AchievementService{
		achievementRepo: achievementRepo,
		playerRepo:      playerRepo,
		paRepo:          paRepo,
	}
}

// Unlock manually unlocks a specific achievement for a player
func (s *AchievementService) Unlock(ctx context.Context, playerID uint, achievementID string) error {
	// 1. Check if achievement exists
	achievement, err := s.achievementRepo.FindByID(ctx, achievementID)
	if err != nil {
		return err
	}

	// 2. Check if already unlocked
	exists, err := s.paRepo.ExistsForPlayer(ctx, playerID, achievementID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("achievement already unlocked")
	}

	// 3. Create player achievement record
	pa := &entity.PlayerAchievement{
		PlayerID:      playerID,
		AchievementID: achievementID,
		UnlockedAt:    time.Now(),
		Notified:      false,
	}
	if err := s.paRepo.Create(ctx, pa); err != nil {
		return err
	}

	// 4. Grant reward (gold)
	if achievement.RewardGold > 0 {
		if err := s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(achievement.RewardGold)); err != nil {
			return err
		}
	}

	return nil
}

// CheckAndUnlock checks player stats and unlocks eligible achievements
func (s *AchievementService) CheckAndUnlock(ctx context.Context, playerID uint) ([]*entity.Achievement, error) {
	// 1. Fetch player
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// 2. Fetch all achievements
	allAchievements, err := s.achievementRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// 3. Fetch player's unlocked achievements
	playerAchievements, err := s.paRepo.FindByPlayerID(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// Create map of unlocked achievement IDs for quick lookup
	unlockedMap := make(map[string]bool)
	for _, pa := range playerAchievements {
		unlockedMap[pa.AchievementID] = true
	}

	// 4. Check each achievement
	var newlyUnlocked []*entity.Achievement

	for _, achievement := range allAchievements {
		// Skip if already unlocked
		if unlockedMap[achievement.ID] {
			continue
		}

		// Check if requirement is met
		if s.checkRequirement(player, achievement) {
			// Unlock achievement
			if err := s.Unlock(ctx, playerID, achievement.ID); err != nil {
				// Log error but continue checking other achievements
				continue
			}
			newlyUnlocked = append(newlyUnlocked, achievement)
		}
	}

	return newlyUnlocked, nil
}

// GameStats represents statistics from a game session
type GameStats struct {
	Score     uint   `json:"score"`
	KillCount uint   `json:"killCount"`
	MaxCombo  uint   `json:"maxCombo"`
	Level     uint   `json:"level"`
	BossKills uint   `json:"bossKills"`
	Accuracy  uint   `json:"accuracy"` // 0-100
}

// CheckAndUnlockFromGameStats checks game stats and unlocks eligible achievements
func (s *AchievementService) CheckAndUnlockFromGameStats(ctx context.Context, playerID uint, stats GameStats) ([]*entity.Achievement, int64, error) {
	log.Printf("🎯 CheckAndUnlockFromGameStats: playerID=%d, stats=%+v", playerID, stats)

	// 1. Fetch all achievements
	allAchievements, err := s.achievementRepo.FindAll(ctx)
	if err != nil {
		log.Printf("❌ ERROR fetching achievements: %v", err)
		return nil, 0, err
	}
	log.Printf("✅ Found %d total achievements", len(allAchievements))

	// 2. Fetch player's unlocked achievements
	playerAchievements, err := s.paRepo.FindByPlayerID(ctx, playerID)
	if err != nil {
		log.Printf("❌ ERROR fetching player achievements: %v", err)
		return nil, 0, err
	}
	log.Printf("✅ Player has %d unlocked achievements", len(playerAchievements))

	// Create map of unlocked achievement IDs for quick lookup
	unlockedMap := make(map[string]bool)
	for _, pa := range playerAchievements {
		unlockedMap[pa.AchievementID] = true
	}

	// 3. Check each achievement
	var newlyUnlocked []*entity.Achievement
	var totalGoldEarned int64 = 0

	log.Printf("🔍 Checking %d achievements against player stats...", len(allAchievements))

	for _, achievement := range allAchievements {
		// Skip if already unlocked
		if unlockedMap[achievement.ID] {
			continue
		}

		// Check if requirement is met
		if s.checkGameStatsRequirement(stats, achievement) {
			log.Printf("🎉 Achievement '%s' requirement met! Unlocking...", achievement.Name)
			// Unlock achievement
			if err := s.Unlock(ctx, playerID, achievement.ID); err != nil {
				log.Printf("❌ ERROR unlocking achievement '%s': %v", achievement.Name, err)
				// Log error but continue checking other achievements
				continue
			}
			newlyUnlocked = append(newlyUnlocked, achievement)
			totalGoldEarned += int64(achievement.RewardGold)
			log.Printf("✅ Unlocked '%s', awarded %d gold", achievement.Name, achievement.RewardGold)
		}
	}

	log.Printf("✅ Completed! Unlocked %d achievements, total gold: %d", len(newlyUnlocked), totalGoldEarned)
	return newlyUnlocked, totalGoldEarned, nil
}

// checkGameStatsRequirement checks if game stats meet an achievement's requirement
func (s *AchievementService) checkGameStatsRequirement(stats GameStats, achievement *entity.Achievement) bool {
	switch achievement.RequirementType {
	case "score":
		return stats.Score >= achievement.RequirementValue
	case "kills":
		return stats.KillCount >= achievement.RequirementValue
	case "combo":
		return stats.MaxCombo >= achievement.RequirementValue
	case "level":
		return stats.Level >= achievement.RequirementValue
	case "boss_kills":
		return stats.BossKills >= achievement.RequirementValue
	case "accuracy":
		return stats.Accuracy >= achievement.RequirementValue
	default:
		return false
	}
}

// checkRequirement checks if a player meets an achievement's requirement
func (s *AchievementService) checkRequirement(player *entity.Player, achievement *entity.Achievement) bool {
	switch achievement.RequirementType {
	case "first_kill":
		return player.TotalKills >= achievement.RequirementValue
	case "score_milestone", "score":
		return player.HighScore >= uint64(achievement.RequirementValue)
	case "games_played":
		return player.TotalGames >= achievement.RequirementValue
	case "nft_mint", "guild_create", "tournament_win":
		// These will be implemented in future phases
		return false
	default:
		return false
	}
}

// GetPlayerAchievements returns all achievements for a player
func (s *AchievementService) GetPlayerAchievements(ctx context.Context, playerID uint) ([]*entity.PlayerAchievement, error) {
	return s.paRepo.FindByPlayerID(ctx, playerID)
}

// AchievementWithStatus represents an achievement with unlock status
type AchievementWithStatus struct {
	Achievement *entity.Achievement `json:"achievement"`
	Unlocked    bool                `json:"unlocked"`
	UnlockedAt  *time.Time          `json:"unlockedAt,omitempty"`
}

// GetAllAchievementsWithStatus returns all achievements with their unlock status for a player
func (s *AchievementService) GetAllAchievementsWithStatus(ctx context.Context, playerID uint) ([]*AchievementWithStatus, error) {
	// 1. Fetch all achievements
	allAchievements, err := s.achievementRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// 2. Fetch player's unlocked achievements
	playerAchievements, err := s.paRepo.FindByPlayerID(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// Create map of unlocked achievements
	unlockedMap := make(map[string]*entity.PlayerAchievement)
	for _, pa := range playerAchievements {
		unlockedMap[pa.AchievementID] = pa
	}

	// 3. Build result
	result := make([]*AchievementWithStatus, 0, len(allAchievements))
	for _, achievement := range allAchievements {
		status := &AchievementWithStatus{
			Achievement: achievement,
			Unlocked:    false,
		}

		if pa, ok := unlockedMap[achievement.ID]; ok {
			status.Unlocked = true
			status.UnlockedAt = &pa.UnlockedAt
		}

		result = append(result, status)
	}

	return result, nil
}
