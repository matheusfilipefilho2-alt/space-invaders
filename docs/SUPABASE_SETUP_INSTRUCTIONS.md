# Supabase Setup Instructions

## RPC Function: validate_user_balance

### Purpose
This function provides server-side validation to ensure users have sufficient coins before making purchases, preventing client-side manipulation of coin balances.

### Setup Steps

1. **Open Supabase Dashboard**
   - Go to your project at: https://supabase.com/dashboard
   - Navigate to your Space Invaders project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click on "New Query"

3. **Create the Function**

   Copy and paste this SQL code:

```sql
-- Função para validar se usuário tem moedas suficientes
-- Usada para prevenir manipulação client-side de saldos
CREATE OR REPLACE FUNCTION validate_user_balance(
  p_user_id UUID,
  p_required_amount INT
) RETURNS BOOLEAN AS $$
DECLARE
  user_coins INT;
BEGIN
  -- Buscar saldo atual do usuário
  SELECT coins INTO user_coins
  FROM players
  WHERE id = p_user_id;

  -- Retornar se tem saldo suficiente
  RETURN user_coins >= p_required_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

4. **Execute the Query**
   - Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
   - Wait for success message: "Success. No rows returned"

### Testing

After creating the function, run these tests in the SQL Editor:

#### Test 1: Verify Function Exists
```sql
SELECT proname, proargtypes, prorettype
FROM pg_proc
WHERE proname = 'validate_user_balance';
```

Expected result: 1 row showing the function details

#### Test 2: Test with Real User ID

First, get a real user ID from your database:
```sql
SELECT id, username, coins
FROM players
LIMIT 1;
```

Then test the function (replace USER_ID_HERE with actual UUID):
```sql
-- Test with amount user CAN afford
SELECT validate_user_balance('USER_ID_HERE'::UUID, 100);
-- Should return: true (if user has >= 100 coins)

-- Test with amount user CANNOT afford
SELECT validate_user_balance('USER_ID_HERE'::UUID, 999999);
-- Should return: false
```

### Security Notes

- The function uses `SECURITY DEFINER` to run with elevated privileges
- It only reads data (SELECT only), no modifications
- Returns only boolean values, no sensitive data exposed
- Prevents client-side coin manipulation attacks

### Integration

This function is now integrated in `ShopClass.js`:
- Called before every item purchase
- Validates balance server-side before processing
- Prevents purchases if validation fails
- Logs validation results to console

### Troubleshooting

**Problem:** Function already exists error
**Solution:** The `CREATE OR REPLACE` statement will update the existing function

**Problem:** Table "players" does not exist
**Solution:** Verify your database schema has the `players` table with a `coins` column

**Problem:** Permission denied
**Solution:** Ensure you're logged in as database owner or have sufficient privileges
