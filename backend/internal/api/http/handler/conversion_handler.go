package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/service"
)

type ConversionHandler struct {
	conversionService *service.ConversionService
}

func NewConversionHandler(conversionService *service.ConversionService) *ConversionHandler {
	return &ConversionHandler{
		conversionService: conversionService,
	}
}

// ConvertGoldRequest represents the request to convert Gold to SPACE
type ConvertGoldRequest struct {
	GoldAmount uint64 `json:"goldAmount" binding:"required,min=1"`
}

// ConversionResponse represents a conversion record
type ConversionResponse struct {
	ID           uint    `json:"id"`
	PlayerID     uint    `json:"playerId"`
	GoldAmount   uint64  `json:"goldAmount"`
	SpaceAmount  uint64  `json:"spaceAmount"`
	ExchangeRate uint    `json:"exchangeRate"`
	Status       string  `json:"status"`
	TxSignature  *string `json:"txSignature,omitempty"`
	CreatedAt    string  `json:"createdAt"`
}

// ConvertGoldToSpace handles POST /api/v1/conversions
// @Summary Convert Gold to SPACE tokens
// @Description Convert player's Gold balance to SPACE tokens (one-way, irreversible)
// @Tags conversions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body ConvertGoldRequest true "Conversion request"
// @Success 200 {object} response.SuccessResponse{data=ConversionResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/conversions [post]
func (h *ConversionHandler) ConvertGoldToSpace(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	var req ConvertGoldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	conversion, err := h.conversionService.ConvertGoldToSpace(c.Request.Context(), playerID, req.GoldAmount)
	if err != nil {
		if errors.Is(err, service.ErrInsufficientGold) {
			response.BadRequest(c, "Insufficient gold balance")
			return
		}
		if errors.Is(err, service.ErrInvalidAmount) {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, "Failed to process conversion")
		return
	}

	resp := ConversionResponse{
		ID:           conversion.ID,
		PlayerID:     conversion.PlayerID,
		GoldAmount:   conversion.GoldAmount,
		SpaceAmount:  conversion.SpaceAmount,
		ExchangeRate: conversion.ExchangeRate,
		Status:       string(conversion.Status),
		TxSignature:  conversion.TxSignature,
		CreatedAt:    conversion.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.OK(c, resp)
}

// GetConversionHistory handles GET /api/v1/conversions/history
// @Summary Get conversion history
// @Description Get conversion history for the authenticated player
// @Tags conversions
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Limit results" default(10)
// @Param offset query int false "Offset results" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]ConversionResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/conversions/history [get]
func (h *ConversionHandler) GetConversionHistory(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	limit := 10
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	conversions, err := h.conversionService.GetPlayerConversions(c.Request.Context(), playerID, limit, offset)
	if err != nil {
		response.InternalServerError(c, "Failed to fetch conversion history")
		return
	}

	conversionResponses := make([]ConversionResponse, len(conversions))
	for i, conv := range conversions {
		conversionResponses[i] = ConversionResponse{
			ID:           conv.ID,
			PlayerID:     conv.PlayerID,
			GoldAmount:   conv.GoldAmount,
			SpaceAmount:  conv.SpaceAmount,
			ExchangeRate: conv.ExchangeRate,
			Status:       string(conv.Status),
			TxSignature:  conv.TxSignature,
			CreatedAt:    conv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	response.OK(c, conversionResponses)
}

// GetConversion handles GET /api/v1/conversions/:id
// @Summary Get conversion by ID
// @Description Get a specific conversion by ID
// @Tags conversions
// @Produce json
// @Security BearerAuth
// @Param id path int true "Conversion ID"
// @Success 200 {object} response.SuccessResponse{data=ConversionResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/conversions/{id} [get]
func (h *ConversionHandler) GetConversion(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	conversionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid conversion ID")
		return
	}

	conversion, err := h.conversionService.GetConversion(c.Request.Context(), uint(conversionID))
	if err != nil {
		if errors.Is(err, service.ErrConversionNotFound) {
			response.NotFound(c, "Conversion not found")
			return
		}
		response.InternalServerError(c, "Failed to fetch conversion")
		return
	}

	// Verify the conversion belongs to the requesting player
	if conversion.PlayerID != playerID {
		response.Forbidden(c, "You don't have permission to view this conversion")
		return
	}

	resp := ConversionResponse{
		ID:           conversion.ID,
		PlayerID:     conversion.PlayerID,
		GoldAmount:   conversion.GoldAmount,
		SpaceAmount:  conversion.SpaceAmount,
		ExchangeRate: conversion.ExchangeRate,
		Status:       string(conversion.Status),
		TxSignature:  conversion.TxSignature,
		CreatedAt:    conversion.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.OK(c, resp)
}
