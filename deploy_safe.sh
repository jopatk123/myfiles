#!/bin/bash

# Extra safe deployment script
set -e

echo "🚀 Starting safe deployment..."

# Show current project info
echo "📋 Current project info:"
echo "   Directory: $(pwd)"
echo "   Project name: $(basename $(pwd))"

# Show what containers will be affected
echo "🔍 Containers that will be managed by this script:"
if [ "$(docker compose ps -q)" ]; then
    docker compose ps
else
    echo "   No existing containers for this project"
fi

# Ask for confirmation in interactive mode
if [ -t 0 ]; then
    echo ""
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from repository..."
    git pull origin main || git pull origin master || echo "⚠️  Git pull failed or not configured"
fi

# Stop and remove existing containers (only for this project)
if [ "$(docker compose ps -q)" ]; then
    echo "🛑 Stopping existing containers for this project..."
    docker compose down
fi

# Remove old images to ensure fresh build
echo "🧹 Building fresh images..."
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

# Show final status
echo "📊 Final container status:"
docker compose ps

echo ""
echo "✅ Deployment finished successfully!"
echo "🌐 Your application should be available at: http://localhost:8000"
echo ""
echo "📝 Other running containers (not affected):"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v $(basename $(pwd)) || echo "   No other containers running"