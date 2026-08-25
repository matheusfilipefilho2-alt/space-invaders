package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

// XP reward multipliers and bonuses
const (
	BaseXPPerGame           = 100
	HighScoreMultiplier     = 1.5  // 50% bonus for high scores
	WinStreakBonusPerStreak = 10   // 10 XP bonus per consecutive win
	MaxWinStreakBonus       = 100  // Cap at 100 XP bonus
	DailyFirstGameBonus     = 50   // Bonus for first game of the day
)

type BattlePassService struct {
	battlePassRepo repository.BattlePassRepository
	playerRepo     repository.PlayerRepository
	itemRepo       repository.ItemRepository
	db             *gorm.DB
}

func NewBattlePassService(
	battlePassRepo repository.BattlePassRepository,
	playerRepo repository.PlayerRepository,
	itemRepo repository.ItemRepository,
	db *gorm.DB,
) *BattlePassService {
	return &BattlePassService{
		battlePassRepo: battlePassRepo,
		playerRepo:     playerRepo,
		itemRepo:       itemRepo,
		db:             db,
	}
}

// GetCurrentSeason returns the active Battle Pass season
func (s *BattlePassService) GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error) {
	season, err := s.battlePassRepo.GetCurrentSeason(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current season: %w", err)
	}

	if season == nil {
		return nil, errors.New("no active season found")
	}

	return season, nil
}

// GetPlayerProgress returns player's progress in current season
func (s *BattlePassService) GetPlayerProgress(ctx context.Context, playerID uint) (*entity.BattlePassProgress, error) {
	// Get current season
	season, err := s.GetCurrentSeason(ctx)
	if err != nil {
		return nil, err
	}

	// Get or create progress
	progress, err := s.battlePassRepo.GetPlayerProgress(ctx, playerID, season.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get player progress: %w", err)
	}

	return progress, nil
}

// AwardXPForGame awards XP to player based on game performance
func (s *BattlePassService) AwardXPForGame(ctx context.Context, playerID uint, score int, isHighScore bool, winStreak int) (uint, error) {
	// Get current season
	season, err := s.GetCurrentSeason(ctx)
	if err != nil {
		return 0, err
	}

	// Calculate XP
	xp := s.CalculateGameXP(score, isHighScore, winStreak)

	// Award XP
	err = s.battlePassRepo.AddXP(ctx, playerID, season.ID, xp)
	if err != nil {
		return 0, fmt.Errorf("failed to award XP: %w", err)
	}

	return xp, nil
}

// CalculateGameXP calculates XP reward based on performance
func (s *BattlePassService) CalculateGameXP(score int, isHighScore bool, winStreak int) uint {
	xp := uint(BaseXPPerGame)

	// High score bonus
	if isHighScore {
		xp = uint(float64(xp) * HighScoreMultiplier)
	}

	// Win streak bonus
	streakBonus := uint(winStreak * WinStreakBonusPerStreak)
	if streakBonus > MaxWinStreakBonus {
		streakBonus = MaxWinStreakBonus
	}
	xp += streakBonus

	return xp
}

// ClaimReward claims a Battle Pass reward for a specific tier
func (s *BattlePassService) ClaimReward(ctx context.Context, playerID, tier uint, rewardType string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Get current season
		season, err := s.GetCurrentSeason(ctx)
		if err != nil {
			return err
		}

		// Validate reward type
		if rewardType != "free" && rewardType != "premium" {
			return errors.New("invalid reward type: must be 'free' or 'premium'")
		}

		// Get player progress
		progress, err := s.battlePassRepo.GetPlayerProgress(ctx, playerID, season.ID)
		if err != nil {
			return fmt.Errorf("failed to get player progress: %w", err)
		}

		// Validate tier unlocked
		if progress.CurrentTier < tier {
			return fmt.Errorf("tier %d not unlocked yet (current tier: %d)", tier, progress.CurrentTier)
		}

		// Validate premium access
		if rewardType == "premium" && !progress.IsPremium {
			return errors.New("premium Battle Pass required to claim premium rewards")
		}

		// Get reward
		reward, err := s.battlePassRepo.GetTierReward(ctx, season.ID, tier, rewardType)
		if err != nil {
			return fmt.Errorf("failed to get tier reward: %w", err)
		}

		if reward == nil {
			return fmt.Errorf("no %s reward found for tier %d", rewardType, tier)
		}

		// Check if already claimed
		claimed, err := s.battlePassRepo.IsRewardClaimed(ctx, playerID, season.ID, tier, rewardType)
		if err != nil {
			return fmt.Errorf("failed to check reward claim status: %w", err)
		}

		if claimed {
			return errors.New("reward already claimed")
		}

		// Grant reward
		err = s.grantReward(ctx, tx, playerID, reward)
		if err != nil {
			return fmt.Errorf("failed to grant reward: %w", err)
		}

		// Mark as claimed
		err = s.battlePassRepo.ClaimReward(ctx, playerID, season.ID, tier, rewardType)
		if err != nil {
			return fmt.Errorf("failed to mark reward as claimed: %w", err)
		}

		return nil
	})
}

// grantReward grants the actual reward to the player
func (s *BattlePassService) grantReward(ctx context.Context, tx *gorm.DB, playerID uint, reward *entity.BattlePassReward) error {
	switch reward.RewardType {
	case "gold":
		// Grant Gold
		err := s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(reward.GoldAmount))
		if err != nil {
			return fmt.Errorf("failed to grant gold: %w", err)
		}

	case "space":
		// Grant SPACE tokens
		err := s.playerRepo.UpdateSpaceBalance(ctx, playerID, int64(reward.SpaceAmount))
		if err != nil {
			return fmt.Errorf("failed to grant SPACE: %w", err)
		}

	case "item":
		// Grant item
		if reward.ItemID == nil {
			return errors.New("item reward missing item ID")
		}

		// Create player item
		playerItem := &entity.PlayerItem{
			PlayerID: playerID,
			ItemID:   *reward.ItemID,
		}
		err := tx.Create(playerItem).Error
		if err != nil {
			return fmt.Errorf("failed to grant item: %w", err)
		}

	case "nft":
		// NFT minting will be handled by NFT service
		// For now, just validate
		if reward.NFTMetadataURI == "" {
			return errors.New("NFT reward missing metadata URI")
		}
		// TODO: Call NFT minting service when implemented

	case "achievement":
		// Achievement unlocking will be handled by achievement service
		// For now, just log
		// TODO: Call achievement service when implemented

	default:
		return fmt.Errorf("unsupported reward type: %s", reward.RewardType)
	}

	return nil
}

// PurchasePremiumPass upgrades player to premium Battle Pass
func (s *BattlePassService) PurchasePremiumPass(ctx context.Context, playerID uint, paymentType string, orderID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Get current season
		season, err := s.GetCurrentSeason(ctx)
		if err != nil {
			return err
		}

		// Check if already premium
		isPremium, err := s.battlePassRepo.IsPremium(ctx, playerID, season.ID)
		if err != nil {
			return fmt.Errorf("failed to check premium status: %w", err)
		}

		if isPremium {
			return errors.New("player already has premium Battle Pass")
		}

		// Create purchase record
		purchase := &entity.BattlePassPurchase{
			PlayerID:    playerID,
			SeasonID:    season.ID,
			Amount:      4990, // R$ 49.90 in cents
			PaymentType: paymentType,
			Status:      "completed",
			OrderID:     orderID,
		}
		now := time.Now()
		purchase.CompletedAt = &now

		err = tx.Create(purchase).Error
		if err != nil {
			return fmt.Errorf("failed to create purchase record: %w", err)
		}

		// Upgrade to premium
		err = s.battlePassRepo.UpgradeToPremium(ctx, playerID, season.ID)
		if err != nil {
			return fmt.Errorf("failed to upgrade to premium: %w", err)
		}

		return nil
	})
}

// GetSeasonRewards returns all rewards for current season
func (s *BattlePassService) GetSeasonRewards(ctx context.Context) ([]entity.BattlePassReward, error) {
	season, err := s.GetCurrentSeason(ctx)
	if err != nil {
		return nil, err
	}

	rewards, err := s.battlePassRepo.GetSeasonRewards(ctx, season.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get season rewards: %w", err)
	}

	return rewards, nil
}

// GetLeaderboard returns top players for current season
func (s *BattlePassService) GetLeaderboard(ctx context.Context, limit int) ([]entity.BattlePassProgress, error) {
	season, err := s.GetCurrentSeason(ctx)
	if err != nil {
		return nil, err
	}

	leaderboard, err := s.battlePassRepo.GetTopPlayersBySeason(ctx, season.ID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get leaderboard: %w", err)
	}

	return leaderboard, nil
}

// GetUnclaimedRewards returns list of unclaimed rewards for player
func (s *BattlePassService) GetUnclaimedRewards(ctx context.Context, playerID uint) ([]entity.BattlePassReward, error) {
	// Get player progress
	progress, err := s.GetPlayerProgress(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// Get all season rewards
	allRewards, err := s.GetSeasonRewards(ctx)
	if err != nil {
		return nil, err
	}

	// Filter to unclaimed rewards within unlocked tiers
	var unclaimed []entity.BattlePassReward
	for _, reward := range allRewards {
		// Skip if tier not unlocked
		if reward.Tier > progress.CurrentTier {
			continue
		}

		// Skip premium rewards if not premium
		if reward.Type == "premium" && !progress.IsPremium {
			continue
		}

		// Check if claimed
		claimed, err := s.battlePassRepo.IsRewardClaimed(ctx, playerID, progress.SeasonID, reward.Tier, reward.Type)
		if err != nil {
			continue // Skip on error
		}

		if !claimed {
			unclaimed = append(unclaimed, reward)
		}
	}

	return unclaimed, nil
}

// CreateSeason creates a new Battle Pass season (admin only)
func (s *BattlePassService) CreateSeason(ctx context.Context, name string, startDate, endDate time.Time, maxTier uint) (*entity.BattlePassSeason, error) {
	season := &entity.BattlePassSeason{
		Name:      name,
		StartDate: startDate,
		EndDate:   endDate,
		Active:    false, // Must be manually activated
		MaxTier:   maxTier,
		XPPerTier: 100,
	}

	err := s.battlePassRepo.CreateSeason(ctx, season)
	if err != nil {
		return nil, fmt.Errorf("failed to create season: %w", err)
	}

	return season, nil
}

// GetProgressSummary returns a summary of player's Battle Pass progress
func (s *BattlePassService) GetProgressSummary(ctx context.Context, playerID uint) (map[string]interface{}, error) {
	progress, err := s.GetPlayerProgress(ctx, playerID)
	if err != nil {
		return nil, err
	}

	season, err := s.battlePassRepo.GetSeasonByID(ctx, progress.SeasonID)
	if err != nil {
		return nil, err
	}

	// Calculate next tier XP requirement
	xpForNextTier := (progress.CurrentTier + 1) * season.XPPerTier
	xpProgress := progress.XP - (progress.CurrentTier * season.XPPerTier)
	xpNeeded := season.XPPerTier

	// Get unclaimed rewards count
	unclaimed, err := s.GetUnclaimedRewards(ctx, playerID)
	if err != nil {
		unclaimed = []entity.BattlePassReward{} // Continue with empty list
	}

	summary := map[string]interface{}{
		"season_name":         season.Name,
		"season_end_date":     season.EndDate,
		"current_tier":        progress.CurrentTier,
		"max_tier":            season.MaxTier,
		"total_xp":            progress.XP,
		"xp_for_next_tier":    xpForNextTier,
		"xp_progress":         xpProgress,
		"xp_needed":           xpNeeded,
		"is_premium":          progress.IsPremium,
		"unclaimed_rewards":   len(unclaimed),
		"days_remaining":      int(time.Until(season.EndDate).Hours() / 24),
	}

	return summary, nil
}
