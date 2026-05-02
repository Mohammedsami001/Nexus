class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.obstacles = [];
        this.generateObstacles();
    }

    generateObstacles() {
        const numObstacles = 20;
        for (let i = 0; i < numObstacles; i++) {
            // Keep obstacles away from the center (spawn point)
            let x, y, distToCenter;
            do {
                x = Math.random() * this.width;
                y = Math.random() * this.height;
                const dx = x - this.width / 2;
                const dy = y - this.height / 2;
                distToCenter = Math.sqrt(dx * dx + dy * dy);
            } while (distToCenter < 150);

            const radius = 20 + Math.random() * 40;
            this.obstacles.push({ x, y, radius });
        }
    }

    draw(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        const startX = Math.floor(cameraX / gridSize) * gridSize;
        const endX = startX + canvasWidth + gridSize;
        const startY = Math.floor(cameraY / gridSize) * gridSize;
        const endY = startY + canvasHeight + gridSize;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Draw World Boundaries
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, this.width, this.height);

        // Draw Obstacles
        ctx.fillStyle = 'rgba(255, 45, 85, 0.2)';
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 2;
        
        for (const obs of this.obstacles) {
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Inner glow effect
            const gradient = ctx.createRadialGradient(obs.x, obs.y, obs.radius * 0.5, obs.x, obs.y, obs.radius);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'rgba(255, 45, 85, 0.4)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.restore();
    }
}
