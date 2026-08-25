package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// EconomyMetrics holds all Prometheus metrics for the economy system
type EconomyMetrics struct {
	// Conversion metrics
	ConversionsTotal       *prometheus.CounterVec
	ConversionGoldAmount   prometheus.Histogram
	ConversionSpaceAmount  prometheus.Histogram
	ConversionDuration     prometheus.Histogram
	ConversionErrors       *prometheus.CounterVec
	PendingConversions     prometheus.Gauge
	CompletedConversions   prometheus.Gauge

	// Shop metrics
	OrdersTotal            *prometheus.CounterVec
	OrderAmount            prometheus.Histogram
	OrderGoldAmount        prometheus.Histogram
	OrderDuration          prometheus.Histogram
	OrderErrors            *prometheus.CounterVec
	PendingOrders          prometheus.Gauge
	CompletedOrders        prometheus.Gauge

	// Emission metrics
	DailyEmissionTotal     prometheus.Counter
	EmissionAmount         prometheus.Histogram
	EmissionLimit          prometheus.Histogram
	EmissionUtilization    prometheus.Gauge
	EmissionErrors         *prometheus.CounterVec

	// Treasury metrics
	TreasuryGoldBalance    prometheus.Gauge
	TreasurySpaceBalance   prometheus.Gauge
	TreasuryRevenue24h     prometheus.Gauge
	SpacePrice             prometheus.Gauge

	// Player metrics
	TotalPlayers           prometheus.Gauge
	ActivePlayersToday     prometheus.Gauge
	PlayerGoldBalance      prometheus.Histogram
	PlayerSpaceBalance     prometheus.Histogram

	// System metrics
	HTTPRequestsTotal      *prometheus.CounterVec
	HTTPRequestDuration    *prometheus.HistogramVec
	DatabaseQueryDuration  *prometheus.HistogramVec
	RedisHitRate           prometheus.Gauge
}

// NewEconomyMetrics creates and registers all Prometheus metrics
func NewEconomyMetrics() *EconomyMetrics {
	return &EconomyMetrics{
		// Conversion metrics
		ConversionsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_conversions_total",
				Help: "Total number of Gold→SPACE conversions by status",
			},
			[]string{"status"}, // pending, completed, failed
		),
		ConversionGoldAmount: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_conversion_gold_amount",
				Help:    "Gold amount in conversions",
				Buckets: prometheus.ExponentialBuckets(100, 2, 10), // 100, 200, 400, ..., 51200
			},
		),
		ConversionSpaceAmount: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_conversion_space_amount_lamports",
				Help:    "SPACE amount in conversions (lamports)",
				Buckets: prometheus.ExponentialBuckets(1e9, 2, 10), // 1 SPACE, 2 SPACE, ..., 512 SPACE
			},
		),
		ConversionDuration: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_conversion_duration_seconds",
				Help:    "Time to complete conversion (creation to completion)",
				Buckets: prometheus.DefBuckets,
			},
		),
		ConversionErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_conversion_errors_total",
				Help: "Total number of conversion errors by type",
			},
			[]string{"error_type"}, // insufficient_gold, below_minimum, mint_failed, etc.
		),
		PendingConversions: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_pending_conversions",
				Help: "Current number of pending conversions",
			},
		),
		CompletedConversions: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_completed_conversions_total",
				Help: "Total number of completed conversions",
			},
		),

		// Shop metrics
		OrdersTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_orders_total",
				Help: "Total number of PIX orders by status",
			},
			[]string{"status", "package_id"}, // pending, completed, expired, cancelled + package ID
		),
		OrderAmount: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_order_amount_cents",
				Help:    "Order amount in cents (BRL)",
				Buckets: prometheus.ExponentialBuckets(500, 2, 8), // R$ 5, R$ 10, ..., R$ 640
			},
		),
		OrderGoldAmount: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_order_gold_amount",
				Help:    "Gold amount in orders",
				Buckets: prometheus.ExponentialBuckets(100, 2, 10),
			},
		),
		OrderDuration: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_order_duration_seconds",
				Help:    "Time from order creation to payment completion",
				Buckets: []float64{10, 30, 60, 120, 300, 600, 1800}, // 10s to 30min
			},
		),
		OrderErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_order_errors_total",
				Help: "Total number of order errors by type",
			},
			[]string{"error_type"}, // invalid_package, payment_failed, webhook_error, etc.
		),
		PendingOrders: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_pending_orders",
				Help: "Current number of pending orders",
			},
		),
		CompletedOrders: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_completed_orders_total",
				Help: "Total number of completed orders",
			},
		),

		// Emission metrics
		DailyEmissionTotal: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "space_invaders_daily_emissions_total",
				Help: "Total number of daily emission calculations executed",
			},
		),
		EmissionAmount: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_emission_amount_lamports",
				Help:    "Daily SPACE emission amount (lamports)",
				Buckets: prometheus.ExponentialBuckets(1e9, 2, 12), // 1 SPACE to 2048 SPACE
			},
		),
		EmissionLimit: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_emission_limit_lamports",
				Help:    "Daily emission limit based on revenue (lamports)",
				Buckets: prometheus.ExponentialBuckets(1e9, 2, 12),
			},
		),
		EmissionUtilization: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_emission_utilization_ratio",
				Help: "Emission utilization ratio (used / limit)",
			},
		),
		EmissionErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_emission_errors_total",
				Help: "Total number of emission errors by type",
			},
			[]string{"error_type"}, // calculation_failed, mint_failed, save_failed, etc.
		),

		// Treasury metrics
		TreasuryGoldBalance: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_treasury_gold_balance",
				Help: "Current treasury Gold balance",
			},
		),
		TreasurySpaceBalance: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_treasury_space_balance_lamports",
				Help: "Current treasury SPACE balance (lamports)",
			},
		),
		TreasuryRevenue24h: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_treasury_revenue_24h_cents",
				Help: "PIX revenue in last 24 hours (cents)",
			},
		),
		SpacePrice: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_space_price_cents",
				Help: "Current SPACE token price in cents (BRL)",
			},
		),

		// Player metrics
		TotalPlayers: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_total_players",
				Help: "Total number of registered players",
			},
		),
		ActivePlayersToday: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_active_players_today",
				Help: "Number of players active in last 24 hours",
			},
		),
		PlayerGoldBalance: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_player_gold_balance",
				Help:    "Distribution of player Gold balances",
				Buckets: prometheus.ExponentialBuckets(100, 2, 15), // 100 to 1.6M
			},
		),
		PlayerSpaceBalance: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "space_invaders_player_space_balance_lamports",
				Help:    "Distribution of player SPACE balances (lamports)",
				Buckets: prometheus.ExponentialBuckets(1e9, 2, 15), // 1 SPACE to 16K SPACE
			},
		),

		// System metrics
		HTTPRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "space_invaders_http_requests_total",
				Help: "Total number of HTTP requests",
			},
			[]string{"method", "path", "status"},
		),
		HTTPRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "space_invaders_http_request_duration_seconds",
				Help:    "HTTP request duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
		DatabaseQueryDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "space_invaders_database_query_duration_seconds",
				Help:    "Database query duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"operation", "table"},
		),
		RedisHitRate: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "space_invaders_redis_hit_rate",
				Help: "Redis cache hit rate (hits / total requests)",
			},
		),
	}
}

// RecordConversion records conversion metrics
func (m *EconomyMetrics) RecordConversion(status string, goldAmount, spaceAmount uint64) {
	m.ConversionsTotal.WithLabelValues(status).Inc()
	m.ConversionGoldAmount.Observe(float64(goldAmount))
	m.ConversionSpaceAmount.Observe(float64(spaceAmount))
}

// RecordConversionError records conversion error
func (m *EconomyMetrics) RecordConversionError(errorType string) {
	m.ConversionErrors.WithLabelValues(errorType).Inc()
}

// RecordOrder records order metrics
func (m *EconomyMetrics) RecordOrder(status, packageID string, amountCents, goldAmount uint64) {
	m.OrdersTotal.WithLabelValues(status, packageID).Inc()
	m.OrderAmount.Observe(float64(amountCents))
	m.OrderGoldAmount.Observe(float64(goldAmount))
}

// RecordOrderError records order error
func (m *EconomyMetrics) RecordOrderError(errorType string) {
	m.OrderErrors.WithLabelValues(errorType).Inc()
}

// RecordEmission records emission metrics
func (m *EconomyMetrics) RecordEmission(emissionAmount, emissionLimit uint64) {
	m.DailyEmissionTotal.Inc()
	m.EmissionAmount.Observe(float64(emissionAmount))
	m.EmissionLimit.Observe(float64(emissionLimit))

	if emissionLimit > 0 {
		utilization := float64(emissionAmount) / float64(emissionLimit)
		m.EmissionUtilization.Set(utilization)
	}
}

// RecordEmissionError records emission error
func (m *EconomyMetrics) RecordEmissionError(errorType string) {
	m.EmissionErrors.WithLabelValues(errorType).Inc()
}

// UpdatePendingCounts updates pending conversion and order counts
func (m *EconomyMetrics) UpdatePendingCounts(pendingConversions, pendingOrders int) {
	m.PendingConversions.Set(float64(pendingConversions))
	m.PendingOrders.Set(float64(pendingOrders))
}

// UpdateTreasuryMetrics updates treasury-related metrics
func (m *EconomyMetrics) UpdateTreasuryMetrics(goldBalance, spaceBalance, revenue24h, spacePrice uint64) {
	m.TreasuryGoldBalance.Set(float64(goldBalance))
	m.TreasurySpaceBalance.Set(float64(spaceBalance))
	m.TreasuryRevenue24h.Set(float64(revenue24h))
	m.SpacePrice.Set(float64(spacePrice))
}

// UpdatePlayerMetrics updates player-related metrics
func (m *EconomyMetrics) UpdatePlayerMetrics(totalPlayers, activePlayers int) {
	m.TotalPlayers.Set(float64(totalPlayers))
	m.ActivePlayersToday.Set(float64(activePlayers))
}

// RecordHTTPRequest records HTTP request metrics
func (m *EconomyMetrics) RecordHTTPRequest(method, path string, status int, duration float64) {
	m.HTTPRequestsTotal.WithLabelValues(method, path, string(rune(status))).Inc()
	m.HTTPRequestDuration.WithLabelValues(method, path).Observe(duration)
}

// RecordDatabaseQuery records database query metrics
func (m *EconomyMetrics) RecordDatabaseQuery(operation, table string, duration float64) {
	m.DatabaseQueryDuration.WithLabelValues(operation, table).Observe(duration)
}

// UpdateRedisHitRate updates Redis cache hit rate
func (m *EconomyMetrics) UpdateRedisHitRate(hits, total int) {
	if total > 0 {
		hitRate := float64(hits) / float64(total)
		m.RedisHitRate.Set(hitRate)
	}
}

// Global metrics instance
var Metrics *EconomyMetrics

// InitMetrics initializes the global metrics instance
func InitMetrics() {
	Metrics = NewEconomyMetrics()
}
