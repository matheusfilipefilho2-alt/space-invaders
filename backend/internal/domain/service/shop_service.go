package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"github.com/yourusername/space-invaders/internal/infra/external"
	"gorm.io/gorm"
)

var (
	ErrInvalidPackage = errors.New("invalid package")
	ErrOrderNotFound  = errors.New("order not found")
	ErrOrderExpired   = errors.New("order expired")
	ErrOrderPaid      = errors.New("order already paid")
)

// GoldPackage represents a purchasable Gold package
type GoldPackage struct {
	ID          string
	Name        string
	Description string
	GoldAmount  uint64 // Amount of Gold
	PriceInCents uint64 // Price in cents (R$ 5.00 = 500)
}

// Available Gold packages
var GoldPackages = []GoldPackage{
	{
		ID:           "gold_100",
		Name:         "Pacote Iniciante",
		Description:  "100 Gold",
		GoldAmount:   100,
		PriceInCents: 500, // R$ 5.00
	},
	{
		ID:           "gold_500",
		Name:         "Pacote Aventureiro",
		Description:  "500 Gold",
		GoldAmount:   500,
		PriceInCents: 2000, // R$ 20.00
	},
	{
		ID:           "gold_1000",
		Name:         "Pacote Conquistador",
		Description:  "1000 Gold",
		GoldAmount:   1000,
		PriceInCents: 3500, // R$ 35.00
	},
}

type ShopService struct {
	orderRepo       repository.OrderRepository
	playerRepo      repository.PlayerRepository
	abacatePayClient *external.AbacatePayClient
	db              *gorm.DB
}

func NewShopService(
	orderRepo repository.OrderRepository,
	playerRepo repository.PlayerRepository,
	abacatePayClient *external.AbacatePayClient,
	db *gorm.DB,
) *ShopService {
	return &ShopService{
		orderRepo:       orderRepo,
		playerRepo:      playerRepo,
		abacatePayClient: abacatePayClient,
		db:              db,
	}
}

// GetPackages returns all available Gold packages from the items table
func (s *ShopService) GetPackages() []GoldPackage {
	// Fetch coin packs from items table
	var items []entity.Item
	err := s.db.
		Where("category = ?", "coin_pack").
		Where("is_active = ?", true).
		Where("deleted_at IS NULL").
		Order("price_real ASC").
		Find(&items).Error

	if err != nil {
		log.Printf("Error fetching coin packs: %v", err)
		// Fallback to hardcoded packages if DB fetch fails
		return GoldPackages
	}

	log.Printf("Found %d coin pack items", len(items))

	// Convert items to GoldPackage format
	packages := make([]GoldPackage, 0, len(items))
	for _, item := range items {
		log.Printf("Processing item: %s, priceReal=%v, coinAmount=%v", item.ID, item.PriceReal, item.CoinAmount)
		if item.PriceReal != nil && item.CoinAmount != nil {
			packages = append(packages, GoldPackage{
				ID:           item.ID,
				Name:         item.Name,
				Description:  item.Description,
				GoldAmount:   *item.CoinAmount,
				PriceInCents: uint64(*item.PriceReal * 100), // Convert BRL to cents
			})
		}
	}

	log.Printf("Returning %d packages", len(packages))

	// If no items found, return hardcoded packages
	if len(packages) == 0 {
		return GoldPackages
	}

	return packages
}

// GetItems returns all active shop items from the database
func (s *ShopService) GetItems(ctx context.Context) ([]entity.Item, error) {
	var items []entity.Item
	err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Where("deleted_at IS NULL").
		Order("category, name").
		Find(&items).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch shop items: %w", err)
	}

	return items, nil
}

// GetPackage returns a specific package by ID
func (s *ShopService) GetPackage(packageID string) (*GoldPackage, error) {
	// Try to fetch from items table first
	var item entity.Item
	err := s.db.
		Where("id = ?", packageID).
		Where("category = ?", "coin_pack").
		Where("is_active = ?", true).
		Where("deleted_at IS NULL").
		First(&item).Error

	if err == nil && item.PriceReal != nil && item.CoinAmount != nil {
		return &GoldPackage{
			ID:           item.ID,
			Name:         item.Name,
			Description:  item.Description,
			GoldAmount:   *item.CoinAmount,
			PriceInCents: uint64(*item.PriceReal * 100), // Convert BRL to cents
		}, nil
	}

	// Fallback to hardcoded packages
	for _, pkg := range GoldPackages {
		if pkg.ID == packageID {
			return &pkg, nil
		}
	}
	return nil, ErrInvalidPackage
}

// CreateOrder creates a new order for a Gold package
func (s *ShopService) CreateOrder(ctx context.Context, playerID uint, packageID string) (*entity.Order, error) {
	// Get package
	pkg, err := s.GetPackage(packageID)
	if err != nil {
		return nil, err
	}

	// Verify player exists
	_, err = s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, fmt.Errorf("failed to find player: %w", err)
	}

	// Create order in database
	order := &entity.Order{
		PlayerID:   playerID,
		PackageID:  pkg.ID,
		Amount:     pkg.PriceInCents,
		GoldAmount: pkg.GoldAmount,
		Status:     entity.OrderStatusPending,
		ExternalID: fmt.Sprintf("order_%d_%d", playerID, time.Now().Unix()),
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Create order in AbacatePay
	abacateReq := external.CreateOrderRequest{
		Amount:      pkg.PriceInCents,
		Description: fmt.Sprintf("%s - %s", pkg.Name, pkg.Description),
		ExternalID:  order.ExternalID,
		ExpiresIn:   1800, // 30 minutes
	}

	abacateResp, err := s.abacatePayClient.CreateOrder(ctx, abacateReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create AbacatePay order: %w", err)
	}

	// Update order with AbacatePay details
	order.PixCode = abacateResp.PixCode
	order.QRCodeURL = abacateResp.QRCodeURL
	order.PaymentURL = abacateResp.PaymentURL
	order.ExpiresAt = &abacateResp.ExpiresAt

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to update order: %w", err)
	}

	return order, nil
}

// GetOrder retrieves an order by ID
func (s *ShopService) GetOrder(ctx context.Context, orderID uint) (*entity.Order, error) {
	order, err := s.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return order, nil
}

// GetPlayerOrders retrieves all orders for a player
func (s *ShopService) GetPlayerOrders(ctx context.Context, playerID uint, limit, offset int) ([]entity.Order, error) {
	return s.orderRepo.FindByPlayerID(ctx, playerID, limit, offset)
}

// ProcessPaymentWebhook processes a payment webhook from AbacatePay
func (s *ShopService) ProcessPaymentWebhook(ctx context.Context, webhook *external.WebhookPayload) error {
	// Find order by external ID
	order, err := s.orderRepo.FindByExternalID(ctx, webhook.Data.ExternalID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return fmt.Errorf("failed to find order: %w", err)
	}

	// Handle different webhook events
	switch webhook.Event {
	case "order.paid":
		return s.processPaidOrder(ctx, order, webhook.Data.PaidAt)
	case "order.expired":
		return s.processExpiredOrder(ctx, order)
	case "order.cancelled":
		return s.processCancelledOrder(ctx, order)
	default:
		return fmt.Errorf("unknown webhook event: %s", webhook.Event)
	}
}

func (s *ShopService) processPaidOrder(ctx context.Context, order *entity.Order, paidAt *time.Time) error {
	// Check if already paid
	if order.Status == entity.OrderStatusCompleted {
		return ErrOrderPaid
	}

	// Use transaction to credit Gold and update order atomically
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Credit Gold to player
		err := tx.Model(&entity.Player{}).
			Where("id = ?", order.PlayerID).
			Update("gold_balance", gorm.Expr("gold_balance + ?", order.GoldAmount)).Error
		if err != nil {
			return fmt.Errorf("failed to credit gold: %w", err)
		}

		// Update order status
		order.Status = entity.OrderStatusCompleted
		order.CompletedAt = paidAt
		if err := tx.Save(order).Error; err != nil {
			return fmt.Errorf("failed to update order: %w", err)
		}

		return nil
	})
}

func (s *ShopService) processExpiredOrder(ctx context.Context, order *entity.Order) error {
	if order.Status != entity.OrderStatusPending {
		return nil // Already processed
	}

	order.Status = entity.OrderStatusExpired
	now := time.Now()
	order.ExpiresAt = &now

	return s.orderRepo.Update(ctx, order)
}

func (s *ShopService) processCancelledOrder(ctx context.Context, order *entity.Order) error {
	if order.Status != entity.OrderStatusPending {
		return nil // Already processed
	}

	order.Status = entity.OrderStatusCancelled
	return s.orderRepo.Update(ctx, order)
}
