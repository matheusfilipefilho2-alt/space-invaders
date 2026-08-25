package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/yourusername/space-invaders/internal/domain/entity"
)

// Mock repositories
type MockAchievementRepository struct {
	mock.Mock
}

func (m *MockAchievementRepository) Create(ctx context.Context, achievement *entity.Achievement) error {
	args := m.Called(ctx, achievement)
	return args.Error(0)
}

func (m *MockAchievementRepository) FindByID(ctx context.Context, id string) (*entity.Achievement, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Achievement), args.Error(1)
}

func (m *MockAchievementRepository) Update(ctx context.Context, achievement *entity.Achievement) error {
	args := m.Called(ctx, achievement)
	return args.Error(0)
}

func (m *MockAchievementRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockAchievementRepository) FindAll(ctx context.Context) ([]*entity.Achievement, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Achievement), args.Error(1)
}

func (m *MockAchievementRepository) FindByRarity(ctx context.Context, rarity entity.AchievementRarity) ([]*entity.Achievement, error) {
	args := m.Called(ctx, rarity)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Achievement), args.Error(1)
}

type MockPlayerRepository struct {
	mock.Mock
}

func (m *MockPlayerRepository) Create(ctx context.Context, player *entity.Player) error {
	args := m.Called(ctx, player)
	return args.Error(0)
}

func (m *MockPlayerRepository) FindByID(ctx context.Context, id uint) (*entity.Player, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Player), args.Error(1)
}

func (m *MockPlayerRepository) Update(ctx context.Context, player *entity.Player) error {
	args := m.Called(ctx, player)
	return args.Error(0)
}

func (m *MockPlayerRepository) Delete(ctx context.Context, id uint) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockPlayerRepository) FindByUsername(ctx context.Context, username string) (*entity.Player, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Player), args.Error(1)
}

func (m *MockPlayerRepository) FindByEmail(ctx context.Context, email string) (*entity.Player, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Player), args.Error(1)
}

func (m *MockPlayerRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.Player, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Player), args.Error(1)
}

func (m *MockPlayerRepository) UpdateGoldBalance(ctx context.Context, playerID uint, delta int64) error {
	args := m.Called(ctx, playerID, delta)
	return args.Error(0)
}

func (m *MockPlayerRepository) UpdateSpaceBalance(ctx context.Context, playerID uint, delta int64) error {
	args := m.Called(ctx, playerID, delta)
	return args.Error(0)
}

func (m *MockPlayerRepository) UpdateHighScore(ctx context.Context, playerID uint, newScore uint64) error {
	args := m.Called(ctx, playerID, newScore)
	return args.Error(0)
}

func (m *MockPlayerRepository) IncrementTotalGames(ctx context.Context, playerID uint) error {
	args := m.Called(ctx, playerID)
	return args.Error(0)
}

func (m *MockPlayerRepository) UpdateLeague(ctx context.Context, playerID uint, leagueID uint) error {
	args := m.Called(ctx, playerID, leagueID)
	return args.Error(0)
}

func (m *MockPlayerRepository) FindTopByScore(ctx context.Context, limit, offset int) ([]*entity.Player, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Player), args.Error(1)
}

func (m *MockPlayerRepository) FindTopByScoreInLeague(ctx context.Context, leagueID uint, limit, offset int) ([]*entity.Player, error) {
	args := m.Called(ctx, leagueID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Player), args.Error(1)
}

type MockPlayerAchievementRepository struct {
	mock.Mock
}

func (m *MockPlayerAchievementRepository) Create(ctx context.Context, pa *entity.PlayerAchievement) error {
	args := m.Called(ctx, pa)
	return args.Error(0)
}

func (m *MockPlayerAchievementRepository) FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerAchievement, error) {
	args := m.Called(ctx, playerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.PlayerAchievement), args.Error(1)
}

func (m *MockPlayerAchievementRepository) ExistsForPlayer(ctx context.Context, playerID uint, achievementID string) (bool, error) {
	args := m.Called(ctx, playerID, achievementID)
	return args.Bool(0), args.Error(1)
}

// Test: Unlock achievement - success case
func TestUnlock_Success(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)
	achievementID := "first_kill"

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	achievement := &entity.Achievement{
		ID:               achievementID,
		Name:             "First Blood",
		RewardGold:       10,
		RequirementType:  "first_kill",
		RequirementValue: 1,
	}

	mockAchievementRepo.On("FindByID", ctx, achievementID).Return(achievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, achievementID).Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil)
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(10)).Return(nil)

	// Act
	err := service.Unlock(ctx, playerID, achievementID)

	// Assert
	assert.NoError(t, err)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t)
}

// Test: Unlock achievement - already unlocked
func TestUnlock_AlreadyUnlocked(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)
	achievementID := "first_kill"

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	achievement := &entity.Achievement{
		ID:               achievementID,
		Name:             "First Blood",
		RewardGold:       10,
		RequirementType:  "first_kill",
		RequirementValue: 1,
	}

	mockAchievementRepo.On("FindByID", ctx, achievementID).Return(achievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, achievementID).Return(true, nil)

	// Act
	err := service.Unlock(ctx, playerID, achievementID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already unlocked")
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: Unlock achievement - achievement not found
func TestUnlock_AchievementNotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)
	achievementID := "invalid_id"

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	mockAchievementRepo.On("FindByID", ctx, achievementID).Return(nil, errors.New("not found"))

	// Act
	err := service.Unlock(ctx, playerID, achievementID)

	// Assert
	assert.Error(t, err)
	mockAchievementRepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - first kill achievement
func TestCheckAndUnlock_FirstKill(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 1,
		HighScore:  5000,
		TotalGames: 5,
	}
	player.ID = playerID

	firstKillAchievement := &entity.Achievement{
		ID:               "first_kill",
		Name:             "First Blood",
		RewardGold:       10,
		RequirementType:  "first_kill",
		RequirementValue: 1,
	}

	achievements := []*entity.Achievement{
		firstKillAchievement,
		{
			ID:               "score_10k",
			Name:             "Score Master",
			RewardGold:       50,
			RequirementType:  "score_milestone",
			RequirementValue: 10000,
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)
	// Mocks for Unlock call inside CheckAndUnlock
	mockAchievementRepo.On("FindByID", ctx, "first_kill").Return(firstKillAchievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, "first_kill").Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil)
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(10)).Return(nil)

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, unlocked, 1)
	assert.Equal(t, "first_kill", unlocked[0].ID)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - multiple achievements
func TestCheckAndUnlock_MultipleAchievements(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 1,
		HighScore:  15000,
		TotalGames: 5,
	}
	player.ID = playerID

	firstKillAchievement := &entity.Achievement{
		ID:               "first_kill",
		Name:             "First Blood",
		RewardGold:       10,
		RequirementType:  "first_kill",
		RequirementValue: 1,
	}

	score10kAchievement := &entity.Achievement{
		ID:               "score_10k",
		Name:             "Score Master",
		RewardGold:       50,
		RequirementType:  "score_milestone",
		RequirementValue: 10000,
	}

	achievements := []*entity.Achievement{
		firstKillAchievement,
		score10kAchievement,
		{
			ID:               "score_100k",
			Name:             "Score Legend",
			RewardGold:       200,
			RequirementType:  "score_milestone",
			RequirementValue: 100000,
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)

	// Mocks for first_kill unlock
	mockAchievementRepo.On("FindByID", ctx, "first_kill").Return(firstKillAchievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, "first_kill").Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil).Once()
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(10)).Return(nil).Once()

	// Mocks for score_10k unlock
	mockAchievementRepo.On("FindByID", ctx, "score_10k").Return(score10kAchievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, "score_10k").Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil).Once()
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(50)).Return(nil).Once()

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, unlocked, 2)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - no new achievements
func TestCheckAndUnlock_NoNewAchievements(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 0,
		HighScore:  500,
		TotalGames: 1,
	}
	player.ID = playerID

	achievements := []*entity.Achievement{
		{
			ID:               "first_kill",
			Name:             "First Blood",
			RewardGold:       10,
			RequirementType:  "first_kill",
			RequirementValue: 1,
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, unlocked, 0)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - skip already unlocked
func TestCheckAndUnlock_SkipAlreadyUnlocked(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 1,
		HighScore:  15000,
		TotalGames: 5,
	}
	player.ID = playerID

	score10kAchievement := &entity.Achievement{
		ID:               "score_10k",
		Name:             "Score Master",
		RewardGold:       50,
		RequirementType:  "score_milestone",
		RequirementValue: 10000,
	}

	achievements := []*entity.Achievement{
		{
			ID:               "first_kill",
			Name:             "First Blood",
			RewardGold:       10,
			RequirementType:  "first_kill",
			RequirementValue: 1,
		},
		score10kAchievement,
	}

	existingAchievements := []*entity.PlayerAchievement{
		{
			PlayerID:      playerID,
			AchievementID: "first_kill",
			UnlockedAt:    time.Now(),
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return(existingAchievements, nil)

	// Mocks for score_10k unlock (first_kill should be skipped)
	mockAchievementRepo.On("FindByID", ctx, "score_10k").Return(score10kAchievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, "score_10k").Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil).Once()
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(50)).Return(nil).Once()

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, unlocked, 1)
	assert.Equal(t, "score_10k", unlocked[0].ID)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: GetPlayerAchievements - success
func TestGetPlayerAchievements_Success(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	expected := []*entity.PlayerAchievement{
		{
			PlayerID:      playerID,
			AchievementID: "first_kill",
			UnlockedAt:    time.Now(),
		},
	}

	mockPARepo.On("FindByPlayerID", ctx, playerID).Return(expected, nil)

	// Act
	result, err := service.GetPlayerAchievements(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expected, result)
	mockPARepo.AssertExpectations(t)
}

// Test: Unlock - zero reward gold
func TestUnlock_ZeroRewardGold(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)
	achievementID := "nft_mint_first"

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	achievement := &entity.Achievement{
		ID:               achievementID,
		Name:             "NFT Collector",
		RewardGold:       0, // Zero reward
		RequirementType:  "nft_mint",
		RequirementValue: 1,
	}

	mockAchievementRepo.On("FindByID", ctx, achievementID).Return(achievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, achievementID).Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil)
	// No UpdateGoldBalance call expected since reward is 0

	// Act
	err := service.Unlock(ctx, playerID, achievementID)

	// Assert
	assert.NoError(t, err)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t) // Should have no calls
}

// Test: CheckAndUnlock - player not found
func TestCheckAndUnlock_PlayerNotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(999)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(nil, errors.New("player not found"))

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, unlocked)
	assert.Contains(t, err.Error(), "player not found")
	mockPlayerRepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - error fetching achievements
func TestCheckAndUnlock_ErrorFetchingAchievements(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{TotalKills: 1}
	player.ID = playerID

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(nil, errors.New("database error"))

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, unlocked)
	assert.Contains(t, err.Error(), "database error")
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - unknown requirement type
func TestCheckAndUnlock_UnknownRequirementType(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 100,
		HighScore:  100000,
		TotalGames: 100,
	}
	player.ID = playerID

	achievements := []*entity.Achievement{
		{
			ID:               "unknown_type",
			Name:             "Unknown Achievement",
			RewardGold:       50,
			RequirementType:  "unknown_type",
			RequirementValue: 1,
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert - should not unlock unknown type
	assert.NoError(t, err)
	assert.Len(t, unlocked, 0)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - future phase achievements
func TestCheckAndUnlock_FuturePhaseAchievements(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 100,
		HighScore:  100000,
		TotalGames: 100,
	}
	player.ID = playerID

	achievements := []*entity.Achievement{
		{
			ID:               "nft_mint_first",
			Name:             "NFT Collector",
			RewardGold:       50,
			RequirementType:  "nft_mint",
			RequirementValue: 1,
		},
		{
			ID:               "guild_founder",
			Name:             "Guild Master",
			RewardGold:       500,
			RequirementType:  "guild_create",
			RequirementValue: 1,
		},
		{
			ID:               "tournament_win",
			Name:             "Champion",
			RewardGold:       1000,
			RequirementType:  "tournament_win",
			RequirementValue: 1,
		},
	}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert - future phase achievements should not unlock yet
	assert.NoError(t, err)
	assert.Len(t, unlocked, 0)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}

// Test: CheckAndUnlock - games played achievement
func TestCheckAndUnlock_GamesPlayed(t *testing.T) {
	// Arrange
	ctx := context.Background()
	playerID := uint(1)

	mockAchievementRepo := new(MockAchievementRepository)
	mockPlayerRepo := new(MockPlayerRepository)
	mockPARepo := new(MockPlayerAchievementRepository)

	service := NewAchievementService(mockAchievementRepo, mockPlayerRepo, mockPARepo)

	player := &entity.Player{
		TotalKills: 0,
		HighScore:  500,
		TotalGames: 100,
	}
	player.ID = playerID

	games100Achievement := &entity.Achievement{
		ID:               "games_100",
		Name:             "Century Player",
		RewardGold:       100,
		RequirementType:  "games_played",
		RequirementValue: 100,
	}

	achievements := []*entity.Achievement{games100Achievement}

	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockAchievementRepo.On("FindAll", ctx).Return(achievements, nil)
	mockPARepo.On("FindByPlayerID", ctx, playerID).Return([]*entity.PlayerAchievement{}, nil)

	// Mocks for games_100 unlock
	mockAchievementRepo.On("FindByID", ctx, "games_100").Return(games100Achievement, nil)
	mockPARepo.On("ExistsForPlayer", ctx, playerID, "games_100").Return(false, nil)
	mockPARepo.On("Create", ctx, mock.AnythingOfType("*entity.PlayerAchievement")).Return(nil)
	mockPlayerRepo.On("UpdateGoldBalance", ctx, playerID, int64(100)).Return(nil)

	// Act
	unlocked, err := service.CheckAndUnlock(ctx, playerID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, unlocked, 1)
	assert.Equal(t, "games_100", unlocked[0].ID)
	mockPlayerRepo.AssertExpectations(t)
	mockAchievementRepo.AssertExpectations(t)
	mockPARepo.AssertExpectations(t)
}
