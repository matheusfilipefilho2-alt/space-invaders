package entity

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "PENDING"
	OrderStatusCompleted OrderStatus = "COMPLETED"
	OrderStatusCancelled OrderStatus = "CANCELLED"
	OrderStatusExpired   OrderStatus = "EXPIRED"
)

type Order struct {
	gorm.Model
	PlayerID uint `gorm:"index;not null"`
	Player   *Player

	PackageID  string      `gorm:"not null"` // e.g., "gold_1000"
	Amount     uint64      `gorm:"not null"` // centavos
	GoldAmount uint64      `gorm:"not null"` // gold to credit
	Status     OrderStatus `gorm:"not null;default:PENDING"`

	// AbacatePay
	ExternalID  string `gorm:"uniqueIndex;not null"` // order_{id}
	PixCode     string
	QRCodeURL   string
	PaymentURL  string
	ExpiresAt   *time.Time
	CompletedAt *time.Time
}

func (Order) TableName() string {
	return "orders"
}
