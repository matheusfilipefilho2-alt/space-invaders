package service

import (
	"context"
	"errors"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type ItemService struct {
	itemRepo       repository.ItemRepository
	playerItemRepo repository.PlayerItemRepository
	playerRepo     repository.PlayerRepository
}

func NewItemService(
	itemRepo repository.ItemRepository,
	playerItemRepo repository.PlayerItemRepository,
	playerRepo repository.PlayerRepository,
) *ItemService {
	return &ItemService{
		itemRepo:       itemRepo,
		playerItemRepo: playerItemRepo,
		playerRepo:     playerRepo,
	}
}

// ListShopItems returns all active items available in the shop
func (s *ItemService) ListShopItems(ctx context.Context) ([]*entity.Item, error) {
	return s.itemRepo.FindActive(ctx)
}

// GetPlayerItems returns all items owned by a player
func (s *ItemService) GetPlayerItems(ctx context.Context, playerID uint) ([]*entity.PlayerItem, error) {
	return s.playerItemRepo.FindByPlayerID(ctx, playerID)
}

// PurchaseItem allows a player to purchase an item with gold
func (s *ItemService) PurchaseItem(ctx context.Context, playerID, itemID uint) error {
	// 1. Check if item exists
	item, err := s.itemRepo.FindByID(ctx, itemID)
	if err != nil {
		return errors.New("item not found")
	}

	// 2. Check if player already owns the item
	existingPlayerItem, err := s.playerItemRepo.FindByPlayerAndItem(ctx, playerID, itemID)
	if err == nil && existingPlayerItem != nil {
		return errors.New("player already owns this item")
	}

	// 3. Get player and check gold balance
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return errors.New("player not found")
	}

	if player.GoldBalance < item.PriceGold {
		return errors.New("insufficient gold balance")
	}

	// 4. Deduct gold from player
	player.GoldBalance -= item.PriceGold
	if err := s.playerRepo.Update(ctx, player); err != nil {
		return err
	}

	// 5. Add item to player inventory (not equipped by default)
	playerItem := &entity.PlayerItem{
		PlayerID: playerID,
		ItemID:   itemID,
		Equipped: false,
	}

	return s.playerItemRepo.Create(ctx, playerItem)
}

// EquipItem equips an item for a player (only one item per category can be equipped)
func (s *ItemService) EquipItem(ctx context.Context, playerID, itemID uint) error {
	// 1. Check if player owns the item
	playerItem, err := s.playerItemRepo.FindByPlayerAndItem(ctx, playerID, itemID)
	if err != nil || playerItem == nil {
		return errors.New("player does not own this item")
	}

	// 2. Unequip all items in the same category (only one equipped per category)
	if playerItem.Item != nil {
		if err := s.playerItemRepo.UnequipAllByCategory(ctx, playerID, playerItem.Item.Category); err != nil {
			return err
		}
	}

	// 3. Equip the item
	playerItem.Equipped = true
	return s.playerItemRepo.Update(ctx, playerItem)
}

// UnequipItem unequips an item for a player
func (s *ItemService) UnequipItem(ctx context.Context, playerID, itemID uint) error {
	// 1. Check if player owns the item
	playerItem, err := s.playerItemRepo.FindByPlayerAndItem(ctx, playerID, itemID)
	if err != nil || playerItem == nil {
		return errors.New("player does not own this item")
	}

	// 2. Unequip the item
	playerItem.Equipped = false
	return s.playerItemRepo.Update(ctx, playerItem)
}
