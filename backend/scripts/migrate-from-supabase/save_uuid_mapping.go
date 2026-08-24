package main

import (
	"context"
	"fmt"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

// SaveUUIDMapping persists the UUID to uint mapping to database
func SaveUUIDMapping(ctx context.Context, db *gorm.DB) error {
	// Convert uuidToUintMap to entity.UUIDMapping records
	// Since we don't know which UUID belongs to which entity type,
	// we'll mark all as "mixed" for now

	mappings := make([]entity.UUIDMapping, 0, len(uuidToUintMap))
	for uuid, id := range uuidToUintMap {
		mappings = append(mappings, entity.UUIDMapping{
			OldUUID:    uuid,
			NewID:      id,
			EntityType: "mixed", // Could be player, achievement, etc.
		})
	}

	// Batch insert
	batchSize := 100
	for i := 0; i < len(mappings); i += batchSize {
		end := i + batchSize
		if end > len(mappings) {
			end = len(mappings)
		}
		if err := db.WithContext(ctx).Create(mappings[i:end]).Error; err != nil {
			return fmt.Errorf("failed to create UUID mappings batch: %w", err)
		}
	}

	return nil
}
