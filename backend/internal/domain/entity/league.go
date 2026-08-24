package entity

type League struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"not null"` // Bronze, Silver, Gold, Platinum, Diamond, Master
	MinPoints uint   `gorm:"not null"`
	MaxPoints uint   `gorm:"not null"`
	Icon      string
	Color     string
}

func (League) TableName() string {
	return "leagues"
}

// SeedLeagues returns initial league data
func SeedLeagues() []League {
	return []League{
		{ID: 1, Name: "Bronze", MinPoints: 0, MaxPoints: 999, Icon: "🥉", Color: "#CD7F32"},
		{ID: 2, Name: "Silver", MinPoints: 1000, MaxPoints: 2499, Icon: "🥈", Color: "#C0C0C0"},
		{ID: 3, Name: "Gold", MinPoints: 2500, MaxPoints: 4999, Icon: "🥇", Color: "#FFD700"},
		{ID: 4, Name: "Platinum", MinPoints: 5000, MaxPoints: 9999, Icon: "⭐", Color: "#E5E4E2"},
		{ID: 5, Name: "Diamond", MinPoints: 10000, MaxPoints: 19999, Icon: "💎", Color: "#B9F2FF"},
		{ID: 6, Name: "Master", MinPoints: 20000, MaxPoints: 999999, Icon: "👑", Color: "#FF6B6B"},
	}
}
