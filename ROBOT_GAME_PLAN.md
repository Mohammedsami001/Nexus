# 🎮 Interactive Robot Driving Game — Integration Plan for NEXUS
### A playable 2D robot game that streams real telemetry to the NEXUS dashboard

---

## 📌 Context for the AI Building This

> **You are building this inside an existing project at `d:\robo-assignment`.**
> The project already has a working **NEXUS** dashboard (FastAPI backend + Vanilla JS frontend) that receives robot telemetry via WebSocket. Currently, the robot is a **Python-based automated simulator** (`simulator/robot.py`) that randomly generates sensor data.
>
> **The goal:** Replace (or coexist with) the automated simulator with an **interactive browser-based robot driving game** where the USER controls the robot with keyboard/touch, and the robot's real sensor data streams to the NEXUS dashboard in real-time.

---

## 🎯 What We're Building

A **browser-based 2D top-down robot driving game** where:

1. The user drives a robot around a 2D world using **WASD / Arrow keys**
2. The world has **obstacles, walls, and terrain**
3. The robot has **real physics** (acceleration, friction, collision)
4. Real sensor data is generated from the game state:
   - **Proximity:** Raycasting distance to nearest obstacle
   - **Speed:** Actual velocity of the robot
   - **Direction:** Actual heading angle
5. This telemetry streams to the **existing NEXUS backend via WebSocket**
6. The **NEXUS dashboard** displays the data in real-time — proving the full pipeline works with a "real" robot

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    ROBOT GAME (Browser Tab 1)                │
│                                                              │
│   HTML5 Canvas 2D game world                                 │
│   ┌────────────────────────────────┐                         │
│   │  🤖 ← User-controlled robot    │                         │
│   │  🟫🟫 ← Obstacles / walls      │                         │
│   │  ···  ← Trail visualization    │                         │
│   └────────────────────────────────┘                         │
│                                                              │
│   Controls: WASD / Arrow keys / On-screen joystick (mobile)  │
│   Physics: Acceleration, friction, collision, bounce-back    │
│   Sensors: Raycasting for proximity, velocity for speed      │
│                                                              │
│   Every tick (1Hz): POST sensor reading → Backend WebSocket  │
└──────────────────────┬───────────────────────────────────────┘
                       │  WebSocket / REST
                       ▼
┌──────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND (existing, port 8000)          │
│                                                              │
│   Receives telemetry from game client (same format as        │
│   the Python simulator) → ML anomaly detection → broadcast   │
│   to all connected WebSocket clients                         │
└──────────────────────┬───────────────────────────────────────┘
                       │  WebSocket broadcast
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              NEXUS DASHBOARD (Browser Tab 2)                  │
│                                                              │
│   Speed gauge │ Proximity radar │ Compass │ Anomaly log      │
│   Path visualization │ Telemetry charts                      │
│                                                              │
│   Sees REAL data from user's driving — not random numbers    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Files to Create

All new files go inside the existing project. **Do NOT modify any existing files** unless specified.

```
d:\robo-assignment\
├── game/                          ← NEW FOLDER (entire game)
│   ├── index.html                 ← Game page (canvas + HUD)
│   ├── style.css                  ← Game UI styling (dark, sci-fi theme)
│   ├── engine.js                  ← Game loop, physics, rendering
│   ├── robot.js                   ← Robot class (position, velocity, sensors)
│   ├── world.js                   ← Map, obstacles, walls, terrain
│   ├── sensors.js                 ← Raycasting proximity, speed calc, heading
│   ├── controls.js                ← Keyboard + touch/joystick input handler
│   ├── telemetry.js               ← WebSocket client that sends data to backend
│   └── assets/                    ← Optional: robot sprite, obstacle textures
│
├── backend/
│   └── main.py                    ← MODIFY: Add a new WebSocket endpoint for game input
│                                     OR reuse /ws/telemetry for receiving game data
```

---

## 🎮 Game Design Specification

### 1. World / Map

| Property | Value |
|---|---|
| World size | 2000 × 2000 units (scrollable viewport) |
| Viewport | Follows robot (camera centered on robot) |
| Background | Dark grid pattern (like the current path viz) |
| Walls | Rectangle boundary around the entire world |
| Obstacles | 15-25 randomly placed objects (circles, rectangles, hexagons) |
| Obstacle colors | Red-tinted with glow (danger aesthetic, matching NEXUS theme) |
| Grid | Subtle cyan grid lines (matching NEXUS's `--accent-cyan: #00d4ff`) |

### 2. Robot

| Property | Value |
|---|---|
| Shape | Triangle/arrow pointing in movement direction |
| Size | ~20px (visible, not too large) |
| Color | Cyan (`#00d4ff`) with glow effect |
| Trail | Last 200 positions rendered as fading line (cyan) |
| Max speed | 3.0 m/s (matches existing simulator range) |
| Acceleration | 0.15 m/s² per frame when key held |
| Friction/drag | 0.97 multiplier per frame (slows naturally) |
| Turn rate | 3.0 degrees per frame |
| Collision | Bounce-back with speed reduction (0.3x) |

### 3. Controls

| Input | Action |
|---|---|
| `W` or `↑` | Accelerate forward |
| `S` or `↓` | Brake / reverse |
| `A` or `←` | Turn left |
| `D` or `→` | Turn right |
| `Space` | Emergency brake (speed → 0) |
| `R` | Reset position to center |
| On mobile | Virtual joystick (left side) + accelerate button (right side) |

### 4. Sensors (generated from game state)

These are calculated every tick and sent to the backend:

| Sensor | How it's calculated |
|---|---|
| `proximity_cm` | **Raycasting:** Cast 8 rays from robot in a cone ahead. Distance to nearest obstacle hit, scaled to 0-500cm range. If no hit, 500cm. |
| `speed_mps` | `magnitude(velocity_vector)` — actual robot speed, 0-3.0 m/s |
| `direction_deg` | Robot's heading angle, 0-360° |
| `direction_delta` | Change in direction since last tick |
| `speed_delta` | Change in speed since last tick |
| `pos_x`, `pos_y` | Robot's actual position in world space |
| `anomaly_injected` | Always `false` (real driving data, not injected) |

### 5. HUD (Heads-Up Display on Game Screen)

Overlay on the game canvas:

```
┌─────────────────────────────────────────┐
│ 🎮 ROBOT CONTROL SIMULATION            │
│                                         │
│ Speed: 1.42 m/s    Heading: 127.3°     │
│ Proximity: 85.2cm  Status: CONNECTED   │
│                                         │
│ [WASD to drive] [R to reset] [ESC menu] │
│                                         │
│        ┌─────────────────┐              │
│        │                 │              │
│        │   GAME CANVAS   │              │
│        │   (2D world)    │              │
│        │                 │              │
│        └─────────────────┘              │
│                                         │
│ Nexus: ws://localhost:8000 ● LIVE       │
└─────────────────────────────────────────┘
```

### 6. Visual Style

**Must match NEXUS dashboard aesthetic:**
- Background: `#04060b` (near-black)
- Primary accent: `#00d4ff` (cyan)
- Danger: `#ff2d55` (red)
- Success: `#00ff88` (green)
- Font: `Orbitron` for headers, `JetBrains Mono` for data
- Scanline overlay effect (optional)
- Particle background (optional, matching NEXUS)
- Glow effects on robot and obstacles

---

## 🔌 Backend Integration

### Option A: Game sends data TO the existing backend (Recommended)

Add a **new WebSocket endpoint** to `backend/main.py` that receives telemetry FROM the game client:

```python
# Add to backend/main.py

@app.websocket("/ws/game-input")
async def game_input(websocket: WebSocket):
    """Receive telemetry from the browser game client."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Format matches existing simulator output
            reading = {
                "timestamp": data["timestamp"],
                "proximity_cm": data["proximity_cm"],
                "speed_mps": data["speed_mps"],
                "direction_deg": data["direction_deg"],
                "speed_delta": data.get("speed_delta", 0),
                "direction_delta": data.get("direction_delta", 0),
                "pos_x": data.get("pos_x", 500),
                "pos_y": data.get("pos_y", 500),
                "tick": data.get("tick", 0),
                "anomaly_injected": False,
            }

            # Run through existing ML pipeline
            is_anomaly, anomaly_score = anomaly_detector.predict(reading)
            reading["is_anomaly"] = is_anomaly
            reading["anomaly_score"] = anomaly_score

            # Store in buffer
            buffer.add_reading(reading)
            if is_anomaly:
                buffer.add_anomaly(reading)

            # Broadcast to all NEXUS dashboard clients
            ws_data = {**reading, "type": "anomaly" if is_anomaly else "telemetry"}
            await ws_manager.broadcast(ws_data)

    except WebSocketDisconnect:
        pass
```

### Option B: Toggle between simulator and game

Add a REST endpoint to switch modes:

```python
# POST /api/mode/game    → stops Python simulator, accepts game input
# POST /api/mode/auto    → restarts Python simulator, ignores game input
```

**Recommendation: Start with Option A.** Both can run simultaneously — the NEXUS dashboard just shows whatever data it receives.

### Data Format (JSON sent from game every tick)

The game MUST send data in this exact format to match what NEXUS expects:

```json
{
    "timestamp": "2026-05-02T13:30:00.000Z",
    "proximity_cm": 142.3,
    "speed_mps": 1.42,
    "direction_deg": 127.3,
    "speed_delta": 0.05,
    "direction_delta": 2.1,
    "pos_x": 623.4,
    "pos_y": 387.2,
    "tick": 45,
    "anomaly_injected": false
}
```

---

## 🔧 Telemetry Client (`game/telemetry.js`)

```javascript
// Connect to the backend and send readings at 1Hz
class TelemetryClient {
    constructor(url = 'ws://localhost:8000/ws/game-input') {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.tickCount = 0;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => { this.connected = true; };
        this.ws.onclose = () => {
            this.connected = false;
            setTimeout(() => this.connect(), 2000); // Auto-reconnect
        };
    }

    sendReading(robotState) {
        if (!this.connected) return;
        this.tickCount++;
        const payload = {
            timestamp: new Date().toISOString(),
            proximity_cm: robotState.proximity,
            speed_mps: robotState.speed,
            direction_deg: robotState.heading,
            speed_delta: robotState.speedDelta,
            direction_delta: robotState.headingDelta,
            pos_x: robotState.x,
            pos_y: robotState.y,
            tick: this.tickCount,
            anomaly_injected: false,
        };
        this.ws.send(JSON.stringify(payload));
    }
}
```

---

## 🧮 Sensor Raycasting (`game/sensors.js`)

```javascript
// Cast rays from robot to detect nearest obstacle
function castProximityRay(robot, obstacles, angle, maxDistance = 500) {
    const steps = 100;
    const stepSize = maxDistance / steps;
    const rad = angle * Math.PI / 180;

    for (let i = 1; i <= steps; i++) {
        const testX = robot.x + Math.cos(rad) * stepSize * i;
        const testY = robot.y + Math.sin(rad) * stepSize * i;

        for (const obs of obstacles) {
            const dx = testX - obs.x;
            const dy = testY - obs.y;
            if (Math.sqrt(dx * dx + dy * dy) < obs.radius) {
                return stepSize * i; // Distance in cm
            }
        }
    }
    return maxDistance; // No hit
}

// Cast 8 rays in a forward cone, return minimum distance
function getProximity(robot, obstacles) {
    const angles = [-60, -40, -20, -10, 0, 10, 20, 40, 60];
    let minDist = 500;
    for (const offset of angles) {
        const rayAngle = robot.heading + offset;
        const dist = castProximityRay(robot, obstacles, rayAngle);
        minDist = Math.min(minDist, dist);
    }
    return minDist;
}
```

---

## 📋 Implementation Checklist

### Phase 1 — Game Engine Core
- [ ] Create `game/` folder structure
- [ ] `engine.js`: Game loop (requestAnimationFrame at 60fps, telemetry at 1Hz)
- [ ] `world.js`: Map generation (walls, 20 random obstacles, grid background)
- [ ] `robot.js`: Robot class with position, velocity, heading, physics
- [ ] `controls.js`: WASD + Arrow key input handler
- [ ] `game/index.html`: Canvas + HUD layout
- [ ] `game/style.css`: Dark sci-fi theme matching NEXUS

### Phase 2 — Sensors & Physics
- [ ] Implement collision detection (robot vs obstacles, robot vs walls)
- [ ] Implement bounce-back physics on collision
- [ ] `sensors.js`: Raycasting for proximity sensor
- [ ] Speed calculation from velocity vector
- [ ] Direction delta and speed delta calculation
- [ ] Visual ray debugging (optional: show rays on canvas)

### Phase 3 — NEXUS Integration
- [ ] `telemetry.js`: WebSocket client sending data to backend
- [ ] Add `/ws/game-input` endpoint to `backend/main.py`
- [ ] Verify NEXUS dashboard receives game data in real-time
- [ ] Verify ML anomaly detection triggers on dangerous driving (near-collision, sudden turns)
- [ ] Connection status indicator on game HUD

### Phase 4 — Polish
- [ ] Robot glow effect and trail rendering
- [ ] Camera following (smooth lerp toward robot position)
- [ ] Mobile virtual joystick for touch controls
- [ ] Minimap in corner showing full world
- [ ] Sound effects (optional: engine hum, collision impact)
- [ ] Instructions overlay on first load

### Phase 5 — Cloud Deployment
- [ ] Add `game/` folder to Dockerfile static serving
- [ ] Serve game at `/game` route via FastAPI
- [ ] Test on AWS EC2 deployment
- [ ] Verify WebSocket works over public URL (wss://)

---

## 🧪 Testing the Integration

1. **Start the backend:** `uvicorn backend.main:app --reload --port 8000`
2. **Open Tab 1:** `http://localhost:8000/game` → Drive the robot with WASD
3. **Open Tab 2:** `http://localhost:8000/` → Watch NEXUS dashboard update in real-time
4. **Verify:**
   - Speed gauge matches your actual driving speed
   - Compass needle follows your heading
   - Proximity radar shows obstacles you're approaching
   - Path visualization traces your actual driving path
   - Drive very close to an obstacle → ML should flag an anomaly → anomaly log updates

---

## ⚠️ Important Notes

1. **DO NOT break the existing NEXUS dashboard** — it must continue working
2. **DO NOT change the telemetry data format** — the game must output the exact same JSON schema as `simulator/robot.py`
3. **The Python simulator and the game can coexist** — when both are sending data, the dashboard shows both (which is fine)
4. **Match the NEXUS color scheme exactly** — use CSS variables: `--accent-cyan: #00d4ff`, `--accent-red: #ff2d55`, `--accent-green: #00ff88`, `--bg-primary: #04060b`
5. **Game runs at 60fps, telemetry sends at 1Hz** — use a separate timer for telemetry, don't send every frame
6. **Raycasting must be performant** — 8 rays × 100 steps = 800 checks per tick is fine at 1Hz

---

## 🎨 Visual Reference

The game should feel like a **military/sci-fi drone control interface** — same vibe as the NEXUS dashboard. Think:
- Tron-style grid background
- Cyan/neon glow on the robot
- Red hazard zones around obstacles
- Dark, minimal, data-dense HUD
- JetBrains Mono font for all readouts

---

*This plan is ready to be executed. All the architecture decisions are made. Build it file by file, test each phase before moving to the next.*
