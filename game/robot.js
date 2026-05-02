class Robot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.heading = 0; // degrees
        this.speed = 0;
        this.speedDelta = 0;
        this.headingDelta = 0;
        
        this.maxSpeed = 3.0; // m/s (using 1 unit = 1 pixel for simplicity, scaled later)
        this.acceleration = 0.15;
        this.friction = 0.97;
        this.turnRate = 4.0;
        
        this.radius = 12; // Collision radius
        this.trail = [];
    }

    update(controls, world) {
        let prevSpeed = this.speed;
        let prevHeading = this.heading;

        // Turning
        if (controls.left) {
            this.heading -= this.turnRate;
            if (this.heading < 0) this.heading += 360;
        }
        if (controls.right) {
            this.heading += this.turnRate;
            if (this.heading >= 360) this.heading -= 360;
        }

        // Acceleration
        const rad = this.heading * Math.PI / 180;
        if (controls.forward) {
            this.vx += Math.cos(rad) * this.acceleration;
            this.vy += Math.sin(rad) * this.acceleration;
        }
        if (controls.backward) {
            this.vx -= Math.cos(rad) * this.acceleration * 0.5; // Reverse is slower
            this.vy -= Math.sin(rad) * this.acceleration * 0.5;
        }

        // Emergency Brake
        if (controls.ebrake) {
            this.vx *= 0.8;
            this.vy *= 0.8;
        }

        // Apply Friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Cap Speed
        this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        // We'll treat 1 pixel/frame roughly as 0.1 m/s for visualization scale
        const speedScale = 0.1; 
        let displaySpeed = this.speed * speedScale;
        
        if (displaySpeed > this.maxSpeed) {
            const ratio = this.maxSpeed / displaySpeed;
            this.vx *= ratio;
            this.vy *= ratio;
            this.speed = this.maxSpeed / speedScale;
            displaySpeed = this.maxSpeed;
        }

        // Proposed new position
        let newX = this.x + this.vx;
        let newY = this.y + this.vy;

        // Collision with world boundaries
        if (newX < this.radius) { newX = this.radius; this.vx *= -0.3; }
        if (newX > world.width - this.radius) { newX = world.width - this.radius; this.vx *= -0.3; }
        if (newY < this.radius) { newY = this.radius; this.vy *= -0.3; }
        if (newY > world.height - this.radius) { newY = world.height - this.radius; this.vy *= -0.3; }

        // Collision with obstacles
        for (const obs of world.obstacles) {
            const dx = newX - obs.x;
            const dy = newY - obs.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.radius + obs.radius) {
                // Bounce back
                const nx = dx / dist;
                const ny = dy / dist;
                
                // Push out
                const overlap = (this.radius + obs.radius) - dist;
                newX += nx * overlap;
                newY += ny * overlap;
                
                // Reflect velocity and dampen
                const dot = this.vx * nx + this.vy * ny;
                this.vx = (this.vx - 2 * dot * nx) * 0.3;
                this.vy = (this.vy - 2 * dot * ny) * 0.3;
            }
        }

        this.x = newX;
        this.y = newY;
        
        // Update Deltas
        this.speedDelta = displaySpeed - (prevSpeed * speedScale);
        
        let hDelta = this.heading - prevHeading;
        if (hDelta > 180) hDelta -= 360;
        if (hDelta < -180) hDelta += 360;
        this.headingDelta = hDelta;

        // Trail recording
        if (this.trail.length === 0 || 
            Math.abs(this.x - this.trail[this.trail.length - 1].x) > 2 || 
            Math.abs(this.y - this.trail[this.trail.length - 1].y) > 2) {
            
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 200) {
                this.trail.shift();
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.translate(this.x - cameraX, this.y - cameraY);
        
        // Draw Trail
        ctx.restore(); // reset to world coordinates for trail
        ctx.save();
        ctx.translate(-cameraX, -cameraY);
        
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw Robot
        ctx.save();
        ctx.translate(this.x - cameraX, this.y - cameraY);
        ctx.rotate(this.heading * Math.PI / 180);
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d4ff';
        
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        // Triangle pointing right (since 0 degrees is right)
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}
