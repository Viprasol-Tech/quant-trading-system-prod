# Quant Trading Framework - IBKR Integration

Production-ready multi-strategy quantitative trading system with real-time IBKR Gateway integration, browser-based monitoring, and automated trading capabilities.

**Status:** ✅ LIVE on 46.202.89.48

## Quick Start

### Access the System

```
noVNC Browser Interface: http://46.202.89.48:6080/
Frontend Dashboard:      http://46.202.89.48:6205/
Backend API:             http://46.202.89.48:6005/api/health
Python Service:          http://46.202.89.48:6105/health
```

## Features

### Trading Strategies

1. **Trend Breakout** - MA alignment + S/R breakout + volume confirmation
2. **Pullback Reversion** - Fib retracements + RSI turn + volume decline
3. **Hybrid Composite** - Composite scoring with adaptive regime behavior

### Risk Management

- Position sizing (Kelly-adjusted)
- Portfolio heat limit (7% max)
- Sector concentration limits (25% max)
- Drawdown guard (graduated reduction)
- Multiple stop methods (ATR, fixed %, trailing)

### Technical Analysis

- 5 indicator modules (Trend, Momentum, Volatility, Volume, Fibonacci)
- Pattern recognition (6 chart patterns)
- Support/Resistance detection
- Multi-timeframe analysis
- Market regime detection

### Compliance

- Shariah asset screening
- Long-only enforcement
- Trade validation
- Complete audit trail

## Architecture

```
React Frontend (6205)
       ↓
Fastify Backend (6005)
       ↓
Flask Python Service (6105)
       ↓
IBKR Gateway + noVNC (4002/6080)
```

## Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| ib-gateway | 4002, 5900, 6080 | IBKR + IBC + noVNC |
| python-service | 6105 | Flask API bridge |
| backend | 6005 | REST API |
| frontend | 6205 | React dashboard |
| postgres | 5432 | Database |

## Deployment

```bash
# Start system
docker compose up -d

# View logs
docker logs -f ib-gateway

# Check health
curl http://localhost:6005/api/health
```

## Credentials

```
IB Username: alharthy2026
IB Password: Nasra_2026
Trading Mode: Paper
```

## API Endpoints

- `GET /api/positions` - Open positions
- `GET /api/orders` - Order history
- `POST /api/orders` - Submit order
- `GET /api/market/:symbol` - Market data
- `GET /api/signals` - Trading signals
- `GET /api/risk/metrics` - Risk metrics
- `GET /api/health` - System health

## Browser Access (noVNC)

1. Visit http://46.202.89.48:6080/
2. Click "Connect"
3. Watch IB Gateway initialize
4. Monitor trading via GUI or API

## Project Structure

```
packages/
  ├── backend/          # Fastify TypeScript API
  ├── frontend/         # React Vite dashboard
  └── python-service/   # Flask IBKR bridge
Dockerfile.ibkr-novnc  # IBKR container
docker-compose.yml     # Orchestration
```

## Verification

- ✅ All 5 containers running
- ✅ All ports listening (4002, 5900, 6080, 6005, 6105, 6205)
- ✅ All APIs responding
- ✅ noVNC accessible
- ✅ IB Gateway visible
- ✅ Auto-login successful

## Status

**Deployment Date:** April 8, 2026  
**Status:** OPERATIONAL  
**Server:** 46.202.89.48  

System ready for live trading!
