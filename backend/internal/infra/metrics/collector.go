package metrics

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
)

// Collector periodically collects and updates metrics from the database
type Collector struct {
	db       *gorm.DB
	metrics  *EconomyMetrics
	interval time.Duration
	stopChan chan struct{}
}

// NewCollector creates a new metrics collector
func NewCollector(db *gorm.DB, metrics *EconomyMetrics, interval time.Duration) *Collector {
	return &Collector{
		db:       db,
		metrics:  metrics,
		interval: interval,
		stopChan: make(chan struct{}),
	}
}

// Start begins collecting metrics on an interval
func (c *Collector) Start() {
	log.Printf("📊 Starting metrics collector (interval: %s)", c.interval)

	ticker := time.NewTicker(c.interval)
	defer ticker.Stop()

	// Collect immediately on start
	c.collectMetrics()

	for {
		select {
		case <-ticker.C:
			c.collectMetrics()
		case <-c.stopChan:
			log.Println("📊 Metrics collector stopped")
			return
		}
	}
}

// Stop gracefully stops the collector
func (c *Collector) Stop() {
	close(c.stopChan)
}

// collectMetrics queries the database and updates metrics
func (c *Collector) collectMetrics() {
	ctx := context.Background()

	// Collect pending counts
	var pendingConversions, pendingOrders int64
	c.db.WithContext(ctx).Table("gold_space_conversions").Where("status = ?", "pending").Count(&pendingConversions)
	c.db.WithContext(ctx).Table("orders").Where("status = ?", "pending").Count(&pendingOrders)
	c.metrics.UpdatePendingCounts(int(pendingConversions), int(pendingOrders))

	// Collect completed counts
	var completedConversions, completedOrders int64
	c.db.WithContext(ctx).Table("gold_space_conversions").Where("status = ?", "completed").Count(&completedConversions)
	c.db.WithContext(ctx).Table("orders").Where("status = ?", "completed").Count(&completedOrders)
	c.metrics.CompletedConversions.Set(float64(completedConversions))
	c.metrics.CompletedOrders.Set(float64(completedOrders))

	// Collect player metrics
	var totalPlayers int64
	c.db.WithContext(ctx).Table("players").Count(&totalPlayers)

	var activePlayers int64
	yesterday := time.Now().Add(-24 * time.Hour)
	c.db.WithContext(ctx).Table("players").Where("updated_at > ?", yesterday).Count(&activePlayers)

	c.metrics.UpdatePlayerMetrics(int(totalPlayers), int(activePlayers))

	// Collect treasury metrics
	var revenue24h uint64
	c.db.WithContext(ctx).
		Table("orders").
		Where("status = ? AND completed_at > ?", "completed", yesterday).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&revenue24h)

	// Get latest SPACE price from daily_emissions or cache
	var spacePrice uint64
	c.db.WithContext(ctx).
		Table("daily_emissions").
		Order("date DESC").
		Limit(1).
		Select("space_price").
		Scan(&spacePrice)

	// Get total Gold in circulation (sum of all player balances)
	var totalGold uint64
	c.db.WithContext(ctx).
		Table("players").
		Select("COALESCE(SUM(gold_balance), 0)").
		Scan(&totalGold)

	// Get total SPACE in circulation (sum of all player balances)
	var totalSpace uint64
	c.db.WithContext(ctx).
		Table("players").
		Select("COALESCE(SUM(space_balance), 0)").
		Scan(&totalSpace)

	c.metrics.UpdateTreasuryMetrics(totalGold, totalSpace, revenue24h, spacePrice)

	// Collect player balance distributions (sample)
	var goldBalances []uint64
	c.db.WithContext(ctx).
		Table("players").
		Where("gold_balance > 0").
		Limit(1000). // Sample for performance
		Pluck("gold_balance", &goldBalances)

	for _, balance := range goldBalances {
		c.metrics.PlayerGoldBalance.Observe(float64(balance))
	}

	var spaceBalances []uint64
	c.db.WithContext(ctx).
		Table("players").
		Where("space_balance > 0").
		Limit(1000). // Sample for performance
		Pluck("space_balance", &spaceBalances)

	for _, balance := range spaceBalances {
		c.metrics.PlayerSpaceBalance.Observe(float64(balance))
	}
}
