package handler

import (
	"errors"
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
