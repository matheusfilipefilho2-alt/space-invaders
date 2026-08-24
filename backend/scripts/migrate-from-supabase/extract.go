package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// SupabaseClient wraps HTTP client for Supabase REST API
type SupabaseClient struct {
	BaseURL string
	APIKey  string
	Client  *http.Client
}

// NewSupabaseClient creates a new Supabase client
func NewSupabaseClient(url, key string) *SupabaseClient {
	return &SupabaseClient{
		BaseURL: url + "/rest/v1",
		APIKey:  key,
		Client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// Get performs a GET request to Supabase
func (c *SupabaseClient) Get(table string, query string) ([]byte, error) {
	url := c.BaseURL + "/" + table
	if query != "" {
		url += "?" + query
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("apikey", c.APIKey)
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	return body, nil
}

// ExtractAllData extracts all data from Supabase and saves to JSON files
func ExtractAllData(client *SupabaseClient) (*SupabaseData, error) {
	data := &SupabaseData{}
	
	log.Println("Starting data extraction from Supabase...")
	
	// Extract in order of dependencies
	if err := extractPlayers(client, data); err != nil {
		return nil, fmt.Errorf("extract players: %w", err)
	}
	
	if err := extractAchievements(client, data); err != nil {
		return nil, fmt.Errorf("extract achievements: %w", err)
	}
	
	if err := extractPlayerAchievements(client, data); err != nil {
		return nil, fmt.Errorf("extract player achievements: %w", err)
	}
	
	if err := extractItems(client, data); err != nil {
		return nil, fmt.Errorf("extract items: %w", err)
	}
	
	if err := extractPlayerItems(client, data); err != nil {
		return nil, fmt.Errorf("extract player items: %w", err)
	}
	
	if err := extractGoldSpaceConversions(client, data); err != nil {
		return nil, fmt.Errorf("extract gold space conversions: %w", err)
	}
	
	if err := extractDailyEmissions(client, data); err != nil {
		return nil, fmt.Errorf("extract daily emissions: %w", err)
	}
	
	if err := extractRewardHistory(client, data); err != nil {
		return nil, fmt.Errorf("extract reward history: %w", err)
	}
	
	if err := extractOrders(client, data); err != nil {
		return nil, fmt.Errorf("extract orders: %w", err)
	}
	
	if err := extractLeagues(client, data); err != nil {
		return nil, fmt.Errorf("extract leagues: %w", err)
	}
	
	if err := extractGuilds(client, data); err != nil {
		return nil, fmt.Errorf("extract guilds: %w", err)
	}
	
	if err := extractGuildMembers(client, data); err != nil {
		return nil, fmt.Errorf("extract guild members: %w", err)
	}
	
	if err := extractTournamentParticipants(client, data); err != nil {
		return nil, fmt.Errorf("extract tournament participants: %w", err)
	}
	
	if err := extractPvPMatches(client, data); err != nil {
		return nil, fmt.Errorf("extract pvp matches: %w", err)
	}
	
	if err := extractBattlePassSeasons(client, data); err != nil {
		return nil, fmt.Errorf("extract battle pass seasons: %w", err)
	}
	
	if err := extractBattlePassProgress(client, data); err != nil {
		return nil, fmt.Errorf("extract battle pass progress: %w", err)
	}
	
	if err := extractSpecialEvents(client, data); err != nil {
		return nil, fmt.Errorf("extract special events: %w", err)
	}
	
	log.Println("✅ All data extracted successfully")
	return data, nil
}

// extractPlayers extracts players (note: LEFT JOIN with player_wallets needs RPC or separate queries)
func extractPlayers(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting players...")
	
	// Get all players
	body, err := client.Get("players", "select=*&order=created_at.asc")
	if err != nil {
		return fmt.Errorf("query players: %w", err)
	}
	
	var players []Player
	if err := json.Unmarshal(body, &players); err != nil {
		return fmt.Errorf("unmarshal players: %w", err)
	}
	
	// Get player wallets separately and merge
	walletBody, err := client.Get("player_wallets", "select=*")
	if err != nil {
		// Wallets table might not exist, this is optional
		log.Println("Warning: Could not fetch player_wallets (table might not exist)")
	} else {
		type PlayerWallet struct {
			PlayerID      string   `json:"player_id"`
			WalletAddress string   `json:"wallet_address"`
			SpaceBalance  *float64 `json:"space_balance"`
			SolBalance    *float64 `json:"sol_balance"`
		}
		
		var wallets []PlayerWallet
		if err := json.Unmarshal(walletBody, &wallets); err != nil {
			log.Printf("Warning: Could not unmarshal player_wallets: %v", err)
		} else {
			// Create a map for quick lookup
			walletMap := make(map[string]*PlayerWallet)
			for i := range wallets {
				walletMap[wallets[i].PlayerID] = &wallets[i]
			}
			
			// Merge wallet data into players
			for i := range players {
				if wallet, ok := walletMap[players[i].ID]; ok {
					players[i].WalletAddress = &wallet.WalletAddress
					players[i].SpaceBalance = wallet.SpaceBalance
					players[i].SolBalance = wallet.SolBalance
				}
			}
		}
	}
	
	data.Players = players
	log.Printf("✓ Extracted %d players\n", len(players))
	
	// Save to JSON
	if err := saveToJSON("extracted/players.json", players); err != nil {
		return fmt.Errorf("save players: %w", err)
	}
	
	return nil
}

// extractAchievements extracts all achievements
func extractAchievements(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting achievements...")
	
	body, err := client.Get("achievements", "select=*")
	if err != nil {
		return fmt.Errorf("query achievements: %w", err)
	}
	
	var achievements []Achievement
	if err := json.Unmarshal(body, &achievements); err != nil {
		return fmt.Errorf("unmarshal achievements: %w", err)
	}
	
	data.Achievements = achievements
	log.Printf("✓ Extracted %d achievements\n", len(achievements))
	
	if err := saveToJSON("extracted/achievements.json", achievements); err != nil {
		return fmt.Errorf("save achievements: %w", err)
	}
	
	return nil
}

// extractPlayerAchievements extracts player achievements
func extractPlayerAchievements(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting player achievements...")
	
	body, err := client.Get("player_achievements", "select=*")
	if err != nil {
		return fmt.Errorf("query player achievements: %w", err)
	}
	
	var playerAchievements []PlayerAchievement
	if err := json.Unmarshal(body, &playerAchievements); err != nil {
		return fmt.Errorf("unmarshal player achievements: %w", err)
	}
	
	data.PlayerAchievements = playerAchievements
	log.Printf("✓ Extracted %d player achievements\n", len(playerAchievements))
	
	if err := saveToJSON("extracted/player_achievements.json", playerAchievements); err != nil {
		return fmt.Errorf("save player achievements: %w", err)
	}
	
	return nil
}

// extractItems extracts all items
func extractItems(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting items...")
	
	body, err := client.Get("items", "select=*")
	if err != nil {
		return fmt.Errorf("query items: %w", err)
	}
	
	var items []Item
	if err := json.Unmarshal(body, &items); err != nil {
		return fmt.Errorf("unmarshal items: %w", err)
	}
	
	data.Items = items
	log.Printf("✓ Extracted %d items\n", len(items))
	
	if err := saveToJSON("extracted/items.json", items); err != nil {
		return fmt.Errorf("save items: %w", err)
	}
	
	return nil
}

// extractPlayerItems extracts player items
func extractPlayerItems(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting player items...")
	
	body, err := client.Get("player_items", "select=*")
	if err != nil {
		return fmt.Errorf("query player items: %w", err)
	}
	
	var playerItems []PlayerItem
	if err := json.Unmarshal(body, &playerItems); err != nil {
		return fmt.Errorf("unmarshal player items: %w", err)
	}
	
	data.PlayerItems = playerItems
	log.Printf("✓ Extracted %d player items\n", len(playerItems))
	
	if err := saveToJSON("extracted/player_items.json", playerItems); err != nil {
		return fmt.Errorf("save player items: %w", err)
	}
	
	return nil
}

// extractGoldSpaceConversions extracts gold to space conversions
func extractGoldSpaceConversions(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting gold space conversions...")
	
	body, err := client.Get("gold_space_conversions", "select=*")
	if err != nil {
		log.Println("Warning: gold_space_conversions table might not exist")
		return nil
	}
	
	var conversions []GoldSpaceConversion
	if err := json.Unmarshal(body, &conversions); err != nil {
		return fmt.Errorf("unmarshal conversions: %w", err)
	}
	
	data.GoldSpaceConversions = conversions
	log.Printf("✓ Extracted %d conversions\n", len(conversions))
	
	if err := saveToJSON("extracted/gold_space_conversions.json", conversions); err != nil {
		return fmt.Errorf("save conversions: %w", err)
	}
	
	return nil
}

// extractDailyEmissions extracts daily emissions
func extractDailyEmissions(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting daily emissions...")
	
	body, err := client.Get("daily_emissions", "select=*")
	if err != nil {
		log.Println("Warning: daily_emissions table might not exist")
		return nil
	}
	
	var emissions []DailyEmission
	if err := json.Unmarshal(body, &emissions); err != nil {
		return fmt.Errorf("unmarshal emissions: %w", err)
	}
	
	data.DailyEmissions = emissions
	log.Printf("✓ Extracted %d emissions\n", len(emissions))
	
	if err := saveToJSON("extracted/daily_emissions.json", emissions); err != nil {
		return fmt.Errorf("save emissions: %w", err)
	}
	
	return nil
}

// extractRewardHistory extracts reward history
func extractRewardHistory(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting reward history...")
	
	body, err := client.Get("reward_history", "select=*")
	if err != nil {
		log.Println("Warning: reward_history table might not exist")
		return nil
	}
	
	var rewards []RewardHistory
	if err := json.Unmarshal(body, &rewards); err != nil {
		return fmt.Errorf("unmarshal rewards: %w", err)
	}
	
	data.RewardHistory = rewards
	log.Printf("✓ Extracted %d reward records\n", len(rewards))
	
	if err := saveToJSON("extracted/reward_history.json", rewards); err != nil {
		return fmt.Errorf("save rewards: %w", err)
	}
	
	return nil
}

// extractOrders extracts orders
func extractOrders(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting orders...")
	
	body, err := client.Get("orders", "select=*")
	if err != nil {
		log.Println("Warning: orders table might not exist")
		return nil
	}
	
	var orders []Order
	if err := json.Unmarshal(body, &orders); err != nil {
		return fmt.Errorf("unmarshal orders: %w", err)
	}
	
	data.Orders = orders
	log.Printf("✓ Extracted %d orders\n", len(orders))
	
	if err := saveToJSON("extracted/orders.json", orders); err != nil {
		return fmt.Errorf("save orders: %w", err)
	}
	
	return nil
}

// extractLeagues extracts leagues
func extractLeagues(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting leagues...")
	
	body, err := client.Get("leagues", "select=*")
	if err != nil {
		log.Println("Warning: leagues table might not exist")
		return nil
	}
	
	var leagues []League
	if err := json.Unmarshal(body, &leagues); err != nil {
		return fmt.Errorf("unmarshal leagues: %w", err)
	}
	
	data.Leagues = leagues
	log.Printf("✓ Extracted %d leagues\n", len(leagues))
	
	if err := saveToJSON("extracted/leagues.json", leagues); err != nil {
		return fmt.Errorf("save leagues: %w", err)
	}
	
	return nil
}

// extractGuilds extracts guilds
func extractGuilds(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting guilds...")
	
	body, err := client.Get("guilds", "select=*")
	if err != nil {
		log.Println("Warning: guilds table might not exist")
		return nil
	}
	
	var guilds []Guild
	if err := json.Unmarshal(body, &guilds); err != nil {
		return fmt.Errorf("unmarshal guilds: %w", err)
	}
	
	data.Guilds = guilds
	log.Printf("✓ Extracted %d guilds\n", len(guilds))
	
	if err := saveToJSON("extracted/guilds.json", guilds); err != nil {
		return fmt.Errorf("save guilds: %w", err)
	}
	
	return nil
}

// extractGuildMembers extracts guild members
func extractGuildMembers(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting guild members...")
	
	body, err := client.Get("guild_members", "select=*")
	if err != nil {
		log.Println("Warning: guild_members table might not exist")
		return nil
	}
	
	var members []GuildMember
	if err := json.Unmarshal(body, &members); err != nil {
		return fmt.Errorf("unmarshal guild members: %w", err)
	}
	
	data.GuildMembers = members
	log.Printf("✓ Extracted %d guild members\n", len(members))
	
	if err := saveToJSON("extracted/guild_members.json", members); err != nil {
		return fmt.Errorf("save guild members: %w", err)
	}
	
	return nil
}

// extractTournamentParticipants extracts tournament participants
func extractTournamentParticipants(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting tournament participants...")
	
	body, err := client.Get("tournament_participants", "select=*")
	if err != nil {
		log.Println("Warning: tournament_participants table might not exist")
		return nil
	}
	
	var participants []TournamentParticipant
	if err := json.Unmarshal(body, &participants); err != nil {
		return fmt.Errorf("unmarshal tournament participants: %w", err)
	}
	
	data.TournamentParticipants = participants
	log.Printf("✓ Extracted %d tournament participants\n", len(participants))
	
	if err := saveToJSON("extracted/tournament_participants.json", participants); err != nil {
		return fmt.Errorf("save tournament participants: %w", err)
	}
	
	return nil
}

// extractPvPMatches extracts PvP matches
func extractPvPMatches(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting PvP matches...")
	
	body, err := client.Get("pvp_matches", "select=*")
	if err != nil {
		log.Println("Warning: pvp_matches table might not exist")
		return nil
	}
	
	var matches []PvPMatch
	if err := json.Unmarshal(body, &matches); err != nil {
		return fmt.Errorf("unmarshal pvp matches: %w", err)
	}
	
	data.PvPMatches = matches
	log.Printf("✓ Extracted %d PvP matches\n", len(matches))
	
	if err := saveToJSON("extracted/pvp_matches.json", matches); err != nil {
		return fmt.Errorf("save pvp matches: %w", err)
	}
	
	return nil
}

// extractBattlePassSeasons extracts battle pass seasons
func extractBattlePassSeasons(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting battle pass seasons...")
	
	body, err := client.Get("battle_pass_seasons", "select=*")
	if err != nil {
		log.Println("Warning: battle_pass_seasons table might not exist")
		return nil
	}
	
	var seasons []BattlePassSeason
	if err := json.Unmarshal(body, &seasons); err != nil {
		return fmt.Errorf("unmarshal battle pass seasons: %w", err)
	}
	
	data.BattlePassSeasons = seasons
	log.Printf("✓ Extracted %d battle pass seasons\n", len(seasons))
	
	if err := saveToJSON("extracted/battle_pass_seasons.json", seasons); err != nil {
		return fmt.Errorf("save battle pass seasons: %w", err)
	}
	
	return nil
}

// extractBattlePassProgress extracts battle pass progress
func extractBattlePassProgress(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting battle pass progress...")
	
	body, err := client.Get("battle_pass_progress", "select=*")
	if err != nil {
		log.Println("Warning: battle_pass_progress table might not exist")
		return nil
	}
	
	var progress []BattlePassProgress
	if err := json.Unmarshal(body, &progress); err != nil {
		return fmt.Errorf("unmarshal battle pass progress: %w", err)
	}
	
	data.BattlePassProgress = progress
	log.Printf("✓ Extracted %d battle pass progress records\n", len(progress))
	
	if err := saveToJSON("extracted/battle_pass_progress.json", progress); err != nil {
		return fmt.Errorf("save battle pass progress: %w", err)
	}
	
	return nil
}

// extractSpecialEvents extracts special events (last 30 days + future)
func extractSpecialEvents(client *SupabaseClient, data *SupabaseData) error {
	log.Println("Extracting special events...")
	
	// Calculate date 30 days ago
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format(time.RFC3339)
	
	body, err := client.Get("special_events", "select=*&end_date=gte."+thirtyDaysAgo)
	if err != nil {
		log.Println("Warning: special_events table might not exist")
		return nil
	}
	
	var events []SpecialEvent
	if err := json.Unmarshal(body, &events); err != nil {
		return fmt.Errorf("unmarshal special events: %w", err)
	}
	
	data.SpecialEvents = events
	log.Printf("✓ Extracted %d special events (last 30 days + future)\n", len(events))
	
	if err := saveToJSON("extracted/special_events.json", events); err != nil {
		return fmt.Errorf("save special events: %w", err)
	}
	
	return nil
}

// saveToJSON saves data to a JSON file
func saveToJSON(filename string, data interface{}) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal json: %w", err)
	}
	
	if err := os.WriteFile(filename, jsonData, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	
	return nil
}

// PrintExtractionSummary prints a summary of extracted data
func PrintExtractionSummary(data *SupabaseData) {
	separator := strings.Repeat("=", 60)
	log.Println("\n" + separator)
	log.Println("EXTRACTION SUMMARY")
	log.Println(separator)
	log.Printf("Players:                  %d\n", len(data.Players))
	log.Printf("Achievements:             %d\n", len(data.Achievements))
	log.Printf("Player Achievements:      %d\n", len(data.PlayerAchievements))
	log.Printf("Items:                    %d\n", len(data.Items))
	log.Printf("Player Items:             %d\n", len(data.PlayerItems))
	log.Printf("Gold/SPACE Conversions:   %d\n", len(data.GoldSpaceConversions))
	log.Printf("Daily Emissions:          %d\n", len(data.DailyEmissions))
	log.Printf("Reward History:           %d\n", len(data.RewardHistory))
	log.Printf("Orders:                   %d\n", len(data.Orders))
	log.Printf("Leagues:                  %d\n", len(data.Leagues))
	log.Printf("Guilds:                   %d\n", len(data.Guilds))
	log.Printf("Guild Members:            %d\n", len(data.GuildMembers))
	log.Printf("Tournament Participants:  %d\n", len(data.TournamentParticipants))
	log.Printf("PvP Matches:              %d\n", len(data.PvPMatches))
	log.Printf("Battle Pass Seasons:      %d\n", len(data.BattlePassSeasons))
	log.Printf("Battle Pass Progress:     %d\n", len(data.BattlePassProgress))
	log.Printf("Special Events:           %d\n", len(data.SpecialEvents))
	log.Println(separator)
}
