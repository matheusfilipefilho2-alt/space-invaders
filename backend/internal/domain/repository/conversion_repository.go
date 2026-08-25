package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

// ConversionRepository defines the interface for Gold/SPACE conversion operations
type ConversionRepository interface {
	// Create creates a new conversion record
	Create(ctx context.Context, conversion *entity.GoldSpaceConversion) error

	// FindByID retrieves a conversion by ID
	FindByID(ctx context.Context, id uint) (*entity.GoldSpaceConversion, error)

	// ListByPlayerID retrieves conversion history for a player
	ListByPlayerID(ctx context.Context, playerID uint, limit, offset int) ([]entity.GoldSpaceConversion, error)

	// Update updates a conversion record (for status changes)
	Update(ctx context.Context, conversion *entity.GoldSpaceConversion) error

	// FindByTxSignature finds a conversion by its Solana transaction signature
	FindByTxSignature(ctx context.Context, txSignature string) (*entity.GoldSpaceConversion, error)

	// ListPending retrieves all pending conversions
	ListPending(ctx context.Context, limit int) ([]entity.GoldSpaceConversion, error)
}
