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
	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/api/http/handler"
	"github.com/yourusername/space-invaders/internal/api/http/router"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/cache"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"github.com/yourusername/space-invaders/internal/infra/external"
	"gorm.io/gorm"
)

// TestConversionFlow_EndToEnd tests the complete conversion flow:
// 1. Register player
// 2. Login and get JWT token
// 3. Add Gold to player account (simulate gameplay)
// 4. Convert Gold to SPACE
// 5. Verify conversion record created
// 6. Verify Gold balance updated
// 7. Check conversion history
// 8. Get conversion by ID
func TestConversionFlow_EndToEnd(t *testing.T) {
	// Setup test environment
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Step 1: Register a new player
	registerResp := testServer.register(t, "testplayer", "test@example.com", "password123")
	require.NotNil(t, registerResp)
	assert.Equal(t, "testplayer", registerResp.Player.Username)

	// Step 2: Login to get JWT token
	loginResp := testServer.login(t, "test@example.com", "password123")
	require.NotEmpty(t, loginResp.Token)
	token := loginResp.Token

	// Step 3: Add Gold to player (simulate gameplay rewards)
	playerID := loginResp.Player.ID
	testServer.addGoldToPlayer(t, playerID, 5000)

	// Verify Gold balance
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(5000), player.GoldBalance)
	assert.Equal(t, uint64(0), player.SpaceBalance)

	// Step 4: Convert 1000 Gold to SPACE (should get 10 SPACE = 10,000,000,000 lamports)
	conversion := testServer.convertGoldToSpace(t, token, 1000)
	require.NotNil(t, conversion)
	assert.Equal(t, playerID, conversion.PlayerID)
	assert.Equal(t, uint64(1000), conversion.GoldAmount)
	assert.Equal(t, uint64(10_000_000_000), conversion.SpaceAmount) // 10 SPACE in lamports
	assert.Equal(t, "pending", conversion.Status)

	// Step 5: Verify Gold was deducted
	player = testServer.getPlayer(t, token)
	assert.Equal(t, uint64(4000), player.GoldBalance) // 5000 - 1000 = 4000

	// Step 6: Get conversion history
	history := testServer.getConversionHistory(t, token, 10, 0)
	require.Len(t, history, 1)
	assert.Equal(t, conversion.ID, history[0].ID)

	// Step 7: Get conversion by ID
	conversionByID := testServer.getConversionByID(t, token, conversion.ID)
	assert.Equal(t, conversion.ID, conversionByID.ID)
	assert.Equal(t, conversion.GoldAmount, conversionByID.GoldAmount)
	assert.Equal(t, conversion.SpaceAmount, conversionByID.SpaceAmount)
}

// TestConversionFlow_InsufficientGold tests conversion with insufficient Gold
func TestConversionFlow_InsufficientGold(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "poorplayer", "poor@example.com", "password123")
	loginResp := testServer.login(t, "poor@example.com", "password123")
	token := loginResp.Token

	// Player has 0 Gold, try to convert 1000
	resp := testServer.convertGoldToSpaceRaw(t, token, 1000)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errorResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&errorResp)
	assert.False(t, errorResp["success"].(bool))
}

// TestConversionFlow_BelowMinimum tests conversion below minimum amount
func TestConversionFlow_BelowMinimum(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "smallplayer", "small@example.com", "password123")
	loginResp := testServer.login(t, "small@example.com", "password123")
	token := loginResp.Token
	playerID := loginResp.Player.ID

	// Add 200 Gold
	testServer.addGoldToPlayer(t, playerID, 200)

	// Try to convert 50 Gold (below minimum of 100)
	resp := testServer.convertGoldToSpaceRaw(t, token, 50)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errorResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&errorResp)
	assert.False(t, errorResp["success"].(bool))
	assert.Contains(t, errorResp["error"].(map[string]interface{})["message"], "minimum")
}

// TestConversionFlow_MultipleConversions tests multiple conversions in sequence
func TestConversionFlow_MultipleConversions(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "richplayer", "rich@example.com", "password123")
	loginResp := testServer.login(t, "rich@example.com", "password123")
	token := loginResp.Token
	playerID := loginResp.Player.ID

	// Add 10,000 Gold
	testServer.addGoldToPlayer(t, playerID, 10000)

	// First conversion: 1000 Gold
	conversion1 := testServer.convertGoldToSpace(t, token, 1000)
	assert.Equal(t, uint64(1000), conversion1.GoldAmount)

	// Second conversion: 2000 Gold
	conversion2 := testServer.convertGoldToSpace(t, token, 2000)
	assert.Equal(t, uint64(2000), conversion2.GoldAmount)

	// Third conversion: 3000 Gold
	conversion3 := testServer.convertGoldToSpace(t, token, 3000)
	assert.Equal(t, uint64(3000), conversion3.GoldAmount)

	// Verify Gold balance: 10000 - 1000 - 2000 - 3000 = 4000
	player := testServer.getPlayer(t, token)
	assert.Equal(t, uint64(4000), player.GoldBalance)

	// Verify conversion history shows all 3
	history := testServer.getConversionHistory(t, token, 10, 0)
	require.Len(t, history, 3)

	// Verify they're in descending order (most recent first)
	assert.Equal(t, conversion3.ID, history[0].ID)
	assert.Equal(t, conversion2.ID, history[1].ID)
	assert.Equal(t, conversion1.ID, history[2].ID)
}

// TestConversionFlow_Pagination tests conversion history pagination
func TestConversionFlow_Pagination(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register and login
	testServer.register(t, "paginationplayer", "pagination@example.com", "password123")
	loginResp := testServer.login(t, "pagination@example.com", "password123")
	token := loginResp.Token
	playerID := loginResp.Player.ID

	// Add 10,000 Gold
	testServer.addGoldToPlayer(t, playerID, 10000)

	// Create 5 conversions
	for i := 0; i < 5; i++ {
		testServer.convertGoldToSpace(t, token, 100)
		time.Sleep(10 * time.Millisecond) // Ensure different timestamps
	}

	// Test pagination: first page (limit 2, offset 0)
	page1 := testServer.getConversionHistory(t, token, 2, 0)
	require.Len(t, page1, 2)

	// Test pagination: second page (limit 2, offset 2)
	page2 := testServer.getConversionHistory(t, token, 2, 2)
	require.Len(t, page2, 2)

	// Test pagination: third page (limit 2, offset 4)
	page3 := testServer.getConversionHistory(t, token, 2, 4)
	require.Len(t, page3, 1) // Only 1 remaining

	// Verify no duplicates between pages
	assert.NotEqual(t, page1[0].ID, page2[0].ID)
	assert.NotEqual(t, page2[0].ID, page3[0].ID)
}

// TestConversionFlow_UnauthorizedAccess tests accessing other player's conversions
func TestConversionFlow_UnauthorizedAccess(t *testing.T) {
	testServer := setupTestServer(t)
	defer testServer.cleanup()

	// Register two players
	testServer.register(t, "player1", "player1@example.com", "password123")
	testServer.register(t, "player2", "player2@example.com", "password123")

	// Login as player1
	login1 := testServer.login(t, "player1@example.com", "password123")
	token1 := login1.Token
	playerID1 := login1.Player.ID

	// Login as player2
	login2 := testServer.login(t, "player2@example.com", "password123")
	token2 := login2.Token

	// Add Gold and create conversion for player1
	testServer.addGoldToPlayer(t, playerID1, 1000)
	conversion1 := testServer.convertGoldToSpace(t, token1, 500)

	// Try to access player1's conversion using player2's token
	resp := testServer.getConversionByIDRaw(t, token2, conversion1.ID)
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

// Test Server Helper Struct
type testServer struct {
	router       *router.Router
	db           *gorm.DB
	t            *testing.T
	baseURL      string
	httpRecorder *httptest.ResponseRecorder
}

func setupTestServer(t *testing.T) *testServer {
	// Setup test database
	dbURL := configs.GetDatabaseURL()
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/space_invaders_test?sslmode=disable"
	}

	db, err := database.NewPostgresConnection(dbURL)
	require.NoError(t, err)

	// Auto-migrate schema
	require.NoError(t, database.AutoMigrateAll(db))

	// Clean up any existing test data
	db.Exec("DELETE FROM gold_space_conversions")
	db.Exec("DELETE FROM players WHERE email LIKE '%@example.com'")

	// Initialize repositories
	playerRepo := database.NewPlayerRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	achievementRepo := database.NewAchievementRepository(db)
	playerAchievementRepo := database.NewPlayerAchievementRepository(db)
	itemRepo := database.NewItemRepository(db)
	playerItemRepo := database.NewPlayerItemRepository(db)
	orderRepo := database.NewOrderRepository(db)

	// Initialize Redis (if available, otherwise skip)
	redisClient, _ := cache.NewRedisClient()

	// Initialize external clients
	abacatePayClient := external.NewAbacatePayClient("test_key", true)

	// Initialize price fetcher
	var priceFetcher *external.CachedPriceFetcher
	if redisClient != nil {
		priceFetcher = external.NewCachedPriceFetcher(redisClient)
	}

	// Initialize services
	jwtSecret := "test-jwt-secret-key-for-e2e-tests"
	authService := service.NewAuthService(playerRepo, jwtSecret)
	playerService := service.NewPlayerService(playerRepo)
	gameService := service.NewGameService(playerRepo)
	achievementService := service.NewAchievementService(achievementRepo, playerRepo, playerAchievementRepo)
	itemService := service.NewItemService(itemRepo, playerItemRepo, playerRepo)
	leaderboardService := service.NewLeaderboardService(playerRepo)
	conversionService := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	shopService := service.NewShopService(orderRepo, playerRepo, abacatePayClient, db)

	var emissionService *service.EmissionCalculatorService
	if priceFetcher != nil {
		emissionService = service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	}

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	playerHandler := handler.NewPlayerHandler(playerService)
	gameHandler := handler.NewGameHandler(gameService)
	achievementHandler := handler.NewAchievementHandler(achievementService)
	itemHandler := handler.NewItemHandler(itemService)
	leaderboardHandler := handler.NewLeaderboardHandler(leaderboardService)
	conversionHandler := handler.NewConversionHandler(conversionService)
	shopHandler := handler.NewShopHandler(shopService)

	var treasuryHandler *handler.TreasuryHandler
	if emissionService != nil {
		treasuryHandler = handler.NewTreasuryHandler(emissionService)
	}

	// Setup router
	r := router.NewRouter(
		authHandler,
		playerHandler,
		gameHandler,
		achievementHandler,
		itemHandler,
		leaderboardHandler,
		conversionHandler,
		shopHandler,
		treasuryHandler,
		jwtSecret,
	)
	r.Setup()

	return &testServer{
		router:  r,
		db:      db,
		t:       t,
		baseURL: "/api/v1",
	}
}

func (s *testServer) cleanup() {
	// Clean up test data
	s.db.Exec("DELETE FROM gold_space_conversions")
	s.db.Exec("DELETE FROM players WHERE email LIKE '%@example.com'")
}

// Helper methods for making requests

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterResponse struct {
	Token  string `json:"token"`
	Player struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"player"`
}

func (s *testServer) register(t *testing.T, username, email, password string) *RegisterResponse {
	reqBody, _ := json.Marshal(RegisterRequest{
		Username: username,
		Email:    email,
		Password: password,
	})

	req := httptest.NewRequest("POST", s.baseURL+"/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool              `json:"success"`
		Data    *RegisterResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	require.True(t, resp.Success)

	return resp.Data
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token  string `json:"token"`
	Player struct {
		ID           uint   `json:"id"`
		Username     string `json:"username"`
		Email        string `json:"email"`
		GoldBalance  uint64 `json:"goldBalance"`
		SpaceBalance uint64 `json:"spaceBalance"`
	} `json:"player"`
}

func (s *testServer) login(t *testing.T, email, password string) *LoginResponse {
	reqBody, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
	})

	req := httptest.NewRequest("POST", s.baseURL+"/auth/login", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool           `json:"success"`
		Data    *LoginResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	require.True(t, resp.Success)

	return resp.Data
}

func (s *testServer) addGoldToPlayer(t *testing.T, playerID uint, amount uint64) {
	result := s.db.Exec("UPDATE players SET gold_balance = gold_balance + ? WHERE id = ?", amount, playerID)
	require.NoError(t, result.Error)
}

func (s *testServer) getPlayer(t *testing.T, token string) *LoginResponse {
	req := httptest.NewRequest("GET", s.baseURL+"/players/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool           `json:"success"`
		Data    *LoginResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))

	return resp.Data
}

type ConversionRequest struct {
	GoldAmount uint64 `json:"goldAmount"`
}

type ConversionResponse struct {
	ID          uint      `json:"id"`
	PlayerID    uint      `json:"playerId"`
	GoldAmount  uint64    `json:"goldAmount"`
	SpaceAmount uint64    `json:"spaceAmount"`
	Status      string    `json:"status"`
	TxHash      string    `json:"txHash,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	CompletedAt time.Time `json:"completedAt,omitempty"`
}

func (s *testServer) convertGoldToSpace(t *testing.T, token string, goldAmount uint64) *ConversionResponse {
	resp := s.convertGoldToSpaceRaw(t, token, goldAmount)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result struct {
		Success bool                `json:"success"`
		Data    *ConversionResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.True(t, result.Success)

	return result.Data
}

func (s *testServer) convertGoldToSpaceRaw(t *testing.T, token string, goldAmount uint64) *http.Response {
	reqBody, _ := json.Marshal(ConversionRequest{GoldAmount: goldAmount})

	req := httptest.NewRequest("POST", s.baseURL+"/conversions", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	return w.Result()
}

func (s *testServer) getConversionHistory(t *testing.T, token string, limit, offset int) []ConversionResponse {
	url := fmt.Sprintf("%s/conversions/history?limit=%d&offset=%d", s.baseURL, limit, offset)
	req := httptest.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Success bool                 `json:"success"`
		Data    []ConversionResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	require.True(t, resp.Success)

	return resp.Data
}

func (s *testServer) getConversionByID(t *testing.T, token string, id uint) *ConversionResponse {
	resp := s.getConversionByIDRaw(t, token, id)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result struct {
		Success bool                `json:"success"`
		Data    *ConversionResponse `json:"data"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.True(t, result.Success)

	return result.Data
}

func (s *testServer) getConversionByIDRaw(t *testing.T, token string, id uint) *http.Response {
	url := fmt.Sprintf("%s/conversions/%d", s.baseURL, id)
	req := httptest.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	s.router.Setup().ServeHTTP(w, req)

	return w.Result()
}
