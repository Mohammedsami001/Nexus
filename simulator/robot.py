"""
Robot Sensor Simulator (F1–F3, F5–F6)

Generates realistic, noisy robot telemetry at a configurable tick rate.
Sensors: proximity (cm), speed (m/s), direction (degrees).
Uses smooth interpolation for natural movement patterns.
"""

import math
import random
import time
from datetime import datetime, timezone

import numpy as np

from simulator.anomaly import AnomalyInjector


class RobotSimulator:
    """Simulates a robot's sensor readings with realistic physics and noise."""

    def __init__(
        self,
        tick_rate_hz: float = 1.0,
        anomaly_probability: float = 0.03,
        noise_sigma: float = 1.0,
    ):
        """
        Args:
            tick_rate_hz: Readings per second (F5).
            anomaly_probability: Chance of anomaly injection per tick (F4).
            noise_sigma: Gaussian noise multiplier for all sensors (F6).
        """
        self.tick_rate_hz = tick_rate_hz
        self.noise_sigma = noise_sigma

        # --- Proximity Sensor State (F1) ---
        # Range: 0–500 cm. Wanders smoothly with occasional obstacle events.
        self.proximity = 250.0
        self.proximity_target = 250.0
        self.proximity_smoothing = 0.08  # Lower = smoother transitions

        # --- Speed Sensor State (F2) ---
        # Range: 0–3.0 m/s. Smooth acceleration/deceleration curves.
        self.speed = 0.5
        self.speed_target = 1.0
        self.speed_smoothing = 0.06

        # --- Direction Sensor State (F3) ---
        # Range: 0–360 degrees. Smooth turning with angular velocity.
        self.direction = 0.0
        self.angular_velocity = 0.0  # degrees per tick
        self.angular_velocity_target = 0.0

        # Previous values for delta calculations (used by ML)
        self.prev_speed = self.speed
        self.prev_direction = self.direction

        # Anomaly injector (F4)
        self.anomaly_injector = AnomalyInjector(probability=anomaly_probability)

        # Tick counter
        self.tick_count = 0

        # Robot position for path visualization (UI9)
        self.pos_x = 500.0  # Start in middle of a 1000x1000 grid
        self.pos_y = 500.0

    def _update_proximity(self) -> float:
        """F1: Simulate proximity to nearest obstacle with smooth wandering."""
        # Randomly shift target proximity
        if random.random() < 0.05:
            # Occasional obstacle approach event (~5% per tick)
            self.proximity_target = random.uniform(20.0, 80.0)
        elif random.random() < 0.1:
            # Normal wandering
            self.proximity_target = random.uniform(50.0, 450.0)

        # Smooth interpolation toward target
        self.proximity += (self.proximity_target - self.proximity) * self.proximity_smoothing

        # Apply Gaussian noise (F6)
        noise = np.random.normal(0, 3.0 * self.noise_sigma)
        value = self.proximity + noise

        # Clamp to valid range
        return max(0.0, min(500.0, value))

    def _update_speed(self) -> float:
        """F2: Simulate speed with smooth acceleration/deceleration."""
        # Randomly shift target speed
        if random.random() < 0.08:
            self.speed_target = random.uniform(0.0, 2.5)

        # Smooth acceleration/deceleration (exponential moving average)
        self.speed += (self.speed_target - self.speed) * self.speed_smoothing

        # Apply Gaussian noise (F6)
        noise = np.random.normal(0, 0.05 * self.noise_sigma)
        value = self.speed + noise

        # Clamp to valid range
        return max(0.0, min(3.0, value))

    def _update_direction(self) -> float:
        """F3: Simulate heading with smooth turning behavior."""
        # Randomly shift angular velocity target
        if random.random() < 0.1:
            self.angular_velocity_target = random.uniform(-15.0, 15.0)

        # Smooth angular velocity change
        self.angular_velocity += (
            self.angular_velocity_target - self.angular_velocity
        ) * 0.1

        # Apply angular velocity to direction
        self.direction = (self.direction + self.angular_velocity) % 360

        # Apply Gaussian noise (F6)
        noise = np.random.normal(0, 1.0 * self.noise_sigma)
        value = (self.direction + noise) % 360

        return value

    def _update_position(self, speed: float, direction: float):
        """Update robot position for path visualization (UI9)."""
        rad = math.radians(direction)
        # Scale speed for visible movement on canvas
        self.pos_x += math.cos(rad) * speed * 5.0
        self.pos_y += math.sin(rad) * speed * 5.0
        # Wrap around boundaries (1000x1000 grid)
        self.pos_x = self.pos_x % 1000
        self.pos_y = self.pos_y % 1000

    def generate_reading(self) -> dict:
        """
        Generate one tick of sensor data.

        Returns:
            Dict with timestamp, sensor values, anomaly flag, position, and deltas.
        """
        self.tick_count += 1

        # Store previous values for delta calculation
        self.prev_speed = self.speed
        self.prev_direction = self.direction

        # Update sensor values — float() converts numpy.float64 → Python float for JSON
        proximity = float(round(self._update_proximity(), 1))
        speed = float(round(self._update_speed(), 2))
        direction = float(round(self._update_direction(), 1))

        # Calculate deltas (used by ML feature vector M2)
        speed_delta = float(round(speed - self.prev_speed, 3))
        direction_delta = float(round(
            min(
                abs(direction - self.prev_direction),
                360 - abs(direction - self.prev_direction),
            ),
            1,
        ))

        # Update position for path viz
        self._update_position(speed, direction)

        # Build reading
        reading = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "proximity_cm": proximity,
            "speed_mps": speed,
            "direction_deg": direction,
            "speed_delta": speed_delta,
            "direction_delta": direction_delta,
            "pos_x": float(round(self.pos_x, 1)),
            "pos_y": float(round(self.pos_y, 1)),
            "tick": self.tick_count,
            "anomaly_injected": False,
        }

        # Apply anomaly injection (F4)
        reading = self.anomaly_injector.inject(reading)

        return reading

    @property
    def tick_interval(self) -> float:
        """Seconds between ticks (F5)."""
        return 1.0 / self.tick_rate_hz
