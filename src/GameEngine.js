/**
 * GameEngine - Core game engine with proper separation of concerns
 * Manages the main game loop and coordinates all systems
 */
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.debug = document.getElementById('debug');
        
        // Event listener cleanup tracking (MUST be initialized BEFORE setupCanvas)
        this.eventListeners = [];
        
        // Responsive canvas sizing
        // Desktop: Fixed 1920x1080 (scaled by CSS)
        // Mobile: Full device resolution (native size)
        this.isMobile = this.detectMobile();
        
        // Base resolution for sprite scaling (1920x1080 is our design resolution)
        this.BASE_WIDTH = 1920;
        this.BASE_HEIGHT = 1080;
        
        if (this.isMobile) {
            // Mobile: Use full native resolution for sharp rendering
            this.CANVAS_WIDTH = window.innerWidth;
            this.CANVAS_HEIGHT = window.innerHeight;
        } else {
            // Desktop: Fixed resolution scaled by CSS
            this.CANVAS_WIDTH = 1920;
            this.CANVAS_HEIGHT = 1080;
        }
        
        // Calculate resolution scale factor (how much to scale sprites relative to base resolution)
        // This ensures sprites look proportionally correct on any screen size
        this.resolutionScale = Math.min(
            this.CANVAS_WIDTH / this.BASE_WIDTH,
            this.CANVAS_HEIGHT / this.BASE_HEIGHT
        );
        
        console.log(`[GameEngine] Resolution scale: ${this.resolutionScale.toFixed(3)} (${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT} / ${this.BASE_WIDTH}x${this.BASE_HEIGHT})`);
        
        this.setupCanvas();
        
        // Data loader (must be created first)
        this.dataLoader = new DataLoader();
        
        // Static object registry for template management
        this.staticObjectRegistry = new StaticObjectRegistry();
        
        // Spirit registry for spirit templates
        this.spiritRegistry = new SpiritRegistry(this);
        
        // Core systems
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager();
        this.stateManager = new GameStateManager(this);
        
        // Game systems (now accept dataLoader)
        this.mapManager = new MapManager(this.dataLoader);
        this.objectManager = new ObjectManager(this.dataLoader); // NEW: Unified object manager
        this.itemManager = new ItemManager(this.dataLoader);
        this.inventoryManager = new InventoryManager(this.itemManager);
        
        // NEW: Specialized subsystems for better architecture
        this.layerManager = new LayerManager(); // Multi-layer map system
        this.renderSystem = new RenderSystem(this.canvas, this.ctx);
        this.collisionSystem = new CollisionSystem();
        this.interactionSystem = new InteractionSystem();
        this.settingsManager = new SettingsManager();
        this.performanceMonitor = new PerformanceMonitor();
        this.saveGameManager = new SaveGameManager();
        
        // Touch controls for mobile
        this.touchControlsUI = null;
        if (this.inputManager.isMobile) {
            this.touchControlsUI = new TouchControlsUI(this.inputManager);
            console.log('📱 Touch controls UI initialized');
        }
        
        // Editor system
        this.editorManager = new EditorManager(this);
        
        // Day/Night cycle system with shader support
        this.dayNightCycle = new DayNightCycle(this.canvas);
        
        // Weather system
        this.weatherSystem = new WeatherSystem(this);
        
        // Spawn system for spirits
        this.spawnManager = new SpawnManager(this);
        
        // Template system for objects
        this.templateManager = new TemplateManager(this);
        
        // Game state
        this.currentMapId = '0-0';
        this.currentMap = null;
        this.maps = {};
        
        // Playtime tracking (in seconds)
        this.playtime = 0;
        
        // Player - use proper Player class instance
        this.player = null;
        this.initializePlayer();
        
        // Camera system (delegated to RenderSystem, but keep reference for compatibility)
        this.camera = this.renderSystem.camera;
        
        // Performance tracking (delegated to PerformanceMonitor, but keep reference for compatibility)
        this.fpsCounter = this.performanceMonitor;
        
        // Debug controls
        this.isPaused = false;
        
        // Load saved settings using new SettingsManager
        this.settingsManager.load();
        this.settings = this.settingsManager.getAll();
        
        // Apply loaded settings to audio manager
        this.applyAudioSettings();
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize the game engine
     */
    async initialize() {
        try {
            console.log('[GameEngine] Loading game data...');
            
            // Load all game data from JSON files
            await this.dataLoader.loadAll();
            
            // Initialize managers with loaded data
            await this.mapManager.initialize();
            await this.objectManager.initialize();
            await this.itemManager.initialize();
            
            // Load spirit templates
            await this.spiritRegistry.load();
            
            // Initialize template manager
            await this.templateManager.initialize();
            
            this.maps = this.mapManager.maps;
            
            console.log('[GameEngine] ✅ All game data loaded successfully');
            
            // Don't load map yet - wait until game starts
            
            // Start game loop
            this.startGameLoop();
            
            console.log('[GameEngine] Game engine initialized successfully');
        } catch (error) {
            console.error('[GameEngine] Failed to initialize game engine:', error);
            throw error;
        }
    }
    
    /**
     * Initialize player using proper Player class
     */
    initializePlayer() {
        this.player = new Player({
            x: 768,
            y: 512,
            spriteSrc: 'assets/npc/main-0.png',
            scale: 0.12,
            gold: 100
        });
    }
    
    /**
     * Detect if device is mobile/tablet
     */
    detectMobile() {
        // Check for touch support and small screen size
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 768;
        return isTouchDevice && isSmallScreen;
    }

    /**
     * Setup canvas with smart scaling
     * - Small screens: Use actual dimensions (fill mode)
     * - Large screens: Cap at base resolution, CSS scales up
     */
    setupCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxWidth = this.BASE_WIDTH;  // 1920
        const maxHeight = this.BASE_HEIGHT; // 1080
        
        // Determine canvas logical size
        if (screenWidth <= maxWidth && screenHeight <= maxHeight) {
            // Small screen: use actual dimensions
            this.CANVAS_WIDTH = screenWidth;
            this.CANVAS_HEIGHT = screenHeight;
        } else {
            // Large screen: cap at base resolution
            this.CANVAS_WIDTH = maxWidth;
            this.CANVAS_HEIGHT = maxHeight;
        }
        
        // Recalculate resolution scale
        this.resolutionScale = Math.min(
            this.CANVAS_WIDTH / this.BASE_WIDTH,
            this.CANVAS_HEIGHT / this.BASE_HEIGHT
        );
        
        console.log(`[GameEngine] Canvas: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}, Scale: ${this.resolutionScale.toFixed(3)}`);
        
        if (this.isMobile) {
            // Mobile: Dynamic resize handling
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.cursor = 'none';
            
            // Set actual canvas size (scaled for high DPI)
            this.canvas.width = this.CANVAS_WIDTH * devicePixelRatio;
            this.canvas.height = this.CANVAS_HEIGHT * devicePixelRatio;
            
            // Scale context back to logical pixels
            this.ctx.scale(devicePixelRatio, devicePixelRatio);
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Handle mobile resize/orientation change
            this.handleResize = () => {
                const newWidth = window.innerWidth;
                const newHeight = window.innerHeight;
                
                // Apply same logic: cap at base resolution for large screens
                if (newWidth <= maxWidth && newHeight <= maxHeight) {
                    this.CANVAS_WIDTH = newWidth;
                    this.CANVAS_HEIGHT = newHeight;
                } else {
                    this.CANVAS_WIDTH = maxWidth;
                    this.CANVAS_HEIGHT = maxHeight;
                }
                
                // Recalculate resolution scale
                this.resolutionScale = Math.min(
                    this.CANVAS_WIDTH / this.BASE_WIDTH,
                    this.CANVAS_HEIGHT / this.BASE_HEIGHT
                );
                console.log(`[GameEngine] Resize: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}, Scale: ${this.resolutionScale.toFixed(3)}`);
                
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = this.CANVAS_WIDTH * dpr;
                this.canvas.height = this.CANVAS_HEIGHT * dpr;
                this.ctx.scale(dpr, dpr);
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
            };
            
            window.addEventListener('resize', this.handleResize);
            window.addEventListener('orientationchange', this.handleResize);
            this.eventListeners.push({ target: window, type: 'resize', handler: this.handleResize });
            this.eventListeners.push({ target: window, type: 'orientationchange', handler: this.handleResize });
        } else {
            // Desktop: Same logic, but with CSS scaling
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.cursor = 'none';
            
            this.canvas.width = this.CANVAS_WIDTH * devicePixelRatio;
            this.canvas.height = this.CANVAS_HEIGHT * devicePixelRatio;
            this.ctx.scale(devicePixelRatio, devicePixelRatio);
            
            // Enable smooth scaling for better quality on desktop
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
        }
        
        // Common settings
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.textRendering = 'optimizeQuality';
    }
    
    /**
     * Handle debug key presses
     */
    handleDebugKeys = (e) => {
        if (e.code === 'KeyP') {
            this.isPaused = !this.isPaused;
            console.log(`Game ${this.isPaused ? 'PAUSED' : 'UNPAUSED'}`);
            
            // Pause/resume audio
            if (this.audioManager) {
                if (this.isPaused) {
                    this.audioManager.pauseAll();
                } else {
                    this.audioManager.resumeAll();
                }
            }
        }
        
        // F1 - Toggle debug info display
        if (e.code === 'F1') {
            this.settings.showDebugInfo = !this.settings.showDebugInfo;
            console.log(`Debug info ${this.settings.showDebugInfo ? 'ENABLED' : 'DISABLED'}`);
            e.preventDefault(); // Prevent browser's help menu
        }
        
        // F5 - Clear audio cache and debug
        if (e.code === 'F5') {
            this.audioManager.clearAudioCache();
            this.debugAudioAssignments();
            console.log('Audio cache cleared! Refresh the page for fresh audio.');
        }
        
        // F6 - Debug audio assignments
        if (e.code === 'F6') {
            this.debugAudioAssignments();
        }
        
        // F6/F7 - Day/Night cycle time scale controls (when available and enabled for map)
        if (this.dayNightCycle && this.currentMap?.dayNightCycle) {
            // F6 - Increase time scale by 10x (in addition to audio debug)
            if (e.code === 'F6') {
                const newScale = Math.min(2000, this.dayNightCycle.timeScale + 10);
                this.dayNightCycle.setTimeScale(newScale);
                console.log(`⏩ Time scale increased to ${newScale}x`);
                e.preventDefault();
            }
            
            // F7 - Decrease time scale by 10x
            if (e.code === 'F7') {
                const newScale = Math.max(0, this.dayNightCycle.timeScale - 10);
                this.dayNightCycle.setTimeScale(newScale);
                console.log(`⏪ Time scale decreased to ${newScale}x`);
                e.preventDefault();
            }
        }
    }

    /**
     * Handle mouse clicks for editor
     * Note: This is now handled by EditorManager's own event listeners
     * to avoid duplicate event handling
     */
    handleMouseClick = (e) => {
        // EditorManager now handles its own mouse events
        // This handler is kept for backwards compatibility but does nothing
        // when editor is active
    }

    /**
     * Start the main game loop
     */
    startGameLoop() {
        // Add pause control with P key and debug controls
        document.addEventListener('keydown', this.handleDebugKeys);
        this.eventListeners.push({ target: document, type: 'keydown', handler: this.handleDebugKeys });
        
        // Add mouse click handler for editor
        this.canvas.addEventListener('mousedown', this.handleMouseClick);
        this.eventListeners.push({ target: this.canvas, type: 'mousedown', handler: this.handleMouseClick });
        
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Set gameTime for animations (in milliseconds)
            this.gameTime = currentTime;
            
            if (!this.isPaused) {
                this.update(deltaTime);
                this.render();
                this.updateFPS(deltaTime);
            } else {
                // Still render when paused, just don't update game logic
                this.render();
                
                // Update editor even when paused (for mouse tracking and preview)
                if (this.editorManager && this.editorManager.isActive) {
                    this.editorManager.update(deltaTime);
                }
                
                // Show pause indicator (but not when editor is active)
                if (!this.editorManager || !this.editorManager.isActive) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '48px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('PAUSED', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
                    this.ctx.fillText('Press P to continue', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 60);
                }
            }
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    /**
     * Main update loop
     */
    update(deltaTime) {
        // Handle input for current state BEFORE updating input state
        this.stateManager.handleInput(this.inputManager);
        
        // Update input state (this stores current frame as previous frame)
        this.inputManager.update();
        
        // Update current state
        this.stateManager.update(deltaTime);
    }
    
    /**
     * Main render loop
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Render current state
        this.stateManager.render(this.ctx);
        
        // Render editor overlay
        this.editorManager.render(this.ctx);
        
        // Render debug info if enabled
        if (this.settings.showDebugInfo) {
            this.renderDebugInfo();
        }
    }
    
    /**
     * Update gameplay (called by PlayingState)
     */
    updateGameplay(deltaTime) {
        if (!this.player || !this.currentMap) return;
        
        // Track playtime
        this.playtime += deltaTime;
        
        // Update day/night cycle if enabled for this map
        if (this.currentMap.dayNightCycle && this.dayNightCycle) {
            this.dayNightCycle.update(deltaTime);
        }
        
        // Update weather system if enabled for this map
        if (this.currentMap.weather && this.weatherSystem) {
            this.weatherSystem.update(deltaTime);
        }
        
        // Update spawn manager for spirit spawning
        if (this.spawnManager) {
            this.spawnManager.update(deltaTime);
        }
        
        // Handle input for gameplay
        this.handleGameplayInput(this.inputManager);
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Update all objects on current map (NPCs, trees, chests, etc.)
        this.objectManager.updateObjects(this.currentMapId, deltaTime, this);
        
        // Update camera
        this.updateCamera();
        
        // Check collisions
        this.checkPortalCollisions();
    }
    
    /**
     * Render gameplay (called by PlayingState)
     */
    renderGameplay(ctx) {
        if (!this.currentMap || !this.player) return;
        
        // Use RenderSystem for world rendering
        const allObjects = this.objectManager.getObjectsForMap(this.currentMapId);
        const npcs = this.objectManager.getNPCsForMap(this.currentMapId);
        const nonNPCObjects = allObjects.filter(obj => !(obj instanceof NPC || obj instanceof Spirit));
        
        this.renderSystem.renderWorld(
            this.currentMap,
            nonNPCObjects,
            npcs,
            this.player,
            this
        );
        
        // Render UI elements (not affected by camera)
        this.renderUI(ctx);
    }
    
    /**
     * Handle gameplay input
     */
    handleGameplayInput(inputManager) {
        if (!this.player) return;
        
        // Skip if editor is active
        if (this.editorManager.isActive) return;
        
        // Get movement input
        const movement = inputManager.getMovementInput();
        
        // Set player input
        this.player.setInput({
            moveX: movement.x,
            moveY: movement.y,
            isRunning: inputManager.isPressed('run')
        });
        
        // Handle interactions
        if (inputManager.isJustPressed('interact')) {
            this.handleInteraction();
        }
        
        // Handle inventory
        if (inputManager.isJustPressed('inventory')) {
            this.stateManager.pushState('INVENTORY');
        }
    }
    
    /**
     * Handle player interactions
     */
    handleInteraction() {
        // Check for interactive objects first
        const interactiveObj = this.objectManager.checkNearbyInteractions(this.player, this.currentMapId);
        if (interactiveObj) {
            const result = this.objectManager.handleInteraction(interactiveObj, this.player, this);
            this.handleInteractionResult(result);
            return;
        }
        
        // Check for NPCs
        const npc = this.findClosestInteractableNPC();
        if (npc) {
            this.handleNPCInteraction(npc);
        }
    }
    
    /**
     * Handle interaction results
     */
    handleInteractionResult(result) {
        switch (result.type) {
            case 'loot':
                this.stateManager.pushState('LOOT_WINDOW', result);
                break;
            case 'portal':
                this.handlePortalTeleport(result);
                break;
            case 'dialogue':
                this.stateManager.pushState('DIALOGUE', { message: result.message });
                break;
        }
    }
    
    /**
     * Handle NPC interactions
     */
    handleNPCInteraction(npc) {
        if (npc.type === 'merchant') {
            this.stateManager.pushState('SHOP', { npc: npc });
        } else {
            // Play speech bubble sound and show dialogue
            this.audioManager.playEffect('speech-bubble.mp3');
            this.stateManager.pushState('DIALOGUE', { npc: npc });
        }
    }
    
    /**
     * Check for portal collisions
     */
    checkPortalCollisions() {
        const portal = this.objectManager.checkPortalCollisions(this.player, this.currentMapId, this);
        if (portal) {
            this.teleportToMap(portal.targetMap, portal.spawnPoint);
        }
    }
    
    /**
     * Teleport to a different map
     */
    async teleportToMap(mapId, x, y) {
        try {
            await this.loadMap(mapId);
            if (x !== undefined && y !== undefined && this.player) {
                this.player.setPosition(x, y);
            }
            this.updateCamera();
        } catch (error) {
            console.error('Failed to teleport to map:', error);
        }
    }
    
    /**
     * Load a map
     */
    async loadMap(mapId) {
        const mapData = this.mapManager.getMapData(mapId);
        if (!mapData) {
            throw new Error(`Map not found: ${mapId}`);
        }
        
        // Check if we're loading a different map
        const previousMapId = this.currentMapId;
        const isDifferentMap = previousMapId !== mapId;
        
        console.log('🗺️ Loading map:', mapId, 'Previous:', previousMapId, 'Different:', isDifferentMap);
        
        // Load map image
        await this.mapManager.loadMap(mapId);
        
        this.currentMapId = mapId;
        this.currentMap = mapData;
        
        // Initialize layers for this map (creates base layer if doesn't exist)
        this.layerManager.initializeMapLayers(mapId);
        
        // Set base layer's background to the map image
        const baseLayer = this.layerManager.getLayers(mapId)[0];
        if (baseLayer && this.currentMap.image) {
            baseLayer.backgroundImage = this.currentMap.image;
        }
        
        // Load all objects for this map (NPCs, trees, chests, portals, etc.)
        this.objectManager.loadObjectsForMap(mapId);
        
        // Handle BGM - extract just the filename from the full path
        let bgmFilename = null;
        if (mapData.music) {
            bgmFilename = mapData.music.split('/').pop(); // Get just the filename like '01.mp3'
        }
        
        console.log('🎵 Requesting BGM:', bgmFilename);
        this.audioManager.playBGM(bgmFilename); // AudioManager handles duplicate detection
        
        // Handle Ambience - extract just the filename from the full path
        let ambienceFilename = null;
        if (mapData.ambience) {
            ambienceFilename = mapData.ambience.split('/').pop(); // Get just the filename like 'forest-0.mp3'
        }
        
        console.log('🌲 Requesting Ambience:', ambienceFilename);
        this.audioManager.playAmbience(ambienceFilename); // AudioManager handles duplicate detection
        
        // Initialize weather system for this map
        if (this.weatherSystem) {
            this.weatherSystem.setWeather(mapData.weather || null);
        }
        
        // Initialize spawn system for this map
        if (this.spawnManager) {
            this.spawnManager.initialize(mapId);
        }
        
        console.log(`Loaded map: ${mapId}`);
    }
    

    
    /**
     * Update camera system
     */
    updateCamera() {
        if (!this.player || !this.currentMap) return;
        
        // Calculate actual map dimensions (accounting for both map scale and resolution scale)
        const mapScale = this.currentMap.scale || 1.0;
        const actualMapWidth = this.currentMap.width * mapScale * this.resolutionScale;
        const actualMapHeight = this.currentMap.height * mapScale * this.resolutionScale;
        
        // Get scaled player position for camera following
        const scaledPlayerX = this.player.getScaledX(this);
        const scaledPlayerY = this.player.getScaledY(this);
        
        // Delegate camera update to RenderSystem
        this.renderSystem.updateCamera(
            scaledPlayerX,
            scaledPlayerY,
            this.CANVAS_WIDTH,
            this.CANVAS_HEIGHT,
            actualMapWidth,
            actualMapHeight
        );
    }
    
    // Rendering methods (renderMap, renderGameObjects, renderLegacyObject) now handled by RenderSystem
    
    /**
     * Render UI elements
     */
    renderUI(ctx) {
        // This would render HUD elements, health bars, etc.
        // For now, keep it clean - no permanent UI overlays
        // Debug info is handled separately and can be toggled with F1
    }
    
    /**
     * Find closest interactable NPC
     */
    findClosestInteractableNPC() {
        const currentMapNPCs = this.objectManager.getNPCsForMap(this.currentMapId);
        // Delegate to InteractionSystem
        return this.interactionSystem.findClosestNPC(this.player, currentMapNPCs);
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(deltaTime) {
        // Delegate to PerformanceMonitor
        this.performanceMonitor.update(deltaTime);
    }
    
    /**
     * Render FPS display
     */
    renderDebugInfo() {
        // Delegate to PerformanceMonitor
        this.performanceMonitor.render(
            this.ctx,
            this.CANVAS_WIDTH,
            this.CANVAS_HEIGHT,
            this.stateManager.getCurrentState(),
            this.currentMapId
        );
    }
    
    /**
     * Calculate shadow properties based on time of day
     * Cached and updated every 100ms for smoother transitions
     */
    getShadowProperties() {
        const now = Date.now();
        
        // Cache shadow properties for 100ms (updates 10x per second)
        if (this._shadowPropsCache && (now - this._shadowPropsCacheTime) < 100) {
            return this._shadowPropsCache;
        }
        
        // Get current time of day (0-24)
        const timeOfDay = this.dayNightCycle?.timeOfDay || 12;
        
        // Calculate sun position throughout the day
        // Sun rises at 6 AM (east), peaks at 12 PM (overhead), sets at 6 PM (west)
        // Moon rises at 6 PM (east), peaks at 12 AM (overhead), sets at 6 AM (west)
        
        // Shadow direction based on time of day (sun/moon position)
        // 5 AM - 8 AM (dawn): sun rising in east → shadows point LEFT (west) → skewX = -1.5
        // 12:30 PM: sun overhead → shadows directly below → skewX = 0
        // 5 PM - 8 PM (dusk): sun setting in west → shadows point RIGHT (east) → skewX = +1.5
        let shadowDirection = 0;
        let shadowOpacity = 0;
        let isMoonShadow = false;
        
        if (timeOfDay >= 5 && timeOfDay < 20) {
            // DAYTIME + DAWN/DUSK (5 AM - 8 PM): Sun shadows
            // Map 5 AM → 8 PM to sun arc from east to west
            // At 5 AM: sun at far east → shadow skews MAX to left (-1)
            // At 12:30 PM: sun overhead → no skew (0)
            // At 8 PM: sun at far west → shadow skews MAX to right (+1)
            
            const dayProgress = (timeOfDay - 5) / 15; // 0 (5 AM) to 1 (8 PM)
            shadowDirection = (0.5 - dayProgress) * 2; // -1 to +1 (dawn left, dusk right)
            
            // Opacity based on time windows
            if (timeOfDay >= 8 && timeOfDay < 17) {
                // FULL DAYTIME (8 AM - 5 PM): Strong shadows
                shadowOpacity = 0.5;
                
            } else if (timeOfDay >= 5 && timeOfDay < 8) {
                // DAWN (5 AM - 8 AM): Fade in from 0 to full (3 hours like dusk)
                const dawnProgress = (timeOfDay - 5) / 3; // 0 to 1
                shadowOpacity = 0.5 * dawnProgress;
                
            } else if (timeOfDay >= 17 && timeOfDay < 20) {
                // DUSK (5 PM - 8 PM): Fade out from full to 0
                const duskProgress = (timeOfDay - 17) / 3; // 0 to 1
                shadowOpacity = 0.5 * (1 - duskProgress);
            }
            
        } else {
            // NIGHT (8 PM - 5 AM): Moon shadows (only on clear nights)
            // Check if weather is clear (no precipitation)
            const hasWeather = this.currentMap && this.currentMap.weather && this.currentMap.weather.precipitation;
            const precipitation = hasWeather ? this.currentMap.weather.precipitation : 'none';
            const isClearNight = !hasWeather || precipitation === 'none' || precipitation === 'clear' || precipitation === 'sun';
            
            if (isClearNight) {
                isMoonShadow = true;
                
                // Moon cycle: mirrors sun but offset by 12 hours
                // Moon rises at 5 PM (east), peaks at midnight (12:30 AM), sets at 5 AM (west)
                // This creates seamless transition as sun sets
                
                // Need to handle wrap-around at midnight
                let nightTime = timeOfDay >= 20 ? timeOfDay : timeOfDay + 24; // Convert 0-5 to 24-29
                
                // Map moon position similar to sun (5 PM/17:00 → 5 AM/5:00 + 24 = 29)
                // Shift by 12 hours to make moon rise when sun sets
                // At 8 PM (20): moon low in east → shadow skews right (+0.6)
                // At 12:30 AM (24.5/0.5): moon overhead → no skew (0)
                // At 5 AM (29/5): moon low in west → shadow skews left (-0.6)
                
                const nightProgress = (nightTime - 17) / 12; // 0 (5 PM) to 1 (5 AM) - 12 hour cycle
                shadowDirection = (nightProgress - 0.5) * 2; // +1 to -1 (same direction pattern as sun)
                
                // Subtle moon shadows - much weaker than sun
                // Fade in during evening (8-9 PM) and fade out before dawn (4-5 AM)
                if (timeOfDay >= 20 && timeOfDay < 21) {
                    // Evening fade in (8-9 PM)
                    const fadeIn = timeOfDay - 20; // 0 to 1
                    shadowOpacity = 0.15 * fadeIn;
                } else if (timeOfDay >= 4 && timeOfDay < 5) {
                    // Pre-dawn fade out (4-5 AM)
                    const fadeOut = 1 - (timeOfDay - 4); // 1 to 0
                    shadowOpacity = 0.15 * fadeOut;
                } else {
                    // Full moon shadows (9 PM - 4 AM)
                    shadowOpacity = 0.15;
                }
            } else {
                // Cloudy/rainy/snowy night: no moon visible, no shadows
                shadowOpacity = 0;
                shadowDirection = 0;
            }
        }
        
        // WEATHER EFFECTS on shadow intensity (only affects sun shadows, not moon)
        if (!isMoonShadow && this.currentMap && this.currentMap.weather && this.currentMap.weather.precipitation) {
            const precipitation = this.currentMap.weather.precipitation;
            
            // Rain/snow blocks sunlight proportionally to intensity
            if (precipitation === 'rain-light' || precipitation === 'snow-light') {
                shadowOpacity *= 0.4; // 60% reduction - light clouds block most sun
            } else if (precipitation === 'rain-medium' || precipitation === 'snow-medium') {
                shadowOpacity *= 0.2; // 80% reduction - medium rain/snow heavily blocks sun
            } else if (precipitation === 'rain-heavy' || precipitation === 'snow-heavy') {
                shadowOpacity *= 0.05; // 95% reduction - heavy precipitation almost no shadows
            }
        }
        
        // Shadow skew amount (how much the TOP shifts horizontally)
        // More skew at dawn/dusk, less skew at noon
        const maxSkew = 1.5; // Maximum skew factor
        const skewX = shadowDirection * maxSkew;
        
        const props = {
            skewX,
            opacity: shadowOpacity,
            scaleY: 0.5 // Fixed scale for consistent shadow appearance
        };
        
        // Cache the result
        this._shadowPropsCache = props;
        this._shadowPropsCacheTime = now;
        
        return props;
    }

    /**
     * Get cached sprite silhouette for shadows (performance optimization)
     */
    getSpriteCache(sprite, width, height) {
        // Create cache key from sprite src
        const cacheKey = `${sprite.src}_${Math.round(width)}_${Math.round(height)}`;
        
        // Return cached silhouette if available
        if (this._spriteShadowCache && this._spriteShadowCache[cacheKey]) {
            return this._spriteShadowCache[cacheKey];
        }
        
        // Initialize cache if needed
        if (!this._spriteShadowCache) {
            this._spriteShadowCache = {};
        }
        
        // Create silhouette canvas (only once per unique sprite/size)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw sprite
        tempCtx.drawImage(sprite, 0, 0, width, height);
        
        // Get image data and make it all black (preserve alpha)
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;     // R = black
            data[i + 1] = 0; // G = black
            data[i + 2] = 0; // B = black
            // data[i + 3] is alpha - keep as is for sprite shape
        }
        tempCtx.putImageData(imageData, 0, 0);
        
        // Cache the result
        this._spriteShadowCache[cacheKey] = tempCanvas;
        
        return tempCanvas;
    }

    /**
     * Draw shadow for game objects with dynamic direction based on time of day
     * Uses sprite silhouettes with skew/stretch (not rotation) for performance
     */
    drawShadow(x, y, width, height, altitudeOffset = 0, sprite = null) {
        const shadowProps = this.getShadowProperties();
        
        // Shadow opacity based on time of day and altitude
        const altitudeFade = Math.max(0, 1 - (altitudeOffset / 300));
        const finalOpacity = shadowProps.opacity * altitudeFade;
        
        if (finalOpacity <= 0.01) return; // Don't draw invisible shadows
        
        this.ctx.save();
        this.ctx.globalAlpha = finalOpacity;
        
        // Calculate shadow position - ALWAYS at base of sprite (NO horizontal offset!)
        // The shadow base NEVER moves - only the top skews based on sun position
        // x, y is the CENTER of the sprite, so y + height/2 = bottom
        const shadowX = x; // NO offsetX! Base stays put!
        const shadowY = y + (height / 2) + altitudeOffset; // Exact bottom of sprite
        
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            // SPRITE-BASED SHADOW: Use cached sprite silhouette
            const silhouette = this.getSpriteCache(sprite, width, height);
            
            // Move to shadow position (base of sprite)
            this.ctx.translate(shadowX, shadowY);
            
            // Apply vertical scale FIRST (flatten shadow)
            this.ctx.scale(1, shadowProps.scaleY);
            
            // Apply shear transform for perspective skew
            // We want the BASE (bottom) to stay fixed, and the TOP to skew
            // Standard skew transforms the whole thing relative to origin
            // To make ONLY the top move: DON'T translate! Just apply skew directly
            // The bottom is at y=0 (our current position), so it stays put
            // The top is at y=-height, so it shifts by skewX * height
            this.ctx.transform(1, 0, shadowProps.skewX, 1, 0, 0); // Apply skew from base
            
            // Draw the cached silhouette anchored at bottom center
            this.ctx.drawImage(silhouette, -width / 2, -height, width, height);
        } else {
            // FALLBACK: Simple elliptical shadow if sprite not ready
            this.ctx.fillStyle = 'black';
            const shadowWidth = width * 0.5;
            const shadowHeight = height * 0.15;
            
            this.ctx.translate(shadowX, shadowY);
            this.ctx.scale(1, shadowProps.scaleY);
            
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    /**
     * Check actor collisions with other objects and map boundaries
     * Now properly accounts for all sprite scaling (object × resolution × map)
     */
    checkActorCollisions(newX, newY, movingActor, game) {
        // Check map boundaries first
        if (this.currentMap && movingActor.canBeBlocked) {
            // Use actual rendered dimensions (includes all scaling)
            const actorWidth = movingActor.getActualWidth(game || this);
            const actorHeight = movingActor.getActualHeight(game || this);
            const halfWidth = actorWidth / 2;
            const halfHeight = actorHeight / 2;
            
            // Calculate actual map bounds (accounting for both map scale and resolution scale)
            const mapScale = this.currentMap.scale || 1.0;
            const actualMapWidth = this.currentMap.width * mapScale * this.resolutionScale;
            const actualMapHeight = this.currentMap.height * mapScale * this.resolutionScale;
            
            // Check if actor would be outside map bounds
            if (newX - halfWidth < 0 || 
                newX + halfWidth > actualMapWidth ||
                newY - halfHeight < 0 || 
                newY + halfHeight > actualMapHeight) {
                return { collides: true, object: 'map_boundary' };
            }
        }
        
        // Check painted collision areas
        if (movingActor.canBeBlocked && this.editorManager) {
            const collisionLayer = this.editorManager.getCollisionLayer(this.currentMapId);
            if (collisionLayer) {
                // One-time debug to confirm system is active
                if (!this._collisionSystemDebug) {
                    this._collisionSystemDebug = true;
                    console.log('✅ [Painted Collision System] Active and checking collisions');
                    console.log('   - Map ID:', this.currentMapId);
                    console.log('   - Canvas size:', collisionLayer.width, 'x', collisionLayer.height);
                    console.log('   - Actor position:', Math.floor(movingActor.x), Math.floor(movingActor.y));
                }
                
                // Check if the actor's collision bounds intersect with painted collision
                if (this.checkPaintedCollision(newX, newY, movingActor, collisionLayer, game || this)) {
                    return { collides: true, object: 'painted_collision' };
                }
            } else {
                // Debug: No collision layer found
                if (!this._noCollisionLayerWarning) {
                    this._noCollisionLayerWarning = true;
                    console.warn('⚠️ [Painted Collision] No collision layer found for map', this.currentMapId);
                }
            }
        } else {
            // Debug: Conditions not met
            if (!this._collisionCheckSkipped) {
                this._collisionCheckSkipped = true;
                console.warn('⚠️ [Painted Collision] Check skipped:');
                console.warn('   - canBeBlocked:', movingActor.canBeBlocked);
                console.warn('   - editorManager exists:', !!this.editorManager);
            }
        }
        
        // Get all objects that could block movement on current map
        const allObjects = this.getAllGameObjectsOnMap(this.currentMapId);
        
        for (let obj of allObjects) {
            // Skip self-collision
            if (obj === movingActor) continue;
            
            // Skip objects that don't block movement or aren't solid
            if (!obj.blocksMovement || !obj.hasCollision) continue;
            
            // Skip if moving actor can't be blocked
            if (!movingActor.canBeBlocked) continue;
            
            // Check collision using GameObject collision system (now with proper scaling)
            if (movingActor.wouldCollideAt(newX, newY, obj, game || this)) {
                return { collides: true, object: obj };
            }
        }
        
        return { collides: false, object: null };
    }
    
    /**
     * Check if actor collides with painted collision areas
     * OPTIMIZED: Cache image data to avoid expensive getImageData() calls every frame
     */
    checkPaintedCollision(newX, newY, movingActor, collisionLayer, game) {
        // ALWAYS read directly from the canvas (not the baked image)
        // The canvas has the actual painted data we need to check
        if (!collisionLayer._cachedImageData || collisionLayer._dataDirty) {
            const ctx = collisionLayer.getContext('2d');
            collisionLayer._cachedImageData = ctx.getImageData(0, 0, collisionLayer.width, collisionLayer.height);
            collisionLayer._dataDirty = false;
            
            // Debug: Sample pixels to verify the image data
            const data = collisionLayer._cachedImageData.data;
            let redCount = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 200 && data[i + 1] < 50 && data[i + 2] < 50 && data[i + 3] > 200) {
                    redCount++;
                }
            }
            
            console.log(`🎨 [Collision] Reading from canvas (${collisionLayer.width}x${collisionLayer.height}), red pixels: ${redCount}`);
        }
        
        const imageData = collisionLayer._cachedImageData;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Convert logical coordinates to render coordinates (same as painting uses)
        const mapScale = game.currentMap?.scale || 1.0;
        const resolutionScale = game.resolutionScale || 1.0;
        const coordinateScale = mapScale * resolutionScale;
        
        // Convert newX/newY from logical space to canvas space
        const canvasX = newX * coordinateScale;
        const canvasY = newY * coordinateScale;
        
        // Get actor's collision bounds in canvas space
        const actorWidth = movingActor.getActualWidth(game);
        const actorHeight = movingActor.getActualHeight(game);
        
        // Calculate bounds in canvas space
        const halfWidth = actorWidth / 2;
        const halfHeight = actorHeight / 2;
        
        // Sample multiple points around the actor's collision bounds
        // These are now in canvas pixel coordinates (matching where we paint)
        const samplePoints = [
            { x: Math.floor(canvasX), y: Math.floor(canvasY) },                                    // Center
            { x: Math.floor(canvasX - halfWidth), y: Math.floor(canvasY - halfHeight) },          // Top-left
            { x: Math.floor(canvasX + halfWidth), y: Math.floor(canvasY - halfHeight) },          // Top-right
            { x: Math.floor(canvasX - halfWidth), y: Math.floor(canvasY + halfHeight) },          // Bottom-left
            { x: Math.floor(canvasX + halfWidth), y: Math.floor(canvasY + halfHeight) },          // Bottom-right
            { x: Math.floor(canvasX), y: Math.floor(canvasY - halfHeight) },                      // Top-center
            { x: Math.floor(canvasX), y: Math.floor(canvasY + halfHeight) },                      // Bottom-center
            { x: Math.floor(canvasX - halfWidth), y: Math.floor(canvasY) },                       // Left-center
            { x: Math.floor(canvasX + halfWidth), y: Math.floor(canvasY) }                        // Right-center
        ];
        
        // Check each sample point using cached data
        for (const point of samplePoints) {
            // Make sure point is within image bounds
            if (point.x < 0 || point.x >= width || 
                point.y < 0 || point.y >= height) {
                continue;
            }
            
            // Calculate pixel index in the image data array
            const pixelIndex = (point.y * width + point.x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Debug: Log what we're checking (throttled)
            if (!this._lastDebugLog || Date.now() - this._lastDebugLog > 2000) {
                console.log(`🔍 [Collision Check] Logical (${newX.toFixed(1)}, ${newY.toFixed(1)}) -> Canvas (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) -> Pixel (${point.x}, ${point.y}) = RGBA(${r},${g},${b},${a})`);
                this._lastDebugLog = Date.now();
            }
            
            // Check if pixel is red (painted collision) with alpha > 0
            // Painted collision is solid red: rgba(255, 0, 0, 1.0)
            if (r > 200 && g < 50 && b < 50 && a > 200) {
                console.log(`🚫 [Collision] BLOCKED! Logical (${newX.toFixed(1)}, ${newY.toFixed(1)}) -> Canvas (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) -> Pixel (${point.x}, ${point.y})`);
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    /**
     * Get all GameObjects on a specific map (NPCs, interactive objects, static objects, etc.)
     */
    getAllGameObjectsOnMap(mapId) {
        // Simply return all objects from unified manager
        return this.objectManager.getObjectsForMap(mapId);
    }


    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        // Load settings from SettingsManager
        const loadedSettings = this.settingsManager.load();
        // Merge with current settings
        this.settings = { ...this.settings, ...loadedSettings };
    }
    
    /**
     * Apply audio settings to AudioManager
     */
    applyAudioSettings() {
        if (this.audioManager) {
            this.audioManager.setMasterVolume(this.settings.masterVolume / 100);
            this.audioManager.setBGMVolume(this.settings.musicVolume / 100);
            this.audioManager.setEffectVolume(this.settings.effectsVolume / 100);
            this.audioManager.setMuted(this.settings.isMuted);
            console.log('[GameEngine] ✅ Audio settings applied:', {
                master: this.settings.masterVolume / 100,
                bgm: this.settings.musicVolume / 100,
                effects: this.settings.effectsVolume / 100,
                muted: this.settings.isMuted
            });
        }
    }
    
    /**
     * Debug method to check what audio should be playing
     */
    debugAudioAssignments() {
        console.log('=== AUDIO DEBUG ===');
        console.log('Main Menu BGM should be: assets/audio/bgm/00.mp3');
        
        const mapData0_0 = this.mapManager.getMapData('0-0');
        const mapData0_1 = this.mapManager.getMapData('0-1');
        
        console.log('Map 0-0 BGM should be:', mapData0_0?.music || 'NOT FOUND');
        console.log('Map 0-1 BGM should be:', mapData0_1?.music || 'NOT FOUND');
        console.log('Current State:', this.stateManager.getCurrentState());
        console.log('Audio Enabled:', this.audioManager.audioEnabled);
        console.log('Audio Muted:', this.audioManager.isMuted);
        console.log('==================');
    }

    /**
     * Cleanup method - properly destroy the game engine
     */
    destroy() {
        console.log('🧹 Cleaning up GameEngine...');
        
        // Remove all event listeners
        this.eventListeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        this.eventListeners = [];
        
        // Cleanup audio
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
        
        // Clear references
        this.player = null;
        this.currentMap = null;
        this.maps = {};
        
        console.log('✅ GameEngine cleanup complete');
    }
}

// Export for use
window.GameEngine = GameEngine;

// Global debug methods
window.debugAudio = function() {
    if (window.game) {
        window.game.debugAudioAssignments();
    } else {
        console.log('Game not loaded yet');
    }
};

window.clearAudioCache = function() {
    if (window.game && window.game.audioManager) {
        window.game.audioManager.clearAudioCache();
        console.log('Audio cache cleared! Please refresh the page.');
    } else {
        console.log('AudioManager not available');
    }
};

window.forceCorrectAudio = function() {
    if (window.game && window.game.audioManager) {
        window.game.audioManager.clearAudioCache();
        // Force reload main menu music
        setTimeout(() => {
            window.game.audioManager.playBGM('00.mp3');
            console.log('Forced main menu music reload');
        }, 500);
    }
};

window.testAudio = function() {
    if (window.game && window.game.audioManager) {
        console.log('=== AUDIO TEST ===');
        console.log('Audio enabled:', window.game.audioManager.audioEnabled);
        console.log('Audio muted:', window.game.audioManager.isMuted);
        console.log('Pending audio queue length:', window.game.audioManager.pendingAudio?.length || 0);
        
        // Test sound effect
        window.game.audioManager.playEffect('menu-navigation.mp3');
        console.log('Attempted to play menu navigation sound');
        
        // Test BGM
        window.game.audioManager.playBGM('00.mp3');
        console.log('Attempted to play BGM');
        console.log('==================');
    } else {
        console.log('Game or AudioManager not available');
    }
};