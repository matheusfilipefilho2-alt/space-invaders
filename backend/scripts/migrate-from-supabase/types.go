package main

import (
	"time"
)

// SupabaseData holds all extracted data from Supabase
type SupabaseData struct {
	Players              []Player              `json:"players"`
	Achievements         []Achievement         `json:"achievements"`
	PlayerAchievements   []PlayerAchievement   `json:"player_achievements"`
	Items                []Item                `json:"items"`
	PlayerItems          []PlayerItem          `json:"player_items"`
	GoldSpaceConversions []GoldSpaceConversion `json:"gold_space_conversions"`
	DailyEmissions       []DailyEmission       `json:"daily_emissions"`
	RewardHistory        []RewardHistory       `json:"reward_history"`
	Orders               []Order               `json:"orders"`
	Leagues              []League              `json:"leagues"`
	Guilds               []Guild               `json:"guilds"`
	GuildMembers         []GuildMember         `json:"guild_members"`
	TournamentParticipants []TournamentParticipant `json:"tournament_participants"`
	PvPMatches           []PvPMatch            `json:"pvp_matches"`
	BattlePassSeasons    []BattlePassSeason    `json:"battle_pass_seasons"`
	BattlePassProgress   []BattlePassProgress  `json:"battle_pass_progress"`
	SpecialEvents        []SpecialEvent        `json:"special_events"`
}

// Player represents a player from Supabase with merged wallet data
type Player struct {
	ID                string     `json:"id"`
	WalletAddress     *string    `json:"wallet_address"`
	Username          string     `json:"username"`
	Email             *string    `json:"email"`
	HighScore         int        `json:"high_score"`
	Coins             int        `json:"coins"`
	SpaceBalance      *float64   `json:"space_balance"`
	SolBalance        *float64   `json:"sol_balance"`
	Level             int        `json:"level"`
	Experience        int        `json:"experience"`
	CurrentSkin       string     `json:"current_skin"`
	GoldenShipEnabled bool       `json:"golden_ship_enabled"`
	RainbowEnabled    bool       `json:"rainbow_enabled"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	LastLogin         *time.Time `json:"last_login"`
}

// Achievement represents an achievement from Supabase
type Achievement struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Difficulty  string    `json:"difficulty"`
	Points      int       `json:"points"`
	IconURL     *string   `json:"icon_url"`
	CreatedAt   time.Time `json:"created_at"`
}

// PlayerAchievement represents a player's achievement from Supabase
type PlayerAchievement struct {
	ID            int       `json:"id"`
	PlayerID      string    `json:"player_id"`
	AchievementID int       `json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
	Progress      int       `json:"progress"`
}

// Item represents an item from Supabase
type Item struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ItemType    string    `json:"item_type"`
	Rarity      string    `json:"rarity"`
	Price       int       `json:"price"`
	IconURL     *string   `json:"icon_url"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// PlayerItem represents a player's item from Supabase
type PlayerItem struct {
	ID         int       `json:"id"`
	PlayerID   string    `json:"player_id"`
	ItemID     int       `json:"item_id"`
	Quantity   int       `json:"quantity"`
	IsEquipped bool      `json:"is_equipped"`
	AcquiredAt time.Time `json:"acquired_at"`
}

// GoldSpaceConversion represents a conversion from Supabase
type GoldSpaceConversion struct {
	ID           int       `json:"id"`
	PlayerID     string    `json:"player_id"`
	GoldAmount   int       `json:"gold_amount"`
	SpaceAmount  float64   `json:"space_amount"`
	ExchangeRate float64   `json:"exchange_rate"`
	TxHash       *string   `json:"tx_hash"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at"`
}

// DailyEmission represents daily emission from Supabase
type DailyEmission struct {
	ID                int       `json:"id"`
	Date              time.Time `json:"date"`
	TotalGoldEarned   int       `json:"total_gold_earned"`
	TotalSpaceEmitted float64   `json:"total_space_emitted"`
	ActivePlayers     int       `json:"active_players"`
	TreasuryBalance   float64   `json:"treasury_balance"`
	CreatedAt         time.Time `json:"created_at"`
}

// RewardHistory represents reward history from Supabase
type RewardHistory struct {
	ID         int       `json:"id"`
	PlayerID   string    `json:"player_id"`
	RewardType string    `json:"reward_type"`
	Amount     int       `json:"amount"`
	Source     string    `json:"source"`
	Metadata   *string   `json:"metadata"`
	CreatedAt  time.Time `json:"created_at"`
}

// Order represents an order from Supabase
type Order struct {
	ID              int        `json:"id"`
	PlayerID        string     `json:"player_id"`
	OrderType       string     `json:"order_type"`
	Amount          float64    `json:"amount"`
	Currency        string     `json:"currency"`
	Status          string     `json:"status"`
	PaymentProvider string     `json:"payment_provider"`
	ExternalID      *string    `json:"external_id"`
	Metadata        *string    `json:"metadata"`
	CreatedAt       time.Time  `json:"created_at"`
	CompletedAt     *time.Time `json:"completed_at"`
}

// League represents a league from Supabase
type League struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Tier        int       `json:"tier"`
	MinScore    int       `json:"min_score"`
	MaxScore    *int      `json:"max_score"`
	IconURL     *string   `json:"icon_url"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// Guild represents a guild from Supabase
type Guild struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Tag         string    `json:"tag"`
	Description *string   `json:"description"`
	OwnerID     string    `json:"owner_id"`
	Level       int       `json:"level"`
	Experience  int       `json:"experience"`
	MemberCount int       `json:"member_count"`
	MaxMembers  int       `json:"max_members"`
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GuildMember represents a guild member from Supabase
type GuildMember struct {
	ID         int       `json:"id"`
	GuildID    int       `json:"guild_id"`
	PlayerID   string    `json:"player_id"`
	Role       string    `json:"role"`
	JoinedAt   time.Time `json:"joined_at"`
	LastActive time.Time `json:"last_active"`
}

// TournamentParticipant represents a tournament participant from Supabase
type TournamentParticipant struct {
	ID           int        `json:"id"`
	TournamentID int        `json:"tournament_id"`
	PlayerID     string     `json:"player_id"`
	Score        int        `json:"score"`
	Rank         *int       `json:"rank"`
	Prizes       *string    `json:"prizes"`
	JoinedAt     time.Time  `json:"joined_at"`
	CompletedAt  *time.Time `json:"completed_at"`
}

// PvPMatch represents a PvP match from Supabase
type PvPMatch struct {
	ID          int        `json:"id"`
	Player1ID   string     `json:"player1_id"`
	Player2ID   string     `json:"player2_id"`
	WinnerID    *string    `json:"winner_id"`
	Player1Score int       `json:"player1_score"`
	Player2Score int       `json:"player2_score"`
	MatchType   string     `json:"match_type"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at"`
}

// BattlePassSeason represents a battle pass season from Supabase
type BattlePassSeason struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	SeasonNum   int        `json:"season_num"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     time.Time  `json:"end_date"`
	MaxTier     int        `json:"max_tier"`
	IsActive    bool       `json:"is_active"`
	Description *string    `json:"description"`
	CreatedAt   time.Time  `json:"created_at"`
}

// BattlePassProgress represents battle pass progress from Supabase
type BattlePassProgress struct {
	ID             int       `json:"id"`
	PlayerID       string    `json:"player_id"`
	SeasonID       int       `json:"season_id"`
	CurrentTier    int       `json:"current_tier"`
	Experience     int       `json:"experience"`
	IsPremium      bool      `json:"is_premium"`
	LastUpdated    time.Time `json:"last_updated"`
}

// SpecialEvent represents a special event from Supabase
type SpecialEvent struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	EventType   string     `json:"event_type"`
	Description *string    `json:"description"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     time.Time  `json:"end_date"`
	Rewards     *string    `json:"rewards"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
}
