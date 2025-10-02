/**
 * TouchControlsUI - Virtual gamepad overlay for mobile devices
 * Renders a virtual joystick and buttons for touch input
 */
class TouchControlsUI {
    constructor(inputManager) {
        this.inputManager = inputManager;
        this.container = null;
        this.joystickOuter = null;
        this.joystickInner = null;
        this.buttons = {};
        
        this.joystickState = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            maxDistance: 50 // pixels
        };
        
        this.buttonStates = {
            A: { touchId: null, pressed: false },
            B: { touchId: null, pressed: false },
            X: { touchId: null, pressed: false },
            Y: { touchId: null, pressed: false }
        };
        
        this.visible = false;
        
        if (this.inputManager.isMobile) {
            this.createUI();
            this.setupTouchListeners();
        }
    }
    
    /**
     * Create the touch controls UI elements
     */
    createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;
        
        // Left side - Virtual Joystick
        this.createJoystick();
        
        // Right side - Action Buttons
        this.createButtons();
        
        document.body.appendChild(this.container);
    }
    
    /**
     * Create virtual joystick
     */
    createJoystick() {
        const joystickContainer = document.createElement('div');
        joystickContainer.style.cssText = `
            position: absolute;
            left: 60px;
            bottom: 80px;
            width: 120px;
            height: 120px;
            pointer-events: auto;
        `;
        
        // Outer circle (boundary)
        this.joystickOuter = document.createElement('div');
        this.joystickOuter.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            border: 3px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Inner circle (stick)
        this.joystickInner = document.createElement('div');
        this.joystickInner.style.cssText = `
            position: absolute;
            width: 50%;
            height: 50%;
            left: 25%;
            top: 25%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            transition: all 0.1s ease-out;
        `;
        
        joystickContainer.appendChild(this.joystickOuter);
        joystickContainer.appendChild(this.joystickInner);
        this.container.appendChild(joystickContainer);
    }
    
    /**
     * Create action buttons (A, B, X, Y layout)
     */
    createButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: absolute;
            right: 60px;
            bottom: 80px;
            width: 180px;
            height: 180px;
            pointer-events: auto;
        `;
        
        const buttonLayout = {
            'A': { x: '65%', y: '80%', color: '#4CAF50', label: 'A' },  // Bottom (Confirm)
            'B': { x: '90%', y: '50%', color: '#f44336', label: 'B' },  // Right (Cancel)
            'X': { x: '40%', y: '50%', color: '#2196F3', label: 'X' },  // Left (Delete/Action)
            'Y': { x: '65%', y: '20%', color: '#FFC107', label: 'Y' }   // Top (Inventory)
        };
        
        for (const [button, config] of Object.entries(buttonLayout)) {
            const btn = this.createButton(button, config);
            this.buttons[button] = btn;
            buttonContainer.appendChild(btn);
        }
        
        this.container.appendChild(buttonContainer);
    }
    
    /**
     * Create individual button
     */
    createButton(buttonId, config) {
        const button = document.createElement('div');
        button.className = 'touch-button';
        button.dataset.button = buttonId;
        button.style.cssText = `
            position: absolute;
            left: ${config.x};
            top: ${config.y};
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${config.color};
            border: 3px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 24px;
            font-weight: bold;
            color: white;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            user-select: none;
            -webkit-user-select: none;
            transition: all 0.1s ease-out;
        `;
        button.textContent = config.label;
        
        return button;
    }
    
    /**
     * Setup touch event listeners
     */
    setupTouchListeners() {
        // Handle multiple simultaneous touches
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.container.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Check if touch is on joystick
            if (target === this.joystickOuter || target === this.joystickInner) {
                if (!this.joystickState.active) {
                    this.joystickState.active = true;
                    this.joystickState.touchId = touch.identifier;
                    this.joystickState.startX = touch.clientX;
                    this.joystickState.startY = touch.clientY;
                    this.joystickState.currentX = touch.clientX;
                    this.joystickState.currentY = touch.clientY;
                    this.updateJoystick();
                }
            }
            // Check if touch is on a button
            else if (target && target.classList.contains('touch-button')) {
                const buttonId = target.dataset.button;
                if (buttonId && !this.buttonStates[buttonId].pressed) {
                    this.buttonStates[buttonId].touchId = touch.identifier;
                    this.buttonStates[buttonId].pressed = true;
                    this.pressButton(buttonId);
                }
            }
        }
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Update joystick if this touch controls it
            if (this.joystickState.active && touch.identifier === this.joystickState.touchId) {
                this.joystickState.currentX = touch.clientX;
                this.joystickState.currentY = touch.clientY;
                this.updateJoystick();
            }
        }
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Release joystick if this touch controlled it
            if (this.joystickState.active && touch.identifier === this.joystickState.touchId) {
                this.joystickState.active = false;
                this.joystickState.touchId = null;
                this.resetJoystick();
            }
            
            // Release button if this touch controlled it
            for (const [buttonId, state] of Object.entries(this.buttonStates)) {
                if (state.pressed && touch.identifier === state.touchId) {
                    state.pressed = false;
                    state.touchId = null;
                    this.releaseButton(buttonId);
                }
            }
        }
    }
    
    /**
     * Update joystick position and send input to InputManager
     */
    updateJoystick() {
        const deltaX = this.joystickState.currentX - this.joystickState.startX;
        const deltaY = this.joystickState.currentY - this.joystickState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Clamp to max distance
        const clampedDistance = Math.min(distance, this.joystickState.maxDistance);
        const angle = Math.atan2(deltaY, deltaX);
        
        const clampedX = Math.cos(angle) * clampedDistance;
        const clampedY = Math.sin(angle) * clampedDistance;
        
        // Update visual position
        const offsetX = (clampedX / this.joystickState.maxDistance) * 25; // 25% max offset
        const offsetY = (clampedY / this.joystickState.maxDistance) * 25;
        this.joystickInner.style.left = `${25 + offsetX}%`;
        this.joystickInner.style.top = `${25 + offsetY}%`;
        
        // Send normalized input to InputManager
        const normalizedX = clampedX / this.joystickState.maxDistance;
        const normalizedY = clampedY / this.joystickState.maxDistance;
        this.inputManager.setVirtualJoystick(normalizedX, normalizedY, true);
    }
    
    /**
     * Reset joystick to center
     */
    resetJoystick() {
        this.joystickInner.style.left = '25%';
        this.joystickInner.style.top = '25%';
        this.inputManager.setVirtualJoystick(0, 0, false);
    }
    
    /**
     * Press button
     */
    pressButton(buttonId) {
        const button = this.buttons[buttonId];
        if (button) {
            button.style.transform = 'translate(-50%, -50%) scale(0.9)';
            button.style.opacity = '0.7';
        }
        this.inputManager.setVirtualButton(buttonId, true);
    }
    
    /**
     * Release button
     */
    releaseButton(buttonId) {
        const button = this.buttons[buttonId];
        if (button) {
            button.style.transform = 'translate(-50%, -50%) scale(1)';
            button.style.opacity = '1';
        }
        this.inputManager.setVirtualButton(buttonId, false);
    }
    
    /**
     * Show touch controls
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.visible = true;
        }
    }
    
    /**
     * Hide touch controls
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.visible = false;
            // Reset all states
            this.resetJoystick();
            for (const buttonId of Object.keys(this.buttonStates)) {
                this.buttonStates[buttonId].pressed = false;
                this.buttonStates[buttonId].touchId = null;
                this.inputManager.setVirtualButton(buttonId, false);
            }
        }
    }
    
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Check if controls are visible
     */
    isVisible() {
        return this.visible;
    }
    
    /**
     * Update button labels based on current context (e.g., in menu vs gameplay)
     */
    updateButtonLabels(context) {
        const labels = {
            gameplay: {
                A: { label: 'A', sublabel: 'Act' },
                B: { label: 'B', sublabel: 'Menu' },
                X: { label: 'X', sublabel: 'Run' },
                Y: { label: 'Y', sublabel: 'Inv' }
            },
            menu: {
                A: { label: 'A', sublabel: 'OK' },
                B: { label: 'B', sublabel: 'Back' },
                X: { label: 'X', sublabel: 'Del' },
                Y: { label: 'Y', sublabel: '' }
            }
        };
        
        const contextLabels = labels[context] || labels.gameplay;
        
        for (const [buttonId, config] of Object.entries(contextLabels)) {
            const button = this.buttons[buttonId];
            if (button) {
                button.textContent = config.label;
                // Could add sublabel element here if needed
            }
        }
    }
    
    /**
     * Destroy touch controls (cleanup)
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Export for use in other files
window.TouchControlsUI = TouchControlsUI;
