package external_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourusername/space-invaders/internal/infra/cache"
	"github.com/yourusername/space-invaders/internal/infra/external"
)

func TestCachedPriceFetcher_GetSpacePrice(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test that requires Redis")
	}

	// This test requires Redis to be running
	// In CI/CD, you would use a Redis container via docker-compose or testcontainers

	redisClient, err := cache.NewRedisClient()
	if err != nil {
		t.Skipf("Skipping test: Redis not available: %v", err)
	}
	defer redisClient.Close()

	fetcher := external.NewCachedPriceFetcher(redisClient)
	ctx := context.Background()

	// Clean cache before test
	_ = redisClient.Del(ctx, "space:price:usd")

	// First call - cache miss, should fetch from Jupiter
	price1, err := fetcher.GetSpacePrice(ctx)
	require.NoError(t, err)
	assert.Greater(t, price1, uint64(0))
	assert.Equal(t, uint64(100), price1) // Mock price is $1.00 = 100 cents

	// Second call - should hit cache
	price2, err := fetcher.GetSpacePrice(ctx)
	require.NoError(t, err)
	assert.Equal(t, price1, price2)

	// Clean up
	_ = redisClient.Del(ctx, "space:price:usd")
}

func TestJupiterPriceFetcher_GetSpacePrice(t *testing.T) {
	fetcher := external.NewJupiterPriceFetcher()
	ctx := context.Background()

	price, err := fetcher.GetSpacePrice(ctx)

	require.NoError(t, err)
	assert.Greater(t, price, uint64(0))
	// Mock implementation returns 100 ($1.00)
	assert.Equal(t, uint64(100), price)
}

func TestCoinGeckoPriceFetcher_GetSpacePrice(t *testing.T) {
	fetcher := external.NewCoinGeckoPriceFetcher()
	ctx := context.Background()

	price, err := fetcher.GetSpacePrice(ctx)

	require.NoError(t, err)
	assert.Greater(t, price, uint64(0))
	// Mock implementation returns 100 ($1.00)
	assert.Equal(t, uint64(100), price)
}
