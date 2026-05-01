"""
FastAPI Application Entry Point (B1–B7, D5)

Main server that orchestrates:
- Robot sensor simulator (background task)
- REST API endpoints
- WebSocket telemetry streaming
- ML anomaly detection pipeline
- Static frontend serving
"""

import os
import time
import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from simulator.robot import RobotSimulator
from backend.telemetry import TelemetryBuffer
from backend.websocket import ConnectionManager
from backend.ml.model import AnomalyDetector

# Load environment config (D4)
load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────
TICK_RATE_HZ = float(os.getenv("TICK_RATE_HZ", "1.0"))
ANOMALY_PROBABILITY = float(os.getenv("ANOMALY_PROBABILITY", "0.03"))
BUFFER_SIZE = int(os.getenv("BUFFER_SIZE", "1000"))
WARMUP_READINGS = int(os.getenv("WARMUP_READINGS", "200"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("robot-dashboard")

# ── Application Setup ─────────────────────────────────────────────────
app = FastAPI(
    title="Robot Simulation Dashboard",
    description="Real-time robot telemetry with ML anomaly detection",
    version="1.0.0",
)

# B6: CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared State ──────────────────────────────────────────────────────
simulator = RobotSimulator(
    tick_rate_hz=TICK_RATE_HZ,
    anomaly_probability=ANOMALY_PROBABILITY,
)
buffer = TelemetryBuffer(maxlen=BUFFER_SIZE)
ws_manager = ConnectionManager()
anomaly_detector = AnomalyDetector(warmup_readings=WARMUP_READINGS)

START_TIME = time.time()


# ── Background Simulator Task ────────────────────────────────────────
async def simulator_loop():
    """
    Continuously generates sensor readings, runs ML inference,
    stores in buffer, and broadcasts via WebSocket.
    """
    logger.info(
        "Simulator started │ tick_rate=%.1f Hz │ anomaly_prob=%.2f",
        TICK_RATE_HZ,
        ANOMALY_PROBABILITY,
    )

    while True:
        # Generate reading
        reading = simulator.generate_reading()

        # ML inference (M4)
        is_anomaly, anomaly_score = anomaly_detector.predict(reading)
        reading["is_anomaly"] = is_anomaly
        reading["anomaly_score"] = anomaly_score

        # Store in buffer (B7)
        buffer.add_reading(reading)

        # Record anomaly event (B4)
        if is_anomaly:
            buffer.add_anomaly(reading)
            logger.warning(
                "ANOMALY DETECTED │ tick=%d │ score=%.4f │ prox=%.1f │ speed=%.2f │ dir=%.1f",
                reading["tick"],
                anomaly_score,
                reading["proximity_cm"],
                reading["speed_mps"],
                reading["direction_deg"],
            )

        # Broadcast via WebSocket (B3, M6)
        ws_data = {**reading, "type": "anomaly" if is_anomaly else "telemetry"}
        await ws_manager.broadcast(ws_data)

        # Log periodically
        if reading["tick"] % 50 == 0:
            ml_status = anomaly_detector.status
            logger.info(
                "TICK %d │ buffer=%d │ clients=%d │ ml_trained=%s │ warmup=%d/%d",
                reading["tick"],
                buffer.count,
                ws_manager.client_count,
                ml_status["is_trained"],
                ml_status["warmup_progress"],
                ml_status["warmup_target"],
            )

        await asyncio.sleep(simulator.tick_interval)


@app.on_event("startup")
async def startup():
    """Launch the simulator background task on server startup."""
    asyncio.create_task(simulator_loop())
    logger.info("═══════════════════════════════════════════════════")
    logger.info("  Robot Simulation Dashboard — Server Starting")
    logger.info("  Port: 8000 │ Tick Rate: %.1f Hz", TICK_RATE_HZ)
    logger.info("═══════════════════════════════════════════════════")


# ── REST API Endpoints ────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """B5: Health check for load balancer."""
    return {
        "status": "ok",
        "uptime_s": round(time.time() - START_TIME, 1),
        "readings_count": buffer.count,
        "ws_clients": ws_manager.client_count,
        "ml_status": anomaly_detector.status,
    }


@app.get("/api/telemetry/latest")
async def get_latest():
    """B1: Return the most recent sensor reading."""
    latest = buffer.get_latest()
    if latest is None:
        return {"error": "No readings yet", "status": "warming_up"}
    return latest


@app.get("/api/telemetry/history")
async def get_history(limit: int = Query(default=100, ge=1, le=1000)):
    """B2: Return the last N readings."""
    return buffer.get_history(limit=limit)


@app.get("/api/anomalies")
async def get_anomalies():
    """B4: Return all detected anomaly events."""
    return buffer.get_anomalies()


# ── WebSocket Endpoint ───────────────────────────────────────────────

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """B3: Real-time telemetry stream via WebSocket."""
    await ws_manager.connect(websocket)
    logger.info("WebSocket client connected │ total=%d", ws_manager.client_count)

    # Run send loop (queue → client) concurrently with receive loop (keepalive)
    send_task = asyncio.create_task(ws_manager.send_loop(websocket))

    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        send_task.cancel()
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected │ total=%d", ws_manager.client_count)


# ── Static Frontend Serving (D5) ─────────────────────────────────────
# Serve frontend files at root. This must be AFTER API routes.

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

if os.path.isdir(frontend_dir):
    @app.get("/")
    async def serve_index():
        """Serve the dashboard HTML."""
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
