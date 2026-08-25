# Frontend-Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Vue.js Frontend (Port 5173)              │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Router    │  │  Pinia Store │  │    Views    │  │  │
│  │  │ (7 routes)  │  │    (auth)    │  │  (7 pages)  │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │  │
│  │         │                │                 │         │  │
│  │         └────────────────┴─────────────────┘         │  │
│  │                          │                           │  │
│  │                  ┌───────┴────────┐                  │  │
│  │                  │  API Service   │                  │  │
│  │                  │   (axios)      │                  │  │
│  │                  └───────┬────────┘                  │  │
│  └──────────────────────────┼─────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────┘
                              │ HTTP/REST
                              │ JWT Auth
                              │
┌─────────────────────────────┼─────────────────────────────┐
│                         SERVER                              │
│  ┌──────────────────────────┼──────────────────────────┐   │
│  │         Go Backend (Port 3000)                      │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │  Gin Router  │→ │  Handlers   │→ │  Services │  │   │
│  │  │  (18 routes) │  │ (API Layer) │  │ (Business)│  │   │
│  │  └──────────────┘  └─────────────┘  └─────┬─────┘  │   │
│  │                                            │        │   │
│  │                                   ┌────────┴──────┐ │   │
│  │                                   │ Repositories  │ │   │
│  │                                   │    (GORM)     │ │   │
│  │                                   └────────┬──────┘ │   │
│  └────────────────────────────────────────────┼───────┘   │
└─────────────────────────────────────────────────┼─────────┘
                                                  │
┌─────────────────────────────────────────────────┼─────────┐
│                      DATABASE                             │
│  ┌──────────────────────────────────────────────┼───────┐ │
│  │              PostgreSQL                      │       │ │
│  │                                              │       │ │
│  │  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌───┴────┐ │ │
│  │  │ players  │  │  items  │  │leagues │  │sessions│ │ │
│  │  └──────────┘  └─────────┘  └────────┘  └────────┘ │ │
│  │  ┌──────────────┐  ┌─────────────────┐             │ │
│  │  │ achievements │  │ player_items    │             │ │
│  │  └──────────────┘  └─────────────────┘             │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Request Flow Example

### User Login Flow

```
1. User enters credentials in LoginView.vue
   ↓
2. Vue Component calls authStore.login()
   ↓
3. Pinia Store calls authAPI.login()
   ↓
4. API Service (axios) sends POST /api/v1/auth/login
   ↓
5. Gin Router → AuthHandler.Login()
   ↓
6. AuthService.Login() validates credentials
   ↓
7. Repository queries PostgreSQL
   ↓
8. JWT token generated
   ↓
9. Response: { token, player }
   ↓
10. Pinia Store saves token to localStorage
   ↓
11. Router redirects to /game
```

### Game Session Flow

```
Start Game:
GameView → gameAPI.start() → POST /game/start
→ Backend creates session → Returns session_id

End Game:
GameView → gameAPI.end(score) → POST /game/end
→ Backend calculates gold (score/10)
→ Updates player balance
→ Returns gold_earned
```

## API Layer Structure

### Frontend (services/api.ts)

```typescript
api (axios instance)
├── interceptor: adds JWT token
├── authAPI
│   ├── register()
│   └── login()
├── playerAPI
│   ├── getProfile()
│   ├── updateProfile()
│   ├── getAchievements()
│   └── getItems()
├── gameAPI
│   ├── start()
│   └── end()
├── achievementAPI
│   ├── list()
│   └── check()
├── itemAPI
│   ├── list()
│   ├── purchase()
│   ├── equip()
│   └── unequip()
└── leaderboardAPI
    ├── global()
    └── league()
```

### Backend (handlers)

```
AuthHandler
├── Register()    POST   /api/v1/auth/register
└── Login()       POST   /api/v1/auth/login

PlayerHandler
├── GetMe()       GET    /api/v1/players/me
├── UpdateMe()    PUT    /api/v1/players/me
├── GetAchievements() GET /api/v1/players/me/achievements
└── GetItems()    GET    /api/v1/players/me/items

GameHandler
├── StartGame()   POST   /api/v1/game/start
└── EndGame()     POST   /api/v1/game/end

AchievementHandler
├── List()        GET    /api/v1/achievements
└── Check()       POST   /api/v1/achievements/check

ItemHandler
├── List()        GET    /api/v1/items
├── Purchase()    POST   /api/v1/items/:id/purchase
├── Equip()       POST   /api/v1/items/:id/equip
└── Unequip()     POST   /api/v1/items/:id/unequip

LeaderboardHandler
├── Global()      GET    /api/v1/leaderboard/global
└── ByLeague()    GET    /api/v1/leaderboard/league/:id
```

## State Management (Pinia)

### Auth Store

```typescript
State:
├── token: string | null
├── user: Player | null
├── loading: boolean
└── error: string | null

Getters:
└── isAuthenticated: boolean

Actions:
├── register(username, email, password)
├── login(username, password)
├── logout()
└── fetchProfile()
```

## Routing

```typescript
Routes:
├── /               → HomeView          (public)
├── /login          → LoginView         (public)
├── /register       → RegisterView      (public)
├── /game           → GameView          (protected)
├── /profile        → ProfileView       (protected)
├── /shop           → ShopView          (protected)
└── /leaderboard    → LeaderboardView   (public)

Navigation Guard:
beforeEach() → Check auth for protected routes
```

## Authentication Flow

```
Registration:
  User Input → Validate → Hash Password → Save to DB
  → Generate JWT → Return token + player

Login:
  User Input → Validate → Compare Password
  → Generate JWT → Return token + player

Protected Routes:
  Request → Check localStorage token
  → Add to Authorization header
  → Backend validates JWT
  → Process request
```

## Data Flow Patterns

### Read (GET)

```
View → Store/API → HTTP GET → Handler
→ Service → Repository → Database
→ Response JSON → Update State → Render
```

### Create/Update (POST/PUT)

```
View Form → Validate → Store/API → HTTP POST
→ Handler → Service → Repository → Database
→ Response → Update State → Render → Notify User
```

## Security Layers

```
1. Frontend:
   - Protected routes (router guards)
   - Token storage (localStorage)
   - Input validation

2. API Layer:
   - JWT validation
   - CORS configuration
   - Request validation

3. Backend:
   - Middleware authentication
   - Service layer validation
   - Database constraints
```

## Technology Stack

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Router**: Vue Router 4
- **State**: Pinia
- **HTTP**: Axios

### Backend
- **Language**: Go 1.27
- **Framework**: Gin
- **ORM**: GORM
- **Auth**: JWT
- **Validation**: go-playground/validator

### Database
- **RDBMS**: PostgreSQL
- **Migrations**: GORM AutoMigrate
- **Schema**: 6 tables + relationships

## Performance Considerations

### Frontend
- Code splitting (lazy routes)
- Gzipped bundle (24.97 KB)
- API request caching potential
- Optimistic UI updates

### Backend
- Connection pooling
- Index optimization
- Query optimization (GORM)
- JWT caching

## Scalability Path

```
Current: Monolith (Backend + Frontend)
  ↓
Phase 1: Add Redis for sessions/cache
  ↓
Phase 2: WebSocket for real-time features
  ↓
Phase 3: Microservices (Game, Auth, Shop)
  ↓
Phase 4: Load balancer + multiple instances
```

## Deployment Architecture

```
Production:
  ├── Frontend: Static hosting (Vercel/Netlify)
  ├── Backend: Container (Docker)
  ├── Database: Managed PostgreSQL
  └── CDN: Assets + API cache
```
