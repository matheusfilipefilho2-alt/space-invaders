package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/database"
	pkgjwt "github.com/yourusername/space-invaders/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&entity.Player{}, &entity.League{})
	require.NoError(t, err)

	leagues := entity.SeedLeagues()
	require.NoError(t, db.Create(&leagues).Error)

	return db
}

// Test Register - Success
func TestAuthService_Register(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	token, player, err := authService.Register(ctx, "newuser", "test@example.com", "password123")

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.NotNil(t, player)
	assert.Equal(t, "newuser", player.Username)
	assert.Equal(t, "test@example.com", player.Email)
	assert.NotEqual(t, "password123", player.PasswordHash) // Password should be hashed

	// Verify password was hashed with bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(player.PasswordHash), []byte("password123"))
	assert.NoError(t, err)

	// Verify token is valid
	claims, err := pkgjwt.ValidateToken(token, "test_secret")
	assert.NoError(t, err)
	assert.Equal(t, player.ID, claims.PlayerID)
	assert.Equal(t, "newuser", claims.Username)
}

// Test Register - Without Email
func TestAuthService_Register_WithoutEmail(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	token, player, err := authService.Register(ctx, "usernomail", "", "password123")

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.NotNil(t, player)
	assert.Equal(t, "usernomail", player.Username)
	assert.Empty(t, player.Email)
}

// Test Register - Duplicate Username
func TestAuthService_Register_DuplicateUsername(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// First registration
	_, _, err := authService.Register(ctx, "duplicate", "test1@example.com", "password123")
	require.NoError(t, err)

	// Second registration with same username
	_, _, err = authService.Register(ctx, "duplicate", "test2@example.com", "password456")
	assert.Error(t, err)
	assert.Equal(t, service.ErrUsernameExists, err)
}

// Test Register - Duplicate Email
func TestAuthService_Register_DuplicateEmail(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// First registration
	_, _, err := authService.Register(ctx, "user1", "duplicate@example.com", "password123")
	require.NoError(t, err)

	// Second registration with same email
	_, _, err = authService.Register(ctx, "user2", "duplicate@example.com", "password456")
	assert.Error(t, err)
	assert.Equal(t, service.ErrEmailExists, err)
}

// Test Register - Invalid Username (too short)
func TestAuthService_Register_InvalidUsername_TooShort(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Register(ctx, "ab", "test@example.com", "password123")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidUsername, err)
}

// Test Register - Invalid Username (too long)
func TestAuthService_Register_InvalidUsername_TooLong(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Register(ctx, "thisusernameiswaytoolongforvalidation", "test@example.com", "password123")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidUsername, err)
}

// Test Register - Invalid Username (special characters)
func TestAuthService_Register_InvalidUsername_SpecialChars(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Register(ctx, "user@name!", "test@example.com", "password123")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidUsername, err)
}

// Test Register - Valid Username with underscore
func TestAuthService_Register_ValidUsername_WithUnderscore(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	token, player, err := authService.Register(ctx, "user_name_123", "test@example.com", "password123")
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.NotNil(t, player)
	assert.Equal(t, "user_name_123", player.Username)
}

// Test Register - Invalid Email
func TestAuthService_Register_InvalidEmail(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Register(ctx, "testuser", "invalid-email", "password123")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidEmail, err)
}

// Test Register - Invalid Password (too short)
func TestAuthService_Register_InvalidPassword(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Register(ctx, "testuser", "test@example.com", "pass")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidPassword, err)
}

// Test Login - Success
func TestAuthService_Login(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// Register first
	_, registeredPlayer, err := authService.Register(ctx, "logintest", "login@example.com", "password123")
	require.NoError(t, err)

	// Login
	token, player, err := authService.Login(ctx, "logintest", "password123")
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "logintest", player.Username)
	assert.Equal(t, registeredPlayer.ID, player.ID)

	// Verify token is valid
	claims, err := pkgjwt.ValidateToken(token, "test_secret")
	assert.NoError(t, err)
	assert.Equal(t, player.ID, claims.PlayerID)
	assert.Equal(t, "logintest", claims.Username)
}

// Test Login - Invalid Password
func TestAuthService_Login_InvalidPassword(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// Register
	_, _, err := authService.Register(ctx, "user", "user@example.com", "correctpassword")
	require.NoError(t, err)

	// Login with wrong password
	_, _, err = authService.Login(ctx, "user", "wrongpassword")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidCredentials, err)
}

// Test Login - User Not Found
func TestAuthService_Login_UserNotFound(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, _, err := authService.Login(ctx, "nonexistent", "password123")
	assert.Error(t, err)
	assert.Equal(t, service.ErrInvalidCredentials, err)
}

// Test ValidateToken - Success
func TestAuthService_ValidateToken(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// Register and get token
	token, player, err := authService.Register(ctx, "validatetest", "validate@example.com", "password123")
	require.NoError(t, err)

	// Validate token
	claims, err := authService.ValidateToken(ctx, token)
	assert.NoError(t, err)
	assert.NotNil(t, claims)
	assert.Equal(t, player.ID, claims.PlayerID)
	assert.Equal(t, "validatetest", claims.Username)
}

// Test ValidateToken - Invalid Token
func TestAuthService_ValidateToken_Invalid(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, err := authService.ValidateToken(ctx, "invalid.token.here")
	assert.Error(t, err)
}

// Test ValidateToken - Wrong Secret
func TestAuthService_ValidateToken_WrongSecret(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// Create token with different secret
	token, err := pkgjwt.GenerateToken(1, "testuser", "different_secret")
	require.NoError(t, err)

	// Try to validate with original secret
	_, err = authService.ValidateToken(ctx, token)
	assert.Error(t, err)
}

// Test Password Hashing with bcrypt cost 10
func TestAuthService_PasswordHashingCost(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	_, player, err := authService.Register(ctx, "costtest", "cost@example.com", "password123")
	require.NoError(t, err)

	// Extract bcrypt cost from the hash
	// Bcrypt hash format: $2a$[cost]$[salt][hash]
	cost, err := bcrypt.Cost([]byte(player.PasswordHash))
	assert.NoError(t, err)
	assert.Equal(t, 10, cost)
}

// Test JWT Token Expiration (24 hours)
func TestAuthService_TokenExpiration(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	token, _, err := authService.Register(ctx, "expirytest", "expiry@example.com", "password123")
	require.NoError(t, err)

	claims, err := authService.ValidateToken(ctx, token)
	assert.NoError(t, err)

	// Check that expiration is approximately 24 hours from now
	expiresIn := claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time)
	assert.InDelta(t, 24*60*60, expiresIn.Seconds(), 5) // Within 5 seconds of 24 hours
}
