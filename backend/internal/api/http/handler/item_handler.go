package handler

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type ItemHandler struct {
	itemService *service.ItemService
}

func NewItemHandler(itemService *service.ItemService) *ItemHandler {
	return &ItemHandler{
		itemService: itemService,
	}
}

// ItemResponse represents an item in API responses
type ItemResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	PriceGold   *uint64 `json:"priceGold,omitempty"`
	PriceReal   *float64 `json:"priceReal,omitempty"`
	CoinAmount  *uint64 `json:"coinAmount,omitempty"`
	Image       string  `json:"image"`
	Rarity      string  `json:"rarity"`
	UnlockLevel *uint64 `json:"unlockLevel,omitempty"`
	Permanent   bool    `json:"permanent"`
	Duration    *string `json:"duration,omitempty"`
	Disabled    bool    `json:"disabled"`
	ComingSoon  bool    `json:"comingSoon"`
	SkinFile    *string `json:"skinFile,omitempty"`
	IsDefault   bool    `json:"isDefault"`
	IsActive    bool    `json:"isActive"`
}

// PlayerItemResponse represents a player item in API responses
type PlayerItemResponse struct {
	Item           ItemResponse `json:"item"`
	Equipped       bool         `json:"equipped"`
	PurchasedAt    time.Time    `json:"purchasedAt"`
	NFTMintAddress *string      `json:"nftMintAddress,omitempty"`
	IsOnChain      bool         `json:"isOnChain"`
}

// ListShopItems handles GET /api/v1/items
// @Summary List all shop items
// @Description Get a list of all items available in the shop
// @Tags items
// @Produce json
// @Success 200 {object} response.SuccessResponse{data=[]ItemResponse}
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/items [get]
func (h *ItemHandler) ListShopItems(c *gin.Context) {
	items, err := h.itemService.ListShopItems(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to get shop items")
		return
	}

	responseData := make([]ItemResponse, len(items))
	for i, item := range items {
		responseData[i] = ItemResponse{
			ID:          item.ID,
			Name:        item.Name,
			Description: item.Description,
			Category:    string(item.Category),
			PriceGold:   item.PriceGold,
			PriceReal:   item.PriceReal,
			CoinAmount:  item.CoinAmount,
			Image:       item.Image,
			Rarity:      string(item.Rarity),
			UnlockLevel: item.UnlockLevel,
			Permanent:   item.Permanent,
			Duration:    item.Duration,
			Disabled:    item.Disabled,
			ComingSoon:  item.ComingSoon,
			SkinFile:    item.SkinFile,
			IsDefault:   item.IsDefault,
			IsActive:    item.IsActive,
		}
	}

	response.OK(c, responseData)
}

// GetPlayerItems handles GET /api/v1/players/me/items
// @Summary Get player items
// @Description Get all items owned by the authenticated player
// @Tags items
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=[]PlayerItemResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/players/me/items [get]
func (h *ItemHandler) GetPlayerItems(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	playerItems, err := h.itemService.GetPlayerItems(c.Request.Context(), playerID)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to get player items")
		return
	}

	responseData := make([]PlayerItemResponse, len(playerItems))
	for i, pi := range playerItems {
		responseData[i] = PlayerItemResponse{
			Item: ItemResponse{
				ID:          pi.Item.ID,
				Name:        pi.Item.Name,
				Description: pi.Item.Description,
				Category:    string(pi.Item.Category),
				PriceGold:   pi.Item.PriceGold,
				PriceReal:   pi.Item.PriceReal,
				CoinAmount:  pi.Item.CoinAmount,
				Image:       pi.Item.Image,
				Rarity:      string(pi.Item.Rarity),
				UnlockLevel: pi.Item.UnlockLevel,
				Permanent:   pi.Item.Permanent,
				Duration:    pi.Item.Duration,
				Disabled:    pi.Item.Disabled,
				ComingSoon:  pi.Item.ComingSoon,
				SkinFile:    pi.Item.SkinFile,
				IsDefault:   pi.Item.IsDefault,
				IsActive:    pi.Item.IsActive,
			},
			Equipped:       pi.Equipped,
			PurchasedAt:    pi.CreatedAt,
			NFTMintAddress: pi.NFTMintAddress,
			IsOnChain:      pi.IsOnChain,
		}
	}

	response.OK(c, responseData)
}

// PurchaseItem handles POST /api/v1/items/:id/purchase
// @Summary Purchase an item
// @Description Purchase an item from the shop
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Item ID"
// @Success 200 {object} response.SuccessResponse{data=PurchaseItemResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/items/{id}/purchase [post]
func (h *ItemHandler) PurchaseItem(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	itemID := c.Param("id")
	if itemID == "" {
		response.BadRequest(c, "Invalid item ID")
		return
	}

	err := h.itemService.PurchaseItem(c.Request.Context(), playerID, itemID)
	if err != nil {
		// Parse error messages from service
		errMsg := err.Error()
		switch {
		case errMsg == "player not found":
			response.NotFound(c, "Player not found")
		case errMsg == "item not found":
			response.NotFound(c, "Item not found")
		case errMsg == "player already owns this item":
			response.BadRequest(c, "Item already owned")
		case errMsg == "insufficient gold balance":
			response.BadRequest(c, "Insufficient funds")
		default:
			response.InternalServerError(c, "Failed to purchase item")
		}
		return
	}

	response.OK(c, gin.H{"message": "Item purchased successfully"})
}

// EquipItem handles POST /api/v1/items/:id/equip
// @Summary Equip an item
// @Description Equip an owned item
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path int true "Item ID"
// @Success 200 {object} response.SuccessResponse{data=map[string]string}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/items/{id}/equip [post]
func (h *ItemHandler) EquipItem(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	itemID := c.Param("id")
	if itemID == "" {
		response.BadRequest(c, "Invalid item ID")
		return
	}

	if err := h.itemService.EquipItem(c.Request.Context(), playerID, itemID); err != nil {
		errMsg := err.Error()
		switch {
		case errMsg == "player does not own this item":
			response.BadRequest(c, "Item not owned")
		default:
			response.InternalServerError(c, "Failed to equip item")
		}
		return
	}

	response.OK(c, gin.H{"message": "Item equipped successfully"})
}

// UnequipItem handles POST /api/v1/items/:id/unequip
// @Summary Unequip an item
// @Description Unequip an equipped item
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path int true "Item ID"
// @Success 200 {object} response.SuccessResponse{data=map[string]string}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/items/{id}/unequip [post]
func (h *ItemHandler) UnequipItem(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	itemID := c.Param("id")
	if itemID == "" {
		response.BadRequest(c, "Invalid item ID")
		return
	}

	if err := h.itemService.UnequipItem(c.Request.Context(), playerID, itemID); err != nil {
		errMsg := err.Error()
		switch {
		case errMsg == "player does not own this item":
			response.BadRequest(c, "Item not owned")
		default:
			response.InternalServerError(c, "Failed to unequip item")
		}
		return
	}

	response.OK(c, gin.H{"message": "Item unequipped successfully"})
}
