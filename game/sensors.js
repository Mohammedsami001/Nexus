// Raycasting to find distance to nearest obstacle
function castProximityRay(robot, obstacles, angle, maxDistance = 80) {
    const steps = 100;
    const stepSize = maxDistance / steps;
    const rad = angle * Math.PI / 180;

    for (let i = 1; i <= steps; i++) {
        const testX = robot.x + Math.cos(rad) * stepSize * i;
        const testY = robot.y + Math.sin(rad) * stepSize * i;

        for (const obs of obstacles) {
            const dx = testX - obs.x;
            const dy = testY - obs.y;
            // Ray hit obstacle
            if (Math.sqrt(dx * dx + dy * dy) < obs.radius) {
                return stepSize * i; 
            }
        }
    }
    return maxDistance; // No hit within maxDistance
}

// Cast 8 rays in a forward cone and return minimum distance
function getProximity(robot, obstacles) {
    const angles = [-60, -40, -20, -10, 0, 10, 20, 40, 60];
    let minDist = 30;
    
    for (const offset of angles) {
        const rayAngle = robot.heading + offset;
        const dist = castProximityRay(robot, obstacles, rayAngle);
        minDist = Math.min(minDist, dist);
    }
    
    return minDist;
}

// Draw debug rays (optional visualization)
function drawDebugRays(ctx, robot, obstacles, cameraX, cameraY) {
    const angles = [-60, -40, -20, -10, 0, 10, 20, 40, 60];
    
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (const offset of angles) {
        const rayAngle = robot.heading + offset;
        const dist = castProximityRay(robot, obstacles, rayAngle);
        const rad = rayAngle * Math.PI / 180;
        
        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        ctx.lineTo(
            robot.x + Math.cos(rad) * dist,
            robot.y + Math.sin(rad) * dist
        );
        ctx.stroke();
    }
    ctx.restore();
}
