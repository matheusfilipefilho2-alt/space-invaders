package repository

import "context"

// PriceFetcher defines the interface for fetching token prices
type PriceFetcher interface {
	// GetSpacePrice returns the current SPACE token price in USD cents
	// e.g., 150 = $1.50
	GetSpacePrice(ctx context.Context) (uint64, error)
}
