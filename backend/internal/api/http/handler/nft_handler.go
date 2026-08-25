package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type NFTHandler struct {
	nftService *service.NFTService
}

func NewNFTHandler(nftService *service.NFTService) *NFTHandler {
	return &NFTHandler{
		nftService: nftService,
	}
}

// GetPlayerNFTs godoc
// @Summary Get player's NFTs
// @Description Returns all NFTs owned by the authenticated player
// @Tags nfts
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/nfts [get]
func (h *NFTHandler) GetPlayerNFTs(c *gin.Context) {
	ctx := c.Request.Context()

	// Get player ID from context (set by auth middleware)
	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	nfts, err := h.nftService.ListPlayerNFTs(ctx, playerID.(uint))
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, nfts)
}

// GetNFT godoc
// @Summary Get NFT details
// @Description Returns details of a specific NFT by ID
// @Tags nfts
// @Produce json
// @Security BearerAuth
// @Param id path int true "NFT ID"
// @Success 200 {object} response.SuccessResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/nfts/{id} [get]
func (h *NFTHandler) GetNFT(c *gin.Context) {
	ctx := c.Request.Context()

	// Get player ID from context
	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	// Get NFT ID from path
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "invalid NFT ID")
		return
	}

	nft, err := h.nftService.GetNFT(ctx, uint(id))
	if err != nil {
		response.NotFound(c, "NFT not found")
		return
	}

	// Verify ownership
	if nft.PlayerID != playerID.(uint) {
		response.Forbidden(c, "you do not own this NFT")
		return
	}

	response.OK(c, nft)
}

// MintNFT godoc
// @Summary Mint a new NFT
// @Description Triggers NFT minting for a player (Battle Pass rewards, achievements, etc.)
// @Tags nfts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body MintNFTRequest true "Mint NFT request"
// @Success 200 {object} response.SuccessResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/nfts/mint [post]
func (h *NFTHandler) MintNFT(c *gin.Context) {
	ctx := c.Request.Context()

	// Get player ID from context
	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	var req MintNFTRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	// Validate rarity
	validRarities := map[string]bool{
		"common":    true,
		"rare":      true,
		"epic":      true,
		"legendary": true,
	}
	if !validRarities[req.Rarity] {
		response.BadRequest(c, "invalid rarity: must be common, rare, epic, or legendary")
		return
	}

	// Mint NFT
	nft, err := h.nftService.MintNFT(ctx, playerID.(uint), req.Name, req.Description, req.Rarity, req.Attributes)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, gin.H{
		"message": "NFT minting initiated",
		"nft":     nft,
	})
}

// Request/Response types

type MintNFTRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	Rarity      string                 `json:"rarity" binding:"required"` // common, rare, epic, legendary
	Attributes  map[string]interface{} `json:"attributes"`
}
