# Fase 2: Sistema de Economia - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar sistema de economia dual (Gold off-chain + SPACE on-chain) com controle de emissão via Treasury

**Duração:** 2 semanas (~25 tasks)

**Pré-requisitos:** Fase 1 completa (Backend base + Auth funcionando)

**Arquitetura:**
- Dual economy: Gold (PostgreSQL) + SPACE (Solana SPL token)
- Treasury-controlled emission: `SPACE_dia = min(gameplay_rewards, receita_24h × 0.30 / preço_SPACE)`
- Conversion service: 100 Gold = 1 SPACE (one-way, irreversível)
- AbacatePay integration para compras PIX
- Solana adapter para mint/transfer de tokens SPACE

**Tech Stack:**
- Go 1.21+, Gin, GORM, PostgreSQL 16
- Solana Go SDK (github.com/gagliardetto/solana-go)
- AbacatePay API
- Redis para cache de preços
- IPFS para metadados NFT

## Global Constraints

- Go version: 1.21+
- PostgreSQL: 16+
- Solana: Devnet para desenvolvimento, Mainnet-Beta para produção
- AbacatePay: Sandbox para desenvolvimento
- IPFS: Pinata ou Infura IPFS
- Treasury wallet: Multisig 2-of-3 para produção
- SPACE price: Cache Redis com TTL 5min
- Emission calculation: Daily cron job at 00:00 UTC
- All monetary values: uint64 (evitar overflow)
- Conversion ratio: 100:1 (Gold:SPACE) - hardcoded constant
- Transaction atomicity: Use GORM transactions para consistency

---

## Navegação

- [← Fase 1: Backend Base](./fase-1-base.md)
- [→ Fase 3: Sistemas de Progressão](./fase-3-progressao.md)
- [📋 Índice Geral](./README.md)

---

### Task 1: Treasury Entity & Repository

**Files:**
- Create: `backend/internal/domain/entity/treasury_config.go`
- Create: `backend/internal/domain/repository/treasury_repository.go`
- Create: `backend/internal/infra/database/treasury_repository_impl.go`
- Create: `backend/internal/infra/database/treasury_repository_impl_test.go`
- Modify: `backend/internal/infra/database/connection.go` (add AutoMigrate)

**Interfaces:**
- Consumes: `gorm.DB` from connection.go
- Produces: `TreasuryRepository` interface with methods:
  - `GetConfig(ctx context.Context) (*entity.TreasuryConfig, error)`
  - `UpdateDailyEmission(ctx context.Context, emission uint64, date time.Time) error`
  - `GetEmissionHistory(ctx context.Context, startDate, endDate time.Time) ([]entity.DailyEmission, error)`

- [ ] **Step 1: Write failing test for Treasury entity**

Create `backend/internal/infra/database/treasury_repository_impl_test.go`:

```go
package database_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/infra/database"
)

func TestTreasuryRepository_GetConfig(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewTreasuryRepository(db)

	ctx := context.Background()
	config, err := repo.GetConfig(ctx)

	require.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, uint64(100), config.ConversionRatio) // 100 Gold = 1 SPACE
	assert.Equal(t, float64(0.30), config.RevenueSharePercent)
}

func TestTreasuryRepository_UpdateDailyEmission(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	today := time.Now().UTC().Truncate(24 * time.Hour)
	emission := uint64(10000000000) // 100 SPACE (in lamports)

	err := repo.UpdateDailyEmission(ctx, emission, today)
	require.NoError(t, err)

	// Verify saved
	history, err := repo.GetEmissionHistory(ctx, today, today)
	require.NoError(t, err)
	require.Len(t, history, 1)
	assert.Equal(t, emission, history[0].EmittedAmount)
}

func TestTreasuryRepository_GetEmissionHistory(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewTreasuryRepository(db)
	ctx := context.Background()

	// Create 3 days of emissions
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := 0; i < 3; i++ {
		date := today.AddDate(0, 0, -i)
		emission := uint64((i + 1) * 1000000000) // Variable amounts
		err := repo.UpdateDailyEmission(ctx, emission, date)
		require.NoError(t, err)
	}

	// Query range
	start := today.AddDate(0, 0, -2)
	history, err := repo.GetEmissionHistory(ctx, start, today)

	require.NoError(t, err)
	assert.Len(t, history, 3)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/infra/database -v -run TestTreasuryRepository`

Expected: FAIL with "undefined: entity.TreasuryConfig" and "undefined: database.NewTreasuryRepository"

- [ ] **Step 3: Create Treasury entities**

Create `backend/internal/domain/entity/treasury_config.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// TreasuryConfig stores global treasury configuration (singleton table)
type TreasuryConfig struct {
	gorm.Model

	// Conversion ratio: Gold amount needed for 1 SPACE
	ConversionRatio uint64 `gorm:"not null;default:100"`

	// Revenue share percentage for SPACE emission (e.g., 0.30 = 30%)
	RevenueSharePercent float64 `gorm:"not null;default:0.30"`

	// Treasury wallet address on Solana
	TreasuryWallet string `gorm:"not null"`

	// Maximum daily emission cap (in lamports)
	MaxDailyEmission uint64 `gorm:"not null;default:1000000000000"` // 10,000 SPACE
}

// DailyEmission tracks actual SPACE emission per day
type DailyEmission struct {
	gorm.Model

	Date time.Time `gorm:"uniqueIndex;not null"` // UTC date (truncated to day)

	// Calculated values
	GameplayRewards uint64 `gorm:"not null"` // Total Gold earned from gameplay
	Revenue24h      uint64 `gorm:"not null"` // PIX revenue in cents (last 24h)
	SpacePrice      uint64 `gorm:"not null"` // SPACE price in cents at calculation time

	// Formula result: min(gameplay_rewards, revenue_24h × 0.30 / price_SPACE)
	EmittedAmount uint64 `gorm:"not null"` // Actual SPACE emitted (in lamports)

	// Execution status
	Executed bool `gorm:"default:false"` // Whether emission was executed on-chain
	TxHash   string `gorm:"index"`       // Solana transaction hash
}
```

Create entity file in `backend/internal/domain/entity/conversion.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// Conversion tracks Gold → SPACE conversions
type Conversion struct {
	gorm.Model

	PlayerID uint `gorm:"not null;index"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	GoldAmount  uint64 `gorm:"not null"` // Gold spent
	SpaceAmount uint64 `gorm:"not null"` // SPACE received (in lamports)

	Status string `gorm:"not null;default:'pending'"` // pending, completed, failed

	// Solana transaction details
	TxHash      string `gorm:"index"`
	BlockHeight uint64

	CompletedAt *time.Time
	FailedAt    *time.Time
	ErrorMsg    string
}
```

- [ ] **Step 4: Create TreasuryRepository interface**

Create `backend/internal/domain/repository/treasury_repository.go`:

```go
package repository

import (
	"context"
	"time"

	"space-invaders/internal/domain/entity"
)

type TreasuryRepository interface {
	// GetConfig retrieves the treasury configuration (singleton)
	GetConfig(ctx context.Context) (*entity.TreasuryConfig, error)

	// UpdateDailyEmission saves daily emission record
	UpdateDailyEmission(ctx context.Context, emission uint64, date time.Time) error

	// GetEmissionHistory retrieves emission records for date range
	GetEmissionHistory(ctx context.Context, startDate, endDate time.Time) ([]entity.DailyEmission, error)
}
```

- [ ] **Step 5: Implement TreasuryRepository**

Create `backend/internal/infra/database/treasury_repository_impl.go`:

```go
package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type treasuryRepository struct {
	db *gorm.DB
}

func NewTreasuryRepository(db *gorm.DB) repository.TreasuryRepository {
	return &treasuryRepository{db: db}
}

func (r *treasuryRepository) GetConfig(ctx context.Context) (*entity.TreasuryConfig, error) {
	var config entity.TreasuryConfig
	err := r.db.WithContext(ctx).First(&config).Error
	if err == gorm.ErrRecordNotFound {
		// Return default config if not exists
		return &entity.TreasuryConfig{
			ConversionRatio:     100,
			RevenueSharePercent: 0.30,
			TreasuryWallet:      "", // Set via env var
			MaxDailyEmission:    1000000000000,
		}, nil
	}
	return &config, err
}

func (r *treasuryRepository) UpdateDailyEmission(ctx context.Context, emission uint64, date time.Time) error {
	// Truncate to day (UTC)
	dayStart := date.UTC().Truncate(24 * time.Hour)

	dailyEmission := entity.DailyEmission{
		Date:          dayStart,
		EmittedAmount: emission,
	}

	return r.db.WithContext(ctx).
		Where("date = ?", dayStart).
		Assign(map[string]interface{}{
			"emitted_amount": emission,
		}).
		FirstOrCreate(&dailyEmission).Error
}

func (r *treasuryRepository) GetEmissionHistory(ctx context.Context, startDate, endDate time.Time) ([]entity.DailyEmission, error) {
	var history []entity.DailyEmission

	start := startDate.UTC().Truncate(24 * time.Hour)
	end := endDate.UTC().Truncate(24 * time.Hour).Add(24 * time.Hour) // Include end date

	err := r.db.WithContext(ctx).
		Where("date >= ? AND date < ?", start, end).
		Order("date DESC").
		Find(&history).Error

	return history, err
}
```

- [ ] **Step 6: Add AutoMigrate for new entities**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.TreasuryConfig{},
&entity.DailyEmission{},
&entity.Conversion{},
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && go test ./internal/infra/database -v -run TestTreasuryRepository`

Expected: PASS (all 3 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/internal/domain/entity/treasury_config.go \
        backend/internal/domain/entity/conversion.go \
        backend/internal/domain/repository/treasury_repository.go \
        backend/internal/infra/database/treasury_repository_impl.go \
        backend/internal/infra/database/treasury_repository_impl_test.go \
        backend/internal/infra/database/connection.go
git commit -m "feat(economy): add treasury and conversion entities with repository"
```

---

### Task 2: Conversion Service (Gold → SPACE)

**Files:**
- Create: `backend/internal/domain/service/conversion_service.go`
- Create: `backend/internal/domain/service/conversion_service_test.go`
- Create: `backend/internal/domain/repository/conversion_repository.go`
- Create: `backend/internal/infra/database/conversion_repository_impl.go`

**Interfaces:**
- Consumes:
  - `PlayerRepository` (from Task 1.2)
  - `TreasuryRepository` (from Task 2.1)
- Produces:
  - `ConversionService` with method:
    - `ConvertGoldToSpace(ctx context.Context, playerID uint, goldAmount uint64) (*entity.Conversion, error)`
  - `ConversionRepository` interface with methods:
    - `Create(ctx context.Context, conversion *entity.Conversion) error`
    - `FindByID(ctx context.Context, id uint) (*entity.Conversion, error)`
    - `ListByPlayerID(ctx context.Context, playerID uint, limit int) ([]entity.Conversion, error)`

- [ ] **Step 1: Write failing test for ConversionService**

Create `backend/internal/domain/service/conversion_service_test.go`:

```go
package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/service"
	"space-invaders/test/mocks"
)

func TestConversionService_ConvertGoldToSpace_Success(t *testing.T) {
	playerRepo := new(mocks.MockPlayerRepository)
	treasuryRepo := new(mocks.MockTreasuryRepository)
	conversionRepo := new(mocks.MockConversionRepository)

	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo)

	ctx := context.Background()
	playerID := uint(1)
	goldAmount := uint64(1000) // Want to convert 1000 Gold

	// Mock: Player has enough gold
	player := &entity.Player{
		Model:       gorm.Model{ID: playerID},
		GoldBalance: 5000,
	}
	playerRepo.On("FindByID", ctx, playerID).Return(player, nil)

	// Mock: Treasury config (100:1 ratio)
	config := &entity.TreasuryConfig{
		ConversionRatio: 100,
	}
	treasuryRepo.On("GetConfig", ctx).Return(config, nil)

	// Mock: Player balance update (5000 - 1000 = 4000)
	playerRepo.On("UpdateGoldBalance", ctx, playerID, int64(-1000)).Return(nil)

	// Mock: Conversion record saved
	conversionRepo.On("Create", ctx, mock.MatchedBy(func(c *entity.Conversion) bool {
		return c.PlayerID == playerID && c.GoldAmount == 1000 && c.SpaceAmount == 10000000000 // 10 SPACE
	})).Return(nil)

	// Execute
	conversion, err := svc.ConvertGoldToSpace(ctx, playerID, goldAmount)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, conversion)
	assert.Equal(t, goldAmount, conversion.GoldAmount)
	assert.Equal(t, uint64(10000000000), conversion.SpaceAmount) // 10 SPACE (1000/100 = 10)
	assert.Equal(t, "pending", conversion.Status)

	playerRepo.AssertExpectations(t)
	treasuryRepo.AssertExpectations(t)
	conversionRepo.AssertExpectations(t)
}

func TestConversionService_ConvertGoldToSpace_InsufficientGold(t *testing.T) {
	playerRepo := new(mocks.MockPlayerRepository)
	treasuryRepo := new(mocks.MockTreasuryRepository)
	conversionRepo := new(mocks.MockConversionRepository)

	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo)

	ctx := context.Background()
	playerID := uint(1)
	goldAmount := uint64(1000)

	// Mock: Player does NOT have enough gold
	player := &entity.Player{
		Model:       gorm.Model{ID: playerID},
		GoldBalance: 500, // Only 500, wants to convert 1000
	}
	playerRepo.On("FindByID", ctx, playerID).Return(player, nil)

	// Execute
	conversion, err := svc.ConvertGoldToSpace(ctx, playerID, goldAmount)

	// Assert
	require.Error(t, err)
	assert.Nil(t, conversion)
	assert.Contains(t, err.Error(), "insufficient gold balance")

	playerRepo.AssertExpectations(t)
}

func TestConversionService_ConvertGoldToSpace_BelowMinimum(t *testing.T) {
	playerRepo := new(mocks.MockPlayerRepository)
	treasuryRepo := new(mocks.MockTreasuryRepository)
	conversionRepo := new(mocks.MockConversionRepository)

	svc := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo)

	ctx := context.Background()
	playerID := uint(1)
	goldAmount := uint64(50) // Less than minimum (100)

	// Mock: Treasury config
	config := &entity.TreasuryConfig{
		ConversionRatio: 100,
	}
	treasuryRepo.On("GetConfig", ctx).Return(config, nil)

	// Execute
	conversion, err := svc.ConvertGoldToSpace(ctx, playerID, goldAmount)

	// Assert
	require.Error(t, err)
	assert.Nil(t, conversion)
	assert.Contains(t, err.Error(), "minimum conversion is 100 gold")

	treasuryRepo.AssertExpectations(t)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/domain/service -v -run TestConversionService`

Expected: FAIL with "undefined: service.NewConversionService"

- [ ] **Step 3: Create ConversionRepository interface**

Create `backend/internal/domain/repository/conversion_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type ConversionRepository interface {
	Create(ctx context.Context, conversion *entity.Conversion) error
	FindByID(ctx context.Context, id uint) (*entity.Conversion, error)
	ListByPlayerID(ctx context.Context, playerID uint, limit int) ([]entity.Conversion, error)
	UpdateStatus(ctx context.Context, id uint, status string, txHash string) error
}
```

- [ ] **Step 4: Implement ConversionRepository**

Create `backend/internal/infra/database/conversion_repository_impl.go`:

```go
package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type conversionRepository struct {
	db *gorm.DB
}

func NewConversionRepository(db *gorm.DB) repository.ConversionRepository {
	return &conversionRepository{db: db}
}

func (r *conversionRepository) Create(ctx context.Context, conversion *entity.Conversion) error {
	return r.db.WithContext(ctx).Create(conversion).Error
}

func (r *conversionRepository) FindByID(ctx context.Context, id uint) (*entity.Conversion, error) {
	var conversion entity.Conversion
	err := r.db.WithContext(ctx).
		Preload("Player").
		First(&conversion, id).Error
	return &conversion, err
}

func (r *conversionRepository) ListByPlayerID(ctx context.Context, playerID uint, limit int) ([]entity.Conversion, error) {
	var conversions []entity.Conversion
	err := r.db.WithContext(ctx).
		Where("player_id = ?", playerID).
		Order("created_at DESC").
		Limit(limit).
		Find(&conversions).Error
	return conversions, err
}

func (r *conversionRepository) UpdateStatus(ctx context.Context, id uint, status string, txHash string) error {
	updates := map[string]interface{}{
		"status":  status,
		"tx_hash": txHash,
	}

	if status == "completed" {
		now := time.Now()
		updates["completed_at"] = &now
	} else if status == "failed" {
		now := time.Now()
		updates["failed_at"] = &now
	}

	return r.db.WithContext(ctx).
		Model(&entity.Conversion{}).
		Where("id = ?", id).
		Updates(updates).Error
}
```

- [ ] **Step 5: Implement ConversionService**

Create `backend/internal/domain/service/conversion_service.go`:

```go
package service

import (
	"context"
	"errors"
	"fmt"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

const (
	// SPACE decimals (same as SOL = 9)
	SpaceDecimals = 9
	SpaceLamportsPerToken = 1_000_000_000 // 10^9
)

type ConversionService struct {
	playerRepo     repository.PlayerRepository
	treasuryRepo   repository.TreasuryRepository
	conversionRepo repository.ConversionRepository
}

func NewConversionService(
	playerRepo repository.PlayerRepository,
	treasuryRepo repository.TreasuryRepository,
	conversionRepo repository.ConversionRepository,
) *ConversionService {
	return &ConversionService{
		playerRepo:     playerRepo,
		treasuryRepo:   treasuryRepo,
		conversionRepo: conversionRepo,
	}
}

func (s *ConversionService) ConvertGoldToSpace(ctx context.Context, playerID uint, goldAmount uint64) (*entity.Conversion, error) {
	// Get treasury config
	config, err := s.treasuryRepo.GetConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get treasury config: %w", err)
	}

	// Validate minimum conversion
	if goldAmount < config.ConversionRatio {
		return nil, fmt.Errorf("minimum conversion is %d gold (1 SPACE)", config.ConversionRatio)
	}

	// Get player
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get player: %w", err)
	}

	// Check balance
	if player.GoldBalance < goldAmount {
		return nil, errors.New("insufficient gold balance")
	}

	// Calculate SPACE amount (in lamports)
	// Formula: (goldAmount / conversionRatio) * 10^9
	spaceTokens := goldAmount / config.ConversionRatio
	spaceLamports := spaceTokens * SpaceLamportsPerToken

	// Deduct Gold from player (atomic operation)
	err = s.playerRepo.UpdateGoldBalance(ctx, playerID, -int64(goldAmount))
	if err != nil {
		return nil, fmt.Errorf("failed to deduct gold: %w", err)
	}

	// Create conversion record
	conversion := &entity.Conversion{
		PlayerID:    playerID,
		GoldAmount:  goldAmount,
		SpaceAmount: spaceLamports,
		Status:      "pending", // Will be completed by async worker
	}

	err = s.conversionRepo.Create(ctx, conversion)
	if err != nil {
		// Rollback: refund gold
		_ = s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(goldAmount))
		return nil, fmt.Errorf("failed to create conversion record: %w", err)
	}

	return conversion, nil
}

func (s *ConversionService) GetConversionHistory(ctx context.Context, playerID uint, limit int) ([]entity.Conversion, error) {
	return s.conversionRepo.ListByPlayerID(ctx, playerID, limit)
}
```

- [ ] **Step 6: Create mock repositories for tests**

Create `backend/test/mocks/repository_mocks.go`:

```go
package mocks

import (
	"context"
	"time"

	"github.com/stretchr/testify/mock"

	"space-invaders/internal/domain/entity"
)

type MockTreasuryRepository struct {
	mock.Mock
}

func (m *MockTreasuryRepository) GetConfig(ctx context.Context) (*entity.TreasuryConfig, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.TreasuryConfig), args.Error(1)
}

func (m *MockTreasuryRepository) UpdateDailyEmission(ctx context.Context, emission uint64, date time.Time) error {
	args := m.Called(ctx, emission, date)
	return args.Error(0)
}

func (m *MockTreasuryRepository) GetEmissionHistory(ctx context.Context, startDate, endDate time.Time) ([]entity.DailyEmission, error) {
	args := m.Called(ctx, startDate, endDate)
	return args.Get(0).([]entity.DailyEmission), args.Error(1)
}

type MockConversionRepository struct {
	mock.Mock
}

func (m *MockConversionRepository) Create(ctx context.Context, conversion *entity.Conversion) error {
	args := m.Called(ctx, conversion)
	return args.Error(0)
}

func (m *MockConversionRepository) FindByID(ctx context.Context, id uint) (*entity.Conversion, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Conversion), args.Error(1)
}

func (m *MockConversionRepository) ListByPlayerID(ctx context.Context, playerID uint, limit int) ([]entity.Conversion, error) {
	args := m.Called(ctx, playerID, limit)
	return args.Get(0).([]entity.Conversion), args.Error(1)
}

func (m *MockConversionRepository) UpdateStatus(ctx context.Context, id uint, status string, txHash string) error {
	args := m.Called(ctx, id, status, txHash)
	return args.Error(0)
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && go test ./internal/domain/service -v -run TestConversionService`

Expected: PASS (all 3 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/internal/domain/service/conversion_service.go \
        backend/internal/domain/service/conversion_service_test.go \
        backend/internal/domain/repository/conversion_repository.go \
        backend/internal/infra/database/conversion_repository_impl.go \
        backend/test/mocks/repository_mocks.go
git commit -m "feat(economy): add conversion service for Gold→SPACE"
```

---

### Task 3: Solana Adapter (SPL Token Operations)

**Files:**
- Create: `backend/internal/infra/blockchain/solana_adapter.go`
- Create: `backend/internal/infra/blockchain/solana_adapter_test.go`
- Create: `backend/pkg/config/solana_config.go`
- Modify: `backend/configs/config.go` (add Solana config)

**Interfaces:**
- Consumes: Solana RPC endpoint, Treasury wallet keypair
- Produces: `SolanaAdapter` with methods:
  - `MintTokens(ctx context.Context, recipientWallet string, amount uint64) (string, error)` → tx hash
  - `TransferTokens(ctx context.Context, fromWallet, toWallet string, amount uint64) (string, error)` → tx hash
  - `GetBalance(ctx context.Context, wallet string) (uint64, error)` → balance in lamports

- [ ] **Step 1: Install Solana Go SDK**

Run:
```bash
cd backend
go get github.com/gagliardetto/solana-go@v1.8.4
go get github.com/gagliardetto/solana-go/rpc@v1.8.4
go get github.com/gagliardetto/solana-go/programs/token@v1.8.4
```

Expected: Dependencies added to go.mod

- [ ] **Step 2: Write failing test for SolanaAdapter**

Create `backend/internal/infra/blockchain/solana_adapter_test.go`:

```go
package blockchain_test

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"space-invaders/internal/infra/blockchain"
	"space-invaders/pkg/config"
)

func TestSolanaAdapter_MintTokens(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Use devnet for testing
	cfg := &config.SolanaConfig{
		RpcURL:          "https://api.devnet.solana.com",
		TreasuryPrivKey: os.Getenv("SOLANA_TREASURY_PRIVKEY"), // base58 encoded
		TokenMintPubkey: os.Getenv("SOLANA_TOKEN_MINT"),       // SPACE token mint address
		Network:         "devnet",
	}

	if cfg.TreasuryPrivKey == "" || cfg.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TREASURY_PRIVKEY or SOLANA_TOKEN_MINT not set")
	}

	adapter, err := blockchain.NewSolanaAdapter(cfg)
	require.NoError(t, err)

	ctx := context.Background()

	// Mint 10 SPACE to test wallet
	recipientWallet := "GTest1111111111111111111111111111111111111" // Test wallet
	amount := uint64(10_000_000_000) // 10 SPACE

	txHash, err := adapter.MintTokens(ctx, recipientWallet, amount)

	require.NoError(t, err)
	assert.NotEmpty(t, txHash)
	assert.Len(t, txHash, 88) // Solana signature length (base58)

	t.Logf("Mint tx: %s", txHash)
}

func TestSolanaAdapter_GetBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	cfg := &config.SolanaConfig{
		RpcURL:          "https://api.devnet.solana.com",
		TokenMintPubkey: os.Getenv("SOLANA_TOKEN_MINT"),
		Network:         "devnet",
	}

	if cfg.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TOKEN_MINT not set")
	}

	adapter, err := blockchain.NewSolanaAdapter(cfg)
	require.NoError(t, err)

	ctx := context.Background()
	wallet := "GTest1111111111111111111111111111111111111"

	balance, err := adapter.GetBalance(ctx, wallet)

	require.NoError(t, err)
	assert.GreaterOrEqual(t, balance, uint64(0))

	t.Logf("Balance: %d lamports", balance)
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && go test ./internal/infra/blockchain -v -short`

Expected: FAIL with "undefined: blockchain.NewSolanaAdapter"

- [ ] **Step 4: Create Solana config**

Create `backend/pkg/config/solana_config.go`:

```go
package config

type SolanaConfig struct {
	RpcURL          string // e.g., https://api.mainnet-beta.solana.com
	TreasuryPrivKey string // Base58-encoded private key
	TokenMintPubkey string // SPACE token mint address
	Network         string // devnet, testnet, mainnet-beta
}
```

Modify `backend/configs/config.go`:

```go
// Add to Config struct:
Solana SolanaConfig `yaml:"solana"`

// In loadConfig(), add:
Solana: SolanaConfig{
	RpcURL:          getEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
	TreasuryPrivKey: getEnv("SOLANA_TREASURY_PRIVKEY", ""),
	TokenMintPubkey: getEnv("SOLANA_TOKEN_MINT", ""),
	Network:         getEnv("SOLANA_NETWORK", "devnet"),
},
```

- [ ] **Step 5: Implement SolanaAdapter**

Create `backend/internal/infra/blockchain/solana_adapter.go`:

```go
package blockchain

import (
	"context"
	"errors"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"

	"space-invaders/pkg/config"
)

type SolanaAdapter struct {
	client       *rpc.Client
	treasuryKey  solana.PrivateKey
	tokenMint    solana.PublicKey
	network      string
}

func NewSolanaAdapter(cfg *config.SolanaConfig) (*SolanaAdapter, error) {
	client := rpc.New(cfg.RpcURL)

	var treasuryKey solana.PrivateKey
	if cfg.TreasuryPrivKey != "" {
		key, err := solana.PrivateKeyFromBase58(cfg.TreasuryPrivKey)
		if err != nil {
			return nil, fmt.Errorf("invalid treasury private key: %w", err)
		}
		treasuryKey = key
	}

	tokenMint, err := solana.PublicKeyFromBase58(cfg.TokenMintPubkey)
	if err != nil {
		return nil, fmt.Errorf("invalid token mint pubkey: %w", err)
	}

	return &SolanaAdapter{
		client:      client,
		treasuryKey: treasuryKey,
		tokenMint:   tokenMint,
		network:     cfg.Network,
	}, nil
}

func (a *SolanaAdapter) MintTokens(ctx context.Context, recipientWallet string, amount uint64) (string, error) {
	if a.treasuryKey.IsZero() {
		return "", errors.New("treasury private key not configured")
	}

	recipient, err := solana.PublicKeyFromBase58(recipientWallet)
	if err != nil {
		return "", fmt.Errorf("invalid recipient wallet: %w", err)
	}

	// Get recipient's associated token account (ATA)
	recipientATA, _, err := solana.FindAssociatedTokenAddress(recipient, a.tokenMint)
	if err != nil {
		return "", fmt.Errorf("failed to find ATA: %w", err)
	}

	// Build MintTo instruction
	mintIx := token.NewMintToInstruction(
		amount,
		a.tokenMint,
		recipientATA,
		a.treasuryKey.PublicKey(),
		[]solana.PublicKey{}, // No multisig
	).Build()

	// Get recent blockhash
	recent, err := a.client.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return "", fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Build transaction
	tx, err := solana.NewTransaction(
		[]solana.Instruction{mintIx},
		recent.Value.Blockhash,
		solana.TransactionPayer(a.treasuryKey.PublicKey()),
	)
	if err != nil {
		return "", fmt.Errorf("failed to build transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(a.treasuryKey.PublicKey()) {
			return &a.treasuryKey
		}
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	sig, err := a.client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	return sig.String(), nil
}

func (a *SolanaAdapter) TransferTokens(ctx context.Context, fromWallet, toWallet string, amount uint64) (string, error) {
	// Similar to MintTokens but uses Transfer instruction instead
	// TODO: Implement when needed for P2P transfers
	return "", errors.New("not implemented")
}

func (a *SolanaAdapter) GetBalance(ctx context.Context, wallet string) (uint64, error) {
	walletPubkey, err := solana.PublicKeyFromBase58(wallet)
	if err != nil {
		return 0, fmt.Errorf("invalid wallet address: %w", err)
	}

	// Get associated token account
	ata, _, err := solana.FindAssociatedTokenAddress(walletPubkey, a.tokenMint)
	if err != nil {
		return 0, fmt.Errorf("failed to find ATA: %w", err)
	}

	// Get token account balance
	balance, err := a.client.GetTokenAccountBalance(ctx, ata, rpc.CommitmentFinalized)
	if err != nil {
		return 0, fmt.Errorf("failed to get balance: %w", err)
	}

	return balance.Value.Amount, nil
}

func (a *SolanaAdapter) GetNetwork() string {
	return a.network
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && go test ./internal/infra/blockchain -v -short`

Expected: PASS (tests skipped without env vars)

Run with env vars:
```bash
SOLANA_TREASURY_PRIVKEY="<devnet-key>" \
SOLANA_TOKEN_MINT="<mint-address>" \
go test ./internal/infra/blockchain -v
```

Expected: PASS (integration tests run if env vars set)

- [ ] **Step 7: Commit**

```bash
git add backend/internal/infra/blockchain/solana_adapter.go \
        backend/internal/infra/blockchain/solana_adapter_test.go \
        backend/pkg/config/solana_config.go \
        backend/configs/config.go \
        backend/go.mod \
        backend/go.sum
git commit -m "feat(economy): add Solana adapter for SPL token operations"
```

---

## Remaining Tasks (Outline)

### Task 4: Daily Emission Calculator Service
- **Goal:** Calculate daily SPACE emission based on Treasury formula
- **Formula:** `min(gameplay_rewards, revenue_24h × 0.30 / price_SPACE)`
- **Files:** `domain/service/emission_calculator_service.go`, tests
- **Dependencies:** TreasuryRepository, SPACE price fetcher (Task 5)

### Task 5: SPACE Price Fetcher (CoinGecko/Jupiter)
- **Goal:** Fetch SPACE token price from DEX/CEX APIs
- **Files:** `infra/external/price_fetcher.go`, Redis cache layer
- **Cache:** Redis with 5min TTL
- **APIs:** Jupiter aggregator (primary), CoinGecko (fallback)

### Task 6: AbacatePay Integration (PIX Payments)
- **Goal:** Create orders, generate PIX QR codes, handle webhooks
- **Files:** `infra/external/abacatepay_client.go`, `domain/entity/order.go`
- **Entities:** Order (pending, paid, expired, cancelled)
- **Endpoints:** POST /orders/create, GET /orders/:id, POST /webhooks/abacatepay

### Task 7: Shop Service (Gold Purchase via PIX)
- **Goal:** Players buy Gold packages via PIX
- **Files:** `domain/service/shop_service.go`, tests
- **Packages:** 100 Gold (R$ 5), 500 Gold (R$ 20), 1000 Gold (R$ 35)
- **Flow:** Create order → AbacatePay PIX → Webhook → Credit Gold

### Task 8: Conversion Worker (Process Pending Conversions)
- **Goal:** Async worker to mint SPACE on-chain for pending conversions
- **Files:** `cmd/workers/conversion_worker.go`, RabbitMQ consumer
- **Queue:** `conversions.pending` (from ConversionService)
- **Flow:** Poll pending → Mint via Solana → Update status (completed/failed)

### Task 9: Emission Cron Job
- **Goal:** Daily job to calculate and execute SPACE emission
- **Files:** `cmd/workers/emission_cron.go`, cron scheduler
- **Schedule:** Daily at 00:00 UTC
- **Flow:** Calculate emission → Mint to Treasury → Save DailyEmission record

### Task 10: HTTP Controllers - Conversion
- **Files:** `app/http/controller/conversion_controller.go`
- **Endpoints:**
  - POST /api/conversions (convert Gold→SPACE)
  - GET /api/conversions/history (player's history)
  - GET /api/conversions/:id (conversion status)

### Task 11: HTTP Controllers - Shop
- **Files:** `app/http/controller/shop_controller.go`
- **Endpoints:**
  - GET /api/shop/packages (list gold packages)
  - POST /api/shop/orders (create PIX order)
  - GET /api/shop/orders/:id (order status)

### Task 12: HTTP Controllers - Treasury (Admin)
- **Files:** `app/http/controller/treasury_controller.go`
- **Endpoints:**
  - GET /api/admin/treasury/config (get config)
  - GET /api/admin/treasury/emissions (emission history)
  - POST /api/admin/treasury/manual-emission (manual trigger)

### Task 13: Frontend - Conversion UI (Vue)
- **Files:** `frontend/src/views/ConversionView.vue`, `stores/conversionStore.ts`
- **UI:** Gold balance, SPACE balance, conversion form (input Gold amount), history table
- **Validation:** Minimum 100 Gold, sufficient balance

### Task 14: Frontend - Shop UI (Vue)
- **Files:** `frontend/src/views/ShopView.vue`, `stores/shopStore.ts`
- **UI:** Gold packages cards, PIX QR code modal, payment status polling
- **Flow:** Select package → Generate QR → Display → Poll status → Show success

### Task 15: Frontend - Wallet Connection (Phantom)
- **Files:** `frontend/src/composables/useWallet.ts`, `stores/walletStore.ts`
- **Integration:** Phantom wallet adapter for Solana
- **Features:** Connect, disconnect, sign messages, get balance

### Task 16: E2E Tests - Conversion Flow
- **Files:** `backend/test/e2e/conversion_flow_test.go`
- **Scenario:** Register → Earn Gold → Convert to SPACE → Verify on-chain balance

### Task 17: E2E Tests - Shop Flow
- **Files:** `backend/test/e2e/shop_flow_test.go`
- **Scenario:** Create order → Mock PIX payment → Webhook → Verify Gold credited

### Task 18: IPFS Adapter (NFT Metadata Storage)
- **Files:** `infra/external/ipfs_client.go`
- **Provider:** Pinata or Infura IPFS
- **Methods:** UploadJSON(), UploadImage(), Pin()
- **Usage:** NFT metadata in Fase 3

### Task 19: Redis Cache Layer
- **Files:** `infra/cache/redis_client.go`, connection setup
- **Usage:** SPACE price cache, session cache, rate limiting

### Task 20: RabbitMQ Event Bus Setup
- **Files:** `infra/messaging/rabbitmq_client.go`, queues setup
- **Queues:** conversions.pending, emissions.daily, orders.webhook
- **Pattern:** Publisher/Subscriber for async processing

### Task 21: Monitoring - Prometheus Metrics
- **Files:** `pkg/metrics/prometheus.go`
- **Metrics:** conversion_total, emission_daily, gold_purchased_total
- **Endpoint:** GET /metrics (Prometheus scrape)

### Task 22: Documentation - Economy API
- **Files:** `docs/api/economy.md`
- **Sections:** Conversion endpoints, Shop endpoints, Treasury endpoints, Webhook spec

### Task 23: Seed Data - Treasury Config
- **Files:** `backend/scripts/seed_treasury.sql`
- **Data:** Default TreasuryConfig row with production values

### Task 24: Environment Variables - Production
- **Files:** `.env.production.example`
- **Vars:** SOLANA_RPC_URL (mainnet), TREASURY_PRIVKEY, TOKEN_MINT, ABACATEPAY_API_KEY

### Task 25: Integration Tests - Solana Devnet
- **Files:** `backend/test/integration/solana_integration_test.go`
- **Tests:** Mint tokens, transfer, get balance on devnet

---

## Validation Checkpoints

After completing Fase 2, validate:

- [ ] Conversion Gold→SPACE funcional (UI + backend + on-chain)
- [ ] Shop PIX payment completo (order creation + webhook + gold credit)
- [ ] Daily emission calculator executando corretamente
- [ ] Treasury emission limits respeitados (formula validada)
- [ ] Solana adapter funcionando em devnet
- [ ] Conversions async worker processando pending conversions
- [ ] Frontend exibindo balances (Gold + SPACE) corretamente
- [ ] E2E tests passando (conversion + shop flows)

---

## Next Phase

→ [Fase 3: Sistemas de Progressão](./fase-3-progressao.md) - Battle Pass, NFTs, Achievements, Leagues
