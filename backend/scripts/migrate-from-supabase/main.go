package main

import (
	"flag"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Parse command-line flags
	dryRun := flag.Bool("dry-run", true, "Run extraction without saving to database (just save JSON files)")
	verbose := flag.Bool("verbose", false, "Enable verbose logging")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: No .env file found, using environment variables")
	}

	// Set up logging
	if *verbose {
		log.SetFlags(log.LstdFlags | log.Lshortfile)
	} else {
		log.SetFlags(log.LstdFlags)
	}

	log.Println("Starting Supabase data extraction...")
	log.Printf("Dry run mode: %v\n", *dryRun)

	// Get Supabase credentials from environment
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
	}

	// Create Supabase client
	client := NewSupabaseClient(supabaseURL, supabaseKey)
	log.Println("✓ Connected to Supabase successfully")

	// Extract all data
	data, err := ExtractAllData(client)
	if err != nil {
		log.Fatalf("Failed to extract data: %v", err)
	}

	// Print summary
	PrintExtractionSummary(data)

	if *dryRun {
		log.Println("\n✅ Dry run completed successfully!")
		log.Println("Data has been saved to JSON files in the extracted/ directory")
		log.Println("Review the files before proceeding with transformation and loading")
		return
	}

	log.Println("\n✅ Extraction completed successfully!")
	log.Println("Next steps:")
	log.Println("1. Review the extracted JSON files in the extracted/ directory")
	log.Println("2. Run the transformation script: go run transform.go")
	log.Println("3. Run the load script: go run load.go")
}
