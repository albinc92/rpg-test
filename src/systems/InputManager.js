/**
 * InputManager - Centralized input handling system
 * Manages keyboard, mouse, and gamepad inputs with proper state management
 */
class InputManager {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        this.mouse = {
            x: 0,
            y: 0,
            buttons: {},
            prevButtons: {}
        };
        
        // Mobile detection
        this.isMobile = this.detectMobile();
        this.touchControls = {
            joystick: { active: false, x: 0, y: 0 },
            prevJoystick: { active: false, x: 0, y: 0 },
            buttons: { A: false, B: false, X: false, Y: false },
            prevButtons: { A: false, B: false, X: false, Y: false }
        };
        
        // Input configuration
        this.keyBindings = {
            // Movement
            'moveUp': ['KeyW', 'ArrowUp'],
            'moveDown': ['KeyS', 'ArrowDown'],
            'moveLeft': ['KeyA', 'ArrowLeft'],
            'moveRight': ['KeyD', 'ArrowRight'],
            
            // Actions
            'interact': ['Space', 'Enter'],
            'run': ['ShiftLeft', 'ShiftRight'],
            'menu': ['Escape', 'Tab'],
            'inventory': ['KeyI'],
            
            // UI Navigation
            'confirm': ['Enter', 'Space'],
            'cancel': ['Escape'],
            'delete': ['Delete', 'Backspace', 'KeyX'],
            'up': ['ArrowUp', 'KeyW'],
            'down': ['ArrowDown', 'KeyS'],
            'left': ['ArrowLeft', 'KeyA'],
            'right': ['ArrowRight', 'KeyD']
        };
        
        // Button mapping for mobile/gamepad (maps virtual buttons to actions)
        this.buttonMapping = {
            'A': 'confirm',
            'B': 'cancel',
            'X': 'delete',
            'Y': 'inventory'
        };

        // Gamepad state
        this.gamepadState = {
            buttons: {},     // Current frame button state
            prevButtons: {}, // Previous frame button state
            axes: [],        // Current frame axes
            connected: false,
            index: -1
        };

        // Standard Gamepad Mapping (Xbox/PlayStation standard layout)
        this.gamepadMapping = {
            0: ['confirm', 'interact'], // A / Cross
            1: ['cancel', 'run'],       // B / Circle
            2: ['delete'],              // X / Square
            3: ['inventory', 'menu'],   // Y / Triangle
            8: ['menu'],                // Select / Share
            9: ['menu'],                // Start / Options
            12: ['up', 'moveUp'],       // D-Pad Up
            13: ['down', 'moveDown'],   // D-Pad Down
            14: ['left', 'moveLeft'],   // D-Pad Left
            15: ['right', 'moveRight']  // D-Pad Right
        };
        
        this.setupEventListeners();
        
        if (this.isMobile) {
            console.log('📱 Mobile device detected - touch controls will be available');
        }
    }
    
    /**
     * Detect if running on mobile device
     */
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for mobile devices
        if (/android/i.test(userAgent)) return true;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return true;
        
        // Check for touch capability
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            // Only consider it mobile if screen is small enough
            return window.innerWidth <= 1024;
        }
        
        return false;
    }
    
    /**
     * Setup event listeners for input
     */
    setupEventListeners() {
        // Gamepad connection events
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            this.gamepadState.connected = true;
            this.gamepadState.index = e.gamepad.index;
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            if (this.gamepadState.index === e.gamepad.index) {
                this.gamepadState.connected = false;
                this.gamepadState.index = -1;
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Don't capture input if user is typing in a text field
            const isTyping = document.activeElement && 
                            (document.activeElement.tagName === 'INPUT' || 
                             document.activeElement.tagName === 'TEXTAREA' ||
                             document.activeElement.isContentEditable);
            
            if (!isTyping) {
                this.keys[e.code] = true;
                
                // Prevent default behavior for game keys
                if (this.isGameKey(e.code)) {
                    e.preventDefault();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        document.addEventListener('mousedown', (e) => {
            this.mouse.buttons[e.button] = true;
        });
        
        document.addEventListener('mouseup', (e) => {
            this.mouse.buttons[e.button] = false;
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Handle window focus/blur to prevent stuck keys
        window.addEventListener('blur', () => {
            this.clearAllInputs();
        });
    }
    
    /**
     * Update input state (call once per frame)
     */
    update() {
        // Store previous frame state for edge detection
        this.prevKeys = { ...this.keys };
        this.mouse.prevButtons = { ...this.mouse.buttons };
        this.touchControls.prevButtons = { ...this.touchControls.buttons };
        this.touchControls.prevJoystick = { ...this.touchControls.joystick };

        // Update Gamepad State
        if (this.gamepadState.connected && navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[this.gamepadState.index];
            
            if (gamepad) {
                // Store previous buttons
                this.gamepadState.prevButtons = { ...this.gamepadState.buttons };
                
                // Update current buttons
                gamepad.buttons.forEach((button, index) => {
                    this.gamepadState.buttons[index] = button.pressed;
                });
                
                // Update axes
                this.gamepadState.axes = [...gamepad.axes];
            }
        }
    }
    
    /**
     * Check if an action is currently pressed
     */
    isPressed(action) {
        // Check keyboard
        const keys = this.keyBindings[action];
        if (keys && keys.some(key => this.keys[key])) {
            return true;
        }
        
        // Check Gamepad
        if (this.gamepadState.connected) {
            for (const [btnIndex, actions] of Object.entries(this.gamepadMapping)) {
                if (actions.includes(action) && this.gamepadState.buttons[btnIndex]) {
                    return true;
                }
            }
        }

        // Check touch controls (find button that maps to this action)
        if (this.isMobile) {
            for (const [button, mappedAction] of Object.entries(this.buttonMapping)) {
                if (mappedAction === action && this.touchControls.buttons[button]) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check if an action was just pressed (pressed this frame, not last frame)
     */
    isJustPressed(action) {
        // Check keyboard
        const keys = this.keyBindings[action];
        if (keys && keys.some(key => this.keys[key] && !this.prevKeys[key])) {
            return true;
        }

        // Check Gamepad
        if (this.gamepadState.connected) {
            for (const [btnIndex, actions] of Object.entries(this.gamepadMapping)) {
                if (actions.includes(action) && 
                    this.gamepadState.buttons[btnIndex] && 
                    !this.gamepadState.prevButtons[btnIndex]) {
                    return true;
                }
            }
        }
        
        // Check touch controls buttons
        if (this.isMobile) {
            for (const [button, mappedAction] of Object.entries(this.buttonMapping)) {
                if (mappedAction === action && 
                    this.touchControls.buttons[button] && 
                    !this.touchControls.prevButtons[button]) {
                    return true;
                }
            }
            
            // Check joystick for directional actions
            const deadzone = 0.5; // Require 50% deflection
            const joyX = this.touchControls.joystick.x;
            const joyY = this.touchControls.joystick.y;
            const prevJoyX = this.touchControls.prevJoystick.x;
            const prevJoyY = this.touchControls.prevJoystick.y;
            
            if (action === 'up' && joyY < -deadzone && prevJoyY >= -deadzone) {
                return true;
            }
            if (action === 'down' && joyY > deadzone && prevJoyY <= deadzone) {
                return true;
            }
            if (action === 'left' && joyX < -deadzone && prevJoyX >= -deadzone) {
                return true;
            }
            if (action === 'right' && joyX > deadzone && prevJoyX <= deadzone) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if an action was just released
     */
    isJustReleased(action) {
        const keys = this.keyBindings[action];
        if (!keys) return false;
        
        return keys.some(key => !this.keys[key] && this.prevKeys[key]);
    }
    
    /**
     * Get movement input as a normalized vector
     */
    getMovementInput() {
        let x = 0;
        let y = 0;
        
        // Keyboard input
        if (this.isPressed('moveLeft')) x -= 1;
        if (this.isPressed('moveRight')) x += 1;
        if (this.isPressed('moveUp')) y -= 1;
        if (this.isPressed('moveDown')) y += 1;
        
        // Gamepad Joystick Input (overrides keyboard if active)
        if (this.gamepadState.connected && this.gamepadState.axes.length >= 2) {
            const axisX = this.gamepadState.axes[0];
            const axisY = this.gamepadState.axes[1];
            const deadzone = 0.2;
            
            if (Math.abs(axisX) > deadzone || Math.abs(axisY) > deadzone) {
                x = axisX;
                y = axisY;
            }
        }

        // Touch joystick input (overrides keyboard/gamepad if active)
        if (this.isMobile && this.touchControls.joystick.active) {
            x = this.touchControls.joystick.x;
            y = this.touchControls.joystick.y;
        }
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const magnitude = Math.sqrt(x * x + y * y);
            x /= magnitude;
            y /= magnitude;
        }
        
        return { x, y };
    }
    
    /**
     * Check if mouse button is pressed
     */
    isMousePressed(button = 0) {
        return this.mouse.buttons[button] || false;
    }
    
    /**
     * Check if mouse button was just pressed
     */
    isMouseJustPressed(button = 0) {
        return this.mouse.buttons[button] && !this.mouse.prevButtons[button];
    }
    
    /**
     * Get mouse position
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    /**
     * Check if a key code is used by the game
     */
    isGameKey(code) {
        return Object.values(this.keyBindings).flat().includes(code);
    }
    
    /**
     * Clear all input state
     */
    clearAllInputs() {
        this.keys = {};
        this.mouse.buttons = {};
        this.touchControls.buttons = { A: false, B: false, X: false, Y: false };
        this.touchControls.joystick = { active: false, x: 0, y: 0 };
    }
    
    /**
     * Set virtual button state (called by touch controls UI)
     */
    setVirtualButton(button, pressed) {
        if (this.touchControls.buttons.hasOwnProperty(button)) {
            this.touchControls.buttons[button] = pressed;
        }
    }
    
    /**
     * Set virtual joystick state (called by touch controls UI)
     */
    setVirtualJoystick(x, y, active) {
        this.touchControls.joystick.x = x;
        this.touchControls.joystick.y = y;
        this.touchControls.joystick.active = active;
    }
    
    /**
     * Get button label for an action (for UI display)
     */
    getButtonForAction(action) {
        for (const [button, mappedAction] of Object.entries(this.buttonMapping)) {
            if (mappedAction === action) {
                return button;
            }
        }
        return null;
    }
    
    /**
     * Set custom key binding
     */
    setKeyBinding(action, keys) {
        this.keyBindings[action] = Array.isArray(keys) ? keys : [keys];
    }
    
    /**
     * Get current key bindings for an action
     */
    getKeyBinding(action) {
        return this.keyBindings[action] || [];
    }
    
    /**
     * Check for any input (useful for "press any key" screens)
     */
    isAnyKeyPressed() {
        return Object.values(this.keys).some(pressed => pressed) ||
               Object.values(this.mouse.buttons).some(pressed => pressed);
    }
    
    /**
     * Simulate a key press (for touch arrow buttons)
     */
    simulateKeyPress(direction) {
        // Map direction to key action
        const actionMap = {
            'up': 'up',
            'down': 'down',
            'left': 'left',
            'right': 'right'
        };
        
        const action = actionMap[direction];
        if (!action) return;
        
        // Get the key codes for this action
        const keyCodes = this.keyBindings[action];
        if (!keyCodes || keyCodes.length === 0) return;
        
        // Simulate pressing the first bound key
        const keyCode = keyCodes[0];
        
        // Set it as pressed
        this.keys[keyCode] = true;
        
        // Release after a short delay (simulates a tap)
        setTimeout(() => {
            this.keys[keyCode] = false;
        }, 100);
    }
    
    /**
     * Get debug info for input state
     */
    getDebugInfo() {
        const pressedKeys = Object.entries(this.keys)
            .filter(([key, pressed]) => pressed)
            .map(([key]) => key);
            
        const pressedMouseButtons = Object.entries(this.mouse.buttons)
            .filter(([button, pressed]) => pressed)
            .map(([button]) => `Mouse${button}`);
        
        return {
            pressedKeys,
            pressedMouseButtons,
            mousePosition: this.getMousePosition(),
            movementInput: this.getMovementInput()
        };
    }
}

// Export for use in other files
window.InputManager = InputManager;