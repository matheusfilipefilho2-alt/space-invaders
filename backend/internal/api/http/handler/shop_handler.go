package handler

import (
	"errors"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/external"
)

type ShopHandler struct {
	shopService *service.ShopService
}

func NewShopHandler(shopService *service.ShopService) *ShopHandler {
	return &ShopHandler{
		shopService: shopService,
	}
}

// PackageResponse represents a Gold package
type PackageResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	GoldAmount   uint64 `json:"goldAmount"`
	PriceInCents uint64 `json:"priceInCents"`
	PriceDisplay string `json:"priceDisplay"` // e.g., "R$ 5,00"
}

// OrderResponse represents an order
type OrderResponse struct {
	ID         uint   `json:"id"`
	PlayerID   uint   `json:"playerId"`
	PackageID  string `json:"packageId"`
	Amount     uint64 `json:"amount"`
	GoldAmount uint64 `json:"goldAmount"`
	Status     string `json:"status"`
	PixCode    string `json:"pixCode,omitempty"`
	QRCodeURL  string `json:"qrCodeUrl,omitempty"`
	PaymentURL string `json:"paymentUrl,omitempty"`
	ExpiresAt  string `json:"expiresAt,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

// CreateOrderRequest represents the request to create an order
type CreateOrderRequest struct {
	PackageID string `json:"packageId" binding:"required"`
}

// ListItems handles GET /api/v1/shop/items
// @Summary List all shop items
// @Description Get all active shop items from the catalog
// @Tags shop
// @Produce json
// @Success 200 {object} response.SuccessResponse{data=[]entity.Item}
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/shop/items [get]
func (h *ShopHandler) ListItems(c *gin.Context) {
	items, err := h.shopService.GetItems(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to fetch shop items")
		return
	}

	response.OK(c, items)
}

// ListPackages handles GET /api/v1/shop/packages
// @Summary List available Gold packages
// @Description Get all available Gold packages for purchase
// @Tags shop
// @Produce json
// @Success 200 {object} response.SuccessResponse{data=[]PackageResponse}
// @Router /api/v1/shop/packages [get]
func (h *ShopHandler) ListPackages(c *gin.Context) {
	packages := h.shopService.GetPackages()

	packageResponses := make([]PackageResponse, len(packages))
	for i, pkg := range packages {
		packageResponses[i] = PackageResponse{
			ID:           pkg.ID,
			Name:         pkg.Name,
			Description:  pkg.Description,
			GoldAmount:   pkg.GoldAmount,
			PriceInCents: pkg.PriceInCents,
			PriceDisplay: formatPrice(pkg.PriceInCents),
		}
	}

	response.OK(c, packageResponses)
}

// CreateOrder handles POST /api/v1/shop/orders
// @Summary Create a new order
// @Description Create a PIX payment order for a Gold package
// @Tags shop
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateOrderRequest true "Order creation request"
// @Success 200 {object} response.SuccessResponse{data=OrderResponse}
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/shop/orders [post]
func (h *ShopHandler) CreateOrder(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Failed to bind JSON: %v", err)
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	log.Printf("Creating order for player %d with packageID: %s", playerID, req.PackageID)

	order, err := h.shopService.CreateOrder(c.Request.Context(), playerID, req.PackageID)
	if err != nil {
		log.Printf("Failed to create order: %v", err)
		if errors.Is(err, service.ErrInvalidPackage) {
			response.BadRequest(c, "Invalid package ID")
			return
		}
		response.InternalServerError(c, "Failed to create order")
		return
	}

	resp := orderToResponse(order)
	response.OK(c, resp)
}

// GetOrder handles GET /api/v1/shop/orders/:id
// @Summary Get order by ID
// @Description Get a specific order by ID
// @Tags shop
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Success 200 {object} response.SuccessResponse{data=OrderResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/shop/orders/{id} [get]
func (h *ShopHandler) GetOrder(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid order ID")
		return
	}

	order, err := h.shopService.GetOrder(c.Request.Context(), uint(orderID))
	if err != nil {
		if errors.Is(err, service.ErrOrderNotFound) {
			response.NotFound(c, "Order not found")
			return
		}
		response.InternalServerError(c, "Failed to fetch order")
		return
	}

	// Verify the order belongs to the requesting player
	if order.PlayerID != playerID {
		response.Forbidden(c, "You don't have permission to view this order")
		return
	}

	resp := orderToResponse(order)
	response.OK(c, resp)
}

// GetPlayerOrders handles GET /api/v1/shop/orders
// @Summary Get player's orders
// @Description Get all orders for the authenticated player
// @Tags shop
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Limit results" default(10)
// @Param offset query int false "Offset results" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]OrderResponse}
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/shop/orders [get]
func (h *ShopHandler) GetPlayerOrders(c *gin.Context) {
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

	orders, err := h.shopService.GetPlayerOrders(c.Request.Context(), playerID, limit, offset)
	if err != nil {
		response.InternalServerError(c, "Failed to fetch orders")
		return
	}

	orderResponses := make([]OrderResponse, len(orders))
	for i, order := range orders {
		orderResponses[i] = orderToResponse(&order)
	}

	response.OK(c, orderResponses)
}

// AbacatePayWebhook handles POST /webhooks/abacatepay
// @Summary AbacatePay payment webhook
// @Description Webhook endpoint for AbacatePay payment notifications
// @Tags webhooks
// @Accept json
// @Produce json
// @Param payload body external.WebhookPayload true "Webhook payload"
// @Success 200 {object} map[string]string
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /webhooks/abacatepay [post]
func (h *ShopHandler) AbacatePayWebhook(c *gin.Context) {
	// TODO: Validate webhook signature
	// bodyBytes, err := io.ReadAll(c.Request.Body)
	// if err != nil {
	//     response.BadRequest(c, "Failed to read request body")
	//     return
	// }
	// signature := c.GetHeader("X-AbacatePay-Signature")
	// if !h.abacatePayClient.ValidateWebhook(bodyBytes, signature) {
	//     response.Unauthorized(c, "Invalid webhook signature")
	//     return
	// }

	var webhook external.WebhookPayload
	if err := c.ShouldBindJSON(&webhook); err != nil {
		response.BadRequest(c, "Invalid webhook payload: "+err.Error())
		return
	}

	if err := h.shopService.ProcessPaymentWebhook(c.Request.Context(), &webhook); err != nil {
		if errors.Is(err, service.ErrOrderNotFound) {
			response.NotFound(c, "Order not found")
			return
		}
		response.InternalServerError(c, "Failed to process webhook")
		return
	}

	response.OK(c, gin.H{"message": "Webhook processed successfully"})
}

// SimulatePayment simulates a payment for testing (development only)
// @Summary Simulate payment for testing
// @Description Simulates a payment confirmation for a pending order (development/testing only)
// @Tags shop
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Success 200 {object} response.SuccessResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/shop/orders/{id}/simulate-payment [post]
func (h *ShopHandler) SimulatePayment(c *gin.Context) {
	playerID, ok := middleware.GetPlayerID(c)
	if !ok {
		response.Unauthorized(c, "Player ID not found in context")
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "Invalid order ID")
		return
	}

	// Get order and verify ownership
	order, err := h.shopService.GetOrder(c.Request.Context(), uint(orderID))
	if err != nil {
		if errors.Is(err, service.ErrOrderNotFound) {
			response.NotFound(c, "Order not found")
			return
		}
		response.InternalServerError(c, "Failed to fetch order")
		return
	}

	// Verify the order belongs to the requesting player
	if order.PlayerID != playerID {
		response.Forbidden(c, "You don't have permission to simulate payment for this order")
		return
	}

	// Simulate webhook payload
	now := time.Now()
	webhook := &external.WebhookPayload{
		Event: "order.paid",
	}
	webhook.Data.ID = order.ExternalID
	webhook.Data.Status = "PAID"
	webhook.Data.Amount = order.Amount
	webhook.Data.ExternalID = order.ExternalID
	webhook.Data.PaidAt = &now

	// Process the simulated webhook
	if err := h.shopService.ProcessPaymentWebhook(c.Request.Context(), webhook); err != nil {
		if errors.Is(err, service.ErrOrderNotFound) {
			response.NotFound(c, "Order not found")
			return
		}
		if errors.Is(err, service.ErrOrderPaid) {
			response.BadRequest(c, "Order already paid")
			return
		}
		response.InternalServerError(c, "Failed to process simulated payment")
		return
	}

	response.OK(c, gin.H{
		"message": "Payment simulated successfully",
		"orderId": orderID,
	})
}

// Helper functions

func formatPrice(cents uint64) string {
	reais := cents / 100
	centavos := cents % 100
	return "R$ " + strconv.FormatUint(reais, 10) + "," + padZero(centavos)
}

func padZero(n uint64) string {
	if n < 10 {
		return "0" + strconv.FormatUint(n, 10)
	}
	return strconv.FormatUint(n, 10)
}

func orderToResponse(order *entity.Order) OrderResponse {
	resp := OrderResponse{
		ID:         order.ID,
		PlayerID:   order.PlayerID,
		PackageID:  order.PackageID,
		Amount:     order.Amount,
		GoldAmount: order.GoldAmount,
		Status:     string(order.Status),
		PixCode:    order.PixCode,
		QRCodeURL:  order.QRCodeURL,
		PaymentURL: order.PaymentURL,
		CreatedAt:  order.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if order.ExpiresAt != nil {
		resp.ExpiresAt = order.ExpiresAt.Format("2006-01-02T15:04:05Z07:00")
	}

	return resp
}
