#!/bin/sh

echo "Starting LDC Shop..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h db -p 5432 -U postgres 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit push

# Start the application
echo "Starting Next.js server..."
node server.js
