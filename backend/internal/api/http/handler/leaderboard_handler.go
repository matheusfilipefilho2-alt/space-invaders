package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type LeaderboardHandler struct {
	leaderboardService *service.LeaderboardService
}

func NewLeaderboardHandler(leaderboardService *service.LeaderboardService) *LeaderboardHandler {
	return &LeaderboardHandler{
		leaderboardService: leaderboardService,
	}
}

// LeaderboardEntryResponse represents a player entry in the leaderboard
type LeaderboardEntryResponse struct {
	Rank       int    `json:"rank"`
	PlayerID   uint   `json:"playerId"`
	Username   string `json:"username"`
	HighScore  uint64 `json:"highScore"`
	LeagueName string `json:"leagueName"`
	LeagueID   uint   `json:"leagueId"`
}

// GetGlobalLeaderboard handles GET /api/v1/leaderboard/global
// @Summary Get global leaderboard
// @Description Get the global leaderboard with top players
// @Tags leaderboard
// @Produce json
// @Param limit query int false "Number of entries to return" default(10)
// @Param offset query int false "Number of entries to skip" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]LeaderboardEntryResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/leaderboard/global [get]
func (h *LeaderboardHandler) GetGlobalLeaderboard(c *gin.Context) {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	entries, err := h.leaderboardService.GetGlobalLeaderboard(c.Request.Context(), limit, offset)
	if err != nil {
		response.InternalServerError(c, "Failed to get global leaderboard")
		return
	}

	responseData := make([]LeaderboardEntryResponse, len(entries))
	for i, entry := range entries {
		responseData[i] = LeaderboardEntryResponse{
			Rank:       entry.Rank,
			PlayerID:   entry.PlayerID,
			Username:   entry.Username,
			HighScore:  entry.HighScore,
			LeagueName: entry.LeagueName,
			LeagueID:   entry.LeagueID,
		}
	}

	response.OK(c, responseData)
}

// GetLeagueLeaderboard handles GET /api/v1/leaderboard/league/:id
// @Summary Get league leaderboard
// @Description Get the leaderboard for a specific league
// @Tags leaderboard
// @Produce json
// @Param id path int true "League ID"
// @Param limit query int false "Number of entries to return" default(10)
// @Param offset query int false "Number of entries to skip" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]LeaderboardEntryResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/leaderboard/league/{id} [get]
func (h *LeaderboardHandler) GetLeagueLeaderboard(c *gin.Context) {
	leagueIDStr := c.Param("id")
	leagueID, err := strconv.ParseUint(leagueIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid league ID")
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	entries, err := h.leaderboardService.GetLeagueLeaderboard(c.Request.Context(), uint(leagueID), limit, offset)
	if err != nil {
		response.InternalServerError(c, "Failed to get league leaderboard")
		return
	}

	responseData := make([]LeaderboardEntryResponse, len(entries))
	for i, entry := range entries {
		responseData[i] = LeaderboardEntryResponse{
			Rank:       entry.Rank,
			PlayerID:   entry.PlayerID,
			Username:   entry.Username,
			HighScore:  entry.HighScore,
			LeagueName: entry.LeagueName,
			LeagueID:   entry.LeagueID,
		}
	}

	response.OK(c, responseData)
}

// GetFriendLeaderboard handles GET /api/v1/leaderboard/friends
// @Summary Get friend leaderboard
// @Description Get the leaderboard for the player's friends (stub - to be implemented)
// @Tags leaderboard
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of entries to return" default(10)
// @Param offset query int false "Number of entries to skip" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]LeaderboardEntryResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/leaderboard/friends [get]
func (h *LeaderboardHandler) GetFriendLeaderboard(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	entries, err := h.leaderboardService.GetFriendLeaderboard(c.Request.Context(), playerID, limit, offset)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to get friend leaderboard")
		return
	}

	responseData := make([]LeaderboardEntryResponse, len(entries))
	for i, entry := range entries {
		responseData[i] = LeaderboardEntryResponse{
			Rank:       entry.Rank,
			PlayerID:   entry.PlayerID,
			Username:   entry.Username,
			HighScore:  entry.HighScore,
			LeagueName: entry.LeagueName,
			LeagueID:   entry.LeagueID,
		}
	}

	response.OK(c, responseData)
}
