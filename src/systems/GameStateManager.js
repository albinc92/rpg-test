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
     * Clear the state stack (e.g. when returning to main menu)
     */
    clearStack() {
        // Exit all states in the stack from top to bottom
        while (this.stateStack.length > 0) {
            const stackItem = this.stateStack.pop();
            const state = this.states[stackItem.state];
            if (state && state.exit) {
                state.exit();
            }
        }
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
        
        // Mark that we're resuming from a pause/overlay
        const resumeData = { ...previousState.data, isResumingFromPause: true };
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
        
        // Initialize design system
        const ds = window.ds;
        if (ds) ds.setDimensions(canvasWidth, canvasHeight);
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Dark background with subtle gradient
        const bgGradient = ctx.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.8
        );
        bgGradient.addColorStop(0, ds?.colors?.background?.panel || '#1a1a24');
        bgGradient.addColorStop(1, ds?.colors?.background?.dark || '#0a0a0f');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Add subtle vignette
        const vignetteGradient = ctx.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.3,
            canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.9
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const primaryColor = ds?.colors?.primary || '#4a9eff';
        const textPrimary = ds?.colors?.text?.primary || '#ffffff';
        const textSecondary = ds?.colors?.text?.secondary || '#cccccc';
        
        if (this.waitingForAudio) {
            // Show "Click to Start" screen with styled design
            
            // Decorative corner accents
            if (ds) {
                const accentSize = ds.spacing(8);
                const margin = ds.spacing(6);
                ds.drawCornerAccents(ctx, margin, margin, canvasWidth - margin * 2, canvasHeight - margin * 2, accentSize);
            }
            
            // Main title with glow effect
            ctx.save();
            if (ds) ds.applyShadow(ctx, 'glow');
            ctx.fillStyle = primaryColor;
            ctx.font = ds ? ds.font('xxl', 'bold', 'display') : `bold ${sizes.title}px Arial`;
            ctx.fillText('Click to Start', canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.05);
            ctx.restore();
            
            // Subtitle
            ctx.fillStyle = textSecondary;
            ctx.font = ds ? ds.font('md', 'normal', 'body') : `${sizes.menu}px Arial`;
            ctx.fillText('Click anywhere or press any key to begin', canvasWidth / 2, canvasHeight / 2 + canvasHeight * 0.05);
            
            // Animated pulse hint (using simple sine wave based on time)
            const pulseAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
            ctx.fillStyle = ds ? ds.colors.alpha(primaryColor, pulseAlpha) : `rgba(74, 158, 255, ${pulseAlpha})`;
            ctx.font = ds ? ds.font('sm', 'normal', 'body') : `${sizes.instruction}px Arial`;
            ctx.fillText('◆ ◆ ◆', canvasWidth / 2, canvasHeight * 0.75);
            
        } else {
            // Show normal loading screen with styled progress bar
            
            // Loading text with subtle animation
            ctx.fillStyle = textPrimary;
            ctx.font = ds ? ds.font('lg', 'normal', 'body') : `${sizes.subtitle}px Arial`;
            ctx.fillText(this.loadingText, canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.08);
            
            // Loading bar container
            const barWidth = Math.min(400, canvasWidth * 0.5);
            const barHeight = ds ? ds.spacing(2) : Math.max(12, canvasHeight * 0.018);
            const barX = canvasWidth / 2 - barWidth / 2;
            const barY = canvasHeight / 2 + canvasHeight * 0.02;
            const borderRadius = barHeight / 2;
            
            // Bar background (dark)
            ctx.fillStyle = ds?.colors?.background?.dark || '#0a0a0f';
            if (ds) {
                ds.fillRoundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, borderRadius + 2);
            } else {
                ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
            }
            
            // Bar border
            ctx.strokeStyle = ds ? ds.colors.alpha(primaryColor, 0.4) : 'rgba(74, 158, 255, 0.4)';
            ctx.lineWidth = 1;
            if (ds) {
                ds.strokeRoundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, borderRadius + 2);
            } else {
                ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
            }
            
            // Progress fill with gradient
            if (this.loadingProgress > 0) {
                const progressWidth = barWidth * this.loadingProgress;
                const progressGradient = ctx.createLinearGradient(barX, barY, barX + progressWidth, barY);
                progressGradient.addColorStop(0, ds?.colors?.primaryDark || '#3a7ecc');
                progressGradient.addColorStop(0.5, primaryColor);
                progressGradient.addColorStop(1, ds?.colors?.primaryLight || '#6ab4ff');
                
                ctx.fillStyle = progressGradient;
                if (ds) {
                    ds.fillRoundRect(ctx, barX, barY, progressWidth, barHeight, borderRadius);
                } else {
                    ctx.fillRect(barX, barY, progressWidth, barHeight);
                }
                
                // Shine effect on progress bar
                const shineGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
                shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = shineGradient;
                if (ds) {
                    ds.fillRoundRect(ctx, barX, barY, progressWidth, barHeight / 2, [borderRadius, borderRadius, 0, 0]);
                } else {
                    ctx.fillRect(barX, barY, progressWidth, barHeight / 2);
                }
            }
            
            // Progress percentage
            const percentage = Math.round(this.loadingProgress * 100);
            ctx.fillStyle = textSecondary;
            ctx.font = ds ? ds.font('sm', 'normal', 'body') : `${sizes.instruction}px Arial`;
            ctx.fillText(`${percentage}%`, canvasWidth / 2, barY + barHeight + canvasHeight * 0.04);
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
        console.log('🎮 MainMenuState.enter() called');
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
        
        // Check if there are any save files (with safety check)
        this.hasSaveFiles = this.game.saveGameManager?.hasSaves() || false;
        
        // Build options dynamically - Always show all options, but disable some
        this.options = [
            { text: 'Continue', disabled: !this.hasSaveFiles },
            { text: 'Load Game', disabled: !this.hasSaveFiles },
            { text: 'New Game', disabled: false },
            { text: 'Settings', disabled: false },
            { text: 'Exit', disabled: false }
        ];
        
        console.log('🎮 MainMenuState options:', this.options);
        
        // Ensure selected option is valid (not disabled)
        this.selectedOption = 0;
        if (this.options[this.selectedOption].disabled) {
            this.navigate(1); // Find first enabled option
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
        console.log('🚪 MAIN MENU EXITED');
        // REMOVED stopBGM() - Let the next state handle BGM changes via playBGM()
        // This prevents crossfade conflicts where stopBGM() fades out the NEW track
        
        // Pause video
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
        }
    }
    
    handleInput(inputManager) {
        // DON'T restart music on input - it should already be playing
        // Only start music when ENTERING main menu, not on every input
        
        if (inputManager.isJustPressed('up')) {
            this.navigate(-1);
        }
        
        if (inputManager.isJustPressed('down')) {
            this.navigate(1);
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.selectOption();
        }
    }
    
    navigate(direction) {
        let newIndex = this.selectedOption;
        let attempts = 0;
        const maxAttempts = this.options.length;
        
        do {
            newIndex += direction;
            
            // Wrap around
            if (newIndex < 0) newIndex = this.options.length - 1;
            if (newIndex >= this.options.length) newIndex = 0;
            
            attempts++;
        } while (this.options[newIndex].disabled && attempts < maxAttempts);
        
        // Only update if we found a valid option
        if (!this.options[newIndex].disabled && newIndex !== this.selectedOption) {
            this.selectedOption = newIndex;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
    }
    
    async selectOption() {
        const option = this.options[this.selectedOption];
        if (option.disabled) return;
        
        const optionName = option.text;
        
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
                // Start new game - reset everything
                this.game.resetGame();
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
                if (window.electronAPI && window.electronAPI.exitApp) {
                    window.electronAPI.exitApp();
                } else {
                    console.log('Exit requested (not in Electron)');
                }
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
        } else if (!isResumingFromPause) {
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
            // await this.game.loadMap(this.game.currentMapId);
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
        this.inputCooldown = 0.2; // Add cooldown
        
        this.showExitConfirm = false;
        this.exitConfirmOption = 1; // Default to No
        
        // Touch controls are already visible, just ensure menu labels
        if (this.game.touchControlsUI && this.game.touchControlsUI.isVisible()) {
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
    }

    update(deltaTime) {
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }
    }
    
    handleInput(inputManager) {
        if (this.inputCooldown > 0) return;

        if (this.showExitConfirm) {
            if (inputManager.isJustPressed('cancel')) {
                this.showExitConfirm = false;
                return;
            }
            
            if (inputManager.isJustPressed('left') || inputManager.isJustPressed('right')) {
                this.exitConfirmOption = this.exitConfirmOption === 0 ? 1 : 0;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            
            if (inputManager.isJustPressed('confirm')) {
                if (this.exitConfirmOption === 0) { // Yes
                    this.stateManager.clearStack();
                    // Reset game state when exiting to main menu
                    this.game.resetGame();
                    this.stateManager.changeState('MAIN_MENU');
                } else { // No
                    this.showExitConfirm = false;
                }
            }
            return;
        }

        if (inputManager.isJustPressed('menu') || inputManager.isJustPressed('cancel')) {
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
                this.showExitConfirm = true;
                this.exitConfirmOption = 1; // Default to No
                break;
        }
    }

    render(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.7);
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'Paused', canvasWidth, canvasHeight, 0.25);
        
        // Draw options
        menuRenderer.drawMenuOptions(ctx, this.options, this.selectedOption, canvasWidth, canvasHeight, 0.45, 0.1);
        
        // Draw exit confirmation if active
        if (this.showExitConfirm) {
            menuRenderer.drawModal(
                ctx, 
                'Quit to Main Menu?', 
                'Are you sure you want to quit?', 
                ['Yes', 'No'],
                this.exitConfirmOption, 
                canvasWidth, 
                canvasHeight,
                'Unsaved progress will be lost.'
            );
        }
        
        // Draw instructions
        const instructions = this.game.inputManager.isMobile 
            ? 'Tap to Select'
            : 'Arrow Keys: Navigate • Enter: Select • ESC: Resume';
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, 0.9);
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
            
            // Use Left/Right for modal navigation
            if (inputManager.isJustPressed('left')) {
                this.selectedOption = (this.selectedOption - 1 + this.confirmOptions.length) % this.confirmOptions.length;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
                return;
            }
            
            if (inputManager.isJustPressed('right')) {
                this.selectedOption = (this.selectedOption + 1) % this.confirmOptions.length;
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
        
        // Subtitle / Context
        if (this.mode === 'save_list') {
            menuRenderer.drawInstruction(ctx, 'Select a slot to save your progress', canvasWidth, canvasHeight, 0.22);
        }
        
        const startY = canvasHeight * 0.32; // Moved down to prevent clipping with instruction text
        const lineHeight = canvasHeight * 0.13; // Slightly taller for details
        
        // For save mode, show empty slot at top
        if (this.mode === 'save_list') {
            const isSelected = showSelection && this.selectedOption === 0;
            const boxWidth = canvasWidth * 0.7;
            const boxHeight = lineHeight * 0.85;
            const boxX = canvasWidth / 2 - boxWidth / 2;
            const boxY = startY - boxHeight * 0.5;
            
            menuRenderer.drawDetailedListItem(
                ctx, 
                boxX, boxY, boxWidth, boxHeight,
                '[ New Save ]', 
                'Create a new save file', 
                isSelected, 
                true
            );
        }
        
        // Save list
        if (this.saves.length === 0 && this.mode === 'load_list') {
            ctx.fillStyle = '#888';
            ctx.font = `${sizes.subtitle}px 'Lato', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('No save files found', canvasWidth / 2, canvasHeight * 0.5);
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
                const boxWidth = canvasWidth * 0.7;
                const boxHeight = lineHeight * 0.85;
                const boxX = canvasWidth / 2 - boxWidth / 2;
                const boxY = y - boxHeight * 0.5;
                
                // Format details
                const dateStr = this.game.saveGameManager.formatDate(save.timestamp);
                const playtimeStr = this.game.saveGameManager.formatPlaytime(save.playtime);
                const details = `${dateStr}  •  ${playtimeStr}  •  ${save.mapName}`;
                
                menuRenderer.drawDetailedListItem(
                    ctx,
                    boxX, boxY, boxWidth, boxHeight,
                    save.name,
                    details,
                    isSelected,
                    false
                );
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
        
        // Instructions at bottom
        let instructions = '';
        if (this.mode === 'save_list') {
            instructions = this.game.inputManager.isMobile 
                ? 'Tap to Select • Back to Cancel'
                : 'Enter: Save • ESC: Back';
        } else {
            instructions = this.game.inputManager.isMobile 
                ? 'Tap to Load • Long Press to Delete'
                : 'Enter: Load • Delete: Remove Save • ESC: Back';
        }
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, 0.93);
    }
    
    renderDeleteConfirmation(ctx, canvasWidth, canvasHeight) {
        const menuRenderer = this.stateManager.menuRenderer;
        const saveName = this.saveToDelete ? `"${this.saveToDelete.name}"` : '';
        
        menuRenderer.drawModal(
            ctx,
            'Delete Save?',
            saveName,
            this.confirmOptions,
            this.selectedOption,
            canvasWidth,
            canvasHeight,
            'This action cannot be undone!'
        );
    }
    
    renderOverwriteConfirmation(ctx, canvasWidth, canvasHeight) {
        const menuRenderer = this.stateManager.menuRenderer;
        const saveName = this.saveToOverwrite ? `"${this.saveToOverwrite.name}"` : '';
        
        menuRenderer.drawModal(
            ctx,
            'Overwrite Save?',
            saveName,
            this.confirmOptions,
            this.selectedOption,
            canvasWidth,
            canvasHeight,
            'This will replace the existing save!'
        );
    }
}

/**
 * Settings State
 */
class SettingsState extends GameState {
    enter(data = {}) {
        this.selectedOption = 0;
        this.currentCategory = 'Audio'; // Default category
        this.categories = ['Audio', 'Graphics', 'Gameplay', 'Controls'];
        
        this.controlDevice = 'Keyboard'; // 'Keyboard' or 'Gamepad'
        this.rebindingAction = null;
        
        // Store original settings for revert functionality
        this.originalSettings = JSON.parse(JSON.stringify(this.game.settings));
        this.originalBindings = JSON.parse(JSON.stringify(this.game.inputManager.keyBindings));
        
        // We work directly on game.settings for instant preview
        // pendingSettings is now just an alias for game.settings to minimize code changes
        this.pendingSettings = this.game.settings;
        
        this.isDirty = false;
        this.showExitModal = false;
        this.exitModalOption = 0; // 0: Save, 1: Discard, 2: Cancel
        this.restartRequired = false;
        
        this.showResetModal = false;
        this.resetModalOption = 2; // 0: All, 1: Current, 2: Cancel
        
        this.scrollOffset = 0;
        this.maxVisibleOptions = 5; // Limit visible options to prevent overlap

        // Input holding state for progressive adjustment
        this.holdTimer = 0;
        this.isHolding = false;
        this.lastInputDirection = 0;
        this.holdDelay = 0.4; // Initial delay before repeating
        this.holdRepeatRate = 0.05; // Time between repeats

        this.resolutions = this.generateResolutions();
        
        // Ensure current resolution is valid for this display
        if (!this.resolutions.includes(this.pendingSettings.resolution)) {
            // If saved resolution is not in the list (e.g. changed monitor), 
            // default to the largest available resolution
            if (this.resolutions.length > 0) {
                this.pendingSettings.resolution = this.resolutions[this.resolutions.length - 1];
                this.isDirty = true;
            }
        }
        
        // Define options per category
        this.allOptions = {
            'Audio': [
                { name: 'Master Volume', type: 'slider', key: 'masterVolume', min: 0, max: 100, step: 10 },
                { name: 'BGM Volume', type: 'slider', key: 'musicVolume', min: 0, max: 100, step: 10 },
                { name: 'Effect Volume', type: 'slider', key: 'effectsVolume', min: 0, max: 100, step: 10 },
                { name: 'Mute Audio', type: 'toggle', key: 'isMuted' }
            ],
            'Graphics': [
                { name: 'Resolution', type: 'select', key: 'resolution', values: this.resolutions },
                { name: 'Fullscreen', type: 'toggle', key: 'fullscreen' },
                { name: 'VSync (Restart)', type: 'toggle', key: 'vsync' },
                { name: 'Fake 3D', type: 'toggle', key: 'perspectiveEnabled' },
                { name: 'Show FPS', type: 'toggle', key: 'showFPS' }
            ],
            'Gameplay': [
                { name: 'Show Debug Info', type: 'toggle', key: 'showDebugInfo' }
            ],
            'Controls': [] // Populated dynamically
        };
        
        this.updateCurrentOptions();
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
    }

    generateResolutions() {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate physical screen dimensions (approximate)
        const physicalWidth = screenWidth * dpr;
        const physicalHeight = screenHeight * dpr;
        
        console.log(`[Settings] Detected Screen: Logical ${screenWidth}x${screenHeight}, DPR: ${dpr}, Physical ~${physicalWidth}x${physicalHeight}`);
        
        const allResolutions = [
            { w: 1280, h: 720, label: '1280x720' },
            { w: 1366, h: 768, label: '1366x768' },
            { w: 1600, h: 900, label: '1600x900' },
            { w: 1920, h: 1080, label: '1920x1080' },
            { w: 2560, h: 1440, label: '2560x1440' },
            { w: 3840, h: 2160, label: '3840x2160' }
        ];
        
        // Filter resolutions
        // We allow resolutions that fit within the PHYSICAL dimensions of the screen.
        // This handles high-DPI displays where logical width < 1920 but physical width >= 1920.
        // We also add a small tolerance (1.1x) to be generous.
        let validResolutions = allResolutions.filter(res => 
            (res.w <= screenWidth * 1.05 && res.h <= screenHeight * 1.05) || // Fits in logical pixels
            (res.w <= physicalWidth * 1.05 && res.h <= physicalHeight * 1.05) // Fits in physical pixels
        );
        
        // Fallback: If screen detection seems broken (very small) or no resolutions found,
        // provide a standard set of resolutions up to 1080p
        if (validResolutions.length === 0 || screenWidth < 640) {
            console.warn('[Settings] Screen detection suspicious or no valid resolutions. Defaulting to standard set.');
            validResolutions = allResolutions.filter(res => res.w <= 1920);
        }
        
        return validResolutions.map(res => res.label);
    }
    
    updateCurrentOptions(keepFocus = false) {
        // Dynamic population for Controls category
        if (this.currentCategory === 'Controls') {
            this.populateControlsOptions();
        }

        // Get options for current category (Back button is now separate)
        this.options = [
            ...this.allOptions[this.currentCategory]
        ];
        // Reset selection when changing categories to avoid out of bounds
        // If keepFocus is true, we stay on the tabs (-1)
        if (!keepFocus) {
            this.selectedOption = 0;
        } else {
            this.selectedOption = -1;
        }
    }

    populateControlsOptions() {
        const options = [];
        
        // Device Selector
        options.push({ 
            name: 'Input Device', 
            type: 'select', 
            key: 'controlDevice', 
            values: ['Keyboard', 'Gamepad'] 
        });
        
        if (this.controlDevice === 'Keyboard') {
            // Keyboard Bindings
            const bindings = this.game.inputManager.keyBindings;
            // Define order of actions
            const actions = [
                'moveUp', 'moveDown', 'moveLeft', 'moveRight',
                'interact', 'run', 'menu', 'inventory',
                'confirm', 'cancel'
            ];
            
            actions.forEach(action => {
                const keys = bindings[action] || [];
                options.push({
                    name: this.formatActionName(action),
                    type: 'binding',
                    key: action,
                    value: keys.join(' / ')
                });
            });
        } else {
            // Gamepad Bindings (Read-only view)
            const mapping = this.game.inputManager.gamepadMapping;
            // Invert mapping to show Action -> Button(s)
            const actionToButtons = {};
            
            Object.entries(mapping).forEach(([btnIndex, actions]) => {
                actions.forEach(action => {
                    if (!actionToButtons[action]) actionToButtons[action] = [];
                    actionToButtons[action].push(this.getButtonName(btnIndex));
                });
            });
            
            const actions = [
                'moveUp', 'moveDown', 'moveLeft', 'moveRight',
                'interact', 'run', 'menu', 'inventory',
                'confirm', 'cancel'
            ];
            
            actions.forEach(action => {
                const buttons = actionToButtons[action] || [];
                options.push({
                    name: this.formatActionName(action),
                    type: 'info', // Read-only
                    value: buttons.join(' / ') || 'Unbound'
                });
            });
        }
        
        this.allOptions['Controls'] = options;
    }

    formatActionName(action) {
        // Convert camelCase to Title Case
        const result = action.replace(/([A-Z])/g, " $1");
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    getButtonName(index) {
        const names = {
            0: 'A / Cross',
            1: 'B / Circle',
            2: 'X / Square',
            3: 'Y / Triangle',
            4: 'LB', 5: 'RB',
            6: 'LT', 7: 'RT',
            8: 'Select', 9: 'Start',
            10: 'L3', 11: 'R3',
            12: 'D-Pad Up', 13: 'D-Pad Down',
            14: 'D-Pad Left', 15: 'D-Pad Right'
        };
        return names[index] || `Btn ${index}`;
    }
    
    update(deltaTime) {
        // Handle held input for progressive adjustment
        if (this.isHolding && this.lastInputDirection !== 0) {
            this.holdTimer += deltaTime;
            
            if (this.holdTimer > this.holdDelay) {
                // We are in repeat mode
                // Reset timer but keep it above delay to fire immediately next frame if rate is small
                // Better: subtract repeat rate to keep accurate time
                this.holdTimer -= this.holdRepeatRate;
                
                // Adjust setting with repeat flag
                this.adjustSetting(this.lastInputDirection, true);
            }
        }
    }
    
    handleInput(inputManager) {
        // Handle Rebinding State
        if (this.rebindingAction) {
            // Check for any key press
            // We need to find which key is currently pressed that wasn't pressed before
            const pressedKey = Object.keys(inputManager.keys).find(
                key => inputManager.keys[key] && !inputManager.prevKeys[key]
            );
            
            if (pressedKey) {
                if (pressedKey === 'Escape') {
                    // Cancel rebinding
                    this.rebindingAction = null;
                } else {
                    // Apply new binding
                    console.log(`[Settings] Rebinding ${this.rebindingAction} to ${pressedKey}`);
                    inputManager.setKeyBinding(this.rebindingAction, [pressedKey]);
                    this.rebindingAction = null;
                    this.updateCurrentOptions(true);
                    this.game.audioManager?.playEffect('menu-navigation.mp3');
                }
            }
            return; // Block other input
        }

        // Handle Reset Modal Input
        if (this.showResetModal) {
            if (inputManager.isJustPressed('left')) {
                this.resetModalOption = (this.resetModalOption - 1 + 3) % 3;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            if (inputManager.isJustPressed('right')) {
                this.resetModalOption = (this.resetModalOption + 1) % 3;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            if (inputManager.isJustPressed('confirm')) {
                if (this.resetModalOption === 0) { // All
                    this.resetAllSettings();
                    this.showResetModal = false;
                } else if (this.resetModalOption === 1) { // Current
                    this.resetCurrentCategory();
                    this.showResetModal = false;
                } else { // Cancel
                    this.showResetModal = false;
                }
            }
            if (inputManager.isJustPressed('cancel')) {
                this.showResetModal = false;
            }
            return;
        }

        // Handle Exit Modal Input
        if (this.showExitModal) {
            // Use Left/Right for modal navigation
            if (inputManager.isJustPressed('left')) {
                this.exitModalOption = (this.exitModalOption - 1 + 3) % 3;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            if (inputManager.isJustPressed('right')) {
                this.exitModalOption = (this.exitModalOption + 1) % 3;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            if (inputManager.isJustPressed('confirm')) {
                if (this.exitModalOption === 0) { // Save
                    this.applyChanges();
                    this.stateManager.popState();
                } else if (this.exitModalOption === 1) { // Discard
                    // Revert changes
                    Object.assign(this.game.settings, this.originalSettings);
                    
                    // Revert key bindings
                    this.game.inputManager.loadBindings(this.originalBindings);
                    
                    // Re-apply original settings to revert visuals
                    this.applyAudioSettings();
                    this.applyGraphicsSettings('resolution');
                    this.applyGraphicsSettings('fullscreen');
                    
                    this.stateManager.popState();
                } else { // Cancel
                    this.showExitModal = false;
                }
            }
            if (inputManager.isJustPressed('cancel')) {
                this.showExitModal = false;
            }
            return;
        }

        if (inputManager.isJustPressed('cancel')) {
            this.checkChangesAndExit();
            return;
        }
        
        // Category navigation (L/R bumpers or similar concept)
        if (inputManager.isJustPressed('pageUp')) {
            this.changeCategory(-1, true);
            return;
        }
        if (inputManager.isJustPressed('pageDown')) {
            this.changeCategory(1, true);
            return;
        }
        
        if (inputManager.isJustPressed('up')) {
            if (this.selectedOption >= this.options.length) {
                // If on Back or Reset button, go to last option
                this.selectedOption = this.options.length - 1;
                // Ensure last option is visible
                if (this.selectedOption >= this.scrollOffset + this.maxVisibleOptions) {
                    this.scrollOffset = this.selectedOption - this.maxVisibleOptions + 1;
                }
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            } else if (this.selectedOption > 0) {
                this.selectedOption--;
                // Scroll up if needed
                if (this.selectedOption < this.scrollOffset) {
                    this.scrollOffset = this.selectedOption;
                }
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            } else if (this.selectedOption === 0) {
                // Move "up" into category tabs
                this.selectedOption = -1; 
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        }
        
        if (inputManager.isJustPressed('down')) {
            // If currently on options list (less than length)
            if (this.selectedOption < this.options.length) {
                // If on last option, go to Back button (length)
                if (this.selectedOption === this.options.length - 1) {
                    this.selectedOption = this.options.length;
                } else {
                    this.selectedOption++;
                }
                
                // Scroll down if needed (but not for Back/Reset buttons)
                if (this.selectedOption < this.options.length && 
                    this.selectedOption >= this.scrollOffset + this.maxVisibleOptions) {
                    this.scrollOffset = this.selectedOption - this.maxVisibleOptions + 1;
                }
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            // If already on Back or Reset, do nothing (block downward movement)
        }
        
        // Only adjust settings if we are selecting an option (not tabs and not Back button)
        if (this.selectedOption >= 0 && this.selectedOption < this.options.length) {
            // Handle Left/Right for adjustment (supports holding)
            let direction = 0;
            if (inputManager.isPressed('left')) direction = -1;
            if (inputManager.isPressed('right')) direction = 1;
            
            if (direction !== 0) {
                if (this.lastInputDirection !== direction) {
                    // New press
                    this.adjustSetting(direction);
                    this.lastInputDirection = direction;
                    this.holdTimer = 0;
                    this.isHolding = true;
                }
                // If holding, update() handles the repeat
            } else {
                // Released
                this.isHolding = false;
                this.lastInputDirection = 0;
                this.holdTimer = 0;
            }
            
            if (inputManager.isJustPressed('confirm')) {
                this.selectOption();
            }
        } else if (this.selectedOption === this.options.length) {
            // Back button selected
            if (inputManager.isJustPressed('confirm')) {
                this.checkChangesAndExit();
            }
            // Navigate right to Reset button
            if (inputManager.isJustPressed('right')) {
                this.selectedOption = this.options.length + 1;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        } else if (this.selectedOption === this.options.length + 1) {
            // Reset button selected
            if (inputManager.isJustPressed('confirm')) {
                this.showResetModal = true;
                this.resetModalOption = 2; // Default to Cancel
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            // Navigate left to Back button
            if (inputManager.isJustPressed('left')) {
                this.selectedOption = this.options.length;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
        } else {
            // We are in tabs, left/right changes category
            if (inputManager.isJustPressed('left')) {
                this.changeCategory(-1, true);
            }
            if (inputManager.isJustPressed('right')) {
                this.changeCategory(1, true);
            }
        }
    }
    
    checkChangesAndExit() {
        // Check if there are actual changes compared to original settings
        let hasChanges = JSON.stringify(this.originalSettings) !== JSON.stringify(this.game.settings);
        
        // Check for key binding changes
        if (!hasChanges) {
            hasChanges = JSON.stringify(this.originalBindings) !== JSON.stringify(this.game.inputManager.keyBindings);
        }
        
        if (hasChanges) {
            this.showExitModal = true;
            this.exitModalOption = 0; // Default to Save
            
            // Check for restart requirement again just in case
            this.restartRequired = this.originalSettings.vsync !== this.game.settings.vsync;
        } else {
            this.stateManager.popState();
        }
    }

    changeCategory(direction, keepFocus = false) {
        const currentIndex = this.categories.indexOf(this.currentCategory);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = this.categories.length - 1;
        if (newIndex >= this.categories.length) newIndex = 0;
        
        this.currentCategory = this.categories[newIndex];
        this.updateCurrentOptions(keepFocus);
        this.game.audioManager?.playEffect('menu-navigation.mp3');
    }
    
    adjustSetting(direction, isRepeat = false) {
        const option = this.options[this.selectedOption];
        if (!option || !option.key) return;
        
        // Use live settings for instant preview
        const settings = this.game.settings;
        let changed = false;
        
        if (option.type === 'slider') {
            const currentValue = settings[option.key];
            // Use smaller steps when holding for smoother adjustment if desired, 
            // but for now we stick to defined steps for consistency.
            // To make it smoother we could use: const step = isRepeat ? option.step / 2 : option.step;
            const newValue = Math.max(option.min, Math.min(option.max, currentValue + (direction * option.step)));
            
            if (currentValue !== newValue) {
                settings[option.key] = newValue;
                changed = true;
                
                // Apply audio settings immediately
                this.applyAudioSettings();
                
                // Play a test sound for volume adjustment feedback (preview only)
                // Don't spam sound when repeating rapidly
                if ((option.key === 'effectsVolume' || option.key === 'masterVolume') && !isRepeat) {
                    this.game.audioManager?.playEffect('menu-navigation.mp3');
                }
            }
        } else if (option.type === 'toggle') {
            // Toggles shouldn't repeat rapidly
            if (isRepeat) return;
            
            settings[option.key] = !settings[option.key];
            changed = true;
            
            if (option.key === 'isMuted') this.applyAudioSettings();
            if (option.key === 'fullscreen') this.applyGraphicsSettings(option.key);
            if (option.key === 'perspectiveEnabled') this.applyPerspectiveSetting();
            
        } else if (option.type === 'select') {
            // Selects can repeat but maybe slower?
            // For now allow repeat
            
            // Prevent changing if there's only one option
            if (!option.values || option.values.length <= 1) return;

            const currentIndex = option.values.indexOf(settings[option.key]);
            let newIndex = currentIndex + direction;
            
            console.log(`[Settings] Changing ${option.key}: index ${currentIndex} -> ${newIndex} (Total: ${option.values.length})`);
            
            if (newIndex < 0) newIndex = option.values.length - 1;
            if (newIndex >= option.values.length) newIndex = 0;
            
            if (settings[option.key] !== option.values[newIndex]) {
                settings[option.key] = option.values[newIndex];
                changed = true;
                
                if (option.key === 'resolution') this.applyGraphicsSettings(option.key);
            }
        } else if (option.key === 'controlDevice') {
            if (isRepeat) return; // Don't repeat device selection
            
            // Handle custom control device selector
            const currentIndex = option.values.indexOf(this.controlDevice);
            let newIndex = currentIndex + direction;
            
            if (newIndex < 0) newIndex = option.values.length - 1;
            if (newIndex >= option.values.length) newIndex = 0;
            
            this.controlDevice = option.values[newIndex];
            this.updateCurrentOptions(true);
        }
        
        if (changed) {
            // Re-evaluate dirty state by comparing full objects
            // This handles the case where user changes value and changes it back
            this.isDirty = JSON.stringify(this.originalSettings) !== JSON.stringify(this.game.settings);
            
            // Check if this change requires a restart
            if (option.key === 'vsync') {
                this.restartRequired = settings.vsync !== this.originalSettings.vsync;
            }
        }
    }
    
    selectOption() {
        const option = this.options[this.selectedOption];
        
        if (option.type === 'action') {
            if (option.name === 'Back') {
                this.checkChangesAndExit();
            }
        } else if (option.type === 'toggle') {
            this.adjustSetting(1); // Toggle the setting
        } else if (option.type === 'binding') {
            // Start rebinding
            this.rebindingAction = option.key;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
    }

    applyChanges() {
        console.log('[SettingsState] Saving changes...');
        
        // Update key bindings in settings
        this.game.settings.keyBindings = this.game.inputManager.keyBindings;
        
        // Settings are already applied to game.settings during preview
        // We just need to save to disk
        this.saveSettings();
        
        this.isDirty = false;
        this.restartRequired = false;
        
        // Provide feedback
        this.game.audioManager?.playEffect('menu-navigation.mp3'); // Use a success sound if available
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
        }
    }

    applyGraphicsSettings(key) {
        const settings = this.game.settings;
        console.log(`[SettingsState] Applying graphics setting: ${key}`, settings[key]);
        
        if (window.electronAPI) {
            if (key === 'fullscreen') {
                console.log('[SettingsState] Calling electronAPI.setFullscreen', settings.fullscreen);
                window.electronAPI.setFullscreen(settings.fullscreen);
            } else if (key === 'resolution') {
                const [width, height] = settings.resolution.split('x').map(Number);
                console.log('[SettingsState] Calling electronAPI.setResolution', width, height);
                window.electronAPI.setResolution(width, height);
            }
        } else {
            console.warn('[SettingsState] electronAPI not available - cannot apply graphics settings');
        }
    }
    
    applyPerspectiveSetting() {
        const settings = this.game.settings;
        if (this.game.perspectiveSystem) {
            this.game.perspectiveSystem.setEnabled(settings.perspectiveEnabled);
            console.log(`[SettingsState] Fake 3D ${settings.perspectiveEnabled ? 'ENABLED' : 'DISABLED'}`);
        }
    }

    
    saveSettings() {
        // Sync changes back to SettingsManager and save (handles Electron IPC)
        if (this.game.settingsManager) {
            console.log('[SettingsState] Saving settings via SettingsManager...');
            this.game.settingsManager.update(this.game.settings);
        } else {
            // Fallback for non-SettingsManager environments (shouldn't happen)
            try {
                localStorage.setItem('rpg-game-settings', JSON.stringify(this.game.settings));
            } catch (error) {
                console.warn('Failed to save settings:', error);
            }
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // Always draw opaque black background for Settings
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Draw overlay (still useful for vignette/scanlines if desired, but background is already black)
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.8);
        
        // Draw title
        menuRenderer.drawTitle(ctx, 'Settings', canvasWidth, canvasHeight, 0.08);
        
        // Draw Category Tabs - positioned to align with top of content panel
        const tabWidth = canvasWidth * 0.2;
        const tabHeight = sizes.menu * 1.5;
        const totalTabsWidth = this.categories.length * tabWidth;
        const startX = (canvasWidth - totalTabsWidth) / 2;
        const tabY = canvasHeight * 0.19; // Tabs sit just above content panel
        
        this.categories.forEach((category, index) => {
            const x = startX + (index * tabWidth);
            const isSelected = category === this.currentCategory;
            const isFocused = this.selectedOption === -1 && isSelected;
            
            // Tab Background
            ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
            if (isFocused) ctx.fillStyle = 'rgba(74, 158, 255, 0.6)'; // Highlight when focused
            
            ctx.fillRect(x, tabY, tabWidth - 4, tabHeight);
            
            // Tab Border
            ctx.strokeStyle = isSelected ? '#4a9eff' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(x, tabY, tabWidth - 4, tabHeight);
            
            // Tab Text
            ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)';
            ctx.font = `${isSelected ? 'bold' : 'normal'} ${sizes.menu * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(category, x + (tabWidth / 2), tabY + (tabHeight / 2));
        });
        
        // Prepare options with formatted values for MenuRenderer
        const formattedOptions = this.options.map(option => {
            let value = '';
            // Use pendingSettings for display
            const settings = this.pendingSettings;
            
            if (option.type === 'slider') {
                value = `< ${settings[option.key]}% >`;
            } else if (option.type === 'toggle') {
                value = `< ${settings[option.key] ? 'ON' : 'OFF'} >`;
            } else if (option.type === 'select') {
                // Only show arrows if there are multiple options
                if (option.values && option.values.length > 1) {
                    value = `< ${settings[option.key]} >`;
                } else {
                    value = `${settings[option.key]}`;
                }
            } else if (option.key === 'controlDevice') {
                value = `< ${this.controlDevice} >`;
            } else if (option.type === 'binding') {
                if (this.rebindingAction === option.key) {
                    value = '> PRESS KEY <';
                } else {
                    value = option.value;
                }
            } else if (option.type === 'info') {
                value = option.value;
            }
            
            return {
                name: option.name,
                value: value
            };
        });
        
        // Slice options for scrolling
        const visibleOptions = formattedOptions.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleOptions);
        
        // Calculate selected index relative to the visible slice
        // If selectedOption is -1 (tabs) or options.length (back button), pass -1
        let relativeSelectedIndex = -1;
        if (this.selectedOption >= this.scrollOffset && this.selectedOption < this.scrollOffset + this.maxVisibleOptions) {
            relativeSelectedIndex = this.selectedOption - this.scrollOffset;
        }
        
        // Draw settings options using MenuRenderer
        const settingsStartY = 0.30; // Start content just below tabs
        const settingsSpacing = 0.08; // Compact spacing for items
        
        menuRenderer.drawSettingsOptions(
            ctx,
            visibleOptions,
            relativeSelectedIndex,
            canvasWidth,
            canvasHeight,
            settingsStartY,
            settingsSpacing,
            {
                offset: this.scrollOffset,
                total: this.options.length,
                maxVisible: this.maxVisibleOptions
            }
        );
        
        // Draw Back and Reset buttons at the bottom (side by side)
        const buttonY = canvasHeight * 0.85;
        const btnWidth = 150;
        const btnHeight = 50;
        const btnGap = 20;
        const totalButtonsWidth = btnWidth * 2 + btnGap;
        const buttonsStartX = (canvasWidth - totalButtonsWidth) / 2;
        
        const isBackSelected = this.selectedOption === this.options.length;
        const isResetSelected = this.selectedOption === this.options.length + 1;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use DesignSystem to draw buttons for consistent vertical text centering
        const ds = menuRenderer.ds;
        if (ds) {
            // Use DesignSystem's drawButton which has proper font centering
            ds.drawButton(ctx, buttonsStartX + btnWidth / 2, buttonY, btnWidth, btnHeight, 'Back', isBackSelected, false);
            ds.drawButton(ctx, buttonsStartX + btnWidth + btnGap + btnWidth / 2, buttonY, btnWidth, btnHeight, 'Reset', isResetSelected, false);
        } else {
            // Legacy fallback with vertical offset correction for Cinzel font
            const fontVerticalOffset = sizes.menu * 0.08; // Cinzel needs ~8% downward adjustment
            
            const drawButton = (text, x, isSelected) => {
                const btnX = x;
                const btnY = buttonY - btnHeight / 2;
                
                if (isSelected) {
                    // Selected Button (Glass style)
                    const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY + btnHeight);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                    gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
                    
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
                    
                    // Corner accents
                    const cornerSize = 4;
                    ctx.fillStyle = '#4a9eff';
                    ctx.fillRect(btnX, btnY, cornerSize, 2);
                    ctx.fillRect(btnX, btnY, 2, cornerSize);
                    ctx.fillRect(btnX + btnWidth - cornerSize, btnY, cornerSize, 2);
                    ctx.fillRect(btnX + btnWidth - 2, btnY, 2, cornerSize);
                    ctx.fillRect(btnX, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX, btnY + btnHeight - cornerSize, 2, cornerSize);
                    ctx.fillRect(btnX + btnWidth - cornerSize, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX + btnWidth - 2, btnY + btnHeight - cornerSize, 2, cornerSize);
                    
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${sizes.menu}px 'Cinzel', serif`;
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                    ctx.fillText(text, btnX + btnWidth / 2, buttonY + fontVerticalOffset);
                    ctx.shadowBlur = 0;
                } else {
                    // Unselected Button
                    ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
                    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
                    
                    ctx.fillStyle = '#888';
                    ctx.font = `${sizes.menu}px 'Cinzel', serif`;
                    ctx.shadowBlur = 0;
                    ctx.fillText(text, btnX + btnWidth / 2, buttonY + fontVerticalOffset);
                }
            };
            
            drawButton('Back', buttonsStartX, isBackSelected);
            drawButton('Reset', buttonsStartX + btnWidth + btnGap, isResetSelected);
        }
        
        ctx.shadowBlur = 0;
        
        // Draw instructions
        let instructions = this.game.inputManager.isMobile 
            ? 'Joystick: Navigate • A: Select • B: Back'
            : 'Arrow Keys: Navigate • Left/Right: Adjust • Enter: Select • ESC: Back';
            
        if (this.rebindingAction) {
            instructions = 'Press any key to rebind... (ESC to cancel)';
        }
        
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, 0.93);

        // Draw Exit Modal
        if (this.showExitModal) {
            const warning = this.restartRequired ? 'Note: Application restart required.' : null;
            menuRenderer.drawModal(
                ctx,
                'Unsaved Changes',
                'Do you want to save your changes?',
                ['Save', 'Discard', 'Cancel'],
                this.exitModalOption,
                canvasWidth,
                canvasHeight,
                warning
            );
        }
        
        // Draw Reset Modal
        if (this.showResetModal) {
            menuRenderer.drawModal(
                ctx,
                'Reset Settings',
                'What would you like to reset?',
                ['All', this.currentCategory, 'Cancel'],
                this.resetModalOption,
                canvasWidth,
                canvasHeight,
                'This will restore default values.'
            );
        }
    }
    
    /**
     * Reset all settings to defaults
     */
    resetAllSettings() {
        console.log('[SettingsState] Resetting ALL settings to defaults...');
        
        // Get defaults from SettingsManager
        const defaults = this.game.settingsManager ? 
            { ...this.game.settingsManager.defaults } : 
            {
                masterVolume: 100,
                musicVolume: 100,
                effectsVolume: 100,
                isMuted: false,
                showFPS: false,
                showDebugInfo: false,
                resolution: '1280x720',
                fullscreen: false,
                vsync: true,
                perspectiveEnabled: true
            };
        
        // Apply defaults to game settings
        Object.assign(this.game.settings, defaults);
        
        // Reset key bindings to defaults
        this.game.inputManager.resetBindingsToDefaults();
        
        // Apply all settings immediately
        this.applyAudioSettings();
        this.applyGraphicsSettings('resolution');
        this.applyGraphicsSettings('fullscreen');
        this.applyPerspectiveSetting();
        
        // Mark as dirty (changed from original)
        this.isDirty = true;
        
        // Update display
        this.updateCurrentOptions(true);
        
        this.game.audioManager?.playEffect('menu-navigation.mp3');
        console.log('[SettingsState] All settings reset to defaults.');
    }
    
    /**
     * Reset current category settings to defaults
     */
    resetCurrentCategory() {
        console.log(`[SettingsState] Resetting ${this.currentCategory} settings to defaults...`);
        
        // Get defaults from SettingsManager
        const defaults = this.game.settingsManager ? 
            this.game.settingsManager.defaults : 
            {
                masterVolume: 100,
                musicVolume: 100,
                effectsVolume: 100,
                isMuted: false,
                showFPS: false,
                showDebugInfo: false,
                resolution: '1280x720',
                fullscreen: false,
                vsync: true,
                perspectiveEnabled: true
            };
        
        // Reset only settings in current category
        const categoryOptions = this.allOptions[this.currentCategory];
        
        categoryOptions.forEach(option => {
            if (option.key && defaults.hasOwnProperty(option.key)) {
                this.game.settings[option.key] = defaults[option.key];
            }
        });
        
        // Apply settings for current category
        if (this.currentCategory === 'Audio') {
            this.applyAudioSettings();
        } else if (this.currentCategory === 'Graphics') {
            this.applyGraphicsSettings('resolution');
            this.applyGraphicsSettings('fullscreen');
            this.applyPerspectiveSetting();
        } else if (this.currentCategory === 'Controls') {
            // Reset key bindings
            this.game.inputManager.resetBindingsToDefaults();
            this.updateCurrentOptions(true);
        }
        
        // Mark as dirty
        this.isDirty = true;
        
        // Update display
        this.updateCurrentOptions(true);
        
        this.game.audioManager?.playEffect('menu-navigation.mp3');
        console.log(`[SettingsState] ${this.currentCategory} settings reset to defaults.`);
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
        this.inputCooldown = 0.2; // Add cooldown to prevent immediate closing
        
        // Get items from inventory manager
        this.items = this.game.inventoryManager.getAllSlots();
        
        // Show touch controls if on mobile
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('menu');
        }
    }
    
    update(deltaTime) {
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }
    }
    
    handleInput(inputManager) {
        if (this.inputCooldown > 0) return;

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
