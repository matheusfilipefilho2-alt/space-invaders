# Fase 5+6: Admin & Polish - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panels, system configuration, metrics/monitoring, CI/CD, performance optimization, e deploy production

**Duração:** 2-3 semanas (~25 tasks)

**Pré-requisitos:** Fases 1-4 completas (Todo sistema funcionando)

**Arquitetura:**
- Admin Panel: Vue.js SPA com autenticação admin-only
- Metrics: Prometheus + Grafana para monitoramento
- Logging: Structured logging com logrus
- CI/CD: GitHub Actions para testes e deploy automático
- Deploy: Railway (backend) + Vercel (frontend)
- Performance: Load testing, caching, optimization
- Security: Rate limiting, CORS, input validation

**Tech Stack:**
- Admin: Vue 3 + Vue Router + TailwindCSS
- Monitoring: Prometheus, Grafana
- Logging: logrus, loki (optional)
- CI/CD: GitHub Actions
- Deploy: Railway, Vercel
- Testing: Go testing, Playwright E2E
- Performance: k6 load testing

## Global Constraints

- Go version: 1.21+
- Admin access: JWT with admin role claim
- Metrics: Prometheus format (/metrics endpoint)
- Logs: JSON structured logging
- Rate limiting: 100 req/min per IP (default)
- CI/CD: All tests must pass before deploy
- Deploy: Zero-downtime rolling updates
- Performance: p95 latency < 200ms
- Security: All endpoints require auth except public APIs

---

## Navegação

- [← Fase 4: Social & PvP](./fase-4-social-pvp.md)
- [📋 Índice Geral](./README.md)

---

### Task 1: Admin Authentication & Middleware

**Files:**
- Create: `backend/internal/app/http/middleware/admin_middleware.go`
- Create: `backend/internal/domain/entity/admin_user.go`
- Create: `backend/internal/domain/repository/admin_repository.go`
- Create: `backend/internal/infra/database/admin_repository_impl.go`
- Modify: `backend/pkg/jwt/jwt.go` (add admin role claim)

**Interfaces:**
- Consumes: JWT package from Fase 1
- Produces:
  - `AdminMiddleware` with method `RequireAdmin() gin.HandlerFunc`
  - `AdminRepository` with methods:
    - `FindByEmail(ctx context.Context, email string) (*entity.AdminUser, error)`
    - `Create(ctx context.Context, admin *entity.AdminUser) error`

- [ ] **Step 1: Create AdminUser entity**

Create `backend/internal/domain/entity/admin_user.go`:

```go
package entity

import (
	"gorm.io/gorm"
)

// AdminUser represents an admin account
type AdminUser struct {
	gorm.Model

	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`

	// Role: super_admin, admin
	Role string `gorm:"not null;default:'admin'"`

	// Permissions (JSON array)
	Permissions string `gorm:"type:jsonb"`

	Active bool `gorm:"default:true"`
}
```

- [ ] **Step 2: Create AdminRepository**

Create `backend/internal/domain/repository/admin_repository.go`:

```go
package repository

import (
	"context"

	"space-invaders/internal/domain/entity"
)

type AdminRepository interface {
	FindByEmail(ctx context.Context, email string) (*entity.AdminUser, error)
	Create(ctx context.Context, admin *entity.AdminUser) error
	Update(ctx context.Context, admin *entity.AdminUser) error
}
```

Create implementation `backend/internal/infra/database/admin_repository_impl.go`:

```go
package database

import (
	"context"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/domain/repository"
)

type adminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) repository.AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) FindByEmail(ctx context.Context, email string) (*entity.AdminUser, error) {
	var admin entity.AdminUser
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&admin).Error
	return &admin, err
}

func (r *adminRepository) Create(ctx context.Context, admin *entity.AdminUser) error {
	return r.db.WithContext(ctx).Create(admin).Error
}

func (r *adminRepository) Update(ctx context.Context, admin *entity.AdminUser) error {
	return r.db.WithContext(ctx).Save(admin).Error
}
```

- [ ] **Step 3: Modify JWT package to include role claim**

Modify `backend/pkg/jwt/jwt.go`:

```go
// Add to Claims struct:
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"` // "player", "admin", "super_admin"
	jwt.RegisteredClaims
}

// Add GenerateAdminToken method:
func GenerateAdminToken(adminID uint, email, role, secret string) (string, error) {
	claims := &Claims{
		UserID: adminID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
```

- [ ] **Step 4: Create admin middleware**

Create `backend/internal/app/http/middleware/admin_middleware.go`:

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"space-invaders/pkg/jwt"
)

func RequireAdmin(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := jwt.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Check if role is admin or super_admin
		if claims.Role != "admin" && claims.Role != "super_admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Set("admin_id", claims.UserID)
		c.Set("admin_role", claims.Role)
		c.Next()
	}
}
```

- [ ] **Step 5: Add AutoMigrate for AdminUser**

Modify `backend/internal/infra/database/connection.go`:

```go
// In AutoMigrateAll() function, add:
&entity.AdminUser{},
```

- [ ] **Step 6: Create seed script for first admin**

Create `backend/scripts/seed_admin.go`:

```go
package main

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"

	"space-invaders/internal/domain/entity"
	"space-invaders/internal/infra/database"
)

func main() {
	db, err := database.NewConnection()
	if err != nil {
		log.Fatal(err)
	}

	// Hash password
	password := "admin123" // Change this!
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	admin := &entity.AdminUser{
		Email:        "admin@spaceinvaders.com",
		PasswordHash: string(hash),
		Role:         "super_admin",
		Active:       true,
	}

	if err := db.Create(admin).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Println("Admin user created successfully!")
	fmt.Printf("Email: %s\n", admin.Email)
	fmt.Printf("Password: %s\n", password)
}
```

- [ ] **Step 7: Run seed script**

Run:
```bash
cd backend
go run scripts/seed_admin.go
```

Expected: "Admin user created successfully!"

- [ ] **Step 8: Commit**

```bash
git add backend/internal/domain/entity/admin_user.go \
        backend/internal/domain/repository/admin_repository.go \
        backend/internal/infra/database/admin_repository_impl.go \
        backend/internal/app/http/middleware/admin_middleware.go \
        backend/pkg/jwt/jwt.go \
        backend/scripts/seed_admin.go \
        backend/internal/infra/database/connection.go
git commit -m "feat(admin): add admin authentication and middleware"
```

---

### Task 2: Admin HTTP Controllers (System Stats)

**Files:**
- Create: `backend/internal/app/http/controller/admin_controller.go`
- Create: `backend/internal/domain/service/admin_service.go`

**Interfaces:**
- Consumes: All repositories (Player, Guild, Battle Pass, etc.)
- Produces: `AdminController` with endpoints:
  - GET /api/admin/stats/overview (total players, guilds, matches, etc.)
  - GET /api/admin/players (list players with pagination)
  - GET /api/admin/guilds (list guilds)
  - POST /api/admin/players/:id/ban
  - POST /api/admin/players/:id/unban

- [ ] **Step 1: Create AdminService**

Create `backend/internal/domain/service/admin_service.go`:

```go
package service

import (
	"context"

	"space-invaders/internal/domain/repository"
)

type AdminService struct {
	playerRepo      repository.PlayerRepository
	guildRepo       repository.GuildRepository
	battlePassRepo  repository.BattlePassRepository
	// Add other repos as needed
}

func NewAdminService(
	playerRepo repository.PlayerRepository,
	guildRepo repository.GuildRepository,
	battlePassRepo repository.BattlePassRepository,
) *AdminService {
	return &AdminService{
		playerRepo:     playerRepo,
		guildRepo:      guildRepo,
		battlePassRepo: battlePassRepo,
	}
}

type SystemStats struct {
	TotalPlayers       int64   `json:"total_players"`
	ActivePlayersToday int64   `json:"active_players_today"`
	TotalGuilds        int64   `json:"total_guilds"`
	TotalGames         int64   `json:"total_games"`
	TotalGoldCirc      uint64  `json:"total_gold_circulation"`
	TotalSpaceCirc     uint64  `json:"total_space_circulation"`
}

func (s *AdminService) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	// Implementation: Query counts from repositories
	// This is a simplified version
	stats := &SystemStats{
		TotalPlayers: 0, // Query from playerRepo
		TotalGuilds:  0, // Query from guildRepo
		// ... etc
	}

	return stats, nil
}
```

- [ ] **Step 2: Create AdminController**

Create `backend/internal/app/http/controller/admin_controller.go`:

```go
package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"space-invaders/internal/domain/service"
)

type AdminController struct {
	adminService *service.AdminService
}

func NewAdminController(adminService *service.AdminService) *AdminController {
	return &AdminController{adminService: adminService}
}

func (c *AdminController) GetSystemStats(ctx *gin.Context) {
	stats, err := c.adminService.GetSystemStats(ctx)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

func (c *AdminController) ListPlayers(ctx *gin.Context) {
	// TODO: Implement player listing with pagination
	ctx.JSON(http.StatusOK, gin.H{"players": []interface{}{}})
}

func (c *AdminController) BanPlayer(ctx *gin.Context) {
	// TODO: Implement player ban
	ctx.JSON(http.StatusOK, gin.H{"status": "banned"})
}
```

- [ ] **Step 3: Register admin routes**

Modify `backend/internal/app/http/router.go`:

```go
// Add admin routes with middleware
admin := r.Group("/api/admin")
admin.Use(middleware.RequireAdmin(config.JWTSecret))
{
	adminController := controller.NewAdminController(adminService)
	admin.GET("/stats/overview", adminController.GetSystemStats)
	admin.GET("/players", adminController.ListPlayers)
	admin.POST("/players/:id/ban", adminController.BanPlayer)
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/domain/service/admin_service.go \
        backend/internal/app/http/controller/admin_controller.go \
        backend/internal/app/http/router.go
git commit -m "feat(admin): add admin controller with system stats endpoint"
```

---

### Task 3: Prometheus Metrics Integration

**Files:**
- Create: `backend/pkg/metrics/prometheus.go`
- Create: `backend/internal/app/http/middleware/metrics_middleware.go`
- Modify: `backend/internal/app/http/router.go` (add /metrics endpoint)

**Interfaces:**
- Produces: Prometheus metrics exposed at GET /metrics
- Metrics:
  - `http_requests_total` (counter)
  - `http_request_duration_seconds` (histogram)
  - `active_players` (gauge)
  - `gold_circulation_total` (gauge)
  - `space_circulation_total` (gauge)

- [ ] **Step 1: Install Prometheus client**

Run:
```bash
cd backend
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

Expected: Dependencies added to go.mod

- [ ] **Step 2: Create Prometheus metrics package**

Create `backend/pkg/metrics/prometheus.go`:

```go
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HttpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	HttpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	ActivePlayers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_players",
			Help: "Number of active players (last 24h)",
		},
	)

	GoldCirculation = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "gold_circulation_total",
			Help: "Total Gold in circulation",
		},
	)

	SpaceCirculation = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "space_circulation_total",
			Help: "Total SPACE in circulation",
		},
	)
)
```

- [ ] **Step 3: Create metrics middleware**

Create `backend/internal/app/http/middleware/metrics_middleware.go`:

```go
package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"space-invaders/pkg/metrics"
)

func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())

		metrics.HttpRequestsTotal.WithLabelValues(c.Request.Method, c.FullPath(), status).Inc()
		metrics.HttpRequestDuration.WithLabelValues(c.Request.Method, c.FullPath()).Observe(duration)
	}
}
```

- [ ] **Step 4: Register /metrics endpoint**

Modify `backend/internal/app/http/router.go`:

```go
import (
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Add metrics endpoint (public)
r.GET("/metrics", gin.WrapH(promhttp.Handler()))

// Add middleware to all routes
r.Use(middleware.PrometheusMiddleware())
```

- [ ] **Step 5: Test metrics endpoint**

Run backend and visit:
```bash
curl http://localhost:8080/metrics
```

Expected: Prometheus metrics output (text format)

- [ ] **Step 6: Commit**

```bash
git add backend/pkg/metrics/prometheus.go \
        backend/internal/app/http/middleware/metrics_middleware.go \
        backend/internal/app/http/router.go \
        backend/go.mod \
        backend/go.sum
git commit -m "feat(monitoring): add Prometheus metrics integration"
```

---

## Remaining Tasks (Outline)

### Task 4: Structured Logging with Logrus
- **Files:** `pkg/logger/logger.go`, middleware
- **Format:** JSON structured logs with fields (request_id, user_id, duration)

### Task 5: Rate Limiting Middleware
- **Files:** `middleware/rate_limit_middleware.go`
- **Implementation:** Token bucket algorithm, 100 req/min per IP

### Task 6: CORS Configuration
- **Files:** `middleware/cors_middleware.go`
- **Settings:** Allow frontend origins only (localhost:3000, production domain)

### Task 7: Input Validation Middleware
- **Files:** `middleware/validation_middleware.go`
- **Validation:** Sanitize inputs, prevent SQL injection, XSS

### Task 8: Frontend - Admin Login Page
- **Files:** `frontend/src/views/admin/LoginView.vue`
- **Form:** Email, password, JWT token storage

### Task 9: Frontend - Admin Dashboard
- **Files:** `frontend/src/views/admin/DashboardView.vue`
- **UI:** System stats cards, charts (players, guilds, revenue)

### Task 10: Frontend - Admin Player Management
- **Files:** `frontend/src/views/admin/PlayersView.vue`
- **Features:** List players, search, ban/unban, view details

### Task 11: Frontend - Admin Guild Management
- **Files:** `frontend/src/views/admin/GuildsView.vue`
- **Features:** List guilds, view members, disband guild

### Task 12: Frontend - Admin Analytics
- **Files:** `frontend/src/views/admin/AnalyticsView.vue`
- **Charts:** User growth, revenue trends, engagement metrics

### Task 13: CI/CD - GitHub Actions Workflow
- **Files:** `.github/workflows/ci.yml`
- **Steps:** Lint, test, build, deploy on push to main

### Task 14: CI/CD - Backend Tests in Pipeline
- **Config:** Run `go test ./...` in GitHub Actions
- **Coverage:** Enforce minimum 70% coverage

### Task 15: CI/CD - Frontend Tests in Pipeline
- **Config:** Run `npm run test` in GitHub Actions
- **E2E:** Run Playwright tests on staging

### Task 16: Deploy - Railway Backend Setup
- **Files:** `railway.toml`, Dockerfile
- **Config:** PostgreSQL addon, environment variables

### Task 17: Deploy - Vercel Frontend Setup
- **Files:** `vercel.json`
- **Config:** Build command, output directory, env vars

### Task 18: Deploy - Environment Variables Management
- **Files:** `.env.production`, Railway/Vercel dashboards
- **Vars:** DATABASE_URL, SOLANA_RPC_URL, JWT_SECRET, etc.

### Task 19: Performance - Database Indexing
- **Files:** SQL migration scripts
- **Indexes:** player.username, guild.tag, battle_pass_progress(player_id, season_id)

### Task 20: Performance - Redis Caching Layer
- **Files:** `infra/cache/redis_cache.go`
- **Cache:** Leaderboards, SPACE price, frequently accessed data

### Task 21: Performance - Load Testing with k6
- **Files:** `test/load/k6_script.js`
- **Scenarios:** 1000 concurrent users, gameplay endpoint stress test

### Task 22: Security - API Key Management
- **Files:** `pkg/apikey/apikey.go`
- **Feature:** Generate API keys for 3rd-party integrations

### Task 23: Documentation - API Reference (OpenAPI/Swagger)
- **Files:** `docs/api/openapi.yaml`
- **Tool:** Swagger UI for interactive API docs

### Task 24: Documentation - Deployment Guide
- **Files:** `docs/deployment.md`
- **Sections:** Railway setup, Vercel setup, env vars, migrations

### Task 25: Final E2E Testing
- **Files:** `test/e2e/full_flow_test.go`
- **Scenario:** Register → Play → Earn → Convert → Buy → Join Guild → Battle Pass

---

## Validation Checkpoints

After completing Fase 5+6, validate:

- [ ] Admin panel funcionando (login, dashboard, player management)
- [ ] Prometheus metrics sendo coletados (/metrics endpoint)
- [ ] CI/CD pipeline funcionando (tests + deploy automático)
- [ ] Deploy staging funcionando (Railway + Vercel)
- [ ] Deploy production validado (zero-downtime)
- [ ] Load tests passando (1000 req/sec)
- [ ] Security audit completo (rate limiting, CORS, validation)
- [ ] Documentation completa (API, deployment, architecture)

---

## Production Checklist

Before going live:

- [ ] Backup strategy configurado (automated daily backups)
- [ ] Monitoring alerts configurados (Grafana alerts, PagerDuty)
- [ ] SSL certificates válidos (Let's Encrypt)
- [ ] Domain DNS configurado corretamente
- [ ] CDN setup para assets estáticos (Cloudflare)
- [ ] Error tracking configurado (Sentry)
- [ ] User analytics configurado (Google Analytics, Mixpanel)
- [ ] Legal pages criadas (Terms, Privacy Policy)
- [ ] GDPR compliance verificado
- [ ] Performance baseline estabelecido (SLOs defined)

---

## Post-Launch Tasks (Opcional)

- [ ] User feedback system (in-app surveys)
- [ ] A/B testing framework (feature flags)
- [ ] Advanced analytics (cohort analysis, retention)
- [ ] Mobile app (React Native or Flutter)
- [ ] Advanced anti-bot system (hCaptcha, fingerprinting)
- [ ] Social features (friend system, direct messages)
- [ ] Tournaments system (bracket generation, prizes)
- [ ] Marketplace (NFT trading, peer-to-peer)
- [ ] Staking system (lock SPACE for APY)
- [ ] DAO governance (token voting)

---

## Final Notes

Parabéns! 🎉 Você completou o plano completo de migração do Space Invaders para arquitetura moderna Go + Vue.js com economia dual e sistemas Web3.

**Total de tasks:** ~155 tasks distribuídas em 6 fases

**Próximos passos:**
1. Revisar todo o plano (README.md)
2. Escolher modo de execução (Subagent-Driven ou Inline)
3. Começar pela Fase 0 (Migração de Dados)
4. Executar fase por fase, validando checkpoints

**Recursos importantes:**
- Spec completo: `docs/superpowers/specs/2026-08-24-space-invaders-go-migration-design.md`
- Análise econômica: `docs/rebase.md`
- go-scaffold reference: https://github.com/braiphub/go-scaffold

Boa sorte! 🚀
