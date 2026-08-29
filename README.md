# Space Invaders - Go + Vue.js

Modern Space Invaders implementation with backend in Go and frontend in Vue.js.

## 🏗️ Project Structure

```
space-invaders/
├── backend/         # Go backend (Clean Architecture)
│   ├── cmd/         # Application entrypoints
│   ├── internal/    # Internal packages
│   │   ├── api/     # HTTP handlers and routes
│   │   ├── domain/  # Business logic
│   │   └── infra/   # Database and external services
│   ├── database/    # Migrations and seeds
│   ├── configs/     # Configuration files
│   └── scripts/     # Deployment and utility scripts
│
└── frontend/        # Vue 3 + TypeScript frontend
    ├── src/
    │   ├── components/  # Reusable Vue components
    │   ├── views/       # Page components
    │   ├── stores/      # Pinia state management
    │   ├── services/    # API services
    │   ├── router/      # Vue Router
    │   └── game/        # Game engine (TypeScript)
    └── public/          # Static assets

```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for backend development)
- Node.js 18+ (for frontend development)

### 1. Start Infrastructure

```bash
cd backend
docker-compose up -d
```

This starts:
- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379)
- API server (port 8080)

### 2. Run Backend (Development)

```bash
cd backend
make run
```

API will be available at: http://localhost:8080

### 3. Run Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

## 📚 Documentation

- **Backend**: See `backend/README.md`
- **Frontend**: See `frontend/README.md`
- **API**: See `backend/docs/api/README.md`

## 🎮 Features

### Core Gameplay
- Classic Space Invaders mechanics
- 5 enemy types with different behaviors
- Boss battles every 5 levels
- 6 weapon types (laser, spread, missile, bomb, lightning)
- Power-ups and bonuses
- Combo system and accuracy tracking

### Progression
- Player levels and leagues (Bronze → Master)
- Achievements system
- High score leaderboard
- Player statistics

### Economy
- In-game gold currency
- PIX payment integration (AbacatePay)
- Shop system with skins and items
- Order history

### Tech Features
- JWT authentication
- PostgreSQL database with migrations
- Redis caching
- Real-time game state
- RESTful API

## 🔧 Development

### Backend Commands

```bash
cd backend

# Run server
make run

# Run tests
make test

# Run migrations
make migrate-up

# Build binary
make build
```

### Frontend Commands

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint and format
npm run lint
```

## 🐳 Docker

The project uses Docker Compose for local development:

```bash
cd backend
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
```

## 🌐 Environment Variables

### Backend

Copy `backend/.env.example` to `backend/.env` and configure:

```env
DATABASE_URL=postgresql://spaceinvaders:password@localhost:5432/spaceinvaders
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
ABACATEPAY_API_KEY=your-api-key
```

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and configure:

```env
VITE_API_URL=http://localhost:8080
```

## 📝 License

Proprietary

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.
