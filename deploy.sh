#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting deployment..."

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from repository..."
    git pull origin main || git pull origin master || echo "⚠️  Git pull failed or not configured"
fi

# Stop and remove existing containers
if [ "$(docker compose ps -q)" ]; then
    echo "🛑 Stopping existing containers..."
    docker compose down
fi

# Remove old images to ensure fresh build
echo "🧹 Cleaning up old Docker images..."
docker compose build --no-cache

# Start the services in detached mode
echo "🔄 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose exec web python manage.py migrate

# Collect static files (for production)
echo "📦 Collecting static files..."
docker compose exec web python manage.py collectstatic --noinput || echo "⚠️  Static files collection skipped"

# Show running containers
echo "📊 Current running containers:"
docker compose ps

echo "✅ Deployment finished successfully!"
echo "🌐 Your application should be available at: http://localhost:8000"
