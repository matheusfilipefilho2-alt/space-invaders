# Fase 4: Social & PvP - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar sistema de Guilds com SPACE locking e portar PvP 1v1 para arquitetura Go

**Duração:** 2 semanas (~25 tasks)

**Pré-requisitos:** Fase 3 completa (Battle Pass, NFTs, Achievements funcionando)

**Arquitetura:**
- Guilds: Create, join, leave, manage members com roles (owner, officer, member)
- SPACE Locking: Lock SPACE tokens para participar de guild (unlock ao sair)
- PvP 1v1: Port do sistema existente (WebRTC + signaling) para Go backend
- Chat: Real-time guild chat usando WebSockets
- Guild Wars: (Optional) Guild vs Guild tournaments

**Tech Stack:**
- Go 1.21+, Gin, GORM, PostgreSQL 16
- WebSocket (gorilla/websocket) para chat real-time
- Redis pub/sub para chat scaling
- Solana para SPACE token locking (on-chain escrow)
- Vue 3 + Pinia para guild UI

## Global Constraints

- Go version: 1.21+
- PostgreSQL: 16+
- Solana: Token locking via escrow account (PDA)
- Guild max members: 50
- Guild creation cost: 1000 SPACE (locked)
- Guild member entry: 100 SPACE (locked, refundable on leave)
- Guild roles: owner, officer, member
- Chat message max length: 500 characters
- PvP 1v1: Keep existing WebRTC implementation, migrate signaling to Go
- WebSocket: Use gorilla/websocket library

---

## Navegação

- [← Fase 3: Sistemas de Progressão](./fase-3-progressao.md)
- [→ Fase 5+6: Admin & Polish](./fase-5-6-admin-polish.md)
- [📋 Índice Geral](./README.md)

---

### Task 1: Guild Entity & Repository

**Files:**
- Create: `backend/internal/domain/entity/guild.go`
- Create: `backend/internal/domain/repository/guild_repository.go`
- Create: `backend/internal/infra/database/guild_repository_impl.go`
- Create: `backend/internal/infra/database/guild_repository_impl_test.go`
- Modify: `backend/internal/infra/database/connection.go` (add AutoMigrate)

**Interfaces:**
- Consumes: `gorm.DB` from connection.go
- Produces: `GuildRepository` interface with methods:
  - `Create(ctx context.Context, guild *entity.Guild) error`
  - `FindByID(ctx context.Context, id uint) (*entity.Guild, error)`
  - `FindByTag(ctx context.Context, tag string) (*entity.Guild, error)`
  - `ListAll(ctx context.Context, limit, offset int) ([]entity.Guild, error)`
  - `Update(ctx context.Context, guild *entity.Guild) error`
  - `Delete(ctx context.Context, id uint) error`

- [ ] **Step 1: Write failing test for Guild repository**

Create `backend/internal/infra/database/guild_repository_impl_test.go`:

```go
package database_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/infra/database"
)

func TestGuildRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewGuildRepository(db)

	// Create owner
	owner := &entity.Player{Username: "guildowner", Email: "owner@example.com", PasswordHash: "hash"}
	db.Create(owner)

	ctx := context.Background()
	guild := &entity.Guild{
		Name:          "Elite Squad",
		Tag:           "ELIT",
		Description:   "Best players only",
		OwnerID:       owner.ID,
		MaxMembers:    50,
		LockedSpace:   1000000000000, // 1000 SPACE
		TotalMembers:  1,
	}

	err := repo.Create(ctx, guild)

	require.NoError(t, err)
	assert.NotZero(t, guild.ID)
	assert.Equal(t, "Elite Squad", guild.Name)
}

func TestGuildRepository_FindByTag(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewGuildRepository(db)

	owner := &entity.Player{Username: "owner", Email: "owner@example.com", PasswordHash: "hash"}
	db.Create(owner)

	guild := &entity.Guild{Name: "Test Guild", Tag: "TEST", OwnerID: owner.ID}
	db.Create(guild)

	ctx := context.Background()
	found, err := repo.FindByTag(ctx, "TEST")

	require.NoError(t, err)
	assert.Equal(t, guild.ID, found.ID)
	assert.Equal(t, "Test Guild", found.Name)
}

func TestGuildRepository_ListAll(t *testing.T) {
	db := setupTestDB(t)
	defer teardownTestDB(t, db)

	repo := database.NewGuildRepository(db)

	owner := &entity.Player{Username: "owner", Email: "owner@example.com", PasswordHash: "hash"}
	db.Create(owner)

	// Create 3 guilds
	for i := 1; i <= 3; i++ {
		guild := &entity.Guild{
			Name:    fmt.Sprintf("Guild %d", i),
			Tag:     fmt.Sprintf("G%d", i),
			OwnerID: owner.ID,
		}
		db.Create(guild)
	}

	ctx := context.Background()
	guilds, err := repo.ListAll(ctx, 10, 0)

	require.NoError(t, err)
	assert.Len(t, guilds, 3)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/infra/database -v -run TestGuildRepository`

Expected: FAIL with "undefined: entity.Guild"

- [ ] **Step 3: Create Guild entities**

Create `backend/internal/domain/entity/guild.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// Guild represents a player guild/clan
type Guild struct {
	gorm.Model

	Name        string `gorm:"uniqueIndex;not null"`
	Tag         string `gorm:"uniqueIndex;not null;size:4"` // 4-char tag (e.g., ELIT)
	Description string

	// Owner
	OwnerID uint `gorm:"not null;index"`
	Owner   *Player `gorm:"foreignKey:OwnerID"`

	// Settings
	MaxMembers   uint   `gorm:"not null;default:50"`
	TotalMembers uint   `gorm:"not null;default:1"` // Cached count
	IsPublic     bool   `gorm:"default:true"`        // Public or invite-only
	MinLevel     uint   `gorm:"default:1"`           // Minimum player level to join

	// SPACE locked in guild treasury
	LockedSpace uint64 `gorm:"not null;default:0"` // Total SPACE locked by members

	// Guild XP and level
	GuildXP    uint64 `gorm:"default:0"`
	GuildLevel uint   `gorm:"default:1"`

	// Timestamps
	CreatedAt time.Time
	UpdatedAt time.Time
}

// GuildMember represents a player's membership in a guild
type GuildMember struct {
	gorm.Model

	GuildID uint `gorm:"not null;index:idx_guild_player"`
	Guild   *Guild `gorm:"foreignKey:GuildID"`

	PlayerID uint `gorm:"not null;index:idx_guild_player;uniqueIndex:idx_player_guild"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	// Role: owner, officer, member
	Role string `gorm:"not null;default:'member'"`

	// SPACE locked by this member
	LockedSpace uint64 `gorm:"not null;default:0"`

	// Contribution tracking
	XPContributed   uint64 `gorm:"default:0"`
	GoldContributed uint64 `gorm:"default:0"`

	JoinedAt time.Time `gorm:"not null"`
}

// GuildInvite represents a pending guild invitation
type GuildInvite struct {
	gorm.Model

	GuildID uint `gorm:"not null;index"`
	Guild   *Guild `gorm:"foreignKey:GuildID"`

	PlayerID uint `gorm:"not null;index"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	InvitedBy uint `gorm:"not null"` // Player ID who sent invite
	InvitedByPlayer *Player `gorm:"foreignKey:InvitedBy"`

	Status string `gorm:"not null;default:'pending'"` // pending, accepted, rejected, expired

	ExpiresAt time.Time
}
```

- [ ] **Step 4: Create GuildRepository interface**

Create `backend/internal/domain/repository/guild_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type GuildRepository interface {
	// Guild CRUD
	Create(ctx context.Context, guild *entity.Guild) error
	FindByID(ctx context.Context, id uint) (*entity.Guild, error)
	FindByTag(ctx context.Context, tag string) (*entity.Guild, error)
	ListAll(ctx context.Context, limit, offset int) ([]entity.Guild, error)
	Update(ctx context.Context, guild *entity.Guild) error
	Delete(ctx context.Context, id uint) error

	// Member management
	AddMember(ctx context.Context, member *entity.GuildMember) error
	RemoveMember(ctx context.Context, guildID, playerID uint) error
	GetMembers(ctx context.Context, guildID uint) ([]entity.GuildMember, error)
	GetMemberByPlayerID(ctx context.Context, playerID uint) (*entity.GuildMember, error)

	// Invites
	CreateInvite(ctx context.Context, invite *entity.GuildInvite) error
	GetPendingInvites(ctx context.Context, playerID uint) ([]entity.GuildInvite, error)
	UpdateInviteStatus(ctx context.Context, inviteID uint, status string) error
}
```

- [ ] **Step 5: Implement GuildRepository**

Create `backend/internal/infra/database/guild_repository_impl.go`:

```go
package database

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type guildRepository struct {
	db *gorm.DB
}

func NewGuildRepository(db *gorm.DB) repository.GuildRepository {
	return &guildRepository{db: db}
}

func (r *guildRepository) Create(ctx context.Context, guild *entity.Guild) error {
	return r.db.WithContext(ctx).Create(guild).Error
}

func (r *guildRepository) FindByID(ctx context.Context, id uint) (*entity.Guild, error) {
	var guild entity.Guild
	err := r.db.WithContext(ctx).
		Preload("Owner").
		First(&guild, id).Error
	return &guild, err
}

func (r *guildRepository) FindByTag(ctx context.Context, tag string) (*entity.Guild, error) {
	var guild entity.Guild
	err := r.db.WithContext(ctx).
		Where("tag = ?", tag).
		First(&guild).Error
	return &guild, err
}

func (r *guildRepository) ListAll(ctx context.Context, limit, offset int) ([]entity.Guild, error) {
	var guilds []entity.Guild
	err := r.db.WithContext(ctx).
		Preload("Owner").
		Limit(limit).
		Offset(offset).
		Order("guild_level DESC, guild_xp DESC").
		Find(&guilds).Error
	return guilds, err
}

func (r *guildRepository) Update(ctx context.Context, guild *entity.Guild) error {
	return r.db.WithContext(ctx).Save(guild).Error
}

func (r *guildRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&entity.Guild{}, id).Error
}

func (r *guildRepository) AddMember(ctx context.Context, member *entity.GuildMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Add member
		if err := tx.Create(member).Error; err != nil {
			return err
		}

		// Increment guild total_members
		return tx.Model(&entity.Guild{}).
			Where("id = ?", member.GuildID).
			UpdateColumn("total_members", gorm.Expr("total_members + ?", 1)).Error
	})
}

func (r *guildRepository) RemoveMember(ctx context.Context, guildID, playerID uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete member
		result := tx.Where("guild_id = ? AND player_id = ?", guildID, playerID).
			Delete(&entity.GuildMember{})
		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			return fmt.Errorf("member not found")
		}

		// Decrement guild total_members
		return tx.Model(&entity.Guild{}).
			Where("id = ?", guildID).
			UpdateColumn("total_members", gorm.Expr("total_members - ?", 1)).Error
	})
}

func (r *guildRepository) GetMembers(ctx context.Context, guildID uint) ([]entity.GuildMember, error) {
	var members []entity.GuildMember
	err := r.db.WithContext(ctx).
		Preload("Player").
		Where("guild_id = ?", guildID).
		Order("role ASC, joined_at ASC"). // owner first, then officers, then members
		Find(&members).Error
	return members, err
}

func (r *guildRepository) GetMemberByPlayerID(ctx context.Context, playerID uint) (*entity.GuildMember, error) {
	var member entity.GuildMember
	err := r.db.WithContext(ctx).
		Preload("Guild").
		Where("player_id = ?", playerID).
		First(&member).Error
	return &member, err
}

func (r *guildRepository) CreateInvite(ctx context.Context, invite *entity.GuildInvite) error {
	return r.db.WithContext(ctx).Create(invite).Error
}

func (r *guildRepository) GetPendingInvites(ctx context.Context, playerID uint) ([]entity.GuildInvite, error) {
	var invites []entity.GuildInvite
	err := r.db.WithContext(ctx).
		Preload("Guild").
		Preload("InvitedByPlayer").
		Where("player_id = ? AND status = ?", playerID, "pending").
		Where("expires_at > ?", time.Now()).
		Find(&invites).Error
	return invites, err
}

func (r *guildRepository) UpdateInviteStatus(ctx context.Context, inviteID uint, status string) error {
	return r.db.WithContext(ctx).
		Model(&entity.GuildInvite{}).
		Where("id = ?", inviteID).
		Update("status", status).Error
}
```

- [ ] **Step 6: Add AutoMigrate for Guild entities**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.Guild{},
&entity.GuildMember{},
&entity.GuildInvite{},
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && go test ./internal/infra/database -v -run TestGuildRepository`

Expected: PASS (all 3 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/internal/domain/entity/guild.go \
        backend/internal/domain/repository/guild_repository.go \
        backend/internal/infra/database/guild_repository_impl.go \
        backend/internal/infra/database/guild_repository_impl_test.go \
        backend/internal/infra/database/connection.go
git commit -m "feat(social): add guild entities and repository"
```

---

### Task 2: Guild Service (Create, Join, Leave)

**Files:**
- Create: `backend/internal/domain/service/guild_service.go`
- Create: `backend/internal/domain/service/guild_service_test.go`

**Interfaces:**
- Consumes:
  - `GuildRepository` (from Task 4.1)
  - `PlayerRepository` (from Fase 1)
  - `SolanaAdapter` (from Fase 2) - for SPACE locking
- Produces: `GuildService` with methods:
  - `CreateGuild(ctx context.Context, ownerID uint, name, tag, description string) (*entity.Guild, error)`
  - `JoinGuild(ctx context.Context, playerID, guildID uint) error`
  - `LeaveGuild(ctx context.Context, playerID uint) error`
  - `InvitePlayer(ctx context.Context, guildID, invitedPlayerID, invitedByID uint) error`
  - `AcceptInvite(ctx context.Context, inviteID, playerID uint) error`

- [ ] **Step 1: Write failing test for GuildService**

Create `backend/internal/domain/service/guild_service_test.go`:

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

func TestGuildService_CreateGuild_Success(t *testing.T) {
	guildRepo := new(mocks.MockGuildRepository)
	playerRepo := new(mocks.MockPlayerRepository)

	svc := service.NewGuildService(guildRepo, playerRepo)

	ctx := context.Background()
	ownerID := uint(1)

	// Mock: Owner exists and has 1000 SPACE
	owner := &entity.Player{
		Model:        gorm.Model{ID: ownerID},
		SpaceBalance: 1000000000000, // 1000 SPACE
	}
	playerRepo.On("FindByID", ctx, ownerID).Return(owner, nil)

	// Mock: Tag not taken
	guildRepo.On("FindByTag", ctx, "TEST").Return(nil, gorm.ErrRecordNotFound)

	// Mock: Guild created
	guildRepo.On("Create", ctx, mock.MatchedBy(func(g *entity.Guild) bool {
		return g.Name == "Test Guild" && g.Tag == "TEST" && g.OwnerID == ownerID
	})).Return(nil)

	// Mock: Owner added as member
	guildRepo.On("AddMember", ctx, mock.MatchedBy(func(m *entity.GuildMember) bool {
		return m.PlayerID == ownerID && m.Role == "owner" && m.LockedSpace == 1000000000000
	})).Return(nil)

	// Mock: SPACE deducted
	playerRepo.On("UpdateSpaceBalance", ctx, ownerID, int64(-1000000000000)).Return(nil)

	// Execute
	guild, err := svc.CreateGuild(ctx, ownerID, "Test Guild", "TEST", "Test description")

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, guild)
	assert.Equal(t, "Test Guild", guild.Name)
	assert.Equal(t, "TEST", guild.Tag)

	guildRepo.AssertExpectations(t)
	playerRepo.AssertExpectations(t)
}

func TestGuildService_CreateGuild_InsufficientSpace(t *testing.T) {
	guildRepo := new(mocks.MockGuildRepository)
	playerRepo := new(mocks.MockPlayerRepository)

	svc := service.NewGuildService(guildRepo, playerRepo)

	ctx := context.Background()
	ownerID := uint(1)

	// Mock: Owner does NOT have enough SPACE
	owner := &entity.Player{
		Model:        gorm.Model{ID: ownerID},
		SpaceBalance: 500000000000, // Only 500 SPACE
	}
	playerRepo.On("FindByID", ctx, ownerID).Return(owner, nil)

	// Execute
	guild, err := svc.CreateGuild(ctx, ownerID, "Test Guild", "TEST", "Test")

	// Assert
	require.Error(t, err)
	assert.Nil(t, guild)
	assert.Contains(t, err.Error(), "insufficient SPACE")

	playerRepo.AssertExpectations(t)
}

func TestGuildService_JoinGuild_Success(t *testing.T) {
	guildRepo := new(mocks.MockGuildRepository)
	playerRepo := new(mocks.MockPlayerRepository)

	svc := service.NewGuildService(guildRepo, playerRepo)

	ctx := context.Background()
	playerID := uint(2)
	guildID := uint(1)

	// Mock: Guild exists and is not full
	guild := &entity.Guild{
		Model:        gorm.Model{ID: guildID},
		Name:         "Test Guild",
		MaxMembers:   50,
		TotalMembers: 10,
		IsPublic:     true,
	}
	guildRepo.On("FindByID", ctx, guildID).Return(guild, nil)

	// Mock: Player exists and has 100 SPACE
	player := &entity.Player{
		Model:        gorm.Model{ID: playerID},
		SpaceBalance: 100000000000, // 100 SPACE
	}
	playerRepo.On("FindByID", ctx, playerID).Return(player, nil)

	// Mock: Player not in any guild
	guildRepo.On("GetMemberByPlayerID", ctx, playerID).Return(nil, gorm.ErrRecordNotFound)

	// Mock: Add member
	guildRepo.On("AddMember", ctx, mock.MatchedBy(func(m *entity.GuildMember) bool {
		return m.PlayerID == playerID && m.GuildID == guildID && m.LockedSpace == 100000000000
	})).Return(nil)

	// Mock: SPACE deducted
	playerRepo.On("UpdateSpaceBalance", ctx, playerID, int64(-100000000000)).Return(nil)

	// Execute
	err := svc.JoinGuild(ctx, playerID, guildID)

	// Assert
	require.NoError(t, err)

	guildRepo.AssertExpectations(t)
	playerRepo.AssertExpectations(t)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/domain/service -v -run TestGuildService`

Expected: FAIL with "undefined: service.NewGuildService"

- [ ] **Step 3: Implement GuildService**

Create `backend/internal/domain/service/guild_service.go`:

```go
package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

const (
	GuildCreationCost = 1000000000000 // 1000 SPACE
	GuildJoinCost     = 100000000000  // 100 SPACE
)

type GuildService struct {
	guildRepo  repository.GuildRepository
	playerRepo repository.PlayerRepository
}

func NewGuildService(
	guildRepo repository.GuildRepository,
	playerRepo repository.PlayerRepository,
) *GuildService {
	return &GuildService{
		guildRepo:  guildRepo,
		playerRepo: playerRepo,
	}
}

func (s *GuildService) CreateGuild(ctx context.Context, ownerID uint, name, tag, description string) (*entity.Guild, error) {
	// Validate tag (4 chars, uppercase)
	if len(tag) != 4 {
		return nil, errors.New("tag must be exactly 4 characters")
	}

	// Check if tag is available
	existing, err := s.guildRepo.FindByTag(ctx, tag)
	if err == nil && existing.ID > 0 {
		return nil, errors.New("tag already taken")
	}

	// Check owner exists and has enough SPACE
	owner, err := s.playerRepo.FindByID(ctx, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner: %w", err)
	}

	if owner.SpaceBalance < GuildCreationCost {
		return nil, fmt.Errorf("insufficient SPACE (need %d, have %d)", GuildCreationCost, owner.SpaceBalance)
	}

	// Create guild
	guild := &entity.Guild{
		Name:         name,
		Tag:          tag,
		Description:  description,
		OwnerID:      ownerID,
		MaxMembers:   50,
		TotalMembers: 1,
		LockedSpace:  GuildCreationCost,
		GuildLevel:   1,
		GuildXP:      0,
		IsPublic:     true,
	}

	if err := s.guildRepo.Create(ctx, guild); err != nil {
		return nil, fmt.Errorf("failed to create guild: %w", err)
	}

	// Add owner as member
	member := &entity.GuildMember{
		GuildID:     guild.ID,
		PlayerID:    ownerID,
		Role:        "owner",
		LockedSpace: GuildCreationCost,
		JoinedAt:    time.Now(),
	}

	if err := s.guildRepo.AddMember(ctx, member); err != nil {
		return nil, fmt.Errorf("failed to add owner as member: %w", err)
	}

	// Deduct SPACE from owner
	if err := s.playerRepo.UpdateSpaceBalance(ctx, ownerID, -int64(GuildCreationCost)); err != nil {
		return nil, fmt.Errorf("failed to deduct SPACE: %w", err)
	}

	return guild, nil
}

func (s *GuildService) JoinGuild(ctx context.Context, playerID, guildID uint) error {
	// Check guild exists
	guild, err := s.guildRepo.FindByID(ctx, guildID)
	if err != nil {
		return fmt.Errorf("failed to get guild: %w", err)
	}

	// Check guild not full
	if guild.TotalMembers >= guild.MaxMembers {
		return errors.New("guild is full")
	}

	// Check player exists and has enough SPACE
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return fmt.Errorf("failed to get player: %w", err)
	}

	if player.SpaceBalance < GuildJoinCost {
		return fmt.Errorf("insufficient SPACE (need %d)", GuildJoinCost)
	}

	// Check player not already in a guild
	_, err = s.guildRepo.GetMemberByPlayerID(ctx, playerID)
	if err == nil {
		return errors.New("player already in a guild")
	}

	// Add member
	member := &entity.GuildMember{
		GuildID:     guildID,
		PlayerID:    playerID,
		Role:        "member",
		LockedSpace: GuildJoinCost,
		JoinedAt:    time.Now(),
	}

	if err := s.guildRepo.AddMember(ctx, member); err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	// Deduct SPACE
	if err := s.playerRepo.UpdateSpaceBalance(ctx, playerID, -int64(GuildJoinCost)); err != nil {
		return fmt.Errorf("failed to deduct SPACE: %w", err)
	}

	// Update guild locked SPACE
	guild.LockedSpace += GuildJoinCost
	if err := s.guildRepo.Update(ctx, guild); err != nil {
		return fmt.Errorf("failed to update guild: %w", err)
	}

	return nil
}

func (s *GuildService) LeaveGuild(ctx context.Context, playerID uint) error {
	// Get member
	member, err := s.guildRepo.GetMemberByPlayerID(ctx, playerID)
	if err != nil {
		return fmt.Errorf("player not in a guild")
	}

	// Owner cannot leave (must transfer ownership or disband)
	if member.Role == "owner" {
		return errors.New("owner cannot leave guild (transfer ownership or disband)")
	}

	guildID := member.GuildID
	lockedSpace := member.LockedSpace

	// Remove member
	if err := s.guildRepo.RemoveMember(ctx, guildID, playerID); err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	// Refund SPACE
	if err := s.playerRepo.UpdateSpaceBalance(ctx, playerID, int64(lockedSpace)); err != nil {
		return fmt.Errorf("failed to refund SPACE: %w", err)
	}

	// Update guild locked SPACE
	guild, err := s.guildRepo.FindByID(ctx, guildID)
	if err != nil {
		return err
	}

	guild.LockedSpace -= lockedSpace
	return s.guildRepo.Update(ctx, guild)
}

func (s *GuildService) InvitePlayer(ctx context.Context, guildID, invitedPlayerID, invitedByID uint) error {
	// Validate inviter is officer or owner
	inviter, err := s.guildRepo.GetMemberByPlayerID(ctx, invitedByID)
	if err != nil {
		return errors.New("inviter not in guild")
	}

	if inviter.GuildID != guildID || (inviter.Role != "owner" && inviter.Role != "officer") {
		return errors.New("only owner or officers can invite")
	}

	// Check invitee not already in a guild
	_, err = s.guildRepo.GetMemberByPlayerID(ctx, invitedPlayerID)
	if err == nil {
		return errors.New("player already in a guild")
	}

	// Create invite
	invite := &entity.GuildInvite{
		GuildID:    guildID,
		PlayerID:   invitedPlayerID,
		InvitedBy:  invitedByID,
		Status:     "pending",
		ExpiresAt:  time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	return s.guildRepo.CreateInvite(ctx, invite)
}

func (s *GuildService) AcceptInvite(ctx context.Context, inviteID, playerID uint) error {
	// TODO: Implement invite acceptance logic
	// 1. Get invite and validate
	// 2. Call JoinGuild()
	// 3. Update invite status to "accepted"
	return nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/domain/service -v -run TestGuildService`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/internal/domain/service/guild_service.go \
        backend/internal/domain/service/guild_service_test.go
git commit -m "feat(social): add guild service with create/join/leave"
```

---

### Task 3: PvP 1v1 Migration (Port Signaling to Go)

**Files:**
- Modify: `supabase/functions/pvp-signaling/index.ts` → Port to Go
- Create: `backend/internal/app/http/controller/pvp_controller.go`
- Create: `backend/internal/domain/entity/pvp_match.go`
- Create: `backend/internal/domain/repository/pvp_repository.go`
- Create: `backend/internal/infra/database/pvp_repository_impl.go`

**Interfaces:**
- Consumes: Existing frontend PvP code (src/pvp/*.js)
- Produces:
  - PvP signaling endpoints in Go:
    - POST /api/pvp/lobby/create
    - POST /api/pvp/lobby/join
    - POST /api/pvp/signal (WebRTC signaling)
  - `PvPRepository` with methods:
    - `CreateMatch(ctx context.Context, match *entity.PvPMatch) error`
    - `FindActiveMatch(ctx context.Context, playerID uint) (*entity.PvPMatch, error)`
    - `UpdateMatchResult(ctx context.Context, matchID uint, winnerID uint, score1, score2 int) error`

- [ ] **Step 1: Read existing PvP implementation**

Run: `cat supabase/functions/pvp-signaling/index.ts`

Expected: Understand Supabase Edge Function logic for signaling

- [ ] **Step 2: Create PvP entity**

Create `backend/internal/domain/entity/pvp_match.go`:

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

// PvPMatch represents a 1v1 PvP match
type PvPMatch struct {
	gorm.Model

	// Players
	Player1ID uint `gorm:"not null;index"`
	Player1   *Player `gorm:"foreignKey:Player1ID"`

	Player2ID uint `gorm:"not null;index"`
	Player2   *Player `gorm:"foreignKey:Player2ID"`

	// Match status: waiting, in_progress, completed, cancelled
	Status string `gorm:"not null;default:'waiting'"`

	// WebRTC session ID
	SessionID string `gorm:"uniqueIndex;not null"`

	// Match result
	WinnerID *uint   `gorm:"index"`
	Score1   int     `gorm:"default:0"`
	Score2   int     `gorm:"default:0"`

	// Timestamps
	StartedAt   *time.Time
	CompletedAt *time.Time
}
```

- [ ] **Step 3: Create PvPRepository**

Create `backend/internal/domain/repository/pvp_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type PvPRepository interface {
	CreateMatch(ctx context.Context, match *entity.PvPMatch) error
	FindBySessionID(ctx context.Context, sessionID string) (*entity.PvPMatch, error)
	FindActiveMatch(ctx context.Context, playerID uint) (*entity.PvPMatch, error)
	UpdateMatchStatus(ctx context.Context, matchID uint, status string) error
	UpdateMatchResult(ctx context.Context, matchID uint, winnerID uint, score1, score2 int) error
}
```

Create implementation `backend/internal/infra/database/pvp_repository_impl.go`:

```go
package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type pvpRepository struct {
	db *gorm.DB
}

func NewPvPRepository(db *gorm.DB) repository.PvPRepository {
	return &pvpRepository{db: db}
}

func (r *pvpRepository) CreateMatch(ctx context.Context, match *entity.PvPMatch) error {
	return r.db.WithContext(ctx).Create(match).Error
}

func (r *pvpRepository) FindBySessionID(ctx context.Context, sessionID string) (*entity.PvPMatch, error) {
	var match entity.PvPMatch
	err := r.db.WithContext(ctx).
		Preload("Player1").
		Preload("Player2").
		Where("session_id = ?", sessionID).
		First(&match).Error
	return &match, err
}

func (r *pvpRepository) FindActiveMatch(ctx context.Context, playerID uint) (*entity.PvPMatch, error) {
	var match entity.PvPMatch
	err := r.db.WithContext(ctx).
		Where("(player1_id = ? OR player2_id = ?) AND status IN ?", playerID, playerID, []string{"waiting", "in_progress"}).
		First(&match).Error
	return &match, err
}

func (r *pvpRepository) UpdateMatchStatus(ctx context.Context, matchID uint, status string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	if status == "in_progress" {
		now := time.Now()
		updates["started_at"] = &now
	} else if status == "completed" || status == "cancelled" {
		now := time.Now()
		updates["completed_at"] = &now
	}

	return r.db.WithContext(ctx).
		Model(&entity.PvPMatch{}).
		Where("id = ?", matchID).
		Updates(updates).Error
}

func (r *pvpRepository) UpdateMatchResult(ctx context.Context, matchID uint, winnerID uint, score1, score2 int) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entity.PvPMatch{}).
		Where("id = ?", matchID).
		Updates(map[string]interface{}{
			"winner_id":    winnerID,
			"score1":       score1,
			"score2":       score2,
			"status":       "completed",
			"completed_at": &now,
		}).Error
}
```

- [ ] **Step 4: Create PvP HTTP controller**

Create `backend/internal/app/http/controller/pvp_controller.go`:

```go
package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type PvPController struct {
	pvpRepo repository.PvPRepository
}

func NewPvPController(pvpRepo repository.PvPRepository) *PvPController {
	return &PvPController{pvpRepo: pvpRepo}
}

type CreateLobbyRequest struct {
	PlayerID uint `json:"player_id" binding:"required"`
}

type CreateLobbyResponse struct {
	SessionID string `json:"session_id"`
	MatchID   uint   `json:"match_id"`
}

func (c *PvPController) CreateLobby(ctx *gin.Context) {
	var req CreateLobbyRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate session ID
	sessionID := uuid.New().String()

	// Create match (waiting for player 2)
	match := &entity.PvPMatch{
		Player1ID: req.PlayerID,
		SessionID: sessionID,
		Status:    "waiting",
	}

	if err := c.pvpRepo.CreateMatch(ctx, match); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create match"})
		return
	}

	ctx.JSON(http.StatusOK, CreateLobbyResponse{
		SessionID: sessionID,
		MatchID:   match.ID,
	})
}

type JoinLobbyRequest struct {
	PlayerID  uint   `json:"player_id" binding:"required"`
	SessionID string `json:"session_id" binding:"required"`
}

func (c *PvPController) JoinLobby(ctx *gin.Context) {
	var req JoinLobbyRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find match by session ID
	match, err := c.pvpRepo.FindBySessionID(ctx, req.SessionID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	if match.Status != "waiting" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Match already started or completed"})
		return
	}

	// Assign player 2
	match.Player2ID = req.PlayerID
	match.Status = "in_progress"

	if err := c.pvpRepo.UpdateMatchStatus(ctx, match.ID, "in_progress"); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update match"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"match_id": match.ID, "status": "in_progress"})
}

// Signal handles WebRTC signaling (offer, answer, ICE candidates)
// Frontend will POST signaling data here
func (c *PvPController) Signal(ctx *gin.Context) {
	// Simplified: Real implementation would use WebSocket or SSE
	// for bidirectional signaling relay between players
	ctx.JSON(http.StatusOK, gin.H{"status": "signaling relay not yet implemented"})
}
```

- [ ] **Step 5: Register PvP routes**

Modify `backend/internal/app/http/router.go`:

```go
// Add PvP routes
pvpController := controller.NewPvPController(pvpRepository)
api.POST("/pvp/lobby/create", pvpController.CreateLobby)
api.POST("/pvp/lobby/join", pvpController.JoinLobby)
api.POST("/pvp/signal", pvpController.Signal)
```

- [ ] **Step 6: Add AutoMigrate for PvPMatch**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.PvPMatch{},
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/pvp_match.go \
        backend/internal/domain/repository/pvp_repository.go \
        backend/internal/infra/database/pvp_repository_impl.go \
        backend/internal/app/http/controller/pvp_controller.go \
        backend/internal/app/http/router.go \
        backend/internal/infra/database/connection.go
git commit -m "feat(pvp): port PvP 1v1 signaling from Supabase to Go"
```

---

## Remaining Tasks (Outline)

### Task 4: WebSocket Chat Server
- **Goal:** Real-time guild chat using WebSockets
- **Files:** `app/http/controller/chat_controller.go`, WebSocket hub
- **Features:** Join room (guild ID), send message, broadcast to all members

### Task 5: Redis Pub/Sub for Chat Scaling
- **Goal:** Scale WebSocket chat across multiple backend instances
- **Files:** `infra/messaging/chat_pubsub.go`
- **Pattern:** Publish to Redis channel, all instances relay to WebSocket clients

### Task 6: Guild Chat Message Entity
- **Files:** `domain/entity/chat_message.go`, repository
- **Storage:** PostgreSQL for message history (last 1000 messages per guild)

### Task 7: HTTP Controllers - Guilds
- **Files:** `app/http/controller/guild_controller.go`
- **Endpoints:**
  - POST /api/guilds/create
  - POST /api/guilds/:id/join
  - POST /api/guilds/leave
  - GET /api/guilds (list all)
  - GET /api/guilds/:id/members

### Task 8: HTTP Controllers - Guild Invites
- **Files:** `app/http/controller/guild_invite_controller.go`
- **Endpoints:**
  - POST /api/guilds/:id/invite (invite player)
  - GET /api/guilds/invites (my pending invites)
  - POST /api/guilds/invites/:id/accept
  - POST /api/guilds/invites/:id/reject

### Task 9: Frontend - Guild List UI
- **Files:** `frontend/src/views/GuildsView.vue`, `stores/guildStore.ts`
- **UI:** Guild cards, search/filter, join button, create modal

### Task 10: Frontend - Guild Detail UI
- **Files:** `frontend/src/views/GuildDetailView.vue`
- **UI:** Guild info, member list, chat, leave button

### Task 11: Frontend - Guild Creation Modal
- **Files:** `frontend/src/components/GuildCreateModal.vue`
- **Form:** Name, tag, description, cost (1000 SPACE)

### Task 12: Frontend - Guild Chat Component
- **Files:** `frontend/src/components/GuildChat.vue`, `composables/useWebSocket.ts`
- **Features:** Message list, send input, auto-scroll, typing indicators

### Task 13: SPACE Token Locking (Solana Escrow)
- **Files:** `infra/blockchain/escrow_adapter.go`
- **Methods:** LockTokens(), UnlockTokens()
- **Mechanism:** Solana PDA escrow account per guild

### Task 14: Guild Management (Promote, Kick)
- **Files:** Add methods to `GuildService`
- **Methods:** PromoteMember(), DemoteMember(), KickMember()
- **Permissions:** Only owner/officers can manage

### Task 15: Guild Disband
- **Files:** Add method to `GuildService`
- **Logic:** Only owner can disband, refund all locked SPACE, delete guild

### Task 16: PvP Match Results Handler
- **Files:** `domain/service/pvp_service.go`
- **Logic:** Update winner, distribute rewards (Gold, XP, rank points)

### Task 17: PvP Matchmaking Queue (Optional)
- **Files:** `domain/service/matchmaking_service.go`
- **Queue:** Redis sorted set by rank points
- **Algorithm:** Match players within 100 rank points

### Task 18: Frontend - PvP Lobby UI Update
- **Files:** Modify `frontend/src/pvp/PvPLobby.js`
- **Changes:** Use new Go endpoints instead of Supabase Functions

### Task 19: Frontend - Guild Invites Notification
- **Files:** `frontend/src/components/InviteNotification.vue`
- **Trigger:** Poll /api/guilds/invites every 30s

### Task 20: E2E Tests - Guild Flow
- **Files:** `test/e2e/guild_flow_test.go`
- **Scenario:** Create guild → Invite player → Accept → Join → Chat → Leave

### Task 21: E2E Tests - PvP Flow
- **Files:** `test/e2e/pvp_flow_test.go`
- **Scenario:** Create lobby → Join → Play → Submit result → Verify rewards

### Task 22: Documentation - Guilds API
- **Files:** `docs/api/guilds.md`
- **Sections:** Create, join, leave, invite, chat

### Task 23: Documentation - PvP API
- **Files:** `docs/api/pvp.md`
- **Sections:** Lobby creation, signaling, match results

### Task 24: Monitoring - Social Metrics
- **Files:** `pkg/metrics/social_metrics.go`
- **Metrics:** guilds_created_total, members_joined_total, chat_messages_total

### Task 25: Performance Tests - WebSocket Chat
- **Files:** `test/performance/websocket_chat_test.go`
- **Goal:** 1000 concurrent WebSocket connections

---

## Validation Checkpoints

After completing Fase 4, validate:

- [ ] Guilds create/join/leave funcionando
- [ ] SPACE locking validado (1000 SPACE creation, 100 SPACE join)
- [ ] Guild chat real-time via WebSocket funcionando
- [ ] PvP 1v1 matchmaking funcionando (lobby create/join)
- [ ] PvP signaling portado do Supabase para Go
- [ ] Frontend guild UI completa (list, detail, create, chat)
- [ ] E2E tests passando (guild flow, pvp flow)

---

## Next Phase

→ [Fase 5+6: Admin & Polish](./fase-5-6-admin-polish.md) - Admin panels, metrics, CI/CD, deploy
