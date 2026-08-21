-- Função para executar compra atomicamente
-- Garante que moedas nunca são perdidas: ambas operações ou nenhuma
CREATE OR REPLACE FUNCTION atomic_purchase(
  p_user_id UUID,
  p_item_id INT,
  p_item_price INT,
  p_item_type TEXT
) RETURNS JSON AS $$
DECLARE
  user_coins INT;
  new_balance INT;
BEGIN
  -- Lock da linha do usuário para evitar race conditions
  SELECT coins INTO user_coins
  FROM players
  WHERE id = p_user_id
  FOR UPDATE;

  -- Validar saldo (server-side validation)
  IF user_coins < p_item_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Moedas insuficientes'
    );
  END IF;

  -- Deduzir moedas
  UPDATE players
  SET coins = coins - p_item_price
  WHERE id = p_user_id
  RETURNING coins INTO new_balance;

  -- Adicionar item ao inventário
  INSERT INTO player_items (player_id, item_id, item_type, acquired_at)
  VALUES (p_user_id, p_item_id, p_item_type, NOW());

  -- Retornar sucesso com novo saldo
  RETURN json_build_object(
    'success', true,
    'remaining_coins', new_balance,
    'message', 'Item comprado com sucesso!'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automático em caso de erro
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao processar compra: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Teste: verificar se função foi criada
-- SELECT proname FROM pg_proc WHERE proname = 'atomic_purchase';

-- Teste: simular compra (substitua USER_ID por UUID real)
-- SELECT atomic_purchase(
--   'USER_ID_AQUI'::UUID,
--   1,        -- item_id
--   10,       -- price
--   'skin'    -- item_type
-- );
