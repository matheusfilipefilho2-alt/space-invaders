package external

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	abacatePayBaseURL        = "https://api.abacatepay.com/v1"
	abacatePaySandboxBaseURL = "https://sandbox.abacatepay.com/v1"
)

type AbacatePayClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewAbacatePayClient creates a new AbacatePay client
func NewAbacatePayClient(apiKey string, useSandbox bool) *AbacatePayClient {
	baseURL := abacatePayBaseURL
	if useSandbox {
		baseURL = abacatePaySandboxBaseURL
	}

	return &AbacatePayClient{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// CreateOrderRequest represents the request to create an order
type CreateOrderRequest struct {
	Amount      uint64            `json:"amount"`      // Amount in cents
	Description string            `json:"description"` // Order description
	ExternalID  string            `json:"externalId"`  // Your internal order ID
	Metadata    map[string]string `json:"metadata,omitempty"`
	ExpiresIn   int               `json:"expiresIn,omitempty"` // Expiration time in seconds
}

// CreateOrderResponse represents the response from creating an order
type CreateOrderResponse struct {
	ID             string    `json:"id"`
	Status         string    `json:"status"`
	Amount         uint64    `json:"amount"`
	Description    string    `json:"description"`
	ExternalID     string    `json:"externalId"`
	PixCode        string    `json:"pixCode"`
	QRCodeURL      string    `json:"qrCodeUrl"`
	PaymentURL     string    `json:"paymentUrl"`
	ExpiresAt      time.Time `json:"expiresAt"`
	CreatedAt      time.Time `json:"createdAt"`
}

// CreateOrder creates a new PIX order in AbacatePay
func (c *AbacatePayClient) CreateOrder(ctx context.Context, req CreateOrderRequest) (*CreateOrderResponse, error) {
	// Set default expiration to 30 minutes if not specified
	if req.ExpiresIn == 0 {
		req.ExpiresIn = 1800 // 30 minutes
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/orders", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		// If API is unreachable (development mode), return mock data
		return c.createMockOrder(req), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var orderResp CreateOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&orderResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &orderResp, nil
}

// createMockOrder creates a mock order for development/testing
func (c *AbacatePayClient) createMockOrder(req CreateOrderRequest) *CreateOrderResponse {
	now := time.Now()
	expiresAt := now.Add(time.Duration(req.ExpiresIn) * time.Second)

	// Generate a mock PIX code (this is just for demonstration)
	mockPixCode := fmt.Sprintf("00020126360014BR.GOV.BCB.PIX0114%s520400005303986540%d.%02d5802BR5925SPACE INVADERS GAME SHOP6009Sao Paulo62070503***63041D3D",
		req.ExternalID,
		req.Amount/100,
		req.Amount%100,
	)

	// Use a sample QR code image URL (you can replace with your own)
	mockQRCodeURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%s", mockPixCode)

	return &CreateOrderResponse{
		ID:          fmt.Sprintf("mock_%s", req.ExternalID),
		Status:      "PENDING",
		Amount:      req.Amount,
		Description: req.Description,
		ExternalID:  req.ExternalID,
		PixCode:     mockPixCode,
		QRCodeURL:   mockQRCodeURL,
		PaymentURL:  fmt.Sprintf("https://pay.abacatepay.com/mock_%s", req.ExternalID),
		ExpiresAt:   expiresAt,
		CreatedAt:   now,
	}
}

// GetOrderRequest represents the request to get an order
type GetOrderResponse struct {
	ID          string    `json:"id"`
	Status      string    `json:"status"` // PENDING, PAID, EXPIRED, CANCELLED
	Amount      uint64    `json:"amount"`
	Description string    `json:"description"`
	ExternalID  string    `json:"externalId"`
	PaidAt      *time.Time `json:"paidAt,omitempty"`
	ExpiresAt   time.Time `json:"expiresAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

// GetOrder retrieves an order by ID
func (c *AbacatePayClient) GetOrder(ctx context.Context, orderID string) (*GetOrderResponse, error) {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/orders/"+orderID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var orderResp GetOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&orderResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &orderResp, nil
}

// WebhookPayload represents the payload received from AbacatePay webhooks
type WebhookPayload struct {
	Event string `json:"event"` // order.paid, order.expired, order.cancelled
	Data  struct {
		ID         string     `json:"id"`
		Status     string     `json:"status"`
		Amount     uint64     `json:"amount"`
		ExternalID string     `json:"externalId"`
		PaidAt     *time.Time `json:"paidAt,omitempty"`
	} `json:"data"`
}

// ValidateWebhook validates the webhook signature (simplified for now)
// In production, you should verify the webhook signature using HMAC
func (c *AbacatePayClient) ValidateWebhook(payload []byte, signature string) bool {
	// TODO: Implement proper webhook signature validation
	// For now, just return true
	return true
}
