package repository

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

type NFTRepository interface {
	// Create creates a new NFT record
	Create(ctx context.Context, nft *entity.NFT) error

	// FindByID finds an NFT by its ID
	FindByID(ctx context.Context, id uint) (*entity.NFT, error)

	// FindByMintAddress finds an NFT by its Solana mint address
	FindByMintAddress(ctx context.Context, mintAddress string) (*entity.NFT, error)

	// ListByPlayerID returns all NFTs owned by a player
	ListByPlayerID(ctx context.Context, playerID uint) ([]entity.NFT, error)

	// UpdateStatus updates the minting status of an NFT
	UpdateStatus(ctx context.Context, id uint, status, mintAddress, txHash string) error

	// Update updates an existing NFT
	Update(ctx context.Context, nft *entity.NFT) error
}
