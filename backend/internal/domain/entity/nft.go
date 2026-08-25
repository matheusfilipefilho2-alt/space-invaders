package entity

import (
	"time"

	"gorm.io/gorm"
)

// NFT represents a player's NFT (Solana SPL token)
type NFT struct {
	gorm.Model

	PlayerID uint `gorm:"not null;index"`
	Player   *Player `gorm:"foreignKey:PlayerID"`

	// NFT metadata
	Name        string `gorm:"not null"`
	Description string
	ImageURL    string `gorm:"not null"` // IPFS URL

	// Rarity: common, rare, epic, legendary
	Rarity string `gorm:"not null;index"`

	// Attributes (JSON stored as JSONB)
	Attributes string `gorm:"type:jsonb"`

	// Solana on-chain data
	MintAddress string `gorm:"uniqueIndex;not null"` // SPL token mint address
	MetadataURI string `gorm:"not null"`             // IPFS metadata URI
	TxHash      string `gorm:"index"`                // Mint transaction hash

	// Minting status
	Status   string `gorm:"not null;default:'pending'"` // pending, minted, failed
	MintedAt *time.Time
	FailedAt *time.Time
	ErrorMsg string
}

// TableName returns the table name for the NFT entity
func (NFT) TableName() string {
	return "nfts"
}
