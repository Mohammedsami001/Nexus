const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let world;
let robot;
let controls;
let telemetry;

// Camera
let cameraX = 0;
let cameraY = 0;

// Timing for Telemetry (1Hz)
let lastTelemetryTime = 0;

// HUD Elements
const speedVal = document.getElementById('speed-val');
const headingVal = document.getElementById('heading-val');
const proxVal = document.getElementById('prox-val');
const proxContainer = document.getElementById('prox-container');

function init() {
    // Resize canvas
    resize();
    window.addEventListener('resize', resize);

    // Initialize systems
    world = new World(2000, 2000);
    robot = new Robot(1000, 1000); // Center of world
    controls = new Controls();

    // Use dynamic URL — no hardcoded localhost
    telemetry = new TelemetryClient();

    console.log('[Engine] Game initialized. World: 2000x2000, Robot at center.');
    console.log('[Engine] Use WASD to drive. Telemetry sends every 1s.');

    // Start Loop
    requestAnimationFrame(gameLoop);
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function updateHUD(proximity) {
    // Format Speed (0.1 scale applied in robot class already)
    const displaySpeed = (robot.speed * 0.1).toFixed(2);
    speedVal.textContent = displaySpeed;

    // Format Heading
    headingVal.textContent = robot.heading.toFixed(1);

    // Format Proximity
    proxVal.textContent = proximity.toFixed(1);

    // Danger style if close
    if (proximity < 80) {
        proxContainer.classList.add('danger');
    } else {
        proxContainer.classList.remove('danger');
    }
}

function updateCamera() {
    // Lerp camera to robot position
    const targetCamX = robot.x - canvas.width / 2;
    const targetCamY = robot.y - canvas.height / 2;

    // Smooth follow
    cameraX += (targetCamX - cameraX) * 0.1;
    cameraY += (targetCamY - cameraY) * 0.1;

    // Clamp to world bounds
    cameraX = Math.max(0, Math.min(cameraX, world.width - canvas.width));
    cameraY = Math.max(0, Math.min(cameraY, world.height - canvas.height));
}

function gameLoop(timestamp) {
    // Reset if requested
    if (controls.reset) {
        robot.x = world.width / 2;
        robot.y = world.height / 2;
        robot.vx = 0;
        robot.vy = 0;
        robot.trail = [];
    }

    // 1. Update Physics & Logic
    robot.update(controls, world);

    // 2. Read Sensors
    const proximity = getProximity(robot, world.obstacles);

    // 3. Update Camera
    updateCamera();

    // 4. Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.draw(ctx, cameraX, cameraY, canvas.width, canvas.height);
    drawDebugRays(ctx, robot, world.obstacles, cameraX, cameraY);
    robot.draw(ctx, cameraX, cameraY);

    // 5. Update HUD
    updateHUD(proximity);

    // 6. Send Telemetry at 1Hz (every 1000ms)
    if (timestamp - lastTelemetryTime > 1000) {
        lastTelemetryTime = timestamp;
        telemetry.sendReading({
            speed: robot.speed * 0.1, // Scale speed to match simulator
            heading: robot.heading,
            speedDelta: robot.speedDelta,
            headingDelta: robot.headingDelta,
            x: robot.x,
            y: robot.y
        }, proximity);
    }

    requestAnimationFrame(gameLoop);
}

// Start game when window loads
window.addEventListener('load', init);
