package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/yourusername/space-invaders/configs"
)

type RedisClient struct {
	client *redis.Client
}

func NewRedisClient() (*RedisClient, error) {
	redisURL := configs.GetRedisURL()
	if redisURL == "" {
		redisURL = "redis://localhost:6379" // default
	}

	// Parse Redis URL (e.g., "redis://localhost:6379")
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisClient{client: client}, nil
}

// Get retrieves a value from Redis
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found: %s", key)
	}
	return val, err
}

// Set stores a value in Redis with TTL
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

// Del deletes a key from Redis
func (r *RedisClient) Del(ctx context.Context, keys ...string) error {
	return r.client.Del(ctx, keys...).Err()
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}
