# Fase 3: Sistemas de Progressão - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Battle Pass XP, NFT mint, Achievements, Leagues ranking, e Special Events

**Duração:** 3 semanas (~35 tasks)

**Pré-requisitos:** Fase 2 completa (Economia dual funcionando)

**Arquitetura:**
- Battle Pass: Season-based XP progression com free + premium tiers
- NFTs: Solana SPL tokens (Metaplex standard) com metadata no IPFS
- Achievements: Unlock system baseado em player actions
- Leagues: Ranking system com promoção/demoção automática
- Special Events: Time-limited events com rewards especiais

**Tech Stack:**
- Go 1.21+, Gin, GORM, PostgreSQL 16
- Metaplex Candy Machine v3 (NFT minting)
- IPFS (Pinata) para NFT metadata
- Redis para leaderboard caching
- Vue 3 + Pinia para UI de progressão

## Global Constraints

- Go version: 1.21+
- PostgreSQL: 16+
- Metaplex: Candy Machine v3 on Solana
- IPFS: Pinata com pinning permanente
- Battle Pass: 30 days per season
- XP per game: base 100 XP + bonus (high score, streaks)
- NFT rarity: Common (60%), Rare (30%), Epic (9%), Legendary (1%)
- Achievements: 50+ achievements no MVP
- Leagues: 5 tiers (Bronze, Silver, Gold, Platinum, Diamond)
- All timestamps: UTC timezone
- Season transitions: Automated via cron job

---

## Navegação

- [← Fase 2: Sistema de Economia](./fase-2-economia.md)
- [→ Fase 4: Social & PvP](./fase-4-social-pvp.md)
- [📋 Índice Geral](./README.md)

---

### Task 1: Battle Pass Entity & Repository

**Files:**
- Create: `backend/internal/domain/entity/battle_pass.go`
- Create: `backend/internal/domain/repository/battle_pass_repository.go`
- Create: `backend/internal/infra/database/battle_pass_repository_impl.go`
- Create: `backend/internal/infra/database/battle_pass_repository_impl_test.go`
- Modify: `backend/internal/infra/database/connection.go` (add AutoMigrate)

**Interfaces:**
- Consumes: `gorm.DB` from connection.go
- Produces: `BattlePassRepository` interface with methods:
  - `GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error)`
  - `GetPlayerProgress(ctx context.Context, playerID, seasonID uint) (*entity.BattlePassProgress, error)`
  - `AddXP(ctx context.Context, playerID, seasonID uint, xp uint) error`
  - `ClaimReward(ctx context.Context, playerID, seasonID, tier uint) error`

- [ ] **Step 1: Write failing test for Battle Pass repository**

Create `backend/internal/infra/database/battle_pass_repository_impl_test.go`:

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

func TestBattlePassRepository_GetCurrentSeason(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewBattlePassRepository(db)

	// Create active season
	now := time.Now()
	season := &entity.BattlePassSeason{
		Name:      "Season 1",
		StartDate: now.AddDate(0, 0, -5),
		EndDate:   now.AddDate(0, 0, 25),
		Active:    true,
		MaxTier:   50,
	}
	db.Create(season)

	ctx := context.Background()
	current, err := repo.GetCurrentSeason(ctx)

	require.NoError(t, err)
	assert.NotNil(t, current)
	assert.Equal(t, "Season 1", current.Name)
	assert.True(t, current.Active)
}

func TestBattlePassRepository_AddXP(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewBattlePassRepository(db)
	ctx := context.Background()

	// Create season and player
	season := &entity.BattlePassSeason{Name: "S1", Active: true, MaxTier: 50}
	db.Create(season)

	player := &entity.Player{Username: "testplayer", Email: "test@example.com", PasswordHash: "hash"}
	db.Create(player)

	// Add XP
	err := repo.AddXP(ctx, player.ID, season.ID, 500)
	require.NoError(t, err)

	// Verify progress
	progress, err := repo.GetPlayerProgress(ctx, player.ID, season.ID)
	require.NoError(t, err)
	assert.Equal(t, uint(500), progress.XP)
	assert.Equal(t, uint(5), progress.CurrentTier) // 500 XP = tier 5 (100 XP per tier)
}

func TestBattlePassRepository_ClaimReward(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewBattlePassRepository(db)
	ctx := context.Background()

	// Create season, player, progress
	season := &entity.BattlePassSeason{Name: "S1", Active: true, MaxTier: 50}
	db.Create(season)

	player := &entity.Player{Username: "testplayer", Email: "test@example.com", PasswordHash: "hash"}
	db.Create(player)

	progress := &entity.BattlePassProgress{
		PlayerID:    player.ID,
		SeasonID:    season.ID,
		XP:          1000,
		CurrentTier: 10,
	}
	db.Create(progress)

	// Claim reward at tier 5
	err := repo.ClaimReward(ctx, player.ID, season.ID, 5)
	require.NoError(t, err)

	// Verify claimed
	progress, err = repo.GetPlayerProgress(ctx, player.ID, season.ID)
	require.NoError(t, err)
	assert.Contains(t, progress.ClaimedTiers, uint(5))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/infra/database -v -run TestBattlePassRepository`

Expected: FAIL with "undefined: entity.BattlePassSeason"

- [ ] **Step 3: Create Battle Pass entities**

Create `backend/internal/domain/entity/battle_pass.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
	"github.com/lib/pq"
)

// BattlePassSeason represents a season with duration and rewards
type BattlePassSeason struct {
	gorm.Model

	Name      string    `gorm:"not null;uniqueIndex"`
	StartDate time.Time `gorm:"not null"`
	EndDate   time.Time `gorm:"not null"`
	Active    bool      `gorm:"default:false;index"`

	MaxTier uint `gorm:"not null;default:50"` // Max tier in this season
}

// BattlePassProgress tracks player's progress in a season
type BattlePassProgress struct {
	gorm.Model

	PlayerID uint `gorm:"not null;index:idx_player_season"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	SeasonID uint `gorm:"not null;index:idx_player_season"`
	Season   *BattlePassSeason `gorm:"foreignKey:SeasonID"`

	XP          uint `gorm:"not null;default:0"` // Total XP earned
	CurrentTier uint `gorm:"not null;default:0"` // Current tier (calculated from XP)

	// Rewards claimed (tier numbers)
	ClaimedTiers pq.Int64Array `gorm:"type:integer[]"`

	// Premium pass purchased
	PremiumUnlocked bool `gorm:"default:false"`
}

// BattlePassReward defines rewards for each tier
type BattlePassReward struct {
	gorm.Model

	SeasonID uint `gorm:"not null;index:idx_season_tier"`
	Season   *BattlePassSeason `gorm:"foreignKey:SeasonID"`

	Tier uint `gorm:"not null;index:idx_season_tier"` // Tier number (1-50)

	// Reward type: gold, space, nft, cosmetic
	RewardType string `gorm:"not null"`

	// Reward amounts
	GoldAmount  uint64 `gorm:"default:0"`
	SpaceAmount uint64 `gorm:"default:0"`

	// NFT/Cosmetic identifier
	ItemID string

	// Premium only?
	PremiumOnly bool `gorm:"default:false"`
}
```

- [ ] **Step 4: Create BattlePassRepository interface**

Create `backend/internal/domain/repository/battle_pass_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type BattlePassRepository interface {
	// Season management
	GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error)
	GetSeasonByID(ctx context.Context, seasonID uint) (*entity.BattlePassSeason, error)

	// Player progress
	GetPlayerProgress(ctx context.Context, playerID, seasonID uint) (*entity.BattlePassProgress, error)
	AddXP(ctx context.Context, playerID, seasonID uint, xp uint) error

	// Rewards
	GetRewardsForSeason(ctx context.Context, seasonID uint) ([]entity.BattlePassReward, error)
	ClaimReward(ctx context.Context, playerID, seasonID, tier uint) error
}
```

- [ ] **Step 5: Implement BattlePassRepository**

Create `backend/internal/infra/database/battle_pass_repository_impl.go`:

```go
package database

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

const XPPerTier = 100 // XP needed per tier

type battlePassRepository struct {
	db *gorm.DB
}

func NewBattlePassRepository(db *gorm.DB) repository.BattlePassRepository {
	return &battlePassRepository{db: db}
}

func (r *battlePassRepository) GetCurrentSeason(ctx context.Context) (*entity.BattlePassSeason, error) {
	var season entity.BattlePassSeason
	err := r.db.WithContext(ctx).
		Where("active = ?", true).
		First(&season).Error
	return &season, err
}

func (r *battlePassRepository) GetSeasonByID(ctx context.Context, seasonID uint) (*entity.BattlePassSeason, error) {
	var season entity.BattlePassSeason
	err := r.db.WithContext(ctx).First(&season, seasonID).Error
	return &season, err
}

func (r *battlePassRepository) GetPlayerProgress(ctx context.Context, playerID, seasonID uint) (*entity.BattlePassProgress, error) {
	var progress entity.BattlePassProgress
	err := r.db.WithContext(ctx).
		Where("player_id = ? AND season_id = ?", playerID, seasonID).
		First(&progress).Error

	if err == gorm.ErrRecordNotFound {
		// Create new progress
		progress = entity.BattlePassProgress{
			PlayerID: playerID,
			SeasonID: seasonID,
			XP:       0,
			CurrentTier: 0,
			ClaimedTiers: []int64{},
		}
		err = r.db.WithContext(ctx).Create(&progress).Error
	}

	return &progress, err
}

func (r *battlePassRepository) AddXP(ctx context.Context, playerID, seasonID uint, xp uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get or create progress
		var progress entity.BattlePassProgress
		err := tx.Where("player_id = ? AND season_id = ?", playerID, seasonID).
			First(&progress).Error

		if err == gorm.ErrRecordNotFound {
			progress = entity.BattlePassProgress{
				PlayerID: playerID,
				SeasonID: seasonID,
				XP:       xp,
				CurrentTier: xp / XPPerTier,
			}
			return tx.Create(&progress).Error
		}

		if err != nil {
			return err
		}

		// Update XP and tier
		newXP := progress.XP + xp
		newTier := newXP / XPPerTier

		return tx.Model(&progress).Updates(map[string]interface{}{
			"xp":           newXP,
			"current_tier": newTier,
		}).Error
	})
}

func (r *battlePassRepository) GetRewardsForSeason(ctx context.Context, seasonID uint) ([]entity.BattlePassReward, error) {
	var rewards []entity.BattlePassReward
	err := r.db.WithContext(ctx).
		Where("season_id = ?", seasonID).
		Order("tier ASC").
		Find(&rewards).Error
	return rewards, err
}

func (r *battlePassRepository) ClaimReward(ctx context.Context, playerID, seasonID, tier uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var progress entity.BattlePassProgress
		err := tx.Where("player_id = ? AND season_id = ?", playerID, seasonID).
			First(&progress).Error
		if err != nil {
			return err
		}

		// Validate tier reached
		if progress.CurrentTier < tier {
			return fmt.Errorf("tier %d not reached yet (current: %d)", tier, progress.CurrentTier)
		}

		// Check if already claimed
		for _, claimed := range progress.ClaimedTiers {
			if uint(claimed) == tier {
				return fmt.Errorf("tier %d reward already claimed", tier)
			}
		}

		// Add to claimed tiers
		progress.ClaimedTiers = append(progress.ClaimedTiers, int64(tier))

		return tx.Model(&progress).Update("claimed_tiers", progress.ClaimedTiers).Error
	})
}
```

- [ ] **Step 6: Add AutoMigrate for Battle Pass entities**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.BattlePassSeason{},
&entity.BattlePassProgress{},
&entity.BattlePassReward{},
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && go test ./internal/infra/database -v -run TestBattlePassRepository`

Expected: PASS (all 3 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/internal/domain/entity/battle_pass.go \
        backend/internal/domain/repository/battle_pass_repository.go \
        backend/internal/infra/database/battle_pass_repository_impl.go \
        backend/internal/infra/database/battle_pass_repository_impl_test.go \
        backend/internal/infra/database/connection.go
git commit -m "feat(progression): add battle pass entities and repository"
```

---

### Task 2: NFT Entity & Metaplex Integration

**Files:**
- Create: `backend/internal/domain/entity/nft.go`
- Create: `backend/internal/domain/repository/nft_repository.go`
- Create: `backend/internal/infra/database/nft_repository_impl.go`
- Create: `backend/internal/infra/blockchain/metaplex_adapter.go`
- Create: `backend/internal/infra/external/ipfs_client.go`

**Interfaces:**
- Consumes: Solana adapter (from Fase 2), IPFS client
- Produces:
  - `NFTRepository` with methods:
    - `Create(ctx context.Context, nft *entity.NFT) error`
    - `FindByID(ctx context.Context, id uint) (*entity.NFT, error)`
    - `ListByPlayerID(ctx context.Context, playerID uint) ([]entity.NFT, error)`
  - `MetaplexAdapter` with method:
    - `MintNFT(ctx context.Context, metadata NFTMetadata) (string, error)` → mint address
  - `IPFSClient` with methods:
    - `UploadJSON(ctx context.Context, data interface{}) (string, error)` → IPFS URI
    - `UploadImage(ctx context.Context, imageData []byte) (string, error)` → IPFS URI

- [ ] **Step 1: Install Metaplex dependencies**

Run:
```bash
cd backend
go get github.com/gagliardetto/solana-go/programs/token-metadata@latest
```

Expected: Dependencies added to go.mod

- [ ] **Step 2: Create NFT entity**

Create `backend/internal/domain/entity/nft.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// NFT represents a player's NFT (Solana SPL token)
type NFT struct {
	gorm.Model

	PlayerID uint `gorm:"not null;index"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	// NFT metadata
	Name        string `gorm:"not null"`
	Description string
	ImageURL    string `gorm:"not null"` // IPFS URL

	// Rarity: common, rare, epic, legendary
	Rarity string `gorm:"not null;index"`

	// Attributes (JSON stored as string)
	Attributes string `gorm:"type:jsonb"`

	// Solana on-chain data
	MintAddress   string `gorm:"uniqueIndex;not null"` // SPL token mint address
	MetadataURI   string `gorm:"not null"`             // IPFS metadata URI
	TxHash        string `gorm:"index"`                // Mint transaction hash

	// Minting status
	Status    string `gorm:"not null;default:'pending'"` // pending, minted, failed
	MintedAt  *time.Time
	FailedAt  *time.Time
	ErrorMsg  string
}
```

- [ ] **Step 3: Create IPFS client**

Create `backend/internal/infra/external/ipfs_client.go`:

```go
package external

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type IPFSClient struct {
	apiURL    string // e.g., https://api.pinata.cloud
	apiKey    string
	apiSecret string
	client    *http.Client
}

func NewIPFSClient(apiURL, apiKey, apiSecret string) *IPFSClient {
	return &IPFSClient{
		apiURL:    apiURL,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type PinataResponse struct {
	IpfsHash string `json:"IpfsHash"`
}

func (c *IPFSClient) UploadJSON(ctx context.Context, data interface{}) (string, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL+"/pinning/pinJSONToIPFS", bytes.NewReader(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("IPFS upload failed: %s", string(body))
	}

	var pinataResp PinataResponse
	if err := json.NewDecoder(resp.Body).Decode(&pinataResp); err != nil {
		return "", err
	}

	return "ipfs://" + pinataResp.IpfsHash, nil
}

func (c *IPFSClient) UploadImage(ctx context.Context, imageData []byte) (string, error) {
	// Similar to UploadJSON but uses pinFileToIPFS endpoint
	// Implementation simplified for plan
	return "ipfs://QmExample123", nil
}
```

- [ ] **Step 4: Create Metaplex adapter**

Create `backend/internal/infra/blockchain/metaplex_adapter.go`:

```go
package blockchain

import (
	"context"
	"errors"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

type NFTMetadata struct {
	Name        string
	Symbol      string
	URI         string // IPFS metadata URI
	SellerFee   uint16 // Basis points (e.g., 500 = 5%)
	Creators    []Creator
}

type Creator struct {
	Address  solana.PublicKey
	Verified bool
	Share    uint8 // Percentage (0-100)
}

type MetaplexAdapter struct {
	client       *rpc.Client
	treasuryKey  solana.PrivateKey
}

func NewMetaplexAdapter(client *rpc.Client, treasuryKey solana.PrivateKey) *MetaplexAdapter {
	return &MetaplexAdapter{
		client:      client,
		treasuryKey: treasuryKey,
	}
}

func (a *MetaplexAdapter) MintNFT(ctx context.Context, recipientWallet string, metadata NFTMetadata) (string, error) {
	if a.treasuryKey.IsZero() {
		return "", errors.New("treasury key not configured")
	}

	recipient, err := solana.PublicKeyFromBase58(recipientWallet)
	if err != nil {
		return "", err
	}

	// Simplified: Real implementation would use Metaplex SDK
	// to create mint account, token account, and metadata account
	// For now, return placeholder
	_ = recipient
	_ = metadata

	return "MintAddress1111111111111111111111111111111", nil
}
```

- [ ] **Step 5: Create NFTRepository**

Create `backend/internal/domain/repository/nft_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type NFTRepository interface {
	Create(ctx context.Context, nft *entity.NFT) error
	FindByID(ctx context.Context, id uint) (*entity.NFT, error)
	FindByMintAddress(ctx context.Context, mintAddress string) (*entity.NFT, error)
	ListByPlayerID(ctx context.Context, playerID uint) ([]entity.NFT, error)
	UpdateStatus(ctx context.Context, id uint, status, mintAddress, txHash string) error
}
```

Create `backend/internal/infra/database/nft_repository_impl.go`:

```go
package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type nftRepository struct {
	db *gorm.DB
}

func NewNFTRepository(db *gorm.DB) repository.NFTRepository {
	return &nftRepository{db: db}
}

func (r *nftRepository) Create(ctx context.Context, nft *entity.NFT) error {
	return r.db.WithContext(ctx).Create(nft).Error
}

func (r *nftRepository) FindByID(ctx context.Context, id uint) (*entity.NFT, error) {
	var nft entity.NFT
	err := r.db.WithContext(ctx).
		Preload("Player").
		First(&nft, id).Error
	return &nft, err
}

func (r *nftRepository) FindByMintAddress(ctx context.Context, mintAddress string) (*entity.NFT, error) {
	var nft entity.NFT
	err := r.db.WithContext(ctx).
		Where("mint_address = ?", mintAddress).
		First(&nft).Error
	return &nft, err
}

func (r *nftRepository) ListByPlayerID(ctx context.Context, playerID uint) ([]entity.NFT, error) {
	var nfts []entity.NFT
	err := r.db.WithContext(ctx).
		Where("player_id = ?", playerID).
		Order("created_at DESC").
		Find(&nfts).Error
	return nfts, err
}

func (r *nftRepository) UpdateStatus(ctx context.Context, id uint, status, mintAddress, txHash string) error {
	updates := map[string]interface{}{
		"status":       status,
		"mint_address": mintAddress,
		"tx_hash":      txHash,
	}

	if status == "minted" {
		now := time.Now()
		updates["minted_at"] = &now
	} else if status == "failed" {
		now := time.Now()
		updates["failed_at"] = &now
	}

	return r.db.WithContext(ctx).
		Model(&entity.NFT{}).
		Where("id = ?", id).
		Updates(updates).Error
}
```

- [ ] **Step 6: Add AutoMigrate for NFT**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.NFT{},
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/nft.go \
        backend/internal/domain/repository/nft_repository.go \
        backend/internal/infra/database/nft_repository_impl.go \
        backend/internal/infra/blockchain/metaplex_adapter.go \
        backend/internal/infra/external/ipfs_client.go \
        backend/internal/infra/database/connection.go \
        backend/go.mod \
        backend/go.sum
git commit -m "feat(progression): add NFT entity, Metaplex adapter, and IPFS client"
```

---

### Task 3: Achievement System

**Files:**
- Create: `backend/internal/domain/entity/achievement.go`
- Create: `backend/internal/domain/repository/achievement_repository.go`
- Create: `backend/internal/infra/database/achievement_repository_impl.go`
- Create: `backend/internal/domain/service/achievement_service.go`
- Create: `backend/scripts/seed_achievements.sql`

**Interfaces:**
- Consumes: PlayerRepository, EventBus (RabbitMQ)
- Produces:
  - `AchievementRepository` with methods:
    - `ListAll(ctx context.Context) ([]entity.Achievement, error)`
    - `GetPlayerAchievements(ctx context.Context, playerID uint) ([]entity.PlayerAchievement, error)`
    - `UnlockAchievement(ctx context.Context, playerID, achievementID uint) error`
  - `AchievementService` with method:
    - `CheckAndUnlock(ctx context.Context, playerID uint, eventType string, value int) error`

- [ ] **Step 1: Create Achievement entities**

Create `backend/internal/domain/entity/achievement.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// Achievement definition (global)
type Achievement struct {
	gorm.Model

	Code        string `gorm:"uniqueIndex;not null"` // e.g., FIRST_KILL, HIGH_SCORER_100K
	Name        string `gorm:"not null"`
	Description string

	// Unlock criteria
	Criteria string `gorm:"not null"` // e.g., total_kills >= 100, high_score >= 100000

	// Reward
	GoldReward  uint64 `gorm:"default:0"`
	SpaceReward uint64 `gorm:"default:0"`

	// Icon/Badge
	IconURL string

	// Rarity: common, rare, epic, legendary
	Rarity string `gorm:"not null;default:'common'"`
}

// PlayerAchievement tracks unlocked achievements per player
type PlayerAchievement struct {
	gorm.Model

	PlayerID uint `gorm:"not null;index:idx_player_achievement"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	AchievementID uint `gorm:"not null;index:idx_player_achievement"`
	Achievement   *Achievement `gorm:"foreignKey:AchievementID"`

	UnlockedAt time.Time `gorm:"not null"`

	// Progress tracking (for partial achievements)
	Progress      int `gorm:"default:0"`
	ProgressMax   int `gorm:"default:100"`
}
```

- [ ] **Step 2: Create AchievementRepository**

Create `backend/internal/domain/repository/achievement_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type AchievementRepository interface {
	// Achievement definitions
	ListAll(ctx context.Context) ([]entity.Achievement, error)
	FindByCode(ctx context.Context, code string) (*entity.Achievement, error)

	// Player achievements
	GetPlayerAchievements(ctx context.Context, playerID uint) ([]entity.PlayerAchievement, error)
	UnlockAchievement(ctx context.Context, playerID, achievementID uint) error
	HasUnlocked(ctx context.Context, playerID, achievementID uint) (bool, error)
}
```

Create implementation `backend/internal/infra/database/achievement_repository_impl.go`:

```go
package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type achievementRepository struct {
	db *gorm.DB
}

func NewAchievementRepository(db *gorm.DB) repository.AchievementRepository {
	return &achievementRepository{db: db}
}

func (r *achievementRepository) ListAll(ctx context.Context) ([]entity.Achievement, error) {
	var achievements []entity.Achievement
	err := r.db.WithContext(ctx).Find(&achievements).Error
	return achievements, err
}

func (r *achievementRepository) FindByCode(ctx context.Context, code string) (*entity.Achievement, error) {
	var achievement entity.Achievement
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&achievement).Error
	return &achievement, err
}

func (r *achievementRepository) GetPlayerAchievements(ctx context.Context, playerID uint) ([]entity.PlayerAchievement, error) {
	var playerAchievements []entity.PlayerAchievement
	err := r.db.WithContext(ctx).
		Preload("Achievement").
		Where("player_id = ?", playerID).
		Order("unlocked_at DESC").
		Find(&playerAchievements).Error
	return playerAchievements, err
}

func (r *achievementRepository) UnlockAchievement(ctx context.Context, playerID, achievementID uint) error {
	// Check if already unlocked
	var count int64
	r.db.WithContext(ctx).
		Model(&entity.PlayerAchievement{}).
		Where("player_id = ? AND achievement_id = ?", playerID, achievementID).
		Count(&count)

	if count > 0 {
		return nil // Already unlocked
	}

	playerAchievement := &entity.PlayerAchievement{
		PlayerID:      playerID,
		AchievementID: achievementID,
		UnlockedAt:    time.Now(),
		Progress:      100,
		ProgressMax:   100,
	}

	return r.db.WithContext(ctx).Create(playerAchievement).Error
}

func (r *achievementRepository) HasUnlocked(ctx context.Context, playerID, achievementID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&entity.PlayerAchievement{}).
		Where("player_id = ? AND achievement_id = ?", playerID, achievementID).
		Count(&count).Error
	return count > 0, err
}
```

- [ ] **Step 3: Create AchievementService**

Create `backend/internal/domain/service/achievement_service.go`:

```go
package service

import (
	"context"
	"fmt"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type AchievementService struct {
	achievementRepo repository.AchievementRepository
	playerRepo      repository.PlayerRepository
}

func NewAchievementService(
	achievementRepo repository.AchievementRepository,
	playerRepo repository.PlayerRepository,
) *AchievementService {
	return &AchievementService{
		achievementRepo: achievementRepo,
		playerRepo:      playerRepo,
	}
}

// CheckAndUnlock checks if player qualifies for achievements and unlocks them
func (s *AchievementService) CheckAndUnlock(ctx context.Context, playerID uint, eventType string, value int) error {
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return fmt.Errorf("failed to get player: %w", err)
	}

	achievements, err := s.achievementRepo.ListAll(ctx)
	if err != nil {
		return fmt.Errorf("failed to list achievements: %w", err)
	}

	// Check each achievement's criteria
	for _, achievement := range achievements {
		unlocked, err := s.achievementRepo.HasUnlocked(ctx, playerID, achievement.ID)
		if err != nil || unlocked {
			continue
		}

		// Simple criteria check (can be expanded with expression parser)
		shouldUnlock := false

		switch achievement.Code {
		case "FIRST_GAME":
			shouldUnlock = player.TotalGames >= 1
		case "GAMES_10":
			shouldUnlock = player.TotalGames >= 10
		case "GAMES_100":
			shouldUnlock = player.TotalGames >= 100
		case "HIGH_SCORE_10K":
			shouldUnlock = player.HighScore >= 10000
		case "HIGH_SCORE_100K":
			shouldUnlock = player.HighScore >= 100000
		case "GOLD_COLLECTOR_1K":
			shouldUnlock = player.GoldBalance >= 1000
		}

		if shouldUnlock {
			err = s.achievementRepo.UnlockAchievement(ctx, playerID, achievement.ID)
			if err != nil {
				return fmt.Errorf("failed to unlock achievement: %w", err)
			}

			// Grant rewards
			if achievement.GoldReward > 0 {
				_ = s.playerRepo.UpdateGoldBalance(ctx, playerID, int64(achievement.GoldReward))
			}
			if achievement.SpaceReward > 0 {
				_ = s.playerRepo.UpdateSpaceBalance(ctx, playerID, int64(achievement.SpaceReward))
			}
		}
	}

	return nil
}

func (s *AchievementService) GetPlayerAchievements(ctx context.Context, playerID uint) ([]entity.PlayerAchievement, error) {
	return s.achievementRepo.GetPlayerAchievements(ctx, playerID)
}
```

- [ ] **Step 4: Create seed data for achievements**

Create `backend/scripts/seed_achievements.sql`:

```sql
-- Seed common achievements
INSERT INTO achievements (code, name, description, criteria, gold_reward, space_reward, rarity, created_at, updated_at) VALUES
('FIRST_GAME', 'First Steps', 'Play your first game', 'total_games >= 1', 100, 0, 'common', NOW(), NOW()),
('GAMES_10', 'Getting Started', 'Play 10 games', 'total_games >= 10', 500, 0, 'common', NOW(), NOW()),
('GAMES_100', 'Veteran', 'Play 100 games', 'total_games >= 100', 5000, 50000000000, 'rare', NOW(), NOW()),
('HIGH_SCORE_10K', 'Rising Star', 'Reach 10,000 points', 'high_score >= 10000', 200, 0, 'common', NOW(), NOW()),
('HIGH_SCORE_100K', 'Space Master', 'Reach 100,000 points', 'high_score >= 100000', 2000, 20000000000, 'epic', NOW(), NOW()),
('GOLD_COLLECTOR_1K', 'Gold Hoarder', 'Accumulate 1,000 Gold', 'gold_balance >= 1000', 0, 10000000000, 'rare', NOW(), NOW());
```

- [ ] **Step 5: Add AutoMigrate and run seed**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.Achievement{},
&entity.PlayerAchievement{},
```

Run seed:
```bash
cd backend
psql $DATABASE_URL < scripts/seed_achievements.sql
```

Expected: 6 achievements inserted

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/achievement.go \
        backend/internal/domain/repository/achievement_repository.go \
        backend/internal/infra/database/achievement_repository_impl.go \
        backend/internal/domain/service/achievement_service.go \
        backend/scripts/seed_achievements.sql \
        backend/internal/infra/database/connection.go
git commit -m "feat(progression): add achievement system with seed data"
```

---

## Remaining Tasks (Outline)

### Task 4: League Ranking System
- **Goal:** Automatic promotion/demotion based on rank points
- **Files:** `domain/service/league_service.go`, league update cron job
- **Logic:** Weekly league rotation, top 20% promote, bottom 20% demote

### Task 5: Special Events System
- **Goal:** Time-limited events with special rewards
- **Files:** `domain/entity/special_event.go`, `service/event_service.go`
- **Events:** Double XP weekends, Bonus Gold days, Exclusive NFT drops

### Task 6: Battle Pass Service
- **Goal:** XP gain after each game, tier progression, reward claiming
- **Files:** `domain/service/battle_pass_service.go`, tests
- **Methods:** AddXPAfterGame(), ClaimReward(), GetProgress()

### Task 7: NFT Minting Service
- **Goal:** Mint NFTs as Battle Pass rewards or event prizes
- **Files:** `domain/service/nft_service.go`, async worker
- **Flow:** Create NFT record → Upload metadata to IPFS → Mint via Metaplex → Update status

### Task 8: HTTP Controllers - Battle Pass
- **Files:** `app/http/controller/battle_pass_controller.go`
- **Endpoints:**
  - GET /api/battlepass/current (current season)
  - GET /api/battlepass/progress (player progress)
  - POST /api/battlepass/claim/:tier (claim reward)
  - POST /api/battlepass/premium (unlock premium)

### Task 9: HTTP Controllers - Achievements
- **Files:** `app/http/controller/achievement_controller.go`
- **Endpoints:**
  - GET /api/achievements (all achievements)
  - GET /api/achievements/unlocked (player's unlocked)
  - GET /api/achievements/progress (progress on partial)

### Task 10: HTTP Controllers - NFTs
- **Files:** `app/http/controller/nft_controller.go`
- **Endpoints:**
  - GET /api/nfts (player's NFTs)
  - GET /api/nfts/:id (NFT details)
  - POST /api/nfts/mint (trigger NFT mint)

### Task 11: HTTP Controllers - Leagues
- **Files:** `app/http/controller/league_controller.go`
- **Endpoints:**
  - GET /api/leagues (all leagues)
  - GET /api/leagues/:id/leaderboard (top 100 players)
  - GET /api/leagues/my-rank (player's current rank)

### Task 12: Frontend - Battle Pass UI
- **Files:** `frontend/src/views/BattlePassView.vue`, `stores/battlePassStore.ts`
- **UI:** Tier progression bar, rewards grid, claim buttons, premium unlock

### Task 13: Frontend - Achievements UI
- **Files:** `frontend/src/views/AchievementsView.vue`, `stores/achievementStore.ts`
- **UI:** Achievement grid, progress bars, unlock notifications

### Task 14: Frontend - NFT Gallery
- **Files:** `frontend/src/views/NFTGalleryView.vue`, `stores/nftStore.ts`
- **UI:** NFT cards with rarity badges, detail modal, collection stats

### Task 15: Frontend - Leaderboard UI
- **Files:** `frontend/src/views/LeaderboardView.vue`, `stores/leaderboardStore.ts`
- **UI:** League tabs, top 100 table, player rank highlight

### Task 16: Battle Pass Season Transition Worker
- **Files:** `cmd/workers/season_transition_worker.go`
- **Schedule:** Triggered when season ends
- **Logic:** Deactivate old season, create new season, reset player progress

### Task 17: League Rotation Cron Job
- **Files:** `cmd/workers/league_rotation_cron.go`
- **Schedule:** Weekly on Sunday 23:59 UTC
- **Logic:** Calculate rank changes, promote/demote players, update leagues

### Task 18: Achievement Unlock Event Handler
- **Files:** `events/handler/achievement_unlock_handler.go`
- **Trigger:** After game end, gold earned, high score update
- **Logic:** Listen to events, call AchievementService.CheckAndUnlock()

### Task 19: NFT Metadata Templates
- **Files:** `backend/templates/nft_metadata.json`
- **Templates:** Common, Rare, Epic, Legendary NFT JSON schemas
- **Attributes:** Power, Speed, Luck, Special Effect

### Task 20: Rarity Distribution Service
- **Goal:** Randomized rarity selection (60% Common, 30% Rare, 9% Epic, 1% Legendary)
- **Files:** `domain/service/rarity_service.go`
- **Method:** GetRandomRarity() → string

### Task 21: Battle Pass Rewards Seed Data
- **Files:** `scripts/seed_battlepass_rewards.sql`
- **Data:** 50 tiers with Gold, SPACE, NFTs, cosmetics

### Task 22: Redis Leaderboard Cache
- **Files:** `infra/cache/leaderboard_cache.go`
- **Structure:** Redis sorted sets for each league
- **TTL:** 5 minutes

### Task 23: E2E Tests - Battle Pass Flow
- **Files:** `test/e2e/battlepass_flow_test.go`
- **Scenario:** Play games → Gain XP → Reach tier 10 → Claim reward

### Task 24: E2E Tests - Achievement Unlock
- **Files:** `test/e2e/achievement_flow_test.go`
- **Scenario:** Play first game → FIRST_GAME unlocked → Gold reward credited

### Task 25: E2E Tests - NFT Minting
- **Files:** `test/e2e/nft_mint_flow_test.go`
- **Scenario:** Reach tier 50 → Trigger NFT mint → Verify on-chain

### Task 26: Documentation - Progression API
- **Files:** `docs/api/progression.md`
- **Sections:** Battle Pass, Achievements, NFTs, Leagues

### Task 27: Documentation - NFT Metadata Schema
- **Files:** `docs/nft_metadata_spec.md`
- **Spec:** Metaplex standard, IPFS structure, attributes format

### Task 28: Monitoring - Progression Metrics
- **Files:** `pkg/metrics/progression_metrics.go`
- **Metrics:** xp_gained_total, achievements_unlocked_total, nfts_minted_total

### Task 29: Integration Tests - Metaplex
- **Files:** `test/integration/metaplex_test.go`
- **Tests:** Mint NFT on devnet, verify metadata URI

### Task 30: Performance Tests - Leaderboard
- **Files:** `test/performance/leaderboard_load_test.go`
- **Goal:** 1000 requests/sec to leaderboard endpoint

### Task 31: Admin Panel - Season Management
- **Files:** `frontend/src/views/admin/SeasonsView.vue`
- **Features:** Create season, end season, view stats

### Task 32: Admin Panel - Achievement Editor
- **Files:** `frontend/src/views/admin/AchievementsView.vue`
- **Features:** Create achievement, edit criteria, set rewards

### Task 33: Admin Panel - NFT Management
- **Files:** `frontend/src/views/admin/NFTsView.vue`
- **Features:** View all minted NFTs, retry failed mints

### Task 34: Notification System - Unlocks
- **Files:** `frontend/src/components/UnlockNotification.vue`
- **Trigger:** Achievement unlocked, tier reached, NFT minted
- **UI:** Toast notification with animation

### Task 35: Analytics Events - Progression
- **Files:** `infra/analytics/progression_events.go`
- **Events:** tier_reached, achievement_unlocked, nft_minted
- **Integration:** Send to Google Analytics or Mixpanel

---

## Validation Checkpoints

After completing Fase 3, validate:

- [ ] Battle Pass XP progression funcionando (gain XP after games)
- [ ] Achievements unlocking automaticamente baseado em critérios
- [ ] NFT mint via Solana Metaplex funcionando (devnet)
- [ ] IPFS metadata upload funcionando (Pinata)
- [ ] Leagues leaderboard exibindo corretamente
- [ ] Season transition worker funcionando (create new season, reset progress)
- [ ] Frontend Battle Pass UI completa (tiers, rewards, claim)
- [ ] E2E tests passando (battlepass, achievements, nft mint)

---

## Next Phase

→ [Fase 4: Social & PvP](./fase-4-social-pvp.md) - Guilds, SPACE locking, PvP 1v1 migration
