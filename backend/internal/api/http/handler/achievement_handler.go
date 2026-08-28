package handler

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type AchievementHandler struct {
	achievementService *service.AchievementService
}

func NewAchievementHandler(achievementService *service.AchievementService) *AchievementHandler {
	return &AchievementHandler{
		achievementService: achievementService,
	}
}

// AchievementResponse represents an achievement in API responses
type AchievementResponse struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	Rarity           string `json:"rarity"`
	RewardGold       uint   `json:"rewardGold"`
	RequirementType  string `json:"requirementType"`
	RequirementValue uint   `json:"requirementValue"`
	Icon             string `json:"icon"`
}

// PlayerAchievementResponse represents a player achievement in API responses
type PlayerAchievementResponse struct {
	Achievement AchievementResponse `json:"achievement"`
	UnlockedAt  time.Time           `json:"unlockedAt"`
	Notified    bool                `json:"notified"`
}

// CheckAchievementsResponse represents the response after checking achievements
type CheckAchievementsResponse struct {
	Unlocked []AchievementResponse `json:"unlocked"`
}

// ListAchievements handles GET /api/v1/achievements
// @Summary List all available achievements
// @Description Get a list of all available achievements
// @Tags achievements
// @Produce json
// @Success 200 {object} response.SuccessResponse{data=[]AchievementResponse}
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/achievements [get]
func (h *AchievementHandler) ListAchievements(c *gin.Context) {
	// Use the achievement repository directly through the service's GetPlayerAchievements
	// For now, we'll seed the achievements manually
	achievements := entity.SeedAchievements()

	responseData := make([]AchievementResponse, len(achievements))
	for i, achievement := range achievements {
		responseData[i] = AchievementResponse{
			ID:               achievement.ID,
			Name:             achievement.Name,
			Description:      achievement.Description,
			Rarity:           string(achievement.Rarity),
			RewardGold:       achievement.RewardGold,
			RequirementType:  achievement.RequirementType,
			RequirementValue: achievement.RequirementValue,
			Icon:             achievement.Icon,
		}
	}

	response.OK(c, responseData)
}

// GetPlayerAchievements handles GET /api/v1/players/me/achievements
// @Summary Get player achievements
// @Description Get all achievements for the authenticated player
// @Tags achievements
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=[]PlayerAchievementResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/players/me/achievements [get]
func (h *AchievementHandler) GetPlayerAchievements(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	playerAchievements, err := h.achievementService.GetPlayerAchievements(c.Request.Context(), playerID)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to get player achievements")
		return
	}

	responseData := make([]PlayerAchievementResponse, len(playerAchievements))
	for i, pa := range playerAchievements {
		responseData[i] = PlayerAchievementResponse{
			Achievement: AchievementResponse{
				ID:               pa.Achievement.ID,
				Name:             pa.Achievement.Name,
				Description:      pa.Achievement.Description,
				Rarity:           string(pa.Achievement.Rarity),
				RewardGold:       pa.Achievement.RewardGold,
				RequirementType:  pa.Achievement.RequirementType,
				RequirementValue: pa.Achievement.RequirementValue,
				Icon:             pa.Achievement.Icon,
			},
			UnlockedAt: pa.UnlockedAt,
			Notified:   pa.Notified,
		}
	}

	response.OK(c, responseData)
}

// CheckAchievements handles POST /api/v1/achievements/check
// @Summary Check and unlock achievements
// @Description Check player stats against achievements and unlock any that are completed
// @Tags achievements
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=CheckAchievementsResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/achievements/check [post]
func (h *AchievementHandler) CheckAchievements(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	unlockedAchievements, err := h.achievementService.CheckAndUnlock(c.Request.Context(), playerID)
	if err != nil {
		if errors.Is(err, service.ErrPlayerNotFound) {
			response.NotFound(c, "Player not found")
			return
		}
		response.InternalServerError(c, "Failed to check achievements")
		return
	}

	responseData := CheckAchievementsResponse{
		Unlocked: make([]AchievementResponse, len(unlockedAchievements)),
	}

	for i, achievement := range unlockedAchievements {
		responseData.Unlocked[i] = AchievementResponse{
			ID:               achievement.ID,
			Name:             achievement.Name,
			Description:      achievement.Description,
			Rarity:           string(achievement.Rarity),
			RewardGold:       achievement.RewardGold,
			RequirementType:  achievement.RequirementType,
			RequirementValue: achievement.RequirementValue,
			Icon:             achievement.Icon,
		}
	}

	response.OK(c, responseData)
}

// CheckGameStatsRequest represents the request body for checking achievements from game stats
type CheckGameStatsRequest struct {
	Score     uint `json:"score"`
	KillCount uint `json:"killCount"`
	MaxCombo  uint `json:"maxCombo"`
	Level     uint `json:"level"`
	BossKills uint `json:"bossKills"`
	Accuracy  uint `json:"accuracy"`
}

// CheckGameStatsResponse represents the response after checking game stats achievements
type CheckGameStatsResponse struct {
	NewlyUnlocked   []AchievementResponse `json:"newlyUnlocked"`
	TotalGoldEarned int64                 `json:"totalGoldEarned"`
}

// CheckAchievementsFromGameStats handles POST /api/achievements/check-game-stats
// @Summary Check and unlock achievements from game stats
// @Description Check game statistics and unlock eligible achievements
// @Tags achievements
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param stats body CheckGameStatsRequest true "Game Statistics"
// @Success 200 {object} response.SuccessResponse{data=CheckGameStatsResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/achievements/check-game-stats [post]
func (h *AchievementHandler) CheckAchievementsFromGameStats(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	var req CheckGameStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Failed to bind request body: %v", err)
		log.Printf("Raw request body: %v", c.Request.Body)
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	log.Printf("Received game stats: %+v", req)

	stats := service.GameStats{
		Score:     req.Score,
		KillCount: req.KillCount,
		MaxCombo:  req.MaxCombo,
		Level:     req.Level,
		BossKills: req.BossKills,
		Accuracy:  req.Accuracy,
	}

	unlockedAchievements, totalGold, err := h.achievementService.CheckAndUnlockFromGameStats(c.Request.Context(), playerID, stats)
	if err != nil {
		response.InternalServerError(c, "Failed to check achievements")
		return
	}

	responseData := CheckGameStatsResponse{
		NewlyUnlocked:   make([]AchievementResponse, len(unlockedAchievements)),
		TotalGoldEarned: totalGold,
	}

	for i, achievement := range unlockedAchievements {
		responseData.NewlyUnlocked[i] = AchievementResponse{
			ID:               achievement.ID,
			Name:             achievement.Name,
			Description:      achievement.Description,
			Rarity:           string(achievement.Rarity),
			RewardGold:       achievement.RewardGold,
			RequirementType:  achievement.RequirementType,
			RequirementValue: achievement.RequirementValue,
			Icon:             achievement.Icon,
		}
	}

	response.OK(c, responseData)
}

// AchievementWithStatusResponse represents an achievement with unlock status
type AchievementWithStatusResponse struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	Description      string     `json:"description"`
	Icon             string     `json:"icon"`
	Rarity           string     `json:"rarity"`
	RewardGold       uint       `json:"rewardGold"`
	RequirementType  string     `json:"requirementType"`
	RequirementValue uint       `json:"requirementValue"`
	Unlocked         bool       `json:"unlocked"`
	UnlockedAt       *time.Time `json:"unlockedAt,omitempty"`
}

// GetAllAchievementsWithStatus handles GET /api/achievements
// @Summary Get all achievements with unlock status
// @Description Get all available achievements with their unlock status for the authenticated player
// @Tags achievements
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=[]AchievementWithStatusResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/achievements [get]
func (h *AchievementHandler) GetAllAchievementsWithStatus(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	achievements, err := h.achievementService.GetAllAchievementsWithStatus(c.Request.Context(), playerID)
	if err != nil {
		response.InternalServerError(c, "Failed to get achievements")
		return
	}

	responseData := make([]AchievementWithStatusResponse, len(achievements))
	for i, a := range achievements {
		responseData[i] = AchievementWithStatusResponse{
			ID:               a.Achievement.ID,
			Name:             a.Achievement.Name,
			Description:      a.Achievement.Description,
			Icon:             a.Achievement.Icon,
			Rarity:           string(a.Achievement.Rarity),
			RewardGold:       a.Achievement.RewardGold,
			RequirementType:  a.Achievement.RequirementType,
			RequirementValue: a.Achievement.RequirementValue,
			Unlocked:         a.Unlocked,
			UnlockedAt:       a.UnlockedAt,
		}
	}

	response.OK(c, responseData)
}
