# Economy API Documentation

Complete API reference for the Space Invaders dual economy system (Gold + SPACE tokens).

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Conversion Endpoints](#conversion-endpoints)
- [Shop Endpoints](#shop-endpoints)
- [Treasury Admin Endpoints](#treasury-admin-endpoints)
- [Webhook Endpoints](#webhook-endpoints)
- [Error Responses](#error-responses)
- [Rate Limits](#rate-limits)

---

## Overview

The Space Invaders economy consists of two currencies:

- **Gold** - Off-chain currency stored in PostgreSQL
  - Earned through gameplay
  - Used to purchase in-game items
  - Can be purchased via PIX (Brazilian payment)
  - Convertible to SPACE (one-way, irreversible)

- **SPACE** - On-chain SPL token on Solana
  - Obtained by converting Gold (100 Gold = 1 SPACE)
  - Stored in player's Solana wallet
  - Used for premium features, NFTs, and external trading
  - Daily emission controlled by Treasury formula

### Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.spaceinvaders.com/api/v1
```

---

## Authentication

Most endpoints require JWT authentication. Include the token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

**Register:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "securepassword123"
}
```

**Login:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "player1@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "player": {
      "id": 1,
      "username": "player1",
      "email": "player1@example.com",
      "goldBalance": 0,
      "spaceBalance": 0
    }
  }
}
```

---

## Conversion Endpoints

### Convert Gold to SPACE

Convert Gold currency to SPACE tokens (irreversible, one-way operation).

**Endpoint:** `POST /api/v1/conversions`

**Authentication:** Required

**Request Body:**
```json
{
  "goldAmount": 1000
}
```

**Parameters:**
- `goldAmount` (uint64, required) - Amount of Gold to convert (minimum: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 42,
    "playerId": 1,
    "goldAmount": 1000,
    "spaceAmount": 10000000000,
    "status": "pending",
    "createdAt": "2026-08-24T10:30:00Z"
  }
}
```

**Notes:**
- Conversion ratio: 100 Gold = 1 SPACE
- SPACE amount is in lamports (1 SPACE = 1,000,000,000 lamports)
- Status starts as "pending" and updates to "completed" when minted on-chain
- Async worker processes conversions and mints tokens to player's Solana wallet
- Player must have sufficient Gold balance
- Minimum conversion: 100 Gold (1 SPACE)

**Errors:**
- `400 Bad Request` - Insufficient Gold balance or below minimum
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Database or service error

---

### Get Conversion History

Retrieve player's conversion history with pagination.

**Endpoint:** `GET /api/v1/conversions/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (int, optional) - Number of records to return (default: 10, max: 100)
- `offset` (int, optional) - Number of records to skip (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "playerId": 1,
      "goldAmount": 1000,
      "spaceAmount": 10000000000,
      "status": "completed",
      "txHash": "5xJ8k...",
      "createdAt": "2026-08-24T10:30:00Z",
      "completedAt": "2026-08-24T10:31:23Z"
    },
    {
      "id": 41,
      "playerId": 1,
      "goldAmount": 500,
      "spaceAmount": 5000000000,
      "status": "pending",
      "createdAt": "2026-08-23T15:20:00Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Conversion created, waiting for blockchain mint
- `completed` - Successfully minted on Solana
- `failed` - Mint transaction failed (Gold refunded)

---

### Get Conversion by ID

Retrieve details of a specific conversion.

**Endpoint:** `GET /api/v1/conversions/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (uint, required) - Conversion ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 42,
    "playerId": 1,
    "goldAmount": 1000,
    "spaceAmount": 10000000000,
    "status": "completed",
    "txHash": "5xJ8kYHN...",
    "blockHeight": 245678901,
    "createdAt": "2026-08-24T10:30:00Z",
    "completedAt": "2026-08-24T10:31:23Z"
  }
}
```

**Errors:**
- `403 Forbidden` - Conversion belongs to another player
- `404 Not Found` - Conversion ID doesn't exist

---

## Shop Endpoints

### List Gold Packages

Get available Gold packages for purchase via PIX.

**Endpoint:** `GET /api/v1/shop/packages`

**Authentication:** Not required (public)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "gold_100",
      "name": "Pacote Iniciante",
      "description": "100 Gold",
      "goldAmount": 100,
      "priceInCents": 500,
      "priceDisplay": "R$ 5,00"
    },
    {
      "id": "gold_500",
      "name": "Pacote Aventureiro",
      "description": "500 Gold",
      "goldAmount": 500,
      "priceInCents": 2000,
      "priceDisplay": "R$ 20,00"
    },
    {
      "id": "gold_1000",
      "name": "Pacote Conquistador",
      "description": "1000 Gold",
      "goldAmount": 1000,
      "priceInCents": 3500,
      "priceDisplay": "R$ 35,00"
    }
  ]
}
```

---

### Create PIX Order

Create a PIX payment order to purchase Gold.

**Endpoint:** `POST /api/v1/shop/orders`

**Authentication:** Required

**Request Body:**
```json
{
  "packageId": "gold_500"
}
```

**Parameters:**
- `packageId` (string, required) - Package ID from `/shop/packages`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 123,
    "playerId": 1,
    "packageId": "gold_500",
    "amount": 2000,
    "goldAmount": 500,
    "status": "pending",
    "pixCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeUrl": "https://api.abacatepay.com/qr/abc123.png",
    "paymentUrl": "https://pay.abacatepay.com/abc123",
    "expiresAt": "2026-08-24T11:00:00Z",
    "createdAt": "2026-08-24T10:30:00Z"
  }
}
```

**Order Flow:**
1. Client creates order
2. Display QR code or PIX code to player
3. Player scans QR code or copies PIX code
4. Player completes payment in their bank app
5. AbacatePay sends webhook notification
6. Gold is automatically credited to player's account

**PIX Code Usage:**
```
Pix Copia e Cola: <pixCode>
QR Code Image: <qrCodeUrl>
Payment Page: <paymentUrl>
```

**Errors:**
- `400 Bad Request` - Invalid package ID
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Payment provider error

---

### Get Player Orders

Retrieve player's order history.

**Endpoint:** `GET /api/v1/shop/orders`

**Authentication:** Required

**Query Parameters:**
- `limit` (int, optional) - Number of records (default: 10)
- `offset` (int, optional) - Skip records (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "playerId": 1,
      "packageId": "gold_500",
      "amount": 2000,
      "goldAmount": 500,
      "status": "completed",
      "createdAt": "2026-08-24T10:30:00Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Awaiting payment
- `completed` - Paid, Gold credited
- `expired` - Payment window expired (30 minutes)
- `cancelled` - Order cancelled

---

### Get Order by ID

Retrieve specific order details.

**Endpoint:** `GET /api/v1/shop/orders/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (uint, required) - Order ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 123,
    "playerId": 1,
    "packageId": "gold_500",
    "amount": 2000,
    "goldAmount": 500,
    "status": "pending",
    "pixCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeUrl": "https://api.abacatepay.com/qr/abc123.png",
    "paymentUrl": "https://pay.abacatepay.com/abc123",
    "expiresAt": "2026-08-24T11:00:00Z",
    "createdAt": "2026-08-24T10:30:00Z"
  }
}
```

**Use Case:** Poll this endpoint to check payment status

**Errors:**
- `403 Forbidden` - Order belongs to another player
- `404 Not Found` - Order doesn't exist

---

## Treasury Admin Endpoints

⚠️ **Admin Only** - These endpoints require admin privileges (implement role check in production)

### Get Treasury Configuration

Retrieve current treasury configuration and emission rules.

**Endpoint:** `GET /api/v1/admin/treasury/config`

**Authentication:** Required (admin)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conversionRatio": 100,
    "revenueSharePercent": 0.30,
    "treasuryWallet": "TreasuryWallet1111111111111111111111111",
    "minEmissionPerDay": 0,
    "maxEmissionPerDay": 1000000000000
  }
}
```

**Configuration Fields:**
- `conversionRatio` - Gold:SPACE ratio (100 = 100 Gold for 1 SPACE)
- `revenueSharePercent` - % of revenue for emission (0.30 = 30%)
- `treasuryWallet` - Solana address holding mint authority
- `minEmissionPerDay` - Minimum daily emission (lamports)
- `maxEmissionPerDay` - Maximum daily emission (lamports)

---

### Get Emission History

Retrieve daily SPACE emission records.

**Endpoint:** `GET /api/v1/admin/treasury/emissions`

**Authentication:** Required (admin)

**Query Parameters:**
- `startDate` (string, optional) - Start date YYYY-MM-DD (default: 30 days ago)
- `endDate` (string, optional) - End date YYYY-MM-DD (default: today)
- `limit` (int, optional) - Max records (default: 30, max: 365)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "date": "2026-08-24",
      "gameplayRewards": 120000000000,
      "pixRevenue24h": 30000,
      "spacePrice": 100,
      "emissionLimit": 90000000000,
      "emissionUsed": 90000000000,
      "emissionAvailable": 0,
      "executed": true,
      "txHash": "3kJ9mN...",
      "createdAt": "2026-08-24T00:00:15Z"
    }
  ]
}
```

**Emission Fields:**
- `gameplayRewards` - Expected SPACE from gameplay (lamports)
- `pixRevenue24h` - PIX revenue in last 24h (centavos)
- `spacePrice` - SPACE price at calculation time (centavos)
- `emissionLimit` - Max emission allowed: `(revenue × 0.30) / price`
- `emissionUsed` - Actual emitted: `min(gameplayRewards, emissionLimit)`
- `emissionAvailable` - Remaining capacity: `limit - used`
- `executed` - Whether emission was minted on-chain
- `txHash` - Solana transaction signature

**Treasury Formula:**
```
emission = min(
  gameplayRewards / conversionRatio,
  (revenue24h × 0.30) / spacePrice
)
```

---

### Trigger Manual Emission

Manually calculate and save daily emission (for testing/admin).

**Endpoint:** `POST /api/v1/admin/treasury/manual-emission`

**Authentication:** Required (admin)

**Request Body:**
```json
{
  "gameplayRewards": 100000,
  "revenue24h": 50000,
  "date": "2026-08-24"
}
```

**Parameters:**
- `gameplayRewards` (uint64, required) - Total Gold earned from gameplay
- `revenue24h` (uint64, required) - PIX revenue in centavos
- `date` (string, optional) - Date YYYY-MM-DD (default: today)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 11,
    "date": "2026-08-24",
    "gameplayRewards": 1000000000000,
    "pixRevenue24h": 50000,
    "spacePrice": 100,
    "emissionLimit": 150000000000,
    "emissionUsed": 1000000000000,
    "emissionAvailable": 0,
    "executed": false,
    "createdAt": "2026-08-24T12:00:00Z"
  }
}
```

**Note:** This endpoint only calculates and saves the emission record. To execute on-chain, run the emission worker manually or wait for the daily cron job.

---

## Webhook Endpoints

### AbacatePay Payment Webhook

Receives payment notifications from AbacatePay when orders are paid, expired, or cancelled.

**Endpoint:** `POST /webhooks/abacatepay`

**Authentication:** Not required (validated via webhook signature)

**Request Body:**
```json
{
  "event": "order.paid",
  "data": {
    "id": "abacate_order_123",
    "status": "PAID",
    "amount": 2000,
    "externalId": "order_1_1724500000",
    "paidAt": "2026-08-24T10:35:00Z"
  }
}
```

**Events:**
- `order.paid` - Payment completed successfully
- `order.expired` - Payment window expired (30 min)
- `order.cancelled` - Order cancelled

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Webhook processed successfully"
  }
}
```

**Processing Flow:**
1. AbacatePay sends webhook on payment event
2. Server validates webhook signature (TODO: implement)
3. Finds order by `externalId`
4. Updates order status
5. If `order.paid`, credits Gold to player atomically
6. Returns 200 OK to acknowledge receipt

**Webhook Registration:**
Configure webhook URL in AbacatePay dashboard:
```
Production: https://api.spaceinvaders.com/webhooks/abacatepay
Development: https://your-ngrok-url.ngrok.io/webhooks/abacatepay
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_GOLD",
    "message": "Insufficient gold balance"
  }
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Common Error Codes

**Authentication:**
- `UNAUTHORIZED` - Missing or invalid token
- `TOKEN_EXPIRED` - JWT token expired

**Conversions:**
- `INSUFFICIENT_GOLD` - Not enough Gold balance
- `BELOW_MINIMUM` - Amount below minimum (100 Gold)
- `INVALID_AMOUNT` - Invalid or zero amount

**Shop:**
- `INVALID_PACKAGE` - Package ID doesn't exist
- `ORDER_NOT_FOUND` - Order doesn't exist
- `ORDER_EXPIRED` - Order payment window expired
- `PAYMENT_FAILED` - Payment provider error

**Treasury:**
- `INVALID_DATE` - Date format incorrect
- `EMISSION_EXISTS` - Emission already calculated for date

---

## Rate Limits

To ensure fair usage and system stability:

**Default Limits:**
- 60 requests per minute per IP
- 1000 requests per hour per authenticated user

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1724500860
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 23 seconds.",
    "retryAfter": 23
  }
}
```

**Webhook Endpoints:**
- No rate limits (trusted external service)
- Validated via webhook signature

---

## Best Practices

### Conversion Flow
1. Display player's Gold balance
2. Show conversion rate (100 Gold = 1 SPACE)
3. Validate minimum amount client-side (100 Gold)
4. POST to `/conversions` endpoint
5. Poll `/conversions/:id` or use WebSocket for status updates
6. Display success when status = "completed"
7. Update player's SPACE balance from Solana wallet

### PIX Payment Flow
1. Player selects package
2. POST to `/shop/orders`
3. Display QR code and PIX code
4. Start polling `/shop/orders/:id` every 5 seconds
5. Stop polling when status != "pending"
6. Display success message when status = "completed"
7. Update player's Gold balance

### Error Handling
- Always check `success` field in response
- Display user-friendly error messages
- Log full error response for debugging
- Retry failed requests with exponential backoff
- Handle network errors gracefully

### Security
- Never log or display full JWT tokens
- Validate amounts client-side before sending
- Implement CSRF protection for state-changing operations
- Use HTTPS in production
- Validate webhook signatures (implement signature validation)

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Conversion example
async function convertGoldToSpace(goldAmount: number, token: string) {
  const response = await fetch('https://api.spaceinvaders.com/api/v1/conversions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ goldAmount })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

// Poll conversion status
async function pollConversionStatus(conversionId: number, token: string) {
  const maxAttempts = 60; // 5 minutes

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.spaceinvaders.com/api/v1/conversions/${conversionId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const result = await response.json();

    if (result.data.status === 'completed') {
      return result.data;
    }

    if (result.data.status === 'failed') {
      throw new Error('Conversion failed');
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
  }

  throw new Error('Conversion timeout');
}
```

### Go

```go
// Create PIX order
type CreateOrderRequest struct {
    PackageID string `json:"packageId"`
}

func createOrder(packageID, token string) (*Order, error) {
    reqBody, _ := json.Marshal(CreateOrderRequest{PackageID: packageID})

    req, _ := http.NewRequest(
        "POST",
        "https://api.spaceinvaders.com/api/v1/shop/orders",
        bytes.NewBuffer(reqBody),
    )

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+token)

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Success bool   `json:"success"`
        Data    *Order `json:"data"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    if !result.Success {
        return nil, errors.New("order creation failed")
    }

    return result.Data, nil
}
```

---

## Support

For API questions or issues:
- Backend bugs: [GitHub Issues](https://github.com/space-invaders/backend/issues)
- Email: dev@spaceinvaders.com
- Discord: #api-support

For webhook setup help:
- AbacatePay: https://docs.abacatepay.com
- Webhook testing: Use ngrok for local development
