# Transform Layer Specification

## Overview
The transformation layer converts extracted Supabase JSON data into Go domain entities.

## Implemented Transformations

### 1. Players
- **Source**: Supabase `players` table (with merged `player_wallets`)
- **Target**: `entity.Player`
- **Key Mappings**:
  - `coins` → `GoldBalance` (uint64)
  - `id` (UUID) → auto-increment uint (via mapping table)
  - `wallet_address` → `WalletAddress` (*string)
  - `SpaceBalance` set to 0 (compensation in Task 10)
  - Default `LeagueID` = 1 (Bronze)

### 2. Leagues
- **Source**: Supabase `leagues` table
- **Target**: `entity.League`
- **Fallback**: Returns seed data if no leagues found
- **Mappings**:
  - `min_score` → `MinPoints`
  - `max_score` → `MaxPoints`
  - `icon_url` → `Icon`

### 3. Player Items
- **Source**: Supabase `player_items` table
- **Target**: `entity.PlayerItem`
- **Mappings**:
  - `player_id` (UUID) → `PlayerID` (uint)
  - `item_id` (int) → `ItemID` (string)
  - `is_equipped` → `IsEquipped`
  - Default `ItemType` = "cosmetic"

### 4. Achievements
- **Source**: Supabase `achievements` table
- **Target**: `entity.Achievement`
- **Fallback**: Returns seed data if no achievements found
- **Mappings**:
  - `id` (int) → `ID` (string, format: "ach_{id}")
  - `difficulty` → `Rarity` (via mapping function)
  - `points` → `RewardGold`

### 5. Player Achievements
- **Source**: Supabase `player_achievements` table
- **Target**: `entity.PlayerAchievement`
- **Mappings**:
  - Both `player_id` and `achievement_id` converted via UUID mapping
  - `unlocked_at` → `UnlockedAt`
  - Default `Notified` = true

### 6. Gold/SPACE Conversions
- **Source**: Supabase `gold_space_conversions` table
- **Target**: `entity.GoldSpaceConversion`
- **Mappings**:
  - `status` string → `Status` enum
  - `tx_hash` → `TxSignature`
  - Default `Type` = GOLD_TO_SPACE

### 7. Daily Emissions
- **Source**: Supabase `daily_emissions` table
- **Target**: `entity.DailyEmission`
- **Mappings**:
  - `total_space_emitted` → `GameplayRewards`
  - Default `SpacePrice` = 100 (R$ 1.00)

### 8. Reward History
- **Source**: Supabase `reward_history` table
- **Target**: `entity.RewardHistory`
- **Mappings**:
  - `reward_type` string → `RewardType` enum
  - `amount` → `GoldAmount`
  - `source` → `Description`

### 9. Orders
- **Source**: Supabase `orders` table
- **Target**: `entity.Order`
- **Mappings**:
  - `order_type` → `PackageID`
  - `status` string → `Status` enum
  - `amount` → `Amount` (converted to centavos)

## UUID to Uint Mapping

The transformation layer maintains a mapping table for converting Supabase UUIDs to Go auto-increment uints:

- **Global map**: `uuidToUintMap`
- **Counter**: Starts at 1
- **Usage**: All foreign key references use this mapping

This mapping will be saved to a compensation table in Task 8 for validation and rollback purposes.

## Helper Functions

### Type Converters
- `stringValue(*string) string` - Safely dereferences string pointers
- `pointerIntValue(*int, default) int` - Safely dereferences int pointers

### Enum Mappers
- `mapDifficultyToRarity(string) AchievementRarity`
- `mapConversionStatus(string) ConversionStatus`
- `mapRewardType(string) RewardType`
- `mapOrderStatus(string) OrderStatus`

## Important Field Mappings

| Supabase Field | Go Entity Field | Type Conversion | Notes |
|----------------|-----------------|-----------------|-------|
| `coins` | `GoldBalance` | int → uint64 | Primary currency |
| `id` (UUID) | `ID` | UUID → uint | Via mapping table |
| `wallet_address` | `WalletAddress` | string → *string | Optional field |
| `space_balance` | `SpaceBalance` | - → 0 | Will be compensated in Task 10 |
| `difficulty` | `Rarity` | string → enum | Via mapper function |
| `status` | `Status` | string → enum | Multiple entities |

## Compilation

The transform layer compiles successfully as part of the main module:

```bash
cd backend
go build ./scripts/migrate-from-supabase/
```

## Next Steps (Task 8)

1. Implement the load layer to insert transformed data into PostgreSQL
2. Create compensation table for UUID → uint mappings
3. Implement validation and rollback mechanisms
4. Add comprehensive logging
