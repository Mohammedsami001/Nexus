"""
Anomaly Injection Module (F4)

Randomly injects anomalies into sensor readings to test the ML pipeline.
Three anomaly types: speed spike, proximity collision risk, erratic turning.
"""

import random


class AnomalyInjector:
    """Injects realistic anomalies into robot sensor readings."""

    def __init__(self, probability: float = 0.03):
        """
        Args:
            probability: Chance of injecting an anomaly per tick (default 3%).
        """
        self.probability = probability
        self.active_anomaly = None
        self.anomaly_ticks_remaining = 0

    def should_inject(self) -> bool:
        """Determine if an anomaly should be injected this tick."""
        if self.anomaly_ticks_remaining > 0:
            return True
        return random.random() < self.probability

    def inject(self, reading: dict) -> dict:
        """
        Potentially inject an anomaly into the given sensor reading.

        Args:
            reading: Current sensor reading dict with proximity_cm, speed_mps, direction_deg.

        Returns:
            Modified reading with anomaly applied (if triggered).
        """
        if self.anomaly_ticks_remaining <= 0:
            if not self.should_inject():
                reading["anomaly_injected"] = False
                return reading

            # Pick a random anomaly type and set duration
            self.active_anomaly = random.choice([
                "speed_spike",
                "proximity_collision",
                "erratic_turning",
            ])
            self.anomaly_ticks_remaining = random.randint(2, 5)

        # Apply the active anomaly
        self.anomaly_ticks_remaining -= 1

        if self.active_anomaly == "speed_spike":
            # Sudden speed jump well outside normal range (0–2.5 m/s)
            reading["speed_mps"] = random.uniform(4.0, 6.0)

        elif self.active_anomaly == "proximity_collision":
            # Dangerously close to obstacle
            reading["proximity_cm"] = random.uniform(1.0, 10.0)

        elif self.active_anomaly == "erratic_turning":
            # Wild direction change (normal delta is ~5-15 deg)
            current = reading["direction_deg"]
            delta = random.uniform(90, 180) * random.choice([-1, 1])
            reading["direction_deg"] = (current + delta) % 360

        reading["anomaly_injected"] = True

        if self.anomaly_ticks_remaining <= 0:
            self.active_anomaly = None

        return reading
