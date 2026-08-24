# Space Invaders - Migração Go + Vue.js - Especificação de Design

**Data:** 2026-08-24
**Versão:** 1.0
**Status:** Aprovado para Implementação

---

## 1. Visão Geral

### 1.1 Objetivo

Migrar o jogo Space Invaders da stack atual (Supabase + Vanilla JS) para uma arquitetura moderna escalável usando:
- **Backend:** Golang com go-scaffold boilerplate (Clean Architecture)
- **Frontend:** Vue.js 3 + TypeScript
- **Economia:** Sistema dual Gold (off-chain) + SPACE token (Solana)
- **Infraestrutura:** Monorepo com deploy híbrido (Vercel + Railway)

### 1.2 Motivação

Conforme análise em `docs/rebase.md`:
- Implementar economia sustentável controlada por Treasury
- Adicionar Battle Pass, NFTs, Guilds e Torneios
- Melhorar escalabilidade e manutenibilidade do código
- Preparar para crescimento Web3

### 1.3 Escopo

**Incluído no MVP:**
- ✅ Migração completa de 20/27 tabelas do Supabase
- ✅ Sistema dual Gold/SPACE com conversão Treasury-controlled
- ✅ Battle Pass com seasons e tiers
- ✅ NFT skins (mint via Solana)
- ✅ Sistema de Guilds com SPACE locking
- ✅ Torneios ranked e casuais
- ✅ PvP 1v1 (já implementado, apenas portar)
- ✅ Sistema de Achievements migrado
- ✅ Anti-bot básico (rate limiting + Cloudflare Turnstile)

**Excluído do MVP:**
- ❌ Marketplace NFT (fase futura)
- ❌ Staking SPACE (fase futura)
- ❌ Governança DAO (fase futura)
- ❌ Mobile apps nativos (PWA apenas)

---

## 2. Stack Tecnológico

### 2.1 Backend

```yaml
Linguagem: Go 1.21+
Framework: Gin (HTTP server)
ORM: GORM
Database: PostgreSQL 16
Cache: Redis 7
Message Queue: RabbitMQ 3.12
Boilerplate: go-scaffold (Clean Architecture)
Blockchain: go-solana SDK
Debug: Delve (remote debugging)
```

### 2.2 Frontend

```yaml
Framework: Vue 3 (Composition API)
Linguagem: TypeScript
Build: Vite
State: Pinia
Router: Vue Router
HTTP: Axios
CSS: TailwindCSS
Wallet: @solana/web3.js
```

### 2.3 Infraestrutura

```yaml
Desenvolvimento: Docker Compose
Backend Deploy: Railway (ou VPS)
Frontend Deploy: Vercel (CDN grátis)
CI/CD: GitHub Actions
Monitoring: (futuro: Prometheus + Grafana)
```

### 2.4 Serviços Externos

```yaml
Payments: AbacatePay (PIX)
Blockchain: Solana (mainnet-beta / devnet)
Storage: IPFS/Pinata (metadados NFT)
Legacy DB: Supabase (somente leitura durante migração)
```

---

## 3. Arquitetura do Monorepo

### 3.1 Estrutura de Diretórios

```
space-invaders/
├── backend/
│   ├── cmd/
│   │   ├── http/
│   │   │   ├── main.go
│   │   │   └── components/
│   │   │       └── setup.go
│   │   └── worker/
│   │       └── main.go (processamento async)
│   │
│   ├── internal/
│   │   ├── domain/
│   │   │   ├── entity/          # Modelos de dados
│   │   │   │   ├── player.go
│   │   │   │   ├── player_item.go
│   │   │   │   ├── nft.go
│   │   │   │   ├── guild.go
│   │   │   │   ├── battle_pass.go
│   │   │   │   ├── tournament.go
│   │   │   │   ├── treasury.go
│   │   │   │   ├── achievement.go
│   │   │   │   ├── conversion.go
│   │   │   │   ├── pvp_match.go
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── repository/      # Interfaces
│   │   │   │   ├── player_repository.go
│   │   │   │   ├── guild_repository.go
│   │   │   │   ├── treasury_repository.go
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── service/          # Lógica de negócio
│   │   │       ├── player_service.go
│   │   │       ├── game_service.go
│   │   │       ├── treasury_service.go
│   │   │       ├── shop_service.go
│   │   │       ├── nft_service.go
│   │   │       ├── guild_service.go
│   │   │       ├── battle_pass_service.go
│   │   │       ├── tournament_service.go
│   │   │       ├── pvp_service.go
│   │   │       ├── rate_limit_service.go
│   │   │       └── ...
│   │   │
│   │   ├── infra/
│   │   │   ├── database/        # Implementações repository
│   │   │   │   ├── player_repository_impl.go
│   │   │   │   ├── guild_repository_impl.go
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── anticorruption/  # Adapters externos
│   │   │       ├── abacatepay/
│   │   │       │   ├── adapter.go
│   │   │       │   └── client.go
│   │   │       ├── solana/
│   │   │       │   ├── adapter.go
│   │   │       │   ├── mint_nft.go
│   │   │       │   ├── transfer_space.go
│   │   │       │   └── treasury_wallet.go
│   │   │       └── ipfs/
│   │   │           ├── adapter.go
│   │   │           └── upload_metadata.go
│   │   │
│   │   ├── events/
│   │   │   ├── event/           # Definições
│   │   │   │   ├── player_events.go
│   │   │   │   ├── game_events.go
│   │   │   │   ├── treasury_events.go
│   │   │   │   ├── guild_events.go
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── handler/         # Event listeners
│   │   │       ├── game_event_handler.go
│   │   │       ├── treasury_event_handler.go
│   │   │       └── ...
│   │   │
│   │   ├── api/
│   │   │   └── http/
│   │   │       ├── controller/
│   │   │       │   ├── player_controller.go
│   │   │       │   ├── game_controller.go
│   │   │       │   ├── shop_controller.go
│   │   │       │   ├── treasury_controller.go
│   │   │       │   ├── guild_controller.go
│   │   │       │   ├── battle_pass_controller.go
│   │   │       │   ├── pvp_controller.go
│   │   │       │   └── ...
│   │   │       │
│   │   │       ├── middleware/
│   │   │       │   ├── auth.go
│   │   │       │   ├── rate_limit.go
│   │   │       │   └── cors.go
│   │   │       │
│   │   │       └── server.go
│   │   │
│   │   └── app/
│   │       └── dig/
│   │           └── ioc_container.go  # Dependency injection
│   │
│   ├── scripts/
│   │   ├── migrate-from-supabase/
│   │   │   ├── main.go          # ETL script
│   │   │   ├── extract.go
│   │   │   ├── transform.go
│   │   │   ├── load.go
│   │   │   ├── validate.go
│   │   │   └── compensation.go  # Bônus migração
│   │   │
│   │   └── seeds/
│   │       └── achievements.go
│   │
│   ├── configs/
│   │   └── config.go
│   │
│   ├── Dockerfile
│   ├── .env.example
│   ├── Makefile
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── GameCanvas.vue
│   │   │   │   ├── GameUI.vue
│   │   │   │   └── GameOver.vue
│   │   │   │
│   │   │   ├── shop/
│   │   │   │   ├── ShopGrid.vue
│   │   │   │   ├── ShopItem.vue
│   │   │   │   ├── CheckoutModal.vue
│   │   │   │   └── PixPayment.vue
│   │   │   │
│   │   │   ├── treasury/
│   │   │   │   ├── ConversionPanel.vue
│   │   │   │   ├── BalanceDisplay.vue
│   │   │   │   └── TransactionHistory.vue
│   │   │   │
│   │   │   ├── guild/
│   │   │   │   ├── GuildList.vue
│   │   │   │   ├── GuildDetail.vue
│   │   │   │   ├── CreateGuildModal.vue
│   │   │   │   └── GuildMembers.vue
│   │   │   │
│   │   │   ├── battlepass/
│   │   │   │   ├── BattlePassTrack.vue
│   │   │   │   ├── TierReward.vue
│   │   │   │   └── PremiumUpgrade.vue
│   │   │   │
│   │   │   ├── tournament/
│   │   │   │   ├── TournamentList.vue
│   │   │   │   ├── Leaderboard.vue
│   │   │   │   └── TournamentBracket.vue
│   │   │   │
│   │   │   └── wallet/
│   │   │       ├── ConnectWallet.vue
│   │   │       └── WalletBalance.vue
│   │   │
│   │   ├── stores/
│   │   │   ├── player.ts          # Estado do jogador
│   │   │   ├── game.ts            # Estado do jogo
│   │   │   ├── treasury.ts        # Economia
│   │   │   ├── guild.ts           # Guildas
│   │   │   ├── battlepass.ts      # Battle Pass
│   │   │   ├── tournament.ts      # Torneios
│   │   │   └── wallet.ts          # Wallet Solana
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts             # Axios base
│   │   │   ├── wallet.ts          # Solana wallet
│   │   │   ├── game-api.ts        # Backend calls
│   │   │   └── websocket.ts       # Real-time updates
│   │   │
│   │   ├── views/
│   │   │   ├── Home.vue
│   │   │   ├── Game.vue
│   │   │   ├── Shop.vue
│   │   │   ├── Profile.vue
│   │   │   ├── Guild.vue
│   │   │   ├── BattlePass.vue
│   │   │   ├── Tournament.vue
│   │   │   └── PvP.vue
│   │   │
│   │   ├── router/
│   │   │   └── index.ts
│   │   │
│   │   ├── App.vue
│   │   └── main.ts
│   │
│   ├── public/
│   │   └── assets/
│   │
│   ├── Dockerfile
│   ├── .env.example
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── vercel.json
│
├── contracts/                     # Solana smart contracts (futuro)
│   └── README.md
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
└── docs/
    ├── rebase.md                  # Análise econômica
    ├── migration-plan.md          # Este documento
    └── superpowers/
        ├── specs/
        └── plans/
```

---

## 4. Migração de Dados Supabase → PostgreSQL

### 4.1 Tabelas Identificadas (27 total)

#### Grupo 1: Core Player Data (6 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `players` | ~1000 | ✅ Migrar 100% + Transform | 🔴 Crítico |
| `player_items` | ~5000 | ✅ Migrar 100% | 🔴 Crítico |
| `player_active_effects` | ~200 | ✅ Migrar 100% | 🟡 Alto |
| `player_wallets` | ~300 | 🔀 Merge em players | 🟡 Alto |
| `player_achievements` | ~8000 | ✅ Migrar 100% | 🔴 Crítico |
| `player_backups` | ~500 | ❌ Descartar | ⚪ Baixo |

#### Grupo 2: Game Systems (4 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `achievements` | ~50 | ✅ Migrar 100% | 🔴 Crítico |
| `security_logs` | ~10000 | ✅ Migrar últimos 30d | 🟢 Médio |
| `reward_history` | ~15000 | ✅ Migrar 100% | 🟡 Alto |
| `notifications` | ~5000 | ✅ Migrar últimos 7d | 🟢 Médio |

#### Grupo 3: Analytics & Monitoring (3 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `analytics_events` | ~100000 | ❌ Descartar | ⚪ Baixo |
| `game_sessions` | ~50000 | ❌ Descartar | ⚪ Baixo |
| `daily_metrics` | ~180 | ✅ Migrar últimos 90d | 🟢 Médio |

#### Grupo 4: Admin & Config (3 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `system_config` | ~20 | ✅ Migrar 100% | 🔴 Crítico |
| `player_feedback` | ~100 | ✅ Migrar últimos 6m | 🟢 Médio |
| `special_events` | ~5 | ✅ Migrar futuros+30d | 🟡 Alto |

#### Grupo 5: Blockchain (6 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `player_wallets` | ~300 | 🔀 Ver Grupo 1 | - |
| `token_transactions` | ~500 | ✅ Migrar 100% | 🔴 Crítico |
| `nft_metadata` | ~200 | ✅ Migrar 100% | 🔴 Crítico |
| `marketplace_listings` | ~50 | ❌ Descartar (fora MVP) | ⚪ Baixo |
| `marketplace_sales` | ~30 | ❌ Descartar (fora MVP) | ⚪ Baixo |
| `rate_limits` | ~5000 | 🔀 Migrar para Redis | 🟡 Alto |

#### Grupo 6: PvP (5 tabelas)

| Tabela | Registros Est. | Ação | Prioridade |
|--------|---------------|------|------------|
| `pvp_matches` | ~2000 | ✅ Migrar 100% | 🔴 Crítico |
| `pvp_queue` | ~10 | 🔀 Migrar para Redis | 🟡 Alto |
| `pvp_rankings` | ~500 | ✅ Migrar 100% | 🔴 Crítico |
| `pvp_match_history` | ~4000 | ✅ Migrar 100% | 🔴 Crítico |
| `pvp_challenges` | ~100 | ✅ Migrar 100% | 🟡 Alto |
| `pvp_signaling` | ~5 | 🔀 Migrar para Redis | 🟡 Alto |

### 4.2 Transformações Principais

#### 4.2.1 Tabela `players`

**Schema Supabase:**
```sql
id: BIGINT PRIMARY KEY
username: TEXT UNIQUE
pin: TEXT (bcrypt hash)
email: TEXT UNIQUE
high_score: BIGINT
coins: INTEGER
level_id: INTEGER
total_games: INTEGER
last_played: TIMESTAMPTZ
email_verified: BOOLEAN
notifications_offers: BOOLEAN
notifications_achievements: BOOLEAN
notifications_shop: BOOLEAN
created_at: TIMESTAMPTZ
```

**Schema Go (entity.Player):**
```go
type Player struct {
    gorm.Model              // id (uint), created_at, updated_at, deleted_at
    Username     string     `gorm:"uniqueIndex;not null"`
    Email        string     `gorm:"uniqueIndex"`
    EmailVerified bool      `gorm:"default:false"`
    PasswordHash string     `gorm:"not null"`
    WalletAddress *string   `gorm:"uniqueIndex"`

    // Stats
    HighScore    uint64    `gorm:"default:0"`
    TotalGames   uint      `gorm:"default:0"`
    LastPlayed   *time.Time

    // Economy
    GoldBalance  uint64    `gorm:"default:0"`  // coins → gold_balance
    SpaceBalance uint64    `gorm:"default:0"`  // novo

    // Progression
    LeagueID     uint      `gorm:"default:1"`  // level_id → league_id
    RankPoints   uint      `gorm:"default:0"`  // novo

    // Notifications
    NotifyOffers       bool `gorm:"default:true"`
    NotifyAchievements bool `gorm:"default:true"`
    NotifyShop         bool `gorm:"default:false"`

    // Relations
    GuildID *uint
    Guild   *Guild
}
```

**Transformações:**
- `id` mantém valor BIGINT original (GORM uint = uint64 em 64bit)
- `pin` → `password_hash` (manter bcrypt)
- `coins` → `gold_balance` (renomear conceito)
- `level_id` → `league_id` (novo sistema de ligas)
- Adicionar `wallet_address` (merge de `player_wallets` onde `is_primary=true`)
- Adicionar `space_balance` (iniciar zerado)
- Adicionar `rank_points` (iniciar zerado)
- Adicionar `guild_id` (NULL por padrão)

#### 4.2.2 Tabela `player_items`

**Transformações:**
- UUID `id` → uint autoincrement (registrar mapping em `migration_uuid_map`)
- `player_id` mantém referência numérica
- Preservar todos campos NFT (`nft_mint_address`, `is_on_chain`, etc)

#### 4.2.3 Tabela `token_transactions`

**Schema Supabase:**
```sql
type: TEXT CHECK ('WITHDRAW', 'DEPOSIT')
```

**Schema Go (entity.GoldSpaceConversion):**
```go
Type ConversionType // GOLD_TO_SPACE, SPACE_TO_GOLD
GoldAmount uint64
SpaceAmount uint64
ExchangeRate uint  // 100 (Gold per SPACE)
```

**Transformações:**
- Renomear `WITHDRAW` → `GOLD_TO_SPACE`
- Renomear `DEPOSIT` → `SPACE_TO_GOLD`
- Calcular `gold_amount` e `space_amount` a partir de `amount` + taxa 100:1
- Adicionar `exchange_rate` = 100

### 4.3 Script ETL (Extract-Transform-Load)

**Localização:** `backend/scripts/migrate-from-supabase/main.go`

**Fluxo:**

```go
func main() {
    // 1. EXTRACT
    data := extractAllData(supabaseClient)

    // 2. TRANSFORM
    transformed := transformData(data)

    // 3. VALIDATE
    if err := validateData(transformed); err != nil {
        log.Fatal("Validation failed:", err)
    }

    // 4. DRY RUN (opcional)
    if *dryRun {
        printMigrationSummary(transformed)
        return
    }

    // 5. LOAD (transação atômica)
    if err := loadAllData(postgresClient, transformed); err != nil {
        log.Fatal("Migration failed:", err)
        // Rollback automático
    }

    // 6. COMPENSATION (bônus para jogadores ativos)
    applyCompensationBonuses(postgresClient)

    // 7. VALIDATE MIGRATION
    validateMigrationIntegrity(supabaseClient, postgresClient)

    log.Println("✅ Migration completed successfully")
}
```

**Grupos de migração (checkpoints):**
1. Core (players, player_items, player_achievements)
2. Game Systems (achievements, reward_history)
3. Blockchain (token_transactions, nft_metadata)
4. PvP (pvp_matches, pvp_rankings, pvp_match_history)
5. Config (system_config, special_events)

**Validações pós-migração:**
- Count matching entre Supabase e PostgreSQL
- Validação de foreign keys
- Checksum de dados críticos (balances, high_scores)
- Teste de queries comuns

---

## 5. Migração de Funções RPC → Services

### 5.1 Funções Identificadas (9 total)

| # | Função Supabase | Service Go | Método |
|---|-----------------|------------|--------|
| 1 | `atomic_purchase` | ShopService | `PurchaseItem()` |
| 2 | `check_rate_limit` | RateLimitService | `Check()` (Redis) |
| 3 | `withdraw_coins` | TreasuryService | `ConvertGoldToSpace()` |
| 4 | `deposit_coins` | TreasuryService | `ProcessSpaceDeposit()` |
| 5 | `restore_item_from_nft` | NFTService | `BurnAndRestoreItem()` |
| 6 | `cleanup_rate_limits` | - | (Redis TTL automático) |
| 7 | `cleanup_old_match_history` | PvPService | `RecordMatchHistory()` |
| 8 | `finalize_pvp_match` | PvPService | `FinalizeMatch()` |
| 9 | `validate_user_balance` | PlayerService | `HasSufficientGold()` |

### 5.2 Exemplo: atomic_purchase → ShopService.PurchaseItem

**Lógica original (SQL):**
```sql
CREATE OR REPLACE FUNCTION atomic_purchase(
  p_user_id UUID,
  p_item_id INT,
  p_item_price INT,
  p_item_type TEXT
) RETURNS JSON AS $$
BEGIN
  -- Lock player row
  SELECT coins INTO user_coins FROM players WHERE id = p_user_id FOR UPDATE;

  -- Validate balance
  IF user_coins < p_item_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- Deduct coins
  UPDATE players SET coins = coins - p_item_price WHERE id = p_user_id;

  -- Add item
  INSERT INTO player_items (player_id, item_id, item_type) VALUES (...);

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

**Migração Go:**
```go
// internal/domain/service/shop_service.go

type ShopService struct {
    db              *gorm.DB
    playerRepo      repository.PlayerRepository
    itemRepo        repository.PlayerItemRepository
    bus             eventbus.Publisher
    logger          log.LoggerI
}

func (s *ShopService) PurchaseItem(
    ctx context.Context,
    playerID uint,
    itemID string,
    price uint64,
) (*entity.PlayerItem, error) {
    var item *entity.PlayerItem

    err := s.db.Transaction(func(tx *gorm.DB) error {
        // 1. Lock player row
        var player entity.Player
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&player, playerID).Error; err != nil {
            return errors.Wrap(err, "player not found")
        }

        // 2. Validate balance
        if player.GoldBalance < price {
            return ErrInsufficientBalance
        }

        // 3. Deduct gold
        if err := tx.Model(&player).
            Update("gold_balance", gorm.Expr("gold_balance - ?", price)).
            Error; err != nil {
            return errors.Wrap(err, "deduct gold")
        }

        // 4. Add item
        item = &entity.PlayerItem{
            PlayerID: playerID,
            ItemID:   itemID,
        }
        if err := tx.Create(item).Error; err != nil {
            return errors.Wrap(err, "create item")
        }

        return nil
    })

    if err != nil {
        return nil, err
    }

    // 5. Publish event (fora da transaction)
    s.bus.Publish(event.ItemPurchased, event.ItemPurchasedEvent{
        PlayerID: playerID,
        ItemID:   itemID,
        Price:    price,
    })

    s.logger.Info("item purchased", log.Any("player_id", playerID), log.Any("item_id", itemID))

    return item, nil
}
```

**Vantagens da migração:**
- ✅ Código testável (mock repositories)
- ✅ Type-safe (Go vs dynamic SQL)
- ✅ Versionável (Git vs migrations SQL)
- ✅ Debugável (Delve breakpoints)
- ✅ Event-driven (publish após sucesso)

### 5.3 Filosofia

**❌ Nenhuma lógica no banco:**
- No stored procedures
- No triggers (substituir por event handlers)
- No complex queries (mover para repository layer)

**✅ Toda lógica nos Services:**
- Single Responsibility
- Testável com mocks
- Event-driven para side-effects

---

## 6. Sistema de Economia Dual

### 6.1 Gold (Off-Chain)

**Moeda:** Gold (inteiro, off-chain)
**Uso:** Compras no shop, entry fees torneios, apostas PvP
**Aquisição:**
- Gameplay (score ÷ 2000 = gold, max 10 por partida)
- Compra com PIX via AbacatePay
- Recompensas de achievements
- Recompensas de Battle Pass

**Armazenamento:**
```go
type Player struct {
    GoldBalance uint64 `gorm:"default:0"`
}
```

### 6.2 SPACE (On-Chain Token)

**Moeda:** SPACE (Solana SPL Token)
**Uso:**
- Criar guildas (100 SPACE locked)
- Participar de torneios premium
- Comprar NFTs (futuro marketplace)
- Governança (futuro)

**Aquisição:**
- Conversão Gold → SPACE (100:1, limitado por Treasury)
- Recompensas de torneios ranked
- Rewards de guilds top 10

**Armazenamento:**
```go
type Player struct {
    SpaceBalance uint64 `gorm:"default:0"` // Cache on-chain
    WalletAddress *string `gorm:"uniqueIndex"`
}
```

### 6.3 Treasury System (Controle de Emissão)

**Objetivo:** Garantir sustentabilidade econômica limitando emissão de SPACE à receita real.

**Fórmula (conforme docs/rebase.md):**
```
SPACE_emitido_dia = min(
    total_rewards_gameplay_dia,
    (receita_PIX_24h × 0.30) / preço_SPACE
)
```

**Implementação:**

```go
// internal/domain/entity/treasury.go

type DailyEmission struct {
    gorm.Model
    Date              time.Time `gorm:"uniqueIndex"`

    // Inputs
    PixRevenue24h     uint64    // Receita PIX (centavos)
    SpacePrice        uint64    // Preço SPACE em centavos
    GameplayRewards   uint64    // Total SPACE de rewards gameplay

    // Outputs (calculado)
    EmissionLimit     uint64    // (PixRevenue × 0.30) / SpacePrice
    EmissionUsed      uint64    // Total já emitido hoje
    EmissionAvailable uint64    // Limit - Used
}

// internal/domain/service/treasury_service.go

func (s *TreasuryService) ConvertGoldToSpace(
    ctx context.Context,
    playerID uint,
    goldAmount uint64,
) (*entity.GoldSpaceConversion, error) {
    spaceAmount := goldAmount / 100 // Taxa 100:1

    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. Lock player
        var player entity.Player
        tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&player, playerID)

        // 2. Validate gold balance
        if player.GoldBalance < goldAmount {
            return ErrInsufficientBalance
        }

        // 3. Check Treasury daily limit
        today := time.Now().UTC().Truncate(24 * time.Hour)
        var emission entity.DailyEmission
        tx.FirstOrCreate(&emission, entity.DailyEmission{Date: today})

        if emission.EmissionAvailable < spaceAmount {
            return ErrDailyEmissionExceeded
        }

        // 4. Debit Gold
        tx.Model(&player).Update("gold_balance", gorm.Expr("gold_balance - ?", goldAmount))

        // 5. Create pending conversion
        conversion := &entity.GoldSpaceConversion{
            PlayerID:     playerID,
            Type:         ConversionTypeGoldToSpace,
            GoldAmount:   goldAmount,
            SpaceAmount:  spaceAmount,
            ExchangeRate: 100,
            Status:       ConversionStatusPending,
        }
        tx.Create(conversion)

        // 6. Update daily emission used
        tx.Model(&emission).Update("emission_used", gorm.Expr("emission_used + ?", spaceAmount))

        // 7. Publish event (blockchain adapter escuta)
        s.bus.Publish(event.ConversionRequested, event.ConversionRequestedEvent{
            ConversionID: conversion.ID,
            PlayerID:     playerID,
            SpaceAmount:  spaceAmount,
            WalletAddress: *player.WalletAddress,
        })

        return nil
    })
}
```

**Adapter Solana (escuta eventos):**

```go
// internal/infra/anticorruption/solana/adapter.go

func (a *SolanaAdapter) StartConversionListener(ctx context.Context) {
    a.bus.Subscribe(event.ConversionRequested, func(e event.ConversionRequestedEvent) {
        // 1. Mint SPACE tokens via Solana
        txSignature, err := a.mintSPACE(e.WalletAddress, e.SpaceAmount)
        if err != nil {
            // Mark conversion as FAILED
            a.conversionRepo.UpdateStatus(ctx, e.ConversionID, ConversionStatusFailed)
            return
        }

        // 2. Wait for confirmation
        confirmed := a.waitForConfirmation(txSignature)
        if !confirmed {
            // Retry logic ou mark failed
            return
        }

        // 3. Update conversion
        a.conversionRepo.Update(ctx, e.ConversionID, map[string]interface{}{
            "status":       ConversionStatusCompleted,
            "tx_signature": txSignature,
            "completed_at": time.Now(),
        })

        // 4. Update player space_balance cache
        a.playerRepo.IncrementSpaceBalance(ctx, e.PlayerID, e.SpaceAmount)

        // 5. Notify frontend via WebSocket
        a.wsHub.NotifyPlayer(e.PlayerID, "conversion_completed", ...)
    })
}
```

**Cálculo diário do limite:**

```go
// Executado via cron job (0 0 * * *)
func (s *TreasuryService) CalculateDailyEmission(ctx context.Context, date time.Time) error {
    // 1. Buscar receita PIX últimas 24h
    pixRevenue := s.calculatePixRevenue24h(ctx, date)

    // 2. Buscar preço SPACE (fixo ou oracle)
    spacePrice := uint64(100) // R$ 1,00 = 100 centavos (ajustar conforme mercado)

    // 3. Calcular limite
    emissionLimit := (pixRevenue * 30 / 100) / spacePrice

    // 4. Buscar total gameplay rewards esperados
    gameplayRewards := s.estimateGameplayRewards(ctx, date)

    // 5. Aplicar min()
    finalLimit := min(emissionLimit, gameplayRewards)

    // 6. Salvar
    emission := entity.DailyEmission{
        Date:              date,
        PixRevenue24h:     pixRevenue,
        SpacePrice:        spacePrice,
        GameplayRewards:   gameplayRewards,
        EmissionLimit:     finalLimit,
        EmissionUsed:      0,
        EmissionAvailable: finalLimit,
    }

    return s.emissionRepo.Create(ctx, &emission)
}
```

---

## 7. Sistemas de Progressão

### 7.1 Battle Pass

**Estrutura:**

```go
// internal/domain/entity/battle_pass.go

type Season struct {
    gorm.Model
    Name       string
    StartDate  time.Time
    EndDate    time.Time
    IsActive   bool
    TotalTiers uint `gorm:"default:50"`
}

type PlayerSeasonProgress struct {
    gorm.Model
    PlayerID   uint `gorm:"uniqueIndex:idx_player_season"`
    SeasonID   uint `gorm:"uniqueIndex:idx_player_season"`
    Player     *Player
    Season     *Season

    CurrentTier uint   `gorm:"default:1"`
    CurrentXP   uint   `gorm:"default:0"`
    IsPremium   bool   `gorm:"default:false"`

    UnlockedAt time.Time
}

type SeasonTier struct {
    gorm.Model
    SeasonID      uint
    Season        *Season
    TierNumber    uint
    RequiredXP    uint

    // Recompensas
    FreeReward    datatypes.JSON // {type: "gold", amount: 100}
    PremiumReward datatypes.JSON // {type: "nft_skin", id: "skin_epic_1"}
}
```

**Progressão XP:**

```go
// internal/domain/service/battle_pass_service.go

func (s *BattlePassService) AddXP(ctx context.Context, playerID uint, xp uint) error {
    // 1. Buscar season ativa
    season, err := s.seasonRepo.FindActive(ctx)

    // 2. Buscar progresso do player
    progress, _ := s.progressRepo.FindByPlayerSeason(ctx, playerID, season.ID)

    // 3. Adicionar XP
    progress.CurrentXP += xp

    // 4. Verificar tier up
    for {
        nextTier, _ := s.tierRepo.FindBySeasonAndTier(ctx, season.ID, progress.CurrentTier+1)
        if progress.CurrentXP < nextTier.RequiredXP {
            break
        }

        progress.CurrentTier++

        // 5. Distribuir recompensas
        s.grantTierRewards(ctx, playerID, nextTier, progress.IsPremium)
    }

    return s.progressRepo.Update(ctx, progress)
}
```

**XP Sources:**
- Partida completa: 10 XP
- Vitória (score > 10k): +5 XP
- Daily login: 5 XP
- Torneio participation: 20 XP
- Guild contribution: 15 XP

### 7.2 Leagues (Ranking System)

**Estrutura:**

```go
type League struct {
    ID        uint   `gorm:"primaryKey"`
    Name      string // Bronze, Silver, Gold, Platinum, Diamond, Master
    MinPoints uint
    MaxPoints uint
    Icon      string
    Color     string
}

// Atualizado em Player
type Player struct {
    LeagueID   uint
    RankPoints uint
    League     *League
}
```

**Ligas:**
1. Bronze (0-999 pts)
2. Silver (1000-2499 pts)
3. Gold (2500-4999 pts)
4. Platinum (5000-9999 pts)
5. Diamond (10000-19999 pts)
6. Master (20000+ pts)

**Ganho de pontos:**
- High score beat: +10 pts
- Torneio win: +50 pts
- PvP win: +(15 + ELO differential)
- Guild bonus: +5 pts/dia (se guild top 10)

**Perda de pontos:**
- Inatividade 7 dias: -2% pts/dia
- PvP loss: -(10 + ELO differential)

### 7.3 Achievements

**Migração completa da tabela Supabase:**

```go
type Achievement struct {
    ID          string `gorm:"primaryKey"` // "first_kill", "score_100k"
    Name        string
    Description string
    Icon        string
    Rarity      AchievementRarity // COMMON, RARE, EPIC, LEGENDARY
    RewardGold  uint `gorm:"default:0"`

    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type PlayerAchievement struct {
    gorm.Model
    PlayerID      uint   `gorm:"uniqueIndex:idx_player_achievement"`
    AchievementID string `gorm:"uniqueIndex:idx_player_achievement"`
    Player        *Player
    Achievement   *Achievement

    UnlockedAt time.Time
    Notified   bool `gorm:"default:false"`
}
```

**Seed de achievements (preservar IDs):**
- `first_kill`: First Kill (10 gold)
- `score_10k`: Score Master (50 gold)
- `score_100k`: Score Legend (200 gold)
- `games_100`: Century Player (100 gold)
- `nft_mint_first`: NFT Collector (0 gold)
- `guild_founder`: Guild Master (500 gold)
- `tournament_win`: Champion (1000 gold)

---

## 8. Sistemas Sociais

### 8.1 Guilds

**Estrutura:**

```go
type Guild struct {
    gorm.Model
    Name        string `gorm:"uniqueIndex;not null"`
    Tag         string `gorm:"uniqueIndex;size:4"` // [TAG]
    OwnerID     uint
    Owner       *Player

    Description string
    Icon        string

    // Economy
    SpaceLocked uint64 `gorm:"default:0"` // Total SPACE locked
    TreasuryGold uint64 `gorm:"default:0"` // Guild bank

    // Stats
    TotalMembers uint `gorm:"default:1"`
    TotalScore   uint64 `gorm:"default:0"`
    Ranking      uint `gorm:"default:0"`

    // Settings
    MaxMembers uint `gorm:"default:50"`
    JoinType   GuildJoinType // OPEN, REQUEST, INVITE_ONLY
}

type GuildMember struct {
    gorm.Model
    GuildID  uint `gorm:"uniqueIndex:idx_guild_member"`
    PlayerID uint `gorm:"uniqueIndex:idx_guild_member"`
    Guild    *Guild
    Player   *Player

    Role         GuildRole // OWNER, OFFICER, MEMBER
    JoinedAt     time.Time
    Contribution uint64 `gorm:"default:0"` // Score contributed

    // Locking
    SpaceLocked  uint64 `gorm:"default:0"`
    LockedAt     *time.Time
}
```

**Criação de Guild:**

```go
func (s *GuildService) CreateGuild(
    ctx context.Context,
    ownerID uint,
    name string,
    tag string,
) (*entity.Guild, error) {
    const requiredSpace = uint64(100)

    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. Validate player has enough SPACE
        var player entity.Player
        tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&player, ownerID)

        if player.SpaceBalance < requiredSpace {
            return ErrInsufficientSpace
        }

        // 2. Lock SPACE
        tx.Model(&player).Updates(map[string]interface{}{
            "space_balance": gorm.Expr("space_balance - ?", requiredSpace),
            "guild_id":      nil, // Will be set after guild creation
        })

        // 3. Create guild
        guild := &entity.Guild{
            Name:        name,
            Tag:         tag,
            OwnerID:     ownerID,
            SpaceLocked: requiredSpace,
        }
        tx.Create(guild)

        // 4. Add owner as member
        member := &entity.GuildMember{
            GuildID:     guild.ID,
            PlayerID:    ownerID,
            Role:        GuildRoleOwner,
            SpaceLocked: requiredSpace,
            LockedAt:    timePtr(time.Now()),
        }
        tx.Create(member)

        // 5. Update player guild_id
        tx.Model(&player).Update("guild_id", guild.ID)

        // 6. Publish event
        s.bus.Publish(event.GuildCreated, ...)

        return nil
    })
}
```

**Dissolve Guild (unlock SPACE):**

```go
func (s *GuildService) DissolveGuild(ctx context.Context, guildID uint, ownerID uint) error {
    // 1. Validate ownership
    // 2. Return locked SPACE to all members
    // 3. Delete guild
    // 4. Publish event
}
```

### 8.2 PvP 1v1 (já implementado, apenas portar)

**Tabelas migradas:**
- `pvp_matches` ✅
- `pvp_rankings` ✅
- `pvp_match_history` ✅
- `pvp_challenges` ✅
- `pvp_queue` → Redis
- `pvp_signaling` → Redis

**RPC migrada:**
- `finalize_pvp_match` → `PvPService.FinalizeMatch()`

**Fluxo permanece igual:**
1. Player entra na queue (bet_amount: 10/50/100/500 gold)
2. Matchmaking por bet_amount
3. Escrow de coins
4. WebRTC P2P gameplay
5. Validação de resultados (ambos reportam)
6. Distribuição de rewards + ELO update

---

## 9. Integrações Externas

### 9.1 AbacatePay (Pagamentos PIX)

**Adapter:**

```go
// internal/infra/anticorruption/abacatepay/adapter.go

type AbacatePayAdapter struct {
    client     *http.Client
    apiKey     string
    baseURL    string
    shopService *service.ShopService
}

func (a *AbacatePayAdapter) CreatePixPayment(
    ctx context.Context,
    playerID uint,
    packageID string,
    amount uint64, // centavos
) (*PixPaymentResponse, error) {
    // 1. Create order in database
    order := &entity.Order{
        PlayerID:  playerID,
        PackageID: packageID,
        Amount:    amount,
        Status:    OrderStatusPending,
    }
    a.orderRepo.Create(ctx, order)

    // 2. Call AbacatePay API
    payload := map[string]interface{}{
        "amount": amount,
        "external_id": fmt.Sprintf("order_%d", order.ID),
        "callback_url": fmt.Sprintf("%s/api/webhooks/abacatepay", a.callbackBaseURL),
    }

    resp, err := a.client.Post(a.baseURL+"/pix/create", payload)
    // ...

    return &PixPaymentResponse{
        OrderID:    order.ID,
        PixCode:    resp.PixCode,
        QRCodeURL:  resp.QRCodeURL,
        ExpiresAt:  resp.ExpiresAt,
    }, nil
}

// Webhook handler
func (a *AbacatePayAdapter) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
    // 1. Validate signature
    if !a.validateSignature(payload, signature) {
        return ErrInvalidSignature
    }

    // 2. Parse payload
    var event AbacatePayEvent
    json.Unmarshal(payload, &event)

    if event.Status != "approved" {
        return nil // Ignore non-approved events
    }

    // 3. Find order
    orderID := parseOrderID(event.ExternalID) // "order_123" -> 123
    order, err := a.orderRepo.FindByID(ctx, orderID)

    // 4. Check idempotency
    if order.Status == OrderStatusCompleted {
        return nil // Already processed
    }

    // 5. Credit gold
    goldAmount := a.getGoldAmountForPackage(order.PackageID)

    err = a.shopService.CreditGoldFromPurchase(ctx, order.PlayerID, goldAmount, order.ID)

    // 6. Update order
    order.Status = OrderStatusCompleted
    order.CompletedAt = timePtr(time.Now())
    a.orderRepo.Update(ctx, order)

    // 7. Publish event
    a.bus.Publish(event.PurchaseCompleted, ...)

    return nil
}
```

### 9.2 Solana (Blockchain)

**Adapter:**

```go
// internal/infra/anticorruption/solana/adapter.go

type SolanaAdapter struct {
    rpcClient     *rpc.Client
    treasuryWallet solana.PrivateKey
    spaceMint     solana.PublicKey
    nftProgram    solana.PublicKey
}

// Mint SPACE tokens
func (a *SolanaAdapter) MintSPACE(
    walletAddress string,
    amount uint64,
) (string, error) {
    recipient := solana.MustPublicKeyFromBase58(walletAddress)

    // 1. Create transfer instruction
    instruction := token.NewTransferInstruction(
        amount,
        a.treasuryWallet.PublicKey(),
        recipient,
        a.spaceMint,
    ).Build()

    // 2. Build transaction
    tx, err := solana.NewTransaction(
        []solana.Instruction{instruction},
        a.getRecentBlockhash(),
    )

    // 3. Sign with treasury wallet
    tx.Sign(a.treasuryWallet)

    // 4. Send transaction
    signature, err := a.rpcClient.SendTransaction(tx)

    return signature.String(), err
}

// Mint NFT skin
func (a *SolanaAdapter) MintNFTSkin(
    playerWallet string,
    metadata *NFTMetadata,
) (string, error) {
    // 1. Upload metadata to IPFS
    metadataURI, err := a.ipfsAdapter.UploadJSON(metadata)

    // 2. Create mint account
    mintKeypair := solana.NewWallet()

    // 3. Call Metaplex Token Metadata program
    // (simplified - usar metaplex SDK)

    return mintKeypair.PublicKey().String(), nil
}
```

### 9.3 IPFS (NFT Metadata)

**Adapter:**

```go
// internal/infra/anticorruption/ipfs/adapter.go

type IPFSAdapter struct {
    pinataAPIKey    string
    pinataSecretKey string
}

func (a *IPFSAdapter) UploadJSON(metadata interface{}) (string, error) {
    // 1. Marshal JSON
    data, _ := json.Marshal(metadata)

    // 2. Upload to Pinata
    resp, err := a.uploadToPinata(data)

    // 3. Return IPFS URI
    return fmt.Sprintf("ipfs://%s", resp.IpfsHash), nil
}

func (a *IPFSAdapter) UploadImage(imageData []byte) (string, error) {
    // Similar flow
}
```

---

## 10. Deploy e DevOps

### 10.1 Docker Compose (Desenvolvimento Local)

**Localização:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "40000:40000"  # Delve debug
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/spaceinvaders
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    volumes:
      - ./backend:/app
    command: reflex -r '\.go$' -s -- sh -c 'go run cmd/http/main.go'

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: spaceinvaders
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: user
      RABBITMQ_DEFAULT_PASS: pass

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host

volumes:
  postgres_data:
```

### 10.2 Backend Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server cmd/http/main.go

# Runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 3000

CMD ["./server"]
```

### 10.3 Railway Deployment (Backend)

**Configuração:** `railway.toml`

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "./server"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10

[env]
PORT = "3000"
```

**Environment Variables (Railway Dashboard):**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...
ABACATEPAY_API_KEY=...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_TREASURY_PRIVATE_KEY=...
JWT_SECRET=...
```

### 10.4 Vercel Deployment (Frontend)

**Configuração:** `frontend/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://api.spaceinvaders.com"
  },
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 10.5 GitHub Actions CI/CD

**Backend:** `.github/workflows/backend-ci.yml`

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run tests
        working-directory: ./backend
        run: |
          go test -v -race -coverprofile=coverage.out ./...
          go tool cover -func=coverage.out

      - name: Lint
        uses: golangci/golangci-lint-action@v3
        with:
          working-directory: ./backend
          version: latest

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Frontend:** `.github/workflows/frontend-ci.yml`

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Lint
        working-directory: ./frontend
        run: npm run lint

      - name: Type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Build
        working-directory: ./frontend
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'
```

### 10.6 Makefile (Comandos Úteis)

```makefile
.PHONY: dev test build deploy migrate clean

dev:
	docker-compose up

test:
	cd backend && go test -v -race ./...

build:
	cd backend && go build -o bin/server cmd/http/main.go
	cd frontend && npm run build

deploy:
	railway up --service backend
	vercel --prod --cwd frontend

migrate:
	cd backend/scripts/migrate-from-supabase && go run main.go

migrate-dry-run:
	cd backend/scripts/migrate-from-supabase && go run main.go --dry-run

clean:
	docker-compose down -v
	rm -rf backend/bin
	rm -rf frontend/dist
```

---

## 11. Estimativas e Cronograma

### 11.1 Fases de Desenvolvimento

**Fase 0: Preparação e Migração (1 semana)**
- Setup monorepo + Docker
- Script ETL completo (27 tabelas)
- Validação migração em staging
- Rollback plan
- Comunicação com usuários

**Fase 1: Base (2 semanas)**
- Entidades + repositórios (todas as 27 tabelas)
- Auth + player management
- Sistema de recompensas (reward_history)
- Gameplay básico frontend (Vue.js)
- Game loop + scoring

**Fase 2: Economia (2 semanas)**
- Sistema Gold (off-chain)
- Treasury + conversão Gold↔SPACE
- Daily emission calculator (cron)
- Integração Solana básica (mint SPACE)
- Shop + AbacatePay integration
- Webhook handling

**Fase 3: Progressão (3 semanas)**
- Battle Pass completo (seasons, tiers, XP)
- NFT skins (mint via Solana + IPFS)
- Achievements migrados (seed + unlock logic)
- Leagues + ranking system
- Special events system
- Notifications system

**Fase 4: Social & PvP (2 semanas)**
- Sistema de Guilds (create, join, contribute)
- SPACE locking mechanism
- PvP 1v1 ported (já implementado no Supabase)
- PvP matchmaking (Redis queue)
- WebRTC signaling (Redis pub/sub)
- ELO ranking

**Fase 5: Admin & Analytics (1 semana)**
- System config dashboard
- Player feedback management
- Daily metrics tracking
- Security audit logs viewer
- Admin panel básico

**Fase 6: Polish & Deploy (1-2 semanas)**
- Anti-bot (rate limiting + Cloudflare Turnstile)
- Performance tuning (query optimization, caching)
- Testes E2E (Playwright)
- Load testing (k6)
- Deploy production (Railway + Vercel)
- Monitoring setup (Prometheus + Grafana - opcional)

**Total:** 12-14 semanas (3-3.5 meses)

### 11.2 Equipe Necessária

**1 desenvolvedor full-time:**
- 14 semanas (worst case)

**2 desenvolvedores full-time:**
- 8 semanas (paralelizar frontend/backend)

**Recomendação:** 1 dev full-stack + 1 dev part-time para code review

### 11.3 Milestones

| Semana | Milestone | Deliverable |
|--------|-----------|-------------|
| 1 | ✅ Migração completa | Dados no PostgreSQL validados |
| 3 | ✅ MVP Gameplay | Jogo jogável com Gold earning |
| 5 | ✅ Shop funcionando | Compras PIX + conversão SPACE |
| 8 | ✅ Battle Pass | Sistema de progressão completo |
| 10 | ✅ Guilds + PvP | Sistemas sociais funcionais |
| 12 | ✅ Beta testing | Deploy staging + QA |
| 14 | 🚀 Production | Launch público |

---

## 12. Riscos e Mitigações

### 12.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Perda de dados na migração** | Média | 🔴 Crítico | ETL com validação tripla + backup Supabase completo + rollback script + dry-run obrigatório + staging test completo |
| **Downtime prolongado** | Média | 🟡 Alto | Migração em staging primeiro + deploy blue-green + plano de comunicação 48h antes + janela manutenção domingo 2-6am |
| **Inconsistência UUID→uint** | Alta | 🟡 Alto | Tabela `migration_uuid_map` persistente + validação pós-migração + testes de integridade foreign keys |
| **Complexidade 27 tabelas** | Alta | 🟡 Alto | Migração incremental em 6 grupos + checkpoint após cada grupo + validação automatizada + possibilidade rollback parcial |
| **Limites Solana RPC** | Média | 🟢 Médio | Cache agressivo de balance + batch transactions quando possível + RPC pago (QuickNode) se necessário + retry logic |
| **Economia desbalanceada** | Média | 🟡 Alto | Monitoramento Treasury diário + alertas Slack se emission > 80% + ajuste dinâmico da fórmula + kill switch emergencial |
| **Bots farming** | Alta | 🟡 Alto | Rate limiting (Redis) + Cloudflare Turnstile + análise padrões (security_logs) + banimento automático IP + CAPTCHA progressivo |
| **Custos infraestrutura** | Baixa | 🟢 Médio | Railway free tier ($5) → upgrade gradual + monitoring custos ($20 budget alert) + CDN caching agressivo + otimização queries |
| **Bugs conversão Gold↔SPACE** | Média | 🔴 Crítico | Testes unitários 100% coverage + dry-run mode obrigatório + auditoria manual primeiras 100 conversões + reversão manual possível |
| **Player feedback não migrado** | Baixa | 🟢 Médio | Migrar últimos 6 meses (crítico) + exportação JSON completo para arquivo histórico + comunicar que feedback antigo estará em arquivo |
| **Special events quebrados** | Média | 🟡 Alto | Migrar apenas eventos futuros + recriar eventos ativos manualmente + teste específico pré-deploy + rollback de evento individual |
| **AbacatePay webhook failures** | Média | 🟢 Médio | Retry logic (3 tentativas) + dead letter queue + notificação manual via email se falha persistente + dashboard admin webhooks |

### 12.2 Riscos de Produto

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Players não gostam mudanças** | Alta | 🟡 Alto | Comunicação transparente 2 semanas antes + beta fechado com top players + compensação generosa (2x gold por 7 dias) |
| **Complexidade assusta novos players** | Média | 🟢 Médio | Tutorial interativo obrigatório + sistema de hints contextual + tooltips claros + documentação visual |
| **Treasury limita muito conversão** | Média | 🟡 Alto | Monitoring fila de conversões + ajuste dinâmico da fórmula se fila > 24h + comunicação transparente dos limites |
| **Guilds morrem rápido** | Alta | 🟢 Médio | Rewards para guilds ativas (top 10 ganham SPACE) + eventos semanais de guild + sistema de contribuição visível |
| **Battle Pass grind excessivo** | Média | 🟢 Médio | Balanceamento XP com analytics + ajustes semanais se completion rate < 30% + eventos XP boost |

### 12.3 Riscos de Segurança

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Roubo de SPACE treasury wallet** | Baixa | 🔴 Crítico | Private key em 3 locais seguros + multisig wallet (3/5) + limite diário emission hardcoded + cold storage para reserves |
| **SQL injection** | Baixa | 🔴 Crítico | GORM query builder sempre + validação input rigorosa + prepared statements + audit logs |
| **XSS no frontend** | Média | 🟢 Médio | Vue.js escaping automático + CSP headers + sanitização HTML user-generated content |
| **Rate limit bypass** | Alta | 🟢 Médio | Multiple layers (Cloudflare + Redis + Application) + IP blacklist automático + Turnstile CAPTCHA |

---

## 13. Critérios de Sucesso

### 13.1 Técnicos

- ✅ Migração completa com 0 perda de dados críticos
- ✅ Downtime < 4 horas
- ✅ 100% test coverage nos services críticos (Treasury, Shop, PvP)
- ✅ API response time p95 < 200ms
- ✅ Frontend load time < 2s
- ✅ Zero vulnerabilidades críticas (Snyk scan)

### 13.2 Produto

- ✅ 90%+ dos players ativos migram com sucesso
- ✅ 0 reclamações de perda de dados
- ✅ 50%+ dos players tentam conversão Gold→SPACE no primeiro mês
- ✅ 20%+ dos players criam ou entram em guilds
- ✅ Battle Pass completion rate > 30% (primeiro season)
- ✅ Retention D7 mantém ou melhora (baseline atual)

### 13.3 Economia

- ✅ Treasury nunca excede limite diário (0 infrações)
- ✅ Receita PIX mantém ou cresce 20% pós-migração
- ✅ Conversões Gold→SPACE processadas em < 5min (95% dos casos)
- ✅ 0 exploits de duplicação de moedas
- ✅ Daily emission stays < 80% do limite (economia saudável)

---

## 14. Próximos Passos

### 14.1 Pré-Implementação

1. ✅ Aprovar este spec (VOCÊ ESTÁ AQUI)
2. 📝 Criar plano de implementação detalhado (writing-plans skill)
3. 🔍 Code review do plano
4. 📣 Comunicar migração aos players (2 semanas antes)
5. 💾 Backup completo do Supabase

### 14.2 Implementação

1. Setup monorepo
2. Executar script ETL (staging primeiro)
3. Implementar task por task seguindo o plano
4. Code review contínuo
5. Deploy staging incremental
6. Beta testing com top 20 players

### 14.3 Launch

1. Comunicação final (48h antes)
2. Janela de manutenção (domingo 2-6am)
3. Migração production
4. Monitoring intensivo (primeiras 48h)
5. Compensação ativada (2x gold por 7 dias)
6. Coleta de feedback

---

## 15. Glossário

- **Gold:** Moeda off-chain (in-game currency)
- **SPACE:** Token on-chain (Solana SPL)
- **Treasury:** Sistema que controla emissão de SPACE baseado em receita
- **Battle Pass:** Sistema de progressão seasonal com recompensas por tier
- **Guild:** Grupo social de jogadores que contribuem score e lockam SPACE
- **League:** Sistema de ranking baseado em pontos (Bronze → Master)
- **ETL:** Extract-Transform-Load (migração de dados)
- **go-scaffold:** Boilerplate Golang com Clean Architecture
- **Clean Architecture:** Padrão de separação domain/service/repository/infra

---

## 16. Referências

- `docs/rebase.md` - Análise econômica completa
- `https://github.com/braiphub/go-scaffold` - Boilerplate base
- Supabase Schema - Anexado neste documento (27 tabelas)
- Supabase Functions - Anexado neste documento (9 RPCs)

---

**Documento aprovado para implementação.**
**Próximo passo:** Invocar skill `writing-plans` para criar plano detalhado task-by-task.

---

_Gerado por superpowers:brainstorming skill em 2026-08-24_
