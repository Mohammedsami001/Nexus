# Product Requirements Document
## Cloud-Deployed Robot Simulation Dashboard

**Version:** 1.0  
**Date:** May 2026  
**Status:** Active Development

---

## Executive Summary

This project involves building a **Cloud-Deployed Robot Simulation Dashboard** — a full-stack, production-grade system that simulates a robot's real-time sensor data (proximity, speed, direction), visualizes it on a live web dashboard, detects anomalies using machine learning, and is containerized with Docker and deployed to a cloud platform (AWS free tier preferred).

The project demonstrates end-to-end software engineering: data simulation → streaming → ML inference → visualization → cloud deployment.

---

## 1. Project Overview

### 1.1 What Are We Building?

A system with **three core layers**:

1. **Data Layer** — A Python simulator that continuously generates realistic robot telemetry (proximity to obstacles, speed, direction/heading). This replaces a real robot sensor feed.
2. **Backend Layer** — A FastAPI (or Flask) web server that exposes real-time telemetry via WebSockets and REST APIs, and runs a scikit-learn anomaly detection model on incoming sensor streams.
3. **Frontend Layer** — A live web dashboard (HTML/JS or React) that shows real-time charts, sensor gauges, alerts for anomalies, and (bonus) a 2D path planning visualization.

The entire system is containerized with Docker and deployed to AWS (EC2 + App Runner, or ECS Free Tier).

---

### 1.2 Why This Project Matters

This project proves you can:
- Work with **streaming/real-time data** pipelines
- Deploy **ML models** in a production environment (not just Jupyter)
- Build and ship a **Docker-containerized** cloud application
- Create a **full-stack** product from data source to user interface

---

## 2. Functional Requirements

### 2.1 Robot Sensor Simulator (Python)

| ID | Feature | Details |
|----|---------|---------|
| F1 | Proximity Sensor | Simulate distance to nearest obstacle (0–500 cm), with noise and occasional obstacle events |
| F2 | Speed Sensor | Simulate robot speed (0–3.0 m/s), smooth acceleration/deceleration curves |
| F3 | Direction Sensor | Simulate heading in degrees (0–360°), simulate turning behavior |
| F4 | Anomaly Injection | Randomly inject anomalies: speed spike, proximity collision risk, erratic turning |
| F5 | Configurable Rate | Data generation rate configurable (default: 1 reading/second) |
| F6 | Sensor Noise | Gaussian noise applied to all sensor values to simulate real hardware |

**Output format (JSON per tick):**
```json
{
  "timestamp": "2026-05-02T01:30:00Z",
  "proximity_cm": 142.3,
  "speed_mps": 1.2,
  "direction_deg": 270.5,
  "anomaly_injected": false
}
```

---

### 2.2 Backend API (FastAPI)

| ID | Feature | Details |
|----|---------|---------|
| B1 | REST API — Latest Reading | `GET /api/telemetry/latest` returns most recent sensor snapshot |
| B2 | REST API — History | `GET /api/telemetry/history?limit=100` returns last N readings |
| B3 | WebSocket Stream | `WS /ws/telemetry` pushes real-time sensor + anomaly data to connected clients |
| B4 | Anomaly Endpoint | `GET /api/anomalies` returns list of detected anomaly events |
| B5 | Health Check | `GET /health` returns system status for cloud load balancer |
| B6 | CORS | Open CORS for dev; configurable for prod |
| B7 | In-Memory Storage | Rolling buffer of last 1000 readings (no database needed for MVP) |

---

### 2.3 Anomaly Detection (scikit-learn ML)

| ID | Feature | Details |
|----|---------|---------|
| M1 | Model Type | Isolation Forest (unsupervised, no labeled data needed) |
| M2 | Feature Vector | `[proximity_cm, speed_mps, direction_delta]` per tick |
| M3 | Warm-up Period | Model trained on first 200 readings (normal behavior baseline) |
| M4 | Online Inference | Every new reading is scored; anomaly flag added to telemetry payload |
| M5 | Anomaly Score | Return raw anomaly score + binary flag (`is_anomaly: true/false`) |
| M6 | Alerting | Anomalies broadcast immediately via WebSocket with `"type": "anomaly"` |
| M7 | Model Persistence | Save trained model as `model.pkl` (sklearn joblib) |

---

### 2.4 Web Dashboard (Frontend)

| ID | Feature | Details |
|----|---------|---------|
| UI1 | Live Speed Gauge | Radial gauge showing current speed, color-coded (green/yellow/red) |
| UI2 | Proximity Bar | Horizontal bar showing proximity, danger zone highlights red below 30cm |
| UI3 | Direction Compass | Animated compass needle showing current heading |
| UI4 | Speed Over Time Chart | Scrolling line chart (last 60 seconds) |
| UI5 | Anomaly Log Panel | Real-time list of anomaly events with timestamp and sensor values |
| UI6 | Connection Status | Indicator showing WebSocket live/disconnected |
| UI7 | Dark Mode | Dark-themed dashboard (appropriate for monitoring UI) |
| UI8 | Responsive Layout | Works on desktop; tablet-friendly |

**Bonus Feature:**

| ID | Feature | Details |
|----|---------|---------|
| UI9 | Path Planning Viz | 2D canvas showing simulated robot position, predicted path, and obstacles |

---

### 2.5 Docker & Deployment

| ID | Feature | Details |
|----|---------|---------|
| D1 | Dockerfile | Multi-stage build: Python 3.11-slim base, installs deps, runs FastAPI with uvicorn |
| D2 | docker-compose.yml | Single command to spin up backend + simulator locally |
| D3 | Cloud Deployment | Deploy container to AWS (EC2 t2.micro free tier or App Runner) |
| D4 | Environment Config | `.env` file for configuration; no secrets in code |
| D5 | Port Exposure | Backend on port 8000; dashboard served as static files or via same server |

---

## 3. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | WebSocket latency < 500ms end-to-end; Dashboard renders at 30fps+ |
| **Reliability** | Backend handles WebSocket reconnections gracefully |
| **Scalability** | MVP: single container; architecture allows horizontal scaling later |
| **Cost** | AWS Free Tier only (t2.micro EC2 or App Runner 25h/month free) |
| **Security** | No exposed secrets; HTTPS in production via AWS-provided cert |

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                    │
│  ┌────────────────────────────────────────────────┐  │
│  │         Web Dashboard (HTML/JS)                │  │
│  │  Gauges │ Charts │ Anomaly Log │ Path Viz      │  │
│  └──────────────┬──────────────────────────────┬──┘  │
│                 │ WebSocket                    │ REST │
└─────────────────┼──────────────────────────────┼─────┘
                  │                              │
┌─────────────────▼──────────────────────────────▼─────┐
│              FASTAPI BACKEND (Docker Container)       │
│                                                       │
│  ┌─────────────┐    ┌──────────────┐                 │
│  │  WebSocket  │    │  REST API    │                 │
│  │  Handler    │    │  Endpoints   │                 │
│  └──────┬──────┘    └──────┬───────┘                 │
│         │                 │                           │
│  ┌──────▼─────────────────▼───────┐                  │
│  │     Telemetry Buffer           │                  │
│  │  (rolling 1000 readings)       │                  │
│  └──────────────┬─────────────────┘                  │
│                 │                                     │
│  ┌──────────────▼─────────────────┐                  │
│  │  Anomaly Detection Engine      │                  │
│  │  (Isolation Forest / sklearn)  │                  │
│  └────────────────────────────────┘                  │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│           ROBOT SENSOR SIMULATOR (Python thread)      │
│   Proximity │ Speed │ Direction │ Anomaly Injector    │
└──────────────────────────────────────────────────────┘

            Deployed on: AWS EC2 t2.micro (Free Tier)
```

---

## 5. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Simulator | Python 3.11, NumPy | Realistic noise generation, fast numerical ops |
| Backend | FastAPI + Uvicorn | Async WebSocket support, auto docs, fast |
| ML | scikit-learn (IsolationForest) | Unsupervised, no labels needed, lightweight |
| Frontend | Vanilla HTML/CSS/JS + Chart.js | No build step, easy to containerize and serve |
| Containerization | Docker + docker-compose | Reproducible builds, easy cloud deploy |
| Cloud | AWS EC2 (t2.micro) or App Runner | Free tier, familiar to developer |
| Version Control | Git + GitHub | CI/CD optionally via GitHub Actions |

---

## 6. Project Milestones

### Phase 1 — Simulator & Backend Core (Day 1–2)
- [ ] Python robot sensor simulator running and outputting JSON
- [ ] FastAPI server running with REST endpoints
- [ ] WebSocket broadcasting live telemetry
- [ ] In-memory telemetry buffer working

### Phase 2 — ML Anomaly Detection (Day 2–3)
- [ ] IsolationForest model integrated into data pipeline
- [ ] Warm-up period implemented (200 readings baseline)
- [ ] Anomaly events included in WebSocket payload
- [ ] Anomaly injection tested end-to-end

### Phase 3 — Web Dashboard (Day 3–4)
- [ ] Dashboard HTML/CSS/JS scaffold
- [ ] WebSocket client connected and receiving data
- [ ] Speed gauge, proximity bar, compass implemented
- [ ] Scrolling speed line chart (Chart.js)
- [ ] Anomaly log panel updating in real-time

### Phase 4 — Docker & Cloud Deploy (Day 4–5)
- [ ] Dockerfile written and tested locally
- [ ] docker-compose.yml working (single command startup)
- [ ] AWS EC2 instance provisioned (t2.micro)
- [ ] Container pushed to ECR (or Docker Hub) and deployed
- [ ] Public URL working and accessible

### Phase 5 — Bonus & Polish (Day 5–6)
- [ ] 2D path planning visualization on canvas
- [ ] README with architecture diagram and setup instructions
- [ ] Demo recording or screenshots

---

## 7. File Structure

```
robot-dashboard/
├── simulator/
│   ├── __init__.py
│   ├── robot.py          # Sensor simulation logic
│   └── anomaly.py        # Anomaly injection logic
├── backend/
│   ├── main.py           # FastAPI app entry point
│   ├── websocket.py      # WebSocket manager
│   ├── telemetry.py      # Buffer + data models
│   └── ml/
│       ├── model.py      # IsolationForest wrapper
│       └── model.pkl     # Saved model (generated at runtime)
├── frontend/
│   ├── index.html        # Dashboard HTML
│   ├── style.css         # Dashboard styles
│   └── app.js            # WebSocket client + Chart.js logic
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

---

## 8. API Reference

### REST Endpoints

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/health` | `{ "status": "ok", "uptime_s": 120 }` |
| GET | `/api/telemetry/latest` | Single telemetry reading + anomaly flag |
| GET | `/api/telemetry/history` | Array of last N readings |
| GET | `/api/anomalies` | Array of all detected anomaly events |

### WebSocket

**Connect:** `ws://<host>:8000/ws/telemetry`

**Message format (every 1s):**
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

**Anomaly event:**
```json
{
  "type": "anomaly",
  "timestamp": "2026-05-02T01:30:45Z",
  "proximity_cm": 8.1,
  "speed_mps": 2.9,
  "direction_deg": 45.0,
  "is_anomaly": true,
  "anomaly_score": -0.72
}
```

---

## 9. ML Model Design

### Algorithm: Isolation Forest

Isolation Forest works by randomly partitioning data. Anomalies, being rare and different, require fewer splits to isolate — giving them a higher anomaly score.

**Why Isolation Forest for this project:**
- No labeled training data required
- Works well with small datasets (200+ readings to baseline)
- Fast inference per reading
- Handles multi-dimensional sensor data natively
- Available in scikit-learn with 3 lines of code

**Feature Engineering:**

| Feature | Description |
|---------|-------------|
| `proximity_cm` | Raw proximity distance |
| `speed_mps` | Raw speed reading |
| `direction_delta` | Change in direction from last tick (detects erratic turning) |
| `speed_delta` | Change in speed from last tick (detects sudden acceleration) |

**Training:** Fit on first 200 readings. Re-fit every 500 readings to adapt to new normal behavior (optional enhancement).

---

## 10. Deployment Plan (AWS Free Tier)

### Option A — EC2 t2.micro (Recommended)
1. Launch EC2 t2.micro (Amazon Linux 2023)
2. Install Docker on EC2
3. Push image to Docker Hub (free) or Amazon ECR
4. Pull and run container on EC2
5. Open port 8000 in Security Group
6. Access via `http://<ec2-public-ip>:8000`

### Option B — AWS App Runner
1. Push image to Amazon ECR
2. Create App Runner service pointing to ECR image
3. App Runner handles HTTPS and auto-scaling
4. 25 compute hours/month free

**Estimated AWS cost:** $0 (within free tier limits)

---

## 11. Acceptance Criteria

The project is considered complete when:

- [ ] Simulator runs and produces realistic, noisy sensor data
- [ ] FastAPI backend serves REST and WebSocket endpoints
- [ ] ML model detects injected anomalies with > 80% recall
- [ ] Dashboard displays live updating gauges, chart, and anomaly log
- [ ] Docker container builds and runs with `docker-compose up`
- [ ] Application is accessible via a public cloud URL
- [ ] README explains how to run the project locally and in cloud
- [ ] (Bonus) Path planning 2D visualization renders on canvas

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WebSocket CORS issues in cloud | Medium | High | Test locally first; set CORS in FastAPI config |
| EC2 free tier limits exceeded | Low | Medium | Monitor usage; use App Runner as fallback |
| IsolationForest false positive rate too high | Medium | Medium | Tune `contamination` parameter; add sliding window |
| Frontend charts slow with high data rate | Low | Low | Limit chart to 60 data points, drop older points |
| Docker image too large | Low | Low | Use multi-stage build, python:3.11-slim base |

