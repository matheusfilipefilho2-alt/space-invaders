package service

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type GameService struct {
	playerRepo repository.PlayerRepository
}

func NewGameService(playerRepo repository.PlayerRepository) *GameService {
	return &GameService{
		playerRepo: playerRepo,
	}
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

// EndGame finalizes a game session and processes rewards
// Returns the gold earned
func (s *GameService) EndGame(ctx context.Context, playerID uint, score uint64) (goldEarned uint64, err error) {
	// Get player to check league and current stats
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return 0, err
	}

	// Calculate gold reward based on score and league
	goldEarned = s.CalculateGoldReward(score, player.LeagueID)

	// Add gold to player balance
	err = s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(goldEarned))
	if err != nil {
		return 0, err
	}

	// Update high score if this score is higher
	if score > player.HighScore {
		err = s.playerRepo.UpdateHighScore(ctx, playerID, score)
		if err != nil {
			return 0, err
		}
	}

	// Increment total games played
	err = s.playerRepo.IncrementTotalGames(ctx, playerID)
	if err != nil {
		return 0, err
	}

	return goldEarned, nil
}
