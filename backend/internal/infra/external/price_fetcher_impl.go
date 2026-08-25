package external

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/yourusername/space-invaders/internal/domain/repository"
	"github.com/yourusername/space-invaders/internal/infra/cache"
)

const (
	spacePriceCacheKey = "space:price:usd"
	priceCacheTTL      = 5 * time.Minute
)

type CachedPriceFetcher struct {
	cache          *cache.RedisClient
	jupiterFetcher repository.PriceFetcher
	coingeckoFetcher repository.PriceFetcher
}

func NewCachedPriceFetcher(cache *cache.RedisClient) *CachedPriceFetcher {
	return &CachedPriceFetcher{
		cache:          cache,
		jupiterFetcher: NewJupiterPriceFetcher(),
		coingeckoFetcher: NewCoinGeckoPriceFetcher(),
	}
}

// GetSpacePrice fetches SPACE price with caching
// 1. Check Redis cache (5min TTL)
// 2. If miss, fetch from Jupiter API (primary)
// 3. If Jupiter fails, fallback to CoinGecko
// 4. Cache result and return
func (f *CachedPriceFetcher) GetSpacePrice(ctx context.Context) (uint64, error) {
	// Try cache first
	cached, err := f.cache.Get(ctx, spacePriceCacheKey)
	if err == nil {
		price, parseErr := strconv.ParseUint(cached, 10, 64)
		if parseErr == nil {
			return price, nil
		}
	}

	// Cache miss or invalid - fetch from Jupiter (primary)
	price, err := f.jupiterFetcher.GetSpacePrice(ctx)
	if err != nil {
		// Fallback to CoinGecko
		price, err = f.coingeckoFetcher.GetSpacePrice(ctx)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch price from all sources: %w", err)
		}
	}

	// Cache the result
	if cacheErr := f.cache.Set(ctx, spacePriceCacheKey, price, priceCacheTTL); cacheErr != nil {
		// Log error but don't fail the request
		// In production, you'd use proper logging here
		fmt.Printf("Warning: failed to cache price: %v\n", cacheErr)
	}

	return price, nil
}

// JupiterPriceFetcher fetches price from Jupiter aggregator
type JupiterPriceFetcher struct{}

func NewJupiterPriceFetcher() *JupiterPriceFetcher {
	return &JupiterPriceFetcher{}
}

func (f *JupiterPriceFetcher) GetSpacePrice(ctx context.Context) (uint64, error) {
	// TODO: Implement actual Jupiter API integration
	// For now, return a mock price of $1.00 (100 cents)
	// When SPACE token is deployed, this will use:
	// Jupiter API: https://price.jup.ag/v4/price?ids=<SPACE_MINT_ADDRESS>
	return 100, nil
}

// CoinGeckoPriceFetcher fetches price from CoinGecko
type CoinGeckoPriceFetcher struct{}

func NewCoinGeckoPriceFetcher() *CoinGeckoPriceFetcher {
	return &CoinGeckoPriceFetcher{}
}

func (f *CoinGeckoPriceFetcher) GetSpacePrice(ctx context.Context) (uint64, error) {
	// TODO: Implement actual CoinGecko API integration
	// For now, return a fallback price
	// When listed on CoinGecko: https://api.coingecko.com/api/v3/simple/price?ids=space-invaders&vs_currencies=usd
	return 100, nil
}
