# API Documentation

Complete API reference for Space Invaders backend.

## Available Documentation

### [Economy API](./economy.md)
Complete reference for the dual economy system (Gold + SPACE tokens).

**Includes:**
- Conversion endpoints (Gold → SPACE)
- Shop endpoints (PIX payments for Gold)
- Treasury admin endpoints (emission management)
- Webhook endpoints (payment notifications)
- Code examples and best practices

### Quick Links

**Public Endpoints:**
- [List Gold Packages](./economy.md#list-gold-packages) - `GET /api/v1/shop/packages`

**Authenticated Endpoints:**
- [Convert Gold to SPACE](./economy.md#convert-gold-to-space) - `POST /api/v1/conversions`
- [Get Conversion History](./economy.md#get-conversion-history) - `GET /api/v1/conversions/history`
- [Create PIX Order](./economy.md#create-pix-order) - `POST /api/v1/shop/orders`
- [Get Player Orders](./economy.md#get-player-orders) - `GET /api/v1/shop/orders`

**Admin Endpoints:**
- [Get Treasury Config](./economy.md#get-treasury-configuration) - `GET /api/v1/admin/treasury/config`
- [Get Emission History](./economy.md#get-emission-history) - `GET /api/v1/admin/treasury/emissions`
- [Manual Emission](./economy.md#trigger-manual-emission) - `POST /api/v1/admin/treasury/manual-emission`

**Webhooks:**
- [AbacatePay Webhook](./economy.md#abacatepay-payment-webhook) - `POST /webhooks/abacatepay`

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

Get a token by:
1. Register: `POST /api/v1/auth/register`
2. Login: `POST /api/v1/auth/login`

See [Authentication section](./economy.md#authentication) for details.

## Base URLs

```
Development: http://localhost:3000
Production:  https://api.spaceinvaders.com
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limits

- **60 requests/minute** per IP
- **1000 requests/hour** per authenticated user

See [Rate Limits section](./economy.md#rate-limits) for details.

## Testing

### Using cURL

```bash
# Get Gold packages
curl http://localhost:3000/api/v1/shop/packages

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"player@example.com","password":"password123"}'

# Convert Gold (with auth)
curl -X POST http://localhost:3000/api/v1/conversions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"goldAmount":1000}'
```

### Using Postman

Import the Postman collection (coming soon):
```
docs/postman/space-invaders-api.json
```

### Interactive API Explorer

When running locally with Swagger enabled:
```
http://localhost:3000/swagger/index.html
```

## SDK Support

### JavaScript/TypeScript
```typescript
import { SpaceInvadersAPI } from '@space-invaders/api-client';

const api = new SpaceInvadersAPI({
  baseURL: 'https://api.spaceinvaders.com',
  token: 'your-jwt-token'
});

const conversion = await api.conversions.create({ goldAmount: 1000 });
```

### Go
```go
import "github.com/space-invaders/go-sdk"

client := spaceinvaders.NewClient("your-jwt-token")
conversion, err := client.Conversions.Create(ctx, 1000)
```

## Versioning

Current API version: **v1**

All endpoints are prefixed with `/api/v1/`

Breaking changes will result in a new version (v2, v3, etc.).

## Support

- **Documentation Issues:** [Create an issue](https://github.com/space-invaders/backend/issues)
- **API Questions:** dev@spaceinvaders.com
- **Community:** [Discord #api-support](https://discord.gg/spaceinvaders)

## Change Log

### 2026-08-24 - v1.0.0
- Initial economy API release
- Conversion endpoints (Gold → SPACE)
- Shop endpoints (PIX payments)
- Treasury admin endpoints
- AbacatePay webhook integration
