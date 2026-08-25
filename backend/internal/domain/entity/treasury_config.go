package entity

import "time"

// TreasuryConfig stores the configuration for the treasury system
type TreasuryConfig struct {
	ID                   uint      `gorm:"primaryKey"`
	ConversionRatio      uint64    `gorm:"not null"` // 100 Gold = 1 SPACE
	RevenueSharePercent  float64   `gorm:"not null"` // 30% of revenue
	MinEmissionPerDay    uint64    `gorm:"not null"`
	MaxEmissionPerDay    uint64    `gorm:"not null"` // 1,000 SPACE max per day
	TreasuryWalletPubkey string    `gorm:"type:text"`
	CreatedAt            time.Time `gorm:"autoCreateTime"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime"`
}

// TableName specifies the table name for TreasuryConfig
func (TreasuryConfig) TableName() string {
	return "treasury_config"
}

// GetDefaultConfig returns the default treasury configuration
func GetDefaultConfig() *TreasuryConfig {
	return &TreasuryConfig{
		ID:                  1,
		ConversionRatio:     100,
		RevenueSharePercent: 0.30,
		MinEmissionPerDay:   0,
		MaxEmissionPerDay:   1_000_000_000_000, // 1,000 SPACE max per day
	}
}
