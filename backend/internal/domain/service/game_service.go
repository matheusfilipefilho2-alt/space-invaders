package service

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type GameService struct {
	playerRepo        repository.PlayerRepository
	battlePassService *BattlePassService
}

func NewGameService(playerRepo repository.PlayerRepository) *GameService {
	return &GameService{
		playerRepo:        playerRepo,
		battlePassService: nil, // Will be set via SetBattlePassService to avoid circular dependency
	}
}

// SetBattlePassService sets the battle pass service (to avoid circular dependency during initialization)
func (s *GameService) SetBattlePassService(bps *BattlePassService) {
	s.battlePassService = bps
}

// CalculateGoldReward calculates gold reward based on score and league
// Formula: (score / 10) * league_multiplier
// League multipliers: Bronze=1.0, Silver=1.2, Gold=1.5, Platinum=2.0, Diamond=2.0, Master=2.0
func (s *GameService) CalculateGoldReward(score uint64, leagueID uint) uint64 {
	baseGold := score / 10

	// Apply league multiplier
	var multiplier float64
	switch leagueID {
	case 1: // Bronze
		multiplier = 1.0
	case 2: // Silver
		multiplier = 1.2
	case 3: // Gold
		multiplier = 1.5
	case 4, 5, 6: // Platinum, Diamond, Master
		multiplier = 2.0
	default:
		multiplier = 1.0
	}

	return uint64(float64(baseGold) * multiplier)
}

// StartGame initializes a game session for a player
func (s *GameService) StartGame(ctx context.Context, playerID uint) error {
	// For now, just verify player exists
	_, err := s.playerRepo.FindByID(ctx, playerID)
	return err
}

// GameRewards holds the rewards earned from completing a game
type GameRewards struct {
	GoldEarned uint64
	XPEarned   uint
	NewTier    uint
}

// EndGame finalizes a game session and processes rewards
// Returns the gold and XP earned
func (s *GameService) EndGame(ctx context.Context, playerID uint, score uint64, kills uint) (*GameRewards, error) {
	// Get player to check league and current stats
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// Calculate gold reward based on score and league
	leagueID := uint(0)
	if player.LeagueID != nil {
		leagueID = *player.LeagueID
	}
	goldEarned := s.CalculateGoldReward(score, leagueID)

	// Add gold to player balance
	err = s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(goldEarned))
	if err != nil {
		return nil, err
	}

	// Check if this is a new high score
	isHighScore := score > player.HighScore
	if isHighScore {
		err = s.playerRepo.UpdateHighScore(ctx, playerID, score)
		if err != nil {
			return nil, err
		}
	}

	// Increment total games played
	err = s.playerRepo.IncrementTotalGames(ctx, playerID)
	if err != nil {
		return nil, err
	}

	// Update total kills (always update, even if 0)
	err = s.playerRepo.IncrementTotalKills(ctx, playerID, kills)
	if err != nil {
		return nil, err
	}

	// Award Battle Pass XP if service is available
	var xpEarned uint
	var newTier uint
	if s.battlePassService != nil {
		// For now, we don't track win streaks, so pass 0
		xpEarned, err = s.battlePassService.AwardXPForGame(ctx, playerID, int(score), isHighScore, 0)
		if err != nil {
			// Don't fail the entire game end if BP XP fails, just log it
			// In production, you'd want proper logging here
			xpEarned = 0
		} else {
			// Get updated progress to check new tier
			progress, err := s.battlePassService.GetPlayerProgress(ctx, playerID)
			if err == nil {
				newTier = progress.CurrentTier
			}
		}
	}

	return &GameRewards{
		GoldEarned: goldEarned,
		XPEarned:   xpEarned,
		NewTier:    newTier,
	}, nil
}
