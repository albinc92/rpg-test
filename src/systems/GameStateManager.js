/**
 * GameStateManager - Manages different game states and transitions
 * Handles menus, gameplay, pause, inventory, etc.
 */
class GameStateManager {
    constructor(game) {
        this.game = game;
        this.currentState = 'LOADING';
        this.previousState = null;
        this.stateStack = []; // For nested states like pause menus
        
        // Define game states
        this.states = {
            'LOADING': new LoadingState(this),
            'MAIN_MENU': new MainMenuState(this),
            'PLAYING': new PlayingState(this),
            'PAUSED': new PausedState(this),
            'INVENTORY': new InventoryState(this),
            'DIALOGUE': new DialogueState(this),
            'SHOP': new ShopState(this),
            'LOOT_WINDOW': new LootWindowState(this),
            'SETTINGS': new SettingsState(this),
            'BATTLE': new BattleState(this)
        };
        
        // Initialize with loading state
        this.enterState('LOADING');
    }
    
    /**
     * Update current state
     */
    update(deltaTime) {
        const state = this.states[this.currentState];
        if (state && state.update) {
            state.update(deltaTime);
        }
    }
    
    /**
     * Render current state
     */
    render(ctx) {
        const state = this.states[this.currentState];
        if (state && state.render) {
            state.render(ctx);
        }
    }
    
    /**
     * Handle input for current state
     */
    handleInput(inputManager) {
        const state = this.states[this.currentState];
        if (state && state.handleInput) {
            state.handleInput(inputManager);
        }
    }
    
    /**
     * Change to a new state
     */
    changeState(newState, data = {}) {
        if (!this.states[newState]) {
            console.error(`Invalid state: ${newState}`);
            return;
        }
        
        this.exitCurrentState();
        this.enterState(newState, data);
    }
    
    /**
     * Push a state onto the stack (for overlay states like pause menu)
     */
    pushState(newState, data = {}) {
        if (!this.states[newState]) {
            console.error(`Invalid state: ${newState}`);
            return;
        }
        
        // Pause current state if it supports it
        const currentState = this.states[this.currentState];
        if (currentState && currentState.pause) {
            currentState.pause();
        }
        
        this.stateStack.push({
            state: this.currentState,
            data: this.currentStateData
        });
        
        this.enterState(newState, data);
    }
    
    /**
     * Pop the current state and return to previous
     */
    popState() {
        if (this.stateStack.length === 0) {
            console.warn('No states to pop');
            return;
        }
        
        this.exitCurrentState();
        
        const previousState = this.stateStack.pop();
        this.enterState(previousState.state, previousState.data);
        
        // Resume previous state if it supports it
        const currentState = this.states[this.currentState];
        if (currentState && currentState.resume) {
            currentState.resume();
        }
    }
    
    /**
     * Enter a new state
     */
    enterState(newState, data = {}) {
        this.previousState = this.currentState;
        this.currentState = newState;
        this.currentStateData = data;
        
        const state = this.states[newState];
        if (state && state.enter) {
            state.enter(data);
        }
        
        console.log(`Entered state: ${newState}`);
    }
    
    /**
     * Exit current state
     */
    exitCurrentState() {
        const state = this.states[this.currentState];
        if (state && state.exit) {
            state.exit();
        }
    }
    
    /**
     * Get current state name
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Check if in a specific state
     */
    isInState(stateName) {
        return this.currentState === stateName;
    }
    
    /**
     * Check if state is on the stack
     */
    isStateInStack(stateName) {
        return this.stateStack.some(s => s.state === stateName);
    }
}

/**
 * Base State class - All game states should extend this
 */
class GameState {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.game = stateManager.game;
    }
    
    enter(data) {
        // Override in subclasses
    }
    
    exit() {
        // Override in subclasses
    }
    
    update(deltaTime) {
        // Override in subclasses
    }
    
    render(ctx) {
        // Override in subclasses
    }
    
    handleInput(inputManager) {
        // Override in subclasses
    }
    
    pause() {
        // Override in subclasses if needed
    }
    
    resume() {
        // Override in subclasses if needed
    }
}

/**
 * Loading State
 */
class LoadingState extends GameState {
    enter() {
        this.loadingProgress = 0;
        this.loadingText = 'Loading...';
        this.startLoading();
    }
    
    async startLoading() {
        // Simulate loading process
        // In a real game, this would load assets, maps, etc.
        
        this.loadingText = 'Loading audio...';
        await this.game.audioManager?.preloadCommonAudio?.();
        this.loadingProgress = 0.3;
        
        this.loadingText = 'Loading maps...';
        // Load maps here
        this.loadingProgress = 0.6;
        
        this.loadingText = 'Initializing game...';
        // Initialize game systems
        this.loadingProgress = 1.0;
        
        // Transition to main menu
        setTimeout(() => {
            this.stateManager.changeState('MAIN_MENU');
        }, 500);
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.loadingText, canvasWidth / 2, canvasHeight / 2);
        
        // Loading bar
        const barWidth = 400;
        const barHeight = 20;
        const barX = canvasWidth / 2 - barWidth / 2;
        const barY = canvasHeight / 2 + 50;
        
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, barWidth * this.loadingProgress, barHeight);
    }
}

/**
 * Main Menu State
 */
class MainMenuState extends GameState {
    enter(data = {}) {
        this.selectedOption = 0;
        this.options = ['New Game', 'Continue', 'Settings', 'Exit'];
        this.musicStarted = false;
        
        // Always stop gameplay audio and start menu music when entering
        // (resume() method will handle returns from pushed states)
        if (this.game.audioManager) {
            this.game.audioManager.stopBGM(500); // Quick fade out
            this.game.audioManager.stopAmbience(500); // Quick fade out
            
            // Start menu music
            this.startMenuMusic();
        }
        
        console.log('Entered main menu - starting fresh');
    }
    
    startMenuMusic() {
        if (this.musicStarted) return;
        
        // Try multiple approaches to start the music
        this.game.audioManager.playBGM('assets/audio/bgm/00.mp3', 0.6, 1000);
        this.musicStarted = true;
        
        // If audio wasn't enabled, set up a one-time listener for any interaction
        if (!this.game.audioManager.audioEnabled) {
            const enableAndPlay = () => {
                if (this.game.audioManager.audioEnabled) {
                    this.game.audioManager.playBGM('assets/audio/bgm/00.mp3', 0.6, 1000);
                    document.removeEventListener('keydown', enableAndPlay);
                    document.removeEventListener('click', enableAndPlay);
                }
            };
            
            document.addEventListener('keydown', enableAndPlay, { once: true });
            document.addEventListener('click', enableAndPlay, { once: true });
        }
    }
    
    ensureMenuMusicPlaying() {
        // Check if the correct main menu music is playing
        if (this.game.audioManager && this.game.audioManager.audioEnabled) {
            // If no BGM is playing, or it's not the menu music, start it
            if (!this.game.audioManager.currentBGM) {
                this.startMenuMusic();
            }
        }
    }
    
    resume() {
        // Called when returning from a pushed state like Settings
        // Check if we need to restart the menu music
        console.log('Main menu resumed - checking music state');
        
        // If audio was muted and then unmuted in settings, we need to restart menu music
        if (this.game.audioManager && !this.game.audioManager.isMuted) {
            // If no BGM is currently playing, or it's paused, start/restart menu music
            if (!this.game.audioManager.currentBGM || 
                this.game.audioManager.currentBGM.paused ||
                this.game.audioManager.currentBGM.volume === 0) {
                console.log('Restarting main menu BGM after settings');
                this.musicStarted = false; // Reset flag so we can start music again
                this.startMenuMusic();
            } else {
                // Music is playing, just ensure it's at the right volume
                this.ensureMenuMusicPlaying();
            }
        }
    }
    
    exit() {
        // Stop menu audio when leaving main menu
        console.log('🚪 MAIN MENU EXIT CALLED - STOPPING BGM');
        if (this.game.audioManager) {
            this.game.audioManager.stopBGM(0); // Stop immediately, no fade
        }
        console.log('🚪 MAIN MENU EXITED');
    }
    
    handleInput(inputManager) {
        console.log('🚨 MainMenuState.handleInput called! Current state:', this.stateManager.getCurrentState());
        
        // Ensure music starts on first interaction
        if (!this.game.audioManager.audioEnabled) {
            console.log('🚨 STARTING MAIN MENU MUSIC FROM HANDLEINPUT!');
            this.startMenuMusic();
        }
        
        if (inputManager.isJustPressed('up')) {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            this.game.audioManager?.playEffect('menu-navigation');
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
            this.game.audioManager?.playEffect('menu-navigation');
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
    }
    
    selectOption() {
        switch (this.selectedOption) {
            case 0: // New Game
                this.stateManager.changeState('PLAYING');
                break;
            case 1: // Continue
                // Load game
                break;
            case 2: // Settings
                this.stateManager.pushState('SETTINGS');
                break;
            case 3: // Exit
                // Exit game
                break;
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions instead of ctx.canvas.width/height
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RPG Game', canvasWidth / 2, 200);
        
        ctx.font = '24px Arial';
        this.options.forEach((option, index) => {
            ctx.fillStyle = index === this.selectedOption ? '#ff0' : '#fff';
            ctx.fillText(option, canvasWidth / 2, 350 + index * 50);
        });
        
        // Show subtle audio hint if audio isn't enabled yet
        if (this.game.audioManager && !this.game.audioManager.audioEnabled) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.fillText('Audio will start with your first interaction', canvasWidth / 2, canvasHeight - 30);
        }
    }
}

/**
 * Playing State - Main gameplay
 */
class PlayingState extends GameState {
    async enter() {
        // Initialize gameplay
        console.log('Entering gameplay state');
        
        // Load the initial map and start BGM
        await this.game.loadMap(this.game.currentMapId);
        this.game.positionPlayerOnMap(this.game.currentMapId);
    }
    
    exit() {
        // Clean up when leaving gameplay
        console.log('Exiting gameplay state');
    }
    
    update(deltaTime) {
        // Update game world
        this.game.updateGameplay(deltaTime);
    }
    
    render(ctx) {
        // Render game world
        this.game.renderGameplay(ctx);
    }
    
    handleInput(inputManager) {
        // Handle gameplay input
        this.game.handleGameplayInput(inputManager);
        
        // Check for pause
        if (inputManager.isJustPressed('menu')) {
            this.stateManager.pushState('PAUSED');
        }
    }
}

/**
 * Paused State
 */
class PausedState extends GameState {
    enter() {
        console.log('⏸️ PAUSE MENU ENTERED');
        console.log('Current BGM:', this.game.audioManager?.currentBGM?.src || 'none');
        this.selectedOption = 0;
        this.options = ['Resume', 'Settings', 'Main Menu'];
    }
    
    handleInput(inputManager) {
        if (inputManager.isJustPressed('menu') || inputManager.isJustPressed('cancel')) {
            this.stateManager.popState();
            return;
        }
        
        if (inputManager.isJustPressed('up')) {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
    }
    
    selectOption() {
        switch (this.selectedOption) {
            case 0: // Resume
                this.stateManager.popState();
                break;
            case 1: // Settings
                this.stateManager.pushState('SETTINGS');
                break;
            case 2: // Main Menu
                this.stateManager.changeState('MAIN_MENU');
                break;
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // Draw translucent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw pause menu
        ctx.fillStyle = '#fff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvasWidth / 2, 200);
        
        ctx.font = '24px Arial';
        this.options.forEach((option, index) => {
            ctx.fillStyle = index === this.selectedOption ? '#ff0' : '#fff';
            ctx.fillText(option, canvasWidth / 2, 300 + index * 50);
        });
    }
}

/**
 * Settings State
 */
class SettingsState extends GameState {
    enter(data = {}) {
        this.selectedOption = 0;
        this.options = [
            { name: 'Master Volume', type: 'slider', key: 'masterVolume', min: 0, max: 100, step: 10 },
            { name: 'BGM Volume', type: 'slider', key: 'musicVolume', min: 0, max: 100, step: 10 },
            { name: 'Effect Volume', type: 'slider', key: 'effectsVolume', min: 0, max: 100, step: 10 },
            { name: 'Mute Audio', type: 'toggle', key: 'isMuted' },
            { name: 'Back', type: 'action' }
        ];
        // Settings menu does NOT handle BGM - it just adjusts volumes
    }
    
    handleInput(inputManager) {
        if (inputManager.isJustPressed('cancel')) {
            this.stateManager.popState();
            return;
        }
        
        if (inputManager.isJustPressed('up')) {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            this.game.audioManager?.playEffect('menu-navigation');
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
            this.game.audioManager?.playEffect('menu-navigation');
        }
        
        if (inputManager.isJustPressed('left')) {
            this.adjustSetting(-1);
        }
        
        if (inputManager.isJustPressed('right')) {
            this.adjustSetting(1);
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
    }
    
    adjustSetting(direction) {
        const option = this.options[this.selectedOption];
        if (!option || !option.key) return;
        
        const settings = this.game.settings;
        
        if (option.type === 'slider') {
            const currentValue = settings[option.key];
            const newValue = Math.max(option.min, Math.min(option.max, currentValue + (direction * option.step)));
            settings[option.key] = newValue;
            
            // Apply the setting change to audio manager
            this.applyAudioSettings();
            
            // Play a test sound for volume adjustment feedback
            if (option.key === 'effectsVolume' || option.key === 'masterVolume') {
                this.game.audioManager?.playEffect('menu-navigation');
            }
        } else if (option.type === 'toggle') {
            settings[option.key] = !settings[option.key];
            this.applyAudioSettings();
            // Settings menu does NOT handle BGM - that's handled by main menu/maps only
        }
        
        // Save settings
        this.saveSettings();
    }
    
    selectOption() {
        const option = this.options[this.selectedOption];
        
        if (option.type === 'action') {
            if (option.name === 'Back') {
                this.stateManager.popState();
            }
        } else if (option.type === 'toggle') {
            this.adjustSetting(1); // Toggle the setting
            // Settings menu does NOT handle BGM - that's handled by main menu/maps only
        }
    }
    
    applyAudioSettings() {
        const settings = this.game.settings;
        const audioManager = this.game.audioManager;
        
        if (audioManager) {
            // Convert percentage to 0-1 range
            audioManager.setMasterVolume(settings.masterVolume / 100);
            audioManager.setMusicVolume(settings.musicVolume / 100);
            audioManager.setEffectsVolume(settings.effectsVolume / 100);
            audioManager.setMuted(settings.isMuted);
            
            // Don't call updateAllVolumes() here since setMuted() already handles it
            // and we don't want to interfere with the muting process
        }
    }
    

    
    saveSettings() {
        // Save to localStorage
        try {
            localStorage.setItem('rpg-game-settings', JSON.stringify(this.game.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw title
        ctx.fillStyle = '#fff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Settings', canvasWidth / 2, 150);
        
        // Draw settings options
        ctx.font = '20px Arial';
        const startY = 250;
        const lineHeight = 60;
        
        this.options.forEach((option, index) => {
            const y = startY + (index * lineHeight);
            const isSelected = index === this.selectedOption;
            
            // Highlight selected option
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(50, y - 25, canvasWidth - 100, 40);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(50, y - 25, canvasWidth - 100, 40);
            }
            
            // Draw option name
            ctx.fillStyle = isSelected ? '#FFD700' : '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(option.name, 100, y);
            
            // Draw option value
            ctx.textAlign = 'right';
            if (option.type === 'slider') {
                const value = this.game.settings[option.key];
                ctx.fillText(`< ${value}% >`, canvasWidth - 100, y);
            } else if (option.type === 'toggle') {
                const value = this.game.settings[option.key];
                ctx.fillText(`< ${value ? 'ON' : 'OFF'} >`, canvasWidth - 100, y);
            }
        });
        
        // Draw instructions
        ctx.fillStyle = '#ccc';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Use Arrow Keys to Navigate • Left/Right to Adjust • Enter to Select • ESC to Go Back', canvasWidth / 2, canvasHeight - 50);
    }
}

// Placeholder states - implement as needed
class InventoryState extends GameState {}
class DialogueState extends GameState {}
class ShopState extends GameState {}
class LootWindowState extends GameState {}
class BattleState extends GameState {}

// Export for use in other files
window.GameStateManager = GameStateManager;
window.GameState = GameState;