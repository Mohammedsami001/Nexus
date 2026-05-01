# 🤖 NEXUS — Cloud-Deployed Robot Simulation Dashboard

A full-stack, production-grade system that simulates real-time robot sensor data, visualizes it on a live sci-fi web dashboard, detects anomalies using machine learning, and is containerized with Docker for cloud deployment.

![Dashboard Preview](frontend/screenshot.png)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                 CLIENT BROWSER                    │
│  ┌────────────────────────────────────────────┐  │
│  │     NEXUS Command Center (HTML/JS)         │  │
│  │  Gauges │ Radar │ Chart │ Anomaly Log      │  │
│  └─────────────┬──────────────────────────┬───┘  │
│                │ WebSocket                │ REST  │
└────────────────┼──────────────────────────┼──────┘
                 │                          │
┌────────────────▼──────────────────────────▼──────┐
│           FASTAPI BACKEND (Docker)                │
│                                                   │
│  ┌───────────┐    ┌──────────────┐               │
│  │ WebSocket │    │  REST API    │               │
│  │ Manager   │    │  Endpoints   │               │
│  └─────┬─────┘    └──────┬───────┘               │
│        │                 │                        │
│  ┌─────▼─────────────────▼───────┐               │
│  │    Telemetry Buffer (1000)    │               │
│  └──────────────┬────────────────┘               │
│                 │                                 │
│  ┌──────────────▼────────────────┐               │
│  │  Anomaly Detection Engine     │               │
│  │  (IsolationForest / sklearn)  │               │
│  └───────────────────────────────┘               │
│                                                   │
│  ┌───────────────────────────────┐               │
│  │  Robot Sensor Simulator       │               │
│  │  (async background task)      │               │
│  └───────────────────────────────┘               │
└──────────────────────────────────────────────────┘
         Deployed on: AWS EC2 t2.micro
```

---

## 🚀 Quick Start

### Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/your-username/robot-dashboard.git
cd robot-dashboard

# Copy environment config
cp .env.example .env

# Build and run
docker-compose up --build

# Open http://localhost:8000
```

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Run the server
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Open http://localhost:8000
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| GET | `/api/telemetry/latest` | Latest sensor reading |
| GET | `/api/telemetry/history?limit=100` | Last N readings |
| GET | `/api/anomalies` | All detected anomaly events |
| WS | `/ws/telemetry` | Real-time telemetry stream |
| GET | `/docs` | Auto-generated API documentation |

### WebSocket Message Format
```json
{
  "type": "telemetry",
  "timestamp": "2026-05-02T01:30:00Z",
  "proximity_cm": 142.3,
  "speed_mps": 1.2,
  "direction_deg": 270.5,
  "is_anomaly": false,
  "anomaly_score": -0.12
}
```

---

## 🧠 ML Model

**Algorithm:** Isolation Forest (unsupervised, no labeled data needed)

**Feature Vector:** `[proximity_cm, speed_mps, direction_delta, speed_delta]`

**Workflow:**
1. **Warm-up (200 readings):** Collects baseline normal behavior
2. **Training:** Fits IsolationForest on baseline data
3. **Online Inference:** Scores every new reading in real-time
4. **Re-fitting:** Periodically re-trains on recent data (every 500 readings)

---

## 🎨 Dashboard Features

| Feature | Description |
|---------|-------------|
| Speed Gauge | Radial SVG gauge with color transitions (cyan → amber → red) |
| Proximity Radar | Animated circular radar scanner with rotating sweep line |
| Direction Compass | 3D-perspective SVG compass with smooth needle rotation |
| Telemetry Chart | Multi-line Chart.js with gradient fills and glow effects |
| Anomaly Log | Real-time alert panel with slide-in animations |
| Path Visualization | 2D canvas with robot trail, obstacles, and heading indicator |
| Particle Background | Constellation-style animated particle system |
| Connection Status | Live/offline indicator with auto-reconnect |

---

## ☁️ AWS Deployment (EC2 t2.micro)

```bash
# 1. Launch EC2 t2.micro (Amazon Linux 2023)
# 2. SSH into instance
ssh -i your-key.pem ec2-user@<public-ip>

# 3. Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# 4. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Clone and run
git clone https://github.com/your-username/robot-dashboard.git
cd robot-dashboard
cp .env.example .env
docker-compose up --build -d

# 6. Open port 8000 in Security Group (AWS Console)
# 7. Access: http://<ec2-public-ip>:8000
```

---

## 📁 Project Structure

```
robot-dashboard/
├── simulator/
│   ├── __init__.py
│   ├── robot.py          # Sensor simulation (F1-F3, F5-F6)
│   └── anomaly.py        # Anomaly injection (F4)
├── backend/
│   ├── __init__.py
│   ├── main.py           # FastAPI app (B1-B7)
│   ├── websocket.py      # WebSocket manager (B3)
│   ├── telemetry.py      # Buffer + models (B7)
│   └── ml/
│       ├── __init__.py
│       └── model.py      # IsolationForest (M1-M7)
├── frontend/
│   ├── index.html        # Dashboard HTML
│   ├── style.css         # Cyberpunk CSS design system
│   └── app.js            # Interactive components
├── Dockerfile            # Multi-stage build (D1)
├── docker-compose.yml    # Single-command startup (D2)
├── requirements.txt      # Python dependencies
├── .env.example          # Environment config template (D4)
└── README.md
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TICK_RATE_HZ` | `1.0` | Sensor readings per second |
| `ANOMALY_PROBABILITY` | `0.03` | Chance of anomaly injection per tick |
| `BUFFER_SIZE` | `1000` | Max readings in memory |
| `WARMUP_READINGS` | `200` | Readings before ML model trains |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Simulator | Python 3.11, NumPy |
| Backend | FastAPI + Uvicorn |
| ML | scikit-learn (IsolationForest) |
| Frontend | Vanilla HTML/CSS/JS + Chart.js v4 |
| Container | Docker + docker-compose |
| Cloud | AWS EC2 t2.micro (Free Tier) |

---

## 📝 License

MIT License — Built for educational/demonstration purposes.
