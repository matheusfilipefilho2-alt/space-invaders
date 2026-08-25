package main

import (
	"fmt"
	"strings"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"gorm.io/gorm"
)

// ValidationReport holds validation results for a single table
type ValidationReport struct {
	TableName     string
	SupabaseCount int64
	PostgresCount int64
	Matched       bool
}

// ValidateMigration validates that all data was migrated correctly
// by comparing record counts between extracted data and PostgreSQL
func ValidateMigration(db *gorm.DB, data *TransformedData) []ValidationReport {
	reports := []ValidationReport{}

	// Validate Players
	var pgPlayersCount int64
	db.Model(&entity.Player{}).Count(&pgPlayersCount)
	reports = append(reports, ValidationReport{
		TableName:     "Players",
		SupabaseCount: int64(len(data.Players)),
		PostgresCount: pgPlayersCount,
		Matched:       int64(len(data.Players)) == pgPlayersCount,
	})

	// Validate Leagues
	var pgLeaguesCount int64
	db.Model(&entity.League{}).Count(&pgLeaguesCount)
	reports = append(reports, ValidationReport{
		TableName:     "Leagues",
		SupabaseCount: int64(len(data.Leagues)),
		PostgresCount: pgLeaguesCount,
		Matched:       int64(len(data.Leagues)) == pgLeaguesCount,
	})

	// Validate PlayerItems
	var pgPlayerItemsCount int64
	db.Model(&entity.PlayerItem{}).Count(&pgPlayerItemsCount)
	reports = append(reports, ValidationReport{
		TableName:     "PlayerItems",
		SupabaseCount: int64(len(data.PlayerItems)),
		PostgresCount: pgPlayerItemsCount,
		Matched:       int64(len(data.PlayerItems)) == pgPlayerItemsCount,
	})

	// Validate Achievements
	var pgAchievementsCount int64
	db.Model(&entity.Achievement{}).Count(&pgAchievementsCount)
	reports = append(reports, ValidationReport{
		TableName:     "Achievements",
		SupabaseCount: int64(len(data.Achievements)),
		PostgresCount: pgAchievementsCount,
		Matched:       int64(len(data.Achievements)) == pgAchievementsCount,
	})

	// Validate PlayerAchievements
	var pgPlayerAchievementsCount int64
	db.Model(&entity.PlayerAchievement{}).Count(&pgPlayerAchievementsCount)
	reports = append(reports, ValidationReport{
		TableName:     "PlayerAchievements",
		SupabaseCount: int64(len(data.PlayerAchievements)),
		PostgresCount: pgPlayerAchievementsCount,
		Matched:       int64(len(data.PlayerAchievements)) == pgPlayerAchievementsCount,
	})

	// Validate GoldSpaceConversions
	var pgConversionsCount int64
	db.Model(&entity.GoldSpaceConversion{}).Count(&pgConversionsCount)
	reports = append(reports, ValidationReport{
		TableName:     "GoldSpaceConversions",
		SupabaseCount: int64(len(data.Conversions)),
		PostgresCount: pgConversionsCount,
		Matched:       int64(len(data.Conversions)) == pgConversionsCount,
	})

	// Validate DailyEmissions
	var pgDailyEmissionsCount int64
	db.Model(&entity.DailyEmission{}).Count(&pgDailyEmissionsCount)
	reports = append(reports, ValidationReport{
		TableName:     "DailyEmissions",
		SupabaseCount: int64(len(data.DailyEmissions)),
		PostgresCount: pgDailyEmissionsCount,
		Matched:       int64(len(data.DailyEmissions)) == pgDailyEmissionsCount,
	})

	// Validate RewardHistory
	var pgRewardHistoryCount int64
	db.Model(&entity.RewardHistory{}).Count(&pgRewardHistoryCount)
	reports = append(reports, ValidationReport{
		TableName:     "RewardHistory",
		SupabaseCount: int64(len(data.RewardHistory)),
		PostgresCount: pgRewardHistoryCount,
		Matched:       int64(len(data.RewardHistory)) == pgRewardHistoryCount,
	})

	// Validate Orders
	var pgOrdersCount int64
	db.Model(&entity.Order{}).Count(&pgOrdersCount)
	reports = append(reports, ValidationReport{
		TableName:     "Orders",
		SupabaseCount: int64(len(data.Orders)),
		PostgresCount: pgOrdersCount,
		Matched:       int64(len(data.Orders)) == pgOrdersCount,
	})

	return reports
}

// PrintValidationReport prints a formatted validation report
func PrintValidationReport(reports []ValidationReport) {
	fmt.Println("\n" + strings.Repeat("=", 70))
	fmt.Println("VALIDATION REPORT")
	fmt.Println(strings.Repeat("=", 70))
	fmt.Println()

	// Print table header
	fmt.Printf("%-25s %-15s %-15s %-10s\n", "Table", "Supabase", "PostgreSQL", "Status")
	fmt.Println(strings.Repeat("-", 70))

	// Track overall success
	allMatched := true

	// Print each validation result
	for _, report := range reports {
		status := "✅ MATCH"
		if !report.Matched {
			status = "❌ MISMATCH"
			allMatched = false
		}

		fmt.Printf("%-25s %-15d %-15d %-10s\n",
			report.TableName,
			report.SupabaseCount,
			report.PostgresCount,
			status,
		)
	}

	// Print summary
	fmt.Println(strings.Repeat("-", 70))
	if allMatched {
		fmt.Println("\n✅ VALIDATION SUCCESSFUL: All record counts match!")
	} else {
		fmt.Println("\n❌ VALIDATION FAILED: Some record counts do not match!")
		fmt.Println("\nPlease investigate the mismatched tables before proceeding.")
	}
	fmt.Println()
}
