package database

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type battlePassRepository struct {
	db *gorm.DB
}

func NewBattlePassRepository(db *gorm.DB) repository.BattlePassRepository {
	return &battlePassRepository{db: db}
}

// Season management

func (r *battlePassRepository) GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error) {
	var season entity.BattlePassSeason
	now := time.Now()

	err := r.db.WithContext(ctx).
		Where("active = ? AND start_date <= ? AND end_date >= ?", true, now, now).
		First(&season).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}

	return &season, err
}

func (r *battlePassRepository) GetSeasonByID(ctx context.Context, seasonID uint) (*entity.BattlePassSeason, error) {
	var season entity.BattlePassSeason
	err := r.db.WithContext(ctx).First(&season, seasonID).Error
	return &season, err
}

func (r *battlePassRepository) GetActiveSeasons(ctx context.Context) ([]entity.BattlePassSeason, error) {
	var seasons []entity.BattlePassSeason
	err := r.db.WithContext(ctx).
		Where("active = ?", true).
		Order("start_date DESC").
		Find(&seasons).Error
	return seasons, err
}

func (r *battlePassRepository) CreateSeason(ctx context.Context, season *entity.BattlePassSeason) error {
	return r.db.WithContext(ctx).Create(season).Error
}

// Player progress

func (r *battlePassRepository) GetPlayerProgress(ctx context.Context, playerID, seasonID uint) (*entity.BattlePassProgress, error) {
	var progress entity.BattlePassProgress
	err := r.db.WithContext(ctx).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		First(&progress).Error

	if err == gorm.ErrRecordNotFound {
		// Create new progress if not exists
		progress = entity.BattlePassProgress{
			PlayerID:            playerID,
			SeasonID:            seasonID,
			XP:                  0,
			CurrentTier:         0,
			IsPremium:           false,
			ClaimedFreeTiers:    "[]",
			ClaimedPremiumTiers: "[]",
		}
		err = r.db.WithContext(ctx).Create(&progress).Error
		if err != nil {
			return nil, err
		}
	}

	return &progress, err
}

func (r *battlePassRepository) CreateProgress(ctx context.Context, progress *entity.BattlePassProgress) error {
	return r.db.WithContext(ctx).Create(progress).Error
}

func (r *battlePassRepository) AddXP(ctx context.Context, playerID, seasonID uint, xp uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get or create progress
		var progress entity.BattlePassProgress
		err := tx.Where("player_id = ? AND season_id = ?", playerID, seasonID).
			First(&progress).Error

		if err == gorm.ErrRecordNotFound {
			progress = entity.BattlePassProgress{
				PlayerID:            playerID,
				SeasonID:            seasonID,
				XP:                  0,
				CurrentTier:         0,
				IsPremium:           false,
				ClaimedFreeTiers:    "[]",
				ClaimedPremiumTiers: "[]",
			}
			err = tx.Create(&progress).Error
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		// Get season to know XP per tier
		var season entity.BattlePassSeason
		err = tx.First(&season, seasonID).Error
		if err != nil {
			return err
		}

		// Update XP
		newXP := progress.XP + xp
		newTier := newXP / season.XPPerTier

		// Cap at max tier
		if newTier > season.MaxTier {
			newTier = season.MaxTier
		}

		// Update progress
		return tx.Model(&progress).Updates(map[string]interface{}{
			"xp":           newXP,
			"current_tier": newTier,
		}).Error
	})
}

func (r *battlePassRepository) UpdateTier(ctx context.Context, playerID, seasonID, newTier uint) error {
	return r.db.WithContext(ctx).
		Model(&entity.BattlePassProgress{}).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		Update("current_tier", newTier).Error
}

// Reward management

func (r *battlePassRepository) GetSeasonRewards(ctx context.Context, seasonID uint) ([]entity.BattlePassReward, error) {
	var rewards []entity.BattlePassReward
	err := r.db.WithContext(ctx).
		Where("season_id = ?", seasonID).
		Order("tier ASC").
		Find(&rewards).Error
	return rewards, err
}

func (r *battlePassRepository) GetTierReward(ctx context.Context, seasonID, tier uint, rewardType string) (*entity.BattlePassReward, error) {
	var reward entity.BattlePassReward
	err := r.db.WithContext(ctx).
		Where("season_id = ? AND tier = ? AND type = ?", seasonID, tier, rewardType).
		First(&reward).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}

	return &reward, err
}

func (r *battlePassRepository) ClaimReward(ctx context.Context, playerID, seasonID, tier uint, rewardType string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get progress
		var progress entity.BattlePassProgress
		err := tx.Where("player_id = ? AND season_id = ?", playerID, seasonID).
			First(&progress).Error
		if err != nil {
			return err
		}

		// Check if tier is unlocked
		if progress.CurrentTier < tier {
			return errors.New("tier not unlocked yet")
		}

		// Check if already claimed
		var claimedTiers []uint
		if rewardType == "free" {
			if err := json.Unmarshal([]byte(progress.ClaimedFreeTiers), &claimedTiers); err != nil {
				claimedTiers = []uint{}
			}
		} else {
			if !progress.IsPremium {
				return errors.New("premium battle pass required")
			}
			if err := json.Unmarshal([]byte(progress.ClaimedPremiumTiers), &claimedTiers); err != nil {
				claimedTiers = []uint{}
			}
		}

		// Check if already claimed
		for _, claimed := range claimedTiers {
			if claimed == tier {
				return errors.New("reward already claimed")
			}
		}

		// Add to claimed list
		claimedTiers = append(claimedTiers, tier)
		claimedJSON, err := json.Marshal(claimedTiers)
		if err != nil {
			return err
		}

		// Update progress
		if rewardType == "free" {
			return tx.Model(&progress).Update("claimed_free_tiers", string(claimedJSON)).Error
		}
		return tx.Model(&progress).Update("claimed_premium_tiers", string(claimedJSON)).Error
	})
}

func (r *battlePassRepository) IsRewardClaimed(ctx context.Context, playerID, seasonID, tier uint, rewardType string) (bool, error) {
	var progress entity.BattlePassProgress
	err := r.db.WithContext(ctx).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		First(&progress).Error

	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var claimedTiers []uint
	if rewardType == "free" {
		if err := json.Unmarshal([]byte(progress.ClaimedFreeTiers), &claimedTiers); err != nil {
			return false, nil
		}
	} else {
		if err := json.Unmarshal([]byte(progress.ClaimedPremiumTiers), &claimedTiers); err != nil {
			return false, nil
		}
	}

	for _, claimed := range claimedTiers {
		if claimed == tier {
			return true, nil
		}
	}

	return false, nil
}

// Premium management

func (r *battlePassRepository) UpgradeToPremium(ctx context.Context, playerID, seasonID uint) error {
	return r.db.WithContext(ctx).
		Model(&entity.BattlePassProgress{}).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		Update("is_premium", true).Error
}

func (r *battlePassRepository) IsPremium(ctx context.Context, playerID, seasonID uint) (bool, error) {
	var progress entity.BattlePassProgress
	err := r.db.WithContext(ctx).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		First(&progress).Error

	if err == gorm.ErrRecordNotFound {
		return false, nil
	}

	return progress.IsPremium, err
}

// Leaderboard

func (r *battlePassRepository) GetTopPlayersBySeason(ctx context.Context, seasonID uint, limit int) ([]entity.BattlePassProgress, error) {
	var progress []entity.BattlePassProgress
	err := r.db.WithContext(ctx).
		Where("season_id = ?", seasonID).
		Order("xp DESC").
		Limit(limit).
		Preload("Player").
		Find(&progress).Error
	return progress, err
}
