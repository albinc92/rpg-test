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
     * Check if state is on the stack or is the current state
     */
    isStateInStack(stateName) {
        // Check if it's the current state OR in the stack
        return this.currentState === stateName || this.stateStack.some(s => s.state === stateName);
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
        this.loadingText = this.game.t('loading.loading');
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
        this.loadingText = this.game.t('loading.audio');
        await this.waitForAudio();
        this.loadingProgress = 0.4;
        
        this.loadingText = this.game.t('loading.maps');
        // Load maps here
        this.loadingProgress = 0.7;
        
        this.loadingText = this.game.t('loading.initializing');
        // Initialize game systems
        this.loadingProgress = 1.0;
        
        // Transition to main menu
        setTimeout(() => {
            this.stateManager.changeState('MAIN_MENU');
        }, 500);
    }
    
    async loadSavedGame() {
        this.loadingText = this.game.t('loading.saveData');
        this.loadingProgress = 0.2;
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        
        this.loadingText = this.game.t('loading.map');
        this.loadingProgress = 0.4;
        
        // Load the saved game
        const success = await this.game.saveGameManager.loadGame(this.loadSaveId, this.game);
        
        if (success) {
            this.loadingText = this.game.t('loading.restoring');
            this.loadingProgress = 0.8;
            
            await new Promise(resolve => setTimeout(resolve, 200)); // Let objects spawn
            
            this.loadingText = this.game.t('loading.ready');
            this.loadingProgress = 1.0;
            
            // Transition to playing state
            setTimeout(() => {
                this.stateManager.changeState('PLAYING', { 
                    isLoadedGame: this.isLoadedGame 
                });
            }, 300);
        } else {
            // Failed to load - go back to main menu
            this.loadingText = this.game.t('loading.failed');
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
            this.loadingText = this.game.t('loading.clickToStart');
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
            ctx.fillText(this.game.t('loading.clickToStart'), canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.05);
            ctx.restore();
            
            // Subtitle
            ctx.fillStyle = textSecondary;
            ctx.font = ds ? ds.font('md', 'normal', 'body') : `${sizes.menu}px Arial`;
            ctx.fillText(this.game.t('loading.clickToStartHint'), canvasWidth / 2, canvasHeight / 2 + canvasHeight * 0.05);
            
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
        // Use translation keys for localization
        this.options = [
            { key: 'menu.main.continue', text: this.game.t('menu.main.continue'), disabled: !this.hasSaveFiles },
            { key: 'menu.main.loadGame', text: this.game.t('menu.main.loadGame'), disabled: !this.hasSaveFiles },
            { key: 'menu.main.newGame', text: this.game.t('menu.main.newGame'), disabled: false },
            { key: 'menu.main.settings', text: this.game.t('menu.main.settings'), disabled: false },
            { key: 'menu.main.exit', text: this.game.t('menu.main.exit'), disabled: false }
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
        
        this.game.audioManager?.playEffect('click.mp3');
        const optionKey = option.key;
        
        switch (optionKey) {
            case 'menu.main.continue':
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
            case 'menu.main.newGame':
                // Start new game - reset everything
                this.game.resetGame();
                this.stateManager.changeState('PLAYING', { isNewGame: true });
                break;
            case 'menu.main.loadGame':
                // Open save/load menu in load mode from main menu
                this.stateManager.pushState('SAVE_LOAD', { mode: 'load_list', fromMainMenu: true });
                break;
            case 'menu.main.settings':
                this.stateManager.pushState('SETTINGS');
                break;
            case 'menu.main.exit':
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
        
        // Draw title (using localized title)
        menuRenderer.drawTitle(ctx, this.game.t('menu.main.title'), canvasWidth, canvasHeight, 0.25);
        
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
        
        // Draw version/commit SHA in bottom left corner
        const commitSha = typeof __GIT_COMMIT_SHA__ !== 'undefined' ? __GIT_COMMIT_SHA__ : 'dev';
        ctx.save();
        ctx.font = `400 ${Math.round(canvasHeight * 0.018)}px 'Lato', sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const padding = canvasHeight * 0.02;
        ctx.fillText(`Version: ${commitSha}`, padding, canvasHeight - padding);
        ctx.restore();
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
        console.log('🔄 [PlayingState] RESUME called - setting interactionCooldown = 0.3');
        
        // Snap camera instantly to prevent visual glitch if resolution changed while paused
        // Without this, the camera would smoothly interpolate to the new position causing a "glide"
        if (this.game.renderSystem?.camera) {
            this.game.renderSystem.camera.snapToTarget = true;
        }
        this.game.updateCamera();
        
        // Show touch controls when resuming
        if (this.game.touchControlsUI) {
            this.game.touchControlsUI.show();
            this.game.touchControlsUI.updateButtonLabels('gameplay');
        }
        
        // Set interaction cooldown to prevent immediate re-interaction after dialogue/shop closes
        this.game.interactionCooldown = 0.3;
        console.log(`[PlayingState] interactionCooldown is now: ${this.game.interactionCooldown}`);
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
        
        // Button properties (localized)
        const buttonText = this.game.t('hud.menu');
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
        // Use translation keys for menu options
        this.options = [
            { key: 'menu.pause.resume', text: this.game.t('menu.pause.resume') },
            { key: 'menu.pause.saveLoad', text: this.game.t('menu.pause.saveLoad') },
            { key: 'menu.pause.settings', text: this.game.t('menu.pause.settings') },
            { key: 'menu.pause.mainMenu', text: this.game.t('menu.pause.mainMenu') }
        ];
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
                this.game.audioManager?.playEffect('cancel.mp3');
                this.showExitConfirm = false;
                return;
            }
            
            if (inputManager.isJustPressed('left') || inputManager.isJustPressed('right')) {
                this.exitConfirmOption = this.exitConfirmOption === 0 ? 1 : 0;
                this.game.audioManager?.playEffect('menu-navigation.mp3');
            }
            
            if (inputManager.isJustPressed('confirm')) {
                this.game.audioManager?.playEffect('click.mp3');
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
            this.game.audioManager?.playEffect('cancel.mp3');
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
        const optionKey = this.options[this.selectedOption].key;
        this.game.audioManager?.playEffect('click.mp3');
        switch (optionKey) {
            case 'menu.pause.resume':
                this.stateManager.popState();
                break;
            case 'menu.pause.saveLoad':
                this.stateManager.pushState('SAVE_LOAD');
                break;
            case 'menu.pause.settings':
                this.stateManager.pushState('SETTINGS');
                break;
            case 'menu.pause.mainMenu':
                this.showExitConfirm = true;
                this.exitConfirmOption = 1; // Default to No
                break;
        }
    }

    render(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const menuRenderer = this.stateManager.menuRenderer;
        
        // Get the most recent state on the stack (the one we paused from)
        const stackLength = this.stateManager.stateStack.length;
        const topOfStack = stackLength > 0 ? this.stateManager.stateStack[stackLength - 1].state : null;
        
        // Render the state we paused FROM (top of stack)
        if (topOfStack === 'BATTLE') {
            // Render battle scene behind pause menu
            const battleState = this.stateManager.states['BATTLE'];
            if (battleState && battleState.render) {
                battleState.render(ctx, true); // Pass true to skip transition animation
            }
        } else if (topOfStack === 'PLAYING' || this.stateManager.isStateInStack('PLAYING')) {
            this.game.renderGameplay(ctx);
        }
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.7);
        
        // Draw title (localized)
        menuRenderer.drawTitle(ctx, this.game.t('menu.pause.title'), canvasWidth, canvasHeight, 0.25);
        
        // Draw options
        menuRenderer.drawMenuOptions(ctx, this.options, this.selectedOption, canvasWidth, canvasHeight, 0.45, 0.1);
        
        // Draw exit confirmation if active
        if (this.showExitConfirm) {
            menuRenderer.drawModal(
                ctx, 
                this.game.t('menu.pause.quitConfirmTitle'), 
                this.game.t('menu.pause.quitConfirmMessage'), 
                [this.game.t('menu.common.yes'), this.game.t('menu.common.no')],
                this.exitConfirmOption, 
                canvasWidth, 
                canvasHeight,
                this.game.t('menu.pause.unsavedWarning')
            );
        }
        
        // Draw instructions (localized)
        const instructions = this.game.inputManager.isMobile 
            ? this.game.t('instructions.tapToSelect')
            : this.game.t('instructions.pauseMenu');
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
        // Use localized strings for menu options
        this.mainOptions = [
            { key: 'saveLoad.save', text: this.game.t('saveLoad.title.save') },
            { key: 'saveLoad.load', text: this.game.t('saveLoad.title.load') },
            { key: 'menu.common.back', text: this.game.t('menu.common.back') }
        ];
        this.saves = [];
        this.scrollOffset = 0;
        this.maxVisibleSaves = 5; // Reduced to make room for empty slot
        this.saveToDelete = null;
        this.saveToOverwrite = null;
        this.confirmOptions = [this.game.t('menu.common.yes'), this.game.t('menu.common.no')];
        
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
                this.game.audioManager?.playEffect('cancel.mp3');
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
                this.game.audioManager?.playEffect('click.mp3');
                this.selectOption();
                return;
            }
            
            // Block all other input when in confirmation mode
            return;
        }
        
        // Normal menu input handling
        if (inputManager.isJustPressed('cancel')) {
            this.game.audioManager?.playEffect('cancel.mp3');
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
            this.game.audioManager?.playEffect('click.mp3');
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
        
        // Draw dark overlay (WebGL canvas is cleared when not in gameplay, so this works for both cases)
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
        
        // Draw title (localized)
        menuRenderer.drawTitle(ctx, this.game.t('saveLoad.menuTitle'), canvasWidth, canvasHeight, 0.25);
        
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
        const title = this.mode === 'save_list' 
            ? this.game.t('saveLoad.title.save') 
            : this.game.t('saveLoad.title.load');
        
        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Title
        menuRenderer.drawTitle(ctx, title, canvasWidth, canvasHeight, 0.15);
        
        // Subtitle / Context
        if (this.mode === 'save_list') {
            menuRenderer.drawInstruction(ctx, this.game.t('saveLoad.selectSlotSave'), canvasWidth, canvasHeight, 0.22);
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
                this.game.t('saveLoad.newSave'), 
                this.game.t('saveLoad.createNewSave'), 
                isSelected, 
                true
            );
        }
        
        // Save list
        if (this.saves.length === 0 && this.mode === 'load_list') {
            ctx.fillStyle = '#888';
            ctx.font = `${sizes.subtitle}px 'Lato', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(this.game.t('saveLoad.noSaves'), canvasWidth / 2, canvasHeight * 0.5);
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
                ? this.game.t('instructions.saveMenuMobile')
                : this.game.t('instructions.saveMenu');
        } else {
            instructions = this.game.inputManager.isMobile 
                ? this.game.t('instructions.loadMenuMobile')
                : this.game.t('instructions.loadMenu');
        }
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, 0.93);
    }
    
    renderDeleteConfirmation(ctx, canvasWidth, canvasHeight) {
        const menuRenderer = this.stateManager.menuRenderer;
        const saveName = this.saveToDelete ? `"${this.saveToDelete.name}"` : '';
        
        menuRenderer.drawModal(
            ctx,
            this.game.t('saveLoad.confirmDelete'),
            saveName,
            this.confirmOptions,
            this.selectedOption,
            canvasWidth,
            canvasHeight,
            this.game.t('saveLoad.deleteWarning')
        );
    }
    
    renderOverwriteConfirmation(ctx, canvasWidth, canvasHeight) {
        const menuRenderer = this.stateManager.menuRenderer;
        const saveName = this.saveToOverwrite ? `"${this.saveToOverwrite.name}"` : '';
        
        menuRenderer.drawModal(
            ctx,
            this.game.t('saveLoad.confirmOverwrite'),
            saveName,
            this.confirmOptions,
            this.selectedOption,
            canvasWidth,
            canvasHeight,
            this.game.t('saveLoad.overwriteWarning')
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

        // Fetch actual screen resolution from Electron (ignoring Windows DPI scaling)
        this.actualScreenWidth = 3840;  // Default to 4K until we get real value
        this.actualScreenHeight = 2160;
        
        if (window.electronAPI?.getScreenResolution) {
            window.electronAPI.getScreenResolution().then(screenInfo => {
                console.log('[SettingsState] Got actual screen resolution:', screenInfo);
                this.actualScreenWidth = screenInfo.width;
                this.actualScreenHeight = screenInfo.height;
                // Regenerate resolutions now that we have the real screen size
                this.refreshResolutionList();
            }).catch(err => {
                console.warn('[SettingsState] Could not get screen resolution:', err);
            });
        }

        this.resolutions = this.generateResolutions();
        
        // Only validate if resolution is completely missing or empty
        if (!this.pendingSettings.resolution) {
            this.pendingSettings.resolution = '1920x1080';
            this.isDirty = true;
        }
        
        // Define options per category
        this.allOptions = {
            'Audio': [
                { nameKey: 'settings.audio.masterVolume', type: 'slider', key: 'masterVolume', min: 0, max: 100, step: 10 },
                { nameKey: 'settings.audio.musicVolume', type: 'slider', key: 'musicVolume', min: 0, max: 100, step: 10 },
                { nameKey: 'settings.audio.effectsVolume', type: 'slider', key: 'effectsVolume', min: 0, max: 100, step: 10 },
                { nameKey: 'settings.audio.mute', type: 'toggle', key: 'isMuted' }
            ],
            'Graphics': [
                { nameKey: 'settings.graphics.resolution', type: 'select', key: 'resolution', values: this.resolutions },
                { nameKey: 'settings.graphics.fullscreen', type: 'toggle', key: 'fullscreen' },
                { nameKey: 'settings.graphics.vsync', type: 'toggle', key: 'vsync' },
                { nameKey: 'settings.graphics.antiAliasing', type: 'select', key: 'antiAliasing', values: ['None', 'MSAA', 'FXAA', 'MSAA+FXAA'], valueMap: { 'None': 'none', 'MSAA': 'msaa', 'FXAA': 'fxaa', 'MSAA+FXAA': 'msaa+fxaa' }, valueKeys: { 'None': 'settings.graphics.aaOptions.none', 'MSAA': 'settings.graphics.aaOptions.msaa', 'FXAA': 'settings.graphics.aaOptions.fxaa', 'MSAA+FXAA': 'settings.graphics.aaOptions.msaafxaa' } },
                { nameKey: 'settings.graphics.textureFiltering', type: 'select', key: 'textureFiltering', values: ['Smooth', 'Sharp'], valueMap: { 'Smooth': 'smooth', 'Sharp': 'sharp' }, valueKeys: { 'Smooth': 'settings.graphics.filterOptions.smooth', 'Sharp': 'settings.graphics.filterOptions.sharp' } },
                { nameKey: 'settings.graphics.sharpen', type: 'slider', key: 'sharpenIntensity', min: 0, max: 100, step: 10, suffix: '%' },
                { nameKey: 'settings.graphics.bloom', type: 'slider', key: 'bloomIntensity', min: 0, max: 100, step: 10, suffix: '%' },
                { nameKey: 'settings.graphics.gameZoom', type: 'slider', key: 'gameZoom', min: 85, max: 115, step: 5, suffix: '%' },
                { nameKey: 'settings.graphics.uiScale', type: 'slider', key: 'uiScale', min: 50, max: 200, step: 10, suffix: '%', devOnly: true },
                { nameKey: 'settings.graphics.perspective', type: 'toggle', key: 'perspectiveEnabled' },
                { nameKey: 'settings.graphics.showFPS', type: 'toggle', key: 'showFPS' }
            ],
            'Gameplay': [
                { nameKey: 'settings.gameplay.language', type: 'select', key: 'language', values: [], dynamicValues: 'languages' },
                { nameKey: 'settings.gameplay.messageSpeed', type: 'select', key: 'messageSpeed', values: ['Slow', 'Medium', 'Fast'], valueMap: { 'Slow': 'slow', 'Medium': 'medium', 'Fast': 'fast' }, valueKeys: { 'Slow': 'settings.gameplay.speedOptions.slow', 'Medium': 'settings.gameplay.speedOptions.medium', 'Fast': 'settings.gameplay.speedOptions.fast' } },
                { nameKey: 'settings.gameplay.alwaysRun', type: 'toggle', key: 'alwaysRun', disabledWhen: 'controller' },
                { nameKey: 'settings.gameplay.showDebugInfo', type: 'toggle', key: 'showDebugInfo' }
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
        // Standard resolutions for various aspect ratios, sorted by total pixels
        const allResolutions = [
            // 16:9 resolutions
            { w: 1280, h: 720, label: '1280x720', ratio: '16:9' },
            { w: 1366, h: 768, label: '1366x768', ratio: '16:9' },
            { w: 1600, h: 900, label: '1600x900', ratio: '16:9' },
            { w: 1920, h: 1080, label: '1920x1080', ratio: '16:9' },
            { w: 2560, h: 1440, label: '2560x1440', ratio: '16:9' },
            { w: 3840, h: 2160, label: '3840x2160', ratio: '16:9' },
            
            // 16:10 resolutions
            { w: 1280, h: 800, label: '1280x800', ratio: '16:10' },
            { w: 1440, h: 900, label: '1440x900', ratio: '16:10' },
            { w: 1680, h: 1050, label: '1680x1050', ratio: '16:10' },
            { w: 1920, h: 1200, label: '1920x1200', ratio: '16:10' },
            { w: 2560, h: 1600, label: '2560x1600', ratio: '16:10' },
            
            // 21:9 Ultrawide resolutions
            { w: 2560, h: 1080, label: '2560x1080', ratio: '21:9' },
            { w: 3440, h: 1440, label: '3440x1440', ratio: '21:9' },
            { w: 3840, h: 1600, label: '3840x1600', ratio: '21:9' },
            
            // 32:9 Super Ultrawide
            { w: 5120, h: 1440, label: '5120x1440', ratio: '32:9' },
            
            // 4:3 resolutions (legacy)
            { w: 1024, h: 768, label: '1024x768', ratio: '4:3' },
            { w: 1280, h: 960, label: '1280x960', ratio: '4:3' },
            { w: 1400, h: 1050, label: '1400x1050', ratio: '4:3' },
            { w: 1600, h: 1200, label: '1600x1200', ratio: '4:3' },
        ].sort((a, b) => (a.w * a.h) - (b.w * b.h)); // Sort by total pixels
        
        // Use cached screen resolution if available (set by async call on enter)
        // Fall back to allowing all resolutions if not yet fetched
        const screenWidth = this.actualScreenWidth || 3840;
        const screenHeight = this.actualScreenHeight || 2160;
        
        console.log('[generateResolutions] Using screen size:', `${screenWidth}x${screenHeight}`);
        
        const validResolutions = allResolutions.filter(res => 
            res.w <= screenWidth && res.h <= screenHeight
        );
        
        // Create labels with aspect ratio
        const createLabel = (w, h, ratio) => `${w}x${h} (${ratio})`;
        
        // Start with standard labels only
        const labels = validResolutions.length > 0 
            ? validResolutions.map(r => createLabel(r.w, r.h, r.ratio))
            : ['1280x720 (16:9)'];
        
        console.log('[generateResolutions] Standard resolutions:', labels);
        console.log('[generateResolutions] Current setting:', this.game.settings.resolution);
        
        // Check if we have a custom resolution active
        const currentRes = this.game.settings.resolution;
        
        // If current resolution is custom (not in standard list), add it at the right position
        if (currentRes && currentRes.startsWith('Custom')) {
            const match = currentRes.match(/Custom \((\d+)x(\d+)\)/);
            if (match) {
                const customWidth = parseInt(match[1]);
                const customHeight = parseInt(match[2]);
                const customPixels = customWidth * customHeight;
                
                // Calculate aspect ratio for custom resolution
                const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                const divisor = gcd(customWidth, customHeight);
                const ratioW = customWidth / divisor;
                const ratioH = customHeight / divisor;
                
                // Simplify common ratios
                let customRatio = `${ratioW}:${ratioH}`;
                if (Math.abs(ratioW/ratioH - 16/9) < 0.02) customRatio = '~16:9';
                else if (Math.abs(ratioW/ratioH - 16/10) < 0.02) customRatio = '~16:10';
                else if (Math.abs(ratioW/ratioH - 21/9) < 0.02) customRatio = '~21:9';
                else if (Math.abs(ratioW/ratioH - 4/3) < 0.02) customRatio = '~4:3';
                
                const customLabel = `Custom ${customWidth}x${customHeight} (${customRatio})`;
                
                // Find where to insert based on total pixels
                let insertIndex = 0;
                for (let i = 0; i < validResolutions.length; i++) {
                    const resPixels = validResolutions[i].w * validResolutions[i].h;
                    if (customPixels > resPixels) {
                        insertIndex = i + 1;
                    } else {
                        break;
                    }
                }
                
                // Insert custom at the right position
                labels.splice(insertIndex, 0, customLabel);
                console.log('[generateResolutions] Added custom at index', insertIndex, '- Final list:', labels);
            }
        }
        
        return labels;
    }
    
    updateCurrentOptions(keepFocus = false) {
        // Dynamic population for Controls category
        if (this.currentCategory === 'Controls') {
            this.populateControlsOptions();
        }
        
        // Populate dynamic values (like Language options)
        this.populateDynamicValues();

        // Get options for current category (Back button is now separate)
        // Filter out devOnly options if devMode is off
        const devMode = this.game.devMode;
        this.options = this.allOptions[this.currentCategory].filter(opt => {
            if (opt.devOnly && !devMode) return false;
            return true;
        });
        
        // Reset selection when changing categories to avoid out of bounds
        // If keepFocus is true, we stay on the tabs (-1)
        if (!keepFocus) {
            this.selectedOption = 0;
        } else {
            this.selectedOption = -1;
        }
    }
    
    /**
     * Populate dynamic option values (e.g., languages from LocaleManager)
     */
    populateDynamicValues() {
        // Populate language options from LocaleManager
        const gameplayOptions = this.allOptions['Gameplay'];
        const languageOption = gameplayOptions.find(opt => opt.key === 'language');
        if (languageOption && languageOption.dynamicValues === 'languages') {
            const availableLocales = this.game.getAvailableLanguages();
            // Create display values and a map to locale codes
            languageOption.values = availableLocales.map(l => l.nativeName);
            languageOption.valueMap = {};
            availableLocales.forEach(l => {
                languageOption.valueMap[l.nativeName] = l.code;
            });
            // Also create reverse map for display
            languageOption.reverseMap = {};
            availableLocales.forEach(l => {
                languageOption.reverseMap[l.code] = l.nativeName;
            });
        }
    }

    populateControlsOptions() {
        const options = [];
        
        // Check if controller is connected
        const controllerConnected = this.game.inputManager?.gamepadState?.connected || false;
        
        // Device Selector - disabled if no controller connected
        options.push({ 
            nameKey: 'settings.controls.inputDevice', 
            type: 'select', 
            key: 'controlDevice', 
            values: ['Keyboard', 'Gamepad'],
            valueKeys: {
                'Keyboard': 'settings.controls.keyboard',
                'Gamepad': 'settings.controls.gamepad'
            },
            disabledWhen: 'noController'
        });
        
        // If no controller, force keyboard mode
        if (!controllerConnected && this.controlDevice === 'Gamepad') {
            this.controlDevice = 'Keyboard';
        }
        
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
                    nameKey: `settings.controls.${action}`,
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
                    nameKey: `settings.controls.${action}`,
                    type: 'info', // Read-only
                    value: buttons.join(' / ') || this.game.t('settings.controls.unbound')
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
                this.game.audioManager?.playEffect('click.mp3');
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
                this.game.audioManager?.playEffect('cancel.mp3');
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
                this.game.audioManager?.playEffect('click.mp3');
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
                this.game.audioManager?.playEffect('cancel.mp3');
                this.showExitModal = false;
            }
            return;
        }

        if (inputManager.isJustPressed('cancel')) {
            this.game.audioManager?.playEffect('cancel.mp3');
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
                this.game.audioManager?.playEffect('click.mp3');
                this.selectOption();
            }
        } else if (this.selectedOption === this.options.length) {
            // Back button selected
            if (inputManager.isJustPressed('confirm')) {
                this.game.audioManager?.playEffect('click.mp3');
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
                this.game.audioManager?.playEffect('click.mp3');
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
        
        // Check if option is disabled
        const controllerConnected = this.game.inputManager?.gamepadState?.connected || false;
        if (option.disabledWhen === 'controller' && controllerConnected) {
            return; // Don't allow changing when controller connected
        }
        if (option.disabledWhen === 'noController' && !controllerConnected) {
            return; // Don't allow changing when NO controller connected
        }
        
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
                
                // Apply UI scale changes immediately
                if (option.key === 'uiScale') {
                    this.applyUIScaleSetting();
                }
                
                // Apply game zoom changes immediately
                if (option.key === 'gameZoom') {
                    this.applyGameZoomSetting();
                }
                
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

            // Support valueMap for display vs internal values
            const hasValueMap = option.valueMap !== undefined;
            let currentValue = settings[option.key];
            
            // Find current index - if using valueMap, find display value from internal value
            let currentIndex;
            if (hasValueMap) {
                // Reverse lookup: find display value from internal value
                const reverseMap = Object.entries(option.valueMap).find(([display, internal]) => internal === currentValue);
                const displayValue = reverseMap ? reverseMap[0] : option.values[0];
                currentIndex = option.values.indexOf(displayValue);
            } else {
                currentIndex = option.values.indexOf(currentValue);
            }
            
            let newIndex = currentIndex + direction;
            
            console.log(`[Settings] Changing ${option.key}: index ${currentIndex} -> ${newIndex} (Total: ${option.values.length})`);
            
            if (newIndex < 0) newIndex = option.values.length - 1;
            if (newIndex >= option.values.length) newIndex = 0;
            
            // Get new value - map display to internal if using valueMap
            const newDisplayValue = option.values[newIndex];
            const newValue = hasValueMap ? option.valueMap[newDisplayValue] : newDisplayValue;
            
            if (settings[option.key] !== newValue) {
                settings[option.key] = newValue;
                changed = true;
                
                if (option.key === 'resolution') this.applyGraphicsSettings(option.key);
                if (option.key === 'antiAliasing') this.applyAntiAliasingSetting();
                if (option.key === 'textureFiltering') this.applyTextureFilteringSetting();
                if (option.key === 'language') this.applyLanguageSetting(newValue);
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
                // Track fullscreen state on game engine for resolution handling
                this.game.isFullscreen = settings.fullscreen;
                window.electronAPI.setFullscreen(settings.fullscreen);
                
                // Trigger resize to recalculate rendering resolution
                setTimeout(() => {
                    if (this.game.handleResize) {
                        this.game.handleResize();
                    }
                }, 100);
            } else if (key === 'resolution') {
                let width, height;
                
                // Handle custom resolution format: "Custom WxH (ratio)"
                if (settings.resolution.startsWith('Custom')) {
                    const match = settings.resolution.match(/Custom (\d+)x(\d+)/);
                    if (match) {
                        width = parseInt(match[1]);
                        height = parseInt(match[2]);
                    }
                } else {
                    // Standard resolution format: "WxH (ratio)"
                    const match = settings.resolution.match(/(\d+)x(\d+)/);
                    if (match) {
                        width = parseInt(match[1]);
                        height = parseInt(match[2]);
                    }
                }
                
                if (width && height) {
                    console.log('[SettingsState] Calling electronAPI.setResolution', width, height);
                    
                    // Check if we're in fullscreen mode
                    if (this.game.isFullscreen) {
                        // In fullscreen, just trigger resize to apply new rendering resolution
                        // The canvas CSS stays at 100vw x 100vh, but buffer size changes
                        console.log('[SettingsState] Fullscreen mode - applying rendering resolution');
                        if (this.game.handleResize) {
                            this.game.handleResize();
                        }
                    } else {
                        // In windowed mode, change the window size
                        // Set a flag to tell handleResize to use our exact dimensions
                        this.game.pendingResolution = { width, height };
                        window.electronAPI.setResolution(width, height);
                    }
                }
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

    applyUIScaleSetting() {
        // Update the global cached scale for EditorStyles
        // This affects all editor components that use EditorStyles
        if (typeof EditorStyles !== 'undefined') {
            EditorStyles.updateCachedScale();
            console.log(`[SettingsState] UI Scale updated to ${this.game.settings.uiScale}%`);
        }
    }
    
    applyGameZoomSetting() {
        // Delegate to GameEngine's method
        if (this.game.applyGameZoomSetting) {
            this.game.applyGameZoomSetting();
        }
    }
    
    applyAntiAliasingSetting() {
        const currentAA = this.game.settings.antiAliasing;
        console.log(`[SettingsState] Anti-Aliasing changed to: ${currentAA}`);
        
        // FXAA can be toggled immediately without restart
        if (this.game.renderSystem?.webglRenderer) {
            this.game.renderSystem.webglRenderer.setAntiAliasing(currentAA);
        }
        
        // MSAA requires WebGL context recreation - mark restart required only for MSAA changes
        const needsRestart = currentAA === 'msaa' || currentAA === 'msaa+fxaa';
        if (needsRestart) {
            console.log('[SettingsState] Note: MSAA changes require game restart to take effect');
            this.restartRequired = true;
        }
    }
    
    applyTextureFilteringSetting() {
        // Texture filtering can be changed on the fly
        const filtering = this.game.settings.textureFiltering;
        if (this.game.renderSystem?.webglRenderer) {
            this.game.renderSystem.webglRenderer.setTextureFiltering(filtering);
            console.log(`[SettingsState] Texture Filtering changed to: ${filtering}`);
        }
    }
    
    /**
     * Apply language setting - loads new locale and refreshes UI strings
     * @param {string} localeCode - The locale code (e.g., 'en', 'ja', 'es')
     */
    async applyLanguageSetting(localeCode) {
        console.log(`[SettingsState] Changing language to: ${localeCode}`);
        const success = await this.game.changeLanguage(localeCode);
        if (success) {
            // Refresh the main menu options if we need to return there
            // The menu strings will be updated when we return to main menu
            console.log(`[SettingsState] Language changed successfully to: ${localeCode}`);
        } else {
            console.warn(`[SettingsState] Failed to change language to: ${localeCode}`);
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
        
        // If user saved a standard resolution, regenerate the resolution list
        // This removes any custom resolution that was previously in the list
        if (!this.game.settings.resolution.startsWith('Custom')) {
            this.refreshResolutionList();
        }
    }
    
    /**
     * Refresh the resolution list - called when window is resized or when saving standard resolution
     */
    refreshResolutionList() {
        const previousSelection = this.selectedOption;
        
        this.resolutions = this.generateResolutions();
        
        // Update the values in allOptions
        const graphicsOptions = this.allOptions['Graphics'];
        const resolutionOption = graphicsOptions.find(opt => opt.key === 'resolution');
        if (resolutionOption) {
            resolutionOption.values = this.resolutions;
        }
        
        // Re-update current options if we're on Graphics tab, preserving focus
        if (this.currentCategory === 'Graphics') {
            // Rebuild options array
            this.options = [...this.allOptions['Graphics']];
            // Restore previous selection (don't change it)
            this.selectedOption = previousSelection;
        }
    }
    
    render(ctx) {
        // Use the game's logical canvas dimensions
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;

        // Use MenuRenderer for consistent styling
        const menuRenderer = this.stateManager.menuRenderer;
        const sizes = menuRenderer.getFontSizes(canvasHeight);
        
        // Draw overlay (WebGL canvas is cleared when not in gameplay)
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.8);
        
        // Draw title (localized)
        menuRenderer.drawTitle(ctx, this.game.t('settings.title'), canvasWidth, canvasHeight, 0.08);
        
        // Draw Category Tabs - matching panel width with consistent inner gaps
        // Container margin matches panel (10% on each side = 80% width)
        const containerMargin = canvasWidth * 0.1;
        const containerWidth = canvasWidth * 0.8;
        const tabGap = 8; // Gap between tabs (not on outer edges)
        const totalGaps = this.categories.length - 1; // Gaps only between tabs
        const tabWidth = (containerWidth - (totalGaps * tabGap)) / this.categories.length;
        const tabHeight = sizes.menu * 1.5;
        const tabY = canvasHeight * 0.19; // Tabs sit just above content panel
        
        this.categories.forEach((category, index) => {
            // Each tab starts after previous tabs + gaps between them
            const x = containerMargin + (index * (tabWidth + tabGap));
            const isSelected = category === this.currentCategory;
            const isFocused = this.selectedOption === -1 && isSelected;
            
            // Tab Background
            ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
            if (isFocused) ctx.fillStyle = 'rgba(74, 158, 255, 0.6)'; // Highlight when focused
            
            ctx.fillRect(x, tabY, tabWidth, tabHeight);
            
            // Tab Border
            ctx.strokeStyle = isSelected ? '#4a9eff' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(x, tabY, tabWidth, tabHeight);
            
            // Tab Text (localized)
            const tabKey = `settings.tabs.${category.toLowerCase()}`;
            const tabText = this.game.t(tabKey);
            ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)';
            ctx.font = `${isSelected ? 'bold' : 'normal'} ${sizes.menu * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tabText, x + (tabWidth / 2), tabY + (tabHeight / 2));
        });
        
        // Prepare options with formatted values for MenuRenderer
        const formattedOptions = this.options.map(option => {
            let value = '';
            // Use pendingSettings for display
            const settings = this.pendingSettings;
            
            // Check if option should be disabled
            let disabled = false;
            if (option.disabledWhen === 'controller') {
                // Disable when a controller is connected (analog controls speed)
                disabled = this.game.inputManager?.gamepadState?.connected || false;
            } else if (option.disabledWhen === 'noController') {
                // Disable when NO controller is connected
                disabled = !(this.game.inputManager?.gamepadState?.connected || false);
            }
            
            if (option.type === 'slider') {
                const suffix = option.suffix || '%';
                value = `< ${settings[option.key]}${suffix} >`;
            } else if (option.type === 'toggle') {
                const onText = this.game.t('settings.values.on');
                const offText = this.game.t('settings.values.off');
                value = `< ${settings[option.key] ? onText : offText} >`;
            } else if (option.type === 'select') {
                // Only show arrows if there are multiple options
                if (option.values && option.values.length > 1) {
                    // Support valueMap for display vs internal values
                    let displayValue = settings[option.key];
                    if (option.valueMap) {
                        // Reverse lookup: find display value from internal value
                        const reverseMap = Object.entries(option.valueMap).find(([display, internal]) => internal === displayValue);
                        displayValue = reverseMap ? reverseMap[0] : displayValue;
                    }
                    // Translate display value if valueKeys is provided
                    if (option.valueKeys && option.valueKeys[displayValue]) {
                        displayValue = this.game.t(option.valueKeys[displayValue]);
                    }
                    value = `< ${displayValue} >`;
                } else {
                    value = `${settings[option.key]}`;
                }
            } else if (option.key === 'controlDevice') {
                // Translate the device value using valueKeys if available
                let deviceDisplay = this.controlDevice;
                if (option.valueKeys && option.valueKeys[this.controlDevice]) {
                    deviceDisplay = this.game.t(option.valueKeys[this.controlDevice]);
                }
                value = `< ${deviceDisplay} >`;
            } else if (option.type === 'binding') {
                if (this.rebindingAction === option.key) {
                    value = this.game.t('settings.messages.pressKey');
                } else {
                    value = option.value;
                }
            } else if (option.type === 'info') {
                value = option.value;
            }
            
            // Resolve translated name from nameKey
            const displayName = option.nameKey ? this.game.t(option.nameKey) : option.name;
            
            // Build result with disabled state and tooltip
            const result = {
                name: displayName,
                value: value,
                disabled: disabled
            };
            
            // Add tooltip for disabled options (only for controller-connected case)
            if (disabled && option.disabledWhen === 'controller') {
                result.name = displayName + ` (${this.game.t('settings.messages.controller')})`;
            }
            // Note: noController disabled options don't need a suffix - it's obvious
            
            return result;
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
        
        // Layout with proper container for buttons and instructions
        // All measurements in canvas ratios
        const panelBottomY = 0.76;           // Panel ends here
        const footerTopY = panelBottomY;     // Footer container starts at panel bottom
        const footerBottomY = 0.98;          // Footer container ends near screen bottom
        const footerHeight = footerBottomY - footerTopY; // Total footer height
        
        // Footer contains: [margin] [buttons] [margin] [instructions] [margin]
        // With equal top/bottom margins around buttons, and smaller margin to instructions
        const btnHeightRatio = 0.055;
        const instructionHeightRatio = 0.025; // Approximate text height
        const marginRatio = (footerHeight - btnHeightRatio - instructionHeightRatio) / 3; // Divide remaining space into 3 equal margins
        
        // Button center position
        const buttonCenterY = footerTopY + marginRatio + (btnHeightRatio / 2);
        const buttonY = canvasHeight * buttonCenterY;
        
        // Instructions center position
        const instructionsCenterY = buttonCenterY + (btnHeightRatio / 2) + marginRatio + (instructionHeightRatio / 2);
        
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
            },
            panelBottomY // Pass explicit panel bottom position
        );
        
        // Draw Back and Reset buttons at the bottom (side by side)
        const btnHeight = canvasHeight * btnHeightRatio;
        const btnGap = 20;
        const btnPadding = 30; // Horizontal padding inside buttons
        
        const isBackSelected = this.selectedOption === this.options.length;
        const isResetSelected = this.selectedOption === this.options.length + 1;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use DesignSystem to draw buttons for consistent vertical text centering
        const ds = menuRenderer.ds;
        const backText = this.game.t('menu.common.back');
        const resetText = this.game.t('settings.buttons.restoreDefaults');
        
        // Measure text widths to dynamically size buttons
        ctx.font = `bold ${sizes.menu}px 'Cinzel', serif`;
        const backTextWidth = ctx.measureText(backText).width;
        const resetTextWidth = ctx.measureText(resetText).width;
        const backBtnWidth = Math.max(100, backTextWidth + btnPadding);
        const resetBtnWidth = Math.max(100, resetTextWidth + btnPadding);
        
        const totalButtonsWidth = backBtnWidth + resetBtnWidth + btnGap;
        const buttonsStartX = (canvasWidth - totalButtonsWidth) / 2;
        
        if (ds) {
            // Use DesignSystem's drawButton which has proper font centering
            ds.drawButton(ctx, buttonsStartX + backBtnWidth / 2, buttonY, backBtnWidth, btnHeight, backText, isBackSelected, false);
            ds.drawButton(ctx, buttonsStartX + backBtnWidth + btnGap + resetBtnWidth / 2, buttonY, resetBtnWidth, btnHeight, resetText, isResetSelected, false);
        } else {
            // Legacy fallback with vertical offset correction for Cinzel font
            const fontVerticalOffset = sizes.menu * 0.08; // Cinzel needs ~8% downward adjustment
            
            const drawButton = (text, x, width, isSelected) => {
                const btnX = x;
                const btnY = buttonY - btnHeight / 2;
                
                if (isSelected) {
                    // Selected Button (Glass style)
                    const gradient = ctx.createLinearGradient(btnX, btnY, btnX + width, btnY + btnHeight);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                    gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(btnX, btnY, width, btnHeight);
                    
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(btnX, btnY, width, btnHeight);
                    
                    // Corner accents
                    const cornerSize = 4;
                    ctx.fillStyle = '#4a9eff';
                    ctx.fillRect(btnX, btnY, cornerSize, 2);
                    ctx.fillRect(btnX, btnY, 2, cornerSize);
                    ctx.fillRect(btnX + width - cornerSize, btnY, cornerSize, 2);
                    ctx.fillRect(btnX + width - 2, btnY, 2, cornerSize);
                    ctx.fillRect(btnX, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX, btnY + btnHeight - cornerSize, 2, cornerSize);
                    ctx.fillRect(btnX + width - cornerSize, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX + width - 2, btnY + btnHeight - cornerSize, 2, cornerSize);
                    
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${sizes.menu}px 'Cinzel', serif`;
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                    ctx.fillText(text, btnX + width / 2, buttonY + fontVerticalOffset);
                    ctx.shadowBlur = 0;
                } else {
                    // Unselected Button
                    ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
                    ctx.fillRect(btnX, btnY, width, btnHeight);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(btnX, btnY, width, btnHeight);
                    
                    ctx.fillStyle = '#888';
                    ctx.font = `${sizes.menu}px 'Cinzel', serif`;
                    ctx.shadowBlur = 0;
                    ctx.fillText(text, btnX + width / 2, buttonY + fontVerticalOffset);
                }
            };
            
            drawButton(backText, buttonsStartX, backBtnWidth, isBackSelected);
            drawButton(resetText, buttonsStartX + backBtnWidth + btnGap, resetBtnWidth, isResetSelected);
        }
        
        ctx.shadowBlur = 0;
        
        // Draw instructions using calculated position (localized)
        let instructions = this.game.inputManager.isMobile 
            ? this.game.t('instructions.settingsMobile')
            : this.game.t('instructions.settingsMenu');
            
        if (this.rebindingAction) {
            instructions = this.game.t('instructions.rebinding');
        }
        
        menuRenderer.drawInstruction(ctx, instructions, canvasWidth, canvasHeight, instructionsCenterY);

        // Draw Exit Modal
        if (this.showExitModal) {
            const warning = this.restartRequired ? this.game.t('settings.messages.restartRequired') : null;
            menuRenderer.drawModal(
                ctx,
                this.game.t('settings.unsavedChanges.title'),
                this.game.t('settings.unsavedChanges.message'),
                [this.game.t('menu.common.save'), this.game.t('settings.unsavedChanges.discard'), this.game.t('menu.common.cancel')],
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
                this.game.t('settings.reset.title'),
                this.game.t('settings.reset.message'),
                [this.game.t('settings.reset.all'), this.currentCategory, this.game.t('menu.common.cancel')],
                this.resetModalOption,
                canvasWidth,
                canvasHeight,
                this.game.t('settings.reset.warning')
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
            this.game.audioManager?.playEffect('cancel.mp3');
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
            this.game.audioManager?.playEffect('click.mp3');
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
        
        // Render game world behind inventory (PLAYING is on stack)
        if (this.stateManager.isStateInStack('PLAYING')) {
            this.game.renderGameplay(ctx);
        }
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.85);
        
        // Draw title (localized)
        menuRenderer.drawTitle(ctx, this.game.t('gameplay.inventory.title'), canvasWidth, canvasHeight, 0.15);
        
        if (this.items.length === 0) {
            menuRenderer.drawInstruction(ctx, this.game.t('gameplay.inventory.empty'), canvasWidth, canvasHeight, 0.5);
            menuRenderer.drawHint(ctx, this.game.t('hints.pressEscToClose'), canvasWidth, canvasHeight);
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
            }
            
            // Use rarity color for item name
            const ds = this.stateManager.designSystem;
            ctx.fillStyle = ds ? ds.colors.getRarityColor(item.rarity) : '#ffffff';
            
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
            const ds = this.stateManager.designSystem;
            ctx.fillStyle = ds ? ds.colors.getRarityColor(selectedItem.rarity) : '#aaa';
            ctx.font = 'italic 18px "Lato", sans-serif';
            const rarityText = (selectedItem.rarity || 'common').charAt(0).toUpperCase() + (selectedItem.rarity || 'common').slice(1);
            const typeText = (selectedItem.type || 'item').toLowerCase();
            ctx.fillText(`${rarityText} ${typeText}`, detailsX + detailsWidth / 2, detailsY + 80);
            
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

/**
 * Dialogue State - Handles NPC conversations with script support
 * Supports HTML-styled text, choices, and script commands
 */
class DialogueState extends GameState {
    enter(data = {}) {
        this.npc = data.npc || null;
        this.message = data.message || null;
        
        // Stop player movement when entering dialogue
        if (this.game.player) {
            this.game.player.velocityX = 0;
            this.game.player.velocityY = 0;
        }
        
        // Ignore input on first frame (so the key that initiated dialogue doesn't skip the message)
        this.ignoreFirstInput = true;
        
        // Current message being displayed
        this.currentMessage = '';
        this.displayedChars = 0;
        
        // Message speed based on settings (chars per second)
        const speedSettings = { slow: 20, medium: 35, fast: 60 };
        const speedKey = this.game.settings?.messageSpeed || 'medium';
        this.charRevealSpeed = speedSettings[speedKey] || 35;
        
        this.lastCharTime = 0;
        this.isTyping = true;
        
        // Choice handling
        this.choices = [];
        this.selectedChoice = 0;
        this.isShowingChoices = false;
        this.choiceResolver = null;
        
        // Message resolver (for script engine)
        this.messageResolver = null;
        
        // Flag to completely hide the dialogue box (used when opening shop)
        this.isHidden = false;
        
        // Script execution - only initialize if not resuming from a pushed state (like shop)
        if (!data.isResumingFromPause) {
            this.scriptEngine = null;
            this.isRunningScript = false;
            
            // Start script if NPC has one
            if (this.npc?.script) {
                this.startScript(this.npc.script);
            } else if (this.npc?.messages?.length > 0) {
                // Fall back to simple messages if no script
                this.showMessage(this.npc.messages[this.npc.currentMessageIndex] || this.npc.messages[0]);
            } else if (this.message) {
                this.showMessage(this.message);
            }
        } else {
            console.log('[DialogueState] Resuming from pause - NOT restarting script');
        }
    }
    
    exit() {
        console.log('[DialogueState] EXIT called');
        // Stop any running script
        if (this.scriptEngine) {
            this.scriptEngine.stop();
        }
        
        // Reset NPC dialogue state
        if (this.npc) {
            this.npc.resetDialogue?.();
        }
        
        // Consume all interaction keys to prevent immediate re-triggering of NPC dialogue
        const inputManager = this.game.inputManager;
        if (inputManager) {
            console.log('[DialogueState] Consuming keys...');
            inputManager.consumePress('interact');
            inputManager.consumePress('confirm');
            inputManager.consumePress('cancel');
        }
    }
    
    /**
     * Start executing an NPC script
     */
    async startScript(scriptText) {
        this.isRunningScript = true;
        
        // Create script engine if needed
        if (!this.scriptEngine) {
            this.scriptEngine = new ScriptEngine(this.game);
        }
        
        // Set up callbacks
        this.scriptEngine.onMessage = (text, npc) => {
            return new Promise((resolve) => {
                this.messageResolver = resolve;
                this.showMessage(text);
            });
        };
        
        this.scriptEngine.onChoice = (choices, npc) => {
            return new Promise((resolve) => {
                this.choiceResolver = resolve;
                this.showChoices(choices);
            });
        };
        
        this.scriptEngine.onComplete = () => {
            this.isRunningScript = false;
            this.stateManager.popState();
        };
        
        // Run the script
        await this.scriptEngine.run(scriptText, this.npc);
    }
    
    /**
     * Show a message in the dialogue box
     */
    showMessage(text) {
        this.currentMessage = text;
        this.displayedChars = 0;
        this.isTyping = true;
        this.lastCharTime = Date.now();
        this.isShowingChoices = false;
        
        // Play speech bubble pop sound
        this.game.audioManager?.playEffect('speech-bubble.mp3');
    }
    
    /**
     * Show choices to the player
     */
    showChoices(choices) {
        this.choices = choices;
        this.selectedChoice = 0;
        this.isShowingChoices = true;
        this.isTyping = false;
        
        // Play sound when choices appear
        this.game.audioManager?.playEffect('speech-bubble.mp3');
    }
    
    update(deltaTime) {
        // Typewriter effect
        if (this.isTyping && this.displayedChars < this.getPlainTextLength(this.currentMessage)) {
            const now = Date.now();
            const elapsed = now - this.lastCharTime;
            // Cap elapsed time to prevent instant reveal on first frame
            const cappedElapsed = Math.min(elapsed, 100); // Max 100ms worth of chars
            const charsToAdd = Math.floor(cappedElapsed / (1000 / this.charRevealSpeed));
            
            if (charsToAdd > 0) {
                this.displayedChars = Math.min(
                    this.displayedChars + charsToAdd,
                    this.getPlainTextLength(this.currentMessage)
                );
                this.lastCharTime = now;
            }
            
            // Check if done typing
            if (this.displayedChars >= this.getPlainTextLength(this.currentMessage)) {
                this.isTyping = false;
            }
        }
    }
    
    /**
     * Get plain text length (excluding HTML tags)
     */
    getPlainTextLength(html) {
        if (!html) return 0;
        return html.replace(/<[^>]*>/g, '').length;
    }
    
    /**
     * Get partially revealed text with HTML support
     */
    getDisplayedText() {
        if (!this.currentMessage) return '';
        
        const fullText = this.currentMessage;
        let visibleChars = 0;
        let result = '';
        let inTag = false;
        
        for (let i = 0; i < fullText.length; i++) {
            const char = fullText[i];
            
            if (char === '<') {
                inTag = true;
                result += char;
            } else if (char === '>') {
                inTag = false;
                result += char;
            } else if (inTag) {
                result += char;
            } else {
                if (visibleChars < this.displayedChars) {
                    result += char;
                    visibleChars++;
                }
            }
        }
        
        return result;
    }
    
    handleInput(inputManager) {
        // Ignore input on first frame (the key that initiated dialogue shouldn't skip message)
        if (this.ignoreFirstInput) {
            this.ignoreFirstInput = false;
            return;
        }
        
        // Confirm/advance (Enter, Space, E, or gamepad A)
        // If typing: complete text. If complete: advance to next message.
        if (inputManager.isJustPressed('confirm') || inputManager.isJustPressed('interact')) {
            
            if (this.isShowingChoices) {
                // Select choice
                if (this.choiceResolver) {
                    this.game.audioManager?.playEffect('speech-yes.mp3');
                    // Consume the key press so it doesn't trigger the next state
                    inputManager.consumePress('confirm');
                    inputManager.consumePress('interact');
                    this.choiceResolver(this.selectedChoice);
                    this.choiceResolver = null;
                    this.isShowingChoices = false;
                }
            } else if (this.isTyping) {
                // Skip to end of message (don't advance yet)
                this.displayedChars = this.getPlainTextLength(this.currentMessage);
                this.isTyping = false;
            } else if (this.messageResolver) {
                // Continue to next script command - consume key press to prevent it triggering next state
                inputManager.consumePress('confirm');
                inputManager.consumePress('interact');
                this.messageResolver();
                this.messageResolver = null;
            } else if (!this.isRunningScript) {
                // No script, advance simple dialogue
                if (this.npc && this.npc.nextMessage) {
                    const nextMsg = this.npc.nextMessage();
                    if (nextMsg) {
                        this.showMessage(nextMsg);
                    } else {
                        this.stateManager.popState();
                    }
                } else {
                    this.stateManager.popState();
                }
            }
            return;
        }
        
        // Cancel (Escape, B button) - instantly advance to next message
        if (inputManager.isJustPressed('cancel')) {
            if (this.isShowingChoices) {
                // Do nothing - player must select a choice
                return;
            }
            
            // Complete text if typing
            if (this.isTyping) {
                this.displayedChars = this.getPlainTextLength(this.currentMessage);
                this.isTyping = false;
            }
            
            // Immediately advance to next message/action
            if (this.messageResolver) {
                this.messageResolver();
                this.messageResolver = null;
            } else if (!this.isRunningScript) {
                if (this.npc && this.npc.nextMessage) {
                    const nextMsg = this.npc.nextMessage();
                    if (nextMsg) {
                        this.showMessage(nextMsg);
                    } else {
                        this.stateManager.popState();
                    }
                } else {
                    this.stateManager.popState();
                }
            }
            return;
        }
        
        // Choice navigation
        if (this.isShowingChoices) {
            if (inputManager.isJustPressed('up')) {
                this.selectedChoice = Math.max(0, this.selectedChoice - 1);
                this.game.audioManager?.playEffect('menu-move.mp3');
            }
            if (inputManager.isJustPressed('down')) {
                this.selectedChoice = Math.min(this.choices.length - 1, this.selectedChoice + 1);
                this.game.audioManager?.playEffect('menu-move.mp3');
            }
        }
    }
    
    render(ctx) {
        // Don't render anything if dialogue is hidden or no message to show
        if (this.isHidden) return;
        if (!this.currentMessage && !this.isShowingChoices) return;
        
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        // Light overlay to focus on dialogue
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Get NPC screen position for chat bubble
        let bubbleX = canvasWidth / 2;
        let bubbleY = canvasHeight / 3;
        
        if (this.npc && this.game.camera) {
            const camera = this.game.camera;
            const zoom = camera.zoom || 1;
            const worldScale = this.game.resolutionScale || 1;
            
            // Get NPC world position (scaled for resolution)
            const worldX = this.npc.x * worldScale;
            const worldY = this.npc.y * worldScale;
            
            // Calculate sprite dimensions
            const finalScale = (this.npc.scale || 1) * worldScale;
            const spriteHeight = (this.npc.spriteHeight || 64) * finalScale;
            
            // Calculate where the TOP of the sprite is
            let topWorldX = worldX;
            let topWorldY = worldY - spriteHeight / 2;
            
            const webglRenderer = this.game.renderSystem?.webglRenderer;
            
            // In billboard mode with perspective, the sprite is scaled and shifted
            if (webglRenderer && webglRenderer.perspectiveStrength > 0 && webglRenderer.viewMatrix) {
                const vm = webglRenderer.viewMatrix;
                const pm = webglRenderer.projectionMatrix;
                const zoomFactor = vm[0];
                
                // Sprite base position (bottom center)
                const baseX = worldX;
                const baseY = worldY + spriteHeight / 2;
                
                // Transform base to clip space
                const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
                const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
                const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
                const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
                
                // Calculate perspective factor
                const depth = (clipY + 1.0) * 0.5;
                const perspectiveW = 1.0 + (depth * webglRenderer.perspectiveStrength);
                const scale = 1.0 / perspectiveW;
                
                // Scaled sprite height
                const scaledSpriteHeight = spriteHeight * scale;
                
                // Calculate base position delta
                const screenX_noPerspective = (clipX + 1.0) * 0.5 * canvasWidth;
                const screenY_noPerspective = (1.0 - clipY) * 0.5 * canvasHeight;
                const clipX_persp = clipX / perspectiveW;
                const clipY_persp = clipY / perspectiveW;
                const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * canvasWidth;
                const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * canvasHeight;
                
                const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
                const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
                const deltaWorldX = deltaScreenX / zoomFactor;
                const deltaWorldY = deltaScreenY / zoomFactor;
                
                // Corrected base position
                const correctedBaseX = baseX + deltaWorldX;
                const correctedBaseY = baseY + deltaWorldY;
                
                // Top of the scaled sprite
                topWorldX = correctedBaseX;
                topWorldY = correctedBaseY - scaledSpriteHeight;
            }
            
            // Convert to screen coordinates
            bubbleX = (topWorldX - camera.x) * zoom + canvasWidth / 2 * (1 - zoom);
            bubbleY = (topWorldY - camera.y) * zoom + canvasHeight / 2 * (1 - zoom);
            
            // Position bubble above sprite top
            bubbleY -= 20;
        }
        
        // Calculate bubble size based on FULL content (not partial display)
        const padding = 20;
        const maxBubbleWidth = Math.min(400, canvasWidth * 0.7);
        const minBubbleWidth = 150;
        
        // Measure FULL text to determine bubble size (so it doesn't grow as text appears)
        ctx.font = '15px Arial';
        const fullText = this.currentMessage || '';
        const fullPlainText = fullText.replace(/<[^>]*>/g, '');
        
        // Word wrap to calculate height using full text
        const words = fullPlainText.split(' ');
        let lines = [];
        let currentLine = '';
        const lineHeight = 22;
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxBubbleWidth - padding * 2 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        if (lines.length === 0) lines.push('');
        
        // Add lines for choices
        let choiceLines = 0;
        if (this.isShowingChoices && this.choices.length > 0) {
            choiceLines = this.choices.length + 1; // +1 for spacing
        }
        
        const textHeight = (lines.length + choiceLines) * lineHeight;
        const bubbleWidth = Math.max(minBubbleWidth, Math.min(maxBubbleWidth, ctx.measureText(lines[0] || '').width + padding * 2 + 40));
        const bubbleHeight = Math.max(60, textHeight + padding * 2 + 30); // +30 for name
        
        // Clamp bubble position to screen
        bubbleX = Math.max(bubbleWidth / 2 + 10, Math.min(canvasWidth - bubbleWidth / 2 - 10, bubbleX));
        bubbleY = Math.max(bubbleHeight + 30, Math.min(canvasHeight - 60, bubbleY));
        
        const boxX = bubbleX - bubbleWidth / 2;
        const boxY = bubbleY - bubbleHeight;
        const cornerRadius = 16;
        
        // Draw chat bubble shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.roundRect(ctx, boxX + 4, boxY + 4, bubbleWidth, bubbleHeight, cornerRadius);
        ctx.fill();
        
        // Draw chat bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
        this.roundRect(ctx, boxX, boxY, bubbleWidth, bubbleHeight, cornerRadius);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, boxX, boxY, bubbleWidth, bubbleHeight, cornerRadius);
        ctx.stroke();
        
        // Chat bubble pointer (triangle pointing down to NPC)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
        ctx.beginPath();
        ctx.moveTo(bubbleX - 12, boxY + bubbleHeight - 1);
        ctx.lineTo(bubbleX + 12, boxY + bubbleHeight - 1);
        ctx.lineTo(bubbleX, boxY + bubbleHeight + 18);
        ctx.closePath();
        ctx.fill();
        
        // Pointer border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(bubbleX - 12, boxY + bubbleHeight);
        ctx.lineTo(bubbleX, boxY + bubbleHeight + 18);
        ctx.lineTo(bubbleX + 12, boxY + bubbleHeight);
        ctx.stroke();
        
        // NPC name (if available)
        let textStartY = boxY + padding;
        if (this.npc?.name) {
            ctx.fillStyle = '#4a7dbd';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(this.npc.name, boxX + padding, textStartY);
            textStartY += 24;
        }
        
        // Message text with HTML rendering
        const textX = boxX + padding;
        const maxWidth = bubbleWidth - padding * 2;
        
        // Get the partially revealed text for display (typewriter effect)
        const displayText = this.getDisplayedText();
        this.renderHtmlText(ctx, displayText, textX, textStartY, maxWidth, '#333333');
        
        // Choices (if showing)
        if (this.isShowingChoices && this.choices.length > 0) {
            const choiceStartY = textStartY + lines.length * lineHeight + 10;
            const choiceHeight = 26;
            
            this.choices.forEach((choice, index) => {
                const isSelected = index === this.selectedChoice;
                const choiceY = choiceStartY + index * choiceHeight;
                
                if (isSelected) {
                    ctx.fillStyle = 'rgba(74, 125, 189, 0.2)';
                    this.roundRect(ctx, textX - 5, choiceY - 3, maxWidth + 10, choiceHeight, 6);
                    ctx.fill();
                }
                
                ctx.fillStyle = isSelected ? '#2a5d9d' : '#666666';
                ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText((isSelected ? '▸ ' : '   ') + choice, textX, choiceY);
            });
        }
        
        // Continue prompt (blinking) - inside bubble
        if (!this.isTyping && !this.isShowingChoices) {
            const blink = Math.floor(Date.now() / 500) % 2 === 0;
            if (blink) {
                ctx.fillStyle = '#999999';
                ctx.font = '12px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText('▼', boxX + bubbleWidth - padding, boxY + bubbleHeight - 10);
            }
        }
        
        // Controls hint at bottom of screen
        const hintText = this.game.inputManager?.isMobile ? 'Tap to continue' : 'Enter: Continue | ESC: Close';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(hintText, canvasWidth / 2, canvasHeight - 12);
    }
    
    /**
     * Render text with simple HTML tag support
     * Supports: <b>, <i>, <color=#hex>
     */
    renderHtmlText(ctx, html, x, y, maxWidth, defaultColor = '#ffffff') {
        if (!html) return;
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Parse and render with style tags
        let currentX = x;
        let currentY = y;
        let isBold = false;
        let isItalic = false;
        let currentColor = defaultColor;
        const lineHeight = 22;
        const fontSize = 15;
        
        // Split into tokens (text and tags)
        const tokens = html.split(/(<[^>]+>)/g).filter(t => t);
        
        for (const token of tokens) {
            if (token.startsWith('<')) {
                // Handle tag
                const tag = token.toLowerCase();
                if (tag === '<b>') isBold = true;
                else if (tag === '</b>') isBold = false;
                else if (tag === '<i>') isItalic = true;
                else if (tag === '</i>') isItalic = false;
                else if (tag.startsWith('<color=')) {
                    const match = tag.match(/<color=([^>]+)>/);
                    if (match) currentColor = match[1];
                } else if (tag === '</color>') {
                    currentColor = defaultColor;
                }
            } else {
                // Render text
                let fontStyle = '';
                if (isBold) fontStyle += 'bold ';
                if (isItalic) fontStyle += 'italic ';
                ctx.font = `${fontStyle}${fontSize}px Arial`;
                ctx.fillStyle = currentColor;
                
                // Word wrap
                const words = token.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const word = words[i] + (i < words.length - 1 ? ' ' : '');
                    const wordWidth = ctx.measureText(word).width;
                    
                    if (currentX + wordWidth > x + maxWidth && currentX > x) {
                        currentX = x;
                        currentY += lineHeight;
                    }
                    
                    ctx.fillText(word, currentX, currentY);
                    currentX += wordWidth;
                }
            }
        }
    }
    
    /**
     * Draw rounded rectangle
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

/**
 * ShopState - Handles buying and selling items from NPCs
 */
class ShopState extends GameState {
    enter(data = {}) {
        this.shopName = data.shopName || 'Shop';
        this.shopItems = data.items || []; // Array of {itemId, price, stock}
        this.npc = data.npc || null;
        
        // UI State
        this.selectedTab = 0; // 0 = Buy, 1 = Sell
        this.selectedOption = 0;
        this.scrollOffset = 0;
        this.maxVisibleItems = 6;
        this.inputCooldown = 0.3; // Initial cooldown to prevent accidental close from previous input
        this.waitingForKeyRelease = true; // Wait for all keys to be released before accepting input
        
        // Quantity selector
        this.isSelectingQuantity = false;
        this.selectedQuantity = 1;
        this.maxQuantity = 1;
        
        // Icon cache
        this.iconCache = {};
        
        // Build shop inventory with item details
        this.buildShopInventory();
        
        // Build player sellable items
        this.buildSellableItems();
        
        // Play shop open sound
        this.game.audioManager?.playEffect('menu-open.mp3');
        
        console.log(`[ShopState] ENTER - Opened shop: ${this.shopName} with ${this.buyItems.length} items`);
        console.log(`[ShopState] inputCooldown=${this.inputCooldown}, waitingForKeyRelease=${this.waitingForKeyRelease}`);
    }
    
    buildShopInventory() {
        this.buyItems = [];
        for (const shopItem of this.shopItems) {
            const itemType = this.game.itemManager?.getItemType(shopItem.itemId);
            if (itemType) {
                this.buyItems.push({
                    ...itemType,
                    price: shopItem.price ?? itemType.value,
                    stock: shopItem.stock ?? -1 // -1 = unlimited
                });
            }
        }
    }
    
    buildSellableItems() {
        this.sellItems = [];
        const playerItems = this.game.inventoryManager?.getAllSlots() || [];
        for (const item of playerItems) {
            // Calculate sell price (usually half buy price)
            const sellPrice = Math.floor((item.value || 0) * 0.5);
            if (sellPrice > 0) {
                this.sellItems.push({
                    ...item,
                    sellPrice
                });
            }
        }
    }
    
    getCurrentList() {
        return this.selectedTab === 0 ? this.buyItems : this.sellItems;
    }
    
    getPlayerGold() {
        return this.game.player?.gold || 0;
    }
    
    exit() {
        // Play close sound
        this.game.audioManager?.playEffect('menu-close.mp3');
    }
    
    update(deltaTime) {
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }
    }
    
    handleInput(inputManager) {
        const confirmPressed = inputManager.isPressed('confirm');
        const interactPressed = inputManager.isPressed('interact');
        const cancelPressed = inputManager.isPressed('cancel');
        
        if (this.inputCooldown > 0) {
            console.log(`[ShopState] handleInput - blocked by cooldown: ${this.inputCooldown.toFixed(3)}`);
            return;
        }
        
        // Wait for all keys to be released before accepting any input
        // This prevents the confirm key from dialogue from immediately closing the shop
        if (this.waitingForKeyRelease) {
            console.log(`[ShopState] waitingForKeyRelease - confirm=${confirmPressed}, interact=${interactPressed}, cancel=${cancelPressed}`);
            if (!confirmPressed && !interactPressed && !cancelPressed && !inputManager.isPressed('menu')) {
                console.log('[ShopState] All keys released, accepting input now');
                this.waitingForKeyRelease = false;
            }
            return;
        }
        
        // Quantity selection mode
        if (this.isSelectingQuantity) {
            this.handleQuantityInput(inputManager);
            return;
        }
        
        // Close shop
        if (inputManager.isJustPressed('cancel') || inputManager.isJustPressed('menu')) {
            console.log('[ShopState] CLOSING shop via cancel/menu');
            this.game.audioManager?.playEffect('cancel.mp3');
            this.stateManager.popState();
            return;
        }
        
        // Tab switching (left/right)
        if (inputManager.isJustPressed('left') || inputManager.isJustPressed('right')) {
            this.selectedTab = this.selectedTab === 0 ? 1 : 0;
            this.selectedOption = 0;
            this.scrollOffset = 0;
            if (this.selectedTab === 1) {
                this.buildSellableItems(); // Refresh sell list
            }
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
            return;
        }
        
        const items = this.getCurrentList();
        if (items.length === 0) return;
        
        // Navigation
        if (inputManager.isJustPressed('up')) {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.08;
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedOption = Math.min(items.length - 1, this.selectedOption + 1);
            this.updateScrollOffset();
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.08;
        }
        
        // Confirm (buy/sell)
        if (inputManager.isJustPressed('confirm')) {
            this.game.audioManager?.playEffect('click.mp3');
            this.startTransaction();
        }
    }
    
    handleQuantityInput(inputManager) {
        if (inputManager.isJustPressed('cancel')) {
            this.isSelectingQuantity = false;
            this.game.audioManager?.playEffect('cancel.mp3');
            return;
        }
        
        if (inputManager.isJustPressed('up')) {
            this.selectedQuantity = Math.min(this.maxQuantity, this.selectedQuantity + 10);
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('down')) {
            this.selectedQuantity = Math.max(1, this.selectedQuantity - 10);
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('left')) {
            this.selectedQuantity = Math.max(1, this.selectedQuantity - 1);
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('right')) {
            this.selectedQuantity = Math.min(this.maxQuantity, this.selectedQuantity + 1);
            this.game.audioManager?.playEffect('menu-navigation.mp3');
        }
        
        if (inputManager.isJustPressed('confirm')) {
            this.game.audioManager?.playEffect('click.mp3');
            this.confirmTransaction();
        }
    }
    
    startTransaction() {
        const items = this.getCurrentList();
        const item = items[this.selectedOption];
        if (!item) return;
        
        if (this.selectedTab === 0) {
            // Buying
            const price = item.price;
            const playerGold = this.getPlayerGold();
            const maxAffordable = Math.floor(playerGold / price);
            const maxStock = item.stock === -1 ? 99 : item.stock;
            this.maxQuantity = Math.min(maxAffordable, maxStock, 99);
            
            if (this.maxQuantity <= 0) {
                this.game.audioManager?.playEffect('error.mp3');
                return;
            }
        } else {
            // Selling
            this.maxQuantity = item.quantity;
        }
        
        this.selectedQuantity = 1;
        this.isSelectingQuantity = true;
        this.game.audioManager?.playEffect('menu-select.mp3');
    }
    
    confirmTransaction() {
        const items = this.getCurrentList();
        const item = items[this.selectedOption];
        if (!item) return;
        
        const quantity = this.selectedQuantity;
        
        if (this.selectedTab === 0) {
            // Buy
            const totalCost = item.price * quantity;
            const playerGold = this.getPlayerGold();
            
            if (playerGold >= totalCost) {
                // Remove gold
                this.game.player.spendGold(totalCost);
                // Add item
                this.game.inventoryManager.addItem(item.id, quantity);
                // Reduce stock if not unlimited
                if (item.stock !== -1) {
                    item.stock -= quantity;
                    if (item.stock <= 0) {
                        this.buyItems.splice(this.selectedOption, 1);
                        this.selectedOption = Math.min(this.selectedOption, this.buyItems.length - 1);
                    }
                }
                this.game.audioManager?.playEffect('coin.mp3');
                console.log(`[Shop] Bought ${quantity}x ${item.name} for ${totalCost} gold`);
            } else {
                this.game.audioManager?.playEffect('error.mp3');
            }
        } else {
            // Sell
            const totalValue = item.sellPrice * quantity;
            // Remove item from player
            this.game.inventoryManager.removeItem(item.id, quantity);
            // Add gold
            this.game.player.addGold(totalValue);
            // Refresh sell list
            this.buildSellableItems();
            this.selectedOption = Math.min(this.selectedOption, Math.max(0, this.sellItems.length - 1));
            this.game.audioManager?.playEffect('coin.mp3');
            console.log(`[Shop] Sold ${quantity}x ${item.name} for ${totalValue} gold`);
        }
        
        this.isSelectingQuantity = false;
        this.inputCooldown = 0.15;
    }
    
    updateScrollOffset() {
        const items = this.getCurrentList();
        if (items.length > this.maxVisibleItems) {
            if (this.selectedOption < this.scrollOffset) {
                this.scrollOffset = this.selectedOption;
            } else if (this.selectedOption >= this.scrollOffset + this.maxVisibleItems) {
                this.scrollOffset = this.selectedOption - this.maxVisibleItems + 1;
            }
        }
    }
    
    render(ctx) {
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const menuRenderer = this.stateManager.menuRenderer;
        const ds = window.ds;
        
        // Ensure design system has current dimensions
        if (ds) ds.setDimensions(canvasWidth, canvasHeight);
        
        // Render game world behind shop
        if (this.stateManager.isStateInStack('PLAYING')) {
            this.game.renderGameplay(ctx);
        }
        
        // Draw overlay
        menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.85);
        
        // Draw shop title using design system
        menuRenderer.drawTitle(ctx, this.shopName, canvasWidth, canvasHeight, 0.08);
        
        // Draw gold display
        const playerGold = this.getPlayerGold();
        ctx.fillStyle = ds ? ds.colors.warning : '#ffd700';
        ctx.font = ds ? ds.font('md', 'bold', 'body') : 'bold 22px "Lato", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`💰 ${playerGold}`, canvasWidth - (ds ? ds.spacing(8) : 30), canvasHeight * 0.08);
        
        // Draw tabs
        this.renderTabs(ctx, canvasWidth, canvasHeight, menuRenderer, ds);
        
        // Draw item list
        this.renderItemList(ctx, canvasWidth, canvasHeight, menuRenderer, ds);
        
        // Draw item details
        this.renderItemDetails(ctx, canvasWidth, canvasHeight, menuRenderer, ds);
        
        // Draw quantity selector if active
        if (this.isSelectingQuantity) {
            this.renderQuantitySelector(ctx, canvasWidth, canvasHeight, menuRenderer, ds);
        }
        
        // Draw hints
        menuRenderer.drawHint(ctx, this.game.t('shop.hints'), canvasWidth, canvasHeight);
    }
    
    renderTabs(ctx, canvasWidth, canvasHeight, menuRenderer, ds) {
        const tabY = canvasHeight * 0.14;
        const tabWidth = ds ? ds.width(12) : 120;
        const tabHeight = ds ? ds.height(5) : 35;
        const tabs = [this.game.t('shop.tabs.buy'), this.game.t('shop.tabs.sell')];
        const gap = ds ? ds.spacing(2) : 8;
        
        tabs.forEach((tab, index) => {
            const tabX = canvasWidth / 2 - tabWidth - gap / 2 + (index * (tabWidth + gap));
            const isSelected = this.selectedTab === index;
            
            if (isSelected) {
                // Selected tab - use design system highlight
                if (ds) {
                    ds.drawSelectionHighlight(ctx, tabX, tabY, tabWidth, tabHeight);
                } else {
                    ctx.fillStyle = 'rgba(74, 158, 255, 0.2)';
                    ctx.fillRect(tabX, tabY, tabWidth, tabHeight);
                }
                
                // Border
                ctx.strokeStyle = ds ? ds.colors.primary : '#4a9eff';
                ctx.lineWidth = 2;
                ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);
            } else {
                // Unselected tab
                ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.background.panel, 0.6) : 'rgba(30, 30, 40, 0.6)';
                ctx.fillRect(tabX, tabY, tabWidth, tabHeight);
                
                ctx.strokeStyle = ds ? ds.colors.alpha(ds.colors.text.muted, 0.3) : 'rgba(136, 136, 136, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);
            }
            
            // Tab text
            ctx.fillStyle = isSelected 
                ? (ds ? ds.colors.text.primary : '#fff')
                : (ds ? ds.colors.text.muted : '#888');
            ctx.font = isSelected 
                ? (ds ? ds.font('md', 'bold', 'body') : 'bold 18px "Lato", sans-serif')
                : (ds ? ds.font('sm', 'normal', 'body') : '18px "Lato", sans-serif');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tab, tabX + tabWidth / 2, tabY + tabHeight / 2);
        });
    }
    
    renderItemList(ctx, canvasWidth, canvasHeight, menuRenderer, ds) {
        const items = this.getCurrentList();
        const listX = canvasWidth * 0.05;
        const listY = canvasHeight * 0.22;
        const listWidth = canvasWidth * 0.5;
        const listHeight = canvasHeight * 0.63;
        
        // List panel using MenuRenderer
        menuRenderer.drawPanel(ctx, listX, listY, listWidth, listHeight, 0.7);
        
        if (items.length === 0) {
            ctx.fillStyle = ds ? ds.colors.text.muted : '#888';
            ctx.font = ds ? ds.font('md', 'normal', 'body') : '20px "Lato", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                this.selectedTab === 0 ? this.game.t('shop.empty.buy') : this.game.t('shop.empty.sell'), 
                listX + listWidth / 2, 
                listY + listHeight / 2
            );
            return;
        }
        
        // Draw items
        const itemPadding = ds ? ds.spacing(4) : 15;
        const itemHeight = (listHeight - itemPadding * 2) / this.maxVisibleItems;
        const visibleItems = items.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleItems);
        
        visibleItems.forEach((item, index) => {
            const actualIndex = this.scrollOffset + index;
            const isSelected = actualIndex === this.selectedOption;
            const y = listY + itemPadding + index * itemHeight;
            const rowHeight = itemHeight - 8;
            
            // Selection highlight
            if (isSelected) {
                if (ds) {
                    ds.drawSelectionHighlight(ctx, listX + itemPadding, y, listWidth - itemPadding * 2, rowHeight);
                } else {
                    const gradient = ctx.createLinearGradient(listX, y, listX + listWidth, y);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0)');
                    gradient.addColorStop(0.1, 'rgba(74, 158, 255, 0.2)');
                    gradient.addColorStop(0.9, 'rgba(74, 158, 255, 0.2)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(listX + itemPadding, y, listWidth - itemPadding * 2, rowHeight);
                }
            }
            
            // Item name (left side)
            ctx.fillStyle = isSelected 
                ? (ds ? ds.colors.text.primary : '#fff')
                : (ds ? ds.colors.text.secondary : '#ccc');
            ctx.font = isSelected
                ? (ds ? ds.font('md', 'bold', 'body') : 'bold 18px "Lato", sans-serif')
                : (ds ? ds.font('sm', 'normal', 'body') : '16px "Lato", sans-serif');
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name, listX + itemPadding + 15, y + rowHeight / 2);
            
            // Stock/Quantity (right side, inside the row - with extra margin for scrollbar)
            const scrollbarMargin = items.length > this.maxVisibleItems ? 30 : 0;
            ctx.textAlign = 'right';
            if (this.selectedTab === 0 && item.stock !== -1) {
                // Show stock for buy tab
                ctx.fillStyle = item.stock <= 3 
                    ? (ds ? ds.colors.danger : '#f44')
                    : (ds ? ds.colors.text.muted : '#888');
                ctx.font = ds ? ds.font('sm', 'normal', 'body') : '14px "Lato", sans-serif';
                ctx.fillText(`${this.game.t('shop.stock')}: ${item.stock}`, listX + listWidth - itemPadding - 15 - scrollbarMargin, y + rowHeight / 2);
            } else if (this.selectedTab === 1) {
                // Show quantity for sell tab
                ctx.fillStyle = ds ? ds.colors.text.muted : '#888';
                ctx.font = ds ? ds.font('sm', 'normal', 'body') : '14px "Lato", sans-serif';
                ctx.fillText(`x${item.quantity}`, listX + listWidth - itemPadding - 15 - scrollbarMargin, y + rowHeight / 2);
            }
        });
        
        // Scrollbar (using MenuRenderer's shared scrollbar style)
        if (items.length > this.maxVisibleItems) {
            const scrollbarX = listX + listWidth - itemPadding - 10;
            const scrollbarY = listY + itemPadding;
            const scrollbarHeight = listHeight - itemPadding * 2;
            
            menuRenderer.drawScrollbar(ctx, scrollbarX, scrollbarY, scrollbarHeight, {
                offset: this.scrollOffset,
                maxVisible: this.maxVisibleItems,
                total: items.length
            });
        }
    }
    
    renderItemDetails(ctx, canvasWidth, canvasHeight, menuRenderer, ds) {
        const items = this.getCurrentList();
        if (items.length === 0) return;
        
        const item = items[this.selectedOption];
        if (!item) return;
        
        const detailsX = canvasWidth * 0.57;
        const detailsY = canvasHeight * 0.22;
        const detailsWidth = canvasWidth * 0.38;
        const detailsHeight = canvasHeight * 0.63;
        
        // Details panel
        menuRenderer.drawPanel(ctx, detailsX, detailsY, detailsWidth, detailsHeight, 0.7);
        
        const padding = ds ? ds.spacing(8) : 35;
        const centerX = detailsX + detailsWidth / 2;
        
        // Item icon (if available)
        const iconSize = ds ? ds.spacing(20) : 80;
        const iconY = detailsY + padding;
        let hasIcon = false;
        
        if (item.icon) {
            // Load icon if not cached
            if (!this.iconCache[item.icon]) {
                const img = new Image();
                img.src = item.icon;
                this.iconCache[item.icon] = img;
            }
            
            const iconImg = this.iconCache[item.icon];
            if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
                ctx.drawImage(iconImg, centerX - iconSize / 2, iconY, iconSize, iconSize);
                hasIcon = true;
            }
        }
        
        // Item name (below icon or at top if no icon) - word wrap if needed
        const nameAreaTop = hasIcon ? iconY + iconSize + 35 : detailsY + padding;
        const maxNameWidth = detailsWidth - padding * 2;
        const fontSize = ds ? 43 : 28; // xl size
        
        ctx.fillStyle = ds ? ds.colors.text.primary : '#fff';
        ctx.textAlign = 'center';
        ctx.font = ds ? ds.font('xl', 'bold', 'display') : `bold ${fontSize}px "Cinzel", serif`;
        if (ds) ds.applyShadow(ctx, 'glow');
        
        // Check if name needs wrapping
        const nameWidth = ctx.measureText(item.name).width;
        let nameAreaHeight;
        
        if (nameWidth > maxNameWidth) {
            // Word wrap the name
            const words = item.name.split(' ');
            let lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width > maxNameWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            // Draw wrapped name centered vertically
            const lineHeight = fontSize * 1.6;
            nameAreaHeight = lines.length * lineHeight;
            const nameStartY = nameAreaTop + lineHeight / 2;
            
            ctx.textBaseline = 'middle';
            lines.forEach((line, i) => {
                ctx.fillText(line, centerX, nameStartY + i * lineHeight);
            });
        } else {
            // Single line name
            nameAreaHeight = fontSize * 1.2;
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name, centerX, nameAreaTop + nameAreaHeight / 2);
        }
        
        if (ds) ds.clearShadow(ctx);
        
        // Separator line position (fixed distance from name area)
        const lineY = nameAreaTop + nameAreaHeight + 90;
        
        // Type and rarity - centered between name and line
        const rarityY = nameAreaTop + nameAreaHeight + 45; // Halfway between name bottom and line
        ctx.fillStyle = ds ? ds.colors.getRarityColor(item.rarity) : '#9d9d9d';
        ctx.font = ds ? ds.font('md', 'normal', 'body') : 'italic 18px "Lato", sans-serif';
        ctx.textBaseline = 'middle';
        const rarityText = (item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1);
        const typeText = (item.type || 'item').toLowerCase();
        ctx.fillText(`${rarityText} ${typeText}`, centerX, rarityY);
        
        // Separator line
        const lineWidth = detailsWidth * 0.6;
        const gradient = ctx.createLinearGradient(centerX - lineWidth / 2, lineY, centerX + lineWidth / 2, lineY);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.2, ds ? ds.colors.alpha(ds.colors.primary, 0.5) : 'rgba(74, 158, 255, 0.5)');
        gradient.addColorStop(0.8, ds ? ds.colors.alpha(ds.colors.primary, 0.5) : 'rgba(74, 158, 255, 0.5)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - lineWidth / 2, lineY, lineWidth, 2);
        
        // Description
        const descY = lineY + 60;
        ctx.fillStyle = ds ? ds.colors.text.secondary : '#ccc';
        ctx.font = ds ? ds.font('sm', 'normal', 'body') : '16px "Lato", sans-serif';
        this.wrapText(ctx, item.description || this.game.t('shop.noDescription'), centerX, descY, detailsWidth - padding * 2, 36);
        
        // Stats if any
        if (item.stats && Object.keys(item.stats).length > 0) {
            let statsY = descY + 80;
            ctx.font = ds ? ds.font('sm', 'normal', 'body') : '16px "Lato", sans-serif';
            
            for (const [stat, value] of Object.entries(item.stats)) {
                const isNegative = value < 0;
                ctx.fillStyle = isNegative 
                    ? (ds ? ds.colors.danger : '#ef4444')
                    : (ds ? ds.colors.success : '#4ade80');
                const prefix = isNegative ? '' : '+';
                const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
                ctx.fillText(`${prefix}${value} ${statName}`, centerX, statsY);
                statsY += 40;
            }
        }
        
        // Price info at bottom
        const price = this.selectedTab === 0 ? item.price : item.sellPrice;
        const playerGold = this.getPlayerGold();
        const canAfford = playerGold >= price;
        
        // Price display - position from bottom
        const priceY = detailsY + detailsHeight - padding - 60;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = ds ? ds.colors.warning : '#ffd700';
        ctx.font = ds ? ds.font('lg', 'bold', 'body') : 'bold 24px "Lato", sans-serif';
        ctx.fillText(`${price} 💰`, centerX, priceY);
        
        // "Not enough gold" warning (below price, only if can't afford)
        if (!canAfford && this.selectedTab === 0) {
            ctx.fillStyle = ds ? ds.colors.danger : '#ef4444';
            ctx.font = ds ? ds.font('sm', 'normal', 'body') : '16px "Lato", sans-serif';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this.game.t('shop.notEnoughGold'), centerX, detailsY + detailsHeight - padding - 20);
        }
    }
    
    renderQuantitySelector(ctx, canvasWidth, canvasHeight, menuRenderer, ds) {
        const items = this.getCurrentList();
        const item = items[this.selectedOption];
        if (!item) return;
        
        const boxWidth = ds ? ds.width(40) : 400;
        const boxHeight = ds ? ds.height(45) : 340;
        const boxX = (canvasWidth - boxWidth) / 2;
        const boxY = (canvasHeight - boxHeight) / 2;
        
        // Dark overlay
        ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.background.overlay, 0.7) : 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Modal panel
        menuRenderer.drawPanel(ctx, boxX, boxY, boxWidth, boxHeight, 0.95);
        
        const padding = ds ? ds.spacing(8) : 35;
        const centerX = boxX + boxWidth / 2;
        
        // Title
        ctx.fillStyle = ds ? ds.colors.text.primary : '#fff';
        ctx.font = ds ? ds.font('lg', 'bold', 'display') : 'bold 24px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.selectedTab === 0 ? this.game.t('shop.quantity.buy') : this.game.t('shop.quantity.sell'), centerX, boxY + padding);
        
        // Item name - much more spacing from title
        ctx.fillStyle = ds ? ds.colors.text.secondary : '#ccc';
        ctx.font = ds ? ds.font('sm', 'normal', 'body') : '16px "Lato", sans-serif';
        ctx.fillText(item.name, centerX, boxY + padding + 70);
        
        // Quantity display - centered in box
        const qtyY = boxY + boxHeight / 2;
        
        // Quantity number
        ctx.fillStyle = ds ? ds.colors.primary : '#4a9eff';
        ctx.font = ds ? ds.font('xxl', 'bold', 'body') : 'bold 48px "Lato", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (ds) ds.applyShadow(ctx, 'glow');
        ctx.fillText(`${this.selectedQuantity}`, centerX, qtyY);
        if (ds) ds.clearShadow(ctx);
        
        // Total cost - position from bottom with proper spacing
        const price = this.selectedTab === 0 ? item.price : item.sellPrice;
        const total = price * this.selectedQuantity;
        ctx.fillStyle = ds ? ds.colors.warning : '#ffd700';
        ctx.font = ds ? ds.font('md', 'normal', 'body') : '18px "Lato", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${this.game.t('shop.total')}: ${total} 💰`, centerX, boxY + boxHeight - padding - 35);
        
        // Instructions - at very bottom
        ctx.fillStyle = ds ? ds.colors.text.muted : '#888';
        ctx.font = ds ? ds.font('xs', 'normal', 'body') : '14px "Lato", sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.game.t('shop.quantityHints'), centerX, boxY + boxHeight - padding);
    }
    
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line.trim(), x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
    }
}

class LootWindowState extends GameState {}

/**
 * Battle State - Final Fantasy ATB-style battle system
 * Handles battle UI, turn order, action selection, and results
 */
class BattleState extends GameState {
    enter(data = {}) {
        // If resuming from pause menu, don't reinitialize
        if (data.isResumingFromPause) {
            console.log('[BattleState] Resumed from pause');
            return;
        }
        
        // Get reference to battle system
        this.battleSystem = this.game.battleSystem;
        
        // Stop player movement immediately when entering battle
        if (this.game.player) {
            this.game.player.velocityX = 0;
            this.game.player.velocityY = 0;
        }
        
        // UI State
        this.phase = 'transition'; // 'transition', 'battle', 'action_select', 'ability_select', 'target_select', 'results'
        this.selectedMenuOption = 0;
        this.selectedAbilityIndex = 0;
        this.selectedTargetIndex = 0;
        this.selectedPlayerSpirit = null;
        this.inputCooldown = 0;
        
        // Menu options for action selection
        this.menuOptions = ['Attack', 'Ability', 'Item', 'Seal', 'Switch', 'Flee'];
        
        // Store original map info to return to after battle
        this.originalMapId = this.game.currentMapId;
        this.originalMap = this.game.currentMap;
        this.originalPlayerPos = this.game.player ? { x: this.game.player.x, y: this.game.player.y } : null;
        
        // Store original camera position to restore after battle
        const camera = this.game.renderSystem?.camera;
        this.originalCameraX = camera?.x || 0;
        this.originalCameraY = camera?.y || 0;
        
        // Check if current map has a battle map configured
        const currentMap = this.game.currentMap;
        this.battleMapId = null;
        this.battleMapData = null;
        
        if (currentMap?.battleMap && currentMap.battleMap !== this.game.currentMapId) {
            // Get battle map data
            const battleMapData = this.game.mapManager?.getMapData(currentMap.battleMap);
            if (battleMapData) {
                this.battleMapId = currentMap.battleMap;
                this.battleMapData = battleMapData;
                
                // Make sure the battle map's paint layer is loaded
                if (this.game.editorManager) {
                    if (!this.game.editorManager.paintLayers[this.battleMapId]) {
                        // Initialize and load the paint layer from saved data
                        this.game.editorManager.initializePaintLayer(this.battleMapId);
                        if (battleMapData.paintLayerData) {
                            this.game.editorManager.importPaintLayerData(this.battleMapId, battleMapData.paintLayerData);
                        }
                    }
                }
                
                // Load the battle map's objects if not already loaded
                if (this.game.objectManager) {
                    this.game.objectManager.loadObjectsForMap(this.battleMapId);
                }
                
                console.log(`[BattleState] Using battle map: ${this.battleMapId}`);
                
                // Calculate the center of the battle map (use game world dimensions as default)
                const battleMapWidth = this.battleMapData.width || this.game.MAP_WIDTH || 3840;
                const battleMapHeight = this.battleMapData.height || this.game.MAP_HEIGHT || 2160;
                
                // Store battle center for positioning entities (WORLD coordinates)
                this.battleCenterX = battleMapWidth / 2;
                this.battleCenterY = battleMapHeight / 2;
                
                // Set camera IMMEDIATELY to battle map center (instant snap, no smoothing)
                // Camera uses SCREEN SPACE coordinates (world * worldScale)
                if (camera) {
                    const worldScale = this.game.worldScale || 1;
                    const screenCenterX = this.battleCenterX * worldScale;
                    const screenCenterY = this.battleCenterY * worldScale;
                    const targetX = screenCenterX - this.game.CANVAS_WIDTH / 2;
                    const targetY = screenCenterY - this.game.CANVAS_HEIGHT / 2;
                    camera.x = targetX;
                    camera.y = targetY;
                    camera.targetX = targetX;
                    camera.targetY = targetY;
                    console.log(`[BattleState] Camera set to screen coords: (${targetX}, ${targetY}), worldScale: ${worldScale}`);
                }
            }
        }
        
        // Battle background (legacy - for old-style image backgrounds)
        this.background = data.background || 'forest-0';
        this.backgroundImage = null;
        this.loadBackground();
        
        // Player is now rendered through WebGL - no separate sprite loading needed
        
        // Transition animation
        this.transitionTimer = 0;
        this.transitionDuration = 1.0;
        
        // Play transition sound effect
        this.game.audioManager?.playEffect('transition.mp3');
        
        // Results screen
        this.showingResults = false;
        this.resultsTimer = 0;
        
        // Action animation
        this.actionAnimation = null;
        this.damageNumbers = [];
        this.actionTexts = []; // Floating action names like "Attack", "Gust", etc.
        
        // Action log (no longer rendered, but kept for debugging)
        this.actionLog = [];
        this.maxLogEntries = 8;
        
        // Battle spirit entities (actual Spirit instances for WebGL rendering)
        this.battleSpiritEntities = [];
        
        // Register callbacks with battle system
        if (this.battleSystem) {
            this.battleSystem.onLogEntry = (entry) => this.addLogEntry(entry);
            
            // Damage callback - spawns floating damage number on target
            this.battleSystem.onDamage = (target, meta) => {
                this.spawnDamageNumber(target, meta);
            };
            
            // Heal callback - spawns green floating heal number
            this.battleSystem.onHeal = (target, amount) => {
                this.spawnHealNumber(target, amount);
            };
            
            // Action text callback - shows ability name above user
            this.battleSystem.onActionText = (user, actionName) => {
                this.spawnActionText(user, actionName);
            };
        }
        
        console.log('[BattleState] Entered battle state');
    }
    
    /**
     * Pause the battle (when opening menu overlay)
     */
    pause() {
        console.log('[BattleState] Battle paused');
        // Battle system will stop updating automatically since handleInput won't be called
    }
    
    /**
     * Resume the battle (when closing menu overlay)
     */
    resume() {
        console.log('[BattleState] Battle resumed');
        this.inputCooldown = 0.2; // Small cooldown to prevent accidental input
    }
    
    /**
     * Create actual Spirit entity instances for battle combatants
     * These get rendered through the normal WebGL pipeline with shadows
     */
    createBattleSpiritEntities() {
        this.battleSpiritEntities = [];
        
        if (!this.battleSystem) return;
        
        // Use battle map center if we have a battle map, otherwise use camera view center
        let centerX, centerY;
        if (this.battleMapId && this.battleMapData) {
            centerX = this.battleCenterX || (this.battleMapData.width || this.game.MAP_WIDTH || 3840) / 2;
            centerY = this.battleCenterY || (this.battleMapData.height || this.game.MAP_HEIGHT || 2160) / 2;
        } else {
            const camera = this.game.renderSystem?.camera;
            centerX = (camera?.x || 0) + this.game.CANVAS_WIDTH / 2;
            centerY = (camera?.y || 0) + this.game.CANVAS_HEIGHT / 2;
        }
        
        // Calculate vertical centering based on number of spirits
        const playerCount = this.battleSystem.playerParty.length;
        const enemyCount = this.battleSystem.enemyParty.length;
        
        // Spacing in world units - loose formation to fit UI elements
        const verticalSpacing = 220; // World units between spirits (needs room for HP/MP/ATB bars)
        
        // Horizontal spread
        const horizontalOffset = 280; // Distance from center
        
        // Create player spirit entities (left side)
        const playerTotalHeight = (playerCount - 1) * verticalSpacing;
        const playerStartY = centerY - playerTotalHeight / 2;
        
        this.battleSystem.playerParty.forEach((spirit, index) => {
            const worldX = centerX - horizontalOffset;
            const worldY = playerStartY + index * verticalSpacing;
            
            const spiritEntity = new Spirit(this.game, worldX, worldY, this.battleMapId || this.game.currentMapId, {
                id: `battle_player_${spirit.id}`,
                name: spirit.name,
                spriteSrc: spirit.sprite,
                scale: spirit.scale || 0.075,
                isFloating: spirit.isFloating || false,
                floatingSpeed: spirit.floatingSpeed || 0.002,
                floatingRange: spirit.floatingRange || 15,
                spawnEffect: false, // No spawn effect in battle
                direction: 'right' // Face right (toward enemies)
            });
            
            // Link to battle spirit data for UI
            spiritEntity._battleSpirit = spirit;
            spiritEntity._isPlayerOwned = true;
            spiritEntity._battleIndex = index;
            
            this.battleSpiritEntities.push(spiritEntity);
        });
        
        // Create enemy spirit entities (right side)
        const enemyTotalHeight = (enemyCount - 1) * verticalSpacing;
        const enemyStartY = centerY - enemyTotalHeight / 2;
        
        this.battleSystem.enemyParty.forEach((spirit, index) => {
            const worldX = centerX + horizontalOffset;
            const worldY = enemyStartY + index * verticalSpacing;
            
            const spiritEntity = new Spirit(this.game, worldX, worldY, this.battleMapId || this.game.currentMapId, {
                id: `battle_enemy_${spirit.id}`,
                name: spirit.name,
                spriteSrc: spirit.sprite,
                scale: spirit.scale || 0.075,
                isFloating: spirit.isFloating || false,
                floatingSpeed: spirit.floatingSpeed || 0.002,
                floatingRange: spirit.floatingRange || 15,
                spawnEffect: false,
                direction: 'left' // Face left (toward player)
            });
            
            spiritEntity._battleSpirit = spirit;
            spiritEntity._isPlayerOwned = false;
            spiritEntity._battleIndex = index;
            
            this.battleSpiritEntities.push(spiritEntity);
        });
        
        console.log(`[BattleState] Created ${this.battleSpiritEntities.length} battle spirit entities at (${centerX}, ${centerY})`);
        
        // Position the player (commander) on the battle field
        // They stand behind their spirits, facing right
        if (this.game.player) {
            // Store original direction
            this.savedPlayerDirection = this.game.player.direction;
            
            // Position player behind their spirits
            this.game.player.x = centerX - horizontalOffset - 80;
            this.game.player.y = centerY;
            this.game.player.direction = 'right'; // Face toward enemies
        }
        
        // Store the battle center for camera (same as player's original position)
        this.battleCenterX = centerX;
        this.battleCenterY = centerY;
    }
    
    /**
     * Reposition all battle entities so they're centered on screen
     * Called every frame to ensure they stay centered regardless of camera
     */
    repositionBattleEntities(centerX, centerY) {
        const verticalSpacing = 220;
        const horizontalOffset = 280;
        
        const playerCount = this.battleSystem?.playerParty?.length || 0;
        const enemyCount = this.battleSystem?.enemyParty?.length || 0;
        
        // Reposition player spirits (left side)
        const playerTotalHeight = (playerCount - 1) * verticalSpacing;
        const playerStartY = centerY - playerTotalHeight / 2;
        
        let playerIndex = 0;
        let enemyIndex = 0;
        
        for (const entity of this.battleSpiritEntities) {
            if (entity._isPlayerOwned) {
                entity.x = centerX - horizontalOffset;
                entity.y = playerStartY + playerIndex * verticalSpacing;
                playerIndex++;
            } else {
                const enemyTotalHeight = (enemyCount - 1) * verticalSpacing;
                const enemyStartY = centerY - enemyTotalHeight / 2;
                entity.x = centerX + horizontalOffset;
                entity.y = enemyStartY + enemyIndex * verticalSpacing;
                enemyIndex++;
            }
        }
        
        // Reposition player character (behind their spirits)
        if (this.game.player) {
            this.game.player.x = centerX - horizontalOffset - 200;
            this.game.player.y = centerY;
        }
    }
    
    // Player sprite is now rendered through WebGL - no separate loading needed
    
    addLogEntry(text) {
        this.actionLog.unshift({
            text: text,
            time: Date.now(),
            alpha: 1.0
        });
        // Trim old entries
        if (this.actionLog.length > this.maxLogEntries) {
            this.actionLog.pop();
        }
    }
    
    loadBackground() {
        this.backgroundImage = new Image();
        this.backgroundImage.src = `assets/battlescene/${this.background}.png`;
        this.backgroundImage.onerror = () => {
            console.warn(`[BattleState] Failed to load background: ${this.background}`);
            this.backgroundImage = null;
        };
    }
    
    exit() {
        // Clear callbacks
        if (this.battleSystem) {
            this.battleSystem.onLogEntry = null;
            this.battleSystem.onDamage = null;
            this.battleSystem.onHeal = null;
            this.battleSystem.onActionText = null;
            this.battleSystem.cleanup();
        }
        
        // Clean up battle spirit entities
        this.battleSpiritEntities = [];
        
        // Restore player position and direction if we had a battle map
        if (this.game.player) {
            if (this.originalPlayerPos) {
                this.game.player.x = this.originalPlayerPos.x;
                this.game.player.y = this.originalPlayerPos.y;
            }
            if (this.savedPlayerDirection) {
                this.game.player.direction = this.savedPlayerDirection;
            }
        }
        
        // Restore original camera position
        const camera = this.game.renderSystem?.camera;
        if (camera && this.originalCameraX !== undefined) {
            camera.x = this.originalCameraX;
            camera.y = this.originalCameraY;
            camera.targetX = this.originalCameraX;
            camera.targetY = this.originalCameraY;
        }
        
        // Resume world BGM
        this.game.audioManager?.resumeBGM();
    }
    
    update(deltaTime) {
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }
        
        // Update transition
        if (this.phase === 'transition') {
            this.transitionTimer += deltaTime;
            if (this.transitionTimer >= this.transitionDuration) {
                this.phase = 'battle';
            }
            return;
        }
        
        // Update weather system during battle so particles animate
        if (this.game.weatherSystem) {
            this.game.weatherSystem.update(deltaTime);
        }
        
        // Create battle spirit entities if not yet created (after transition)
        if (this.battleSpiritEntities.length === 0 && this.battleSystem) {
            this.createBattleSpiritEntities();
        }
        
        // Update battle spirit entities (for floating animation, damage flash, selection state, etc)
        this.battleSpiritEntities.forEach(entity => {
            // Sync alive state
            if (entity._battleSpirit && !entity._battleSpirit.isAlive) {
                entity.baseAlpha = 0.3; // Fade out dead spirits
            }
            // Update damage flash on the spirit data
            if (entity._battleSpirit && entity._battleSpirit._damageFlash > 0) {
                entity._battleSpirit._damageFlash -= deltaTime * 3; // Fade out over ~0.33s
            }
            // Sync selection state for outline rendering
            entity._isSelected = (entity._battleSpirit === this.selectedPlayerSpirit);
        });
        
        // Update battle system
        if (this.battleSystem) {
            this.battleSystem.update(deltaTime);
            
            // Check for battle end
            if (this.battleSystem.result && !this.showingResults) {
                this.showingResults = true;
                this.phase = 'results';
                this.resultsTimer = 0;
            }
        }
        
        // Update damage numbers (arc trajectory like fountain)
        this.damageNumbers = this.damageNumbers.filter(dn => {
            dn.timer += deltaTime;
            // Apply velocity for dramatic arc effect
            dn.x += (dn.vx || 0) * deltaTime;
            dn.vy = (dn.vy || -180) + 400 * deltaTime; // Strong gravity for dramatic arc
            dn.y += dn.vy * deltaTime;
            dn.alpha = Math.max(0, 1 - dn.timer / dn.duration);
            return dn.timer < dn.duration;
        });
        
        // Update action texts (stay in place, just fade out)
        this.actionTexts = this.actionTexts.filter(at => {
            at.timer += deltaTime;
            // Action texts stay in place - no floating
            at.alpha = Math.max(0, 1 - at.timer / at.duration);
            return at.timer < at.duration;
        });
        
        // Auto-select ready spirit
        if (this.phase === 'battle') {
            const readySpirits = this.battleSystem?.getReadyPlayerSpirits() || [];
            if (readySpirits.length > 0 && !this.selectedPlayerSpirit) {
                this.selectedPlayerSpirit = readySpirits[0];
                this.phase = 'action_select';
                this.selectedMenuOption = 0;
            }
        }
        
        // Results timer
        if (this.phase === 'results') {
            this.resultsTimer += deltaTime;
        }
    }
    
    handleInput(inputManager) {
        if (this.inputCooldown > 0) return;
        
        // Menu key ALWAYS opens pause menu (pauses battle)
        if (inputManager.isJustPressed('menu')) {
            this.game.audioManager?.playEffect('cancel.mp3');
            this.game.stateManager.pushState('PAUSED');
            this.inputCooldown = 0.2;
            return;
        }
        
        // Results screen - press confirm to exit
        if (this.phase === 'results') {
            if (inputManager.isJustPressed('confirm') && this.resultsTimer > 1.0) {
                this.exitBattle();
            }
            return;
        }
        
        // Action selection
        if (this.phase === 'action_select') {
            this.handleActionSelectInput(inputManager);
            return;
        }
        
        // Ability selection
        if (this.phase === 'ability_select') {
            this.handleAbilitySelectInput(inputManager);
            return;
        }
        
        // Target selection
        if (this.phase === 'target_select') {
            this.handleTargetSelectInput(inputManager);
            return;
        }
    }
    
    handleActionSelectInput(inputManager) {
        // Navigate menu
        if (inputManager.isJustPressed('up')) {
            this.selectedMenuOption = (this.selectedMenuOption - 1 + this.menuOptions.length) % this.menuOptions.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        if (inputManager.isJustPressed('down')) {
            this.selectedMenuOption = (this.selectedMenuOption + 1) % this.menuOptions.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        
        // Select option
        if (inputManager.isJustPressed('confirm')) {
            this.selectAction(this.menuOptions[this.selectedMenuOption]);
            this.inputCooldown = 0.15;
        }
        
        // Cancel - deselect spirit
        if (inputManager.isJustPressed('cancel')) {
            this.selectedPlayerSpirit = null;
            this.phase = 'battle';
            this.inputCooldown = 0.15;
        }
    }
    
    handleAbilitySelectInput(inputManager) {
        // Filter out basic attack - we have a separate Attack option
        const abilities = (this.selectedPlayerSpirit?.abilities || []).filter(a => a.id !== 'attack');
        
        if (abilities.length === 0) return;
        
        if (inputManager.isJustPressed('up')) {
            this.selectedAbilityIndex = (this.selectedAbilityIndex - 1 + abilities.length) % abilities.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        if (inputManager.isJustPressed('down')) {
            this.selectedAbilityIndex = (this.selectedAbilityIndex + 1) % abilities.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        
        if (inputManager.isJustPressed('confirm')) {
            const ability = abilities[this.selectedAbilityIndex];
            if (ability && this.selectedPlayerSpirit.currentMp >= ability.mpCost) {
                this.pendingAbility = ability;
                this.phase = 'target_select';
                // Default target index - for ally abilities, default to self
                if (ability.target === 'single_ally' || ability.target === 'all_allies') {
                    const allies = this.battleSystem.getAlivePlayerSpirits();
                    const selfIndex = allies.findIndex(s => s === this.selectedPlayerSpirit);
                    this.selectedTargetIndex = selfIndex >= 0 ? selfIndex : 0;
                } else {
                    this.selectedTargetIndex = 0;
                }
            } else {
                // Not enough MP
                this.game.audioManager?.playEffect('error.mp3');
            }
            this.inputCooldown = 0.15;
        }
        
        if (inputManager.isJustPressed('cancel')) {
            this.phase = 'action_select';
            this.inputCooldown = 0.15;
        }
    }
    
    handleTargetSelectInput(inputManager) {
        const targets = this.getSelectableTargets();
        
        if (inputManager.isJustPressed('left') || inputManager.isJustPressed('up')) {
            this.selectedTargetIndex = (this.selectedTargetIndex - 1 + targets.length) % targets.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        if (inputManager.isJustPressed('right') || inputManager.isJustPressed('down')) {
            this.selectedTargetIndex = (this.selectedTargetIndex + 1) % targets.length;
            this.game.audioManager?.playEffect('menu-navigation.mp3');
            this.inputCooldown = 0.1;
        }
        
        if (inputManager.isJustPressed('confirm')) {
            const target = targets[this.selectedTargetIndex];
            this.executeSelectedAction(target);
            this.inputCooldown = 0.15;
        }
        
        if (inputManager.isJustPressed('cancel')) {
            this.phase = this.pendingAbility ? 'ability_select' : 'action_select';
            this.pendingAbility = null;
            this.inputCooldown = 0.15;
        }
    }
    
    selectAction(action) {
        switch (action) {
            case 'Attack':
                this.pendingAction = 'attack';
                this.phase = 'target_select';
                this.selectedTargetIndex = 0;
                break;
            case 'Ability':
                this.phase = 'ability_select';
                this.selectedAbilityIndex = 0;
                break;
            case 'Item':
                // TODO: Item menu
                console.log('[BattleState] Item menu not implemented yet');
                break;
            case 'Seal':
                if (this.battleSystem.canSeal) {
                    this.pendingAction = 'seal';
                    this.phase = 'target_select';
                    this.selectedTargetIndex = 0;
                } else {
                    this.game.audioManager?.playEffect('error.mp3');
                }
                break;
            case 'Switch':
                // TODO: Switch menu
                console.log('[BattleState] Switch menu not implemented yet');
                break;
            case 'Flee':
                this.attemptFlee();
                break;
        }
        this.game.audioManager?.playEffect('menu-select.mp3');
    }
    
    getSelectableTargets() {
        if (!this.battleSystem) return [];
        
        // Determine target type based on pending action
        if (this.pendingAbility) {
            const targetType = this.pendingAbility.target;
            if (targetType === 'single_ally' || targetType === 'all_allies') {
                return this.battleSystem.getAlivePlayerSpirits();
            }
        }
        
        // Default to enemies
        return this.battleSystem.getAliveEnemies();
    }
    
    executeSelectedAction(target) {
        if (!this.selectedPlayerSpirit || !this.battleSystem) return;
        
        let action;
        if (this.pendingAbility) {
            action = {
                type: 'ability',
                user: this.selectedPlayerSpirit,
                ability: this.pendingAbility,
                target: target
            };
        } else if (this.pendingAction === 'attack') {
            action = {
                type: 'attack',
                user: this.selectedPlayerSpirit,
                target: target
            };
        } else if (this.pendingAction === 'seal') {
            action = {
                type: 'seal',
                user: this.selectedPlayerSpirit,
                target: target
            };
        }
        
        if (action) {
            this.battleSystem.queuePlayerAction(action);
        }
        
        // Reset state
        this.selectedPlayerSpirit = null;
        this.pendingAction = null;
        this.pendingAbility = null;
        this.phase = 'battle';
    }
    
    attemptFlee() {
        if (!this.battleSystem || !this.battleSystem.canFlee) {
            this.game.audioManager?.playEffect('error.mp3');
            return;
        }
        
        const action = {
            type: 'flee',
            user: this.selectedPlayerSpirit
        };
        this.battleSystem.queuePlayerAction(action);
        this.selectedPlayerSpirit = null;
        this.phase = 'battle';
    }
    
    exitBattle() {
        // Award EXP if victory
        if (this.battleSystem?.result === 'victory') {
            const rewards = this.battleSystem.rewards;
            this.game.partyManager?.awardExp(rewards.exp);
            this.game.player.gold = (this.game.player.gold || 0) + rewards.gold;
        }
        
        // Set interaction cooldown to prevent immediate re-encounter
        this.game.interactionCooldown = 1.0;
        
        // Pop battle state
        this.stateManager.popState();
    }
    
    render(ctx, skipTransition = false) {
        const width = this.game.CANVAS_WIDTH;
        const height = this.game.CANVAS_HEIGHT;
        const ds = window.ds;
        
        // Transition effect (skip if called from pause menu)
        if (this.phase === 'transition' && !skipTransition) {
            this.renderTransition(ctx, width, height);
            return;
        }
        
        // === RENDER THE GAME WORLD AS BATTLE BACKGROUND ===
        const camera = this.game.renderSystem?.camera;
        
        // Save current state
        const savedMapId = this.game.currentMapId;
        const savedMap = this.game.currentMap;
        
        let battleObjects = [];
        let battleCenterX, battleCenterY;
        
        // Use battle map if configured
        if (this.battleMapId && this.battleMapData) {
            this.game.currentMapId = this.battleMapId;
            this.game.currentMap = this.battleMapData;
            battleObjects = this.game.objectManager?.getObjectsForMap(this.battleMapId) || [];
            
            // Use the stored battle center (center of battle map)
            battleCenterX = this.battleCenterX;
            battleCenterY = this.battleCenterY;
        } else {
            battleObjects = this.game.objectManager?.getObjectsForMap(this.game.currentMapId) || [];
            
            // No battle map - use current camera view center
            battleCenterX = (camera?.x || 0) + width / 2;
            battleCenterY = (camera?.y || 0) + height / 2;
        }
        
        // Position battle entities at the battle center
        this.repositionBattleEntities(battleCenterX, battleCenterY);
        
        // Render world with battle map, battle spirit entities, AND the player
        // Pass battle spirits as NPCs so they go through the WebGL shadow/sprite passes
        this.game.renderSystem.renderWorld(this.game.currentMap, battleObjects, this.battleSpiritEntities, this.game.player, this.game);
        
        // Render weather effects on top of battle map
        if (this.game.weatherSystem) {
            this.game.weatherSystem.render();
        }
        
        // Restore original map state
        if (this.battleMapId && this.battleMapData) {
            this.game.currentMapId = savedMapId;
            this.game.currentMap = savedMap;
        }
        
        // Now draw battle-specific elements on top using Canvas2D
        
        // Draw combatants (spirits) UI overlays
        this.renderCombatants(ctx, width, height);
        
        // Draw yellow bouncing arrow over active spirit
        this.renderActiveSpiritIndicator(ctx, width, height);
        
        // Player is now rendered through WebGL with battle spirits
        
        // Action log removed - using floating damage numbers instead
        // this.renderActionLog(ctx, width, height);
        
        // Draw damage numbers and action texts
        this.renderDamageNumbers(ctx);
        
        // Draw action menu if selecting
        if (this.phase === 'action_select') {
            this.renderActionMenu(ctx, width, height);
        }
        
        // Draw ability menu if selecting
        if (this.phase === 'ability_select') {
            this.renderAbilityMenu(ctx, width, height);
        }
        
        // Draw target cursor if selecting
        if (this.phase === 'target_select') {
            this.renderTargetCursor(ctx, width, height);
        }
        
        // Draw results screen if battle ended
        if (this.phase === 'results') {
            this.renderResults(ctx, width, height);
        }
    }
    
    renderTransition(ctx, width, height) {
        // Flash/fade transition effect
        const progress = this.transitionTimer / this.transitionDuration;
        
        // Stripe effect (like FF battles)
        const stripeCount = 8;
        const stripeHeight = height / stripeCount;
        
        ctx.fillStyle = '#000';
        for (let i = 0; i < stripeCount; i++) {
            const stripeProgress = Math.min(1, progress * 2 - i * 0.1);
            if (stripeProgress > 0) {
                const stripeWidth = width * stripeProgress;
                const x = i % 2 === 0 ? 0 : width - stripeWidth;
                ctx.fillRect(x, i * stripeHeight, stripeWidth, stripeHeight);
            }
        }
        
        // Flash white
        if (progress > 0.3 && progress < 0.5) {
            const flashAlpha = 1 - Math.abs(progress - 0.4) * 10;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }
    }
    
    renderBackground(ctx, width, height) {
        // Draw gradient or background image
        if (this.backgroundImage && this.backgroundImage.complete) {
            ctx.drawImage(this.backgroundImage, 0, 0, width, height);
        } else {
            // Fallback gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(0.5, '#16213e');
            gradient.addColorStop(1, '#0f3460');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    }
    
    /**
     * Apply day/night lighting overlay to battle scene
     * This creates a color overlay based on the current time of day
     */
    renderDayNightOverlay(ctx, width, height) {
        const dayNightCycle = this.game.dayNightCycle;
        if (!dayNightCycle) return;
        
        // Get shader params which contain brightness, saturation, temperature
        const params = dayNightCycle.getShaderParams();
        
        // Skip if it's basically full daylight (no noticeable effect)
        if (params.brightness >= 0.95 && params.saturation >= 0.95) return;
        
        ctx.save();
        
        // Apply brightness reduction as a dark overlay
        if (params.brightness < 0.95) {
            const darknessAlpha = (1 - params.brightness) * 0.7; // Scale down for subtle effect
            
            // Get the darkness color based on time of day
            const timeOfDay = dayNightCycle.timeOfDay;
            let overlayColor;
            
            if ((timeOfDay >= 20 && timeOfDay < 24) || (timeOfDay >= 0 && timeOfDay < 5)) {
                // Night - blue tint
                overlayColor = `rgba(20, 30, 80, ${darknessAlpha})`;
            } else if (timeOfDay >= 5 && timeOfDay < 8) {
                // Dawn - warm orange/pink tint
                const t = (timeOfDay - 5) / 3;
                const r = Math.round(255 * (1 - t) + 20 * t);
                const g = Math.round(150 * (1 - t) + 30 * t);
                const b = Math.round(100 * (1 - t) + 80 * t);
                overlayColor = `rgba(${r}, ${g}, ${b}, ${darknessAlpha * 0.6})`;
            } else if (timeOfDay >= 17 && timeOfDay < 20) {
                // Dusk - orange/red tint
                const t = (timeOfDay - 17) / 3;
                const r = Math.round(255 * (1 - t) + 20 * t);
                const g = Math.round(100 * (1 - t) + 30 * t);
                const b = Math.round(50 * (1 - t) + 80 * t);
                overlayColor = `rgba(${r}, ${g}, ${b}, ${darknessAlpha * 0.6})`;
            } else {
                // Day - minimal overlay
                overlayColor = `rgba(0, 0, 0, ${darknessAlpha * 0.3})`;
            }
            
            ctx.fillStyle = overlayColor;
            ctx.fillRect(0, 0, width, height);
        }
        
        // Apply desaturation effect using a gray overlay with soft-light blending
        if (params.saturation < 0.9) {
            const desatAmount = (1 - params.saturation) * 0.3;
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = `rgba(128, 128, 128, ${desatAmount})`;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.restore();
    }
    
    // Shadows are now rendered through WebGL via battleSpiritEntities
    // The old Canvas2D renderCombatantShadows method has been removed
    
    /**
     * Render weather effects in battle (rain, snow, leaves)
     */
    renderBattleWeather(ctx, width, height) {
        const weatherSystem = this.game.weatherSystem;
        if (!weatherSystem) return;
        
        const precipitation = weatherSystem.precipitation;
        const particles = weatherSystem.particles;
        
        // Skip if no weather
        if (precipitation === 'none' && particles === 'none') return;
        
        ctx.save();
        
        // Rain particles
        if (precipitation.startsWith('rain')) {
            const intensity = precipitation === 'rain-heavy' ? 1.0 : 
                             precipitation === 'rain-medium' ? 0.6 : 0.3;
            const particleCount = Math.floor(100 * intensity);
            
            ctx.strokeStyle = 'rgba(180, 200, 255, 0.6)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < particleCount; i++) {
                // Use time-based animation for consistent rain
                const time = Date.now() / 1000;
                const seed = i * 12345.6789;
                const px = ((seed + time * 100) % width);
                const py = ((seed * 2 + time * 800) % (height + 50)) - 25;
                const length = 15 + (seed % 10);
                const windOffset = weatherSystem.windStrength * 5;
                
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + windOffset, py + length);
                ctx.stroke();
            }
        }
        
        // Snow particles
        if (precipitation.startsWith('snow')) {
            const intensity = precipitation === 'snow-heavy' ? 1.0 : 
                             precipitation === 'snow-medium' ? 0.6 : 0.3;
            const particleCount = Math.floor(60 * intensity);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            
            for (let i = 0; i < particleCount; i++) {
                const time = Date.now() / 1000;
                const seed = i * 98765.4321;
                const sway = Math.sin(time * 2 + seed) * 20;
                const px = ((seed + time * 30 + sway) % (width + 100)) - 50;
                const py = ((seed * 2 + time * 100) % (height + 50)) - 25;
                const size = 2 + (seed % 3);
                
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Leaf particles
        if (particles !== 'none' && particles.startsWith('leaf')) {
            const leafCount = 15;
            const colors = {
                'leaf-green': '#4a7c3f',
                'leaf-orange': '#d97706',
                'leaf-red': '#dc2626',
                'leaf-brown': '#78350f'
            };
            const leafColor = colors[particles] || '#4a7c3f';
            
            for (let i = 0; i < leafCount; i++) {
                const time = Date.now() / 1000;
                const seed = i * 54321.9876;
                const sway = Math.sin(time * 1.5 + seed) * 40;
                const px = ((seed + time * 50 + sway) % (width + 200)) - 100;
                const py = ((seed * 2 + time * 80) % (height + 100)) - 50;
                const rotation = (time * 2 + seed) % (Math.PI * 2);
                const size = 6 + (seed % 4);
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(rotation);
                ctx.fillStyle = leafColor;
                ctx.beginPath();
                // Simple leaf shape
                ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        // Sakura petals
        if (particles === 'sakura') {
            ctx.fillStyle = 'rgba(255, 182, 193, 0.8)';
            
            for (let i = 0; i < 20; i++) {
                const time = Date.now() / 1000;
                const seed = i * 13579.2468;
                const sway = Math.sin(time * 1.2 + seed) * 50;
                const px = ((seed + time * 40 + sway) % (width + 200)) - 100;
                const py = ((seed * 2 + time * 60) % (height + 100)) - 50;
                const rotation = (time * 1.5 + seed) % (Math.PI * 2);
                const size = 5 + (seed % 3);
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(rotation);
                ctx.beginPath();
                // Petal shape
                ctx.ellipse(0, 0, size, size / 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Render lens flare effect for battle scene
     */
    renderBattleLensFlare(ctx, width, height) {
        const dayNightCycle = this.game.dayNightCycle;
        if (!dayNightCycle) return;
        
        // Check weather - no lens flare in bad weather
        const weather = this.game.currentMap?.weather;
        let isClearWeather = !weather || weather === 'none' || weather === 'sunny';
        if (typeof weather === 'object' && weather !== null) {
            const precip = weather.precipitation;
            isClearWeather = !precip || precip === 'none';
        }
        if (!isClearWeather) return;
        
        // Get sun position
        const sunPos = dayNightCycle.getSunPosition();
        if (!sunPos || sunPos.y > 0.6) return; // Sun must be above horizon
        
        // Check time windows (8-10am and 2-4pm for best effect)
        const time = dayNightCycle.timeOfDay;
        let intensity = 0;
        
        if (time >= 8 && time < 10) {
            intensity = time < 9 ? (time - 8) : (10 - time);
        } else if (time >= 14 && time < 16) {
            intensity = time < 15 ? (time - 14) : (16 - time);
        } else if (time >= 6 && time < 8) {
            intensity = (time - 6) / 4; // Fade in from sunrise
        } else if (time >= 16 && time < 18) {
            intensity = (18 - time) / 4; // Fade out to sunset
        }
        
        if (intensity <= 0.05) return;
        
        intensity *= 0.7; // Reduce intensity a bit for battle
        
        ctx.save();
        
        // Sun position in screen space
        const sx = sunPos.x * width;
        const sy = sunPos.y * height;
        
        // Center of screen
        const cx = width / 2;
        const cy = height / 2;
        
        // Vector from sun to center
        const dx = cx - sx;
        const dy = cy - sy;
        
        // Draw sun glow
        const sunGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 100);
        sunGradient.addColorStop(0, `rgba(255, 255, 230, ${0.6 * intensity})`);
        sunGradient.addColorStop(0.3, `rgba(255, 200, 100, ${0.3 * intensity})`);
        sunGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.fillStyle = sunGradient;
        ctx.fillRect(sx - 100, sy - 100, 200, 200);
        
        // Lens flare artifacts
        ctx.globalCompositeOperation = 'screen';
        
        // Artifact 1 - Orange near sun
        const g1 = ctx.createRadialGradient(sx + dx * 0.2, sy + dy * 0.2, 0, sx + dx * 0.2, sy + dy * 0.2, 30);
        g1.addColorStop(0, `rgba(255, 128, 0, ${0.4 * intensity})`);
        g1.addColorStop(1, 'rgba(255, 128, 0, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(sx + dx * 0.2 - 30, sy + dy * 0.2 - 30, 60, 60);
        
        // Artifact 2 - Green mid-range
        const g2 = ctx.createRadialGradient(sx + dx * 0.4, sy + dy * 0.4, 0, sx + dx * 0.4, sy + dy * 0.4, 40);
        g2.addColorStop(0, `rgba(0, 255, 50, ${0.25 * intensity})`);
        g2.addColorStop(1, 'rgba(0, 255, 50, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(sx + dx * 0.4 - 40, sy + dy * 0.4 - 40, 80, 80);
        
        // Artifact 3 - Blue past center
        const g3 = ctx.createRadialGradient(sx + dx * 1.5, sy + dy * 1.5, 0, sx + dx * 1.5, sy + dy * 1.5, 25);
        g3.addColorStop(0, `rgba(50, 100, 255, ${0.5 * intensity})`);
        g3.addColorStop(1, 'rgba(50, 100, 255, 0)');
        ctx.fillStyle = g3;
        ctx.fillRect(sx + dx * 1.5 - 25, sy + dy * 1.5 - 25, 50, 50);
        
        // Artifact 4 - Magenta far
        const g4 = ctx.createRadialGradient(sx + dx * 2.5, sy + dy * 2.5, 0, sx + dx * 2.5, sy + dy * 2.5, 35);
        g4.addColorStop(0, `rgba(255, 0, 200, ${0.3 * intensity})`);
        g4.addColorStop(1, 'rgba(255, 0, 200, 0)');
        ctx.fillStyle = g4;
        ctx.fillRect(sx + dx * 2.5 - 35, sy + dy * 2.5 - 35, 70, 70);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
    
    // Player commander is now rendered through WebGL as part of the battle scene
    
    renderActiveSpiritIndicator(ctx, width, height) {
        if (!this.battleSystem) return;
        
        // Show indicator on the currently selected player spirit (when selecting action)
        // OR on the spirit whose action is being executed
        let activeSpirit = this.selectedPlayerSpirit;
        if (!activeSpirit && this.battleSystem.currentAction) {
            activeSpirit = this.battleSystem.currentAction.user;
        }
        if (!activeSpirit) return;
        
        // Find the entity for this spirit to get proper screen position
        const entity = this.battleSpiritEntities.find(e => e._battleSpirit === activeSpirit);
        if (!entity) return;
        
        const ds = window.ds;
        const worldScale = this.game.worldScale || 1;
        const camera = this.game.renderSystem?.camera;
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        
        if (!camera) return;
        
        // Get entity world position
        const worldX = entity.x * worldScale;
        const worldY = entity.y * worldScale;
        
        // Get sprite dimensions
        const finalScale = entity.getFinalScale(this.game);
        const baseHeight = entity.spriteHeight || 64;
        const spriteHeight = baseHeight * finalScale;
        
        // Calculate screen position with perspective
        let screenX, screenY;
        
        if (webglRenderer && webglRenderer.perspectiveStrength > 0 && webglRenderer.viewMatrix) {
            const vm = webglRenderer.viewMatrix;
            const pm = webglRenderer.projectionMatrix;
            
            const viewX = worldX * vm[0] + worldY * vm[4] + vm[12];
            const viewY = worldX * vm[1] + worldY * vm[5] + vm[13];
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * webglRenderer.perspectiveStrength);
            const clipX_persp = clipX / perspectiveW;
            const clipY_persp = clipY / perspectiveW;
            
            screenX = (clipX_persp + 1.0) * 0.5 * width;
            screenY = (1.0 - clipY_persp) * 0.5 * height;
        } else {
            screenX = worldX - camera.x;
            screenY = worldY - camera.y;
        }
        
        // Draw animated arrow indicator pointing down at the sprite
        const time = Date.now() / 200;
        const bounce = Math.sin(time) * 6;
        
        ctx.save();
        ctx.fillStyle = '#ffd700'; // Yellow arrow only, no outline
        
        const arrowX = screenX;
        const arrowY = screenY - spriteHeight - 20 + bounce; // Above sprite top
        const arrowSize = 14;
        
        // Simple triangle pointing down
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY + arrowSize); // Bottom tip
        ctx.lineTo(arrowX - arrowSize * 0.7, arrowY - arrowSize * 0.3);
        ctx.lineTo(arrowX + arrowSize * 0.7, arrowY - arrowSize * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    renderActionLog(ctx, width, height) {
        const ds = window.ds;
        const menuRenderer = this.game.menuRenderer;
        
        // Action log - positioned at bottom center
        const logWidth = Math.min(600, width * 0.45);
        const logHeight = ds ? ds.spacing(16) : 64;
        const logX = (width - logWidth) / 2;
        const logY = height - logHeight - (ds ? ds.spacing(4) : 16);
        
        // Draw panel background using design system with corner accents
        if (menuRenderer && menuRenderer.drawPanel) {
            menuRenderer.drawPanel(ctx, logX, logY, logWidth, logHeight, 0.85);
        } else if (ds) {
            ds.drawPanel(ctx, logX, logY, logWidth, logHeight, { alpha: 0.85, showCorners: true });
        } else {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(logX, logY, logWidth, logHeight, 4);
            ctx.fill();
            ctx.stroke();
        }
        
        // Log entries (newest at bottom)
        const fontSize = ds ? ds.fontSize('xs') : 12;
        ctx.font = ds ? ds.font('xs') : `${fontSize}px 'Lato', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lineHeight = fontSize * 1.4;
        const padding = ds ? ds.spacing(3) : 12;
        const maxLines = Math.floor((logHeight - padding * 2) / lineHeight);
        const visibleEntries = this.actionLog.slice(0, maxLines).reverse();
        
        visibleEntries.forEach((entry, index) => {
            // Fade older entries
            const age = (Date.now() - entry.time) / 1000;
            const alpha = Math.max(0.4, 1 - age * 0.05);
            
            ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.text.primary, alpha) : `rgba(255, 255, 255, ${alpha})`;
            
            // Truncate long text based on width
            let text = entry.text;
            const maxWidth = logWidth - padding * 2;
            // Measure and truncate if needed
            while (ctx.measureText(text).width > maxWidth && text.length > 3) {
                text = text.substring(0, text.length - 4) + '...';
            }
            
            ctx.fillText(text, logX + padding, logY + padding + index * lineHeight);
        });
        
        // If no entries, show placeholder
        if (this.actionLog.length === 0) {
            ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.text.muted, 0.5) : 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Waiting for actions...', logX + logWidth / 2, logY + logHeight / 2);
        }
    }
    
    renderCombatants(ctx, width, height) {
        // Sprites are now rendered through WebGL via battleSpiritEntities
        // This method only renders the UI overlay (names, HP bars, ATB, status indicators)
        if (!this.battleSystem) return;
        
        const ds = window.ds;
        const camera = this.game.renderSystem?.camera;
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        const worldScale = this.game.worldScale || 1;
        const zoom = camera?.zoom || 1;
        
        if (!camera) return;
        
        // Render UI for each battle spirit entity
        this.battleSpiritEntities.forEach(entity => {
            const spirit = entity._battleSpirit;
            if (!spirit) return;
            
            // Get sprite dimensions
            const finalScale = entity.getFinalScale(this.game);
            const baseWidth = entity.spriteWidth || 64;
            const baseHeight = entity.spriteHeight || 64;
            const spriteWidth = baseWidth * finalScale;
            const spriteHeight = baseHeight * finalScale;
            
            // Get entity world position (scaled for resolution)
            const worldX = entity.x * worldScale;
            const worldY = entity.y * worldScale;
            
            // Calculate where the BOTTOM of the sprite is (base/feet position)
            // Sprites are rendered with origin at center, so bottom = worldY + spriteHeight/2
            let bottomWorldX = worldX;
            let bottomWorldY = worldY + spriteHeight / 2;
            let scaledSpriteHeight = spriteHeight;
            
            // Handle perspective transformation (same as NPC talk bubble)
            if (webglRenderer && webglRenderer.perspectiveStrength > 0 && webglRenderer.viewMatrix) {
                const vm = webglRenderer.viewMatrix;
                const pm = webglRenderer.projectionMatrix;
                const zoomFactor = vm[0];
                
                // Sprite base position (bottom center)
                const baseX = worldX;
                const baseY = worldY + spriteHeight / 2;
                
                // Transform base to clip space
                const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
                const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
                const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
                const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
                
                // Calculate perspective factor
                const depth = (clipY + 1.0) * 0.5;
                const perspectiveW = 1.0 + (depth * webglRenderer.perspectiveStrength);
                const scale = 1.0 / perspectiveW;
                
                // Scaled sprite height
                scaledSpriteHeight = spriteHeight * scale;
                
                // Calculate base position delta
                const screenX_noPerspective = (clipX + 1.0) * 0.5 * width;
                const screenY_noPerspective = (1.0 - clipY) * 0.5 * height;
                const clipX_persp = clipX / perspectiveW;
                const clipY_persp = clipY / perspectiveW;
                const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * width;
                const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * height;
                
                const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
                const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
                const deltaWorldX = deltaScreenX / zoomFactor;
                const deltaWorldY = deltaScreenY / zoomFactor;
                
                // Corrected base position
                bottomWorldX = baseX + deltaWorldX;
                bottomWorldY = baseY + deltaWorldY;
            }
            
            // Convert to screen coordinates
            const screenX = (bottomWorldX - camera.x) * zoom + width / 2 * (1 - zoom);
            const screenY = (bottomWorldY - camera.y) * zoom + height / 2 * (1 - zoom);
            
            // Check selection/targeting state
            const isSelected = spirit === this.selectedPlayerSpirit;
            let isTargeted = false;
            if (this.phase === 'target_select') {
                const targets = this.getSelectableTargets();
                isTargeted = targets[this.selectedTargetIndex] === spirit;
            }
            
            // Render status UI below the sprite (screenX/Y is at sprite's feet)
            this.renderSpiritUI(ctx, spirit, screenX, screenY, spriteWidth, scaledSpriteHeight, isSelected, isTargeted, entity._isPlayerOwned);
        });
    }
    
    /**
     * Render just the UI elements for a battle spirit (name, HP/MP bars, ATB, status)
     * The sprite itself is rendered through WebGL
     */
    renderSpiritUI(ctx, spirit, screenX, screenY, spriteWidth, spriteHeight, isSelected, isTargeted, isPlayerOwned) {
        const ds = window.ds;
        
        // Death effect - dim the UI
        if (!spirit.isAlive) {
            ctx.globalAlpha = 0.5;
        }
        
        // Target cursor animation (pointing at sprite center)
        if (isTargeted) {
            const cursorBob = Math.sin(Date.now() / 200) * 5;
            const spriteCenterY = screenY - spriteHeight / 2; // Center of sprite (screenY is at feet)
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            if (isPlayerOwned) {
                // Point from right side toward player spirits
                ctx.moveTo(screenX + spriteWidth / 2 + 20 - cursorBob, spriteCenterY);
                ctx.lineTo(screenX + spriteWidth / 2 + 10 - cursorBob, spriteCenterY - 10);
                ctx.lineTo(screenX + spriteWidth / 2 + 10 - cursorBob, spriteCenterY + 10);
            } else {
                // Point from left side toward enemy spirits
                ctx.moveTo(screenX - spriteWidth / 2 - 20 + cursorBob, spriteCenterY);
                ctx.lineTo(screenX - spriteWidth / 2 - 10 + cursorBob, spriteCenterY - 10);
                ctx.lineTo(screenX - spriteWidth / 2 - 10 + cursorBob, spriteCenterY + 10);
            }
            ctx.closePath();
            ctx.fill();
        }
        
        // === STATS BELOW SPRITE ===
        // Position UI below the sprite's feet (screenY is at sprite base/feet)
        const uiStartY = screenY + 8; // Small gap below sprite base
        const statsWidth = ds ? ds.spacing(22) : 88;
        const barHeight = 14; // Bar height
        const barSpacing = 2; // Gap between bars
        const barFont = 'bold 11px \'Lato\', sans-serif';
        
        // NOTE: Sprite outline (selection) and damage flash are now rendered in WebGL via Spirit.js
        // The entity syncs _isSelected and _damageFlash properties for the shader effects
        
        // Name with text shadow for readability - ABOVE the bars with more space
        ctx.fillStyle = spirit.isAlive ? '#fff' : '#666';
        ctx.font = ds ? ds.font('xs', 'bold') : 'bold 11px \'Lato\', sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(spirit.name, screenX, uiStartY);
        ctx.shadowBlur = 0;
        
        // HP Bar - starts after name with proper gap
        const hpBarY = uiStartY + 18; // Name text is ~12px, plus 6px gap
        const barWidth = statsWidth;
        const barX = screenX - barWidth / 2;
        
        const hpPercent = spirit.maxHp > 0 ? spirit.currentHp / spirit.maxHp : 0;
        const hpColor = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444';
        
        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, hpBarY, barWidth, barHeight);
        // Bar fill
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, hpBarY, barWidth * hpPercent, barHeight);
        // Text inside bar
        ctx.font = barFont;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${spirit.currentHp}`, screenX, hpBarY + barHeight / 2);
        
        // MP Bar
        const mpBarY = hpBarY + barHeight + barSpacing;
        const mpPercent = spirit.maxMp > 0 ? spirit.currentMp / spirit.maxMp : 0;
        
        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, mpBarY, barWidth, barHeight);
        // Bar fill
        ctx.fillStyle = ds ? ds.colors.primary : '#4da6ff';
        ctx.fillRect(barX, mpBarY, barWidth * mpPercent, barHeight);
        // Text inside bar
        ctx.font = barFont;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${spirit.currentMp}`, screenX, mpBarY + barHeight / 2);
        
        // ATB Bar or Casting Bar
        const atbY = mpBarY + barHeight + barSpacing;
        const atbWidth = barWidth;
        const atbX = barX;
        
        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(atbX, atbY, atbWidth, barHeight);
        
        if (spirit.isCasting && spirit.castDuration > 0) {
            const castPercent = spirit.castTimer / spirit.castDuration;
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(atbX, atbY, atbWidth * castPercent, barHeight);
            // Text inside bar
            ctx.font = barFont;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CAST', screenX, atbY + barHeight / 2);
        } else {
            const atbPercent = this.battleSystem ? spirit.atb / this.battleSystem.ATB_MAX : 0;
            const atbFillColor = spirit.isReady ? '#ffd700' : '#666';
            ctx.fillStyle = atbFillColor;
            ctx.fillRect(atbX, atbY, atbWidth * atbPercent, barHeight);
            // Text inside bar
            ctx.font = barFont;
            ctx.fillStyle = spirit.isReady ? '#000' : '#aaa';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(spirit.isReady ? 'READY' : 'ATB', screenX, atbY + barHeight / 2);
        }
        
        // Active indicator is now the pulsing border around the status UI
        
        ctx.globalAlpha = 1;
    }
    
    // Stats are now rendered under each spirit in renderSpirit
    renderStatusBars(ctx, width, height) {
        // No longer needed - stats shown under each spirit
    }
    
    renderActionMenu(ctx, width, height) {
        const ds = window.ds;
        const menuRenderer = this.game.menuRenderer;
        
        // Menu dimensions - positioned at bottom-left corner
        const padding = ds ? ds.spacing(3) : 12;
        const itemHeight = ds ? ds.spacing(6) : 24;
        const menuWidth = ds ? ds.spacing(28) : 112;
        const menuHeight = this.menuOptions.length * itemHeight + padding * 2;
        const menuX = ds ? ds.spacing(4) : 16;
        const menuY = height - menuHeight - (ds ? ds.spacing(4) : 16);
        
        // Draw panel background using design system
        if (menuRenderer && menuRenderer.drawPanel) {
            menuRenderer.drawPanel(ctx, menuX, menuY, menuWidth, menuHeight, 0.9);
        } else {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
            ctx.strokeStyle = ds ? ds.colors.primary : '#4a9eff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 4);
            ctx.fill();
            ctx.stroke();
        }
        
        // Menu options
        const fontSize = ds ? ds.fontSize('sm') : 14;
        this.menuOptions.forEach((option, index) => {
            const optionY = menuY + padding + index * itemHeight;
            const isSelected = index === this.selectedMenuOption;
            const isDisabled = (option === 'Flee' && !this.battleSystem?.canFlee) ||
                             (option === 'Seal' && !this.battleSystem?.canSeal);
            
            // Selection highlight
            if (isSelected && ds) {
                ds.drawSelectionHighlight(ctx, menuX + 2, optionY - 2, menuWidth - 4, itemHeight);
            } else if (isSelected) {
                ctx.fillStyle = 'rgba(74, 158, 255, 0.2)';
                ctx.fillRect(menuX + 4, optionY - 2, menuWidth - 8, itemHeight);
            }
            
            // Option text
            ctx.fillStyle = isDisabled ? (ds ? ds.colors.text.disabled : '#555') : 
                           (isSelected ? (ds ? ds.colors.text.primary : '#fff') : 
                           (ds ? ds.colors.text.secondary : '#aaa'));
            ctx.font = ds ? ds.font('sm', isSelected ? 'bold' : 'normal') : 
                      `${isSelected ? 'bold ' : ''}${fontSize}px 'Lato', sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(option, menuX + padding + (ds ? ds.spacing(4) : 16), optionY + itemHeight / 2);
            
            // Selection diamond cursor
            if (isSelected) {
                ctx.fillStyle = ds ? ds.colors.primary : '#4a9eff';
                const diamondX = menuX + padding;
                const diamondY = optionY + itemHeight / 2;
                const diamondSize = ds ? ds.spacing(1.5) : 6;
                ctx.beginPath();
                ctx.moveTo(diamondX, diamondY - diamondSize);
                ctx.lineTo(diamondX + diamondSize, diamondY);
                ctx.lineTo(diamondX, diamondY + diamondSize);
                ctx.lineTo(diamondX - diamondSize, diamondY);
                ctx.closePath();
                ctx.fill();
            }
        });
    }
    
    renderAbilityMenu(ctx, width, height) {
        if (!this.selectedPlayerSpirit) return;
        
        const ds = window.ds;
        const menuRenderer = this.game.menuRenderer;
        // Filter out basic attack - we have a separate Attack option
        const abilities = (this.selectedPlayerSpirit.abilities || []).filter(a => a.id !== 'attack');
        
        if (abilities.length === 0) {
            // No abilities to show
            return;
        }
        
        // Menu dimensions - positioned to the right of action menu
        const padding = ds ? ds.spacing(4) : 16;
        const titleHeight = ds ? ds.spacing(7) : 28;
        const itemHeight = ds ? ds.spacing(9) : 36;
        const menuWidth = ds ? ds.spacing(45) : 180;
        const menuHeight = titleHeight + abilities.length * itemHeight + padding * 2;
        const menuX = ds ? ds.spacing(64) : 256; // To the right of action menu
        const menuY = height - menuHeight - (ds ? ds.spacing(28) : 112); // Above action log
        
        // Draw panel background using design system
        if (menuRenderer && menuRenderer.drawPanel) {
            menuRenderer.drawPanel(ctx, menuX, menuY, menuWidth, menuHeight, 0.9);
        } else {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 4);
            ctx.fill();
            ctx.stroke();
        }
        
        // Title
        ctx.fillStyle = ds ? ds.colors.text.primary : '#fff';
        ctx.font = ds ? ds.font('sm', 'bold') : 'bold 14px \'Lato\', sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Abilities', menuX + padding, menuY + padding + titleHeight / 2);
        
        // Abilities
        abilities.forEach((ability, index) => {
            const abilityY = menuY + padding + titleHeight + index * itemHeight;
            const isSelected = index === this.selectedAbilityIndex;
            const canUse = this.selectedPlayerSpirit.currentMp >= ability.mpCost;
            
            // Selection highlight
            if (isSelected && ds) {
                ds.drawSelectionHighlight(ctx, menuX + 2, abilityY, menuWidth - 4, itemHeight);
            } else if (isSelected) {
                ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
                ctx.fillRect(menuX + 4, abilityY, menuWidth - 8, itemHeight);
            }
            
            // Ability name
            ctx.fillStyle = canUse ? (isSelected ? (ds ? ds.colors.text.primary : '#fff') : 
                           (ds ? ds.colors.text.secondary : '#aaa')) : (ds ? ds.colors.text.disabled : '#555');
            ctx.font = ds ? ds.font('sm', isSelected ? 'bold' : 'normal') : `${isSelected ? 'bold ' : ''}14px 'Lato', sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(ability.name, menuX + padding + (ds ? ds.spacing(4) : 16), abilityY + itemHeight / 2 - 6);
            
            // MP cost
            ctx.fillStyle = canUse ? (ds ? ds.colors.primary : '#4da6ff') : (ds ? ds.colors.text.disabled : '#555');
            ctx.font = ds ? ds.font('xs') : '11px \'Lato\', sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${ability.mpCost} MP`, menuX + menuWidth - padding, abilityY + itemHeight / 2 - 6);
            
            // Element indicator
            if (ability.element) {
                const elementColors = { fire: '#ff6b35', water: '#4da6ff', earth: '#8b7355', wind: '#98fb98' };
                ctx.fillStyle = elementColors[ability.element] || '#888';
                ctx.font = ds ? ds.font('xs') : '10px \'Lato\', sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(ability.element.toUpperCase(), menuX + padding + (ds ? ds.spacing(4) : 16), abilityY + itemHeight / 2 + 8);
            }
            
            // Selection diamond cursor
            if (isSelected) {
                ctx.fillStyle = '#8b5cf6';
                const diamondX = menuX + padding;
                const diamondY = abilityY + itemHeight / 2;
                const diamondSize = ds ? ds.spacing(1.5) : 6;
                ctx.beginPath();
                ctx.moveTo(diamondX, diamondY - diamondSize);
                ctx.lineTo(diamondX + diamondSize, diamondY);
                ctx.lineTo(diamondX, diamondY + diamondSize);
                ctx.lineTo(diamondX - diamondSize, diamondY);
                ctx.closePath();
                ctx.fill();
            }
        });
    }
    
    renderTargetCursor(ctx, width, height) {
        // Target cursor is rendered in renderCombatants
    }
    
    renderDamageNumbers(ctx) {
        const ds = window.ds;
        
        // Render action texts first (behind damage numbers)
        this.actionTexts.forEach(at => {
            ctx.globalAlpha = at.alpha;
            ctx.fillStyle = '#ffd700';
            ctx.font = ds ? ds.font('md', 'bold') : 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(at.text, at.x, at.y);
            ctx.shadowBlur = 0;
        });
        
        // Render damage/heal numbers
        this.damageNumbers.forEach(dn => {
            ctx.globalAlpha = dn.alpha;
            
            // Draw crit star effect behind number (Ragnarok Online style)
            if (dn.isCrit) {
                ctx.save();
                const starSize = 30 + (1 - dn.alpha) * 20; // Expand as it fades
                const starRotation = dn.timer * 2; // Spin
                ctx.translate(dn.x, dn.y);
                ctx.rotate(starRotation);
                
                // Red star burst
                ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
                const points = 6;
                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const radius = i % 2 === 0 ? starSize : starSize * 0.4;
                    const angle = (i * Math.PI) / points;
                    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            
            // Main damage number - LARGE and visible
            ctx.fillStyle = dn.isHeal ? '#4ade80' : (dn.isCrit ? '#ff4444' : '#fff');
            const fontSize = dn.isCrit ? 42 : 32; // Larger sizes
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = dn.isHeal ? '#1a5a30' : '#000';
            ctx.lineWidth = 3;
            
            // Build display text
            let text = dn.isHeal ? `+${dn.value}` : `${dn.value}`;
            if (dn.isCrit) text += '!';
            // Draw stroke for better visibility
            ctx.strokeText(text, dn.x, dn.y);
            ctx.fillText(text, dn.x, dn.y);
            
            // Additional info below the main number
            if (!dn.isHeal) {
                ctx.font = 'bold 12px Arial';
                let yOffset = fontSize / 2 + 12;
                
                // Absorbed damage indicator
                if (dn.absorbed > 0) {
                    ctx.fillStyle = 'rgba(150, 150, 150, ' + dn.alpha + ')';
                    ctx.fillText(`(-${dn.absorbed})`, dn.x, dn.y + yOffset);
                    yOffset += 14;
                }
                
                // Effectiveness multiplier
                if (dn.effectiveness > 1) {
                    ctx.fillStyle = 'rgba(255, 200, 50, ' + dn.alpha + ')';
                    ctx.fillText(`x${dn.effectiveness.toFixed(1)}`, dn.x, dn.y + yOffset);
                } else if (dn.effectiveness < 1) {
                    ctx.fillStyle = 'rgba(100, 150, 255, ' + dn.alpha + ')';
                    ctx.fillText(`x${dn.effectiveness.toFixed(1)}`, dn.x, dn.y + yOffset);
                }
            }
            
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
    }
    
    renderResults(ctx, width, height) {
        if (!this.battleSystem) return;
        
        const ds = window.ds;
        const menuRenderer = this.game.menuRenderer;
        const result = this.battleSystem.result;
        const rewards = this.battleSystem.rewards;
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        
        // Results box - use design system sizing
        const boxWidth = ds ? ds.spacing(80) : 320;
        const boxHeight = ds ? ds.spacing(60) : 240;
        const boxX = (width - boxWidth) / 2;
        const boxY = (height - boxHeight) / 2;
        const padding = ds ? ds.spacing(6) : 24;
        
        // Draw panel background using design system
        if (menuRenderer && menuRenderer.drawPanel) {
            menuRenderer.drawPanel(ctx, boxX, boxY, boxWidth, boxHeight, 0.95);
        } else {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
            ctx.fill();
        }
        
        // Border with result color
        ctx.strokeStyle = result === 'victory' ? '#ffd700' : (result === 'fled' ? '#888' : '#ff4444');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.stroke();
        
        // Draw corner accents
        if (ds) {
            ds.drawCornerAccents(ctx, boxX, boxY, boxWidth, boxHeight, ctx.strokeStyle);
        }
        
        // Result title
        ctx.fillStyle = result === 'victory' ? '#ffd700' : (result === 'fled' ? '#888' : '#ff4444');
        ctx.font = ds ? ds.font('xl', 'bold', 'display') : 'bold 28px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const titleText = result === 'victory' ? 'VICTORY!' : (result === 'fled' ? 'ESCAPED' : 'DEFEAT');
        ctx.fillText(titleText, width / 2, boxY + padding);
        
        // Content area
        const contentY = boxY + padding + (ds ? ds.fontSize('xl') : 28) + padding;
        
        // Rewards (only for victory)
        if (result === 'victory') {
            ctx.fillStyle = ds ? ds.colors.text.primary : '#fff';
            ctx.font = ds ? ds.font('md') : '16px Lato, sans-serif';
            ctx.textAlign = 'center';
            
            ctx.fillText(`EXP Gained: ${rewards.exp}`, width / 2, contentY);
            ctx.fillText(`Gold Earned: ${rewards.gold}`, width / 2, contentY + (ds ? ds.spacing(8) : 32));
            
            // Items
            if (rewards.items && rewards.items.length > 0) {
                ctx.fillStyle = ds ? ds.colors.text.secondary : '#aaa';
                ctx.fillText('Items Found:', width / 2, contentY + (ds ? ds.spacing(18) : 72));
                
                ctx.fillStyle = ds ? ds.colors.text.primary : '#fff';
                ctx.font = ds ? ds.font('sm') : '14px Lato, sans-serif';
                rewards.items.slice(0, 3).forEach((item, i) => {
                    ctx.fillText(`• ${item.name}`, width / 2, contentY + (ds ? ds.spacing(24) : 96) + i * (ds ? ds.spacing(5) : 20));
                });
            }
        } else if (result === 'fled') {
            ctx.fillStyle = ds ? ds.colors.text.muted : '#888';
            ctx.font = ds ? ds.font('md') : '16px Lato, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('You escaped from battle.', width / 2, contentY + (ds ? ds.spacing(6) : 24));
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.font = ds ? ds.font('md') : '16px Lato, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Your party was defeated...', width / 2, contentY + (ds ? ds.spacing(6) : 24));
        }
        
        // Continue prompt
        if (this.resultsTimer > 1.0) {
            ctx.fillStyle = ds ? ds.colors.text.muted : '#666';
            ctx.font = ds ? ds.font('xs') : '12px Lato, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Press CONFIRM to continue', width / 2, boxY + boxHeight - padding);
        }
    }
    
    // Helper to add damage number (legacy - use spawnDamageNumber instead)
    addDamageNumber(x, y, value, isHeal = false, isCrit = false) {
        this.damageNumbers.push({
            x, y,
            value,
            isHeal,
            isCrit,
            effectiveness: 1.0,
            absorbed: 0,
            timer: 0,
            duration: 1.2,
            alpha: 1
        });
    }
    
    /**
     * Get screen position for a battle spirit
     */
    getSpiritScreenPosition(spirit) {
        const entity = this.battleSpiritEntities.find(e => e._battleSpirit === spirit);
        if (!entity) return null;
        
        const worldScale = this.game.worldScale || 1;
        const camera = this.game.renderSystem?.camera;
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        
        if (!camera) return null;
        
        // Get entity world position
        const worldX = entity.x * worldScale;
        const worldY = entity.y * worldScale;
        
        // Get sprite dimensions
        const finalScale = entity.getFinalScale(this.game);
        const baseHeight = entity.spriteHeight || 64;
        const spriteHeight = baseHeight * finalScale;
        
        // Calculate screen position accounting for perspective
        let screenX, screenY;
        const width = this.game.CANVAS_WIDTH;
        const height = this.game.CANVAS_HEIGHT;
        
        if (webglRenderer && webglRenderer.perspectiveStrength > 0 && webglRenderer.viewMatrix) {
            const vm = webglRenderer.viewMatrix;
            const pm = webglRenderer.projectionMatrix;
            
            // Center of sprite
            const viewX = worldX * vm[0] + worldY * vm[4] + vm[12];
            const viewY = worldX * vm[1] + worldY * vm[5] + vm[13];
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * webglRenderer.perspectiveStrength);
            const clipX_persp = clipX / perspectiveW;
            const clipY_persp = clipY / perspectiveW;
            
            screenX = (clipX_persp + 1.0) * 0.5 * width;
            screenY = (1.0 - clipY_persp) * 0.5 * height;
        } else {
            screenX = worldX - camera.x;
            screenY = worldY - camera.y;
        }
        
        return { x: screenX, y: screenY - spriteHeight / 2, spriteHeight };
    }
    
    /**
     * Spawn floating damage number on a target spirit
     */
    spawnDamageNumber(target, meta) {
        const pos = this.getSpiritScreenPosition(target);
        if (!pos) return;
        
        // Random horizontal velocity for dramatic fountain arc effect
        const vx = (Math.random() - 0.5) * 200; // More horizontal spread
        const vy = -180 - Math.random() * 80; // Stronger upward burst
        
        this.damageNumbers.push({
            x: pos.x,
            y: pos.y,
            vx: vx,
            vy: vy,
            value: meta.damage,
            isHeal: false,
            isCrit: meta.isCrit || false,
            effectiveness: meta.effectiveness || 1.0,
            absorbed: meta.absorbed || 0,
            timer: 0,
            duration: 1.5,
            alpha: 1
        });
    }
    
    /**
     * Spawn floating heal number on a target spirit
     */
    spawnHealNumber(target, amount) {
        const pos = this.getSpiritScreenPosition(target);
        if (!pos) return;
        
        // Random horizontal velocity for fountain arc effect
        const vx = (Math.random() - 0.5) * 60;
        const vy = -80 - Math.random() * 40; // Initial upward velocity
        
        this.damageNumbers.push({
            x: pos.x,
            y: pos.y,
            vx: vx,
            vy: vy,
            value: amount,
            isHeal: true,
            isCrit: false,
            effectiveness: 1.0,
            absorbed: 0,
            timer: 0,
            duration: 1.2,
            alpha: 1
        });
    }
    
    /**
     * Spawn action text above a spirit (e.g., "Attack", "Gust")
     */
    spawnActionText(user, actionName) {
        const pos = this.getSpiritScreenPosition(user);
        if (!pos) return;
        
        this.actionTexts.push({
            x: pos.x,
            y: pos.y - pos.spriteHeight / 2 - 20,
            text: actionName,
            timer: 0,
            duration: 1.0,
            alpha: 1
        });
    }
}

// Export for use in other files
window.GameStateManager = GameStateManager;
window.GameState = GameState;
