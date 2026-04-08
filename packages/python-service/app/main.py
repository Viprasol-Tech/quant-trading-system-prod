import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Python computation service starting...")
    yield
    logger.info("Python computation service shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Trading Computation Service",
    description="Python microservice for backtesting, signal generation, and ML models",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "trading-computation",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Trading Computation Service",
        "version": "1.0.0",
        "status": "running"
    }

# Include routers (to be implemented)
@app.get("/api/signals")
async def signals_placeholder():
    return {"message": "Signal endpoints coming soon"}

@app.post("/api/backtest")
async def backtest_placeholder():
    return {"message": "Backtest endpoints coming soon"}

@app.post("/api/ml")
async def ml_placeholder():
    return {"message": "ML endpoints coming soon"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
