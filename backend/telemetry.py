"""
Telemetry Buffer & Data Models (B1, B2, B4, B7)

In-memory rolling buffer for sensor readings. No database needed.
"""

from collections import deque
from typing import Optional

from pydantic import BaseModel


class TelemetryReading(BaseModel):
    """Schema for a single sensor reading."""
    timestamp: str
    proximity_cm: float
    speed_mps: float
    direction_deg: float
    speed_delta: float = 0.0
    direction_delta: float = 0.0
    pos_x: float = 500.0
    pos_y: float = 500.0
    tick: int = 0
    anomaly_injected: bool = False
    is_anomaly: bool = False
    anomaly_score: float = 0.0


class AnomalyEvent(BaseModel):
    """Schema for a detected anomaly event."""
    timestamp: str
    proximity_cm: float
    speed_mps: float
    direction_deg: float
    anomaly_score: float
    tick: int = 0


class TelemetryBuffer:
    """
    B7: Rolling in-memory buffer of last N readings.
    Thread-safe via deque's atomic append/pop operations.
    """

    def __init__(self, maxlen: int = 1000):
        self.readings: deque = deque(maxlen=maxlen)
        self.anomalies: list[AnomalyEvent] = []

    def add_reading(self, reading: dict):
        """Add a new telemetry reading to the buffer."""
        self.readings.append(reading)

    def add_anomaly(self, reading: dict):
        """Record a detected anomaly event (B4)."""
        event = AnomalyEvent(
            timestamp=reading["timestamp"],
            proximity_cm=reading["proximity_cm"],
            speed_mps=reading["speed_mps"],
            direction_deg=reading["direction_deg"],
            anomaly_score=reading.get("anomaly_score", 0.0),
            tick=reading.get("tick", 0),
        )
        self.anomalies.append(event)

    def get_latest(self) -> Optional[dict]:
        """B1: Return the most recent reading."""
        if self.readings:
            return self.readings[-1]
        return None

    def get_history(self, limit: int = 100) -> list[dict]:
        """B2: Return the last N readings."""
        items = list(self.readings)
        return items[-limit:]

    def get_anomalies(self) -> list[dict]:
        """B4: Return all detected anomaly events."""
        return [a.model_dump() for a in self.anomalies]

    @property
    def count(self) -> int:
        """Number of readings in the buffer."""
        return len(self.readings)
