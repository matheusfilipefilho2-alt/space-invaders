package service

import (
	"context"
	"errors"
	"testing"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock ItemRepository
type MockItemRepository struct {
	mock.Mock
}

func (m *MockItemRepository) Create(ctx context.Context, item *entity.Item) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockItemRepository) FindByID(ctx context.Context, id uint) (*entity.Item, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Item), args.Error(1)
}

func (m *MockItemRepository) FindAll(ctx context.Context) ([]*entity.Item, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Item), args.Error(1)
}

func (m *MockItemRepository) FindByCategory(ctx context.Context, category entity.ItemCategory) ([]*entity.Item, error) {
	args := m.Called(ctx, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Item), args.Error(1)
}

func (m *MockItemRepository) FindActive(ctx context.Context) ([]*entity.Item, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Item), args.Error(1)
}

// Mock PlayerItemRepository
type MockPlayerItemRepository struct {
	mock.Mock
}

func (m *MockPlayerItemRepository) Create(ctx context.Context, pi *entity.PlayerItem) error {
	args := m.Called(ctx, pi)
	return args.Error(0)
}

func (m *MockPlayerItemRepository) FindByPlayerID(ctx context.Context, playerID uint) ([]*entity.PlayerItem, error) {
	args := m.Called(ctx, playerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.PlayerItem), args.Error(1)
}

func (m *MockPlayerItemRepository) FindByPlayerAndItem(ctx context.Context, playerID, itemID uint) (*entity.PlayerItem, error) {
	args := m.Called(ctx, playerID, itemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.PlayerItem), args.Error(1)
}

func (m *MockPlayerItemRepository) Update(ctx context.Context, pi *entity.PlayerItem) error {
	args := m.Called(ctx, pi)
	return args.Error(0)
}

func (m *MockPlayerItemRepository) UnequipAllByCategory(ctx context.Context, playerID uint, category entity.ItemCategory) error {
	args := m.Called(ctx, playerID, category)
	return args.Error(0)
}

// Test PurchaseItem - Success
func TestPurchaseItem_Success(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	// Setup
	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
		Name:       "Red Ship",
		Category:   entity.ItemCategoryShip,
		PriceGold:  1000,
		PriceSpace: 0,
	}
	item.ID = itemID
	player := &entity.Player{
		GoldBalance: 2000,
	}
	player.ID = playerID

	// Expectations
	mockItemRepo.On("FindByID", ctx, itemID).Return(item, nil)
	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))
	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockPlayerRepo.On("Update", ctx, mock.MatchedBy(func(p *entity.Player) bool {
		return p.ID == playerID && p.GoldBalance == 1000
	})).Return(nil)
	mockPlayerItemRepo.On("Create", ctx, mock.MatchedBy(func(pi *entity.PlayerItem) bool {
		return pi.PlayerID == playerID && pi.ItemID == itemID && pi.Equipped == false
	})).Return(nil)

	// Execute
	err := service.PurchaseItem(ctx, playerID, itemID)

	// Assert
	assert.NoError(t, err)
	mockItemRepo.AssertExpectations(t)
	mockPlayerItemRepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t)
}

// Test PurchaseItem - Item not found
func TestPurchaseItem_ItemNotFound(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(999)

	mockItemRepo.On("FindByID", ctx, itemID).Return(nil, errors.New("item not found"))

	err := service.PurchaseItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "item not found")
	mockItemRepo.AssertExpectations(t)
}

// Test PurchaseItem - Already owned
func TestPurchaseItem_AlreadyOwned(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
			PriceGold:  1000,
	}
	existingPlayerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
	}

	mockItemRepo.On("FindByID", ctx, itemID).Return(item, nil)
	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(existingPlayerItem, nil)

	err := service.PurchaseItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already owns this item")
	mockItemRepo.AssertExpectations(t)
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test PurchaseItem - Insufficient gold
func TestPurchaseItem_InsufficientGold(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
			PriceGold:  5000,
	}
	player := &entity.Player{
			GoldBalance: 1000,
	}

	mockItemRepo.On("FindByID", ctx, itemID).Return(item, nil)
	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))
	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)

	err := service.PurchaseItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient gold")
	mockItemRepo.AssertExpectations(t)
	mockPlayerItemRepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t)
}

// Test EquipItem - Success
func TestEquipItem_Success(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
		Category: entity.ItemCategoryShip,
	}
	item.ID = itemID
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Item:     item,
		Equipped: false,
	}

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(playerItem, nil)
	mockPlayerItemRepo.On("UnequipAllByCategory", ctx, playerID, entity.ItemCategoryShip).Return(nil)
	mockPlayerItemRepo.On("Update", ctx, mock.MatchedBy(func(pi *entity.PlayerItem) bool {
		return pi.PlayerID == playerID && pi.ItemID == itemID && pi.Equipped == true
	})).Return(nil)

	err := service.EquipItem(ctx, playerID, itemID)

	assert.NoError(t, err)
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test EquipItem - Not owned
func TestEquipItem_NotOwned(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))

	err := service.EquipItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player does not own this item")
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test UnequipItem - Success
func TestUnequipItem_Success(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Equipped: true,
	}

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(playerItem, nil)
	mockPlayerItemRepo.On("Update", ctx, mock.MatchedBy(func(pi *entity.PlayerItem) bool {
		return pi.PlayerID == playerID && pi.ItemID == itemID && pi.Equipped == false
	})).Return(nil)

	err := service.UnequipItem(ctx, playerID, itemID)

	assert.NoError(t, err)
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test GetPlayerItems - Success
func TestGetPlayerItems_Success(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	playerItems := []*entity.PlayerItem{
		{PlayerID: playerID, ItemID: 1, Equipped: true},
		{PlayerID: playerID, ItemID: 2, Equipped: false},
	}

	mockPlayerItemRepo.On("FindByPlayerID", ctx, playerID).Return(playerItems, nil)

	result, err := service.GetPlayerItems(ctx, playerID)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test ListShopItems - Success
func TestListShopItems_Success(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	item1 := &entity.Item{Name: "Red Ship", Category: entity.ItemCategoryShip, PriceGold: 1000}
	item1.ID = 1
	item2 := &entity.Item{Name: "Laser Gun", Category: entity.ItemCategoryWeapon, PriceGold: 500}
	item2.ID = 2
	items := []*entity.Item{item1, item2}

	mockItemRepo.On("FindActive", ctx).Return(items, nil)

	result, err := service.ListShopItems(ctx)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockItemRepo.AssertExpectations(t)
}

// Test PurchaseItem - Player not found
func TestPurchaseItem_PlayerNotFound(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(999)
	itemID := uint(100)
	item := &entity.Item{
		PriceGold: 1000,
	}
	item.ID = itemID

	mockItemRepo.On("FindByID", ctx, itemID).Return(item, nil)
	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))
	mockPlayerRepo.On("FindByID", ctx, playerID).Return(nil, errors.New("player not found"))

	err := service.PurchaseItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player not found")
	mockItemRepo.AssertExpectations(t)
	mockPlayerItemRepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t)
}

// Test PurchaseItem - Update player fails
func TestPurchaseItem_UpdatePlayerFails(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
		PriceGold: 1000,
	}
	item.ID = itemID
	player := &entity.Player{
		GoldBalance: 2000,
	}
	player.ID = playerID

	mockItemRepo.On("FindByID", ctx, itemID).Return(item, nil)
	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))
	mockPlayerRepo.On("FindByID", ctx, playerID).Return(player, nil)
	mockPlayerRepo.On("Update", ctx, mock.Anything).Return(errors.New("database error"))

	err := service.PurchaseItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
	mockItemRepo.AssertExpectations(t)
	mockPlayerItemRepo.AssertExpectations(t)
	mockPlayerRepo.AssertExpectations(t)
}

// Test EquipItem - Unequip category fails
func TestEquipItem_UnequipCategoryFails(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
		Category: entity.ItemCategoryShip,
	}
	item.ID = itemID
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Item:     item,
		Equipped: false,
	}

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(playerItem, nil)
	mockPlayerItemRepo.On("UnequipAllByCategory", ctx, playerID, entity.ItemCategoryShip).Return(errors.New("database error"))

	err := service.EquipItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test EquipItem - Update fails
func TestEquipItem_UpdateFails(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	item := &entity.Item{
		Category: entity.ItemCategoryShip,
	}
	item.ID = itemID
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Item:     item,
		Equipped: false,
	}

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(playerItem, nil)
	mockPlayerItemRepo.On("UnequipAllByCategory", ctx, playerID, entity.ItemCategoryShip).Return(nil)
	mockPlayerItemRepo.On("Update", ctx, mock.Anything).Return(errors.New("database error"))

	err := service.EquipItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test UnequipItem - Not owned
func TestUnequipItem_NotOwned(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(nil, errors.New("not found"))

	err := service.UnequipItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player does not own this item")
	mockPlayerItemRepo.AssertExpectations(t)
}

// Test UnequipItem - Update fails
func TestUnequipItem_UpdateFails(t *testing.T) {
	ctx := context.Background()
	mockItemRepo := new(MockItemRepository)
	mockPlayerItemRepo := new(MockPlayerItemRepository)
	mockPlayerRepo := new(MockPlayerRepository)

	service := NewItemService(mockItemRepo, mockPlayerItemRepo, mockPlayerRepo)

	playerID := uint(1)
	itemID := uint(100)
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Equipped: true,
	}

	mockPlayerItemRepo.On("FindByPlayerAndItem", ctx, playerID, itemID).Return(playerItem, nil)
	mockPlayerItemRepo.On("Update", ctx, mock.Anything).Return(errors.New("database error"))

	err := service.UnequipItem(ctx, playerID, itemID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
	mockPlayerItemRepo.AssertExpectations(t)
}
