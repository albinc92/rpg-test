/**
 * Input System
 * Handles keyboard and mouse input with support for 360-degree movement
 */
class InputSystem {
    constructor() {
        this.keys = new Map();
        this.previousKeys = new Map();
        this.mouseButtons = new Map();
        this.previousMouseButtons = new Map();
        this.mousePosition = new Vector2(0, 0);
        this.mouseDelta = new Vector2(0, 0);
        this.previousMousePosition = new Vector2(0, 0);
        
        this.canvas = null;
        
        // Movement vectors for smooth 360-degree movement
        this.movementVector = new Vector2(0, 0);
        
        // Key bindings
        this.keyBindings = {
            // Movement
            'KeyW': 'up',
            'KeyA': 'left', 
            'KeyS': 'down',
            'KeyD': 'right',
            'ArrowUp': 'up',
            'ArrowLeft': 'left',
            'ArrowDown': 'down',
            'ArrowRight': 'right',
            
            // Actions
            'ShiftLeft': 'run',
            'ShiftRight': 'run',
            'ControlLeft': 'crouch',
            'ControlRight': 'crouch',
            'KeyE': 'interact',
            'Tab': 'inventory',
            'Escape': 'menu'
        };
        
        // Mouse sensitivity for camera rotation
        this.mouseSensitivity = 0.002;
    }

    init(canvas) {
        this.canvas = canvas;
        
        // Keyboard event listeners
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Mouse event listeners
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Focus management
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
        
        console.log('Input System initialized');
    }

    update() {
        // Store previous frame state
        this.previousKeys = new Map(this.keys);
        this.previousMouseButtons = new Map(this.mouseButtons);
        this.previousMousePosition = this.mousePosition.clone();
        
        // Calculate movement vector for 360-degree movement
        this.updateMovementVector();
        
        // Reset mouse delta
        this.mouseDelta = new Vector2(0, 0);
    }

    updateMovementVector() {
        let x = 0;
        let y = 0;
        
        // Check directional keys using proper key codes
        if (this.keys.get('KeyA') || this.keys.get('ArrowLeft')) x -= 1;
        if (this.keys.get('KeyD') || this.keys.get('ArrowRight')) x += 1;
        if (this.keys.get('KeyW') || this.keys.get('ArrowUp')) y -= 1;
        if (this.keys.get('KeyS') || this.keys.get('ArrowDown')) y += 1;
        
        // Normalize for diagonal movement
        this.movementVector = new Vector2(x, y);
        if (this.movementVector.magnitude() > 0) {
            this.movementVector = this.movementVector.normalize();
        }
    }

    // Keyboard methods
    onKeyDown(event) {
        this.keys.set(event.code, true);
        event.preventDefault();
    }

    onKeyUp(event) {
        this.keys.set(event.code, false);
        event.preventDefault();
    }

    isKeyDown(key) {
        // Check by key code directly (e.g., 'KeyW', 'ArrowUp')
        if (this.keys.has(key)) {
            return this.keys.get(key) || false;
        }
        
        // Convert single characters to key codes (e.g., 'w' -> 'KeyW')
        if (key.length === 1) {
            const keyCode = 'Key' + key.toUpperCase();
            if (this.keys.has(keyCode)) {
                return this.keys.get(keyCode) || false;
            }
        }
        
        // Check by binding
        const binding = this.getKeyBinding(key);
        if (binding) {
            return this.keys.get(binding) || false;
        }
        
        return false;
    }

    isKeyPressed(key) {
        const current = this.isKeyDown(key);
        const previous = this.previousKeys.get(key) || false;
        return current && !previous;
    }

    getKeyBinding(action) {
        for (const [key, binding] of Object.entries(this.keyBindings)) {
            if (binding === action) {
                return key;
            }
        }
        return null;
    }

    // Mouse methods
    onMouseDown(event) {
        this.mouseButtons.set(event.button, true);
        this.updateMousePosition(event);
        event.preventDefault();
    }

    onMouseUp(event) {
        this.mouseButtons.set(event.button, false);
        this.updateMousePosition(event);
        event.preventDefault();
    }

    onMouseMove(event) {
        const oldPos = this.mousePosition.clone();
        this.updateMousePosition(event);
        this.mouseDelta = this.mousePosition.subtract(oldPos);
    }

    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition = new Vector2(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    }

    isMouseDown(button = 0) {
        return this.mouseButtons.get(button) || false;
    }

    isMousePressed(button = 0) {
        const current = this.isMouseDown(button);
        const previous = this.previousMouseButtons.get(button) || false;
        return current && !previous;
    }

    // Movement methods for game objects
    getMovementVector() {
        return this.movementVector.clone();
    }

    getMouseDelta() {
        return this.mouseDelta.clone();
    }

    // Action methods using key bindings
    isActionDown(action) {
        for (const [keyCode, binding] of Object.entries(this.keyBindings)) {
            if (binding === action && (this.keys.get(keyCode) || false)) {
                return true;
            }
        }
        return false;
    }

    isActionPressed(action) {
        for (const [keyCode, binding] of Object.entries(this.keyBindings)) {
            if (binding === action) {
                const current = this.keys.get(keyCode) || false;
                const previous = this.previousKeys.get(keyCode) || false;
                if (current && !previous) {
                    return true;
                }
            }
        }
        return false;
    }

    // Utility methods
    getMouseAngle(fromPosition) {
        const direction = this.mousePosition.subtract(fromPosition);
        return direction.angle();
    }

    getMovementAngle() {
        if (this.movementVector.magnitude() === 0) return 0;
        return this.movementVector.angle();
    }
}
