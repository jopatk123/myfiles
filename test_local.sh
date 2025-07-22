#!/bin/bash

# Local testing script for personal cloud project
set -e

echo "🧪 Starting local testing..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Build the application
echo "🔨 Building the application..."
docker compose build

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Run migrations
echo "🗄️  Running database migrations..."
docker compose exec web python manage.py migrate

# Show status
echo "📊 Container status:"
docker compose ps

# Test if the application is responding
echo "🔍 Testing application response..."
sleep 3
if curl -f http://localhost:8000 > /dev/null 2>&1; then
    echo "✅ Application is responding!"
    echo "🌐 Open http://localhost:8000 in your browser to test"
else
    echo "⚠️  Application might still be starting up"
    echo "🌐 Try opening http://localhost:8000 in your browser in a few seconds"
fi

echo ""
echo "📝 To stop the application, run: docker compose down"
echo "📝 To view logs, run: docker compose logs -f"