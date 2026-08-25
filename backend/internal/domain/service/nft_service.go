package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"github.com/yourusername/space-invaders/internal/infra/blockchain"
	"github.com/yourusername/space-invaders/internal/infra/external"
)

// NFT metadata structure for IPFS
type NFTMetadataJSON struct {
	Name        string                 `json:"name"`
	Symbol      string                 `json:"symbol"`
	Description string                 `json:"description"`
	Image       string                 `json:"image"`
	Attributes  []NFTAttributeMetadata `json:"attributes"`
	Properties  NFTProperties          `json:"properties"`
}

type NFTAttributeMetadata struct {
	TraitType string      `json:"trait_type"`
	Value     interface{} `json:"value"`
}

type NFTProperties struct {
	Category string   `json:"category"`
	Creators []string `json:"creators"`
}

type NFTService struct {
	nftRepo         repository.NFTRepository
	playerRepo      repository.PlayerRepository
	ipfsClient      *external.IPFSClient
	metaplexAdapter *blockchain.MetaplexAdapter
}

func NewNFTService(
	nftRepo repository.NFTRepository,
	playerRepo repository.PlayerRepository,
	ipfsClient *external.IPFSClient,
	metaplexAdapter *blockchain.MetaplexAdapter,
) *NFTService {
	return &NFTService{
		nftRepo:         nftRepo,
		playerRepo:      playerRepo,
		ipfsClient:      ipfsClient,
		metaplexAdapter: metaplexAdapter,
	}
}

// ListPlayerNFTs returns all NFTs owned by a player
func (s *NFTService) ListPlayerNFTs(ctx context.Context, playerID uint) ([]entity.NFT, error) {
	return s.nftRepo.ListByPlayerID(ctx, playerID)
}

// GetNFT returns NFT details by ID
func (s *NFTService) GetNFT(ctx context.Context, nftID uint) (*entity.NFT, error) {
	return s.nftRepo.FindByID(ctx, nftID)
}

// GetNFTByMintAddress returns NFT by its Solana mint address
func (s *NFTService) GetNFTByMintAddress(ctx context.Context, mintAddress string) (*entity.NFT, error) {
	return s.nftRepo.FindByMintAddress(ctx, mintAddress)
}

// MintNFT creates and mints a new NFT for a player
// This is a simplified synchronous version. In production, this would be async via a worker queue.
func (s *NFTService) MintNFT(ctx context.Context, playerID uint, name, description string, rarity string, attributes map[string]interface{}) (*entity.NFT, error) {
	// 1. Verify player exists and has wallet
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, fmt.Errorf("player not found: %w", err)
	}

	if player.WalletAddress == nil || *player.WalletAddress == "" {
		return nil, errors.New("player has no wallet address")
	}

	// 2. Create NFT record with pending status
	attributesJSON, err := json.Marshal(attributes)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal attributes: %w", err)
	}

	nft := &entity.NFT{
		PlayerID:    playerID,
		Name:        name,
		Description: description,
		Rarity:      rarity,
		Attributes:  string(attributesJSON),
		Status:      "pending",
		ImageURL:    "ipfs://placeholder", // Will be updated after IPFS upload
		MintAddress: "",                   // Will be updated after minting
	}

	if err := s.nftRepo.Create(ctx, nft); err != nil {
		return nil, fmt.Errorf("failed to create NFT record: %w", err)
	}

	// 3. Upload metadata to IPFS (simplified - in production would upload image first)
	metadata := NFTMetadataJSON{
		Name:        name,
		Symbol:      "SINV",
		Description: description,
		Image:       "ipfs://placeholder-image", // Should be actual uploaded image
		Attributes:  convertToMetadataAttributes(attributes),
		Properties: NFTProperties{
			Category: "image",
			Creators: []string{*player.WalletAddress},
		},
	}

	metadataURI, err := s.ipfsClient.UploadJSON(ctx, metadata)
	if err != nil {
		// Update NFT status to failed
		s.nftRepo.UpdateStatus(ctx, nft.ID, "failed", "", "")
		return nil, fmt.Errorf("failed to upload metadata to IPFS: %w", err)
	}

	// Update NFT with metadata URI
	nft.MetadataURI = metadataURI
	s.nftRepo.Update(ctx, nft)

	// 4. Mint NFT on Solana via Metaplex
	metaplexMetadata := blockchain.NFTMetadata{
		Name:   name,
		Symbol: "SINV",
		URI:    metadataURI,
	}

	mintAddress, err := s.metaplexAdapter.MintNFT(ctx, *player.WalletAddress, metaplexMetadata)
	if err != nil {
		// Update NFT status to failed
		now := time.Now()
		nft.Status = "failed"
		nft.FailedAt = &now
		nft.ErrorMsg = err.Error()
		s.nftRepo.Update(ctx, nft)
		return nil, fmt.Errorf("failed to mint NFT on Solana: %w", err)
	}

	// 5. Update NFT status to minted
	err = s.nftRepo.UpdateStatus(ctx, nft.ID, "minted", mintAddress, "tx-placeholder")
	if err != nil {
		return nil, fmt.Errorf("failed to update NFT status: %w", err)
	}

	// Reload NFT with updated data
	return s.nftRepo.FindByID(ctx, nft.ID)
}

// convertToMetadataAttributes converts map to NFT metadata attributes
func convertToMetadataAttributes(attrs map[string]interface{}) []NFTAttributeMetadata {
	var result []NFTAttributeMetadata
	for key, value := range attrs {
		result = append(result, NFTAttributeMetadata{
			TraitType: key,
			Value:     value,
		})
	}
	return result
}

// GetPlayerNFTCount returns the number of NFTs owned by a player
func (s *NFTService) GetPlayerNFTCount(ctx context.Context, playerID uint) (int, error) {
	nfts, err := s.nftRepo.ListByPlayerID(ctx, playerID)
	if err != nil {
		return 0, err
	}
	return len(nfts), nil
}
