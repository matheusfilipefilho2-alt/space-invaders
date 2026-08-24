# Quick Start Guide - Space Invaders HTTP API

## What Was Built

Complete REST API with authentication and player management:
- POST /api/v1/auth/register - Create account
- POST /api/v1/auth/login - Authenticate
- GET /api/v1/players/me - Get profile (protected)
- PUT /api/v1/players/me - Update profile (protected)
- GET /health - Health check

## Prerequisites

1. PostgreSQL database running
2. Go 1.25+ installed
3. Environment variables configured

## Setup

### 1. Configure Environment

Create/edit `.env` in the backend directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spaceinvaders?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

### 2. Run the Server

```bash
cd backend
go run cmd/http/main.go
```

You should see:
```
🚀 Starting Space Invaders API...
📦 Connecting to database...
✅ Database connected
✅ Repositories initialized
✅ Services initialized
✅ Handlers initialized
✅ Router configured
🎮 Server running on http://localhost:3000
```

## Test the API

### Option 1: Automated Test Script

```bash
cd backend
./test_api.sh
```

This will test all endpoints including success and failure cases.

### Option 2: Manual Testing with curl

#### 1. Health Check
```bash
curl http://localhost:3000/health
```

#### 2. Register a Player
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "password123"
  }'
```

Save the token from the response!

#### 3. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "password123"
  }'
```

#### 4. Get Player Profile (Protected)
```bash
curl http://localhost:3000/api/v1/players/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 5. Update Player Profile (Protected)
```bash
curl -X PUT http://localhost:3000/api/v1/players/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "email": "newemail@example.com",
    "notifyOffers": false
  }'
```

### Option 3: Postman/Insomnia

Import these endpoints:
- GET http://localhost:3000/health
- POST http://localhost:3000/api/v1/auth/register
- POST http://localhost:3000/api/v1/auth/login
- GET http://localhost:3000/api/v1/players/me (add Bearer token)
- PUT http://localhost:3000/api/v1/players/me (add Bearer token)

## Expected Responses

### Success Response Format
```json
{
  "data": {
    // ... response data
  }
}
```

### Error Response Format
```json
{
  "error": "Error message"
}
```

## Common Issues

### Database Connection Failed
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check database exists: `createdb spaceinvaders`

### JWT_SECRET Must Be Set
- Add JWT_SECRET to .env file
- Any string works for development (use secure random string in production)

### Port Already in Use
- Change PORT in .env to another port (e.g., 8080)
- Or stop the process using port 3000

## Next Steps

After verifying the API works:

1. Read full API documentation: `backend/HTTP_API.md`
2. Review implementation details: `backend/IMPLEMENTATION_SUMMARY.md`
3. Check task completion: `backend/TASKS_4-6_CHECKLIST.md`

## Project Structure

```
backend/
├── cmd/http/main.go              # Server entry point
├── internal/
│   ├── api/http/
│   │   ├── handler/              # HTTP handlers
│   │   ├── middleware/           # JWT auth middleware
│   │   ├── response/             # Response helpers
│   │   └── router/               # Route configuration
│   ├── domain/
│   │   ├── entity/               # Domain entities
│   │   ├── repository/           # Repository interfaces
│   │   └── service/              # Business logic
│   └── infra/
│       └── database/             # Repository implementations
├── pkg/jwt/                      # JWT utilities
└── configs/                      # Configuration
```

## Development Tips

1. **Auto-reload**: Use `air` for hot reload during development
   ```bash
   go install github.com/air-verse/air@latest
   air
   ```

2. **Database Reset**: If you need to reset the database
   ```bash
   dropdb spaceinvaders
   createdb spaceinvaders
   # Restart the server to run migrations
   ```

3. **View Logs**: Server logs show all SQL queries and HTTP requests

4. **Check Token**: Decode JWT at https://jwt.io to see claims

## Support Files

- `HTTP_API.md` - Complete API documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `TASKS_4-6_CHECKLIST.md` - Task verification checklist
- `test_api.sh` - Automated test script
