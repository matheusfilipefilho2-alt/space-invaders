# Supabase RPC Functions Documentation

## validate_user_balance

**Purpose:** Server-side validation to ensure users have sufficient coins before making purchases. This prevents client-side manipulation of coin balances.

**Function Signature:**
```sql
validate_user_balance(p_user_id UUID, p_required_amount INT) RETURNS BOOLEAN
```

**Parameters:**
- `p_user_id`: UUID of the player
- `p_required_amount`: Number of coins required for the purchase

**Returns:**
- `BOOLEAN`: `true` if user has sufficient balance, `false` otherwise

**SQL Definition:**
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

**Security:**
- Uses `SECURITY DEFINER` to run with the privileges of the function creator
- Only reads data, does not modify any records
- Returns only boolean values, no sensitive data exposed

**Usage in Code:**
```javascript
const { data, error } = await supabase
    .rpc('validate_user_balance', {
        p_user_id: userId,
        p_required_amount: requiredAmount
    });
```

**Testing:**
```sql
-- Test 1: Verify function exists
SELECT proname, proargtypes, prorettype
FROM pg_proc
WHERE proname = 'validate_user_balance';

-- Test 2: Call function with actual user ID
SELECT validate_user_balance('USER_ID_HERE'::UUID, 100);
```

**Created:** 2026-08-21
**Status:** Implemented
