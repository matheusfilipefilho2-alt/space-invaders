package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type GameHandler struct {
	gameService *service.GameService
}

func NewGameHandler(gameService *service.GameService) *GameHandler {
	return &GameHandler{
		gameService: gameService,
	}
}

// EndGameRequest represents the request to end a game
type EndGameRequest struct {
	Score uint64 `json:"score" binding:"required"`
}

// EndGameResponse represents the response after ending a game
type EndGameResponse struct {
	GoldEarned uint64 `json:"goldEarned"`
	Message    string `json:"message"`
}

// StartGame handles POST /api/v1/game/start
// @Summary Start a new game session
// @Description Start a new game session for the authenticated player
// @Tags game
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=map[string]string}
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/game/start [post]
func (h *GameHandler) StartGame(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	if err := h.gameService.StartGame(c.Request.Context(), playerID); err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to start game")
		return
	}

	response.OK(c, gin.H{"message": "Game started successfully"})
}

// EndGame handles POST /api/v1/game/end
// @Summary End a game session
// @Description End a game session and calculate rewards based on score
// @Tags game
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body EndGameRequest true "Game end data"
// @Success 200 {object} response.SuccessResponse{data=EndGameResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/game/end [post]
func (h *GameHandler) EndGame(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	var req EndGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	goldEarned, err := h.gameService.EndGame(c.Request.Context(), playerID, req.Score)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to end game")
		return
	}

	response.OK(c, EndGameResponse{
		GoldEarned: goldEarned,
		Message:    "Game ended successfully",
	})
}
