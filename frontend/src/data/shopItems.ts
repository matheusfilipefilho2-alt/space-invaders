/**
 * Shop Items Data
 *
 * Itens disponíveis na loja do jogo
 */

export interface ShopItem {
  id: string
  name: string
  description: string
  category: 'skin' | 'powerup' | 'boost' | 'special' | 'theme' | 'cosmetic' | 'utility' | 'coin_pack'
  price_gold?: number
  price_real?: number
  coin_amount?: number
  image: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  unlockLevel?: number
  permanent?: boolean
  duration?: string
  disabled?: boolean
  comingSoon?: boolean
  skinFile?: string
  isDefault?: boolean
}

export const SHOP_ITEMS: ShopItem[] = [
  // ============================================================================
  // SKINS - Naves
  // ============================================================================
  {
    id: 'skin_default',
    name: 'Nave Padrão',
    description: 'A nave clássica original do jogo',
    category: 'skin',
    price_gold: 0,
    image: '🛸',
    rarity: 'common',
    permanent: true,
    skinFile: 'spaceship.png',
    isDefault: true
  },
  {
    id: 'skin_orange',
    name: 'Nave Laranja',
    description: 'Design moderno com acabamento laranja vibrante',
    category: 'skin',
    price_gold: 1200,
    image: '🟠',
    rarity: 'rare',
    permanent: true,
    skinFile: 'orange.png'
  },
  {
    id: 'skin_yellowwing',
    name: 'Yellow Wing',
    description: 'Caça amarelo de alta velocidade',
    category: 'skin',
    price_gold: 900,
    image: '🟡',
    rarity: 'uncommon',
    permanent: true,
    skinFile: 'yellowwing.png'
  },
  {
    id: 'skin_xwing',
    name: 'X-Wing Fighter',
    description: 'Caça estelar da Aliança Rebelde',
    category: 'skin',
    price_gold: 1800,
    image: '✈️',
    rarity: 'epic',
    permanent: true,
    skinFile: 'xwing.png',
    unlockLevel: 5
  },
  {
    id: 'skin_milenium',
    name: 'Millennium Falcon',
    description: 'A icônica nave de Han Solo',
    category: 'skin',
    price_gold: 2500,
    image: '🚀',
    rarity: 'legendary',
    permanent: true,
    skinFile: 'milenium.png',
    unlockLevel: 10
  },

  // ============================================================================
  // BOOSTS
  // ============================================================================
  {
    id: 'boost_coins',
    name: 'Multiplicador de Moedas',
    description: 'Dobra as moedas ganhas por 5 partidas',
    category: 'boost',
    price_gold: 250,
    image: '💰',
    rarity: 'common',
    duration: '5 partidas'
  },
  {
    id: 'boost_xp',
    name: 'Boost de XP',
    description: '+50% de experiência por 3 partidas',
    category: 'boost',
    price_gold: 400,
    image: '⚡',
    rarity: 'uncommon',
    duration: '3 partidas'
  },
  {
    id: 'xp_boost_2x',
    name: 'XP Boost 2x',
    description: 'Dobra XP ganho por 1 hora',
    category: 'boost',
    price_gold: 300,
    image: '📈',
    rarity: 'common',
    duration: '1 hora'
  },
  {
    id: 'gold_boost_2x',
    name: 'Gold Boost 2x',
    description: 'Dobra ouro ganho por 1 hora',
    category: 'boost',
    price_gold: 350,
    image: '💰',
    rarity: 'common',
    duration: '1 hora'
  },
  {
    id: 'combo_boost',
    name: 'Combo Boost',
    description: 'Aumenta duração do combo em 50%',
    category: 'boost',
    price_gold: 400,
    image: '🔥',
    rarity: 'rare',
    duration: '1 partida'
  },
  {
    id: 'super_pack',
    name: 'Super Pack',
    description: '2x XP + 2x Gold + Combo por 2 horas',
    category: 'boost',
    price_gold: 1000,
    image: '🎁',
    rarity: 'legendary',
    duration: '2 horas'
  },

  // ============================================================================
  // POWER-UPS
  // ============================================================================
  {
    id: 'shield_extra',
    name: 'Escudo Extra',
    description: 'Começa a partida com escudo adicional',
    category: 'powerup',
    price_gold: 150,
    image: '🛡️',
    rarity: 'common',
    duration: '1 partida',
    disabled: true,
    comingSoon: true
  },
  {
    id: 'rapid_fire',
    name: 'Fogo Rápido',
    description: 'Aumenta a velocidade de tiro por 30 segundos',
    category: 'powerup',
    price_gold: 250,
    image: '⚡',
    rarity: 'common',
    duration: '30 segundos'
  },
  {
    id: 'triple_shot',
    name: 'Tiro Triplo',
    description: 'Atira 3 projéteis simultâneos por 20 segundos',
    category: 'powerup',
    price_gold: 400,
    image: '🔱',
    rarity: 'rare',
    duration: '20 segundos'
  },
  {
    id: 'laser_beam',
    name: 'Laser de Energia',
    description: 'Laser poderoso que atravessa inimigos',
    category: 'powerup',
    price_gold: 600,
    image: '🌟',
    rarity: 'epic',
    duration: '15 segundos'
  },
  {
    id: 'mega_bomb',
    name: 'Mega Bomba',
    description: 'Destrói todos os inimigos na tela',
    category: 'powerup',
    price_gold: 800,
    image: '💣',
    rarity: 'epic',
    duration: '1 uso'
  },

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================
  {
    id: 'life_bonus',
    name: 'Vida Bônus',
    description: 'Tem a chance de receber um bonus de até 3 vidas durante a partida',
    category: 'utility',
    price_gold: 300,
    image: '❤️',
    rarity: 'uncommon',
    duration: '1 partida'
  },
  {
    id: 'trail_rainbow',
    name: 'Nave Arco-íris',
    description: 'Efeito visual especial com cores do arco-íris',
    category: 'utility',
    price_gold: 500,
    image: '🌈',
    rarity: 'legendary',
    permanent: true
  },
  {
    id: 'revive_token',
    name: 'Revive Token',
    description: 'Revive automaticamente ao morrer (1 uso)',
    category: 'utility',
    price_gold: 500,
    image: '💚',
    rarity: 'rare',
    duration: '1 uso'
  },
  {
    id: 'boss_key',
    name: 'Boss Key',
    description: 'Acesso direto ao Boss Fight',
    category: 'utility',
    price_gold: 400,
    image: '🔑',
    rarity: 'rare',
    duration: '1 uso'
  },
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    description: 'Aumenta chance de drop de itens raros em 25%',
    category: 'utility',
    price_gold: 600,
    image: '🍀',
    rarity: 'epic',
    duration: '1 partida'
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Diminui velocidade dos inimigos por 30 segundos',
    category: 'utility',
    price_gold: 700,
    image: '⏰',
    rarity: 'epic',
    duration: '1 uso'
  },

  // ============================================================================
  // COSMÉTICOS
  // ============================================================================
  {
    id: 'ship_golden',
    name: 'Nave Dourada',
    description: 'Nave com acabamento dourado luxuoso',
    category: 'cosmetic',
    price_gold: 500,
    image: '🚀',
    rarity: 'epic',
    permanent: true
  },

  // ============================================================================
  // TEMAS
  // ============================================================================
  {
    id: 'theme_neon',
    name: 'Tema Neon',
    description: 'Interface com cores vibrantes e efeitos neon',
    category: 'theme',
    price_gold: 450,
    image: '🌈',
    rarity: 'uncommon',
    permanent: true,
    disabled: true,
    comingSoon: true
  },
  {
    id: 'theme_retro',
    name: 'Tema Retrô',
    description: 'Visual clássico dos anos 80',
    category: 'theme',
    price_gold: 750,
    image: '📺',
    rarity: 'rare',
    permanent: true,
    disabled: true,
    comingSoon: true
  },

  // ============================================================================
  // PACOTES DE MOEDAS (Compra com dinheiro real)
  // ============================================================================
  {
    id: 'coin_pack_199',
    name: 'Pacote de 199 Moedas',
    description: 'Compre 199 moedas por R$ 4,99',
    category: 'coin_pack',
    price_real: 4.99,
    coin_amount: 199,
    image: '💰',
    rarity: 'common'
  },
  {
    id: 'coin_pack_499',
    name: 'Pacote de 499 Moedas',
    description: 'Compre 499 moedas por R$ 9,99',
    category: 'coin_pack',
    price_real: 9.99,
    coin_amount: 499,
    image: '💰',
    rarity: 'uncommon'
  },
  {
    id: 'coin_pack_999',
    name: 'Pacote de 999 Moedas',
    description: 'Compre 999 moedas por R$ 14,99',
    category: 'coin_pack',
    price_real: 14.99,
    coin_amount: 999,
    image: '💰',
    rarity: 'rare'
  }
]

// Helper para obter item por ID
export function getItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}

// Helper para filtrar por categoria
export function getItemsByCategory(category: ShopItem['category']): ShopItem[] {
  return SHOP_ITEMS.filter(item => item.category === category)
}

// Helper para filtrar por raridade
export function getItemsByRarity(rarity: ShopItem['rarity']): ShopItem[] {
  return SHOP_ITEMS.filter(item => item.rarity === rarity)
}

// Helper para obter ícone da categoria
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    skin: '🚀',
    powerup: '⚡',
    boost: '📈',
    special: '✨',
    utility: '🛠️',
    cosmetic: '✨',
    theme: '🎨',
    coin_pack: '💰'
  }
  return icons[category] || '🛍️'
}

// Helper para obter cor da raridade
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#808080',
    uncommon: '#1eff00',
    rare: '#0080ff',
    epic: '#8000ff',
    legendary: '#ffd700'
  }
  return colors[rarity] || '#ffffff'
}

// Helper para obter nome traduzido da raridade
export function getRarityName(rarity: string): string {
  const names: Record<string, string> = {
    common: 'Comum',
    uncommon: 'Incomum',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário'
  }
  return names[rarity] || rarity
}
