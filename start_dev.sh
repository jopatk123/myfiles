#!/bin/bash
#
# Local Development Startup Script (No Docker)
#
# This script automates the setup and execution of the Django application
# for local development without relying on Docker.
#
# It will:
# 1. Create and manage a Python virtual environment.
# 2. Install dependencies from requirements.txt.
# 3. Set up a local .env file for development settings.
# 4. Run database migrations.
# 5. Start the Django development server.
#

set -e

VENV_DIR=".venv"
PYTHON_CMD="python3"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python 3
if ! command_exists $PYTHON_CMD; then
    echo "❌ Python 3 is not installed. Please install it to continue."
    exit 1
fi

# --- Virtual Environment Setup ---
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating Python virtual environment in '$VENV_DIR'..."
    $PYTHON_CMD -m venv $VENV_DIR
    echo "✅ Virtual environment created."
fi

echo "🐍 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip >/dev/null

# --- Dependency Installation ---
echo "📦 Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "✅ Dependencies installed."

# --- Environment File Setup ---
if [ ! -f ".env" ]; then
    echo "📝 Creating local .env file..."
    # Generate a new secret key
    SECRET_KEY=$($PYTHON_CMD -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    
    # Create the .env file
    echo "DEBUG=True" > .env
    echo "SECRET_KEY=$SECRET_KEY" >> .env
    echo "DATABASE_URL=sqlite:///db.sqlite3" >> .env
    echo "✅ .env file created with development settings."
else
    echo "✅ Using existing .env file."
fi

# --- Database Migration ---
echo "🗄️  Running database migrations..."
$PYTHON_CMD manage.py migrate

echo "✅ Database is up to date."

# --- Collect Static Files ---
echo "🎨 Collecting static files..."
$PYTHON_CMD manage.py collectstatic --noinput

echo "✅ Static files collected."

# --- Start Development Server ---
echo ""
echo "🚀 Starting Django development server..."
echo "🌐 Access the application at http://127.0.0.1:8000"
echo "🛑 Press CTRL+C to stop the server."
echo ""

$PYTHON_CMD manage.py runserver

echo "👋 Server stopped."
