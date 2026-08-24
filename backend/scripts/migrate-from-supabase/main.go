package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Parse command line flags
	dryRun := flag.Bool("dry-run", false, "Extract and transform only, do not load data")
	flag.Parse()

	// Load environment variables from backend/.env
	envPath := "../../.env"
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: No .env file found at %s, using environment variables", envPath)
	}

	// Validate required Supabase credentials
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("ERROR: SUPABASE_URL and SUPABASE_KEY environment variables are required")
	}

	// Get database URL
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("ERROR: DATABASE_URL environment variable is required")
	}

	ctx := context.Background()

	// Print migration header
	printHeader()

	// Phase 1: Extract from Supabase
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("PHASE 1: EXTRACT DATA FROM SUPABASE")
	fmt.Println(strings.Repeat("=", 60))
	
	client := NewSupabaseClient(supabaseURL, supabaseKey)
	extractedData, err := ExtractAllData(client)
	if err != nil {
		log.Fatalf("Extraction failed: %v", err)
	}
	
	PrintExtractionSummary(extractedData)

	// Phase 2: Transform data
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("PHASE 2: TRANSFORM DATA")
	fmt.Println(strings.Repeat("=", 60))
	
	transformedData, err := TransformData(extractedData)
	if err != nil {
		log.Fatalf("Transformation failed: %v", err)
	}
	
	PrintTransformationSummary(transformedData)

	// If dry-run, stop here
	if *dryRun {
		fmt.Println("\n" + strings.Repeat("=", 60))
		fmt.Println("DRY RUN MODE: Skipping database load")
		fmt.Println(strings.Repeat("=", 60))
		fmt.Println("\nMigration dry-run completed successfully!")
		fmt.Println("To perform actual migration, run without --dry-run flag")
		return
	}

	// Phase 3: Load into PostgreSQL
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("PHASE 3: LOAD DATA INTO POSTGRESQL")
	fmt.Println(strings.Repeat("=", 60))

	// Connect to database
	db, err := connectDatabase(databaseURL)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// Auto-migrate tables
	if err := autoMigrateTables(db); err != nil {
		log.Fatalf("Auto-migration failed: %v", err)
	}

	// Load data
	if err := LoadData(ctx, db, transformedData); err != nil {
		log.Fatalf("Load failed: %v", err)
	}

	// Phase 4: Validate Migration
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("PHASE 4: VALIDATE MIGRATION")
	fmt.Println(strings.Repeat("=", 60))
	
	validationReports := ValidateMigration(ctx, db, transformedData)
	PrintValidationReport(validationReports)

	// Check if all validations passed
	allMatched := true
	for _, report := range validationReports {
		if !report.Matched {
			allMatched = false
			break
		}
	}

	// Print final success message only if validation passed
	if allMatched {
		fmt.Println("\n" + strings.Repeat("=", 60))
		fmt.Println("MIGRATION COMPLETED SUCCESSFULLY")
		fmt.Println(strings.Repeat("=", 60))
		fmt.Println("\nAll data has been successfully migrated from Supabase to PostgreSQL!")
		fmt.Println("\nNext steps:")
		fmt.Println("1. Test application with PostgreSQL backend")
		fmt.Println("2. Update application configuration to use PostgreSQL")
		fmt.Println("3. Decommission Supabase instance")
	} else {
		fmt.Println("\n" + strings.Repeat("=", 60))
		fmt.Println("MIGRATION COMPLETED WITH VALIDATION ERRORS")
		fmt.Println(strings.Repeat("=", 60))
		fmt.Println("\nData has been loaded, but validation found mismatches.")
		fmt.Println("Please investigate the issues before proceeding.")
	}
}

// connectDatabase creates a database connection
func connectDatabase(databaseURL string) (*gorm.DB, error) {
	log.Println("Connecting to PostgreSQL database...")

	// Try to use existing database infrastructure if available
	// Check if we can use the DBClient from internal/infra/database
	readDSN := databaseURL
	writeDSN := databaseURL

	dbClient, err := database.NewDBClient(readDSN, writeDSN)
	if err != nil {
		// Fallback to direct GORM connection
		log.Println("Using direct GORM connection...")
		db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to database: %w", err)
		}
		log.Println("✓ Connected to PostgreSQL")
		return db, nil
	}

	log.Println("✓ Connected to PostgreSQL using DBClient")
	return dbClient.WriteDB, nil
}

// autoMigrateTables creates all required tables
func autoMigrateTables(db *gorm.DB) error {
	log.Println("Running auto-migration for all tables...")

	// Migrate all entity types in dependency order
	entities := []interface{}{
		&entity.League{},
		&entity.Player{},
		&entity.PlayerItem{},
		&entity.Achievement{},
		&entity.PlayerAchievement{},
		&entity.GoldSpaceConversion{},
		&entity.DailyEmission{},
		&entity.RewardHistory{},
		&entity.Order{},
	}

	for _, e := range entities {
		if err := db.AutoMigrate(e); err != nil {
			return fmt.Errorf("failed to migrate %T: %w", e, err)
		}
	}

	log.Println("✓ All tables created/updated successfully")
	return nil
}

// printHeader prints the migration header
func printHeader() {
	banner := `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        SPACE INVADERS - SUPABASE TO POSTGRESQL MIGRATION     ║
║                                                              ║
║  This script will migrate all data from Supabase to          ║
║  PostgreSQL using the ETL (Extract-Transform-Load) pattern.  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`
	fmt.Println(banner)
}
