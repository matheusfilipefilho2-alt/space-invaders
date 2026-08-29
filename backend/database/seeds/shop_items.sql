-- Seed shop items
-- ============================================================================
-- SKINS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, permanent, skin_file, is_default) VALUES
('skin_default', 'Nave Padrão', 'A nave clássica original do jogo', 'skin', 0, '🛸', 'common', true, 'spaceship.png', true),
('skin_orange', 'Nave Laranja', 'Design moderno com acabamento laranja vibrante', 'skin', 1200, '🟠', 'rare', true, 'orange.png', false),
('skin_yellowwing', 'Yellow Wing', 'Caça amarelo de alta velocidade', 'skin', 900, '🟡', 'uncommon', true, 'yellowwing.png', false),
('skin_xwing', 'X-Wing Fighter', 'Caça estelar da Aliança Rebelde', 'skin', 1800, '✈️', 'epic', true, 'xwing.png', false),
('skin_milenium', 'Millennium Falcon', 'A icônica nave de Han Solo', 'skin', 2500, '🚀', 'legendary', true, 'milenium.png', false);

UPDATE items SET unlock_level = 5 WHERE id = 'skin_xwing';
UPDATE items SET unlock_level = 10 WHERE id = 'skin_milenium';

-- ============================================================================
-- BOOSTS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, duration) VALUES
('boost_coins', 'Multiplicador de Moedas', 'Dobra as moedas ganhas por 5 partidas', 'boost', 250, '💰', 'common', '5 partidas'),
('boost_xp', 'Boost de XP', '+50% de experiência por 3 partidas', 'boost', 400, '⚡', 'uncommon', '3 partidas'),
('xp_boost_2x', 'XP Boost 2x', 'Dobra XP ganho por 1 hora', 'boost', 300, '📈', 'common', '1 hora'),
('gold_boost_2x', 'Gold Boost 2x', 'Dobra ouro ganho por 1 hora', 'boost', 350, '💰', 'common', '1 hora'),
('combo_boost', 'Combo Boost', 'Aumenta duração do combo em 50%', 'boost', 400, '🔥', 'rare', '1 partida'),
('super_pack', 'Super Pack', '2x XP + 2x Gold + Combo por 2 horas', 'boost', 1000, '🎁', 'legendary', '2 horas');

-- ============================================================================
-- POWER-UPS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, duration, disabled, coming_soon) VALUES
('shield_extra', 'Escudo Extra', 'Começa a partida com escudo adicional', 'powerup', 150, '🛡️', 'common', '1 partida', true, true),
('rapid_fire', 'Fogo Rápido', 'Aumenta a velocidade de tiro por 30 segundos', 'powerup', 250, '⚡', 'common', '30 segundos', false, false),
('triple_shot', 'Tiro Triplo', 'Atira 3 projéteis simultâneos por 20 segundos', 'powerup', 400, '🔱', 'rare', '20 segundos', false, false),
('laser_beam', 'Laser de Energia', 'Laser poderoso que atravessa inimigos', 'powerup', 600, '🌟', 'epic', '15 segundos', false, false),
('mega_bomb', 'Mega Bomba', 'Destrói todos os inimigos na tela', 'powerup', 800, '💣', 'epic', '1 uso', false, false);

-- ============================================================================
-- UTILITÁRIOS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, duration, permanent) VALUES
('life_bonus', 'Vida Bônus', 'Tem a chance de receber um bonus de até 3 vidas durante a partida', 'utility', 300, '❤️', 'uncommon', '1 partida', false),
('trail_rainbow', 'Nave Arco-íris', 'Efeito visual especial com cores do arco-íris', 'utility', 500, '🌈', 'legendary', null, true),
('revive_token', 'Revive Token', 'Revive automaticamente ao morrer (1 uso)', 'utility', 500, '💚', 'rare', '1 uso', false),
('boss_key', 'Boss Key', 'Acesso direto ao Boss Fight', 'utility', 400, '🔑', 'rare', '1 uso', false),
('lucky_charm', 'Lucky Charm', 'Aumenta chance de drop de itens raros em 25%', 'utility', 600, '🍀', 'epic', '1 partida', false),
('time_warp', 'Time Warp', 'Diminui velocidade dos inimigos por 30 segundos', 'utility', 700, '⏰', 'epic', '1 uso', false);

-- ============================================================================
-- COSMÉTICOS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, permanent) VALUES
('ship_golden', 'Nave Dourada', 'Nave com acabamento dourado luxuoso', 'cosmetic', 500, '🚀', 'epic', true);

-- ============================================================================
-- TEMAS
-- ============================================================================
INSERT INTO items (id, name, description, category, price_gold, image, rarity, permanent, disabled, coming_soon) VALUES
('theme_neon', 'Tema Neon', 'Interface com cores vibrantes e efeitos neon', 'theme', 450, '🌈', 'uncommon', true, true, true),
('theme_retro', 'Tema Retrô', 'Visual clássico dos anos 80', 'theme', 750, '📺', 'rare', true, true, true);

-- ============================================================================
-- PACOTES DE MOEDAS (Compra com dinheiro real)
-- ============================================================================
INSERT INTO items (id, name, description, category, price_real, coin_amount, image, rarity) VALUES
('coin_pack_199', 'Pacote de 199 Moedas', 'Compre 199 moedas por R$ 4,99', 'coin_pack', 4.99, 199, '💰', 'common'),
('coin_pack_499', 'Pacote de 499 Moedas', 'Compre 499 moedas por R$ 9,99', 'coin_pack', 9.99, 499, '💰', 'uncommon'),
('coin_pack_999', 'Pacote de 999 Moedas', 'Compre 999 moedas por R$ 14,99', 'coin_pack', 14.99, 999, '💰', 'rare');
