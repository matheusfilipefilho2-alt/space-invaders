package handler

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type PlayerHandler struct {
	playerService *service.PlayerService
}

func NewPlayerHandler(playerService *service.PlayerService) *PlayerHandler {
	return &PlayerHandler{
		playerService: playerService,
	}
}

// UpdateProfileRequest represents the update profile request body
type UpdateProfileRequest struct {
	Email              *string `json:"email"`
	NotifyOffers       *bool   `json:"notifyOffers"`
	NotifyAchievements *bool   `json:"notifyAchievements"`
	NotifyShop         *bool   `json:"notifyShop"`
}

// PlayerResponse represents a player in API responses
type PlayerResponse struct {
	ID                 uint       `json:"id"`
	Username           string     `json:"username"`
	Email              string     `json:"email"`
	EmailVerified      bool       `json:"emailVerified"`
	WalletAddress      *string    `json:"walletAddress,omitempty"`
	HighScore          uint64     `json:"highScore"`
	TotalGames         uint       `json:"totalGames"`
	TotalKills         uint       `json:"totalKills"`
	LastPlayed         *time.Time `json:"lastPlayed,omitempty"`
	GoldBalance        uint64     `json:"goldBalance"`
	SpaceBalance       uint64     `json:"spaceBalance"`
	LeagueID           uint       `json:"leagueId"`
	RankPoints         uint       `json:"rankPoints"`
	NotifyOffers       bool       `json:"notifyOffers"`
	NotifyAchievements bool       `json:"notifyAchievements"`
	NotifyShop         bool       `json:"notifyShop"`
	GuildID            *uint      `json:"guildId,omitempty"`
}

// GetMe handles GET /api/v1/players/me
// @Summary Get current player profile
// @Description Get the authenticated player's profile
// @Tags players
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=PlayerResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/players/me [get]
func (h *PlayerHandler) GetMe(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	player, err := h.playerService.GetProfile(c.Request.Context(), playerID)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to get player profile")
		return
	}

	leagueID := uint(0)
	if player.LeagueID != nil {
		leagueID = *player.LeagueID
	}
	response.OK(c, PlayerResponse{
		ID:                 player.ID,
		Username:           player.Username,
		Email:              player.Email,
		EmailVerified:      player.EmailVerified,
		WalletAddress:      player.WalletAddress,
		HighScore:          player.HighScore,
		TotalGames:         player.TotalGames,
		TotalKills:         player.TotalKills,
		LastPlayed:         player.LastPlayed,
		GoldBalance:        player.GoldBalance,
		SpaceBalance:       player.SpaceBalance,
		LeagueID:           leagueID,
		RankPoints:         player.RankPoints,
		NotifyOffers:       player.NotifyOffers,
		NotifyAchievements: player.NotifyAchievements,
		NotifyShop:         player.NotifyShop,
		GuildID:            player.GuildID,
	})
}

// UpdateMe handles PUT /api/v1/players/me
// @Summary Update current player profile
// @Description Update the authenticated player's profile
// @Tags players
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body UpdateProfileRequest true "Profile update data"
// @Success 200 {object} response.SuccessResponse{data=PlayerResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/players/me [put]
func (h *PlayerHandler) UpdateMe(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Convert to service request
	serviceReq := service.UpdateProfileRequest{
		Email:              req.Email,
		NotifyOffers:       req.NotifyOffers,
		NotifyAchievements: req.NotifyAchievements,
		NotifyShop:         req.NotifyShop,
	}

	player, err := h.playerService.UpdateProfile(c.Request.Context(), playerID, serviceReq)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrPlayerNotFound):
			response.NotFound(c, "Player not found")
		case errors.Is(err, service.ErrEmailExists):
			response.BadRequest(c, "Email already exists")
		case errors.Is(err, service.ErrInvalidEmail):
			response.BadRequest(c, "Invalid email format")
		default:
			response.InternalServerError(c, "Failed to update player profile")
		}
		return
	}

	leagueID := uint(0)
	if player.LeagueID != nil {
		leagueID = *player.LeagueID
	}
	response.OK(c, PlayerResponse{
		ID:                 player.ID,
		Username:           player.Username,
		Email:              player.Email,
		EmailVerified:      player.EmailVerified,
		WalletAddress:      player.WalletAddress,
		HighScore:          player.HighScore,
		TotalGames:         player.TotalGames,
		TotalKills:         player.TotalKills,
		LastPlayed:         player.LastPlayed,
		GoldBalance:        player.GoldBalance,
		SpaceBalance:       player.SpaceBalance,
		LeagueID:           leagueID,
		RankPoints:         player.RankPoints,
		NotifyOffers:       player.NotifyOffers,
		NotifyAchievements: player.NotifyAchievements,
		NotifyShop:         player.NotifyShop,
		GuildID:            player.GuildID,
	})
}
