package entity

import (
	"time"

	"gorm.io/gorm"
)

type DailyEmission struct {
	gorm.Model
	Date time.Time `gorm:"uniqueIndex;not null"` // UTC date truncated

	// Inputs
	PixRevenue24h   uint64 `gorm:"not null;default:0"`   // centavos
	SpacePrice      uint64 `gorm:"not null;default:100"` // centavos (R$ 1.00)
	GameplayRewards uint64 `gorm:"not null;default:0"`   // SPACE expected from gameplay

	// Outputs (calculated)
	EmissionLimit     uint64 `gorm:"not null;default:0"` // (PixRevenue × 0.30) / SpacePrice
	EmissionUsed      uint64 `gorm:"not null;default:0"` // Total already emitted today
	EmissionAvailable uint64 `gorm:"not null;default:0"` // Limit - Used
}

func (DailyEmission) TableName() string {
	return "daily_emissions"
}
