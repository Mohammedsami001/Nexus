/* ═══════════════════════════════════════════════════════════════
   NEXUS — Robot Command Center | Main Application
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────
const state = {
    ws: null,
    connected: false,
    readings: 0,
    anomalyCount: 0,
    startTime: Date.now(),
    lastDirection: 0,
    currentSpeed: 0,
    currentProximity: 250,
    currentDirection: 0,
    trail: [],
    obstacles: [],
    chartData: { speed: [], proximity: [], direction: [], labels: [] },
    chart: null,
    reconnectDelay: 1000,
    radarAngle: 0,
    particlesInited: false
};

// ── DOM References ───────────────────────────────────────────
const dom = {
    speedValue: document.getElementById('speed-value'),
    speedArc: document.getElementById('speed-arc'),
    speedArcGlow: document.getElementById('speed-arc-glow'),
    proximityValue: document.getElementById('proximity-value'),
    headingValue: document.getElementById('heading-value'),
    compassNeedle: document.getElementById('compass-needle'),
    anomalyLog: document.getElementById('anomaly-log'),
    anomalyCounter: document.getElementById('anomaly-counter'),
    anomalyBadge: document.getElementById('anomaly-badge'),
    readingsCounter: document.getElementById('readings-counter'),
    mlStatus: document.getElementById('ml-status'),
    connectionStatus: document.getElementById('connection-status'),
    statusText: document.querySelector('.status-text'),
    latencyDisplay: document.getElementById('latency-display'),
    uptimeDisplay: document.getElementById('uptime-display'),
    bufferDisplay: document.getElementById('buffer-display'),
    warmupProgress: document.getElementById('warmup-progress'),
    warmupText: document.getElementById('warmup-text'),
    anomalyFlash: document.getElementById('anomaly-flash'),
    robotPosDisplay: document.getElementById('robot-pos-display'),
    timestampDisplay: document.getElementById('timestamp-display'),
    tickrateDisplay: document.getElementById('tickrate-display'),
    clientsDisplay: document.getElementById('clients-display'),
    app: document.getElementById('app')
};

// ── Particle System ──────────────────────────────────────────
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 80;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            a: Math.random() * 0.4 + 0.1
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${p.a})`;
            ctx.fill();

            // Connect nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x, dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// ── Speed Gauge ──────────────────────────────────────────────
const GAUGE_MAX_ARC = 400; // stroke-dasharray max for 270deg arc

function updateSpeedGauge(speed) {
    const pct = Math.min(speed / 3.0, 1.0);
    const arcLen = pct * GAUGE_MAX_ARC;
    const dash = `${arcLen} ${534 - arcLen}`;
    dom.speedArc.setAttribute('stroke-dasharray', dash);
    dom.speedArcGlow.setAttribute('stroke-dasharray', dash);
    dom.speedValue.textContent = speed.toFixed(2);

    let color;
    if (speed < 1.5) {
        color = 'var(--accent-cyan)';
        dom.speedValue.style.color = color;
        dom.speedValue.style.textShadow = '0 0 15px rgba(0,212,255,0.6)';
    } else if (speed < 2.5) {
        color = 'var(--accent-amber)';
        dom.speedValue.style.color = color;
        dom.speedValue.style.textShadow = '0 0 15px rgba(255,184,0,0.6)';
    } else {
        color = 'var(--accent-red)';
        dom.speedValue.style.color = color;
        dom.speedValue.style.textShadow = '0 0 15px rgba(255,45,85,0.6)';
    }
    dom.speedArc.setAttribute('stroke', color);
    dom.speedArcGlow.setAttribute('stroke', color);
}

// ── Radar ────────────────────────────────────────────────────
function initRadar() {
    const canvas = document.getElementById('radar-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, maxR = Math.min(cx, cy) - 10;

    function draw() {
        ctx.clearRect(0, 0, w, h);
        // Background
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        bgGrad.addColorStop(0, 'rgba(0,20,10,0.8)');
        bgGrad.addColorStop(1, 'rgba(0,10,5,0.9)');
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.fillStyle = bgGrad; ctx.fill();

        // Range rings
        const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
        rings.forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,255,136,0.1)';
            ctx.lineWidth = 0.5; ctx.stroke();
        });

        // Cross lines
        ctx.strokeStyle = 'rgba(0,255,136,0.08)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();

        // Sweep line
        state.radarAngle = (state.radarAngle + 0.02) % (Math.PI * 2);
        const sweepGrad = ctx.createConicalGradient ?
            null : null; // Fallback
        // Draw sweep as filled arc
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, state.radarAngle - 0.5, state.radarAngle);
        ctx.closePath();
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        grad.addColorStop(0, 'rgba(0,255,136,0.3)');
        grad.addColorStop(1, 'rgba(0,255,136,0.0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Sweep line itself
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(state.radarAngle) * maxR, cy + Math.sin(state.radarAngle) * maxR);
        ctx.strokeStyle = 'rgba(0,255,136,0.6)';
        ctx.lineWidth = 1.5; ctx.stroke();

        // Proximity dot
        const proxNorm = Math.min(state.currentProximity / 500, 1.0);
        const dotR = proxNorm * maxR;
        const dirRad = (state.currentDirection - 90) * Math.PI / 180;
        const dotX = cx + Math.cos(dirRad) * dotR;
        const dotY = cy + Math.sin(dirRad) * dotR;

        // Danger zone
        if (state.currentProximity < 30) {
            ctx.beginPath();
            ctx.arc(cx, cy, maxR * 0.06, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,45,85,${0.15 + Math.sin(Date.now() / 200) * 0.1})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,45,85,0.4)';
            ctx.lineWidth = 1; ctx.stroke();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = state.currentProximity < 30 ? '#ff2d55' : '#00ff88';
        ctx.fill();
        ctx.shadowColor = state.currentProximity < 30 ? '#ff2d55' : '#00ff88';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Labels
        ctx.font = '9px "Orbitron"';
        ctx.fillStyle = 'rgba(0,255,136,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('100', cx, cy - maxR * 0.2 + 3);
        ctx.fillText('300', cx, cy - maxR * 0.6 + 3);
        ctx.fillText('500', cx, cy - maxR * 0.95 + 3);

        requestAnimationFrame(draw);
    }
    draw();
}

// ── Compass ──────────────────────────────────────────────────
function updateCompass(deg) {
    // Shortest path rotation
    let current = state.lastDirection;
    let diff = deg - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    state.lastDirection = current + diff;

    dom.compassNeedle.style.transform = `rotate(${state.lastDirection}deg)`;
    dom.headingValue.textContent = deg.toFixed(1);
}

// Generate compass marks
function initCompassMarks() {
    const g = document.getElementById('compass-marks');
    for (let i = 0; i < 360; i += 10) {
        const rad = (i - 90) * Math.PI / 180;
        const isMajor = i % 30 === 0;
        const r1 = isMajor ? 88 : 92;
        const r2 = 98;
        const x1 = 110 + Math.cos(rad) * r1;
        const y1 = 110 + Math.sin(rad) * r1;
        const x2 = 110 + Math.cos(rad) * r2;
        const y2 = 110 + Math.sin(rad) * r2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', isMajor ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.1)');
        line.setAttribute('stroke-width', isMajor ? '1.5' : '0.5');
        g.appendChild(line);
    }
}

// ── Telemetry Chart ──────────────────────────────────────────
function initChart() {
    const ctx = document.getElementById('telemetry-chart').getContext('2d');

    // Gradient fills
    const speedGrad = ctx.createLinearGradient(0, 0, 0, 280);
    speedGrad.addColorStop(0, 'rgba(0,212,255,0.2)');
    speedGrad.addColorStop(1, 'rgba(0,212,255,0)');

    const proxGrad = ctx.createLinearGradient(0, 0, 0, 280);
    proxGrad.addColorStop(0, 'rgba(0,255,136,0.15)');
    proxGrad.addColorStop(1, 'rgba(0,255,136,0)');

    const dirGrad = ctx.createLinearGradient(0, 0, 0, 280);
    dirGrad.addColorStop(0, 'rgba(191,90,242,0.15)');
    dirGrad.addColorStop(1, 'rgba(191,90,242,0)');

    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Speed (m/s)',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: speedGrad,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10
                },
                {
                    label: 'Proximity (cm/100)',
                    data: [],
                    borderColor: '#00ff88',
                    backgroundColor: proxGrad,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10
                },
                {
                    label: 'Direction (°/100)',
                    data: [],
                    borderColor: '#bf5af2',
                    backgroundColor: dirGrad,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    display: false
                },
                y: {
                    grid: {
                        color: 'rgba(0,212,255,0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#4a5568',
                        font: { family: 'JetBrains Mono', size: 10 }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,16,28,0.9)',
                    borderColor: 'rgba(0,212,255,0.2)',
                    borderWidth: 1,
                    titleFont: { family: 'JetBrains Mono', size: 11 },
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    padding: 10,
                    cornerRadius: 8
                }
            }
        }
    });

    // Toggle buttons
    document.querySelectorAll('.chart-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.dataset === 'speed' ? 0 :
                        btn.dataset.dataset === 'proximity' ? 1 : 2;
            btn.classList.toggle('active');
            state.chart.data.datasets[idx].hidden = !btn.classList.contains('active');
            state.chart.update();
        });
    });
}

function updateChart(reading) {
    const chart = state.chart;
    const MAX = 60;
    const t = new Date(reading.timestamp).toLocaleTimeString();

    chart.data.labels.push(t);
    chart.data.datasets[0].data.push(reading.speed_mps);
    chart.data.datasets[1].data.push(reading.proximity_cm / 100);
    chart.data.datasets[2].data.push(reading.direction_deg / 100);

    if (chart.data.labels.length > MAX) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update('none');
}

// ── Anomaly Log ──────────────────────────────────────────────
function addAnomalyEntry(reading) {
    state.anomalyCount++;
    dom.anomalyCounter.textContent = state.anomalyCount;
    dom.anomalyBadge.textContent = state.anomalyCount;

    // Bounce counter
    dom.anomalyCounter.classList.remove('bounce');
    void dom.anomalyCounter.offsetWidth;
    dom.anomalyCounter.classList.add('bounce');

    // ONLY trigger the intense red flash and shake if proximity is dangerously close
    const isCritical = reading.proximity_cm < 50;

    if (isCritical) {
        // Flash overlay
        dom.anomalyFlash.classList.remove('active');
        void dom.anomalyFlash.offsetWidth;
        dom.anomalyFlash.classList.add('active');

        // Shake dashboard
        dom.app.classList.remove('shake');
        void dom.app.offsetWidth;
        dom.app.classList.add('shake');
    }

    // Remove empty message
    const empty = dom.anomalyLog.querySelector('.anomaly-empty');
    if (empty) empty.remove();

    const t = new Date(reading.timestamp).toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = isCritical ? 'anomaly-entry critical' : 'anomaly-entry warning';
    entry.innerHTML = `
        <div class="anomaly-entry-header">
            <span class="anomaly-time">⚠ ${t}</span>
            <span class="anomaly-score-badge">Score: ${reading.anomaly_score.toFixed(3)}</span>
        </div>
        <div class="anomaly-sensors">
            <span>PRX: <span class="anomaly-sensor-val">${reading.proximity_cm.toFixed(1)}cm</span></span>
            <span>SPD: <span class="anomaly-sensor-val">${reading.speed_mps.toFixed(2)}m/s</span></span>
            <span>DIR: <span class="anomaly-sensor-val">${reading.direction_deg.toFixed(1)}°</span></span>
        </div>
    `;
    dom.anomalyLog.insertBefore(entry, dom.anomalyLog.firstChild);

    // Keep max 50 entries
    while (dom.anomalyLog.children.length > 50) {
        dom.anomalyLog.removeChild(dom.anomalyLog.lastChild);
    }
}

// ── Path Visualization ───────────────────────────────────────
function initPathViz() {
    // Generate random obstacles
    for (let i = 0; i < 12; i++) {
        state.obstacles.push({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            r: Math.random() * 30 + 15
        });
    }
}

function drawPathViz(reading) {
    const canvas = document.getElementById('pathviz-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width, h = canvas.height;
    const sx = w / 1000, sy = h / 1000;

    // Clear
    ctx.fillStyle = 'rgba(4,6,11,0.95)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Obstacles
    state.obstacles.forEach(obs => {
        const ox = obs.x * sx, oy = obs.y * sy, or = obs.r * Math.min(sx, sy);
        // Danger halo
        ctx.beginPath(); ctx.arc(ox, oy, or + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,45,85,0.05)';
        ctx.fill();
        // Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = ox + or * Math.cos(a), py = oy + or * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,45,85,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,45,85,0.3)';
        ctx.lineWidth = 1; ctx.stroke();
    });

    // Trail
    state.trail.push({ x: reading.pos_x, y: reading.pos_y });
    if (state.trail.length > 200) state.trail.shift();

    if (state.trail.length > 1) {
        for (let i = 1; i < state.trail.length; i++) {
            const alpha = (i / state.trail.length) * 0.7;
            ctx.beginPath();
            ctx.moveTo(state.trail[i - 1].x * sx, state.trail[i - 1].y * sy);
            ctx.lineTo(state.trail[i].x * sx, state.trail[i].y * sy);
            ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
            ctx.lineWidth = 2; ctx.stroke();
        }
    }

    // Robot (triangle)
    const rx = reading.pos_x * sx, ry = reading.pos_y * sy;
    const angle = reading.direction_deg * Math.PI / 180;
    const size = 10;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#00d4ff';
    ctx.fill();
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Position display
    dom.robotPosDisplay.textContent = `X: ${reading.pos_x.toFixed(0)}  Y: ${reading.pos_y.toFixed(0)}`;
}

// ── Proximity Update ─────────────────────────────────────────
function updateProximity(val) {
    dom.proximityValue.textContent = val.toFixed(1);
    if (val < 30) {
        dom.proximityValue.classList.add('danger');
    } else {
        dom.proximityValue.classList.remove('danger');
    }
}

// ── Health Polling ───────────────────────────────────────────
async function pollHealth() {
    try {
        const res = await fetch('/health');
        const data = await res.json();
        dom.bufferDisplay.textContent = `${data.readings_count} / 1000`;

        const ml = data.ml_status;
        if (ml.is_trained) {
            dom.mlStatus.textContent = 'ACTIVE';
            dom.mlStatus.classList.add('trained');
            dom.warmupProgress.style.width = '100%';
            dom.warmupText.textContent = '100%';
        } else {
            const pct = Math.round((ml.warmup_progress / ml.warmup_target) * 100);
            dom.warmupProgress.style.width = pct + '%';
            dom.warmupText.textContent = pct + '%';
            dom.mlStatus.textContent = 'WARMING UP';
            dom.mlStatus.classList.remove('trained');
        }

        // Uptime
        const secs = Math.floor(data.uptime_s);
        const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
        const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        dom.uptimeDisplay.textContent = `${hh}:${mm}:${ss}`;

        // Clients and Mode
        if (dom.clientsDisplay) dom.clientsDisplay.textContent = data.ws_clients;
        if (dom.tickrateDisplay) {
            dom.tickrateDisplay.textContent = (data.mode === 'game') ? 'GAME (1.0 Hz)' : 'SIMULATOR';
        }
    } catch (e) { /* silent */ }
}

// ── WebSocket Connection ─────────────────────────────────────
function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${location.host}/ws/telemetry`;
    console.log('[NEXUS] Connecting WebSocket to', wsUrl);

    try {
        state.ws = new WebSocket(wsUrl);
    } catch (e) {
        console.error('[NEXUS] WebSocket creation failed:', e);
        setTimeout(connectWS, 2000);
        return;
    }

    state.ws.onopen = () => {
        state.connected = true;
        state.reconnectDelay = 1000;
        dom.connectionStatus.className = 'connection-status online';
        const statusText = dom.connectionStatus.querySelector('.status-text');
        statusText.textContent = 'LIVE';
        console.log('[NEXUS] ✅ WebSocket CONNECTED');
        // Send keepalive
        state.keepalive = setInterval(() => {
            if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                state.ws.send('ping');
            }
        }, 5000);
    };

    state.ws.onmessage = (event) => {
        // Skip non-JSON messages (e.g. "pong" keepalive responses)
        if (event.data === 'pong') return;
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            return; // Skip any malformed messages
        }
        state.readings++;
        dom.readingsCounter.textContent = state.readings;
        dom.timestampDisplay.textContent = new Date(data.timestamp).toLocaleTimeString();

        // Update sensors
        state.currentSpeed = data.speed_mps;
        state.currentProximity = data.proximity_cm;
        state.currentDirection = data.direction_deg;

        updateSpeedGauge(data.speed_mps);
        updateProximity(data.proximity_cm);
        updateCompass(data.direction_deg);
        updateChart(data);
        drawPathViz(data);

        // Anomaly handling
        if (data.is_anomaly || data.type === 'anomaly') {
            addAnomalyEntry(data);
        }
    };

    state.ws.onclose = () => {
        state.connected = false;
        clearInterval(state.keepalive);
        dom.connectionStatus.className = 'connection-status offline';
        const statusText = dom.connectionStatus.querySelector('.status-text');
        statusText.textContent = 'OFFLINE';
        console.warn('[NEXUS] ❌ WebSocket disconnected. Reconnecting in', state.reconnectDelay, 'ms');

        // Fast reconnect — max 3 second delay
        setTimeout(connectWS, state.reconnectDelay);
        state.reconnectDelay = Math.min(state.reconnectDelay * 1.5, 3000);
    };

    state.ws.onerror = (err) => {
        console.error('[NEXUS] WebSocket error:', err);
        // onclose will fire automatically after onerror, don't call close() manually
    };
}

// ── Initialize ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCompassMarks();
    initChart();
    initRadar();
    initPathViz();
    connectWS();

    // Poll health every 3s
    pollHealth();
    setInterval(pollHealth, 3000);
});
