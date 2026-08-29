package service

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/repository"
)

// LeaderboardEntry represents a single entry in the leaderboard
type LeaderboardEntry struct {
	Rank       int
	PlayerID   uint
	Username   string
	HighScore  uint64
	LeagueName string
	LeagueID   uint
}

// LeaderboardService handles leaderboard operations
type LeaderboardService struct {
	playerRepo repository.PlayerRepository
}

// NewLeaderboardService creates a new instance of LeaderboardService
func NewLeaderboardService(playerRepo repository.PlayerRepository) *LeaderboardService {
	return &LeaderboardService{
		playerRepo: playerRepo,
	}
}

// GetGlobalLeaderboard retrieves the global leaderboard (all players ordered by high score)
func (s *LeaderboardService) GetGlobalLeaderboard(ctx context.Context, limit, offset int) ([]*LeaderboardEntry, error) {
	// Fetch top players from repository
	players, err := s.playerRepo.FindTopByScore(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	// Convert to leaderboard entries with calculated rank
	entries := make([]*LeaderboardEntry, 0, len(players))
	for i, player := range players {
		leagueID := uint(0)
		if player.LeagueID != nil {
			leagueID = *player.LeagueID
		}
		// Get league name safely (handle nil League)
		leagueName := ""
		if player.League != nil {
			leagueName = player.League.Name
		}

		entry := &LeaderboardEntry{
			Rank:       offset + i + 1, // Rank starts at offset + 1
			PlayerID:   player.ID,
			Username:   player.Username,
			HighScore:  player.HighScore,
			LeagueName: leagueName,
			LeagueID:   leagueID,
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetLeagueLeaderboard retrieves the leaderboard for a specific league
func (s *LeaderboardService) GetLeagueLeaderboard(ctx context.Context, leagueID uint, limit, offset int) ([]*LeaderboardEntry, error) {
	// Fetch top players in league from repository
	players, err := s.playerRepo.FindTopByScoreInLeague(ctx, leagueID, limit, offset)
	if err != nil {
		return nil, err
	}

	// Convert to leaderboard entries with calculated rank (relative to league)
	entries := make([]*LeaderboardEntry, 0, len(players))
	for i, player := range players {
		leagueID := uint(0)
		if player.LeagueID != nil {
			leagueID = *player.LeagueID
		}

		// Get league name safely (handle nil League)
		leagueName := ""
		if player.League != nil {
			leagueName = player.League.Name
		}

		entry := &LeaderboardEntry{
			Rank:       offset + i + 1, // Rank within league starts at offset + 1
			PlayerID:   player.ID,
			Username:   player.Username,
			HighScore:  player.HighScore,
			LeagueName: leagueName,
			LeagueID:   leagueID,
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetPlayerRank returns the global rank of a specific player
// Rank is calculated by counting how many players have a higher score
func (s *LeaderboardService) GetPlayerRank(ctx context.Context, playerID uint) (int, error) {
	// Get the player to find their score
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return 0, err
	}

	// Get all players with higher scores to calculate rank
	// Using a large limit to get all higher-scoring players
	higherPlayers, err := s.playerRepo.FindTopByScore(ctx, 100000, 0)
	if err != nil {
		return 0, err
	}

	// Count players with higher scores
	rank := 1
	for _, p := range higherPlayers {
		if p.HighScore > player.HighScore {
			rank++
		} else {
			break // Since results are ordered, we can stop
		}
	}

	return rank, nil
}

// GetFriendLeaderboard retrieves the leaderboard for a player's friends
// TODO: Implement in Fase 4 - Social (when friend system is added)
func (s *LeaderboardService) GetFriendLeaderboard(ctx context.Context, playerID uint, limit, offset int) ([]*LeaderboardEntry, error) {
	// Stub implementation - returns empty list
	// Will be implemented when friend system is added in Fase 4
	return []*LeaderboardEntry{}, nil
}
