package entity

import "gorm.io/gorm"

type UUIDMapping struct {
	gorm.Model
	OldUUID    string `gorm:"index;not null"`
	NewID      uint   `gorm:"not null"`
	EntityType string `gorm:"not null"` // "player", "achievement", etc.
}

func (UUIDMapping) TableName() string {
	return "uuid_mappings"
}
