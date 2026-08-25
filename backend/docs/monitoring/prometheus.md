## Prometheus Metrics

Comprehensive monitoring for the Space Invaders economy system using Prometheus metrics.

## Overview

The backend exposes detailed Prometheus metrics for monitoring the dual economy system, tracking conversions, orders, emissions, and system performance.

### Metrics Endpoint

```
http://localhost:9090/metrics
```

**Production:**
```
https://api.spaceinvaders.com/metrics
```

## Available Metrics

### Conversion Metrics

**Counter: `space_invaders_conversions_total{status}`**
- Total number of Gold→SPACE conversions
- Labels: `status` (pending, completed, failed)

**Histogram: `space_invaders_conversion_gold_amount`**
- Distribution of Gold amounts in conversions
- Buckets: 100, 200, 400, ..., 51200

**Histogram: `space_invaders_conversion_space_amount_lamports`**
- Distribution of SPACE amounts in conversions (lamports)
- Buckets: 1B, 2B, 4B, ..., 512B (1-512 SPACE tokens)

**Histogram: `space_invaders_conversion_duration_seconds`**
- Time from conversion creation to completion
- Useful for monitoring blockchain performance

**Counter: `space_invaders_conversion_errors_total{error_type}`**
- Total conversion errors by type
- Labels: `error_type` (insufficient_gold, below_minimum, mint_failed, etc.)

**Gauge: `space_invaders_pending_conversions`**
- Current number of pending conversions

**Gauge: `space_invaders_completed_conversions_total`**
- Total number of completed conversions

### Shop Metrics

**Counter: `space_invaders_orders_total{status,package_id}`**
- Total PIX orders by status and package
- Labels: `status` (pending, completed, expired, cancelled), `package_id` (gold_100, gold_500, gold_1000)

**Histogram: `space_invaders_order_amount_cents`**
- Distribution of order amounts in cents (BRL)
- Buckets: 500, 1000, 2000, ..., 40000 (R$ 5 to R$ 400)

**Histogram: `space_invaders_order_gold_amount`**
- Distribution of Gold amounts in orders

**Histogram: `space_invaders_order_duration_seconds`**
- Time from order creation to payment completion
- Buckets: 10s, 30s, 1m, 2m, 5m, 10m, 30m

**Counter: `space_invaders_order_errors_total{error_type}`**
- Total order errors by type
- Labels: `error_type` (invalid_package, payment_failed, webhook_error, etc.)

**Gauge: `space_invaders_pending_orders`**
- Current number of pending orders

**Gauge: `space_invaders_completed_orders_total`**
- Total number of completed orders

### Emission Metrics

**Counter: `space_invaders_daily_emissions_total`**
- Total number of daily emission calculations executed

**Histogram: `space_invaders_emission_amount_lamports`**
- Distribution of daily emission amounts (lamports)
- Buckets: 1B to 2T lamports (1 to 2048 SPACE tokens)

**Histogram: `space_invaders_emission_limit_lamports`**
- Distribution of emission limits based on revenue

**Gauge: `space_invaders_emission_utilization_ratio`**
- Emission utilization ratio (used / limit)
- Range: 0.0 to 1.0

**Counter: `space_invaders_emission_errors_total{error_type}`**
- Total emission errors by type

### Treasury Metrics

**Gauge: `space_invaders_treasury_gold_balance`**
- Current total Gold in circulation (sum of all player balances)

**Gauge: `space_invaders_treasury_space_balance_lamports`**
- Current total SPACE in circulation (lamports)

**Gauge: `space_invaders_treasury_revenue_24h_cents`**
- PIX revenue in last 24 hours (cents)

**Gauge: `space_invaders_space_price_cents`**
- Current SPACE token price in cents (BRL)

### Player Metrics

**Gauge: `space_invaders_total_players`**
- Total number of registered players

**Gauge: `space_invaders_active_players_today`**
- Number of players active in last 24 hours

**Histogram: `space_invaders_player_gold_balance`**
- Distribution of player Gold balances

**Histogram: `space_invaders_player_space_balance_lamports`**
- Distribution of player SPACE balances

### System Metrics

**Counter: `space_invaders_http_requests_total{method,path,status}`**
- Total HTTP requests by method, path, and status code

**Histogram: `space_invaders_http_request_duration_seconds{method,path}`**
- HTTP request latency by endpoint

**Histogram: `space_invaders_database_query_duration_seconds{operation,table}`**
- Database query latency by operation and table

**Gauge: `space_invaders_redis_hit_rate`**
- Redis cache hit rate (0.0 to 1.0)

## Setup

### 1. Install Prometheus

**macOS:**
```bash
brew install prometheus
```

**Linux:**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

**Docker:**
```bash
docker run -d \
  --name prometheus \
  -p 9091:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'space-invaders-api'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

### 3. Start Prometheus

```bash
prometheus --config.file=prometheus.yml
```

Access Prometheus UI: `http://localhost:9091`

### 4. Enable Metrics in Application

Set environment variable:

```bash
METRICS_ENABLED=true
METRICS_PORT=9090
```

Start the application:

```bash
go run cmd/http/main.go
```

## Grafana Dashboard

### 1. Install Grafana

**macOS:**
```bash
brew install grafana
brew services start grafana
```

**Docker:**
```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

Access Grafana: `http://localhost:3001` (default: admin/admin)

### 2. Add Prometheus Data Source

1. Go to Configuration → Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set URL: `http://localhost:9091`
5. Click "Save & Test"

### 3. Import Dashboard

Import the pre-built dashboard:

```bash
# Dashboard JSON available at:
docs/monitoring/grafana-dashboard.json
```

Or create custom panels using the metrics below.

## Example Queries

### Conversion Monitoring

**Conversion rate (conversions per minute):**
```promql
rate(space_invaders_conversions_total{status="completed"}[5m]) * 60
```

**Average Gold amount per conversion:**
```promql
sum(space_invaders_conversion_gold_amount_sum) / sum(space_invaders_conversion_gold_amount_count)
```

**Conversion error rate:**
```promql
rate(space_invaders_conversion_errors_total[5m])
```

**Pending conversion backlog:**
```promql
space_invaders_pending_conversions
```

### Shop Monitoring

**Order completion rate (last 5 minutes):**
```promql
rate(space_invaders_orders_total{status="completed"}[5m])
```

**Order success rate:**
```promql
sum(rate(space_invaders_orders_total{status="completed"}[5m])) /
sum(rate(space_invaders_orders_total[5m]))
```

**Average order value (BRL):**
```promql
sum(space_invaders_order_amount_cents_sum) / sum(space_invaders_order_amount_cents_count) / 100
```

**Popular packages:**
```promql
sum by (package_id) (space_invaders_orders_total{status="completed"})
```

**Revenue in last 24h:**
```promql
space_invaders_treasury_revenue_24h_cents / 100
```

### Emission Monitoring

**Daily emission count:**
```promql
space_invaders_daily_emissions_total
```

**Emission utilization (%):**
```promql
space_invaders_emission_utilization_ratio * 100
```

**Average emission amount (SPACE tokens):**
```promql
sum(space_invaders_emission_amount_lamports_sum) / sum(space_invaders_emission_amount_lamports_count) / 1e9
```

### Treasury Monitoring

**Total Gold in circulation:**
```promql
space_invaders_treasury_gold_balance
```

**Total SPACE in circulation (tokens):**
```promql
space_invaders_treasury_space_balance_lamports / 1e9
```

**SPACE price (BRL):**
```promql
space_invaders_space_price_cents / 100
```

**Gold/SPACE ratio:**
```promql
space_invaders_treasury_gold_balance / (space_invaders_treasury_space_balance_lamports / 1e9)
```

### Player Monitoring

**Player growth rate:**
```promql
rate(space_invaders_total_players[1h])
```

**Active player ratio:**
```promql
space_invaders_active_players_today / space_invaders_total_players
```

**Median player Gold balance:**
```promql
histogram_quantile(0.5, space_invaders_player_gold_balance_bucket)
```

**Top 10% SPACE holders:**
```promql
histogram_quantile(0.9, space_invaders_player_space_balance_lamports_bucket) / 1e9
```

### System Performance

**Request rate by endpoint:**
```promql
sum by (path) (rate(space_invaders_http_requests_total[5m]))
```

**95th percentile request latency:**
```promql
histogram_quantile(0.95, rate(space_invaders_http_request_duration_seconds_bucket[5m]))
```

**Error rate (4xx + 5xx):**
```promql
sum(rate(space_invaders_http_requests_total{status=~"4..|5.."}[5m]))
```

**Database query latency by table:**
```promql
sum by (table) (rate(space_invaders_database_query_duration_seconds_sum[5m])) /
sum by (table) (rate(space_invaders_database_query_duration_seconds_count[5m]))
```

**Redis cache effectiveness:**
```promql
space_invaders_redis_hit_rate * 100
```

## Alerting Rules

### Critical Alerts

**High conversion error rate:**
```yaml
- alert: HighConversionErrorRate
  expr: rate(space_invaders_conversion_errors_total[5m]) > 1
  for: 5m
  annotations:
    summary: High conversion error rate detected
```

**Pending conversions backlog:**
```yaml
- alert: ConversionBacklog
  expr: space_invaders_pending_conversions > 100
  for: 10m
  annotations:
    summary: Large pending conversion backlog
```

**Failed daily emission:**
```yaml
- alert: EmissionFailed
  expr: rate(space_invaders_emission_errors_total[1h]) > 0
  for: 5m
  annotations:
    summary: Daily emission calculation failed
```

**Low emission utilization:**
```yaml
- alert: LowEmissionUtilization
  expr: space_invaders_emission_utilization_ratio < 0.5
  for: 1d
  annotations:
    summary: Emission utilization below 50% for 24h
```

### Warning Alerts

**High API latency:**
```yaml
- alert: HighAPILatency
  expr: histogram_quantile(0.95, rate(space_invaders_http_request_duration_seconds_bucket[5m])) > 1
  for: 5m
  annotations:
    summary: API p95 latency > 1 second
```

**Low cache hit rate:**
```yaml
- alert: LowCacheHitRate
  expr: space_invaders_redis_hit_rate < 0.7
  for: 10m
  annotations:
    summary: Redis cache hit rate below 70%
```

**Order webhook delays:**
```yaml
- alert: SlowOrderProcessing
  expr: histogram_quantile(0.95, rate(space_invaders_order_duration_seconds_bucket[5m])) > 600
  for: 5m
  annotations:
    summary: 95% of orders taking > 10 minutes
```

## Dashboard Panels

### Recommended Grafana Panels

1. **Economy Overview**
   - Total Gold in circulation (gauge)
   - Total SPACE in circulation (gauge)
   - SPACE price trend (time series)
   - Revenue 24h (stat)

2. **Conversion Metrics**
   - Conversion rate (time series)
   - Pending conversions (gauge)
   - Conversion errors (time series)
   - Average conversion size (stat)

3. **Shop Metrics**
   - Order completion rate (time series)
   - Revenue trend (time series)
   - Popular packages (pie chart)
   - Order duration distribution (heatmap)

4. **Player Metrics**
   - Total players (stat)
   - Active players 24h (stat)
   - Player growth (time series)
   - Balance distributions (histogram)

5. **System Performance**
   - Request rate by endpoint (time series)
   - API latency p50/p95/p99 (time series)
   - Error rate (time series)
   - Database query latency (time series)

## Production Best Practices

### 1. Cardinality Control

Avoid high-cardinality labels:
- ❌ Don't use player IDs, order IDs as labels
- ✅ Use categorical labels: status, package_id, error_type

### 2. Retention

Configure Prometheus retention:
```yaml
storage:
  tsdb:
    retention.time: 90d
    retention.size: 50GB
```

### 3. Remote Storage

For long-term storage, use Thanos or Cortex:

```yaml
remote_write:
  - url: "http://thanos:9090/api/v1/receive"
```

### 4. Security

Protect metrics endpoint in production:

```go
// Require authentication for /metrics
if c.Request.URL.Path == "/metrics" {
    if !isAuthorized(c) {
        c.AbortWithStatus(401)
        return
    }
}
```

### 5. Performance

- Metrics collection runs every 30 seconds (configurable)
- Database queries are optimized with limits
- Use indexes on status columns for fast counting

## Troubleshooting

### Metrics not showing up

**Check endpoint is accessible:**
```bash
curl http://localhost:9090/metrics
```

**Verify Prometheus config:**
```bash
promtool check config prometheus.yml
```

**Check Prometheus targets:**
- Go to `http://localhost:9091/targets`
- Verify target is "UP"

### High memory usage

**Reduce retention:**
```yaml
storage:
  tsdb:
    retention.time: 30d  # Reduce from 90d
```

**Increase scrape interval:**
```yaml
scrape_interval: 30s  # Increase from 15s
```

### Stale metrics

**Restart metrics collector:**
```bash
# Restart application
pkill -HUP api_server
```

**Clear Prometheus data:**
```bash
rm -rf /var/lib/prometheus/data
```

## Support

- **Prometheus docs:** https://prometheus.io/docs
- **Grafana docs:** https://grafana.com/docs
- **Issues:** GitHub Issues

## Next Steps

1. Set up Grafana dashboards
2. Configure alerting rules
3. Set up PagerDuty/Slack notifications
4. Monitor in production
5. Tune alert thresholds based on traffic patterns
