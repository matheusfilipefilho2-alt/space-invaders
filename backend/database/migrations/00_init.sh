#!/bin/bash
# Initialize database with all migrations in order

set -e

echo "Running Space Invaders migrations..."

# Run migrations in order
for sql_file in /docker-entrypoint-initdb.d/2*.sql; do
    if [ -f "$sql_file" ]; then
        echo "Applying $(basename $sql_file)..."
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$sql_file"
    fi
done

echo "All migrations applied successfully!"
