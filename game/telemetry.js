class TelemetryClient {
    constructor(url = 'ws://localhost:8000/ws/game-input') {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.tickCount = 0;
        
        this.statusDot = document.getElementById('ws-status-dot');
        this.statusText = document.getElementById('ws-status-text');
        
        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                this.connected = true;
                this.updateUI(true);
            };
            
            this.ws.onclose = () => {
                this.connected = false;
                this.updateUI(false);
                setTimeout(() => this.connect(), 2000); // Reconnect attempt
            };

            this.ws.onerror = (err) => {
                console.error('WebSocket Error:', err);
                this.ws.close();
            };
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
            this.updateUI(false);
        }
    }

    updateUI(isConnected) {
        if (isConnected) {
            this.statusDot.className = 'status-dot connected';
            this.statusText.textContent = 'LIVE';
        } else {
            this.statusDot.className = 'status-dot disconnected';
            this.statusText.textContent = 'CONNECTING...';
        }
    }

    sendReading(robotState, proximity) {
        if (!this.connected) return;
        
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

        this.ws.send(JSON.stringify(payload));
    }
}
