# AbacatePay Integration - Setup & Testing Guide

## Prerequisites

- ✅ VITE_ABACATE_PAY in .env (already configured)
- ✅ Supabase project running
- ✅ Edge Function deployed
- ✅ Webhook configured in AbacatePay dashboard

---

## Setup Steps

### 1. Configure Webhook in AbacatePay

**Dashboard:** https://app.abacatepay.com/webhooks

Create webhook:
- **Name:** Space Invaders Webhook
- **Endpoint:** `https://apbbhuhtdqfwfmlzxnwv.supabase.co/functions/v1/abacatepay-webhook`
- **Secret:** `space_invaders_webhook_secret_2026`
- **Events:**
  - ✅ transparent.completed
  - ✅ transparent.expired
  - ✅ transparent.refunded

### 2. Verify Products Created

Open `shop.html` and check console:
```
✅ Product coin_pack_199 already exists: prod_xxx
✅ Product coin_pack_499 already exists: prod_xxx
✅ Product coin_pack_999 already exists: prod_xxx
```

If not created, products will be auto-created on first load.

---

## Testing in DevMode

### Test 1: Complete Payment Flow

1. **Open shop.html**
2. **Login** with test user (must have email)
3. **Click** "Comprar R$ 4,99"
4. **Wait** ~3 seconds for QR code to generate
5. **Copy** checkout ID from console:
   ```
   💳 Creating PIX payment: { checkoutId: "trans_xxx", ... }
   ✅ PIX payment created: { checkoutId: "trans_abc123", ... }
   ```
6. **Open new tab** and simulate payment:
   ```bash
   curl -X POST https://api.abacatepay.com/v2/transparents/simulate-payment \
     -H "Authorization: Bearer abc_dev_36LGWbADGu61FZa5L2bURW3w" \
     -H "Content-Type: application/json" \
     -d '{"id":"trans_abc123"}'
   ```
7. **Return to game** tab
8. **Within ~5s:** Success modal appears
9. **Verify:** 199 coins credited

**Expected Console Output:**
```
🔄 Starting payment polling for: trans_abc123
📊 Payment status: pending
📊 Payment status: pending
📊 Payment status: paid
✅ Coins reloaded: [new total]
```

**Expected Webhook Log (Supabase):**
```
📥 Webhook received: { event: "transparent.completed", checkoutId: "trans_abc123" }
💰 Crediting coins: { playerId: 123, coinAmount: 199, checkoutId: "trans_abc123" }
✅ Coins credited successfully: { playerId: 123, oldCoins: X, newCoins: X+199 }
```

### Test 2: Expiration Handling

1. **Create PIX** (click buy)
2. **Wait 30 minutes** (or change expiresIn to 60 in code for faster test)
3. **Polling detects** "expired"
4. **Modal shows:** "PIX Expirado" with "Gerar Novo PIX" button
5. **Click button:** New QR code generated

### Test 3: Player Closes Modal

1. **Create PIX**
2. **Close modal immediately**
3. **Simulate payment** via curl
4. **Webhook credits** coins in background
5. **Reload page** or check coins: should be credited

### Test 4: Network Error

1. **Disable internet**
2. **Try to create PIX**
3. **Should show:** "Sem conexão. Verifique sua internet..."
4. **Enable internet**
5. **Try again:** Should work

### Test 5: Player Without Email

1. **Create player** with no email in database
2. **Login** with that player
3. **Try to buy**
4. **Should show:** "Player email is required. Please update your profile."

---

## Troubleshooting

### Issue: "Failed to initialize AbacatePay"

**Check:**
- VITE_ABACATE_PAY in .env
- API key is valid (abc_dev_ for DevMode)
- Internet connection

### Issue: "Webhook not receiving events"

**Check:**
- Edge Function deployed: `supabase functions list`
- Webhook URL is correct in AbacatePay dashboard
- ABACATE_PAY_SECRET matches in .env and dashboard
- Check Supabase logs: Functions → abacatepay-webhook → Logs

### Issue: "Payment status stuck on pending"

**Check:**
- Did you simulate payment via API?
- Check webhook logs in Supabase
- Check if coins were credited in database directly
- Try reloading page

### Issue: "Coins not credited after payment"

**Check:**
- Webhook logs in Supabase (any errors?)
- Database: `SELECT * FROM players WHERE id = X`
- Console: any errors during polling?

---

## Production Deployment

### Before Switching to Production

- [ ] All DevMode tests passing
- [ ] Webhook working correctly (check logs)
- [ ] Error handling tested
- [ ] Expiration tested
- [ ] Test with R$ 0.50 real payment first

### Switch to Production

1. **Get production API key** from AbacatePay dashboard
2. **Update .env:**
   ```bash
   VITE_ABACATE_PAY=abc_prod_XXXXXXXXXXXX
   ```
3. **Rebuild:** `npm run build`
4. **Create webhook** in production environment
5. **Test with minimum amount** (R$ 0.50)
6. **Monitor closely** for first few transactions

---

## Monitoring

### Key Metrics

- **Conversion Rate:** PIX generated vs PIX paid (target: >70%)
- **Average Time:** Creation to payment (target: <2 min)
- **Expiration Rate:** Expired PIX (target: <30%)
- **Webhook Failures:** Check logs daily (target: 0)

### AbacatePay Dashboard

- View transactions: https://app.abacatepay.com/transactions
- Webhook logs: https://app.abacatepay.com/webhooks
- Reports: https://app.abacatepay.com/reports

---

## Support

**Player says: "Paid but didn't receive coins"**

1. Get checkout ID (ask player for timestamp)
2. Check AbacatePay dashboard (transaction list)
3. Check webhook logs in Supabase
4. Check database directly:
   ```sql
   SELECT * FROM players WHERE id = [player_id]
   ```
5. If webhook failed: manually credit coins + investigate why
6. If webhook succeeded: coins are there, ask player to refresh

**Refunds**

Use AbacatePay dashboard to issue refunds. Manually deduct coins from player if already spent.

---

**Status:** ✅ Ready for DevMode testing
**Next:** Test all flows, then switch to production
