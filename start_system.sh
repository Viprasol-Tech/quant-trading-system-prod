#!/bin/bash

set -e

echo "🚀 STARTING COMPLETE TRADING SYSTEM..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📋 Please create .env file from .env.example:"
    echo "   cp .env.example .env"
    echo "   Edit .env with your IBKR credentials"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed"
    exit 1
fi

echo "✅ Docker available"
echo ""

# Build images
echo "1️⃣  Building Docker images..."
docker compose build --no-cache
echo "✅ Images built"
echo ""

# Start services
echo "2️⃣  Starting services..."
docker compose up -d
echo "✅ Services started"
echo ""

# Wait for services
echo "3️⃣  Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "4️⃣  Service status:"
docker compose ps
echo ""

# Initialize database
echo "5️⃣  Initializing database..."
sleep 5
docker exec -i postgres psql -U postgres -d postgres -c "CREATE DATABASE trading_db;" 2>/dev/null || true
docker exec -i postgres psql -U postgres -d trading_db < packages/python-service/schema.sql
echo "✅ Database initialized"
echo ""

# Final checks
echo "6️⃣  Final checks:"
echo ""

echo "  Checking endpoints..."
curl -s http://localhost:6005/api/health > /dev/null && echo "  ✅ Backend (6005)" || echo "  ⚠️  Backend (6005) not ready yet"
curl -s http://localhost:6105/health > /dev/null && echo "  ✅ Python (6105)" || echo "  ⚠️  Python (6105) not ready yet"
curl -s http://localhost:6205 > /dev/null && echo "  ✅ Frontend (6205)" || echo "  ⚠️  Frontend (6205) not ready yet"

echo ""
echo "="
echo "✅ SYSTEM STARTED!"
echo "="
echo ""
echo "🌐 ACCESS POINTS:"
echo "  Frontend:    http://localhost:6205"
echo "  Backend API: http://localhost:6005"
echo "  Python API:  http://localhost:6105"
echo ""
echo "📊 Services:"
docker compose ps
echo ""
echo "📝 Next steps:"
echo "  1. Open http://localhost:6205 in your browser"
echo "  2. Wait for IBKR connection (check logs)"
echo "  3. Go to Strategies tab"
echo "  4. Click 'Generate Signals'"
echo "  5. Click 'Execute' on a signal"
echo ""
echo "📋 View logs:"
echo "  docker compose logs -f ib-gateway      # IBKR Gateway"
echo "  docker compose logs -f python-service  # Python Service"
echo "  docker compose logs -f backend         # Backend"
echo "  docker compose logs -f postgres        # Database"
echo ""
echo "🛑 Stop system:"
echo "  docker compose down"
echo ""
