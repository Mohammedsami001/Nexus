"""
WebSocket Connection Manager (B3, M6)

Manages active WebSocket connections and broadcasts telemetry + anomaly events.
Uses per-client asyncio queues to avoid concurrent send/receive issues.
"""

import asyncio
import json
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time telemetry streaming."""

    def __init__(self):
        # Map of WebSocket -> asyncio.Queue
        self.active_connections: dict[WebSocket, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection and create its message queue."""
        await websocket.accept()
        self.active_connections[websocket] = asyncio.Queue()

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        self.active_connections.pop(websocket, None)

    async def broadcast(self, data: dict):
        """
        B3/M6: Push data into every client's queue (non-blocking).
        The actual sending happens in each client's send_loop.
        """
        dead = []
        for ws, queue in self.active_connections.items():
            try:
                queue.put_nowait(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_loop(self, websocket: WebSocket):
        """
        Drain the queue for a specific client and send messages.
        Runs as a separate task per client.
        """
        queue = self.active_connections.get(websocket)
        if not queue:
            return
        try:
            while True:
                data = await queue.get()
                await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"send_loop error: {e}")
            pass  # Connection closed; handled by the endpoint

    @property
    def client_count(self) -> int:
        """Number of active WebSocket clients."""
        return len(self.active_connections)
