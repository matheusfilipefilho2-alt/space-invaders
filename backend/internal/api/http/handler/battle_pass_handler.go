package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type BattlePassHandler struct {
	battlePassService *service.BattlePassService
}

func NewBattlePassHandler(battlePassService *service.BattlePassService) *BattlePassHandler {
	return &BattlePassHandler{
		battlePassService: battlePassService,
	}
}

// GetCurrentSeason godoc
// @Summary Get current Battle Pass season
// @Description Returns the currently active Battle Pass season
// @Tags battle-pass
// @Produce json
// @Success 200 {object} response.SuccessResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/season [get]
func (h *BattlePassHandler) GetCurrentSeason(c *gin.Context) {
	ctx := c.Request.Context()

	season, err := h.battlePassService.GetCurrentSeason(ctx)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.OK(c, season)
}

// GetMyProgress godoc
// @Summary Get player's Battle Pass progress
// @Description Returns current player's Battle Pass progress including tier, XP, and rewards
// @Tags battle-pass
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/progress [get]
func (h *BattlePassHandler) GetMyProgress(c *gin.Context) {
	ctx := c.Request.Context()

	// Get player ID from context (set by auth middleware)
	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	progress, err := h.battlePassService.GetPlayerProgress(ctx, playerID.(uint))
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, progress)
}

// GetProgressSummary godoc
// @Summary Get Battle Pass progress summary
// @Description Returns a detailed summary of player's Battle Pass progress
// @Tags battle-pass
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/summary [get]
func (h *BattlePassHandler) GetProgressSummary(c *gin.Context) {
	ctx := c.Request.Context()

	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	summary, err := h.battlePassService.GetProgressSummary(ctx, playerID.(uint))
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, summary)
}

// GetSeasonRewards godoc
// @Summary Get Battle Pass season rewards
// @Description Returns all rewards for the current Battle Pass season
// @Tags battle-pass
// @Produce json
// @Success 200 {object} response.SuccessResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/rewards [get]
func (h *BattlePassHandler) GetSeasonRewards(c *gin.Context) {
	ctx := c.Request.Context()

	rewards, err := h.battlePassService.GetSeasonRewards(ctx)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, rewards)
}

// GetUnclaimedRewards godoc
// @Summary Get unclaimed rewards
// @Description Returns all unclaimed rewards that player is eligible to claim
// @Tags battle-pass
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/unclaimed [get]
func (h *BattlePassHandler) GetUnclaimedRewards(c *gin.Context) {
	ctx := c.Request.Context()

	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	rewards, err := h.battlePassService.GetUnclaimedRewards(ctx, playerID.(uint))
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, rewards)
}

// ClaimReward godoc
// @Summary Claim a Battle Pass reward
// @Description Claims a reward for a specific tier (free or premium)
// @Tags battle-pass
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body ClaimRewardRequest true "Claim reward request"
// @Success 200 {object} response.SuccessResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/claim [post]
func (h *BattlePassHandler) ClaimReward(c *gin.Context) {
	ctx := c.Request.Context()

	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	var req ClaimRewardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	// Validate reward type
	if req.RewardType != "free" && req.RewardType != "premium" {
		response.BadRequest(c, "reward_type must be 'free' or 'premium'")
		return
	}

	err := h.battlePassService.ClaimReward(ctx, playerID.(uint), req.Tier, req.RewardType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, gin.H{
		"message": "Reward claimed successfully",
		"tier":    req.Tier,
		"type":    req.RewardType,
	})
}

// PurchasePremium godoc
// @Summary Purchase premium Battle Pass
// @Description Upgrades player to premium Battle Pass for current season
// @Tags battle-pass
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body PurchasePremiumRequest true "Purchase premium request"
// @Success 200 {object} response.SuccessResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/premium/purchase [post]
func (h *BattlePassHandler) PurchasePremium(c *gin.Context) {
	ctx := c.Request.Context()

	playerID, exists := c.Get("player_id")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	var req PurchasePremiumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	// Validate payment type
	if req.PaymentType != "pix" && req.PaymentType != "credit_card" {
		response.BadRequest(c, "payment_type must be 'pix' or 'credit_card'")
		return
	}

	err := h.battlePassService.PurchasePremiumPass(ctx, playerID.(uint), req.PaymentType, req.OrderID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.OK(c, gin.H{
		"message": "Premium Battle Pass purchased successfully",
	})
}

// GetLeaderboard godoc
// @Summary Get Battle Pass leaderboard
// @Description Returns top players by XP for current season
// @Tags battle-pass
// @Produce json
// @Param limit query int false "Number of players to return" default(10)
// @Success 200 {object} response.SuccessResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/battle-pass/leaderboard [get]
func (h *BattlePassHandler) GetLeaderboard(c *gin.Context) {
	ctx := c.Request.Context()

	// Get limit from query params
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	leaderboard, err := h.battlePassService.GetLeaderboard(ctx, limit)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.OK(c, leaderboard)
}

// Request/Response types

type ClaimRewardRequest struct {
	Tier       uint   `json:"tier" binding:"required"`
	RewardType string `json:"reward_type" binding:"required"` // "free" or "premium"
}

type PurchasePremiumRequest struct {
	PaymentType string `json:"payment_type" binding:"required"` // "pix" or "credit_card"
	OrderID     string `json:"order_id" binding:"required"`
}
