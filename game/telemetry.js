class TelemetryClient {
    constructor(url) {
        // Dynamically build the WebSocket URL from the current page location
        if (!url) {
            const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
            // Use the default API key to allow the local game client to connect
            const token = 'nexus_secret_key_123';
            url = `${protocol}://${location.host}/ws/game-input?token=${token}`;
        }
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.tickCount = 0;
        this.sendCount = 0;
        this.errorCount = 0;
        this.reconnectAttempts = 0;

        this.statusDot = document.getElementById('ws-status-dot');
        this.statusText = document.getElementById('ws-status-text');
        
        // Show the resolved URL in the HUD
        const wsUrlDisplay = document.getElementById('ws-url');
        if (wsUrlDisplay) wsUrlDisplay.textContent = this.url;

        console.log('[Telemetry] Initializing — target:', this.url);
        this.connect();
    }

    connect() {
        try {
            console.log('[Telemetry] Connecting to', this.url);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.connected = true;
                this.errorCount = 0;
                this.reconnectAttempts = 0; // Reset on successful connection
                this.updateUI(true);
                console.log('[Telemetry] ✅ Connected to backend!');
            };

            this.ws.onclose = (event) => {
                this.connected = false;
                this.updateUI(false);
                
                // Exponential backoff: 1s * (1.5 ^ attempts), max 30 seconds
                const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
                this.reconnectAttempts++;
                
                console.warn(`[Telemetry] ❌ Connection closed. Code: ${event.code}. Reconnecting in ${Math.round(delay/1000)}s...`);
                setTimeout(() => this.connect(), delay);
            };

            this.ws.onerror = (err) => {
                this.errorCount++;
                console.error('[Telemetry] WebSocket Error #' + this.errorCount, err);
                // Don't call close() here — onclose will fire automatically
            };
        } catch (e) {
            console.error('[Telemetry] Failed to create WebSocket:', e);
            this.updateUI(false);
            
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), delay);
        }
    }

    updateUI(isConnected) {
        if (isConnected) {
            this.statusDot.className = 'status-dot connected';
            this.statusText.textContent = 'LIVE';
        } else {
            this.statusDot.className = 'status-dot disconnected';
            this.statusText.textContent = 'RECONNECTING...';
        }
    }

    sendReading(robotState, proximity) {
        // Guard: check actual WebSocket readyState, not just the flag
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.tickCount++;

        const payload = {
            timestamp: new Date().toISOString(),
            proximity_cm: proximity,
            speed_mps: robotState.speed,
            direction_deg: robotState.heading,
            speed_delta: robotState.speedDelta,
            direction_delta: robotState.headingDelta,
            pos_x: robotState.x,
            pos_y: robotState.y,
            tick: this.tickCount,
            anomaly_injected: false
        };

        try {
            this.ws.send(JSON.stringify(payload));
            this.sendCount++;

            // Log every 5th send so we can verify data is flowing
            if (this.sendCount % 5 === 1) {
                console.log(`[Telemetry] 📡 Sent tick #${this.tickCount} | speed=${payload.speed_mps.toFixed(2)} | prox=${payload.proximity_cm.toFixed(1)} | heading=${payload.direction_deg.toFixed(1)}`);
            }
        } catch (e) {
            console.error('[Telemetry] Send failed:', e);
        }
    }
}
