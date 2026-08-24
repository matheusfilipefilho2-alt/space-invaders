package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"gorm.io/gorm"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email"`
	Password string `json:"password" binding:"required"`
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token  string      `json:"token"`
	Player PlayerInfo  `json:"player"`
}

// PlayerInfo represents player information in auth responses
type PlayerInfo struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
}

// Register handles POST /api/v1/auth/register
// @Summary Register a new player
// @Description Create a new player account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration data"
// @Success 201 {object} response.SuccessResponse{data=AuthResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	token, player, err := h.authService.Register(c.Request.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUsernameExists):
			response.BadRequest(c, "Username already exists")
		case errors.Is(err, service.ErrEmailExists):
			response.BadRequest(c, "Email already exists")
		case errors.Is(err, service.ErrInvalidUsername):
			response.BadRequest(c, "Username must be 3-20 characters and contain only alphanumeric characters and underscores")
		case errors.Is(err, service.ErrInvalidEmail):
			response.BadRequest(c, "Invalid email format")
		case errors.Is(err, service.ErrInvalidPassword):
			response.BadRequest(c, "Password must be at least 8 characters")
		default:
			response.InternalServerError(c, "Failed to register player")
		}
		return
	}

	response.Created(c, AuthResponse{
		Token: token,
		Player: PlayerInfo{
			ID:       player.ID,
			Username: player.Username,
			Email:    player.Email,
		},
	})
}

// Login handles POST /api/v1/auth/login
// @Summary Login
// @Description Authenticate a player and return a JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} response.SuccessResponse{data=AuthResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	token, player, err := h.authService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			response.Unauthorized(c, "Invalid username or password")
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Unauthorized(c, "Invalid username or password")
			return
		}
		response.InternalServerError(c, "Failed to login")
		return
	}

	response.OK(c, AuthResponse{
		Token: token,
		Player: PlayerInfo{
			ID:       player.ID,
			Username: player.Username,
			Email:    player.Email,
		},
	})
}
