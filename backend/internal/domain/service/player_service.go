package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

var (
	ErrPlayerNotFound = errors.New("player not found")
)

type PlayerService struct {
	playerRepo repository.PlayerRepository
}

func NewPlayerService(playerRepo repository.PlayerRepository) *PlayerService {
	return &PlayerService{
		playerRepo: playerRepo,
	}
}

// GetProfile retrieves a player's profile by ID
func (s *PlayerService) GetProfile(ctx context.Context, playerID uint) (*entity.Player, error) {
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlayerNotFound
		}
		return nil, fmt.Errorf("failed to find player: %w", err)
	}
	return player, nil
}

// UpdateProfileRequest represents the fields that can be updated in a player profile
type UpdateProfileRequest struct {
	Email              *string
	NotifyOffers       *bool
	NotifyAchievements *bool
	NotifyShop         *bool
}

// UpdateProfile updates a player's profile
func (s *PlayerService) UpdateProfile(ctx context.Context, playerID uint, req UpdateProfileRequest) (*entity.Player, error) {
	// First, get the current player
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlayerNotFound
		}
		return nil, fmt.Errorf("failed to find player: %w", err)
	}

	// Update only the fields that were provided
	if req.Email != nil {
		// Validate email if provided and not empty
		if *req.Email != "" && !emailRegex.MatchString(*req.Email) {
			return nil, ErrInvalidEmail
		}
		// Check if email already exists (if changing)
		if *req.Email != player.Email && *req.Email != "" {
			if _, err := s.playerRepo.FindByEmail(ctx, *req.Email); err == nil {
				return nil, ErrEmailExists
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("failed to check email: %w", err)
			}
		}
		player.Email = *req.Email
	}

	if req.NotifyOffers != nil {
		player.NotifyOffers = *req.NotifyOffers
	}

	if req.NotifyAchievements != nil {
		player.NotifyAchievements = *req.NotifyAchievements
	}

	if req.NotifyShop != nil {
		player.NotifyShop = *req.NotifyShop
	}

	// Save changes
	if err := s.playerRepo.Update(ctx, player); err != nil {
		return nil, fmt.Errorf("failed to update player: %w", err)
	}

	return player, nil
}
