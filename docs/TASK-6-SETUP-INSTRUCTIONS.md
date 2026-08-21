# Task 6: Setup Instructions - Atomic Purchase Transaction

## ✅ Completed Steps

- [x] Step 3: Added `isPurchasing` flag to ShopClass constructor
- [x] Step 4: Created `buyItem` method with atomic RPC implementation
- [x] Created SQL function file at `docs/supabase-rpc-functions.sql`

## ⚠️ REQUIRED: Supabase SQL Setup

**IMPORTANT:** The following steps MUST be completed in the Supabase Dashboard to activate the atomic purchase functionality:

### Step 1: Create RPC Function in Supabase

1. Open Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Click: **New Query**
4. Copy and paste the SQL from: `docs/supabase-rpc-functions.sql`
5. Click: **Run**
6. Verify: Success message appears

### Step 2: Test RPC Function

Run these tests in the SQL Editor:

```sql
-- Test 1: Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'atomic_purchase';
-- Expected: Should return 1 row with "atomic_purchase"

-- Test 2: Get a real user ID to test with
SELECT id, username, coins FROM players LIMIT 1;
-- Copy the UUID from the result

-- Test 3: Test atomic purchase (replace USER_ID with real UUID)
SELECT atomic_purchase(
  'USER_ID_HERE'::UUID,
  1,        -- item_id (use any valid item)
  10,       -- price
  'test'    -- item_type
);
-- Expected: JSON with {"success": true/false, ...}
```

## 🧪 Testing the Implementation

Once the SQL function is created, test the complete flow:

### Test 1: Normal Purchase
1. Log into the game
2. Navigate to the shop
3. Purchase an item with sufficient coins
4. Check browser console for: "🛒 Processando compra atômica via RPC"
5. Verify success message and coin balance update
6. Check Supabase tables:
   - `players`: coins should be deducted
   - `player_items`: item should be added

### Test 2: Insufficient Balance
1. Try to purchase an expensive item without enough coins
2. Should show alert: "Moedas insuficientes"
3. Verify no changes in Supabase tables

### Test 3: Double-Submit Protection
1. Purchase an item
2. Click the buy button rapidly 10 times
3. Check console: Should only see 1 "🛒 Processando compra"
4. Other clicks should show: "⏳ Compra já em andamento..."
5. Verify in Supabase: Only 1 item purchased, coins deducted once

### Test 4: Atomicity
1. This tests that both operations (deduct coins + add item) happen together
2. Verify that if purchase fails, coins are NOT deducted
3. Verify that if purchase succeeds, BOTH coins are deducted AND item is added

## 📊 What This Fixes

This implementation fixes **Critical Bug #3: Non-Atomic Transaction**

**Before:**
- `purchaseItem` method had separate operations:
  1. Deduct coins from `players` table
  2. Add item to `player_items` table
- If operation #2 failed, coins were lost but item wasn't received
- Race condition: Multiple rapid clicks could deduct coins multiple times

**After:**
- `buyItem` method uses atomic RPC function
- `FOR UPDATE` lock prevents race conditions
- Either BOTH operations succeed or BOTH fail
- `isPurchasing` flag prevents double-submit
- `try/finally` ensures flag is always reset

## 🔄 Migration Strategy

The old `purchaseItem` method is still available for backward compatibility. To migrate:

1. Update UI code to call `buyItem` instead of `purchaseItem`
2. Pass required parameters: `itemId`, `itemType`, `price`
3. Example:
   ```javascript
   // Old way
   await shop.purchaseItem(itemId);

   // New way (atomic)
   await shop.buyItem(itemId, 'skin', 500);
   ```

## 📝 Database Schema Requirements

The RPC function expects these tables and columns:

### `players` table
- `id` (UUID, primary key)
- `coins` (INTEGER)

### `player_items` table
- `user_id` (UUID, foreign key to players.id)
- `item_id` (can be TEXT or INTEGER based on your schema)
- `item_type` (TEXT)
- `acquired_at` (TIMESTAMP)

If your schema is different, modify the SQL function accordingly.

## 🎯 Next Steps

1. ✅ Run the SQL in Supabase Dashboard (Steps 1-2 above)
2. ✅ Test all 4 scenarios
3. ✅ Update UI code to use `buyItem` method
4. ✅ Monitor console logs for atomic transaction messages
5. ✅ Verify no coin loss in production
