# AuthService Implementation

## Overview
Complete authentication service with JWT token support for Space Invaders backend.

## Files Created

### 1. JWT Utility Package
**File:** `backend/pkg/jwt/jwt.go`

**Features:**
- JWT token generation with 24-hour expiration
- Token validation with HMAC SHA256
- Custom claims with PlayerID and Username
- Error types for invalid/expired tokens

**Functions:**
- `GenerateToken(playerID uint, username string, secret string) (string, error)`
- `ValidateToken(tokenString string, secret string) (*Claims, error)`

### 2. AuthService
**File:** `backend/internal/domain/service/auth_service.go`

**Features:**
- User registration with validation
- User login with password verification
- JWT token generation and validation
- Password hashing with bcrypt (cost 10)
- Duplicate username/email checking

**Methods:**
- `Register(ctx, username, email, password) (token, player, error)`
- `Login(ctx, username, password) (token, player, error)`
- `ValidateToken(ctx, tokenString) (claims, error)`

**Validation Rules:**
- Username: 3-20 characters, alphanumeric + underscore only
- Email: Valid email format (optional)
- Password: Minimum 8 characters

**Error Types:**
- `ErrUsernameExists` - Username already registered
- `ErrEmailExists` - Email already registered
- `ErrInvalidCredentials` - Wrong username or password
- `ErrInvalidUsername` - Username validation failed
- `ErrInvalidEmail` - Email format invalid
- `ErrInvalidPassword` - Password too short

### 3. Comprehensive Tests
**File:** `backend/internal/domain/service/auth_service_test.go`

**Test Coverage:** 56.2%

**Tests Implemented:**
1. Register - Success
2. Register - Without Email
3. Register - Duplicate Username
4. Register - Duplicate Email
5. Register - Invalid Username (too short)
6. Register - Invalid Username (too long)
7. Register - Invalid Username (special characters)
8. Register - Valid Username with underscore
9. Register - Invalid Email
10. Register - Invalid Password
11. Login - Success
12. Login - Invalid Password
13. Login - User Not Found
14. ValidateToken - Success
15. ValidateToken - Invalid Token
16. ValidateToken - Wrong Secret
17. Password Hashing Cost (verifies bcrypt cost 10)
18. Token Expiration (verifies 24-hour expiration)

## Security Features

### Password Security
- Bcrypt hashing with cost factor 10
- Never stores plaintext passwords
- Constant-time password comparison

### JWT Security
- HMAC SHA256 signing
- 24-hour token expiration
- Player ID and username in claims
- Issued timestamp tracking

### Validation
- Username: Prevents injection attacks with alphanumeric restriction
- Email: Validates format with regex
- Password: Enforces minimum strength requirements

## Usage Example

```go
// Initialize service
playerRepo := database.NewPlayerRepository(db)
authService := service.NewAuthService(playerRepo, "your-secret-key")
ctx := context.Background()

// Register new user
token, player, err := authService.Register(ctx, "username", "email@example.com", "password123")
if err != nil {
    // Handle error (duplicate username, validation failure, etc.)
}

// Login existing user
token, player, err := authService.Login(ctx, "username", "password123")
if err != nil {
    // Handle error (invalid credentials)
}

// Validate JWT token
claims, err := authService.ValidateToken(ctx, token)
if err != nil {
    // Handle error (invalid or expired token)
}
// Use claims.PlayerID and claims.Username
```

## Dependencies Added
- `github.com/golang-jwt/jwt/v5` v5.3.1

## Next Steps
1. Create Auth HTTP handlers/controllers
2. Implement auth middleware for protected routes
3. Add refresh token functionality (optional)
4. Implement password reset flow (optional)
5. Add email verification (optional)

## Implementation Notes
- All new players start at League ID 1 (Bronze)
- Email is optional during registration
- Usernames are case-sensitive
- JWT tokens use HS256 algorithm
- All errors are properly wrapped with context
