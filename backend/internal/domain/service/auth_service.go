package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	pkgjwt "github.com/yourusername/space-invaders/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUsernameExists     = errors.New("username already exists")
	ErrEmailExists        = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrInvalidUsername    = errors.New("username must be 3-20 characters and contain only alphanumeric characters and underscores")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidPassword    = errors.New("password must be at least 8 characters")
)

var (
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

type AuthService struct {
	playerRepo repository.PlayerRepository
	jwtSecret  string
}

func NewAuthService(playerRepo repository.PlayerRepository, jwtSecret string) *AuthService {
	return &AuthService{
		playerRepo: playerRepo,
		jwtSecret:  jwtSecret,
	}
}

func (s *AuthService) Register(ctx context.Context, username, email, password string) (string, *entity.Player, error) {
	// Validate username
	username = strings.TrimSpace(username)
	if !usernameRegex.MatchString(username) {
		return "", nil, ErrInvalidUsername
	}

	// Validate email
	email = strings.TrimSpace(email)
	if email != "" && !emailRegex.MatchString(email) {
		return "", nil, ErrInvalidEmail
	}

	// Validate password
	if len(password) < 8 {
		return "", nil, ErrInvalidPassword
	}

	// Check if username exists
	if _, err := s.playerRepo.FindByUsername(ctx, username); err == nil {
		return "", nil, ErrUsernameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, fmt.Errorf("failed to check username: %w", err)
	}

	// Check if email exists (if provided)
	if email != "" {
		if _, err := s.playerRepo.FindByEmail(ctx, email); err == nil {
			return "", nil, ErrEmailExists
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, fmt.Errorf("failed to check email: %w", err)
		}
	}

	// Hash password with bcrypt cost 10
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return "", nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create player
	player := &entity.Player{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		LeagueID:     1, // Start at Bronze (assuming league ID 1 is Bronze)
	}

	if err := s.playerRepo.Create(ctx, player); err != nil {
		return "", nil, fmt.Errorf("failed to create player: %w", err)
	}

	// Generate JWT
	token, err := pkgjwt.GenerateToken(player.ID, player.Username, s.jwtSecret)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, player, nil
}

func (s *AuthService) Login(ctx context.Context, username, password string) (string, *entity.Player, error) {
	// Find player
	player, err := s.playerRepo.FindByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, fmt.Errorf("failed to find player: %w", err)
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(player.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// Generate JWT
	token, err := pkgjwt.GenerateToken(player.ID, player.Username, s.jwtSecret)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, player, nil
}

func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*pkgjwt.Claims, error) {
	claims, err := pkgjwt.ValidateToken(tokenString, s.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to validate token: %w", err)
	}
	return claims, nil
}
