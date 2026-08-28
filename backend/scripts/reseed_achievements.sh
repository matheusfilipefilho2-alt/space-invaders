#!/bin/bash

# Script to delete old achievements and reseed with new ones

echo "🧹 Clearing old achievements..."

# Connect to database and delete all achievements
psql $DATABASE_URL -c "DELETE FROM player_achievements;"
psql $DATABASE_URL -c "DELETE FROM achievements;"

echo "✅ Old achievements cleared"
echo ""
echo "🌱 Reseeding achievements..."

# Run seed script
cd /Users/matheuscarmo/Desktop/projects/space-invaders/backend
go run scripts/seed/*.go

echo ""
echo "✅ Achievements reseeded successfully!"
