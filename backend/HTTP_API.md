# Space Invaders HTTP API

Complete REST API implementation for the Space Invaders backend.

## Architecture

```
cmd/http/main.go
├── Handlers (HTTP Layer)
│   ├── AuthHandler (register, login)
│   └── PlayerHandler (get profile, update profile)
├── Services (Business Logic)
│   ├── AuthService (registration, authentication, JWT)
│   └── PlayerService (profile management)
├── Repositories (Data Access)
│   └── PlayerRepository (GORM operations)
└── Database (PostgreSQL)
```

## API Endpoints

### Public Endpoints

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "space-invaders-api"
}
```

#### Register
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player@example.com",  // optional
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "player": {
      "id": 1,
      "username": "player1",
      "email": "player@example.com"
    }
  }
}
```

**Error Responses:**
- 400: Username already exists
- 400: Email already exists
- 400: Invalid username format
- 400: Invalid email format
- 400: Password must be at least 8 characters

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "player1",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "player": {
      "id": 1,
      "username": "player1",
      "email": "player@example.com"
    }
  }
}
```

**Error Responses:**
- 401: Invalid username or password

### Protected Endpoints

All protected endpoints require an `Authorization` header with a Bearer token:
```
Authorization: Bearer <token>
```

#### Get Current Player Profile
```bash
GET /api/v1/players/me
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "data": {
    "id": 1,
    "username": "player1",
    "email": "player@example.com",
    "emailVerified": false,
    "walletAddress": null,
    "highScore": 0,
    "totalGames": 0,
    "lastPlayed": null,
    "goldBalance": 0,
    "spaceBalance": 0,
    "leagueId": 1,
    "rankPoints": 0,
    "notifyOffers": true,
    "notifyAchievements": true,
    "notifyShop": false,
    "guildId": null
  }
}
```

**Error Responses:**
- 401: Authorization header required
- 401: Invalid or expired token
- 404: Player not found

#### Update Current Player Profile
```bash
PUT /api/v1/players/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",          // optional
  "notifyOffers": false,                    // optional
  "notifyAchievements": true,               // optional
  "notifyShop": false                       // optional
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": 1,
    "username": "player1",
    "email": "newemail@example.com",
    "emailVerified": false,
    "walletAddress": null,
    "highScore": 0,
    "totalGames": 0,
    "lastPlayed": null,
    "goldBalance": 0,
    "spaceBalance": 0,
    "leagueId": 1,
    "rankPoints": 0,
    "notifyOffers": false,
    "notifyAchievements": true,
    "notifyShop": false,
    "guildId": null
  }
}
```

**Error Responses:**
- 400: Invalid email format
- 400: Email already exists
- 401: Authorization header required
- 401: Invalid or expired token
- 404: Player not found

## Error Response Format

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

## Authentication Flow

1. **Register**: Create a new player account
   - Validates username (3-20 chars, alphanumeric + underscore)
   - Validates email format (if provided)
   - Validates password (min 8 chars)
   - Hashes password with bcrypt
   - Creates player with default league (Bronze, ID 1)
   - Generates JWT token (24h expiry)
   - Returns token + player info

2. **Login**: Authenticate existing player
   - Finds player by username
   - Verifies password with bcrypt
   - Generates JWT token (24h expiry)
   - Returns token + player info

3. **Use Token**: Access protected endpoints
   - Include token in Authorization header
   - Middleware validates token
   - Extracts player ID from token
   - Sets player ID in request context
   - Handler retrieves player ID from context

## Running the Server

### Prerequisites
- PostgreSQL database running
- Environment variables configured in `.env`:
  ```env
  DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
  JWT_SECRET=your-secret-key
  PORT=3000
  ```

### Start Server
```bash
cd backend
go run cmd/http/main.go
```

### Test API
```bash
# Using the test script
./test_api.sh

# Or manually with curl
curl http://localhost:3000/health

curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","email":"test@example.com","password":"password123"}'

curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"password123"}'

curl http://localhost:3000/api/v1/players/me \
  -H "Authorization: Bearer <token>"
```

## File Structure

```
backend/
├── cmd/http/
│   └── main.go                          # HTTP server entry point
├── internal/
│   ├── api/http/
│   │   ├── handler/
│   │   │   ├── auth_handler.go          # Auth endpoints
│   │   │   └── player_handler.go        # Player endpoints
│   │   ├── middleware/
│   │   │   └── auth_middleware.go       # JWT middleware
│   │   ├── response/
│   │   │   └── response.go              # Response helpers
│   │   └── router/
│   │       └── router.go                # Route configuration
│   ├── domain/
│   │   ├── entity/
│   │   │   └── player.go                # Player entity
│   │   ├── repository/
│   │   │   └── player_repository.go     # Player repo interface
│   │   └── service/
│   │       ├── auth_service.go          # Auth business logic
│   │       └── player_service.go        # Player business logic
│   └── infra/
│       └── database/
│           ├── connection.go            # DB connection + migration
│           └── player_repository.go     # Player repo implementation
├── pkg/
│   └── jwt/
│       └── jwt.go                       # JWT utilities
└── configs/
    └── config.go                        # Configuration
```

## Next Steps

- [ ] Add game endpoints (start game, end game)
- [ ] Add leaderboard endpoints
- [ ] Add achievement endpoints
- [ ] Add shop endpoints
- [ ] Add WebSocket support for real-time features
- [ ] Add API documentation (Swagger)
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Add metrics/monitoring
