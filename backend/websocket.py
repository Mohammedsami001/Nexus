"""
WebSocket Connection Manager (B3, M6)

Manages active WebSocket connections and broadcasts telemetry + anomaly events.
"""

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time telemetry streaming."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        """
        B3/M6: Broadcast data to all connected clients.
        Silently removes dead connections.
        """
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead_connections.append(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)

    @property
    def client_count(self) -> int:
        """Number of active WebSocket clients."""
        return len(self.active_connections)
