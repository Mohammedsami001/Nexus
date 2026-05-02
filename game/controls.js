class Controls {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.ebrake = false;
        this.reset = false;
        this.anyKeyPressed = false;

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    handleKey(e, isDown) {
        if (!this.anyKeyPressed && isDown) {
            this.anyKeyPressed = true;
            document.getElementById('start-overlay').classList.add('hidden');
        }

        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.forward = isDown;
                break;
            case 's':
            case 'arrowdown':
                this.backward = isDown;
                break;
            case 'a':
            case 'arrowleft':
                this.left = isDown;
                break;
            case 'd':
            case 'arrowright':
                this.right = isDown;
                break;
            case ' ':
                this.ebrake = isDown;
                break;
            case 'r':
                this.reset = isDown;
                break;
        }
    }
}
