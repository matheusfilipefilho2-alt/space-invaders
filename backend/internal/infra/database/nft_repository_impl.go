package database

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
)

type nftRepository struct {
	db *gorm.DB
}

func NewNFTRepository(db *gorm.DB) repository.NFTRepository {
	return &nftRepository{db: db}
}

func (r *nftRepository) Create(ctx context.Context, nft *entity.NFT) error {
	return r.db.WithContext(ctx).Create(nft).Error
}

func (r *nftRepository) FindByID(ctx context.Context, id uint) (*entity.NFT, error) {
	var nft entity.NFT
	err := r.db.WithContext(ctx).
		Preload("Player").
		First(&nft, id).Error
	if err != nil {
		return nil, err
	}
	return &nft, nil
}

func (r *nftRepository) FindByMintAddress(ctx context.Context, mintAddress string) (*entity.NFT, error) {
	var nft entity.NFT
	err := r.db.WithContext(ctx).
		Where("mint_address = ?", mintAddress).
		First(&nft).Error
	if err != nil {
		return nil, err
	}
	return &nft, nil
}

func (r *nftRepository) ListByPlayerID(ctx context.Context, playerID uint) ([]entity.NFT, error) {
	var nfts []entity.NFT
	err := r.db.WithContext(ctx).
		Where("player_id = ?", playerID).
		Order("created_at DESC").
		Find(&nfts).Error
	return nfts, err
}

func (r *nftRepository) UpdateStatus(ctx context.Context, id uint, status, mintAddress, txHash string) error {
	updates := map[string]interface{}{
		"status":       status,
		"mint_address": mintAddress,
		"tx_hash":      txHash,
	}

	if status == "minted" {
		now := time.Now()
		updates["minted_at"] = &now
	} else if status == "failed" {
		now := time.Now()
		updates["failed_at"] = &now
	}

	return r.db.WithContext(ctx).
		Model(&entity.NFT{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *nftRepository) Update(ctx context.Context, nft *entity.NFT) error {
	return r.db.WithContext(ctx).Save(nft).Error
}
