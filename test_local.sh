#!/bin/bash

# Local testing script for personal cloud project
# This script now uses production-like configuration for better testing
set -e

echo "🧪 Starting local production-like testing..."

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

# Choose testing mode
echo "🔧 Choose testing mode:"
echo "   1) Development mode (Django runserver, DEBUG=True)"
echo "   2) Production-like mode (Nginx + Gunicorn, DEBUG=False)"
echo ""
read -p "Enter choice (1/2) [default: 1]: " choice
choice=${choice:-1}

if [ "$choice" = "2" ]; then
    COMPOSE_FILE="docker-compose.local-prod.yml"
    TEST_URL="http://localhost:8080"
    echo "🏭 Using production-like configuration..."
else
    COMPOSE_FILE="docker-compose.yml"
    TEST_URL="http://localhost:8000"
    echo "🛠️  Using development configuration..."
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose -f $COMPOSE_FILE down 2>/dev/null || true
docker compose down 2>/dev/null || true

# Build the application
echo "🔨 Building the application..."
docker compose -f $COMPOSE_FILE build

# Start services
echo "🚀 Starting services..."
docker compose -f $COMPOSE_FILE up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run migrations (only for development mode, production mode handles this automatically)
if [ "$choice" = "1" ]; then
    echo "🗄️  Running database migrations..."
    docker compose -f $COMPOSE_FILE exec web python manage.py migrate
fi

# Show status
echo "📊 Container status:"
docker compose -f $COMPOSE_FILE ps

# Test if the application is responding
echo "🔍 Testing application response..."
sleep 5
for i in {1..10}; do
    if curl -f $TEST_URL > /dev/null 2>&1; then
        echo "✅ Application is responding!"
        echo "🌐 Open $TEST_URL in your browser to test"
        break
    elif [ $i -eq 10 ]; then
        echo "⚠️  Application might still be starting up"
        echo "🌐 Try opening $TEST_URL in your browser in a few seconds"
        echo "🔧 Check logs with: docker compose -f $COMPOSE_FILE logs"
    else
        echo "⏳ Waiting for application... ($i/10)"
        sleep 3
    fi
done

echo ""
echo "📝 Management commands:"
echo "   🛑 Stop: docker compose -f $COMPOSE_FILE down"
echo "   📋 Logs: docker compose -f $COMPOSE_FILE logs -f"
echo "   🔄 Restart: docker compose -f $COMPOSE_FILE restart"
if [ "$choice" = "2" ]; then
    echo ""
    echo "🏭 Production-like mode features:"
    echo "   ✅ Nginx reverse proxy"
    echo "   ✅ Gunicorn WSGI server"
    echo "   ✅ DEBUG=False"
    echo "   ✅ Static files served by Nginx"
    echo "   ✅ Similar to production environment"
fi