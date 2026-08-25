package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type TreasuryHandler struct {
	emissionService *service.EmissionCalculatorService
}

func NewTreasuryHandler(emissionService *service.EmissionCalculatorService) *TreasuryHandler {
	return &TreasuryHandler{
		emissionService: emissionService,
	}
}

// TreasuryConfigResponse represents treasury configuration
type TreasuryConfigResponse struct {
	ConversionRatio     uint64  `json:"conversionRatio"`
	RevenueSharePercent float64 `json:"revenueSharePercent"`
	TreasuryWallet      string  `json:"treasuryWallet"`
	MinEmissionPerDay   uint64  `json:"minEmissionPerDay"`
	MaxEmissionPerDay   uint64  `json:"maxEmissionPerDay"`
}

// DailyEmissionResponse represents a daily emission record
type DailyEmissionResponse struct {
	ID                uint   `json:"id"`
	Date              string `json:"date"`
	GameplayRewards   uint64 `json:"gameplayRewards"`
	PixRevenue24h     uint64 `json:"pixRevenue24h"`
	SpacePrice        uint64 `json:"spacePrice"`
	EmissionLimit     uint64 `json:"emissionLimit"`
	EmissionUsed      uint64 `json:"emissionUsed"`
	EmissionAvailable uint64 `json:"emissionAvailable"`
	Executed          bool   `json:"executed"`
	TxHash            string `json:"txHash,omitempty"`
	CreatedAt         string `json:"createdAt"`
}

// ManualEmissionRequest represents a manual emission trigger request
type ManualEmissionRequest struct {
	GameplayRewards uint64 `json:"gameplayRewards" binding:"required"`
	Revenue24h      uint64 `json:"revenue24h" binding:"required"`
	Date            string `json:"date"` // Optional, defaults to today
}

// GetConfig handles GET /api/admin/treasury/config
// @Summary Get treasury configuration
// @Description Get current treasury configuration and emission rules
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.SuccessResponse{data=TreasuryConfigResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/admin/treasury/config [get]
func (h *TreasuryHandler) GetConfig(c *gin.Context) {
	config, err := h.emissionService.GetTreasuryConfig(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to get treasury config")
		return
	}

	resp := TreasuryConfigResponse{
		ConversionRatio:     config.ConversionRatio,
		RevenueSharePercent: config.RevenueSharePercent,
		TreasuryWallet:      config.TreasuryWalletPubkey,
		MinEmissionPerDay:   config.MinEmissionPerDay,
		MaxEmissionPerDay:   config.MaxEmissionPerDay,
	}

	response.OK(c, resp)
}

// GetEmissionHistory handles GET /api/admin/treasury/emissions
// @Summary Get emission history
// @Description Get daily emission history with optional date range filtering
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Param limit query int false "Limit results" default(30)
// @Success 200 {object} response.SuccessResponse{data=[]DailyEmissionResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/admin/treasury/emissions [get]
func (h *TreasuryHandler) GetEmissionHistory(c *gin.Context) {
	// Parse date range
	var startDate, endDate time.Time
	var err error

	if startDateStr := c.Query("startDate"); startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid startDate format (use YYYY-MM-DD)")
			return
		}
	} else {
		// Default: 30 days ago
		startDate = time.Now().UTC().AddDate(0, 0, -30).Truncate(24 * time.Hour)
	}

	if endDateStr := c.Query("endDate"); endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid endDate format (use YYYY-MM-DD)")
			return
		}
	} else {
		// Default: today
		endDate = time.Now().UTC().Truncate(24 * time.Hour)
	}

	// Parse limit
	limit := 30
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 365 {
			limit = parsedLimit
		}
	}

	// Get history
	emissions, err := h.emissionService.GetEmissionHistory(c.Request.Context(), startDate, endDate, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to get emission history")
		return
	}

	// Convert to response format
	emissionResponses := make([]DailyEmissionResponse, len(emissions))
	for i, emission := range emissions {
		emissionResponses[i] = DailyEmissionResponse{
			ID:                emission.ID,
			Date:              emission.Date.Format("2006-01-02"),
			GameplayRewards:   emission.GameplayRewards,
			PixRevenue24h:     emission.PixRevenue24h,
			SpacePrice:        emission.SpacePrice,
			EmissionLimit:     emission.EmissionLimit,
			EmissionUsed:      emission.EmissionUsed,
			EmissionAvailable: emission.EmissionAvailable,
			Executed:          emission.Executed,
			TxHash:            emission.TxHash,
			CreatedAt:         emission.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	response.OK(c, emissionResponses)
}

// TriggerManualEmission handles POST /api/admin/treasury/manual-emission
// @Summary Trigger manual emission calculation
// @Description Manually calculate daily SPACE emission (for testing/admin purposes)
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body ManualEmissionRequest true "Manual emission parameters"
// @Success 200 {object} response.SuccessResponse{data=DailyEmissionResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/admin/treasury/manual-emission [post]
func (h *TreasuryHandler) TriggerManualEmission(c *gin.Context) {
	var req ManualEmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// Parse date or use today
	var emissionDate time.Time
	var err error

	if req.Date != "" {
		emissionDate, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			response.BadRequest(c, "Invalid date format (use YYYY-MM-DD)")
			return
		}
	} else {
		emissionDate = time.Now().UTC()
	}

	// Truncate to day
	emissionDate = emissionDate.Truncate(24 * time.Hour)

	// Calculate emission
	emission, err := h.emissionService.CalculateDailyEmission(
		c.Request.Context(),
		req.GameplayRewards,
		req.Revenue24h,
		emissionDate,
	)
	if err != nil {
		response.InternalServerError(c, "Failed to calculate emission: "+err.Error())
		return
	}

	// Save emission record
	if err := h.emissionService.SaveDailyEmission(c.Request.Context(), emission); err != nil {
		response.InternalServerError(c, "Failed to save emission record: "+err.Error())
		return
	}

	resp := DailyEmissionResponse{
		ID:                emission.ID,
		Date:              emission.Date.Format("2006-01-02"),
		GameplayRewards:   emission.GameplayRewards,
		PixRevenue24h:     emission.PixRevenue24h,
		SpacePrice:        emission.SpacePrice,
		EmissionLimit:     emission.EmissionLimit,
		EmissionUsed:      emission.EmissionUsed,
		EmissionAvailable: emission.EmissionAvailable,
		Executed:          emission.Executed,
		TxHash:            emission.TxHash,
		CreatedAt:         emission.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.OK(c, resp)
}
