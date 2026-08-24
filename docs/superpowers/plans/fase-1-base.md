# FASE 1: Backend Base (Semanas 2-3)

> **Navigation:** [📋 Index](./README.md) | [⬅️ Fase 0](./fase-0-migracao.md) | [➡️ Fase 2](./fase-2-economia.md)

**Goal:** Estabelecer backend Go completo com auth, player management, game service básico, e frontend Vue.js conectado.

**Duration:** 2 semanas

**Prerequisites:** Fase 0 completa (migração validada)

**Deliverables:**
- ✅ Backend API funcionando (auth, players, game)
- ✅ Frontend Vue.js com rotas básicas
- ✅ Auth completo (register, login, JWT)
- ✅ Gameplay básico (start game, end game, save score)
- ✅ Reward system (gold earning)

---

## Task 1: Database Connection & Auto-Migration

**Files:**
- Create: `backend/internal/infra/database/connection.go`
- Create: `backend/cmd/http/components/setup.go`

**Interfaces:**
- Consumes: Entities from Fase 0, DATABASE_URL config
- Produces: `*gorm.DB` instance with all tables migrated

- [ ] **Step 1: Create infra/database/connection.go**

```go
package database

import (
	"log"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgresConnection(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	// Auto-migrate all entities
	log.Println("🔄 Running auto-migration...")
	if err := db.AutoMigrate(
		// Core
		&entity.Player{},
		&entity.League{},
		&entity.PlayerItem{},
		&entity.Achievement{},
		&entity.PlayerAchievement{},
		// Economy
		&entity.GoldSpaceConversion{},
		&entity.DailyEmission{},
		&entity.RewardHistory{},
		&entity.Order{},
		// TODO: Add more entities as they're created in later phases
	); err != nil {
		return nil, err
	}

	log.Println("✅ Auto-migration complete")
	return db, nil
}
```

- [ ] **Step 2: Create cmd/http/components/setup.go**

```go
package components

import (
	"log"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/gorm"
)

type SetupResult struct {
	DB *gorm.DB
}

func SetUp() (*SetupResult, error) {
	// Database
	db, err := database.NewPostgresConnection(configs.GetDatabaseURL())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
		return nil, err
	}

	log.Println("✅ Database connected")

	// TODO: Initialize Redis, RabbitMQ, etc. in later steps

	return &SetupResult{
		DB: db,
	}, nil
}
```

- [ ] **Step 3: Create minimal cmd/http/main.go**

```go
package main

import (
	"log"

	"github.com/yourusername/space-invaders/cmd/http/components"
)

func main() {
	log.Println("🚀 Starting Space Invaders API...")

	setup, err := components.SetUp()
	if err != nil {
		log.Fatal("Setup failed:", err)
	}

	log.Println("✅ Setup complete")
	log.Println("🎮 Server ready (HTTP routes not configured yet)")

	// Keep server alive
	select {}
}
```

- [ ] **Step 4: Test database connection**

Run: `cd backend && go run cmd/http/main.go`
Expected: "Database connected" and "Auto-migration complete" logs

Check database:
```sql
psql -h localhost -U spaceinvaders -d spaceinvaders -c "\dt"
```
Expected: Tables created (players, leagues, player_items, achievements, etc.)

Stop server: `Ctrl+C`

- [ ] **Step 5: Seed initial data (leagues)**

Add to setup.go after AutoMigrate:
```go
// Seed leagues if empty
var count int64
db.Model(&entity.League{}).Count(&count)
if count == 0 {
	log.Println("📊 Seeding leagues...")
	leagues := entity.SeedLeagues()
	if err := db.Create(&leagues).Error; err != nil {
		return nil, err
	}
	log.Println("✅ Leagues seeded")
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): add database connection and auto-migration

- Create PostgreSQL connection with GORM
- Implement auto-migration for all entities
- Seed initial leagues data
- Add minimal main.go for testing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Repository Layer - Player

**Files:**
- Create: `backend/internal/domain/repository/player_repository.go`
- Create: `backend/internal/infra/database/player_repository_impl.go`
- Create: `backend/internal/infra/database/player_repository_impl_test.go`

**Interfaces:**
- Consumes: *gorm.DB from Task 1
- Produces: PlayerRepository interface with CRUD operations

- [ ] **Step 1: Write failing test for Create**

```go
package database_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&entity.Player{}, &entity.League{})
	require.NoError(t, err)

	// Seed leagues
	leagues := entity.SeedLeagues()
	require.NoError(t, db.Create(&leagues).Error)

	return db
}

func TestPlayerRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	player := &entity.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
	}

	err := repo.Create(ctx, player)
	assert.NoError(t, err)
	assert.NotZero(t, player.ID)
	assert.Equal(t, uint(1), player.LeagueID) // Default league
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/infra/database -v -run TestPlayerRepository_Create`
Expected: FAIL (NewPlayerRepository not defined)

- [ ] **Step 3: Define PlayerRepository interface**

```go
// backend/internal/domain/repository/player_repository.go
package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type PlayerRepository interface {
	Create(ctx context.Context, player *entity.Player) error
	FindByID(ctx context.Context, id uint) (*entity.Player, error)
	FindByUsername(ctx context.Context, username string) (*entity.Player, error)
	FindByEmail(ctx context.Context, email string) (*entity.Player, error)
	Update(ctx context.Context, player *entity.Player) error
	UpdateGoldBalance(ctx context.Context, playerID uint, delta int64) error
	UpdateSpaceBalance(ctx context.Context, playerID uint, delta int64) error
	UpdateHighScore(ctx context.Context, playerID uint, newScore uint64) error
	IncrementTotalGames(ctx context.Context, playerID uint) error
	List(ctx context.Context, limit, offset int) ([]entity.Player, error)
}
```

- [ ] **Step 4: Implement repository**

```go
// backend/internal/infra/database/player_repository_impl.go
package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type playerRepository struct {
	db *gorm.DB
}

func NewPlayerRepository(db *gorm.DB) repository.PlayerRepository {
	return &playerRepository{db: db}
}

func (r *playerRepository) Create(ctx context.Context, player *entity.Player) error {
	return r.db.WithContext(ctx).Create(player).Error
}

func (r *playerRepository) FindByID(ctx context.Context, id uint) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).Preload("League").First(&player, id).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

func (r *playerRepository) FindByUsername(ctx context.Context, username string) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&player).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

func (r *playerRepository) FindByEmail(ctx context.Context, email string) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&player).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

func (r *playerRepository) Update(ctx context.Context, player *entity.Player) error {
	return r.db.WithContext(ctx).Save(player).Error
}

func (r *playerRepository) UpdateGoldBalance(ctx context.Context, playerID uint, delta int64) error {
	return r.db.WithContext(ctx).Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("gold_balance", gorm.Expr("gold_balance + ?", delta)).Error
}

func (r *playerRepository) UpdateSpaceBalance(ctx context.Context, playerID uint, delta int64) error {
	return r.db.WithContext(ctx).Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("space_balance", gorm.Expr("space_balance + ?", delta)).Error
}

func (r *playerRepository) UpdateHighScore(ctx context.Context, playerID uint, newScore uint64) error {
	return r.db.WithContext(ctx).Model(&entity.Player{}).
		Where("id = ? AND high_score < ?", playerID, newScore).
		Update("high_score", newScore).Error
}

func (r *playerRepository) IncrementTotalGames(ctx context.Context, playerID uint) error {
	return r.db.WithContext(ctx).Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("total_games", gorm.Expr("total_games + 1")).Error
}

func (r *playerRepository) List(ctx context.Context, limit, offset int) ([]entity.Player, error) {
	var players []entity.Player
	err := r.db.WithContext(ctx).
		Preload("League").
		Limit(limit).
		Offset(offset).
		Find(&players).Error
	return players, err
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && go test ./internal/infra/database -v -run TestPlayerRepository_Create`
Expected: PASS

- [ ] **Step 6: Add more tests**

Add to player_repository_impl_test.go:
```go
func TestPlayerRepository_FindByUsername(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "findme",
		PasswordHash: "hash",
	}
	require.NoError(t, repo.Create(ctx, player))

	// Find by username
	found, err := repo.FindByUsername(ctx, "findme")
	assert.NoError(t, err)
	assert.Equal(t, "findme", found.Username)
	assert.NotNil(t, found.League)
}

func TestPlayerRepository_UpdateGoldBalance(t *testing.T) {
	db := setupTestDB(t)
	repo := database.NewPlayerRepository(db)
	ctx := context.Background()

	// Create player
	player := &entity.Player{
		Username:     "rich",
		PasswordHash: "hash",
		GoldBalance:  100,
	}
	require.NoError(t, repo.Create(ctx, player))

	// Update balance
	err := repo.UpdateGoldBalance(ctx, player.ID, 50)
	assert.NoError(t, err)

	// Verify
	updated, err := repo.FindByID(ctx, player.ID)
	assert.NoError(t, err)
	assert.Equal(t, uint64(150), updated.GoldBalance)
}
```

- [ ] **Step 7: Run all repository tests**

Run: `cd backend && go test ./internal/infra/database -v -cover`
Expected: All tests PASS, coverage > 80%

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement PlayerRepository with tests

- Define PlayerRepository interface with all CRUD operations
- Implement repository with GORM
- Add comprehensive unit tests (>80% coverage)
- Test Create, FindByUsername, UpdateGoldBalance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Auth Service (Register, Login, JWT)

**Files:**
- Create: `backend/internal/domain/service/auth_service.go`
- Create: `backend/internal/domain/service/auth_service_test.go`
- Create: `backend/pkg/jwt/jwt.go`

**Interfaces:**
- Consumes: PlayerRepository from Task 2
- Produces: AuthService with Register(), Login(), ValidateToken() methods

- [ ] **Step 1: Create pkg/jwt/jwt.go**

```go
package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	PlayerID uint   `json:"player_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

func GenerateToken(playerID uint, username string, secret string) (string, error) {
	claims := Claims{
		PlayerID: playerID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}
```

- [ ] **Step 2: Write failing test for AuthService.Register**

```go
// backend/internal/domain/service/auth_service_test.go
package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/database"
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
	assert.NotEqual(t, "password123", player.PasswordHash) // Password should be hashed
}

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
	assert.Contains(t, err.Error(), "username already exists")
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && go test ./internal/domain/service -v -run TestAuthService_Register`
Expected: FAIL (NewAuthService not defined)

- [ ] **Step 4: Implement AuthService**

```go
// backend/internal/domain/service/auth_service.go
package service

import (
	"context"
	"errors"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	pkgjwt "github.com/yourusername/space-invaders/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUsernameExists    = errors.New("username already exists")
	ErrEmailExists       = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid username or password")
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
	// Check if username exists
	if _, err := s.playerRepo.FindByUsername(ctx, username); err == nil {
		return "", nil, ErrUsernameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, err
	}

	// Check if email exists (if provided)
	if email != "" {
		if _, err := s.playerRepo.FindByEmail(ctx, email); err == nil {
			return "", nil, ErrEmailExists
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, err
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", nil, err
	}

	// Create player
	player := &entity.Player{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		LeagueID:     1, // Start at Bronze
	}

	if err := s.playerRepo.Create(ctx, player); err != nil {
		return "", nil, err
	}

	// Generate JWT
	token, err := pkgjwt.GenerateToken(player.ID, player.Username, s.jwtSecret)
	if err != nil {
		return "", nil, err
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
		return "", nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(player.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// Generate JWT
	token, err := pkgjwt.GenerateToken(player.ID, player.Username, s.jwtSecret)
	if err != nil {
		return "", nil, err
	}

	return token, player, nil
}

func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*pkgjwt.Claims, error) {
	return pkgjwt.ValidateToken(tokenString, s.jwtSecret)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && go test ./internal/domain/service -v -run TestAuthService`
Expected: All tests PASS

- [ ] **Step 6: Add Login test**

Add to auth_service_test.go:
```go
func TestAuthService_Login(t *testing.T) {
	db := setupTestDB(t)
	playerRepo := database.NewPlayerRepository(db)
	authService := service.NewAuthService(playerRepo, "test_secret")
	ctx := context.Background()

	// Register first
	_, _, err := authService.Register(ctx, "logintest", "login@example.com", "password123")
	require.NoError(t, err)

	// Login
	token, player, err := authService.Login(ctx, "logintest", "password123")
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "logintest", player.Username)
}

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
```

- [ ] **Step 7: Run all service tests**

Run: `cd backend && go test ./internal/domain/service -v -cover`
Expected: All tests PASS, coverage > 80%

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement AuthService with JWT

- Create JWT token generation and validation
- Implement Register with bcrypt password hashing
- Implement Login with password verification
- Add comprehensive unit tests
- Check for duplicate username/email

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Remaining Tasks (Outline)

### Task 4: HTTP Server Setup (Gin)
- Create Gin router
- Add CORS middleware
- Add auth middleware
- Health check endpoint

### Task 5: Auth Controller
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Task 6: Player Controller
- GET /api/players/me
- PUT /api/players/me
- GET /api/players/:id

### Task 7: Game Service
- StartGame()
- EndGame()
- CalculateGoldReward()
- UpdateHighScore()

### Task 8: Game Controller
- POST /api/game/start
- POST /api/game/end

### Task 9: Frontend Router & Auth
- Create Vue Router
- Login/Register views
- Auth store (Pinia)
- Protected routes

### Task 10: Frontend Game View
- Game canvas component
- Game loop logic
- Score tracking
- API integration

... (continues with ~20 more tasks for Fase 1)

---

**Next:** [Fase 2 - Economia](./fase-2-economia.md)
