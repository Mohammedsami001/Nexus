"""
Anomaly Detection Engine
IsolationForest-based unsupervised anomaly detection on robot sensor streams.
Warm-up period: trains on first 200 readings, then scores every new reading.
"""

import os
import logging
from typing import Optional

import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


class AnomalyDetector:

    def __init__(
        self,
        warmup_readings: int = 200,
        contamination: float = 0.05,
        model_path: str = "backend/ml/model.pkl",
    ):
        self.warmup_readings = warmup_readings
        self.contamination = contamination
        self.model_path = model_path
        self.model: Optional[IsolationForest] = None
        self.warmup_buffer: list[list[float]] = []
        self.is_trained = False
        self.readings_since_train = 0
        self.refit_interval = 500  # Re-fit every N readings (optional enhancement)

        # Phase 3: Simple Moving Average (SMA) for noise filtering
        self.sma_window_size = 3
        self.recent_features_buffer: list[list[float]] = []

        # Try to load existing model (M7)
        self._try_load_model()

    def _try_load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                self.is_trained = True
                logger.info("Loaded existing anomaly detection model from %s", self.model_path)
            except Exception as e:
                logger.warning("Failed to load model: %s", e)

    def _extract_features(self, reading: dict) -> list[float]:
        return [
            reading.get("proximity_cm", 0.0),
            reading.get("speed_mps", 0.0),
            reading.get("direction_delta", 0.0),
            reading.get("speed_delta", 0.0),
        ]

    def _train(self):
        """Train the IsolationForest on the warm-up buffer."""
        X = np.array(self.warmup_buffer)
        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42,
            n_jobs=1,
        )
        self.model.fit(X)
        self.is_trained = True
        self.readings_since_train = 0

        # M7: Save trained model
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            joblib.dump(self.model, self.model_path)
            logger.info(
                "Anomaly model trained on %d readings and saved to %s",
                len(self.warmup_buffer),
                self.model_path,
            )
        except Exception as e:
            logger.warning("Failed to save model: %s", e)

    def predict(self, reading: dict) -> tuple[bool, float]:

        raw_features = self._extract_features(reading)

        # Phase 3: Apply Simple Moving Average (SMA) filter to smooth spikes
        self.recent_features_buffer.append(raw_features)
        if len(self.recent_features_buffer) > self.sma_window_size:
            self.recent_features_buffer.pop(0)

        # Calculate the mean of the recent features window
        features = np.mean(self.recent_features_buffer, axis=0).tolist()

        # M3: Still in warm-up period
        if not self.is_trained:
            self.warmup_buffer.append(features)
            if len(self.warmup_buffer) >= self.warmup_readings:
                self._train()
            return False, 0.0

        # M4: Online inference
        X = np.array([features])
        prediction = self.model.predict(X)[0]  # 1 = normal, -1 = anomaly
        score = self.model.decision_function(X)[0]  # More negative = more anomalous

        is_anomaly = bool(prediction == -1)

        # Optional: Re-fit model periodically to adapt to new normal
        self.readings_since_train += 1
        self.warmup_buffer.append(features)
        if self.readings_since_train >= self.refit_interval:
            # Use last warmup_readings * 2 readings for refitting
            recent = self.warmup_buffer[-(self.warmup_readings * 2):]
            self.warmup_buffer = recent
            self._train()

        return is_anomaly, round(float(score), 4)

    @property
    def status(self) -> dict:
        """Return model status for health check."""
        return {
            "is_trained": self.is_trained,
            "warmup_progress": min(len(self.warmup_buffer), self.warmup_readings),
            "warmup_target": self.warmup_readings,
            "readings_since_train": self.readings_since_train,
        }
