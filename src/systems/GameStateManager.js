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
        
        // Initialize menu renderer for consistent styling
        this.menuRenderer = new MenuRenderer(game);
        
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
    enter(data = {}) {
        this.loadingProgress = 0;
        this.loadingText = 'Loading...';
        this.loadSaveId = data.loadSaveId || null;
        this.isLoadedGame = data.isLoadedGame || false;
        this.fromPauseMenu = data.fromPauseMenu || false;
        
        // Hide touch controls during loading
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.hide();
        }
        
        this.startLoading();
    }
    
    async startLoading() {
        // Check if we're loading a saved game
        if (this.loadSaveId) {
            await this.loadSavedGame();
            return;
        }
        
        // Normal game initialization (first time load)
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
    
    async loadSavedGame() {
        this.loadingText = 'Loading save data...';
        this.loadingProgress = 0.2;
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        
        this.loadingText = 'Loading map...';
        this.loadingProgress = 0.4;
        
        // Load the saved game
        const success = await this.game.saveGameManager.loadGame(this.loadSaveId, this.game);
        
        if (success) {
            this.loadingText = 'Restoring game state...';
            this.loadingProgress = 0.8;
            
            await new Promise(resolve => setTimeout(resolve, 200)); // Let objects spawn
            
            this.loadingText = 'Ready!';
            this.loadingProgress = 1.0;
            
            // Transition to playing state
            setTimeout(() => {
                this.stateManager.changeState('PLAYING', { 
                    isLoadedGame: this.isLoadedGame 
                });
            }, 300);
        } else {
            // Failed to load - go back to main menu
            this.loadingText = 'Failed to load save';
            setTimeout(() => {
                this.stateManager.changeState('MAIN_MENU');
            }, 1000);
        }
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
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.textAlign = 'center';
        
        if (this.waitingForAudio) {
            // Show "Click to Start" screen
            ctx.fillStyle = '#fff';
            ctx.font = `${sizes.title}px Arial`;
            ctx.fillText('Click to Start', canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.03);
            
            ctx.font = `${sizes.menu}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText('Click anywhere or press any key to start the game', canvasWidth / 2, canvasHeight / 2 + canvasHeight * 0.05);
        } else {
            // Show normal loading screen
            ctx.fillStyle = '#fff';
            ctx.font = `${sizes.subtitle}px Arial`;
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
        this.backgroundVideo = null;
        this.isVideoReady = false;
        this.loadBackgrounds();
    }
    
    loadBackgrounds() {
        // Load fallback image
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            console.log('🖼️ Main menu background image loaded');
        };
        this.backgroundImage.onerror = () => {
            console.warn('⚠️ Failed to load main menu background image');
        };
        this.backgroundImage.src = '/assets/bg/main.png';

        // Load video
        this.backgroundVideo = document.createElement('video');
        this.backgroundVideo.src = '/assets/bg/RPG_Menu_Looping_GIF_Creation.mp4';
        this.backgroundVideo.loop = true;
        this.backgroundVideo.muted = true; // Autoplay usually requires muted
        this.backgroundVideo.playsInline = true;
        
        this.backgroundVideo.oncanplay = () => {
            if (!this.isVideoReady) {
                this.isVideoReady = true;
                console.log('🎥 Main menu video ready');
                // Try to play if we are already in the menu
                if (this.stateManager.currentState === 'MAIN_MENU') {
                    this.backgroundVideo.play().catch(e => console.warn('Video play failed:', e));
                }
            }
        };
        
        this.backgroundVideo.onerror = (e) => {
            console.warn('⚠️ Failed to load main menu video, using fallback image', e);
            this.isVideoReady = false;
        };
    }
    
    enter(data = {}) {
        this.selectedOption = 0;
        this.musicStarted = false;
        
        // Start video if ready
        if (this.isVideoReady && this.backgroundVideo) {
            this.backgroundVideo.play().catch(e => console.warn('Video play failed:', e));
        }
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
        
        // Check if there are any save files
        this.hasSaveFiles = this.game.saveGameManager.hasSaves();
        
        // Build options dynamically - Continue first if saves exist
        if (this.hasSaveFiles) {
            this.options = ['Continue', 'New Game', 'Load Game', 'Settings', 'Exit'];
        } else {
            // No saves - hide Load Game option
            this.options = ['New Game', 'Settings', 'Exit'];
        }
        
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
        
        // Resume video if needed
        if (this.isVideoReady && this.backgroundVideo && this.backgroundVideo.paused) {
            this.backgroundVideo.play().catch(e => console.warn('Video play failed:', e));
        }
        
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
        
        // Pause video
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
        }
    }
    
    handleInput(inputManager) {
        // DON'T restart music on input - it should already be playing
        // Only start music when ENTERING main menu, not on every input
        
        if (inputManager.isJustPressed('up')) {
            const newOption = Math.max(0, this.selectedOption - 1);
            if (newOption !== this.selectedOption) {
                this.selectedOption = newOption;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        }
        
        if (inputManager.isJustPressed('down')) {
            const newOption = Math.min(this.options.length - 1, this.selectedOption + 1);
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
        const optionName = this.options[this.selectedOption];
        
        switch (optionName) {
            case 'Continue':
                // Load the most recent save
                const mostRecentSave = this.game.saveGameManager.getLatestSave();
                if (mostRecentSave) {
                    // Show loading screen while loading save
                    this.stateManager.changeState('LOADING', { 
                        loadSaveId: mostRecentSave.id,
                        isLoadedGame: true 
                    });
                }
                break;
            case 'New Game':
                // Start new game - reset playtime
                this.game.playtime = 0;
                this.stateManager.changeState('PLAYING', { isNewGame: true });
                break;
            case 'Load Game':
                // Open save/load menu in load mode from main menu
                this.stateManager.pushState('SAVE_LOAD', { mode: 'load_list', fromMainMenu: true });
                break;
            case 'Settings':
                this.stateManager.pushState('SETTINGS');
                break;
            case 'Exit':
                // Exit game
                break;
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions instead of ctx.canvas.width/height
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // 1. Draw Background (Video or Image)
        let bgSource = null;
        let sourceWidth = 0;
        let sourceHeight = 0;
        
        if (this.isVideoReady && !this.backgroundVideo.paused) {
            bgSource = this.backgroundVideo;
            sourceWidth = this.backgroundVideo.videoWidth;
            sourceHeight = this.backgroundVideo.videoHeight;
        } else if (this.backgroundImage && this.backgroundImage.complete) {
            bgSource = this.backgroundImage;
            sourceWidth = this.backgroundImage.width;
            sourceHeight = this.backgroundImage.height;
        }
        
        if (bgSource && sourceWidth > 0 && sourceHeight > 0) {
            // Scale background to fill the canvas while maintaining aspect ratio
            const imgAspect = sourceWidth / sourceHeight;
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
            
            ctx.drawImage(bgSource, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // Fallback background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        // 2. Global Overlay (Vignette & Darkening)
        // Add a semi-transparent overlay for better text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Add inset shadow effect (vignette) - fades to black at edges
        const gradient = ctx.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.8
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 3. Specific Darkening behind Menu Components (Contrast)
        // Create a vertical gradient strip behind the menu area
        const menuGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        menuGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        menuGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.0)');
        menuGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)'); // Darken behind menu start
        menuGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.7)'); // Darken behind menu end
        menuGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = menuGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'RPG Game', canvasWidth, canvasHeight, 0.25);
        
        // Draw menu options
        menuRenderer.drawMenuOptions(
            ctx, 
            this.options, 
            this.selectedOption, 
            canvasWidth, 
            canvasHeight,
            0.45,  // Start Y position
            0.10   // Spacing
        );
        
        // Show subtle audio hint if audio isn't enabled yet
        if (this.game.audioManager && !this.game.audioManager.audioEnabled) {
            menuRenderer.drawHint(ctx, 'Audio will start with your first interaction', canvasWidth, canvasHeight);
        }
    }
}

/**
 * Playing State - Main gameplay
 */
class PlayingState extends GameState {
    constructor(stateManager) {
        super(stateManager);
        this.menuButtonBounds = null;
        
        // Bind event handler so we can add/remove it properly
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        
        // Fade-in effect for new games
        this.fadeInAlpha = 1; // 1 = fully visible (no fade by default)
        this.fadeInDuration = 1.5; // seconds - long enough for camera to settle
        this.fadeInTimer = 0;
    }
    
    async enter(data = {}) {
        // Initialize gameplay
        console.log('Entering gameplay state');
        console.log('Data received:', data);
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('gameplay');
        }
        
        // Add canvas click/touch listener for Menu button
        if (this.game.canvas) {
            this.game.canvas.addEventListener('click', this.handleCanvasClick);
            this.game.canvas.addEventListener('touchend', this.handleCanvasClick);
        }
        
        // Check if we're resuming from a pause/overlay state or loading from save
        const isResumingFromPause = data.isResumingFromPause === true;
        const isLoadedGame = data.isLoadedGame === true;
        const isNewGame = data.isNewGame === true;
        
        if (isLoadedGame) {
            console.log('💾 Loaded game - player position already restored, map already loaded');
            // Everything is already loaded by SaveGameManager, don't do anything
        } else if (isNewGame || !isResumingFromPause) {
            // For new games, set camera BEFORE loading map to prevent panning
            if (isNewGame) {
                const camera = this.game.camera;
                const player = this.game.player;
                const canvasWidth = this.game.CANVAS_WIDTH;
                const canvasHeight = this.game.CANVAS_HEIGHT;
                
                // Set camera to snap instantly to target (no smoothing)
                camera.snapToTarget = true;
                
                // Start with black screen for fade-in
                this.fadeInAlpha = 0;
                this.fadeInTimer = 0;
                console.log('📷 Camera will snap to player instantly, starting fade-in');
            }
            
            console.log('🆕 Fresh entry to gameplay - loading map');
            // Load the initial map and start BGM (player position already set in initializePlayer)
            await this.game.loadMap(this.game.currentMapId);
        } else {
            console.log('🔄 Resuming gameplay - preserving player position');
            // Just ensure the map is loaded but don't reset player position
            await this.game.loadMap(this.game.currentMapId);
        }
    }
    
    handleCanvasClick(event) {
        // Only handle menu button clicks on mobile
        if (!this.game.inputManager.isMobile) return;
        if (!this.menuButtonBounds) return;
        
        // Get click/touch position
        let clientX, clientY;
        if (event.type === 'touchend') {
            if (event.changedTouches.length === 0) return;
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Get canvas bounding rect to convert screen coords to canvas coords
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Convert to canvas coordinates
        const scaleX = this.game.CANVAS_WIDTH / rect.width;
        const scaleY = this.game.CANVAS_HEIGHT / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        // Check if click is within Menu button bounds
        if (canvasX >= this.menuButtonBounds.x && 
            canvasX <= this.menuButtonBounds.x + this.menuButtonBounds.width &&
            canvasY >= this.menuButtonBounds.y && 
            canvasY <= this.menuButtonBounds.y + this.menuButtonBounds.height) {
            console.log('Menu button clicked!');
            this.stateManager.pushState('PAUSED');
        }
    }
    
    exit() {
        // Clean up when leaving gameplay
        console.log('Exiting gameplay state');
        
        // Remove canvas click/touch listener
        if (this.game.canvas) {
            this.game.canvas.removeEventListener('click', this.handleCanvasClick);
            this.game.canvas.removeEventListener('touchend', this.handleCanvasClick);
        }
        
        // Hide touch controls when leaving gameplay
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.hide();
        }
    }
    
    pause() {
        // Called when pushing a state on top (like pause menu)
        console.log('🔄 Gameplay paused');
        
        // Keep touch controls visible but update labels for menu context
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.updateButtonLabels('menu');
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
        // Update fade-in effect
        if (this.fadeInAlpha < 1) {
            this.fadeInTimer += deltaTime;
            this.fadeInAlpha = Math.min(1, this.fadeInTimer / this.fadeInDuration);
        }
        
        // Update game world
        this.game.updateGameplay(deltaTime);
    }
    
    render(ctx) {
        // Render game world
        this.game.renderGameplay(ctx);
        
        // Render Menu button in top-right corner (mobile only)
        if (this.game.inputManager.isMobile) {
            this.renderMenuButton(ctx);
        }
        
        // Render fade-in overlay if needed
        if (this.fadeInAlpha < 1) {
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeInAlpha})`;
            ctx.fillRect(0, 0, this.game.CANVAS_WIDTH, this.game.CANVAS_HEIGHT);
            ctx.restore();
        }
    }
    
    renderMenuButton(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Button properties
        const buttonText = 'Menu';
        const padding = 15;
        const margin = 10;
        
        // Measure text to create button
        ctx.font = `bold ${sizes.instruction}px Arial`;
        const textWidth = ctx.measureText(buttonText).width;
        const buttonWidth = textWidth + padding * 2;
        const buttonHeight = sizes.instruction + padding;
        
        // Position in top-right corner
        const buttonX = canvasWidth - buttonWidth - margin;
        const buttonY = margin;
        
        // Store button bounds for click detection
        this.menuButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Text shadow
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(buttonText, buttonX + buttonWidth / 2 + 1, buttonY + buttonHeight / 2 + sizes.instruction / 3 + 1);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + sizes.instruction / 3);
    }
    
    handleInput(inputManager) {
        // Handle gameplay input
        this.game.handleGameplayInput(inputManager);
        
        // Check for pause via keyboard
        if (inputManager.isJustPressed('menu')) {
            this.stateManager.pushState('PAUSED');
        }
        
        // Menu button clicks are now handled by canvas event listeners (see handleCanvasClick)
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
        
        // Touch controls are already visible, just ensure menu labels
        if (this.game.touchControlsUI && this.game.touchControlsUI.isVisible()) {
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
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
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.7);
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'PAUSED', canvasWidth, canvasHeight, 0.25);
        
        // Draw menu options
        menuRenderer.drawMenuOptions(
            ctx, 
            this.options, 
            this.selectedOption, 
            canvasWidth, 
            canvasHeight,
            0.45,  // Start Y position
            0.10   // Spacing
        );
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
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
        
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
                // Show loading screen while loading save
                if (this.fromMainMenu) {
                    // From main menu - change to loading state
                    this.stateManager.changeState('LOADING', { 
                        loadSaveId: save.id,
                        isLoadedGame: true 
                    });
                } else {
                    // From pause menu - change to loading state (it will handle returning to game)
                    this.stateManager.changeState('LOADING', { 
                        loadSaveId: save.id,
                        isLoadedGame: true,
                        fromPauseMenu: true
                    });
                }
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
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'Save / Load', canvasWidth, canvasHeight, 0.25);
        
        // Draw menu options
        menuRenderer.drawMenuOptions(
            ctx, 
            this.mainOptions, 
            this.selectedOption, 
            canvasWidth, 
            canvasHeight,
            0.45,  // Start Y position
            0.10   // Spacing
        );
    }
    
    renderSaveList(ctx, canvasWidth, canvasHeight, showSelection = true) {
        const title = this.mode === 'save_list' ? 'Save Game' : 'Load Game';
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Title
        menuRenderer.drawTitle(ctx, title, canvasWidth, canvasHeight, 0.15);
        
        // Instructions
        if (this.mode === 'save_list') {
            menuRenderer.drawInstruction(ctx, 'Select empty slot for new save or overwrite existing', canvasWidth, canvasHeight, 0.22);
            const saveInstructions = this.game.inputManager.isMobile 
                ? 'A: Select | B: Back'
                : 'Enter: Select | ESC: Back';
            menuRenderer.drawInstruction(ctx, saveInstructions, canvasWidth, canvasHeight, 0.25);
        } else {
            const loadInstructions = this.game.inputManager.isMobile 
                ? 'A: Load | X: Delete | B: Back'
                : 'Enter: Load | Delete: Remove | ESC: Back';
            menuRenderer.drawInstruction(ctx, loadInstructions, canvasWidth, canvasHeight, 0.22);
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
            
            // Empty slot border (dashed, no background fill)
            if (isSelected) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                ctx.setLineDash([]);
            }
            
            // Empty slot text (centered)
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? '#ffff00' : '#888';
            ctx.font = `bold ${sizes.subtitle}px Arial`;
            ctx.fillText('[ Empty Slot - New Save ]', canvasWidth / 2, startY);
        }
        
        // Save list
        if (this.saves.length === 0 && this.mode === 'load_list') {
            ctx.fillStyle = '#888';
            ctx.font = `${sizes.subtitle}px Arial`;
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
                const centerX = canvasWidth / 2;
                
                // Save name (centered, yellow text when selected)
                ctx.textAlign = 'center';
                ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
                ctx.font = `bold ${sizes.subtitle}px Arial`;
                ctx.fillText(save.name, centerX, y);
                
                // Save details (centered)
                ctx.font = `${sizes.detail}px Arial`;
                ctx.fillStyle = isSelected ? '#ffff00' : '#aaa';
                const dateStr = this.game.saveGameManager.formatDate(save.timestamp);
                const playtimeStr = this.game.saveGameManager.formatPlaytime(save.playtime);
                ctx.fillText(`${dateStr}  |  ${playtimeStr}  |  ${save.mapName}`, centerX, y + lineHeight * 0.35);
            });
            
            // Scroll indicators
            const listStartY = this.mode === 'save_list' ? saveListStartY : startY;
            const listHeight = this.maxVisibleSaves * lineHeight;
            menuRenderer.drawScrollIndicators(
                ctx, 
                canvasWidth, 
                canvasHeight, 
                this.scrollOffset > 0,
                this.scrollOffset + this.maxVisibleSaves < this.saves.length,
                listStartY,
                listHeight
            );
        }
        
        // Back hint
        menuRenderer.drawHint(ctx, 'Press ESC to go back', canvasWidth, canvasHeight);
    }
    
    renderDeleteConfirmation(ctx, canvasWidth, canvasHeight) {
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Draw fully opaque overlay (no transparency)
        ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Title at top with text shadow
        ctx.fillStyle = '#000';
        ctx.font = `bold ${sizes.title}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Delete Save?', canvasWidth / 2 + 2, canvasHeight * 0.25 + 2);
        
        ctx.fillStyle = '#ff3333';
        ctx.fillText('Delete Save?', canvasWidth / 2, canvasHeight * 0.25);
        
        // Save name with text shadow
        ctx.fillStyle = '#000';
        ctx.font = `bold ${sizes.subtitle}px Arial`;
        if (this.saveToDelete) {
            ctx.fillText(`"${this.saveToDelete.name}"`, canvasWidth / 2 + 2, canvasHeight * 0.38 + 2);
        }
        
        ctx.fillStyle = '#fff';
        if (this.saveToDelete) {
            ctx.fillText(`"${this.saveToDelete.name}"`, canvasWidth / 2, canvasHeight * 0.38);
        }
        
        // Warning message
        menuRenderer.drawInstruction(ctx, 'This action cannot be undone!', canvasWidth, canvasHeight, 0.48);
        
        // Options (vertical like other menus) with text shadows
        const menuStartY = canvasHeight * 0.58;
        const menuSpacing = canvasHeight * 0.10;
        
        this.confirmOptions.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            const isSelected = index === this.selectedOption;
            
            // Text shadow
            ctx.fillStyle = '#000';
            ctx.font = `bold ${sizes.menu}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(option, canvasWidth / 2 + 2, y + 2);
            
            // Option text - all white, yellow when selected (like other menus)
            ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
            ctx.fillText(option, canvasWidth / 2, y);
        });
        
        // Controls hint at bottom
        const hintText = this.game.inputManager.isMobile ? 'A: Select | B: Cancel' : 'Enter: Select | ESC: Cancel';
        menuRenderer.drawHint(ctx, hintText, canvasWidth, canvasHeight, 0.85);
    }
    
    renderOverwriteConfirmation(ctx, canvasWidth, canvasHeight) {
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Draw fully opaque overlay (no transparency)
        ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Title at top with text shadow
        ctx.fillStyle = '#000';
        ctx.font = `bold ${sizes.title}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Overwrite Save?', canvasWidth / 2 + 2, canvasHeight * 0.25 + 2);
        
        ctx.fillStyle = '#FFA500';
        ctx.fillText('Overwrite Save?', canvasWidth / 2, canvasHeight * 0.25);
        
        // Save name with text shadow
        ctx.fillStyle = '#000';
        ctx.font = `bold ${sizes.subtitle}px Arial`;
        if (this.saveToOverwrite) {
            ctx.fillText(`"${this.saveToOverwrite.name}"`, canvasWidth / 2 + 2, canvasHeight * 0.38 + 2);
        }
        
        ctx.fillStyle = '#fff';
        if (this.saveToOverwrite) {
            ctx.fillText(`"${this.saveToOverwrite.name}"`, canvasWidth / 2, canvasHeight * 0.38);
        }
        
        // Warning message
        menuRenderer.drawInstruction(ctx, 'This will replace the existing save!', canvasWidth, canvasHeight, 0.48);
        
        // Options (vertical like other menus) with text shadows
        const menuStartY = canvasHeight * 0.58;
        const menuSpacing = canvasHeight * 0.10;
        
        this.confirmOptions.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            const isSelected = index === this.selectedOption;
            
            // Text shadow
            ctx.fillStyle = '#000';
            ctx.font = `bold ${sizes.menu}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(option, canvasWidth / 2 + 2, y + 2);
            
            // Option text - all white, yellow when selected (like other menus)
            ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
            ctx.fillText(option, canvasWidth / 2, y);
        });
        
        // Controls hint at bottom
        const hintText = this.game.inputManager.isMobile ? 'A: Select | B: Cancel' : 'Enter: Select | ESC: Cancel';
        menuRenderer.drawHint(ctx, hintText, canvasWidth, canvasHeight, 0.85);
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
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
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
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.8);
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'Settings', canvasWidth, canvasHeight, 0.2);
        
        // Prepare options with formatted values for MenuRenderer
        const formattedOptions = this.options.map(option => {
            let value = '';
            if (option.type === 'slider') {
                value = `< ${this.game.settings[option.key]}% >`;
            } else if (option.type === 'toggle') {
                value = `< ${this.game.settings[option.key] ? 'ON' : 'OFF'} >`;
            }
            return {
                name: option.name,
                value: value
            };
        });
        
        // Draw settings options using MenuRenderer (centered vertically to avoid touch controls)
        menuRenderer.drawSettingsOptions(
            ctx,
            formattedOptions,
            this.selectedOption,
            canvasWidth,
            canvasHeight,
            0.32,  // Start Y (raised to avoid bottom touch controls)
            0.11   // Line height (slightly tighter)
        );
        
        // Draw instructions
        const instructions = this.game.inputManager.isMobile 
            ? 'Joystick: Navigate • A: Select • B: Back'
            : 'Arrow Keys: Navigate • Left/Right: Adjust • Enter: Select • ESC: Back';
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, 0.93);
    }
}

/**
 * Inventory State
 */
class InventoryState extends GameState {
    enter() {
        this.selectedOption = 0;
        this.scrollOffset = 0;
        this.maxVisibleItems = 8;
        
        // Get items from inventory manager
        this.items = this.game.inventoryManager.getAllSlots();
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
    }
    
    handleInput(inputManager) {
        if (inputManager.isJustPressed('cancel') || inputManager.isJustPressed('inventory') || inputManager.isJustPressed('menu')) {
            this.stateManager.popState();
            return;
        }
        
        if (this.items.length === 0) return;
        
        if (inputManager.isJustPressed('up')) {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(this.items.length - 1, this.selectedOption + 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.useItem();
        }
    }
    
    updateScrollOffset() {
        if (this.items.length > this.maxVisibleItems) {
            if (this.selectedOption < this.scrollOffset) {
                this.scrollOffset = this.selectedOption;
            } else if (this.selectedOption >= this.scrollOffset + this.maxVisibleItems) {
                this.scrollOffset = this.selectedOption - this.maxVisibleItems + 1;
            }
        }
    }
    
    useItem() {
        const item = this.items[this.selectedOption];
        if (item) {
            // Use item via inventory manager
            const used = this.game.inventoryManager.useItem(this.selectedOption, this.game.player);
            if (used) {
                this.game.audioManager?.playEffect('powerup.mp3'); // Placeholder sound
                // Refresh list
                this.items = this.game.inventoryManager.getAllSlots();
                // Adjust selection if list shrank
                if (this.selectedOption >= this.items.length) {
                    this.selectedOption = Math.max(0, this.items.length - 1);
                }
            } else {
                this.game.audioManager?.playEffect('error.mp3'); // Placeholder sound
            }
        }
    }
    
    render(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.85);
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'Inventory', canvasWidth, canvasHeight, 0.15);
        
        if (this.items.length === 0) {
            menuRenderer.drawInstruction(ctx, 'Inventory is empty', canvasWidth, canvasHeight, 0.5);
            menuRenderer.drawHint(ctx, 'Press ESC to close', canvasWidth, canvasHeight);
            return;
        }
        
        // Draw item list (Left side)
        const listX = canvasWidth * 0.1;
        const listY = canvasHeight * 0.25;
        const listWidth = canvasWidth * 0.4;
        const listHeight = canvasHeight * 0.6;
        
        // Draw item details (Right side)
        const detailsX = canvasWidth * 0.55;
        const detailsY = listY;
        const detailsWidth = canvasWidth * 0.35;
        const detailsHeight = listHeight;
        
        // Draw list background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(listX, listY, listWidth, listHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(listX, listY, listWidth, listHeight);
        
        // Draw items
        const visibleItems = this.items.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleItems);
        const itemHeight = listHeight / this.maxVisibleItems;
        
        visibleItems.forEach((item, index) => {
            const actualIndex = this.scrollOffset + index;
            const isSelected = actualIndex === this.selectedOption;
            const y = listY + index * itemHeight;
            
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(listX, y, listWidth, itemHeight);
                ctx.fillStyle = '#ffff00'; // Selected color
            } else {
                ctx.fillStyle = '#ffffff';
            }
            
            ctx.font = '20px "Lato", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name, listX + 20, y + itemHeight / 2);
            
            // Quantity
            if (item.quantity > 1) {
                ctx.textAlign = 'right';
                ctx.fillText(`x${item.quantity}`, listX + listWidth - 20, y + itemHeight / 2);
            }
        });
        
        // Draw details of selected item
        const selectedItem = this.items[this.selectedOption];
        if (selectedItem) {
            // Details background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(detailsX, detailsY, detailsWidth, detailsHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeRect(detailsX, detailsY, detailsWidth, detailsHeight);
            
            // Item Name
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 28px "Cinzel", serif';
            ctx.textAlign = 'center';
            ctx.fillText(selectedItem.name, detailsX + detailsWidth / 2, detailsY + 50);
            
            // Item Type/Rarity
            ctx.fillStyle = '#aaa';
            ctx.font = 'italic 18px "Lato", sans-serif';
            ctx.fillText(`${selectedItem.rarity} ${selectedItem.type}`, detailsX + detailsWidth / 2, detailsY + 80);
            
            // Description (wrapped)
            ctx.fillStyle = '#fff';
            ctx.font = '20px "Lato", sans-serif';
            this.wrapText(ctx, selectedItem.description, detailsX + detailsWidth / 2, detailsY + 140, detailsWidth - 40, 30);
            
            // Use hint
            if (selectedItem.type === 'consumable') {
                ctx.fillStyle = '#0f0';
                ctx.font = 'bold 20px "Lato", sans-serif';
                ctx.fillText('Press ENTER to use', detailsX + detailsWidth / 2, detailsY + detailsHeight - 40);
            }
        }
        
        // Scroll indicators
        menuRenderer.drawScrollIndicators(
            ctx, 
            canvasWidth, 
            canvasHeight, 
            this.scrollOffset > 0,
            this.scrollOffset + this.maxVisibleItems < this.items.length,
            listY,
            listHeight
        );
        
        // Controls hint
        const hintText = this.game.inputManager.isMobile ? 'A: Use | B: Close' : 'Enter: Use | ESC: Close';
        menuRenderer.drawHint(ctx, hintText, canvasWidth, canvasHeight);
    }
    
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}
class DialogueState extends GameState {}
class ShopState extends GameState {}
class LootWindowState extends GameState {}
class BattleState extends GameState {}

// Export for use in other files
window.GameStateManager = GameStateManager;
window.GameState = GameState;
