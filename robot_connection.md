# Transitioning NEXUS to Real-World Robotics

This plan outlines the roadmap for upgrading the NEXUS architecture to handle physical robots in the real world, addressing the four major complications (Network Instability, Sensor Noise, Security, and Scaling), as well as updating the documentation.

## User Review Required

> [!IMPORTANT]
> **Scope Check**
> Addressing all complications (especially MQTT scaling) represents a significant architectural overhaul. Please review the proposed phases below. 
> 
> Do you want me to execute **ALL** of these phases now, or should we start with just the documentation and security (Phases 1 & 2)?

## Proposed Changes

We will tackle this transition in four distinct phases:

### Phase 1: Documentation Update (Immediate)
We will update the `README.md` to clearly explain the connection architecture.
#### [MODIFY] `README.md`
- Add a section: **"How the Connection Works (Game ➔ Cloud)"** explaining the JSON WebSocket payload.
- Add a section: **"Connecting Real-World Robots"** detailing how physical hardware (Raspberry Pi/Arduino) can stream identical JSON payloads to the `/ws/game-input` endpoint.

---

### Phase 2: Security & Authentication (Complication C)
Currently, anyone can connect to the WebSockets. We need to secure the robot input pipeline.
#### [MODIFY] `backend/main.py` & `backend/websocket.py`
- Implement **API Key Authentication** for the `/ws/game-input` route. The robot must provide a valid token in the connection headers or URL parameters to send telemetry.
#### [MODIFY] `.env` & `docker-compose.yml`
- Add `ROBOT_API_KEY` configuration.

---

### Phase 3: Edge Robustness & Noise Filtering (Complications A & B)
Real sensors are noisy, and cellular connections drop.
#### [MODIFY] `game/telemetry.js` (Simulating Edge Logic)
- Implement **Exponential Backoff Reconnection** logic. If the WebSocket drops, the client will automatically attempt to reconnect with increasing delays.
#### [MODIFY] `backend/ml/model.py`
- Implement a **Simple Moving Average (SMA)** or **Kalman Filter** pre-processing step. This will smooth out sudden "spikes" in raw sensor data (like a false ultrasonic reading) *before* the Isolation Forest evaluates it, reducing false alarms.

---

### Phase 4: Industrial Scaling (Complication D - Future Proofing)
For a fleet of hundreds of robots, raw WebSockets on a single FastAPI instance will bottleneck.
#### [NEW] `backend/mqtt_client.py`
- Integrate an **MQTT Broker** (e.g., Eclipse Mosquitto or GCP Pub/Sub).
- Robots will publish telemetry to an MQTT topic (e.g., `nexus/telemetry/robot_1`) instead of opening a direct WebSocket to FastAPI.
- FastAPI will act as an MQTT subscriber, processing the data and then pushing it to the Dashboard via WebSockets.
*(Note: This phase requires setting up additional infrastructure. I recommend we discuss this before implementing).*

## Open Questions

1. Do you approve me to immediately execute **Phase 1** (Updating the README)?
2. Do you want to proceed with **Phase 2 & 3** right now to harden the Python backend?
3. For **Phase 4 (MQTT)**, do you want to keep the current WebSocket architecture for now since we are just starting with single robots, or do you want to transition to MQTT immediately?
