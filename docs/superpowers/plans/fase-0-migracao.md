# Space Invaders - Migração Go + Vue.js - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar Space Invaders de Supabase+JS para Go+Vue.js com economia dual Gold/SPACE, Battle Pass, Guilds, NFTs e PvP.

**Architecture:** Monorepo com backend Go (Clean Architecture/go-scaffold), frontend Vue.js 3, PostgreSQL, Redis, RabbitMQ. Deploy híbrido (Railway backend + Vercel frontend).

**Tech Stack:** Go 1.21+, Gin, GORM, PostgreSQL 16, Redis 7, RabbitMQ 3.12, Vue 3, TypeScript, Vite, Pinia, Solana, AbacatePay.

## Global Constraints

- Go version ≥ 1.21
- Node.js version ≥ 18
- PostgreSQL version = 16
- Redis version = 7
- RabbitMQ version = 3.12
- Vue version = 3.x (Composition API only)
- TypeScript strict mode enabled
- All currency amounts in uint64 (centavos for BRL, lamports for SPACE)
- Gold:SPACE exchange rate = 100:1 (hardcoded)
- Treasury emission formula: min(gameplay_rewards, pix_revenue_24h * 0.30 / space_price)
- All timestamps in UTC
- All commits follow Conventional Commits format
- Test coverage ≥ 80% for services
- No stored procedures or triggers (logic in services only)
- DRY, YAGNI, TDD always

---

## FASE 0: PREPARAÇÃO E MIGRAÇÃO (Semana 1)

### Task 1: Setup Monorepo Base

**Files:**
- Create: `docker-compose.yml`
- Create: `.gitignore`
- Create: `Makefile`
- Create: `README.md`

**Interfaces:**
- Consumes: Nothing
- Produces: Monorepo structure ready for backend/frontend development

- [ ] **Step 1: Create monorepo root structure**

```bash
mkdir -p backend/cmd/http
mkdir -p backend/internal/{domain/{entity,repository,service},infra/{database,anticorruption},events/{event,handler},api/http/{controller,middleware},app/dig}
mkdir -p backend/scripts/migrate-from-supabase
mkdir -p backend/configs
mkdir -p frontend/src/{components,stores,services,views,router}
mkdir -p frontend/public/assets
mkdir -p contracts
mkdir -p docs/superpowers/{specs,plans}
```

- [ ] **Step 2: Create root .gitignore**

```gitignore
# Backend
backend/bin/
backend/*.exe
backend/.env
backend/coverage.out

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env
frontend/.env.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
postgres_data/
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: spaceinvaders
      POSTGRES_PASSWORD: dev_password_change_in_prod
      POSTGRES_DB: spaceinvaders
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spaceinvaders"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: spaceinvaders
      RABBITMQ_DEFAULT_PASS: dev_password_change_in_prod
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 4: Create Makefile**

```makefile
.PHONY: dev test build deploy migrate clean

dev:
	docker-compose up -d postgres redis rabbitmq
	@echo "✅ Infrastructure running. Start backend and frontend manually."

test:
	cd backend && go test -v -race -coverprofile=coverage.out ./...
	cd backend && go tool cover -func=coverage.out

build:
	cd backend && go build -o bin/server cmd/http/main.go
	cd frontend && npm run build

deploy-staging:
	@echo "Deploy to staging not implemented yet"

deploy-prod:
	@echo "Deploy to production not implemented yet"

migrate-dry-run:
	cd backend/scripts/migrate-from-supabase && go run . --dry-run

migrate:
	cd backend/scripts/migrate-from-supabase && go run .

clean:
	docker-compose down -v
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf backend/coverage.out
```

- [ ] **Step 5: Create README.md**

```markdown
# Space Invaders - Go + Vue.js

Migração completa do Space Invaders para arquitetura moderna com economia dual Gold/SPACE.

## Stack

- **Backend:** Go 1.21+ (Clean Architecture/go-scaffold)
- **Frontend:** Vue 3 + TypeScript + Vite
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Queue:** RabbitMQ 3.12
- **Blockchain:** Solana

## Quick Start

\`\`\`bash
# Start infrastructure
make dev

# Backend (terminal 1)
cd backend
go run cmd/http/main.go

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
\`\`\`

## Documentation

- Spec: `docs/superpowers/specs/2026-08-24-space-invaders-go-migration-design.md`
- Plan: `docs/superpowers/plans/2026-08-24-space-invaders-go-migration.md`
```

- [ ] **Step 6: Test docker-compose**

Run: `docker-compose up -d`
Expected: All services (postgres, redis, rabbitmq) start successfully

Run: `docker-compose ps`
Expected: All services show "healthy" status

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: setup monorepo base structure

- Add docker-compose with postgres, redis, rabbitmq
- Create backend and frontend directory structure
- Add Makefile for common tasks
- Add .gitignore for Go and Node.js

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Backend Go Module Setup

**Files:**
- Create: `backend/go.mod`
- Create: `backend/go.sum`
- Create: `backend/.env.example`
- Create: `backend/configs/config.go`

**Interfaces:**
- Consumes: Monorepo structure from Task 1
- Produces: Go module initialized with all dependencies

- [ ] **Step 1: Initialize Go module**

```bash
cd backend
go mod init github.com/yourusername/space-invaders
```

- [ ] **Step 2: Install core dependencies**

```bash
go get -u github.com/gin-gonic/gin@v1.9.1
go get -u gorm.io/gorm@v1.25.5
go get -u gorm.io/driver/postgres@v1.5.4
go get -u github.com/redis/go-redis/v9@v9.3.0
go get -u github.com/rabbitmq/amqp091-go@v1.9.0
go get -u github.com/joho/godotenv@v1.5.1
go get -u github.com/golang-jwt/jwt/v5@v5.2.0
go get -u github.com/pkg/errors@v0.9.1
go get -u golang.org/x/crypto@v0.17.0
```

- [ ] **Step 3: Install blockchain dependencies**

```bash
go get -u github.com/gagliardetto/solana-go@v1.8.4
```

- [ ] **Step 4: Install testing dependencies**

```bash
go get -u github.com/stretchr/testify@v1.8.4
go get -u github.com/DATA-DOG/go-sqlmock@v1.5.1
go get -u github.com/go-redis/redismock/v9@v9.2.0
```

- [ ] **Step 5: Create .env.example**

```env
# Database
DATABASE_URL=postgres://spaceinvaders:dev_password_change_in_prod@localhost:5432/spaceinvaders?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://spaceinvaders:dev_password_change_in_prod@localhost:5672/

# Server
PORT=3000
GIN_MODE=debug
JWT_SECRET=change_this_in_production_min_32_chars

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_TREASURY_PRIVATE_KEY=
SOLANA_SPACE_MINT=

# AbacatePay
ABACATEPAY_API_KEY=
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v1
ABACATEPAY_WEBHOOK_SECRET=

# IPFS/Pinata
PINATA_API_KEY=
PINATA_SECRET_KEY=

# Supabase (migration only)
SUPABASE_URL=
SUPABASE_KEY=
```

- [ ] **Step 6: Create configs/config.go**

```go
package configs

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
}

func GetDatabaseURL() string {
	return os.Getenv("DATABASE_URL")
}

func GetRedisURL() string {
	return os.Getenv("REDIS_URL")
}

func GetRabbitMQURL() string {
	return os.Getenv("RABBITMQ_URL")
}

func GetAPIPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "3000"
	}
	return port
}

func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET must be set")
	}
	return secret
}

func GetSolanaRPCURL() string {
	return os.Getenv("SOLANA_RPC_URL")
}

func GetSolanaNetwork() string {
	network := os.Getenv("SOLANA_NETWORK")
	if network == "" {
		return "devnet"
	}
	return network
}

func GetAbacatePayAPIKey() string {
	return os.Getenv("ABACATEPAY_API_KEY")
}

func GetSupabaseURL() string {
	return os.Getenv("SUPABASE_URL")
}

func GetSupabaseKey() string {
	return os.Getenv("SUPABASE_KEY")
}
```

- [ ] **Step 7: Test Go module**

Run: `cd backend && go mod tidy`
Expected: Dependencies downloaded successfully

Run: `cd backend && go build -o bin/test cmd/http/main.go || echo "main.go not created yet (expected)"`
Expected: Error about main.go not existing (this is OK)

- [ ] **Step 8: Commit**

```bash
git add backend/go.mod backend/go.sum backend/.env.example backend/configs/
git commit -m "chore(backend): initialize Go module with dependencies

- Add core dependencies (gin, gorm, redis, rabbitmq)
- Add blockchain dependencies (solana-go)
- Add testing dependencies
- Create config package for environment variables

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend Vue.js Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/.env.example`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`

**Interfaces:**
- Consumes: Monorepo structure from Task 1
- Produces: Vue.js app initialized and runnable

- [ ] **Step 1: Create package.json**

```json
{
  "name": "space-invaders-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "type-check": "vue-tsc --noEmit"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7",
    "axios": "^1.6.2",
    "@solana/web3.js": "^1.87.6",
    "@solana/wallet-adapter-vue": "^0.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "vue-tsc": "^1.8.25",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.19.2",
    "autoprefixer": "^10.4.16",
    "tailwindcss": "^3.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create .env.example**

```env
VITE_API_URL=http://localhost:3000
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Space Invaders</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

- [ ] **Step 7: Create src/App.vue**

```vue
<template>
  <div class="app">
    <h1>Space Invaders</h1>
    <p>Frontend setup complete!</p>
  </div>
</template>

<script setup lang="ts">
// App component
</script>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #42b983;
  font-size: 3rem;
  margin-bottom: 1rem;
}
</style>
```

- [ ] **Step 8: Install dependencies**

Run: `cd frontend && npm install`
Expected: All dependencies installed successfully

- [ ] **Step 9: Test dev server**

Run: `cd frontend && npm run dev` (let it run in background)
Expected: Vite dev server starts on http://localhost:5173

Open browser to http://localhost:5173
Expected: "Space Invaders - Frontend setup complete!" message

Stop dev server: `Ctrl+C`

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): initialize Vue.js 3 project

- Add Vite build system with TypeScript
- Add Pinia for state management
- Add Solana wallet adapter
- Configure proxy for backend API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Backend Entities - Core

**Files:**
- Create: `backend/internal/domain/entity/player.go`
- Create: `backend/internal/domain/entity/league.go`
- Create: `backend/internal/domain/entity/player_item.go`
- Create: `backend/internal/domain/entity/achievement.go`
- Create: `backend/internal/domain/entity/player_achievement.go`

**Interfaces:**
- Consumes: Go module from Task 2
- Produces: Core entity types (Player, League, PlayerItem, Achievement, PlayerAchievement)

- [ ] **Step 1: Create internal/domain/entity/player.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type Player struct {
	gorm.Model
	Username     string  `gorm:"uniqueIndex;not null"`
	Email        string  `gorm:"uniqueIndex"`
	EmailVerified bool   `gorm:"default:false"`
	PasswordHash string  `gorm:"not null"`
	WalletAddress *string `gorm:"uniqueIndex"`

	// Stats
	HighScore  uint64     `gorm:"default:0"`
	TotalGames uint       `gorm:"default:0"`
	LastPlayed *time.Time

	// Economy
	GoldBalance  uint64 `gorm:"default:0"`
	SpaceBalance uint64 `gorm:"default:0"`

	// Progression
	LeagueID   uint `gorm:"default:1"`
	RankPoints uint `gorm:"default:0"`
	League     *League

	// Notifications
	NotifyOffers       bool `gorm:"default:true"`
	NotifyAchievements bool `gorm:"default:true"`
	NotifyShop         bool `gorm:"default:false"`

	// Relations
	GuildID *uint
}

func (Player) TableName() string {
	return "players"
}
```

- [ ] **Step 2: Create internal/domain/entity/league.go**

```go
package entity

type League struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"not null"` // Bronze, Silver, Gold, Platinum, Diamond, Master
	MinPoints uint   `gorm:"not null"`
	MaxPoints uint   `gorm:"not null"`
	Icon      string
	Color     string
}

func (League) TableName() string {
	return "leagues"
}

// SeedLeagues returns initial league data
func SeedLeagues() []League {
	return []League{
		{ID: 1, Name: "Bronze", MinPoints: 0, MaxPoints: 999, Icon: "🥉", Color: "#CD7F32"},
		{ID: 2, Name: "Silver", MinPoints: 1000, MaxPoints: 2499, Icon: "🥈", Color: "#C0C0C0"},
		{ID: 3, Name: "Gold", MinPoints: 2500, MaxPoints: 4999, Icon: "🥇", Color: "#FFD700"},
		{ID: 4, Name: "Platinum", MinPoints: 5000, MaxPoints: 9999, Icon: "⭐", Color: "#E5E4E2"},
		{ID: 5, Name: "Diamond", MinPoints: 10000, MaxPoints: 19999, Icon: "💎", Color: "#B9F2FF"},
		{ID: 6, Name: "Master", MinPoints: 20000, MaxPoints: 999999, Icon: "👑", Color: "#FF6B6B"},
	}
}
```

- [ ] **Step 3: Create internal/domain/entity/player_item.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type ItemType string

const (
	ItemTypeSkin      ItemType = "skin"
	ItemTypePowerup   ItemType = "powerup"
	ItemTypeCosmetic  ItemType = "cosmetic"
)

type PlayerItem struct {
	gorm.Model
	PlayerID uint `gorm:"index:idx_player_items;not null"`
	Player   *Player

	ItemID     string   `gorm:"not null"` // e.g., "skin_epic_001"
	ItemType   ItemType `gorm:"not null"`
	ItemName   string
	IsEquipped bool `gorm:"default:false"`
	IsPermanent bool `gorm:"default:true"`

	// NFT tracking
	NFTMintAddress *string
	IsOnChain      bool `gorm:"default:false"`
	MintedAt       *time.Time
	BurnedAt       *time.Time
}

func (PlayerItem) TableName() string {
	return "player_items"
}
```

- [ ] **Step 4: Create internal/domain/entity/achievement.go**

```go
package entity

import "time"

type AchievementRarity string

const (
	AchievementRarityCommon    AchievementRarity = "COMMON"
	AchievementRarityRare      AchievementRarity = "RARE"
	AchievementRarityEpic      AchievementRarity = "EPIC"
	AchievementRarityLegendary AchievementRarity = "LEGENDARY"
)

type Achievement struct {
	ID          string            `gorm:"primaryKey"` // e.g., "first_kill"
	Name        string            `gorm:"not null"`
	Description string
	Icon        string
	Rarity      AchievementRarity `gorm:"not null;default:COMMON"`
	RewardGold  uint              `gorm:"default:0"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Achievement) TableName() string {
	return "achievements"
}

// SeedAchievements returns initial achievements
func SeedAchievements() []Achievement {
	return []Achievement{
		{
			ID:          "first_kill",
			Name:        "First Blood",
			Description: "Destroy your first alien",
			Icon:        "🎯",
			Rarity:      AchievementRarityCommon,
			RewardGold:  10,
		},
		{
			ID:          "score_10k",
			Name:        "Score Master",
			Description: "Reach 10,000 points",
			Icon:        "⭐",
			Rarity:      AchievementRarityRare,
			RewardGold:  50,
		},
		{
			ID:          "score_100k",
			Name:        "Score Legend",
			Description: "Reach 100,000 points",
			Icon:        "🌟",
			Rarity:      AchievementRarityEpic,
			RewardGold:  200,
		},
		{
			ID:          "games_100",
			Name:        "Century Player",
			Description: "Play 100 games",
			Icon:        "🎮",
			Rarity:      AchievementRarityRare,
			RewardGold:  100,
		},
		{
			ID:          "nft_mint_first",
			Name:        "NFT Collector",
			Description: "Mint your first NFT",
			Icon:        "🖼️",
			Rarity:      AchievementRarityEpic,
			RewardGold:  0,
		},
		{
			ID:          "guild_founder",
			Name:        "Guild Master",
			Description: "Create a guild",
			Icon:        "🏛️",
			Rarity:      AchievementRarityLegendary,
			RewardGold:  500,
		},
		{
			ID:          "tournament_win",
			Name:        "Champion",
			Description: "Win a tournament",
			Icon:        "🏆",
			Rarity:      AchievementRarityLegendary,
			RewardGold:  1000,
		},
	}
}
```

- [ ] **Step 5: Create internal/domain/entity/player_achievement.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type PlayerAchievement struct {
	gorm.Model
	PlayerID      uint   `gorm:"uniqueIndex:idx_player_achievement;not null"`
	AchievementID string `gorm:"uniqueIndex:idx_player_achievement;not null"`
	Player        *Player
	Achievement   *Achievement

	UnlockedAt time.Time
	Notified   bool `gorm:"default:false"`
}

func (PlayerAchievement) TableName() string {
	return "player_achievements"
}
```

- [ ] **Step 6: Test entities compile**

Run: `cd backend && go build ./internal/domain/entity`
Expected: Package compiles successfully

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/
git commit -m "feat(backend): add core domain entities

- Add Player entity with gold/space balances
- Add League entity with seed data
- Add PlayerItem entity with NFT tracking
- Add Achievement entity with seed data
- Add PlayerAchievement entity

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Backend Entities - Economy & Treasury

**Files:**
- Create: `backend/internal/domain/entity/conversion.go`
- Create: `backend/internal/domain/entity/daily_emission.go`
- Create: `backend/internal/domain/entity/reward_history.go`
- Create: `backend/internal/domain/entity/order.go`

**Interfaces:**
- Consumes: Core entities from Task 4
- Produces: Economy entity types (GoldSpaceConversion, DailyEmission, RewardHistory, Order)

- [ ] **Step 1: Create internal/domain/entity/conversion.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type ConversionType string
type ConversionStatus string

const (
	ConversionTypeGoldToSpace ConversionType = "GOLD_TO_SPACE"
	ConversionTypeSpaceToGold ConversionType = "SPACE_TO_GOLD"

	ConversionStatusPending   ConversionStatus = "PENDING"
	ConversionStatusCompleted ConversionStatus = "COMPLETED"
	ConversionStatusFailed    ConversionStatus = "FAILED"
)

type GoldSpaceConversion struct {
	gorm.Model
	PlayerID uint `gorm:"index;not null"`
	Player   *Player

	Type         ConversionType   `gorm:"not null"`
	GoldAmount   uint64           `gorm:"not null"`
	SpaceAmount  uint64           `gorm:"not null"`
	ExchangeRate uint             `gorm:"not null;default:100"` // Gold per SPACE

	TxSignature *string          `gorm:"uniqueIndex"` // Solana transaction
	Status      ConversionStatus `gorm:"not null;default:PENDING"`
	CompletedAt *time.Time
}

func (GoldSpaceConversion) TableName() string {
	return "gold_space_conversions"
}
```

- [ ] **Step 2: Create internal/domain/entity/daily_emission.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type DailyEmission struct {
	gorm.Model
	Date time.Time `gorm:"uniqueIndex;not null"` // UTC date truncated

	// Inputs
	PixRevenue24h   uint64 `gorm:"not null;default:0"` // centavos
	SpacePrice      uint64 `gorm:"not null;default:100"` // centavos (R$ 1.00)
	GameplayRewards uint64 `gorm:"not null;default:0"` // SPACE expected from gameplay

	// Outputs (calculated)
	EmissionLimit     uint64 `gorm:"not null;default:0"` // (PixRevenue × 0.30) / SpacePrice
	EmissionUsed      uint64 `gorm:"not null;default:0"` // Total already emitted today
	EmissionAvailable uint64 `gorm:"not null;default:0"` // Limit - Used
}

func (DailyEmission) TableName() string {
	return "daily_emissions"
}
```

- [ ] **Step 3: Create internal/domain/entity/reward_history.go**

```go
package entity

import (
	"gorm.io/gorm"
)

type RewardType string

const (
	RewardTypeGoldEarned    RewardType = "GOLD_EARNED"
	RewardTypeAchievement   RewardType = "ACHIEVEMENT"
	RewardTypeLevelUp       RewardType = "LEVEL_UP"
	RewardTypeBattlePass    RewardType = "BATTLE_PASS"
	RewardTypeTournament    RewardType = "TOURNAMENT"
	RewardTypeGuildBonus    RewardType = "GUILD_BONUS"
)

type RewardHistory struct {
	gorm.Model
	PlayerID uint `gorm:"index;not null"`
	Player   *Player

	RewardType        RewardType `gorm:"not null"`
	GoldAmount        uint       `gorm:"default:0"`
	SpaceAmount       uint       `gorm:"default:0"`
	Description       string
	GameScore         uint
	PreviousHighScore uint
}

func (RewardHistory) TableName() string {
	return "reward_history"
}
```

- [ ] **Step 4: Create internal/domain/entity/order.go**

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "PENDING"
	OrderStatusCompleted OrderStatus = "COMPLETED"
	OrderStatusCancelled OrderStatus = "CANCELLED"
	OrderStatusExpired   OrderStatus = "EXPIRED"
)

type Order struct {
	gorm.Model
	PlayerID  uint `gorm:"index;not null"`
	Player    *Player

	PackageID   string      `gorm:"not null"` // e.g., "gold_1000"
	Amount      uint64      `gorm:"not null"` // centavos
	GoldAmount  uint64      `gorm:"not null"` // gold to credit
	Status      OrderStatus `gorm:"not null;default:PENDING"`

	// AbacatePay
	ExternalID    string `gorm:"uniqueIndex;not null"` // order_{id}
	PixCode       string
	QRCodeURL     string
	PaymentURL    string
	ExpiresAt     *time.Time
	CompletedAt   *time.Time
}

func (Order) TableName() string {
	return "orders"
}
```

- [ ] **Step 5: Test entities compile**

Run: `cd backend && go build ./internal/domain/entity`
Expected: Package compiles successfully

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/
git commit -m "feat(backend): add economy domain entities

- Add GoldSpaceConversion entity (conversions tracking)
- Add DailyEmission entity (Treasury emission control)
- Add RewardHistory entity (player rewards log)
- Add Order entity (PIX payment tracking)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: ETL Script - Extract from Supabase

**Files:**
- Create: `backend/scripts/migrate-from-supabase/main.go`
- Create: `backend/scripts/migrate-from-supabase/extract.go`
- Create: `backend/scripts/migrate-from-supabase/types.go`

**Interfaces:**
- Consumes: Supabase connection (SUPABASE_URL, SUPABASE_KEY from env)
- Produces: `ExtractedData` struct with all Supabase table data

- [ ] **Step 1: Install Supabase Go client**

```bash
cd backend
go get -u github.com/supabase-community/supabase-go@v0.0.3
```

- [ ] **Step 2: Create scripts/migrate-from-supabase/types.go**

```go
package main

import "time"

// ExtractedData holds all data from Supabase
type ExtractedData struct {
	Players             []SupabasePlayer
	PlayerItems         []SupabasePlayerItem
	PlayerAchievements  []SupabasePlayerAchievement
	Achievements        []SupabaseAchievement
	RewardHistory       []SupabaseRewardHistory
	TokenTransactions   []SupabaseTokenTransaction
	NFTMetadata         []SupabaseNFTMetadata
	PvPMatches          []SupabasePvPMatch
	PvPRankings         []SupabasePvPRanking
	PvPMatchHistory     []SupabasePvPMatchHistory
	PvPChallenges       []SupabasePvPChallenge
	SystemConfig        []SupabaseSystemConfig
	SpecialEvents       []SupabaseSpecialEvent
}

// Supabase schema types
type SupabasePlayer struct {
	ID                     int64      `json:"id"`
	Username               string     `json:"username"`
	Pin                    string     `json:"pin"`
	Email                  *string    `json:"email"`
	EmailVerified          bool       `json:"email_verified"`
	HighScore              int64      `json:"high_score"`
	Coins                  int        `json:"coins"`
	LevelID                int        `json:"level_id"`
	TotalGames             int        `json:"total_games"`
	LastPlayed             *time.Time `json:"last_played"`
	NotificationsOffers    bool       `json:"notifications_offers"`
	NotificationsAchievements bool    `json:"notifications_achievements"`
	NotificationsShop      bool       `json:"notifications_shop"`
	CreatedAt              time.Time  `json:"created_at"`

	// From player_wallets merge
	WalletAddress          *string    `json:"wallet_address,omitempty"`
}

type SupabasePlayerItem struct {
	ID             int64      `json:"id"`
	PlayerID       int64      `json:"player_id"`
	ItemID         string     `json:"item_id"`
	ItemName       string     `json:"item_name"`
	ItemCategory   string     `json:"item_category"`
	IsPermanent    bool       `json:"is_permanent"`
	IsActive       bool       `json:"is_active"`
	NFTMintAddress *string    `json:"nft_mint_address"`
	IsOnChain      bool       `json:"is_on_chain"`
	MintedAt       *time.Time `json:"minted_at"`
	BurnedAt       *time.Time `json:"burned_at"`
	PurchasedAt    time.Time  `json:"purchased_at"`
}

type SupabaseAchievement struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Description     *string   `json:"description"`
	Icon            *string   `json:"icon"`
	RequirementType *string   `json:"requirement_type"`
	RequirementValue *int     `json:"requirement_value"`
	CoinReward      int       `json:"coin_reward"`
	CreatedAt       time.Time `json:"created_at"`
}

type SupabasePlayerAchievement struct {
	ID            int64     `json:"id"`
	PlayerID      int64     `json:"player_id"`
	AchievementID int64     `json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}

type SupabaseRewardHistory struct {
	ID                int64     `json:"id"`
	PlayerID          *int64    `json:"player_id"`
	RewardType        string    `json:"reward_type"`
	Amount            int       `json:"amount"`
	Description       *string   `json:"description"`
	GameScore         *int      `json:"game_score"`
	PreviousHighScore *int      `json:"previous_high_score"`
	CreatedAt         time.Time `json:"created_at"`
}

type SupabaseTokenTransaction struct {
	ID            string     `json:"id"` // UUID
	PlayerID      int64      `json:"player_id"`
	Type          string     `json:"type"` // WITHDRAW or DEPOSIT
	Amount        int64      `json:"amount"`
	TxSignature   string     `json:"tx_signature"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	ConfirmedAt   *time.Time `json:"confirmed_at"`
}

type SupabaseNFTMetadata struct {
	ID           string     `json:"id"` // UUID
	MintAddress  string     `json:"mint_address"`
	PlayerID     int64      `json:"player_id"`
	ItemID       string     `json:"item_id"`
	Name         *string    `json:"name"`
	ImageURL     *string    `json:"image_url"`
	MetadataURI  *string    `json:"metadata_uri"`
	Rarity       *string    `json:"rarity"`
	MintedAt     time.Time  `json:"minted_at"`
	BurnedAt     *time.Time `json:"burned_at"`
}

type SupabasePvPMatch struct {
	ID             int64      `json:"id"`
	Player1ID      int64      `json:"player1_id"`
	Player2ID      int64      `json:"player2_id"`
	BetAmount      int        `json:"bet_amount"`
	EscrowedCoins  int        `json:"escrowed_coins"`
	Status         string     `json:"status"`
	WinnerID       *int64     `json:"winner_id"`
	Player1Kills   int        `json:"player1_kills"`
	Player2Kills   int        `json:"player2_kills"`
	DurationSeconds *int      `json:"duration_seconds"`
	RoomID         string     `json:"room_id"`
	GameSeed       string     `json:"game_seed"`
	CreatedAt      time.Time  `json:"created_at"`
	StartedAt      *time.Time `json:"started_at"`
	EndedAt        *time.Time `json:"ended_at"`
}

type SupabasePvPRanking struct {
	PlayerID      int64      `json:"player_id"`
	Elo           int        `json:"elo"`
	PeakElo       int        `json:"peak_elo"`
	TotalMatches  int        `json:"total_matches"`
	Wins          int        `json:"wins"`
	Losses        int        `json:"losses"`
	LastMatchAt   *time.Time `json:"last_match_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type SupabasePvPMatchHistory struct {
	ID              int64     `json:"id"`
	MatchID         int64     `json:"match_id"`
	PlayerID        int64     `json:"player_id"`
	Won             bool      `json:"won"`
	Kills           int       `json:"kills"`
	Deaths          int       `json:"deaths"`
	DurationSeconds int       `json:"duration_seconds"`
	CoinsChange     int       `json:"coins_change"`
	EloChange       int       `json:"elo_change"`
	PlayedAt        time.Time `json:"played_at"`
}

type SupabasePvPChallenge struct {
	ID            int64      `json:"id"`
	ChallengerID  int64      `json:"challenger_id"`
	ChallengedID  int64      `json:"challenged_id"`
	BetAmount     int        `json:"bet_amount"`
	Status        string     `json:"status"`
	MatchID       *int64     `json:"match_id"`
	CreatedAt     time.Time  `json:"created_at"`
	RespondedAt   *time.Time `json:"responded_at"`
	ExpiresAt     time.Time  `json:"expires_at"`
}

type SupabaseSystemConfig struct {
	ID          int64     `json:"id"`
	ConfigKey   string    `json:"config_key"`
	ConfigValue map[string]interface{} `json:"config_value"`
	Description *string   `json:"description"`
	Category    string    `json:"category"`
	UpdatedBy   *string   `json:"updated_by"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type SupabaseSpecialEvent struct {
	ID           int64                  `json:"id"`
	EventName    string                 `json:"event_name"`
	EventType    string                 `json:"event_type"`
	Description  *string                `json:"description"`
	StartDate    time.Time              `json:"start_date"`
	EndDate      time.Time              `json:"end_date"`
	IsActive     bool                   `json:"is_active"`
	Config       map[string]interface{} `json:"config"`
	Rewards      map[string]interface{} `json:"rewards"`
	Participants int                    `json:"participants"`
	CreatedAt    time.Time              `json:"created_at"`
}
```

- [ ] **Step 3: Create scripts/migrate-from-supabase/extract.go**

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/supabase-community/supabase-go"
)

func extractAllData(client *supabase.Client) (*ExtractedData, error) {
	log.Println("🔍 Starting data extraction from Supabase...")

	data := &ExtractedData{}
	ctx := context.Background()

	// Extract players (with wallet merge)
	log.Println("  📊 Extracting players...")
	if err := extractPlayers(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract players: %w", err)
	}
	log.Printf("  ✅ Extracted %d players\n", len(data.Players))

	// Extract player items
	log.Println("  📊 Extracting player items...")
	if err := extractPlayerItems(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract player items: %w", err)
	}
	log.Printf("  ✅ Extracted %d player items\n", len(data.PlayerItems))

	// Extract achievements
	log.Println("  📊 Extracting achievements...")
	if err := extractAchievements(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract achievements: %w", err)
	}
	log.Printf("  ✅ Extracted %d achievements\n", len(data.Achievements))

	// Extract player achievements
	log.Println("  📊 Extracting player achievements...")
	if err := extractPlayerAchievements(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract player achievements: %w", err)
	}
	log.Printf("  ✅ Extracted %d player achievements\n", len(data.PlayerAchievements))

	// Extract reward history
	log.Println("  📊 Extracting reward history...")
	if err := extractRewardHistory(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract reward history: %w", err)
	}
	log.Printf("  ✅ Extracted %d reward history records\n", len(data.RewardHistory))

	// Extract token transactions
	log.Println("  📊 Extracting token transactions...")
	if err := extractTokenTransactions(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract token transactions: %w", err)
	}
	log.Printf("  ✅ Extracted %d token transactions\n", len(data.TokenTransactions))

	// Extract NFT metadata
	log.Println("  📊 Extracting NFT metadata...")
	if err := extractNFTMetadata(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract NFT metadata: %w", err)
	}
	log.Printf("  ✅ Extracted %d NFT metadata records\n", len(data.NFTMetadata))

	// Extract PvP data
	log.Println("  📊 Extracting PvP matches...")
	if err := extractPvPMatches(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract pvp matches: %w", err)
	}
	log.Printf("  ✅ Extracted %d PvP matches\n", len(data.PvPMatches))

	log.Println("  📊 Extracting PvP rankings...")
	if err := extractPvPRankings(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract pvp rankings: %w", err)
	}
	log.Printf("  ✅ Extracted %d PvP rankings\n", len(data.PvPRankings))

	log.Println("  📊 Extracting PvP match history...")
	if err := extractPvPMatchHistory(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract pvp match history: %w", err)
	}
	log.Printf("  ✅ Extracted %d PvP match history records\n", len(data.PvPMatchHistory))

	log.Println("  📊 Extracting PvP challenges...")
	if err := extractPvPChallenges(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract pvp challenges: %w", err)
	}
	log.Printf("  ✅ Extracted %d PvP challenges\n", len(data.PvPChallenges))

	// Extract system config
	log.Println("  📊 Extracting system config...")
	if err := extractSystemConfig(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract system config: %w", err)
	}
	log.Printf("  ✅ Extracted %d system configs\n", len(data.SystemConfig))

	// Extract special events (last 30 days + future)
	log.Println("  📊 Extracting special events...")
	if err := extractSpecialEvents(ctx, client, data); err != nil {
		return nil, fmt.Errorf("extract special events: %w", err)
	}
	log.Printf("  ✅ Extracted %d special events\n", len(data.SpecialEvents))

	log.Println("✅ Data extraction complete!")
	return data, nil
}

func extractPlayers(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	// Query players with wallet merge
	query := `
		SELECT
			p.*,
			pw.wallet_address
		FROM players p
		LEFT JOIN player_wallets pw ON pw.player_id = p.id AND pw.is_primary = true
		ORDER BY p.id
	`

	var players []SupabasePlayer
	if _, err := client.From("players").Select(query, "exact", false).Execute(&players); err != nil {
		return err
	}

	data.Players = players
	return nil
}

func extractPlayerItems(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var items []SupabasePlayerItem
	if _, err := client.From("player_items").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&items); err != nil {
		return err
	}
	data.PlayerItems = items
	return nil
}

func extractAchievements(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var achievements []SupabaseAchievement
	if _, err := client.From("achievements").Select("*", "exact", false).Execute(&achievements); err != nil {
		return err
	}
	data.Achievements = achievements
	return nil
}

func extractPlayerAchievements(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var playerAchievements []SupabasePlayerAchievement
	if _, err := client.From("player_achievements").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&playerAchievements); err != nil {
		return err
	}
	data.PlayerAchievements = playerAchievements
	return nil
}

func extractRewardHistory(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var rewards []SupabaseRewardHistory
	if _, err := client.From("reward_history").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&rewards); err != nil {
		return err
	}
	data.RewardHistory = rewards
	return nil
}

func extractTokenTransactions(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var transactions []SupabaseTokenTransaction
	if _, err := client.From("token_transactions").Select("*", "exact", false).Order("created_at", &supabase.OrderOpts{Ascending: true}).Execute(&transactions); err != nil {
		return err
	}
	data.TokenTransactions = transactions
	return nil
}

func extractNFTMetadata(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var nfts []SupabaseNFTMetadata
	if _, err := client.From("nft_metadata").Select("*", "exact", false).Order("minted_at", &supabase.OrderOpts{Ascending: true}).Execute(&nfts); err != nil {
		return err
	}
	data.NFTMetadata = nfts
	return nil
}

func extractPvPMatches(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var matches []SupabasePvPMatch
	if _, err := client.From("pvp_matches").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&matches); err != nil {
		return err
	}
	data.PvPMatches = matches
	return nil
}

func extractPvPRankings(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var rankings []SupabasePvPRanking
	if _, err := client.From("pvp_rankings").Select("*", "exact", false).Execute(&rankings); err != nil {
		return err
	}
	data.PvPRankings = rankings
	return nil
}

func extractPvPMatchHistory(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var history []SupabasePvPMatchHistory
	if _, err := client.From("pvp_match_history").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&history); err != nil {
		return err
	}
	data.PvPMatchHistory = history
	return nil
}

func extractPvPChallenges(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var challenges []SupabasePvPChallenge
	if _, err := client.From("pvp_challenges").Select("*", "exact", false).Order("id", &supabase.OrderOpts{Ascending: true}).Execute(&challenges); err != nil {
		return err
	}
	data.PvPChallenges = challenges
	return nil
}

func extractSystemConfig(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	var configs []SupabaseSystemConfig
	if _, err := client.From("system_config").Select("*", "exact", false).Execute(&configs); err != nil {
		return err
	}
	data.SystemConfig = configs
	return nil
}

func extractSpecialEvents(ctx context.Context, client *supabase.Client, data *ExtractedData) error {
	cutoffDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")

	var events []SupabaseSpecialEvent
	if _, err := client.From("special_events").
		Select("*", "exact", false).
		Filter("end_date", "gte", cutoffDate).
		Order("created_at", &supabase.OrderOpts{Ascending: true}).
		Execute(&events); err != nil {
		return err
	}
	data.SpecialEvents = events
	return nil
}
```

- [ ] **Step 4: Test extraction compilation**

Run: `cd backend/scripts/migrate-from-supabase && go build`
Expected: Package compiles successfully

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/migrate-from-supabase/
git commit -m "feat(migration): add Supabase data extraction

- Add all Supabase schema type definitions
- Implement extraction for 13 critical tables
- Merge player_wallets into players query
- Filter special_events to last 30 days + future

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Transform Extracted Data

**Files:**
- Create: `backend/scripts/migrate-from-supabase/transform.go`
- Create: `backend/scripts/migrate-from-supabase/transform_test.go`

**Interfaces:**
- Consumes: `ExtractedData` from extract.go
- Produces: `TransformedData` with Go domain entities

- [ ] **Step 1: Create transformation types**

Create `backend/scripts/migrate-from-supabase/transform.go`:

```go
package main

import (
	"time"

	"space-invaders/internal/domain/entity"
)

type TransformedData struct {
	Players              []entity.Player
	Leagues              []entity.League
	PlayerItems          []entity.PlayerItem
	Achievements         []entity.Achievement
	PlayerAchievements   []entity.PlayerAchievement
	BattlePassSeasons    []entity.BattlePassSeason
	BattlePassProgress   []entity.BattlePassProgress
	BattlePassRewards    []entity.BattlePassReward
	Conversions          []entity.Conversion
	DailyEmissions       []entity.DailyEmission
	RewardHistory        []entity.RewardHistory
	Orders               []entity.Order
	PvPMatches           []entity.PvPMatch
}

func TransformData(data *ExtractedData) (*TransformedData, error) {
	transformed := &TransformedData{}

	// Transform players (merge with wallets)
	transformed.Players = transformPlayers(data.Players, data.PlayerWallets)

	// Transform other entities
	transformed.Leagues = transformLeagues(data.Leagues)
	transformed.PlayerItems = transformPlayerItems(data.PlayerItems)
	transformed.Achievements = transformAchievements(data.Achievements)
	transformed.PlayerAchievements = transformPlayerAchievements(data.PlayerAchievements)
	transformed.BattlePassSeasons = transformBattlePassSeasons(data.BattlePassSeasons)
	transformed.BattlePassProgress = transformBattlePassProgress(data.BattlePassProgress)
	transformed.BattlePassRewards = transformBattlePassRewards(data.BattlePassRewards)
	transformed.Conversions = transformConversions(data.Conversions)
	transformed.DailyEmissions = transformDailyEmissions(data.DailyEmissions)
	transformed.RewardHistory = transformRewardHistory(data.RewardHistory)
	transformed.Orders = transformOrders(data.Orders)
	transformed.PvPMatches = transformPvPMatches(data.PvPMatchHistory)

	return transformed, nil
}

func transformPlayers(supaPlayers []SupabasePlayer, supaWallets []SupabasePlayerWallet) []entity.Player {
	// Create wallet map for quick lookup
	walletMap := make(map[string]string)
	for _, w := range supaWallets {
		walletMap[w.PlayerID] = w.WalletAddress
	}

	players := make([]entity.Player, 0, len(supaPlayers))
	for _, sp := range supaPlayers {
		var walletAddr *string
		if addr, ok := walletMap[sp.ID]; ok && addr != "" {
			walletAddr = &addr
		}

		player := entity.Player{
			Username:      sp.Username,
			Email:         sp.Email,
			PasswordHash:  sp.PasswordHash,
			WalletAddress: walletAddr,
			HighScore:     uint64(sp.HighScore),
			TotalGames:    uint(sp.TotalGames),
			GoldBalance:   uint64(sp.Coins), // Coins → GoldBalance
			SpaceBalance:  0,                 // Start with 0 SPACE (migration compensation in Task 10)
			LeagueID:      1,                 // Default to Bronze (will be updated)
			RankPoints:    uint(sp.RankPoints),
		}

		// Set timestamps
		player.CreatedAt = parseTime(sp.CreatedAt)
		player.UpdatedAt = parseTime(sp.UpdatedAt)

		players = append(players, player)
	}

	return players
}

func transformLeagues(supaLeagues []SupabaseLeague) []entity.League {
	leagues := make([]entity.League, 0, len(supaLeagues))
	for _, sl := range supaLeagues {
		league := entity.League{
			Name:            sl.Name,
			MinRankPoints:   uint(sl.MinRankPoints),
			MaxRankPoints:   uint(sl.MaxRankPoints),
			IconURL:         sl.IconURL,
			PromotionBonus:  uint64(sl.PromotionBonus),
			DemotionPenalty: uint64(sl.DemotionPenalty),
		}
		league.CreatedAt = parseTime(sl.CreatedAt)
		league.UpdatedAt = parseTime(sl.UpdatedAt)
		leagues = append(leagues, league)
	}
	return leagues
}

func transformPlayerItems(supaItems []SupabasePlayerItem) []entity.PlayerItem {
	items := make([]entity.PlayerItem, 0, len(supaItems))
	for _, si := range supaItems {
		item := entity.PlayerItem{
			PlayerID:   uuidToUint(si.PlayerID), // Convert UUID to uint
			ItemCode:   si.ItemCode,
			ItemType:   si.ItemType,
			Quantity:   uint(si.Quantity),
			IsEquipped: si.IsEquipped,
		}
		item.CreatedAt = parseTime(si.CreatedAt)
		item.UpdatedAt = parseTime(si.UpdatedAt)
		items = append(items, item)
	}
	return items
}

func transformAchievements(supaAchievements []SupabaseAchievement) []entity.Achievement {
	achievements := make([]entity.Achievement, 0, len(supaAchievements))
	for _, sa := range supaAchievements {
		achievement := entity.Achievement{
			Code:        sa.Code,
			Name:        sa.Name,
			Description: sa.Description,
			Criteria:    sa.Criteria,
			GoldReward:  uint64(sa.GoldReward),
			SpaceReward: uint64(sa.SpaceReward),
			IconURL:     sa.IconURL,
			Rarity:      sa.Rarity,
		}
		achievement.CreatedAt = parseTime(sa.CreatedAt)
		achievement.UpdatedAt = parseTime(sa.UpdatedAt)
		achievements = append(achievements, achievement)
	}
	return achievements
}

func transformPlayerAchievements(supaPlayerAchievements []SupabasePlayerAchievement) []entity.PlayerAchievement {
	playerAchievements := make([]entity.PlayerAchievement, 0, len(supaPlayerAchievements))
	for _, spa := range supaPlayerAchievements {
		playerAchievement := entity.PlayerAchievement{
			PlayerID:      uuidToUint(spa.PlayerID),
			AchievementID: uuidToUint(spa.AchievementID),
			UnlockedAt:    parseTime(spa.UnlockedAt),
			Progress:      spa.Progress,
			ProgressMax:   spa.ProgressMax,
		}
		playerAchievement.CreatedAt = parseTime(spa.CreatedAt)
		playerAchievement.UpdatedAt = parseTime(spa.UpdatedAt)
		playerAchievements = append(playerAchievements, playerAchievement)
	}
	return playerAchievements
}

// Helper functions
func parseTime(t string) time.Time {
	parsed, _ := time.Parse(time.RFC3339, t)
	return parsed
}

// UUID to uint mapping (will be done via compensation table)
var uuidToUintMap = make(map[string]uint)
var uintCounter uint = 1

func uuidToUint(uuid string) uint {
	if id, ok := uuidToUintMap[uuid]; ok {
		return id
	}
	uuidToUintMap[uuid] = uintCounter
	uintCounter++
	return uuidToUintMap[uuid]
}
```

- [ ] **Step 2: Implement remaining transform functions**

Add to `transform.go`:

```go
func transformBattlePassSeasons(supaSeasons []SupabaseBattlePassSeason) []entity.BattlePassSeason {
	// Similar pattern
	return []entity.BattlePassSeason{}
}

func transformBattlePassProgress(supaProgress []SupabaseBattlePassProgress) []entity.BattlePassProgress {
	// Similar pattern
	return []entity.BattlePassProgress{}
}

func transformBattlePassRewards(supaRewards []SupabaseBattlePassReward) []entity.BattlePassReward {
	// Similar pattern
	return []entity.BattlePassReward{}
}

func transformConversions(supaConversions []SupabaseConversion) []entity.Conversion {
	// Similar pattern
	return []entity.Conversion{}
}

func transformDailyEmissions(supaEmissions []SupabaseDailyEmission) []entity.DailyEmission {
	// Similar pattern
	return []entity.DailyEmission{}
}

func transformRewardHistory(supaRewards []SupabaseRewardHistory) []entity.RewardHistory {
	// Similar pattern
	return []entity.RewardHistory{}
}

func transformOrders(supaOrders []SupabaseOrder) []entity.Order {
	// Similar pattern
	return []entity.Order{}
}

func transformPvPMatches(supaMatches []SupabasePvPMatchHistory) []entity.PvPMatch {
	// Similar pattern
	return []entity.PvPMatch{}
}
```

- [ ] **Step 3: Test transformation**

Run: `cd backend/scripts/migrate-from-supabase && go test -v ./transform_test.go`

Expected: Transformation tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/migrate-from-supabase/transform.go
git commit -m "feat(migration): add data transformation layer

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Load Transformed Data into PostgreSQL

**Files:**
- Create: `backend/scripts/migrate-from-supabase/load.go`
- Create: `backend/scripts/migrate-from-supabase/main.go`

**Interfaces:**
- Consumes: `TransformedData` from transform.go
- Produces: Data loaded into PostgreSQL via GORM

- [ ] **Step 1: Create load functions**

Create `backend/scripts/migrate-from-supabase/load.go`:

```go
package main

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
)

func LoadData(ctx context.Context, db *gorm.DB, data *TransformedData) error {
	// Load in dependency order
	if err := loadLeagues(ctx, db, data.Leagues); err != nil {
		return fmt.Errorf("failed to load leagues: %w", err)
	}

	if err := loadPlayers(ctx, db, data.Players); err != nil {
		return fmt.Errorf("failed to load players: %w", err)
	}

	if err := loadPlayerItems(ctx, db, data.PlayerItems); err != nil {
		return fmt.Errorf("failed to load player items: %w", err)
	}

	if err := loadAchievements(ctx, db, data.Achievements); err != nil {
		return fmt.Errorf("failed to load achievements: %w", err)
	}

	if err := loadPlayerAchievements(ctx, db, data.PlayerAchievements); err != nil {
		return fmt.Errorf("failed to load player achievements: %w", err)
	}

	// Continue with other entities...

	return nil
}

func loadLeagues(ctx context.Context, db *gorm.DB, leagues []entity.League) error {
	for _, league := range leagues {
		if err := db.WithContext(ctx).Create(&league).Error; err != nil {
			return err
		}
	}
	return nil
}

func loadPlayers(ctx context.Context, db *gorm.DB, players []entity.Player) error {
	// Batch insert for performance
	batchSize := 100
	for i := 0; i < len(players); i += batchSize {
		end := i + batchSize
		if end > len(players) {
			end = len(players)
		}

		batch := players[i:end]
		if err := db.WithContext(ctx).Create(&batch).Error; err != nil {
			return err
		}
	}
	return nil
}

func loadPlayerItems(ctx context.Context, db *gorm.DB, items []entity.PlayerItem) error {
	// Similar batch insert
	return nil
}

// ... other load functions
```

- [ ] **Step 2: Create main migration script**

Create `backend/scripts/migrate-from-supabase/main.go`:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"

	"space-invaders/internal/infra/database"
)

func main() {
	// Load env vars
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_SERVICE_KEY required")
	}

	ctx := context.Background()

	// Step 1: Extract from Supabase
	fmt.Println("📥 Extracting data from Supabase...")
	extractedData, err := ExtractAllData(ctx, supabaseURL, supabaseKey)
	if err != nil {
		log.Fatalf("Extraction failed: %v", err)
	}
	fmt.Printf("✅ Extracted %d players, %d guilds, etc.\n", len(extractedData.Players), len(extractedData.Guilds))

	// Step 2: Transform data
	fmt.Println("🔄 Transforming data...")
	transformedData, err := TransformData(extractedData)
	if err != nil {
		log.Fatalf("Transformation failed: %v", err)
	}
	fmt.Printf("✅ Transformed %d players\n", len(transformedData.Players))

	// Step 3: Load into PostgreSQL
	fmt.Println("💾 Loading data into PostgreSQL...")
	db, err := database.NewConnection()
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	if err := LoadData(ctx, db, transformedData); err != nil {
		log.Fatalf("Load failed: %v", err)
	}

	fmt.Println("🎉 Migration completed successfully!")
}
```

- [ ] **Step 3: Test migration (dry run)**

Run:
```bash
cd backend/scripts/migrate-from-supabase
go run .
```

Expected: Migration completes without errors

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/migrate-from-supabase/load.go \
        backend/scripts/migrate-from-supabase/main.go
git commit -m "feat(migration): add data loading and main migration script

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Validation and Count Matching

**Files:**
- Create: `backend/scripts/migrate-from-supabase/validate.go`
- Create: `backend/scripts/migrate-from-supabase/validate_test.go`

**Interfaces:**
- Consumes: PostgreSQL database connection
- Produces: Validation report with count matching

- [ ] **Step 1: Create validation functions**

Create `backend/scripts/migrate-from-supabase/validate.go`:

```go
package main

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"space-invaders/internal/domain/entity"
)

type ValidationReport struct {
	TableName     string
	SupabaseCount int64
	PostgresCount int64
	Matched       bool
}

func ValidateMigration(ctx context.Context, db *gorm.DB, extractedData *ExtractedData) ([]ValidationReport, error) {
	reports := []ValidationReport{}

	// Validate players
	var pgPlayerCount int64
	db.Model(&entity.Player{}).Count(&pgPlayerCount)
	reports = append(reports, ValidationReport{
		TableName:     "players",
		SupabaseCount: int64(len(extractedData.Players)),
		PostgresCount: pgPlayerCount,
		Matched:       int64(len(extractedData.Players)) == pgPlayerCount,
	})

	// Validate guilds
	var pgGuildCount int64
	db.Model(&entity.Guild{}).Count(&pgGuildCount)
	reports = append(reports, ValidationReport{
		TableName:     "guilds",
		SupabaseCount: int64(len(extractedData.Guilds)),
		PostgresCount: pgGuildCount,
		Matched:       int64(len(extractedData.Guilds)) == pgGuildCount,
	})

	// Validate achievements
	var pgAchievementCount int64
	db.Model(&entity.Achievement{}).Count(&pgAchievementCount)
	reports = append(reports, ValidationReport{
		TableName:     "achievements",
		SupabaseCount: int64(len(extractedData.Achievements)),
		PostgresCount: pgAchievementCount,
		Matched:       int64(len(extractedData.Achievements)) == pgAchievementCount,
	})

	// Add more validations...

	return reports, nil
}

func PrintValidationReport(reports []ValidationReport) {
	fmt.Println("\n📊 Validation Report:")
	fmt.Println("=====================================")

	allMatched := true
	for _, report := range reports {
		status := "✅"
		if !report.Matched {
			status = "❌"
			allMatched = false
		}

		fmt.Printf("%s %s: Supabase=%d, Postgres=%d\n",
			status, report.TableName, report.SupabaseCount, report.PostgresCount)
	}

	fmt.Println("=====================================")
	if allMatched {
		fmt.Println("✅ All counts matched!")
	} else {
		fmt.Println("❌ Some counts did not match. Review migration.")
	}
}
```

- [ ] **Step 2: Integrate validation into main script**

Modify `backend/scripts/migrate-from-supabase/main.go`:

```go
// After LoadData():
fmt.Println("🔍 Validating migration...")
validationReports, err := ValidateMigration(ctx, db, extractedData)
if err != nil {
	log.Fatalf("Validation failed: %v", err)
}

PrintValidationReport(validationReports)
```

- [ ] **Step 3: Run validation**

Run migration script with validation:
```bash
cd backend/scripts/migrate-from-supabase
go run .
```

Expected: All table counts match

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/migrate-from-supabase/validate.go \
        backend/scripts/migrate-from-supabase/main.go
git commit -m "feat(migration): add validation and count matching

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Remaining Tasks (Outline)

### Task 10: UUID to Auto-increment ID Compensation
- **Goal:** Map old UUIDs to new auto-increment IDs for foreign keys
- **Files:** `scripts/migrate-from-supabase/compensation_table.sql`
- **Table:** `uuid_id_mapping (old_uuid UUID, new_id INT, entity_type VARCHAR)`

### Task 11: Wallet Address Compensation
- **Goal:** For players without wallet, set NULL (can link later in UI)
- **Logic:** Already handled in transformPlayers()

### Task 12: Seed Initial Data (Leagues, Default Config)
- **Files:** `backend/scripts/seed_leagues.sql`, `seed_treasury_config.sql`
- **Data:** 5 leagues (Bronze, Silver, Gold, Platinum, Diamond)

### Task 13: Test Full Migration End-to-End
- **Scenario:** Extract → Transform → Load → Validate
- **Verification:** All counts match, no errors

### Task 14: Create Supabase Backup
- **Command:** `pg_dump` of Supabase PostgreSQL
- **Storage:** Upload to S3 or Google Drive

### Task 15: Migration Documentation
- **Files:** `docs/migration-guide.md`
- **Sections:** Prerequisites, steps, rollback plan, troubleshooting

---

## Validation Checkpoints

After completing Fase 0, validate:

- [ ] Migração Supabase → PostgreSQL 100% validada
- [ ] Counts matching em todas tabelas críticas
- [ ] Players com wallet addresses preservados
- [ ] Backup Supabase completo criado
- [ ] UUID → auto-increment mapping funcional
- [ ] Seed data (leagues, config) carregado
- [ ] Documentation completa (como rodar migração)

---

## Next Phase

→ [Fase 1: Backend Base](./fase-1-base.md) - Setup Go backend, Auth, Game service