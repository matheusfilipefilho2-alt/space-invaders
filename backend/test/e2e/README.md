# End-to-End Tests

Comprehensive E2E tests for the Space Invaders economy system.

## Overview

E2E tests validate complete user flows from HTTP request to database persistence, testing the entire application stack:

- HTTP handlers and routing
- Service layer business logic
- Repository database operations
- External API integrations
- Authentication and authorization

## Test Suites

### Conversion Flow Tests (`conversion_flow_test.go`)

Tests the complete Gold→SPACE conversion system:

**Test Cases:**
- ✅ `TestConversionFlow_EndToEnd` - Full conversion flow (register → login → add Gold → convert → verify)
- ✅ `TestConversionFlow_InsufficientGold` - Error handling for insufficient balance
- ✅ `TestConversionFlow_BelowMinimum` - Validation of minimum conversion amount (100 Gold)
- ✅ `TestConversionFlow_MultipleConversions` - Sequential conversions with balance tracking
- ✅ `TestConversionFlow_Pagination` - Conversion history pagination
- ✅ `TestConversionFlow_UnauthorizedAccess` - Authorization checks between players

**Validates:**
- Player registration and authentication
- JWT token generation and validation
- Gold balance management
- Conversion record creation
- Database atomicity (Gold deduction + conversion creation)
- Conversion status tracking
- History retrieval with pagination
- Access control (players can only see their own conversions)

### Shop Flow Tests (`shop_flow_test.go`)

Tests the complete PIX payment and Gold purchase system:

**Test Cases:**
- ✅ `TestShopFlow_ListPackages` - Public package listing
- ✅ `TestShopFlow_CreateOrder` - PIX order creation
- ✅ `TestShopFlow_CreateOrderInvalidPackage` - Invalid package error handling
- ✅ `TestShopFlow_GetPlayerOrders` - Order history retrieval
- ✅ `TestShopFlow_GetOrderByID` - Specific order lookup
- ✅ `TestShopFlow_UnauthorizedOrderAccess` - Authorization checks
- ✅ `TestShopFlow_OrderPagination` - Order history pagination
- ✅ `TestShopFlow_WebhookPaymentCompleted` - Successful payment webhook
- ✅ `TestShopFlow_WebhookPaymentExpired` - Expired payment webhook
- ✅ `TestShopFlow_WebhookPaymentCancelled` - Cancelled payment webhook
- ✅ `TestShopFlow_DuplicateWebhook` - Webhook idempotency

**Validates:**
- Package listing (no auth required)
- Order creation with PIX details (QR code, payment URL)
- AbacatePay integration (mock)
- Webhook event processing (paid, expired, cancelled)
- Gold crediting on payment completion
- Database transactions (order update + Gold credit)
- Webhook idempotency (no double-crediting)
- Access control (players can only see their own orders)

## Prerequisites

### Database

Tests require a PostgreSQL test database:

```bash
# Create test database
createdb space_invaders_test

# Or using Docker
docker run -d \
  --name space-invaders-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=space_invaders_test \
  -p 5433:5432 \
  postgres:16-alpine
```

### Environment Variables

Set test database URL:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5433/space_invaders_test?sslmode=disable
```

Or use `.env.test`:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/space_invaders_test?sslmode=disable
JWT_SECRET=test-jwt-secret-key
```

### Optional: Redis

If Redis is available, price fetching tests will run. Otherwise, they're skipped automatically.

```bash
# Optional: Start Redis for caching tests
docker run -d --name space-invaders-test-redis -p 6380:6379 redis:7-alpine
export REDIS_URL=redis://localhost:6380
```

## Running Tests

### Run All E2E Tests

```bash
cd backend
go test ./test/e2e/... -v
```

### Run Specific Test Suite

```bash
# Conversion flow tests only
go test ./test/e2e -run TestConversionFlow -v

# Shop flow tests only
go test ./test/e2e -run TestShopFlow -v
```

### Run Specific Test Case

```bash
# Run single test
go test ./test/e2e -run TestConversionFlow_EndToEnd -v

# Run tests matching pattern
go test ./test/e2e -run "TestShopFlow_Webhook" -v
```

### Run with Coverage

```bash
go test ./test/e2e/... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

### Run in Parallel

```bash
# Run tests in parallel (faster)
go test ./test/e2e/... -v -parallel=4
```

## Test Output

### Successful Run

```
=== RUN   TestConversionFlow_EndToEnd
--- PASS: TestConversionFlow_EndToEnd (0.15s)
=== RUN   TestConversionFlow_InsufficientGold
--- PASS: TestConversionFlow_InsufficientGold (0.08s)
=== RUN   TestShopFlow_ListPackages
--- PASS: TestShopFlow_ListPackages (0.05s)
=== RUN   TestShopFlow_CreateOrder
--- PASS: TestShopFlow_CreateOrder (0.12s)
PASS
ok      github.com/yourusername/space-invaders/test/e2e    0.892s
```

### Failed Test Example

```
=== RUN   TestConversionFlow_EndToEnd
    conversion_flow_test.go:85:
        Error:          Not equal:
                        expected: 4000
                        actual  : 5000
        Test:           TestConversionFlow_EndToEnd
--- FAIL: TestConversionFlow_EndToEnd (0.15s)
```

## Test Data Isolation

Each test:
- Creates a fresh test server instance
- Uses isolated test data (email suffixes: `@example.com`)
- Cleans up after completion (`defer testServer.cleanup()`)
- Can run in parallel without conflicts

## Debugging Tests

### Enable Verbose Output

```bash
go test ./test/e2e -v -run TestConversionFlow_EndToEnd
```

### Check Database State

```bash
# Connect to test database
psql postgres://postgres:postgres@localhost:5433/space_invaders_test

# View test data
SELECT * FROM players WHERE email LIKE '%@example.com';
SELECT * FROM gold_space_conversions;
SELECT * FROM orders;
```

### Print Debug Info in Tests

```go
// Add to test for debugging
t.Logf("Player balance: %d", player.GoldBalance)
t.Logf("Conversion status: %s", conversion.Status)
```

## Common Issues

### "Failed to connect to database"

**Cause:** Test database not running or wrong connection string

**Fix:**
```bash
# Check database is running
docker ps | grep test-db

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "Table doesn't exist"

**Cause:** Database schema not migrated

**Fix:** Tests auto-migrate on setup, but you can manually migrate:
```bash
go run cmd/http/main.go  # Runs migrations
```

### "Tests hang indefinitely"

**Cause:** Database deadlock or connection pool exhaustion

**Fix:**
```bash
# Kill hanging processes
pkill -f "go test"

# Restart test database
docker restart space-invaders-test-db
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: space_invaders_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run E2E Tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/space_invaders_test?sslmode=disable
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-jwt-secret
        run: |
          cd backend
          go test ./test/e2e/... -v -coverprofile=coverage.out

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.out
```

## Best Practices

### Writing E2E Tests

1. **Test complete user flows** - Register → Login → Action → Verify
2. **Use realistic data** - Actual package IDs, valid amounts
3. **Test error cases** - Invalid inputs, auth failures, missing data
4. **Verify side effects** - Database updates, balance changes
5. **Clean up after tests** - Use `defer cleanup()` pattern
6. **Make tests independent** - Each test should run standalone
7. **Use descriptive names** - `TestShopFlow_WebhookPaymentCompleted` vs `TestWebhook`

### Performance Tips

1. **Run tests in parallel** - Use `t.Parallel()` when safe
2. **Reuse test server** - But with data isolation
3. **Minimize database queries** - Batch operations when possible
4. **Use test database** - Never run E2E against production
5. **Cache external calls** - Mock or cache expensive operations

## Coverage Goals

Target coverage for E2E tests:
- **Handlers:** 80%+ (all major flows)
- **Services:** 70%+ (business logic paths)
- **Repositories:** 60%+ (CRUD operations)

Check current coverage:
```bash
go test ./test/e2e/... -coverprofile=coverage.out
go tool cover -func=coverage.out | grep total
```

## Next Steps

After E2E tests pass:
1. Run integration tests (`test/integration/`)
2. Run unit tests (`internal/*/test/`)
3. Check test coverage meets goals
4. Deploy to staging environment
5. Run smoke tests in staging

## Support

- **Test failures:** Check logs and database state
- **Flaky tests:** Look for timing issues, use `time.Sleep` sparingly
- **Performance:** Profile with `go test -cpuprofile=cpu.out`
- **Questions:** See main [README](../../README.md) or open an issue
