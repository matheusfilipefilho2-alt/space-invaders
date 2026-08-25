package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestShopFlow_ListPackages tests listing available Gold packages
func TestShopFlow_ListPackages(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// List packages (no auth required)
	packages := testServer.listPackages(t)

	// Verify we have the expected packages
	require.Len(t, packages, 3)

	// Verify package details
	assert.Equal(t, "gold_100", packages[0].ID)
	assert.Equal(t, "Pacote Iniciante", packages[0].Name)
	assert.Equal(t, uint64(100), packages[0].GoldAmount)
	assert.Equal(t, uint64(500), packages[0].PriceInCents)
	assert.Equal(t, "R$ 5,00", packages[0].PriceDisplay)

	assert.Equal(t, "gold_500", packages[1].ID)
	assert.Equal(t, uint64(500), packages[1].GoldAmount)
	assert.Equal(t, uint64(2000), packages[1].PriceInCents)

	assert.Equal(t, "gold_1000", packages[2].ID)
	assert.Equal(t, uint64(1000), packages[2].GoldAmount)
	assert.Equal(t, uint64(3500), packages[2].PriceInCents)
}

// TestShopFlow_CreateOrder tests creating a PIX order
func TestShopFlow_CreateOrder(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper", "shopper@example.com", "password123")
	loginResp := testServer.login(t, "shopper@example.com", "password123")
	token := loginResp.Token
	playerID := loginResp.Player.ID

	// Create order for gold_500 package
	order := testServer.createOrder(t, token, "gold_500")

	// Verify order details
	assert.Equal(t, playerID, order.PlayerID)
	assert.Equal(t, "gold_500", order.PackageID)
	assert.Equal(t, uint64(2000), order.Amount)       // R$ 20.00 in cents
	assert.Equal(t, uint64(500), order.GoldAmount)
	assert.Equal(t, "pending", order.Status)
	assert.NotEmpty(t, order.PixCode)
	assert.NotEmpty(t, order.QRCodeURL)
	assert.NotEmpty(t, order.PaymentURL)
	assert.NotZero(t, order.ExpiresAt)

	// Verify Gold not yet credited
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(0), player.GoldBalance)
}

// TestShopFlow_CreateOrderInvalidPackage tests creating order with invalid package
func TestShopFlow_CreateOrderInvalidPackage(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper2", "shopper2@example.com", "password123")
	loginResp := testServer.login(t, "shopper2@example.com", "password123")
	token := loginResp.Token

	// Try to create order with invalid package ID
	resp := testServer.createOrderRaw(t, token, "gold_invalid")
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errorResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&errorResp)
	assert.False(t, errorResp["success"].(bool))
}

// TestShopFlow_GetPlayerOrders tests retrieving player's order history
func TestShopFlow_GetPlayerOrders(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper3", "shopper3@example.com", "password123")
	loginResp := testServer.login(t, "shopper3@example.com", "password123")
	token := loginResp.Token

	// Create 3 orders
	order1 := testServer.createOrder(t, token, "gold_100")
	time.Sleep(10 * time.Millisecond)
	order2 := testServer.createOrder(t, token, "gold_500")
	time.Sleep(10 * time.Millisecond)
	order3 := testServer.createOrder(t, token, "gold_1000")

	// Get player orders
	orders := testServer.getPlayerOrders(t, token, 10, 0)

	// Verify we got all 3 orders
	require.Len(t, orders, 3)

	// Verify orders are in descending order (most recent first)
	assert.Equal(t, order3.ID, orders[0].ID)
	assert.Equal(t, order2.ID, orders[1].ID)
	assert.Equal(t, order1.ID, orders[2].ID)
}

// TestShopFlow_GetOrderByID tests retrieving specific order
func TestShopFlow_GetOrderByID(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper4", "shopper4@example.com", "password123")
	loginResp := testServer.login(t, "shopper4@example.com", "password123")
	token := loginResp.Token

	// Create order
	createdOrder := testServer.createOrder(t, token, "gold_500")

	// Get order by ID
	order := testServer.getOrderByID(t, token, createdOrder.ID)

	// Verify order details match
	assert.Equal(t, createdOrder.ID, order.ID)
	assert.Equal(t, createdOrder.PackageID, order.PackageID)
	assert.Equal(t, createdOrder.Amount, order.Amount)
	assert.Equal(t, createdOrder.GoldAmount, order.GoldAmount)
	assert.Equal(t, createdOrder.Status, order.Status)
	assert.Equal(t, createdOrder.PixCode, order.PixCode)
}

// TestShopFlow_UnauthorizedOrderAccess tests accessing another player's order
func TestShopFlow_UnauthorizedOrderAccess(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register two players
	testServer.register(t, "shopper5", "shopper5@example.com", "password123")
	testServer.register(t, "shopper6", "shopper6@example.com", "password123")

	// Login as player 1
	login1 := testServer.login(t, "shopper5@example.com", "password123")
	token1 := login1.Token

	// Login as player 2
	login2 := testServer.login(t, "shopper6@example.com", "password123")
	token2 := login2.Token

	// Create order for player 1
	order1 := testServer.createOrder(t, token1, "gold_100")

	// Try to access player 1's order using player 2's token
	resp := testServer.getOrderByIDRaw(t, token2, order1.ID)
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

// TestShopFlow_OrderPagination tests order history pagination
func TestShopFlow_OrderPagination(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper7", "shopper7@example.com", "password123")
	loginResp := testServer.login(t, "shopper7@example.com", "password123")
	token := loginResp.Token

	// Create 5 orders
	for i := 0; i < 5; i++ {
		testServer.createOrder(t, token, "gold_100")
		time.Sleep(10 * time.Millisecond)
	}

	// Test pagination: first page (limit 2, offset 0)
	page1 := testServer.getPlayerOrders(t, token, 2, 0)
	require.Len(t, page1, 2)

	// Test pagination: second page (limit 2, offset 2)
	page2 := testServer.getPlayerOrders(t, token, 2, 2)
	require.Len(t, page2, 2)

	// Test pagination: third page (limit 2, offset 4)
	page3 := testServer.getPlayerOrders(t, token, 2, 4)
	require.Len(t, page3, 1)

	// Verify no duplicates
	assert.NotEqual(t, page1[0].ID, page2[0].ID)
	assert.NotEqual(t, page2[0].ID, page3[0].ID)
}

// TestShopFlow_WebhookPaymentCompleted tests webhook processing for completed payment
func TestShopFlow_WebhookPaymentCompleted(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper8", "shopper8@example.com", "password123")
	loginResp := testServer.login(t, "shopper8@example.com", "password123")
	token := loginResp.Token
	playerID := loginResp.Player.ID

	// Create order
	order := testServer.createOrder(t, token, "gold_500")

	// Verify initial state
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(0), player.GoldBalance)

	// Simulate webhook: payment completed
	testServer.sendPaymentWebhook(t, order, "order.paid")

	// Verify order status updated
	updatedOrder := testServer.getOrderByID(t, token, order.ID)
	assert.Equal(t, "completed", updatedOrder.Status)

	// Verify Gold credited to player
	player = testServer.getPlayer(t, token)
	assert.Equal(t, uint64(500), player.GoldBalance)

	// Verify database record updated
	var dbOrder struct {
		Status      string
		CompletedAt *time.Time
	}
	testServer.db.Raw("SELECT status, completed_at FROM orders WHERE id = ?", order.ID).Scan(&dbOrder)
	assert.Equal(t, "completed", dbOrder.Status)
	assert.NotNil(t, dbOrder.CompletedAt)
}

// TestShopFlow_WebhookPaymentExpired tests webhook processing for expired payment
func TestShopFlow_WebhookPaymentExpired(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper9", "shopper9@example.com", "password123")
	loginResp := testServer.login(t, "shopper9@example.com", "password123")
	token := loginResp.Token

	// Create order
	order := testServer.createOrder(t, token, "gold_100")

	// Simulate webhook: payment expired
	testServer.sendPaymentWebhook(t, order, "order.expired")

	// Verify order status updated
	updatedOrder := testServer.getOrderByID(t, token, order.ID)
	assert.Equal(t, "expired", updatedOrder.Status)

	// Verify Gold NOT credited
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(0), player.GoldBalance)
}

// TestShopFlow_WebhookPaymentCancelled tests webhook processing for cancelled payment
func TestShopFlow_WebhookPaymentCancelled(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper10", "shopper10@example.com", "password123")
	loginResp := testServer.login(t, "shopper10@example.com", "password123")
	token := loginResp.Token

	// Create order
	order := testServer.createOrder(t, token, "gold_100")

	// Simulate webhook: payment cancelled
	testServer.sendPaymentWebhook(t, order, "order.cancelled")

	// Verify order status updated
	updatedOrder := testServer.getOrderByID(t, token, order.ID)
	assert.Equal(t, "cancelled", updatedOrder.Status)

	// Verify Gold NOT credited
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(0), player.GoldBalance)
}

// TestShopFlow_DuplicateWebhook tests duplicate webhook processing (idempotency)
func TestShopFlow_DuplicateWebhook(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "shopper11", "shopper11@example.com", "password123")
	loginResp := testServer.login(t, "shopper11@example.com", "password123")
	token := loginResp.Token

	// Create order
	order := testServer.createOrder(t, token, "gold_1000")

	// Send first webhook: payment completed
	testServer.sendPaymentWebhook(t, order, "order.paid")

	// Verify Gold credited
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(1000), player.GoldBalance)

	// Send duplicate webhook (should be idempotent)
	resp := testServer.sendPaymentWebhookRaw(t, order, "order.paid")

	// Webhook should still return success (but not double-credit)
	// The actual behavior depends on implementation, but Gold should not be doubled
	player = testServer.getPlayer(t, token)
	assert.Equal(t, uint64(1000), player.GoldBalance) // Still 1000, not 2000
}

// Helper methods for shop flow tests

type PackageResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	GoldAmount   uint64 `json:"goldAmount"`
	PriceInCents uint64 `json:"priceInCents"`
	PriceDisplay string `json:"priceDisplay"`
}

func (s *testServer) listPackages(t *testing.T) []PackageResponse {
	req := httptest.NewRequest("GET", s.baseURL+"/shop/packages", nil)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool              `json:"success"`
		Data    []PackageResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	require.True(t, resp.Success)

	return resp.Data
}

type CreateOrderRequest struct {
	PackageID string `json:"packageId"`
}

type OrderResponse struct {
	ID         uint      `json:"id"`
	PlayerID   uint      `json:"playerId"`
	PackageID  string    `json:"packageId"`
	Amount     uint64    `json:"amount"`
	GoldAmount uint64    `json:"goldAmount"`
	Status     string    `json:"status"`
	PixCode    string    `json:"pixCode,omitempty"`
	QRCodeURL  string    `json:"qrCodeUrl,omitempty"`
	PaymentURL string    `json:"paymentUrl,omitempty"`
	ExpiresAt  time.Time `json:"expiresAt,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (s *testServer) createOrder(t *testing.T, token, packageID string) *OrderResponse {
	resp := s.createOrderRaw(t, token, packageID)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result struct {
		Success bool           `json:"success"`
		Data    *OrderResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.True(t, result.Success)

	return result.Data
}

func (s *testServer) createOrderRaw(t *testing.T, token, packageID string) *http.Response {
	reqBody, _ := json.Marshal(CreateOrderRequest{PackageID: packageID})

	req := httptest.NewRequest("POST", s.baseURL+"/shop/orders", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	return w.Result()
}

func (s *testServer) getPlayerOrders(t *testing.T, token string, limit, offset int) []OrderResponse {
	url := fmt.Sprintf("%s/shop/orders?limit=%d&offset=%d", s.baseURL, limit, offset)
	req := httptest.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool            `json:"success"`
		Data    []OrderResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	require.True(t, resp.Success)

	return resp.Data
}

func (s *testServer) getOrderByID(t *testing.T, token string, orderID uint) *OrderResponse {
	resp := s.getOrderByIDRaw(t, token, orderID)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result struct {
		Success bool           `json:"success"`
		Data    *OrderResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.True(t, result.Success)

	return result.Data
}

func (s *testServer) getOrderByIDRaw(t *testing.T, token string, orderID uint) *http.Response {
	url := fmt.Sprintf("%s/shop/orders/%d", s.baseURL, orderID)
	req := httptest.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	return w.Result()
}

type WebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		ID         string     `json:"id"`
		Status     string     `json:"status"`
		Amount     uint64     `json:"amount"`
		ExternalID string     `json:"externalId"`
		PaidAt     *time.Time `json:"paidAt,omitempty"`
	} `json:"data"`
}

func (s *testServer) sendPaymentWebhook(t *testing.T, order *OrderResponse, event string) {
	resp := s.sendPaymentWebhookRaw(t, order, event)
	require.Equal(t, http.StatusOK, resp.StatusCode)
}

func (s *testServer) sendPaymentWebhookRaw(t *testing.T, order *OrderResponse, event string) *http.Response {
	now := time.Now()
	webhook := WebhookPayload{
		Event: event,
	}
	webhook.Data.ID = fmt.Sprintf("abacate_%d", order.ID)
	webhook.Data.Amount = order.Amount
	webhook.Data.ExternalID = fmt.Sprintf("order_%d_%d", order.PlayerID, order.ID)

	if event == "order.paid" {
		webhook.Data.Status = "PAID"
		webhook.Data.PaidAt = &now
	} else if event == "order.expired" {
		webhook.Data.Status = "EXPIRED"
	} else if event == "order.cancelled" {
		webhook.Data.Status = "CANCELLED"
	}

	// Update order with external_id for webhook lookup
	s.db.Exec("UPDATE orders SET external_id = ? WHERE id = ?", webhook.Data.ExternalID, order.ID)

	reqBody, _ := json.Marshal(webhook)

	req := httptest.NewRequest("POST", "/webhooks/abacatepay", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	return w.Result()
}
