# AbacatePay PIX Integration - Design Specification

**Date:** 2026-08-22
**Status:** Approved
**Goal:** Replace mock PIX payment with real AbacatePay integration for selling coin packs

---

## Overview

**What we're building:**
Real PIX payment integration using AbacatePay API to sell in-game coins (R$ 4,99 / R$ 9,99 / R$ 14,99 packages).

**Current state:**
Mock PIX implementation with fake QR codes and `simulatePayment()` function that doesn't actually charge money.

**Target state:**
Production-ready payment system with:
- Real PIX QR codes generated via AbacatePay
- Webhook-based payment confirmation
- Automatic coin crediting
- DevMode testing with simulated payments

---

## Architecture

### High-Level Components

```
Frontend (Browser)
├─ shop.js (UI logic)
├─ AbacatePayManager.js (API client)
└─ ShopClass.js (business logic)
        ↓
   AbacatePay API
   (api.abacatepay.com)
        ↓ webhook
   Supabase Edge Function
   (payment confirmation)
        ↓
   Supabase Database
   (credit coins)
```

### Payment Flow

**Happy Path (30 seconds typical):**

1. Player clicks "Buy R$ 9,99" → `shop.js`
2. Create/get customer → `AbacatePayManager.getOrCreateCustomer()`
3. Generate PIX → `AbacatePayManager.createPixPayment()` → AbacatePay API
4. Show QR Code → Modal with brCode + PNG image
5. Start polling → Every 5s: `checkPaymentStatus()`
6. Player scans QR → Banking app
7. Player confirms payment → Banking system → AbacatePay
8. Webhook fires → Edge Function validates + credits coins
9. Polling detects → Status: "paid"
10. Success modal → "✅ +499 coins!"

**Alternative Path (player closes modal):**

1-7. Same as above
8. Webhook fires → Coins credited silently
9. Player returns later → Sees coins in account

---

## Component Details

### 1. AbacatePayManager.js

**Location:** `src/classes/AbacatePayManager.js`
**Size:** ~350 lines
**Responsibility:** Communication with AbacatePay API

#### Public Interface

```javascript
class AbacatePayManager {
    constructor()

    // Setup
    async initialize()  // Create products if not exist (1x on shop load)

    // Customer Management
    async getOrCreateCustomer(player)  // Returns { customerId }

    // Payment Flow
    async createPixPayment(coinPackId, player)  // Returns { checkoutId, brCode, brCodeBase64, expiresAt }
    async checkPaymentStatus(checkoutId)  // Returns { status: "pending" | "paid" | "expired" }

    // Utilities
    isDevMode()  // Returns true if using abc_dev_ key
    async simulatePayment(checkoutId)  // DevMode only: simulate payment approval
}
```

#### Key Methods

**`initialize()`**
- Called once when shop loads
- Checks if products exist in AbacatePay (`externalId: coin_pack_199/499/999`)
- Creates them if missing via `/products/create`
- Stores product IDs for later use

**`getOrCreateCustomer(player)`**
- Input: `player` object (id, username, email)
- Searches for customer by `externalId: player.id`
- If not found: creates via `/customers/create` with player email
- Returns: `{ customerId: "cust_abc123" }`

**`createPixPayment(coinPackId, player)`**
- Input: `"coin_pack_499"`, player object
- Validates player has email
- Gets/creates customer
- Calls `/transparents/create` with:
  - `amount`: price in centavos (999 for R$ 9,99)
  - `expiresIn`: 1800 (30 minutes)
  - `customer`: { id: customerId }
  - `metadata`: { playerId, coinPackId, coinAmount }
- Returns:
```javascript
{
    success: true,
    checkoutId: "trans_abc123",
    brCode: "00020126580014br.gov.bcb.pix...",  // Copy-paste code
    brCodeBase64: "iVBORw0KGgoAAAANSUhEUg...",  // PNG image (base64)
    expiresAt: "2026-08-22T15:30:00Z"
}
```

**`checkPaymentStatus(checkoutId)`**
- Input: Checkout ID
- Calls `/transparents/check?id=trans_abc123`
- Retry logic: 3 attempts with 2s delay
- Returns: `{ status: "pending" | "paid" | "expired" }`

#### Error Handling

**Retry Strategy:**
- Automatic retry on: 500, 502, 503, 504, 429, network timeout
- Exponential backoff: 2s → 4s → 6s
- No retry on: 400, 401, 404

**Validations:**
- Player email required and valid
- Coin pack exists
- Price within bounds (R$ 0.50 - R$ 1000)

---

### 2. Supabase Edge Function (Webhook)

**Location:** `supabase/functions/abacatepay-webhook/index.ts`
**Size:** ~150 lines
**Responsibility:** Receive webhooks, validate, credit coins

#### Webhook Flow

```typescript
1. Receive POST from AbacatePay
2. Extract header: x-abacatepay-signature
3. Validate HMAC-SHA256 signature (security)
4. Parse JSON body
5. Extract metadata: playerId, coinAmount
6. Credit coins atomically: UPDATE players SET coins = coins + coinAmount
7. Log transaction
8. Respond 200 OK (fast response critical)
```

#### Supported Events

- `transparent.completed` ✅ → Credit coins
- `transparent.refunded` ⚠️ → Log only (manual handling)
- `transparent.expired` 🔔 → Log only

#### Security

**HMAC Validation:**
```typescript
import { createHmac } from 'node:crypto';

function verifySignature(body: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const calculated = hmac.digest('hex');
    return calculated === signature;
}
```

**Idempotency:**
- Check if checkout already processed (optional: add processed_checkouts table)
- Prevents duplicate coin credits if webhook retries

**Environment Variables:**
```bash
ABACATE_PAY_SECRET=space_invaders_webhook_secret_2026
SUPABASE_URL=https://apbbhuhtdqfwfmlzxnwv.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>  # Bypass RLS
```

#### Webhook Payload Example

```json
{
  "event": "transparent.completed",
  "data": {
    "id": "trans_abc123",
    "status": "paid",
    "amount": 999,
    "metadata": {
      "playerId": 123,
      "coinPackId": "coin_pack_499",
      "coinAmount": 499,
      "timestamp": "2026-08-22T14:00:00Z"
    },
    "paidAt": "2026-08-22T14:05:23Z"
  }
}
```

---

### 3. Shop Modifications

#### shop.js Changes

**Before (Mock):**
```javascript
window.openPixModal = function(item) {
    // Show modal with fake QR code (static image)
    pixCode = "00020126...";  // Hardcoded
    generateQRCode(pixCode);  // Local image: pix/qrcode_pix.png
}

window.confirmPixPayment = function() {
    // Fake 3s delay, show success (no real payment)
    setTimeout(() => showSuccess(), 3000);
}
```

**After (Real):**
```javascript
window.openPixModal = async function(item) {
    showProcessingModal("Gerando PIX...");

    try {
        // Create real PIX checkout
        const payment = await abacatePayManager.createPixPayment(
            item.id,
            currentUser
        );

        closeProcessingModal();

        // Display modal with real QR code
        displayPixModal(payment, item);

        // Start polling for payment status
        startPaymentPolling(payment.checkoutId, item);

    } catch (error) {
        closeProcessingModal();
        handlePaymentError(error);
    }
}

// New function: Poll payment status
let pollingInterval = null;

function startPaymentPolling(checkoutId, item) {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        try {
            const status = await abacatePayManager.checkPaymentStatus(checkoutId);

            if (status === 'paid') {
                clearInterval(pollingInterval);
                closePixModal();

                // Reload coins from database (webhook already credited)
                await reloadPlayerCoins();

                showSuccessModal(
                    '✅ Pagamento Aprovado!',
                    `+${item.coinAmount} moedas creditadas!`
                );
            }

            if (status === 'expired') {
                clearInterval(pollingInterval);
                showExpiredModal(item);  // Offers "Generate New PIX" button
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Continue polling (don't stop on transient errors)
        }
    }, 5000);  // Poll every 5 seconds
}

// New function: Display PIX modal with real QR
function displayPixModal(payment, item) {
    const modal = document.getElementById('pix-modal');

    // Update item info
    modal.querySelector('.pix-item-name').textContent = item.name;
    modal.querySelector('.pix-price').textContent = `R$ ${item.price}`;
    modal.querySelector('.pix-coins').textContent = `💰 ${item.coinAmount} moedas`;

    // Update QR code (PNG from base64)
    const qrImg = modal.querySelector('#qr-code-img');
    qrImg.src = `data:image/png;base64,${payment.brCodeBase64}`;

    // Update copy-paste code
    modal.querySelector('#pix-code').value = payment.brCode;

    // Update expiration timer
    startExpirationTimer(payment.expiresAt);

    modal.style.display = 'flex';
}

// New function: Countdown timer
function startExpirationTimer(expiresAt) {
    const timerElement = document.querySelector('.pix-expiration-timer');

    const interval = setInterval(() => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const remaining = Math.max(0, expires - now);

        if (remaining === 0) {
            clearInterval(interval);
            timerElement.textContent = 'Expirado';
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerElement.textContent = `Expira em ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}
```

#### ShopClass.js Changes

**Remove mock payment logic:**

```javascript
// DELETE THIS METHOD:
async purchaseCoinPack(item, currentUser) {
    const paymentConfirmed = await this.simulatePayment(item.price, 'BRL');
    if (!paymentConfirmed) {
        return { success: false, error: 'Pagamento não autorizado' };
    }

    // Credits coins here (WRONG - webhook should do this)
    const newCoins = currentUser.coins + item.coinAmount;
    await supabase.from('players').update({ coins: newCoins }).eq('id', currentUser.id);
    // ...
}

// REPLACE WITH:
async purchaseCoinPack(item, currentUser) {
    // Payment flow now handled by AbacatePayManager + webhook
    // This method is no longer used
    throw new Error('Use AbacatePayManager.createPixPayment() instead');
}
```

**Note:** Coin crediting is now exclusively done by the webhook. Frontend only creates PIX and polls status.

---

## Data Flow

### Payment Creation Flow

```
1. Player: "Buy R$ 9,99"
   ↓
2. shop.js: openPixModal(item)
   ↓
3. AbacatePayManager: getOrCreateCustomer(player)
   ├─ POST /customers/create
   │  Body: { email, name, metadata: { playerId } }
   └─ Response: { customerId }
   ↓
4. AbacatePayManager: createPixPayment(coinPackId, player)
   ├─ POST /transparents/create
   │  Body: {
   │    data: {
   │      amount: 999,  // R$ 9,99 in centavos
   │      expiresIn: 1800,  // 30 minutes
   │      description: "499 moedas - Space Invaders",
   │      customer: { id: customerId },
   │      metadata: {
   │        playerId: 123,
   │        coinPackId: "coin_pack_499",
   │        coinAmount: 499
   │      }
   │    }
   │  }
   └─ Response: {
        id: "trans_abc123",
        brCode: "00020126...",
        brCodeBase64: "iVBORw0KGgo...",
        status: "pending",
        expiresAt: "2026-08-22T15:30:00Z"
      }
   ↓
5. shop.js: displayPixModal(payment, item)
   ├─ Show QR code image (from brCodeBase64)
   ├─ Show copy-paste code (brCode)
   └─ Start expiration timer
   ↓
6. shop.js: startPaymentPolling(checkoutId)
   └─ setInterval(() => checkPaymentStatus(), 5000)
```

### Webhook Processing Flow

```
1. Player pays PIX in banking app
   ↓
2. Banking system confirms to AbacatePay
   ↓
3. AbacatePay fires webhook
   ├─ POST https://[project].supabase.co/functions/v1/abacatepay-webhook
   │  Headers:
   │    x-abacatepay-signature: <hmac-sha256>
   │  Body: {
   │    event: "transparent.completed",
   │    data: {
   │      id: "trans_abc123",
   │      status: "paid",
   │      metadata: { playerId, coinAmount }
   │    }
   │  }
   └─ Expected response: 200 OK (fast!)
   ↓
4. Edge Function: Validate HMAC signature
   ├─ Extract signature from header
   ├─ Calculate HMAC from body + secret
   ├─ Compare signatures
   └─ If invalid: return 401 (AbacatePay will retry)
   ↓
5. Edge Function: Parse event
   ├─ Extract playerId, coinAmount from metadata
   └─ Validate event type === "transparent.completed"
   ↓
6. Edge Function: Credit coins (atomic)
   ├─ UPDATE players
   │  SET coins = coins + 499
   │  WHERE id = 123
   └─ Log success
   ↓
7. Edge Function: Respond 200 OK
   ↓
8. Polling detects status change (next cycle)
   ├─ GET /transparents/check?id=trans_abc123
   ├─ Response: { status: "paid" }
   └─ Stop polling, show success modal
```

### Race Condition Handling

**Scenario:** Webhook credits coins before polling detects payment

```
T=0s:  Player pays PIX
T=1s:  Webhook fires → coins credited
T=3s:  Polling checks status → "paid"
       └─ Coins already credited (by webhook)
       └─ Just show success modal
       └─ Reload coins from database (refresh UI)
```

**Solution:**
- Webhook is **sole source of truth** for coin crediting
- Polling only **reads** status and **updates UI**
- No duplicate coin credits possible

---

## Error Handling

### Error Categories

1. **Network Errors:** Timeout, DNS failure, connection refused
2. **API Errors:** 400, 401, 429, 500 from AbacatePay
3. **Validation Errors:** Missing email, invalid price
4. **Webhook Errors:** Invalid HMAC, malformed payload

### Retry Strategy

**AbacatePayManager:**
- Automatic retry on: 500, 502, 503, 504, 429, network errors
- Exponential backoff: 2s → 4s → 6s
- Max retries: 3
- No retry on: 400, 401, 404 (client errors)

**Edge Function:**
- If webhook fails (500 response): AbacatePay retries at 1min, 5min, 15min, 1h, 6h
- If HMAC invalid (401): AbacatePay stops retrying (requires manual fix)

### User-Facing Messages

| Technical Error | User Message | Action |
|----------------|--------------|--------|
| Network timeout | "Sem conexão. Verifique sua internet e tente novamente." | Retry button |
| 500 Server Error | "Serviço indisponível. Tente novamente em alguns minutos." | Retry button |
| 429 Rate Limit | "Muitas tentativas. Aguarde 1 minuto e tente novamente." | Disable button 60s |
| Player no email | "Configure seu email no perfil para comprar moedas." | Go to profile button |
| PIX expired | "QR Code expirou. Deseja gerar um novo?" | Generate new PIX button |

### Validations

**Before creating PIX:**
```javascript
// 1. Email required
if (!player.email || player.email === '') {
    throw new ValidationError('Configure seu email no perfil');
}

// 2. Email format valid
if (!isValidEmail(player.email)) {
    throw new ValidationError('Email inválido no perfil');
}

// 3. Coin pack exists
const pack = getCoinPack(coinPackId);
if (!pack) {
    throw new ValidationError('Pacote não encontrado');
}

// 4. Price valid
if (pack.price < 0.50 || pack.price > 1000) {
    throw new ValidationError('Valor inválido');
}
```

### Edge Cases

**1. Player deletes account while PIX pending:**
- Webhook tries to credit → player doesn't exist
- Log error, return 200 OK (don't retry)
- Money stays in AbacatePay → manual refund if needed

**2. Multiple PIX open simultaneously:**
- Allowed (each independent)
- All remain valid until expiration
- Webhook credits each separately

**3. Player pays expired PIX (bank accepts):**
- AbacatePay processes normally
- Webhook credits coins
- Works fine (not a problem)

**4. Player closes browser after paying:**
- Polling stops (no issue)
- Webhook credits coins in background
- Player sees coins next login

---

## Testing Strategy

### Environments

**DevMode (Development):**
- API Key: `abc_dev_36LGWbADGu61FZa5L2bURW3w`
- PIX QR Codes: Real but sandbox
- Payments: Simulated via `/transparents/simulate-payment`
- Webhooks: Functional (need public URL)
- **No real money charged**

**Production:**
- API Key: `abc_prod_...` (to be created)
- PIX QR Codes: Real
- Payments: Real money
- Webhooks: Same as dev
- **Real money charged**

### Manual Testing Flow (DevMode)

**Test 1: Complete Flow with Simulation**

```
1. Open shop.html in browser
2. Login with test user
3. Click "Buy R$ 4,99"
4. PIX modal opens with real QR code
5. Copy checkoutId from console
6. In another tab, simulate payment:
   POST https://api.abacatepay.com/v2/transparents/simulate-payment
   Body: { "id": "trans_abc123" }
7. Return to game
8. Within ~5s: Success modal appears
9. Verify: 199 coins credited
10. Check Supabase logs: webhook processed successfully
```

**Test 2: Expiration**

```
1. Create PIX
2. Don't simulate payment
3. Wait 30 minutes (or change expiresIn to 60s in code)
4. Polling detects "expired"
5. Expiration modal appears
6. Click "Generate New PIX"
7. New QR code generated
```

**Test 3: Player Closes Modal**

```
1. Create PIX
2. Close modal immediately
3. Simulate payment via API
4. Webhook credits coins
5. Refresh shop page
6. Coins should be there
```

**Test 4: Network Error**

```
1. Disable internet
2. Try to create PIX
3. Should show friendly error
4. Enable internet
5. Click "Try Again"
6. PIX created successfully
```

**Test 5: Player Without Email**

```
1. Login with player that has no email
2. Try to buy
3. Error: "Configure seu email no perfil"
```

### Pre-Production Checklist

Before switching to `abc_prod_`:

- [ ] All manual tests passing
- [ ] Webhook receiving and processing correctly
- [ ] Supabase logs error-free
- [ ] Polling detecting payments
- [ ] Success modal working
- [ ] Expiration working
- [ ] Error retry working
- [ ] Validations active
- [ ] Products created in production environment
- [ ] Webhook configured in production environment
- [ ] Test with R$ 0,50 real payment before launch
- [ ] Support documentation ready (how to refund, etc)

### Monitoring

**Metrics to Track:**

1. **Conversion Rate:** PIX generated vs PIX paid (target: >70%)
2. **Average Payment Time:** Creation to payment (target: <2 min)
3. **Expiration Rate:** Expired without payment (target: <30%)
4. **Webhook Failures:** Check logs daily (target: 0 failures)

**AbacatePay Dashboard:**
- Real-time transactions
- Sales reports
- Webhook logs
- Refunds (if needed)

---

## Implementation Plan

### Files to Create

1. **`src/classes/AbacatePayManager.js`** (~350 lines)
   - API client for AbacatePay
   - Product management
   - Customer management
   - Payment creation
   - Status polling

2. **`supabase/functions/abacatepay-webhook/index.ts`** (~150 lines)
   - Webhook handler
   - HMAC validation
   - Coin crediting

3. **`supabase/functions/abacatepay-webhook/_shared/verify-signature.ts`** (~50 lines)
   - HMAC signature verification utility

4. **`docs/ABACATEPAY-SETUP.md`** (~200 lines)
   - Setup guide
   - Testing instructions
   - Production deployment steps

### Files to Modify

1. **`src/shop.js`** (~100 lines changed)
   - Remove mock PIX code (lines 296-471)
   - Add `openPixModal` with real API calls
   - Add `startPaymentPolling`
   - Add `displayPixModal`
   - Add `startExpirationTimer`
   - Add error handling modals

2. **`src/classes/ShopClass.js`** (~30 lines changed)
   - Remove `purchaseCoinPack` mock logic
   - Update to use AbacatePayManager

3. **`.env`** (already has `ABACATE_PAY`)
   - Add `ABACATE_PAY_SECRET` for webhook

### Implementation Order

1. **Setup (Day 1)**
   - Create products in AbacatePay dashboard
   - Create webhook in AbacatePay
   - Deploy Edge Function

2. **Core (Day 1-2)**
   - Create `AbacatePayManager.js`
   - Implement all methods
   - Add error handling

3. **Integration (Day 2)**
   - Modify `shop.js`
   - Remove mock code
   - Add polling logic

4. **Edge Function (Day 2)**
   - Create webhook handler
   - Add HMAC validation
   - Test with devMode

5. **Testing (Day 3)**
   - Manual testing all flows
   - Error scenarios
   - Edge cases

6. **Documentation (Day 3)**
   - Setup guide
   - Testing guide
   - Production checklist

---

## Security Considerations

### HMAC Validation

**Critical:** Every webhook must validate HMAC signature to prevent:
- Fake payment notifications
- Man-in-the-middle attacks
- Unauthorized coin crediting

```typescript
// MUST validate before processing
if (!verifySignature(body, signature, secret)) {
    return new Response('Invalid signature', { status: 401 });
}
```

### API Key Protection

**Never expose in frontend:**
- ✅ Store in `.env` (server-side only)
- ✅ Load via `import.meta.env.VITE_ABACATE_PAY` (build-time)
- ❌ Never hardcode in source files
- ❌ Never commit to git

### Idempotency

**Prevent duplicate credits:**
- Option 1: Track processed checkout IDs
- Option 2: Check if coins already increased for this payment
- AbacatePay may retry webhook → must handle gracefully

### Rate Limiting

**AbacatePay enforces:**
- DevMode: Lower limits
- Production: Higher limits
- Respect 429 responses (wait before retry)

---

## Success Criteria

### Functional Requirements

- ✅ Player can buy coin packs with real PIX
- ✅ QR code generates correctly (scannable)
- ✅ Copy-paste code works
- ✅ Webhook credits coins automatically
- ✅ Polling detects payment within 10 seconds
- ✅ Expiration handled gracefully
- ✅ Errors show friendly messages
- ✅ Works in DevMode (simulated payments)

### Non-Functional Requirements

- ✅ Payment creation: <3 seconds
- ✅ Webhook response: <1 second
- ✅ Polling interval: 5 seconds
- ✅ QR code expiration: 30 minutes
- ✅ Error retry: 3 attempts max
- ✅ Zero duplicate coin credits
- ✅ 99.9% webhook delivery (AbacatePay SLA)

### Business Metrics

- ✅ Conversion rate: >70%
- ✅ Support tickets: <5% of transactions
- ✅ Refund rate: <2%
- ✅ Average payment time: <2 minutes

---

## Future Enhancements

### Phase 2 (Optional)

1. **Transaction History Table**
   - Store all PIX transactions locally
   - Enable player-facing transaction history
   - Better support debugging

2. **Coupon System**
   - Integrate AbacatePay coupons
   - Discount codes for coin packs
   - Promotional campaigns

3. **Subscription Plans**
   - Monthly coin packages
   - VIP membership with recurring billing
   - Uses AbacatePay subscription feature (commented out in docs)

4. **Payment Links**
   - Generate shareable payment links
   - Gift coins to friends
   - Affiliate/referral system

5. **Multiple Payment Methods**
   - Credit card (AbacatePay supports but disabled for now)
   - Boleto bancário
   - International payments

---

## Appendix

### API Endpoints Used

**AbacatePay Base URL:** `https://api.abacatepay.com/v2`

- `POST /products/create` - Create coin pack products
- `GET /products/list` - List existing products
- `POST /customers/create` - Create/get customer by email
- `POST /transparents/create` - Create PIX checkout
- `GET /transparents/check` - Check payment status
- `POST /transparents/simulate-payment` - Simulate payment (devMode only)
- `POST /webhooks/create` - Register webhook endpoint

### Environment Variables

**Frontend (.env):**
```bash
VITE_ABACATE_PAY=abc_dev_36LGWbADGu61FZa5L2bURW3w
```

**Edge Function (.env.local):**
```bash
ABACATE_PAY_SECRET=space_invaders_webhook_secret_2026
SUPABASE_URL=https://apbbhuhtdqfwfmlzxnwv.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

### Coin Pack Configuration

| Pack ID | Name | Price | Coins |
|---------|------|-------|-------|
| coin_pack_199 | Pacote Pequeno | R$ 4,99 | 199 |
| coin_pack_499 | Pacote Médio | R$ 9,99 | 499 |
| coin_pack_999 | Pacote Grande | R$ 14,99 | 999 |

---

**End of Specification**
