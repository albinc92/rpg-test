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
            'SAVE_LOAD': new SaveLoadState(this),
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
        console.log('🔄 Popping state, returning to:', previousState.state);
        console.log('Previous state data:', previousState.data);
        
        // Mark that we're resuming from a pause/overlay
        const resumeData = { ...previousState.data, isResumingFromPause: true };
        console.log('Resume data being passed:', resumeData);
        this.enterState(previousState.state, resumeData);
        
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
        await this.waitForAudio();
        this.loadingProgress = 0.4;
        
        this.loadingText = 'Loading maps...';
        // Load maps here
        this.loadingProgress = 0.7;
        
        this.loadingText = 'Initializing game...';
        // Initialize game systems
        this.loadingProgress = 1.0;
        
        // Transition to main menu
        setTimeout(() => {
            this.stateManager.changeState('MAIN_MENU');
        }, 500);
    }

    // Wait for audio to be ready (either immediately or after user interaction)
    waitForAudio() {
        return new Promise((resolve) => {
            // If audio is already ready, resolve immediately
            if (window.audioReady || this.game.audioManager?.audioEnabled) {
                console.log('[LoadingState] Audio already ready');
                resolve();
                return;
            }

            // Update loading text to indicate waiting for user interaction
            this.loadingText = 'Click anywhere to start';
            this.waitingForAudio = true;

            // Wait for audioReady event
            const handleAudioReady = () => {
                console.log('[LoadingState] Audio ready event received');
                document.removeEventListener('audioReady', handleAudioReady);
                this.waitingForAudio = false;
                resolve();
            };

            document.addEventListener('audioReady', handleAudioReady);
            console.log('[LoadingState] Waiting for audio to be ready...');
        });
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        
        if (this.waitingForAudio) {
            // Show "Click to Start" screen (responsive)
            const titleSize = Math.min(48, canvasHeight * 0.08);
            const subtitleSize = Math.min(24, canvasHeight * 0.04);
            ctx.font = `${titleSize}px Arial`;
            ctx.fillText('Click to Start', canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.03);
            
            ctx.font = `${subtitleSize}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText('Click anywhere or press any key to start the game', canvasWidth / 2, canvasHeight / 2 + canvasHeight * 0.05);
        } else {
            // Show normal loading screen (responsive)
            const textSize = Math.min(32, canvasHeight * 0.055);
            ctx.font = `${textSize}px Arial`;
            ctx.fillText(this.loadingText, canvasWidth / 2, canvasHeight / 2);
            
            // Loading bar (responsive)
            const barWidth = Math.min(400, canvasWidth * 0.6);
            const barHeight = Math.max(20, canvasHeight * 0.03);
            const barX = canvasWidth / 2 - barWidth / 2;
            const barY = canvasHeight / 2 + canvasHeight * 0.08;
            
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#0f0';
            ctx.fillRect(barX, barY, barWidth * this.loadingProgress, barHeight);
        }
    }
}

/**
 * Main Menu State
 */
class MainMenuState extends GameState {
    constructor(stateManager) {
        super(stateManager);
        this.backgroundImage = null;
        this.loadBackgroundImage();
    }
    
    loadBackgroundImage() {
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            console.log('🖼️ Main menu background loaded successfully');
        };
        this.backgroundImage.onerror = () => {
            console.warn('⚠️ Failed to load main menu background');
        };
        this.backgroundImage.src = '/bg/main.png';
    }
    
    enter(data = {}) {
        this.selectedOption = 0;
        this.options = ['New Game', 'Load Game', 'Settings', 'Exit'];
        this.musicStarted = false;
        
        // Check if there are any save files
        this.hasSaveFiles = this.game.saveGameManager.hasSaves();
        
        // Check what state we're coming from
        const previousState = this.stateManager.previousState;
        const returningFromSettings = this.stateManager.stateStack.length > 0;
        
        console.log(`🎮 MAIN MENU ENTERED - Previous: ${previousState}, Stack length: ${this.stateManager.stateStack.length}`);
        
        if (returningFromSettings && previousState === 'SETTINGS') {
            console.log('🔄 RETURNING FROM SETTINGS - BGM should continue playing');
            // Don't touch BGM when returning from settings menu
        } else {
            console.log('🆕 ENTERING MAIN MENU - STARTING MAIN MENU BGM');
            // Always start main menu BGM when entering from any other state
            if (this.game.audioManager) {
                // Stop any ambience from maps
                this.game.audioManager.stopAmbience(); 
                // Request main menu BGM (will crossfade from any current BGM)
                this.startMenuMusic();
            }
        }
    }
    
    startMenuMusic() {
        console.log(`🎵 Starting main menu music (musicStarted: ${this.musicStarted})`);
        
        // Always request main menu BGM - AudioManager will handle duplicates
        this.game.audioManager.playBGM('00.mp3');
        this.musicStarted = true;
    }
    
    // REMOVED ensureMenuMusicPlaying - was causing duplicate BGM
    
    resume() {
        // Called when returning from a pushed state like Settings
        // DON'T restart BGM - it should continue playing from where it was
        console.log('Main menu resumed - BGM should continue playing');
        
        // Do nothing - the main menu BGM should already be playing
        // The AudioManager handles volume changes from settings
    }
    
    exit() {
        // Stop main menu BGM to ensure it doesn't continue playing
        console.log('🚪 MAIN MENU EXITED - stopping main menu BGM');
        if (this.game.audioManager) {
            // Clear any pending crossfades and stop the current BGM
            this.game.audioManager.clearAllCrossfades();
            this.game.audioManager.stopBGM();
        }
    }
    
    handleInput(inputManager) {
        // DON'T restart music on input - it should already be playing
        // Only start music when ENTERING main menu, not on every input
        
        if (inputManager.isJustPressed('up')) {
            let newOption = Math.max(0, this.selectedOption - 1);
            // Skip Load Game if no saves
            if (newOption === 1 && !this.hasSaveFiles) {
                newOption = 0;
            }
            if (newOption !== this.selectedOption) {
                this.selectedOption = newOption;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        }
        
        if (inputManager.isJustPressed('down')) {
            let newOption = Math.min(this.options.length - 1, this.selectedOption + 1);
            // Skip Load Game if no saves
            if (newOption === 1 && !this.hasSaveFiles) {
                newOption = 2;
            }
            if (newOption !== this.selectedOption) {
                this.selectedOption = newOption;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
    }
    
    async selectOption() {
        switch (this.selectedOption) {
            case 0: // New Game
                // Start new game - reset playtime
                this.game.playtime = 0;
                this.stateManager.changeState('PLAYING', { isNewGame: true });
                break;
            case 1: // Load Game
                if (this.hasSaveFiles) {
                    // Open save/load menu in load mode from main menu
                    this.stateManager.pushState('SAVE_LOAD', { mode: 'load_list', fromMainMenu: true });
                }
                // If no saves, do nothing (button is grayed out)
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
        
        // Draw background image if loaded, otherwise fallback to black
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Scale background to fill the canvas while maintaining aspect ratio
            const imgAspect = this.backgroundImage.width / this.backgroundImage.height;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > canvasAspect) {
                // Image is wider - fit to height
                drawHeight = canvasHeight;
                drawWidth = drawHeight * imgAspect;
                offsetX = (canvasWidth - drawWidth) / 2;
                offsetY = 0;
            } else {
                // Image is taller - fit to width
                drawWidth = canvasWidth;
                drawHeight = drawWidth / imgAspect;
                offsetX = 0;
                offsetY = (canvasHeight - drawHeight) / 2;
            }
            
            ctx.drawImage(this.backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
            
            // Add a semi-transparent overlay for better text readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else {
            // Fallback background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        // Responsive font sizes based on canvas size
        const titleSize = Math.min(48, canvasHeight * 0.08);
        const menuSize = Math.min(24, canvasHeight * 0.04);
        const hintSize = Math.min(14, canvasHeight * 0.025);
        
        // Draw title with text shadow for better visibility
        ctx.fillStyle = '#000';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        // Text shadow
        const titleY = canvasHeight * 0.25;
        ctx.fillText('RPG Game', canvasWidth / 2 + 2, titleY + 2);
        // Main text
        ctx.fillStyle = '#fff';
        ctx.fillText('RPG Game', canvasWidth / 2, titleY);
        
        // Menu options - responsive positioning
        ctx.font = `bold ${menuSize}px Arial`;
        const menuStartY = canvasHeight * 0.45;
        const menuSpacing = canvasHeight * 0.08;
        
        this.options.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            
            // Check if this is the Load Game option and there are no saves
            const isLoadGameDisabled = (index === 1 && !this.hasSaveFiles);
            
            // Text shadow for all options
            ctx.fillStyle = '#000';
            ctx.fillText(option, canvasWidth / 2 + 2, y + 2);
            
            // Main text - gray out Load Game if no saves
            if (isLoadGameDisabled) {
                ctx.fillStyle = '#666'; // Gray for disabled
            } else {
                ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#fff';
            }
            ctx.fillText(option, canvasWidth / 2, y);
        });
        
        // Show subtle audio hint if audio isn't enabled yet
        if (this.game.audioManager && !this.game.audioManager.audioEnabled) {
            ctx.fillStyle = '#666';
            ctx.font = `${hintSize}px Arial`;
            ctx.fillText('Audio will start with your first interaction', canvasWidth / 2, canvasHeight * 0.95);
        }
    }
}

/**
 * Playing State - Main gameplay
 */
class PlayingState extends GameState {
    async enter(data = {}) {
        // Initialize gameplay
        console.log('Entering gameplay state');
        console.log('Data received:', data);
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('gameplay');
        }
        
        // Check if we're resuming from a pause/overlay state or loading from save
        const isResumingFromPause = data.isResumingFromPause === true;
        const isLoadedGame = data.isLoadedGame === true;
        
        if (isLoadedGame) {
            console.log('💾 Loaded game - player position already restored, map already loaded');
            // Everything is already loaded by SaveGameManager, don't do anything
        } else if (!isResumingFromPause) {
            console.log('🆕 Fresh entry to gameplay - loading map');
            // Load the initial map and start BGM (player position already set in initializePlayer)
            await this.game.loadMap(this.game.currentMapId);
        } else {
            console.log('🔄 Resuming gameplay - preserving player position');
            // Just ensure the map is loaded but don't reset player position
            await this.game.loadMap(this.game.currentMapId);
        }
    }
    
    exit() {
        // Clean up when leaving gameplay
        console.log('Exiting gameplay state');
        
        // Hide touch controls when leaving gameplay
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.hide();
        }
    }
    
    pause() {
        // Called when pushing a state on top (like pause menu)
        console.log('🔄 Gameplay paused');
        
        // Hide touch controls during pause
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.hide();
        }
    }
    
    resume() {
        // Called when returning from a pushed state (like pause menu)
        console.log('🔄 Gameplay resumed - player position preserved');
        // Don't do anything - player position should be preserved
        
        // Show touch controls when resuming
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('gameplay');
        }
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
        this.options = ['Resume', 'Save/Load', 'Settings', 'Main Menu'];
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
            case 1: // Save/Load
                this.stateManager.pushState('SAVE_LOAD');
                break;
            case 2: // Settings
                this.stateManager.pushState('SETTINGS');
                break;
            case 3: // Main Menu
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
        
        // Responsive font sizes
        const titleSize = Math.min(36, canvasHeight * 0.06);
        const menuSize = Math.min(24, canvasHeight * 0.04);
        
        // Draw pause menu
        ctx.fillStyle = '#fff';
        ctx.font = `${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvasWidth / 2, canvasHeight * 0.25);
        
        ctx.font = `${menuSize}px Arial`;
        const menuStartY = canvasHeight * 0.45;
        const menuSpacing = canvasHeight * 0.08;
        
        this.options.forEach((option, index) => {
            ctx.fillStyle = index === this.selectedOption ? '#ff0' : '#fff';
            ctx.fillText(option, canvasWidth / 2, menuStartY + index * menuSpacing);
        });
    }
}

/**
 * Save/Load State - Manage save files
 */
class SaveLoadState extends GameState {
    enter(data = {}) {
        console.log('💾 SAVE/LOAD MENU ENTERED');
        this.mode = data.mode || 'main'; // 'main', 'save_list', 'load_list', 'delete_confirm', 'overwrite_confirm'
        this.fromMainMenu = data.fromMainMenu || false;
        this.selectedOption = 0;
        this.mainOptions = ['Save Game', 'Load Game', 'Back'];
        this.saves = [];
        this.scrollOffset = 0;
        this.maxVisibleSaves = 5; // Reduced to make room for empty slot
        this.saveToDelete = null;
        this.saveToOverwrite = null;
        this.confirmOptions = ['Yes', 'No'];
        
        // If entering directly in load mode (from main menu), load saves
        if (this.mode === 'load_list') {
            this.saves = this.game.saveGameManager.getAllSaves();
        }
    }
    
    handleInput(inputManager) {
        // Handle confirmation dialogs first (block all other input)
        if (this.mode === 'delete_confirm' || this.mode === 'overwrite_confirm') {
            if (inputManager.isJustPressed('cancel')) {
                // Cancel confirmation
                this.mode = this.previousMode;
                this.selectedOption = this.previousSelection;
                if (this.mode === 'delete_confirm') {
                    this.saveToDelete = null;
                } else {
                    this.saveToOverwrite = null;
                }
                return;
            }
            
            if (inputManager.isJustPressed('up')) {
                this.selectedOption = Math.max(0, this.selectedOption - 1);
                this.game.audioManager?.playEffect('menu-navigation.mp3');
                return;
            }
            
            if (inputManager.isJustPressed('down')) {
                const maxOption = this.getMaxOption();
                this.selectedOption = Math.min(maxOption, this.selectedOption + 1);
                this.game.audioManager?.playEffect('menu-navigation.mp3');
                return;
            }
            
            if (inputManager.isJustPressed('confirm')) {
                this.selectOption();
                return;
            }
            
            // Block all other input when in confirmation mode
            return;
        }
        
        // Normal menu input handling
        if (inputManager.isJustPressed('cancel')) {
            if (this.mode === 'main') {
                this.stateManager.popState();
            } else if (this.fromMainMenu) {
                // If we came from main menu, go back to main menu
                this.stateManager.popState();
            } else {
                // Otherwise go back to save/load main menu
                this.mode = 'main';
                this.selectedOption = 0;
            }
            return;
        }
        
        if (inputManager.isJustPressed('up')) {
            const maxOption = this.getMaxOption();
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('down')) {
            const maxOption = this.getMaxOption();
            this.selectedOption = Math.min(maxOption, this.selectedOption + 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
        
        if (inputManager.isJustPressed('delete') && (this.mode === 'save_list' || this.mode === 'load_list')) {
            // Delete key on save/load lists - but not on empty slot
            if (this.mode === 'save_list' && this.selectedOption === 0) {
                // Can't delete the empty slot
                return;
            }
            const actualIndex = this.mode === 'save_list' ? this.selectedOption - 1 : this.selectedOption;
            if (actualIndex >= 0 && actualIndex < this.saves.length) {
                this.showDeleteConfirmation(this.saves[actualIndex]);
            }
        }
    }
    
    getMaxOption() {
        if (this.mode === 'main') {
            return this.mainOptions.length - 1;
        } else if (this.mode === 'delete_confirm' || this.mode === 'overwrite_confirm') {
            return this.confirmOptions.length - 1;
        } else if (this.mode === 'save_list') {
            return this.saves.length; // +1 for empty slot at top
        } else {
            return this.saves.length - 1;
        }
    }
    
    updateScrollOffset() {
        if (this.mode !== 'main' && this.saves.length > this.maxVisibleSaves) {
            // Keep selected item in view
            if (this.selectedOption < this.scrollOffset) {
                this.scrollOffset = this.selectedOption;
            } else if (this.selectedOption >= this.scrollOffset + this.maxVisibleSaves) {
                this.scrollOffset = this.selectedOption - this.maxVisibleSaves + 1;
            }
        }
    }
    
    selectOption() {
        if (this.mode === 'main') {
            switch (this.selectedOption) {
                case 0: // Save Game
                    this.mode = 'save_list';
                    this.saves = this.game.saveGameManager.getAllSaves();
                    this.selectedOption = 0;
                    this.scrollOffset = 0;
                    break;
                case 1: // Load Game
                    this.mode = 'load_list';
                    this.saves = this.game.saveGameManager.getAllSaves();
                    this.selectedOption = 0;
                    this.scrollOffset = 0;
                    break;
                case 2: // Back
                    this.stateManager.popState();
                    break;
            }
        } else if (this.mode === 'save_list') {
            if (this.selectedOption === 0) {
                // Empty slot - create new save
                const saveId = this.game.saveGameManager.saveGame(this.game);
                if (saveId) {
                    console.log('✅ New game saved!');
                    this.game.audioManager?.playEffect('menu-navigation.mp3');
                    // Refresh save list
                    this.saves = this.game.saveGameManager.getAllSaves();
                }
            } else {
                // Ask for overwrite confirmation
                const save = this.saves[this.selectedOption - 1];
                if (save) {
                    this.showOverwriteConfirmation(save);
                }
            }
        } else if (this.mode === 'load_list') {
            // Load selected save
            if (this.saves[this.selectedOption]) {
                const save = this.saves[this.selectedOption];
                // Load game (this now loads the map and restores everything including audio)
                this.game.saveGameManager.loadGame(save.id, this.game).then((success) => {
                    if (success) {
                        console.log('✅ Game loaded!');
                        if (this.fromMainMenu) {
                            // Go to playing state
                            this.stateManager.changeState('PLAYING', { isLoadedGame: true });
                        } else {
                            // Pop back to gameplay (map and audio are already loaded)
                            this.stateManager.popState(); // Exit save/load menu
                            this.stateManager.popState(); // Exit pause menu
                        }
                    }
                });
            }
        } else if (this.mode === 'delete_confirm') {
            console.log('Delete confirmation - selected option:', this.selectedOption, '(0=Yes, 1=No)');
            if (this.selectedOption === 0) {
                // Yes - delete the save
                console.log('User confirmed deletion');
                this.confirmDelete();
            } else {
                // No - cancel
                console.log('User cancelled deletion');
                this.mode = this.previousMode;
                this.selectedOption = this.previousSelection;
                this.saveToDelete = null;
            }
        } else if (this.mode === 'overwrite_confirm') {
            if (this.selectedOption === 0) {
                // Yes - overwrite the save
                this.confirmOverwrite();
            } else {
                // No - cancel
                this.mode = this.previousMode;
                this.selectedOption = this.previousSelection;
                this.saveToOverwrite = null;
            }
        }
    }
    
    showDeleteConfirmation(save) {
        console.log('🗑️ Showing delete confirmation for:', save.name, 'ID:', save.id);
        this.saveToDelete = save;
        this.previousMode = this.mode;
        this.previousSelection = this.selectedOption;
        this.mode = 'delete_confirm';
        this.selectedOption = 1; // Default to "No" (0=Yes, 1=No)
        console.log('Selected option (0=Yes, 1=No):', this.selectedOption);
        this.game.audioManager?.playEffect('menu-navigation.mp3');
    }
    
    confirmDelete() {
        console.log('🗑️ Attempting to delete save:', this.saveToDelete);
        if (this.saveToDelete) {
            const deleteResult = this.game.saveGameManager.deleteSave(this.saveToDelete.id);
            console.log('Delete result:', deleteResult);
            
            if (deleteResult) {
                console.log('✅ Save deleted successfully!');
                this.game.audioManager?.playEffect('menu-navigation.mp3');
                
                // Refresh save list
                this.saves = this.game.saveGameManager.getAllSaves();
                console.log('Updated save list length:', this.saves.length);
                
                // Return to previous mode
                this.mode = this.previousMode;
                
                // Adjust selection to stay in valid range
                if (this.mode === 'save_list') {
                    // For save list, account for empty slot at top
                    const maxSelection = this.saves.length; // +1 for empty slot
                    this.selectedOption = Math.min(this.previousSelection, maxSelection);
                    if (this.selectedOption === 0 && this.saves.length > 0) {
                        this.selectedOption = 1; // Select first real save after empty slot
                    }
                } else {
                    // For load list, no empty slot
                    this.selectedOption = Math.max(0, Math.min(this.previousSelection, this.saves.length - 1));
                }
                
                this.saveToDelete = null;
                this.updateScrollOffset();
            } else {
                console.error('❌ Failed to delete save');
            }
        } else {
            console.error('❌ No save to delete');
        }
    }
    
    showOverwriteConfirmation(save) {
        this.saveToOverwrite = save;
        this.previousMode = this.mode;
        this.previousSelection = this.selectedOption;
        this.mode = 'overwrite_confirm';
        this.selectedOption = 1; // Default to "No"
        this.game.audioManager?.playEffect('menu-navigation.mp3');
    }
    
    confirmOverwrite() {
        if (this.saveToOverwrite) {
            const saveId = this.game.saveGameManager.saveGame(this.game, this.saveToOverwrite.name, this.saveToOverwrite.id);
            if (saveId) {
                console.log('✅ Game saved (overwritten)!');
                this.game.audioManager?.playEffect('menu-navigation.mp3');
                // Refresh save list
                this.saves = this.game.saveGameManager.getAllSaves();
                this.mode = this.previousMode;
                this.selectedOption = this.previousSelection;
                this.saveToOverwrite = null;
            }
        }
    }
    

    
    render(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // Draw translucent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        if (this.mode === 'main') {
            this.renderMainMenu(ctx, canvasWidth, canvasHeight);
        } else if (this.mode === 'delete_confirm' || this.mode === 'overwrite_confirm') {
            // Render the save list behind the confirmation dialog WITHOUT selection highlights
            this.renderSaveList(ctx, canvasWidth, canvasHeight, false);
            // Then render the confirmation on top
            if (this.mode === 'delete_confirm') {
                this.renderDeleteConfirmation(ctx, canvasWidth, canvasHeight);
            } else {
                this.renderOverwriteConfirmation(ctx, canvasWidth, canvasHeight);
            }
        } else {
            this.renderSaveList(ctx, canvasWidth, canvasHeight, true);
        }
    }
    
    renderMainMenu(ctx, canvasWidth, canvasHeight) {
        // Responsive font sizes
        const titleSize = Math.min(36, canvasHeight * 0.06);
        const menuSize = Math.min(24, canvasHeight * 0.04);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Save / Load', canvasWidth / 2, canvasHeight * 0.25);
        
        // Options
        ctx.font = `${menuSize}px Arial`;
        const menuStartY = canvasHeight * 0.45;
        const menuSpacing = canvasHeight * 0.08;
        
        this.mainOptions.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#fff';
            ctx.fillText(option, canvasWidth / 2, y);
        });
    }
    
    renderSaveList(ctx, canvasWidth, canvasHeight, showSelection = true) {
        const title = this.mode === 'save_list' ? 'Save Game' : 'Load Game';
        
        // Responsive font sizes
        const titleSize = Math.min(32, canvasHeight * 0.055);
        const instructionSize = Math.min(16, canvasHeight * 0.028);
        const saveSize = Math.min(20, canvasHeight * 0.035);
        const detailSize = Math.min(16, canvasHeight * 0.028);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, canvasHeight * 0.15);
        
        // Instructions
        ctx.font = `${instructionSize}px Arial`;
        ctx.fillStyle = '#aaa';
        if (this.mode === 'save_list') {
            const saveInstructions = this.game.inputManager.isMobile 
                ? 'A: Select | B: Back'
                : 'Enter: Select | ESC: Back';
            ctx.fillText('Select empty slot for new save or overwrite existing', canvasWidth / 2, canvasHeight * 0.22);
            ctx.fillText(saveInstructions, canvasWidth / 2, canvasHeight * 0.25);
        } else {
            const loadInstructions = this.game.inputManager.isMobile 
                ? 'A: Load | X: Delete | B: Back'
                : 'Enter: Load | Delete: Remove | ESC: Back';
            ctx.fillText(loadInstructions, canvasWidth / 2, canvasHeight * 0.22);
        }
        
        const startY = canvasHeight * 0.3;
        const lineHeight = canvasHeight * 0.12;
        
        // For save mode, show empty slot at top
        if (this.mode === 'save_list') {
            const isSelected = showSelection && this.selectedOption === 0;
            const boxWidth = canvasWidth * 0.8;
            const boxHeight = lineHeight * 0.85;
            const boxX = canvasWidth / 2 - boxWidth / 2;
            const boxY = startY - boxHeight * 0.5;
            
            // Background box for empty slot
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            } else {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                ctx.setLineDash([]);
            }
            
            // Empty slot text
            ctx.textAlign = 'left';
            ctx.fillStyle = isSelected ? '#ffff00' : '#888';
            ctx.font = `bold ${saveSize}px Arial`;
            ctx.fillText('[ Empty Slot - New Save ]', boxX + 20, startY);
        }
        
        // Save list
        if (this.saves.length === 0 && this.mode === 'load_list') {
            ctx.fillStyle = '#888';
            ctx.font = `${saveSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('No save files', canvasWidth / 2, canvasHeight * 0.5);
        } else if (this.saves.length > 0) {
            const saveListStartY = this.mode === 'save_list' ? startY + lineHeight : startY;
            const visibleSaves = this.saves.slice(
                this.scrollOffset, 
                this.scrollOffset + this.maxVisibleSaves
            );
            
            visibleSaves.forEach((save, index) => {
                const actualIndex = this.scrollOffset + index;
                const displayIndex = this.mode === 'save_list' ? actualIndex + 1 : actualIndex;
                const y = saveListStartY + index * lineHeight;
                const isSelected = showSelection && displayIndex === this.selectedOption;
                
                // Responsive box dimensions
                const boxWidth = canvasWidth * 0.8;
                const boxHeight = lineHeight * 0.85;
                const boxX = canvasWidth / 2 - boxWidth / 2;
                const boxY = y - boxHeight * 0.5;
                
                // Background box for save slot
                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                }
                
                // Save name
                ctx.textAlign = 'left';
                ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
                ctx.font = `bold ${saveSize}px Arial`;
                ctx.fillText(save.name, boxX + 20, y);
                
                // Save details
                ctx.font = `${detailSize}px Arial`;
                ctx.fillStyle = isSelected ? '#ffff88' : '#aaa';
                const dateStr = this.game.saveGameManager.formatDate(save.timestamp);
                const playtimeStr = this.game.saveGameManager.formatPlaytime(save.playtime);
                ctx.fillText(`${dateStr}  |  ${playtimeStr}  |  ${save.mapName}`, boxX + 20, y + lineHeight * 0.35);
            });
            
            // Scroll indicators (responsive)
            const scrollArrowSize = Math.min(20, canvasHeight * 0.035);
            const scrollArrowOffset = canvasHeight * 0.03;
            const listStartY = this.mode === 'save_list' ? saveListStartY : startY;
            if (this.scrollOffset > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `${scrollArrowSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('▲', canvasWidth / 2, listStartY - scrollArrowOffset);
            }
            if (this.scrollOffset + this.maxVisibleSaves < this.saves.length) {
                ctx.fillStyle = '#fff';
                ctx.font = `${scrollArrowSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('▼', canvasWidth / 2, listStartY + this.maxVisibleSaves * lineHeight + scrollArrowOffset);
            }
        }
        
        // Back hint (responsive)
        const hintSize = Math.min(14, canvasHeight * 0.025);
        const hintY = canvasHeight * 0.95;
        ctx.fillStyle = '#666';
        ctx.font = `${hintSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Press ESC to go back', canvasWidth / 2, hintY);
    }
    
    renderDeleteConfirmation(ctx, canvasWidth, canvasHeight) {
        // Responsive font sizes
        const titleSize = Math.min(32, canvasHeight * 0.055);
        const messageSize = Math.min(20, canvasHeight * 0.035);
        const optionSize = Math.min(24, canvasHeight * 0.042);
        
        // Draw a darker overlay (completely blocks background)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Title at top
        ctx.fillStyle = '#ff3333';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Delete Save?', canvasWidth / 2, canvasHeight * 0.25);
        
        // Save name
        ctx.fillStyle = '#fff';
        ctx.font = `${messageSize}px Arial`;
        if (this.saveToDelete) {
            ctx.fillText(`"${this.saveToDelete.name}"`, canvasWidth / 2, canvasHeight * 0.35);
        }
        
        // Warning message
        ctx.fillStyle = '#aaa';
        ctx.font = `${messageSize * 0.85}px Arial`;
        ctx.fillText('This action cannot be undone!', canvasWidth / 2, canvasHeight * 0.43);
        
        // Options (vertical like other menus)
        const menuStartY = canvasHeight * 0.55;
        const menuSpacing = canvasHeight * 0.08;
        
        this.confirmOptions.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            
            // Yellow highlight box for selected option
            if (index === this.selectedOption) {
                const boxWidth = canvasWidth * 0.3;
                const boxHeight = menuSpacing * 0.8;
                const boxX = canvasWidth / 2 - boxWidth / 2;
                const boxY = y - menuSpacing * 0.5;
                
                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            }
            
            // Option text - red "Yes" when selected, white "No"
            ctx.font = `bold ${optionSize}px Arial`;
            if (index === 0) {
                // "Yes" option - red/bright red when selected
                ctx.fillStyle = index === this.selectedOption ? '#ff6666' : '#ff3333';
            } else {
                // "No" option - yellow/white
                ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#fff';
            }
            ctx.fillText(option, canvasWidth / 2, y);
        });
        
        // Controls hint at bottom
        ctx.fillStyle = '#666';
        ctx.font = `${messageSize * 0.7}px Arial`;
        const hintText = this.game.inputManager.isMobile ? 'A: Select | B: Cancel' : 'Enter: Select | ESC: Cancel';
        ctx.fillText(hintText, canvasWidth / 2, canvasHeight * 0.85);
    }
    
    renderOverwriteConfirmation(ctx, canvasWidth, canvasHeight) {
        // Responsive font sizes
        const titleSize = Math.min(32, canvasHeight * 0.055);
        const messageSize = Math.min(20, canvasHeight * 0.035);
        const optionSize = Math.min(24, canvasHeight * 0.042);
        
        // Draw a darker overlay (completely blocks background)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Title at top
        ctx.fillStyle = '#FFA500';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Overwrite Save?', canvasWidth / 2, canvasHeight * 0.25);
        
        // Save name
        ctx.fillStyle = '#fff';
        ctx.font = `${messageSize}px Arial`;
        if (this.saveToOverwrite) {
            ctx.fillText(`"${this.saveToOverwrite.name}"`, canvasWidth / 2, canvasHeight * 0.35);
        }
        
        // Warning message
        ctx.fillStyle = '#aaa';
        ctx.font = `${messageSize * 0.85}px Arial`;
        ctx.fillText('This will replace the existing save!', canvasWidth / 2, canvasHeight * 0.43);
        
        // Options (vertical like other menus)
        const menuStartY = canvasHeight * 0.55;
        const menuSpacing = canvasHeight * 0.08;
        
        this.confirmOptions.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            
            // Yellow highlight box for selected option
            if (index === this.selectedOption) {
                const boxWidth = canvasWidth * 0.3;
                const boxHeight = menuSpacing * 0.8;
                const boxX = canvasWidth / 2 - boxWidth / 2;
                const boxY = y - menuSpacing * 0.5;
                
                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            }
            
            // Option text - orange "Yes" when selected, white "No"
            ctx.font = `bold ${optionSize}px Arial`;
            if (index === 0) {
                // "Yes" option - orange/bright orange when selected
                ctx.fillStyle = index === this.selectedOption ? '#FFB84D' : '#FFA500';
            } else {
                // "No" option - yellow/white
                ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#fff';
            }
            ctx.fillText(option, canvasWidth / 2, y);
        });
        
        // Controls hint at bottom
        ctx.fillStyle = '#666';
        ctx.font = `${messageSize * 0.7}px Arial`;
        const hintText = this.game.inputManager.isMobile ? 'A: Select | B: Cancel' : 'Enter: Select | ESC: Cancel';
        ctx.fillText(hintText, canvasWidth / 2, canvasHeight * 0.85);
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
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
            this.game.audioManager?.playEffect('menu-navigation.mp3');
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
                this.game.audioManager?.playEffect('menu-navigation.mp3');
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
            // Convert percentage to 0-1 range and use correct method names
            audioManager.setMasterVolume(settings.masterVolume / 100);
            audioManager.setBGMVolume(settings.musicVolume / 100);
            audioManager.setEffectVolume(settings.effectsVolume / 100);
            audioManager.setMuted(settings.isMuted);
            
            console.log('[SettingsState] ✅ Audio settings applied:', {
                master: settings.masterVolume / 100,
                bgm: settings.musicVolume / 100,
                effects: settings.effectsVolume / 100,
                muted: settings.isMuted
            });
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
        
        // Draw title (responsive)
        const titleSize = Math.min(36, canvasHeight * 0.06);
        const titleY = canvasHeight * 0.2;
        ctx.fillStyle = '#fff';
        ctx.font = `${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Settings', canvasWidth / 2, titleY);
        
        // Draw settings options (responsive)
        const optionSize = Math.min(20, canvasHeight * 0.035);
        ctx.font = `${optionSize}px Arial`;
        const startY = canvasHeight * 0.35;
        const lineHeight = canvasHeight * 0.11;
        const marginX = canvasWidth * 0.1;
        const boxHeight = canvasHeight * 0.075;
        
        this.options.forEach((option, index) => {
            const y = startY + (index * lineHeight);
            const isSelected = index === this.selectedOption;
            
            // Highlight selected option
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(marginX, y - boxHeight / 2, canvasWidth - marginX * 2, boxHeight);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(marginX, y - boxHeight / 2, canvasWidth - marginX * 2, boxHeight);
            }
            
            // Draw option name
            ctx.fillStyle = isSelected ? '#FFD700' : '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(option.name, marginX + canvasWidth * 0.05, y);
            
            // Draw option value
            ctx.textAlign = 'right';
            if (option.type === 'slider') {
                const value = this.game.settings[option.key];
                ctx.fillText(`< ${value}% >`, canvasWidth - marginX - canvasWidth * 0.05, y);
            } else if (option.type === 'toggle') {
                const value = this.game.settings[option.key];
                ctx.fillText(`< ${value ? 'ON' : 'OFF'} >`, canvasWidth - marginX - canvasWidth * 0.05, y);
            }
        });
        
        // Draw instructions (responsive)
        const instructionSize = Math.min(16, canvasHeight * 0.028);
        const instructionY = canvasHeight * 0.93;
        ctx.fillStyle = '#ccc';
        ctx.font = `${instructionSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Use Arrow Keys to Navigate • Left/Right to Adjust • Enter to Select • ESC to Go Back', canvasWidth / 2, instructionY);
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
