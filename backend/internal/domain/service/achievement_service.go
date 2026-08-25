package service

import (
	"context"
	"errors"
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

// checkRequirement checks if a player meets an achievement's requirement
func (s *AchievementService) checkRequirement(player *entity.Player, achievement *entity.Achievement) bool {
	switch achievement.RequirementType {
	case "first_kill":
		return player.TotalKills >= achievement.RequirementValue
	case "score_milestone":
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
