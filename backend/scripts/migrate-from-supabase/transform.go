package main

import (
	"fmt"
	"strings"

	"github.com/yourusername/space-invaders/internal/domain/entity"
)

// TransformedData holds Go domain entities ready for insertion
type TransformedData struct {
	Players            []entity.Player
	Leagues            []entity.League
	PlayerItems        []entity.PlayerItem
	Achievements       []entity.Achievement
	PlayerAchievements []entity.PlayerAchievement
	Conversions        []entity.GoldSpaceConversion
	DailyEmissions     []entity.DailyEmission
	RewardHistory      []entity.RewardHistory
	Orders             []entity.Order
}

// TransformData converts extracted Supabase data into Go domain entities
func TransformData(data *SupabaseData) (*TransformedData, error) {
	transformed := &TransformedData{}

	// Transform each entity type
	transformed.Players = transformPlayers(data.Players)
	transformed.Leagues = transformLeagues(data.Leagues)
	transformed.PlayerItems = transformPlayerItems(data.PlayerItems)
	transformed.Achievements = transformAchievements(data.Achievements)
	transformed.PlayerAchievements = transformPlayerAchievements(data.PlayerAchievements)
	transformed.Conversions = transformConversions(data.GoldSpaceConversions)
	transformed.DailyEmissions = transformDailyEmissions(data.DailyEmissions)
	transformed.RewardHistory = transformRewardHistory(data.RewardHistory)
	transformed.Orders = transformOrders(data.Orders)

	return transformed, nil
}

// UUID to uint mapping for ID conversion
var uuidToUintMap = make(map[string]uint)
var uintCounter uint = 1

func uuidToUint(uuid string) uint {
	if uuid == "" {
		return 0
	}
	if id, ok := uuidToUintMap[uuid]; ok {
		return id
	}
	uuidToUintMap[uuid] = uintCounter
	uintCounter++
	return uuidToUintMap[uuid]
}

func transformPlayers(supaPlayers []Player) []entity.Player {
	players := make([]entity.Player, 0, len(supaPlayers))

	for _, sp := range supaPlayers {
		player := entity.Player{
			Username:      sp.Username,
			Email:         stringValue(sp.Email),
			EmailVerified: false, // Will be set based on verification status
			PasswordHash:  "",    // Will need to be set from auth data
			WalletAddress: sp.WalletAddress,

			// Stats
			HighScore:  uint64(sp.HighScore),
			TotalGames: uint(0), // Not in Supabase schema
			LastPlayed: sp.LastLogin,

			// Economy - Important field mappings!
			GoldBalance:  uint64(sp.Coins), // Supabase "coins" → Go "GoldBalance"
			SpaceBalance: 0,                // Start with 0, will be compensated in Task 10

			// Progression
			LeagueID:   1,       // Default to Bronze, will be updated based on rank_points
			RankPoints: uint(0), // Not in current Supabase Player schema

			// Notifications - defaults
			NotifyOffers:       true,
			NotifyAchievements: true,
			NotifyShop:         false,
		}

		// Set timestamps from gorm.Model
		player.CreatedAt = sp.CreatedAt
		player.UpdatedAt = sp.UpdatedAt

		// Store UUID mapping for foreign keys
		uuidToUint(sp.ID)

		players = append(players, player)
	}

	return players
}

func transformLeagues(supaLeagues []League) []entity.League {
	if len(supaLeagues) == 0 {
		// Return seed data if no leagues in Supabase
		return entity.SeedLeagues()
	}

	leagues := make([]entity.League, 0, len(supaLeagues))
	for _, sl := range supaLeagues {
		league := entity.League{
			ID:        uint(sl.ID),
			Name:      sl.Name,
			MinPoints: uint(sl.MinScore),
			MaxPoints: uint(pointerIntValue(sl.MaxScore, 999999)),
			Icon:      stringValue(sl.IconURL),
			Color:     "#000000", // Default color, not in Supabase
		}
		leagues = append(leagues, league)
	}
	return leagues
}

func transformPlayerItems(supaItems []PlayerItem) []entity.PlayerItem {
	items := make([]entity.PlayerItem, 0, len(supaItems))

	for _, si := range supaItems {
		item := entity.PlayerItem{
			PlayerID: uuidToUint(si.PlayerID),
			ItemID:   uint(si.ItemID), // Convert int to uint
			Equipped: si.IsEquipped,
		}

		item.CreatedAt = si.AcquiredAt
		item.UpdatedAt = si.AcquiredAt

		items = append(items, item)
	}

	return items
}

func transformAchievements(supaAchievements []Achievement) []entity.Achievement {
	if len(supaAchievements) == 0 {
		// Return seed data if no achievements in Supabase
		return entity.SeedAchievements()
	}

	achievements := make([]entity.Achievement, 0, len(supaAchievements))
	for _, sa := range supaAchievements {
		// Convert ID to string format (e.g., "ach_1" → "first_kill")
		achievementID := fmt.Sprintf("ach_%d", sa.ID)

		// Map Supabase difficulty to our rarity system
		rarity := mapDifficultyToRarity(sa.Difficulty)

		achievement := entity.Achievement{
			ID:          achievementID,
			Name:        sa.Name,
			Description: sa.Description,
			Icon:        stringValue(sa.IconURL),
			Rarity:      rarity,
			RewardGold:  uint(sa.Points), // Use points as gold reward
		}

		achievement.CreatedAt = sa.CreatedAt
		achievement.UpdatedAt = sa.CreatedAt

		achievements = append(achievements, achievement)
	}
	return achievements
}

func transformPlayerAchievements(supaPlayerAchievements []PlayerAchievement) []entity.PlayerAchievement {
	playerAchievements := make([]entity.PlayerAchievement, 0, len(supaPlayerAchievements))

	for _, spa := range supaPlayerAchievements {
		playerAchievement := entity.PlayerAchievement{
			PlayerID:      uuidToUint(spa.PlayerID),
			AchievementID: fmt.Sprintf("ach_%d", spa.AchievementID),
			UnlockedAt:    spa.UnlockedAt,
			Notified:      true, // Assume already notified
		}

		playerAchievement.CreatedAt = spa.UnlockedAt
		playerAchievement.UpdatedAt = spa.UnlockedAt

		playerAchievements = append(playerAchievements, playerAchievement)
	}

	return playerAchievements
}

func transformConversions(supaConversions []GoldSpaceConversion) []entity.GoldSpaceConversion {
	conversions := make([]entity.GoldSpaceConversion, 0, len(supaConversions))

	for _, sc := range supaConversions {
		// Determine conversion type based on context (default to GOLD_TO_SPACE)
		convType := entity.ConversionTypeGoldToSpace

		// Map status
		status := mapConversionStatus(sc.Status)

		conversion := entity.GoldSpaceConversion{
			PlayerID:     uuidToUint(sc.PlayerID),
			Type:         convType,
			GoldAmount:   uint64(sc.GoldAmount),
			SpaceAmount:  uint64(sc.SpaceAmount),
			ExchangeRate: uint(sc.ExchangeRate),
			TxSignature:  sc.TxHash,
			Status:       status,
			CompletedAt:  sc.CompletedAt,
		}

		conversion.CreatedAt = sc.CreatedAt
		conversion.UpdatedAt = sc.CreatedAt
		if sc.CompletedAt != nil {
			conversion.UpdatedAt = *sc.CompletedAt
		}

		conversions = append(conversions, conversion)
	}

	return conversions
}

func transformDailyEmissions(supaEmissions []DailyEmission) []entity.DailyEmission {
	emissions := make([]entity.DailyEmission, 0, len(supaEmissions))

	for _, se := range supaEmissions {
		emission := entity.DailyEmission{
			Date:              se.Date,
			PixRevenue24h:     0,   // Not in Supabase schema
			SpacePrice:        100, // Default R$ 1.00
			GameplayRewards:   uint64(se.TotalSpaceEmitted),
			EmissionLimit:     uint64(se.TotalSpaceEmitted), // Approximate
			EmissionUsed:      uint64(se.TotalSpaceEmitted),
			EmissionAvailable: 0,
		}

		emission.CreatedAt = se.CreatedAt
		emission.UpdatedAt = se.CreatedAt

		emissions = append(emissions, emission)
	}

	return emissions
}

func transformRewardHistory(supaRewards []RewardHistory) []entity.RewardHistory {
	rewards := make([]entity.RewardHistory, 0, len(supaRewards))

	for _, sr := range supaRewards {
		// Map reward type
		rewardType := mapRewardType(sr.RewardType)

		reward := entity.RewardHistory{
			PlayerID:          uuidToUint(sr.PlayerID),
			RewardType:        rewardType,
			GoldAmount:        uint(sr.Amount),
			SpaceAmount:       0, // Not in Supabase schema
			Description:       sr.Source,
			GameScore:         0, // Not in Supabase schema
			PreviousHighScore: 0, // Not in Supabase schema
		}

		reward.CreatedAt = sr.CreatedAt
		reward.UpdatedAt = sr.CreatedAt

		rewards = append(rewards, reward)
	}

	return rewards
}

func transformOrders(supaOrders []Order) []entity.Order {
	orders := make([]entity.Order, 0, len(supaOrders))

	for _, so := range supaOrders {
		// Map status
		status := mapOrderStatus(so.Status)

		// Calculate gold amount from order amount (would need package info)
		goldAmount := uint64(so.Amount) // Placeholder

		order := entity.Order{
			PlayerID:    uuidToUint(so.PlayerID),
			PackageID:   so.OrderType,
			Amount:      uint64(so.Amount * 100), // Convert to centavos if needed
			GoldAmount:  goldAmount,
			Status:      status,
			ExternalID:  stringValue(so.ExternalID),
			PixCode:     "",  // Not in Supabase schema
			QRCodeURL:   "",  // Not in Supabase schema
			PaymentURL:  "",  // Not in Supabase schema
			ExpiresAt:   nil, // Not in Supabase schema
			CompletedAt: so.CompletedAt,
		}

		order.CreatedAt = so.CreatedAt
		order.UpdatedAt = so.CreatedAt
		if so.CompletedAt != nil {
			order.UpdatedAt = *so.CompletedAt
		}

		orders = append(orders, order)
	}

	return orders
}

// Helper functions for type conversions and mappings

func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func pointerIntValue(i *int, defaultVal int) int {
	if i == nil {
		return defaultVal
	}
	return *i
}

func mapDifficultyToRarity(difficulty string) entity.AchievementRarity {
	switch difficulty {
	case "easy", "EASY":
		return entity.AchievementRarityCommon
	case "medium", "MEDIUM":
		return entity.AchievementRarityRare
	case "hard", "HARD":
		return entity.AchievementRarityEpic
	case "extreme", "EXTREME":
		return entity.AchievementRarityLegendary
	default:
		return entity.AchievementRarityCommon
	}
}

func mapConversionStatus(status string) entity.ConversionStatus {
	switch status {
	case "pending", "PENDING":
		return entity.ConversionStatusPending
	case "completed", "COMPLETED":
		return entity.ConversionStatusCompleted
	case "failed", "FAILED":
		return entity.ConversionStatusFailed
	default:
		return entity.ConversionStatusPending
	}
}

func mapRewardType(rewardType string) entity.RewardType {
	switch rewardType {
	case "achievement", "ACHIEVEMENT":
		return entity.RewardTypeAchievement
	case "level_up", "LEVEL_UP":
		return entity.RewardTypeLevelUp
	case "battle_pass", "BATTLE_PASS":
		return entity.RewardTypeBattlePass
	case "tournament", "TOURNAMENT":
		return entity.RewardTypeTournament
	case "guild", "GUILD":
		return entity.RewardTypeGuildBonus
	default:
		return entity.RewardTypeGoldEarned
	}
}

func mapOrderStatus(status string) entity.OrderStatus {
	switch status {
	case "pending", "PENDING":
		return entity.OrderStatusPending
	case "completed", "COMPLETED":
		return entity.OrderStatusCompleted
	case "cancelled", "CANCELLED":
		return entity.OrderStatusCancelled
	case "expired", "EXPIRED":
		return entity.OrderStatusExpired
	default:
		return entity.OrderStatusPending
	}
}

// PrintTransformationSummary prints a summary of transformed data
func PrintTransformationSummary(data *TransformedData) {
	separator := strings.Repeat("=", 60)
	fmt.Println("\n" + separator)
	fmt.Println("TRANSFORMATION SUMMARY")
	fmt.Println(separator)
	fmt.Printf("Players:              %d\n", len(data.Players))
	fmt.Printf("Leagues:              %d\n", len(data.Leagues))
	fmt.Printf("Player Items:         %d\n", len(data.PlayerItems))
	fmt.Printf("Achievements:         %d\n", len(data.Achievements))
	fmt.Printf("Player Achievements:  %d\n", len(data.PlayerAchievements))
	fmt.Printf("Conversions:          %d\n", len(data.Conversions))
	fmt.Printf("Daily Emissions:      %d\n", len(data.DailyEmissions))
	fmt.Printf("Reward History:       %d\n", len(data.RewardHistory))
	fmt.Printf("Orders:               %d\n", len(data.Orders))
	fmt.Println(separator)
	fmt.Printf("\nUUID to uint mappings created: %d\n", len(uuidToUintMap))
}
