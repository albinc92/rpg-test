/**
 * GameEngine - Core game engine with proper separation of concerns
 * Manages the main game loop and coordinates all systems
 */
class GameEngine {
    constructor() {
        // Canvas2D (foreground layer)
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // WebGL canvas (background layer)
        this.webglCanvas = document.getElementById('webglCanvas');
        
        this.debug = document.getElementById('debug');
        
        // Event listener cleanup tracking (MUST be initialized BEFORE setupCanvas)
        this.eventListeners = [];
        
        // Responsive canvas sizing
        // Desktop: Fixed 1920x1080 (scaled by CSS)
        // Mobile: Full device resolution (native size)
        this.isMobile = this.detectMobile();
        
        // MAXIMUM CANVAS RESOLUTION - Up to 4K supported for crisp rendering
        this.BASE_WIDTH = 3840;
        this.BASE_HEIGHT = 2160;
        
        // WORLD COORDINATE SYSTEM - All game positions use these units
        // Objects, maps, and coordinates are stored in world units
        // This is independent of screen resolution
        this.WORLD_WIDTH = 3840;
        this.WORLD_HEIGHT = 2160;
        
        // BASELINE ZOOM - Developer-controlled zoom for the default "100%" view
        // Higher = more zoomed in (see less world), Lower = more zoomed out (see more world)
        // Tuned so player character is ~1/8 to 1/10 of screen height (Pokémon-style)
        // At 1.0: You'd see 3840x2160 world units on a 1920x1080 screen (tiny sprites)
        // At 2.0: You see ~1920x1080 world units on a 1920x1080 screen (1:1 feel)
        this.BASELINE_ZOOM = 2.2;
        
        // USER ZOOM - From settings, allows 85%-115% adjustment
        this.userZoom = 1.0; // Will be loaded from settings
        
        if (this.isMobile) {
            // Mobile: Use full native resolution for sharp rendering
            this.CANVAS_WIDTH = window.innerWidth;
            this.CANVAS_HEIGHT = window.innerHeight;
        } else {
            // Desktop: Fixed resolution scaled by CSS
            this.CANVAS_WIDTH = 1920;
            this.CANVAS_HEIGHT = 1080;
        }
        
        // WORLD SCALE - Core of the resolution-agnostic rendering
        // Converts world coordinates to screen pixels
        // worldScale = (canvasHeight / worldHeight) × baselineZoom × userZoom
        this.updateWorldScale();
        
        console.log(`[GameEngine] World scale: ${this.worldScale.toFixed(3)} (canvas ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}, baseline ${this.BASELINE_ZOOM}, user ${this.userZoom})`);
        console.log(`[GameEngine] Visible area: ${this.visibleWorldWidth.toFixed(0)}x${this.visibleWorldHeight.toFixed(0)} world units`);
        
        // STANDARD MAP SIZE - All maps use world coordinate system
        // Maps are designed at world resolution (3840×2160 world units)
        this.MAP_WIDTH = this.WORLD_WIDTH;
        this.MAP_HEIGHT = this.WORLD_HEIGHT;

        this.setupCanvas();
        
        // Data loader (must be created first)
        this.dataLoader = new DataLoader();
        
        // Static object registry for template management
        this.staticObjectRegistry = new StaticObjectRegistry();
        
        // Spirit registry for spirit templates
        this.spiritRegistry = new SpiritRegistry(this);
        
        // NPC, Chest, and Portal registries
        this.npcRegistry = new NPCRegistry();
        this.chestRegistry = new ChestRegistry();
        this.portalRegistry = new PortalRegistry();
        
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
        
        // Settings manager must be created and loaded before RenderSystem for AA/filtering
        this.settingsManager = new SettingsManager();
        this.settingsManager.load();
        this.settings = this.settingsManager.getAll();
        
        // Locale manager for internationalization (i18n)
        // Must be initialized after settings are loaded to get user's language preference
        this.localeManager = new LocaleManager();
        // Note: loadLocale is async, will be called in init()
        
        // Pass settings to RenderSystem for WebGL configuration (AA, filtering)
        this.renderSystem = new RenderSystem(this.canvas, this.ctx, this.webglCanvas, this.settings);
        this.hudSystem = new HUDSystem(this); // NEW: HUD system
        
        // CRITICAL: Initialize WebGL renderer with correct logical dimensions
        // Must be called immediately after RenderSystem creation for correct projection matrix
        if (this.renderSystem.webglRenderer) {
            this.renderSystem.webglRenderer.resize(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        }
        
        this.collisionSystem = new CollisionSystem();
        this.interactionSystem = new InteractionSystem();
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
        this.dayNightCycle = new DayNightCycle(this.canvas, this);
        
        // Weather system
        this.weatherSystem = new WeatherSystem(this);
        
        // Connect weather system to WebGL renderer (if available)
        if (this.renderSystem.webglRenderer) {
            this.weatherSystem.setWebGLRenderer(this.renderSystem.webglRenderer);
        }
        
        // Perspective system for fake 3D depth effect (Diablo 2 style)
        this.perspectiveSystem = new PerspectiveSystem();
        // Can be toggled: this.perspectiveSystem.setEnabled(true/false)
        // Can be tuned: this.perspectiveSystem.configure({ horizonScale: 0.65, perspectiveStrength: 0.35 })
        
        // Light system for dynamic lighting
        this.lightManager = new LightManager(this);
        
        // Connect light manager to render system (for mask invalidation on camera movement)
        this.renderSystem.setLightManager(this.lightManager);
        
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
        
        // Map transition state
        this.isTransitioning = false;

        // Settings already loaded above before RenderSystem creation
        // Just apply saved key bindings
        if (this.settings.keyBindings) {
            this.inputManager.loadBindings(this.settings.keyBindings);
        }
        
        // Store the VSync state at boot time.
        // This is critical because changing VSync requires a restart to affect the GPU/Electron flags.
        // We must use this value for frame throttling logic, NOT the current settings value,
        // otherwise switching VSync ON in-game would disable the throttle while the GPU is still unlocked,
        // causing 2000+ FPS and crashes.
        this.bootVSync = this.settings.vsync;
        
        // Apply loaded settings to audio manager
        this.applyAudioSettings();
        
        // Apply game zoom setting
        this.applyGameZoomSetting();
        
        // Apply perspective settings from saved settings
        if (this.perspectiveSystem) {
            this.perspectiveSystem.setEnabled(this.settings.perspectiveEnabled !== false);
            if (this.settings.perspectiveStrength !== undefined) {
                this.perspectiveSystem.configure({ perspectiveStrength: this.settings.perspectiveStrength });
            }
        }
        
        // Apply loaded graphics settings (Resolution/Fullscreen)
        // We need to do this after a short delay to ensure Electron window is ready
        if (window.electronAPI) {
            setTimeout(() => {
                // Apply fullscreen and track state
                if (this.settings.fullscreen) {
                    this.isFullscreen = true;
                    window.electronAPI.setFullscreen(true);
                } else {
                    this.isFullscreen = false;
                }
                
                // Apply resolution - in fullscreen this affects rendering resolution
                // In windowed mode this affects window size
                if (this.settings.resolution) {
                    const match = this.settings.resolution.match(/(\d+)x(\d+)/);
                    if (match) {
                        const width = parseInt(match[1]);
                        const height = parseInt(match[2]);
                        console.log(`[GameEngine] Applying saved resolution: ${width}x${height}`);
                        
                        if (this.isFullscreen) {
                            // In fullscreen, trigger resize to apply rendering resolution
                            if (this.handleResize) {
                                this.handleResize();
                            }
                        } else {
                            // In windowed mode, set window size
                            window.electronAPI.setResolution(width, height);
                        }
                    }
                }
            }, 100);
        }

        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize the game engine
     */
    async initialize() {
        try {
            console.log('[GameEngine] Loading game data...');
            
            // Load locale for internationalization (i18n)
            // Must be loaded before any UI strings are needed
            const language = this.settings.language || 'en';
            await this.localeManager.loadLocale(language);
            console.log(`[GameEngine] Loaded locale: ${language}`);
            
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
            
            // Load paint layers from map data (if any)
            await this.editorManager.importAllPaintLayers(this.mapManager.maps);
            
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
            x: this.WORLD_WIDTH / 2,  // Center of map 0-0
            y: this.WORLD_HEIGHT / 2, // Center of map 0-0
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
        // Use screen.width instead of window.innerWidth to avoid false positives when DevTools is open
        const isSmallScreen = screen.width < 1024 || screen.height < 768;
        return isTouchDevice && isSmallScreen;
    }
    
    /**
     * Update the world scale factor
     * This is the core of the resolution-agnostic rendering system
     * Called when canvas resizes or user zoom changes
     */
    updateWorldScale() {
        // Base scale: how many screen pixels per world unit (without zoom)
        // Uses height for aspect-ratio independent scaling
        const baseScale = this.CANVAS_HEIGHT / this.WORLD_HEIGHT;
        
        // Final world scale includes baseline zoom and user zoom
        // Higher worldScale = sprites appear larger, see less world
        this.worldScale = baseScale * this.BASELINE_ZOOM * this.userZoom;
        
        // For backwards compatibility, expose as resolutionScale
        // (existing code references this.resolutionScale)
        this.resolutionScale = this.worldScale;
        
        // Calculate how much of the world is visible on screen
        this.visibleWorldWidth = this.CANVAS_WIDTH / this.worldScale;
        this.visibleWorldHeight = this.CANVAS_HEIGHT / this.worldScale;
    }

    /**
     * Setup canvas with smart scaling
     * - Small screens: Use actual dimensions (fill mode)
     * - Large screens: Cap at base resolution, CSS scales up
     */
    setupCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxWidth = this.BASE_WIDTH;
        const maxHeight = this.BASE_HEIGHT;
        
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
        
        // Recalculate world scale for new canvas size
        this.updateWorldScale();
        
        console.log(`[GameEngine] Canvas: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}, WorldScale: ${this.worldScale.toFixed(3)}`);
        
        // Helper function to sync WebGL canvas with main canvas
        const syncWebGLCanvas = () => {
            if (this.webglCanvas) {
                this.webglCanvas.width = this.canvas.width;
                this.webglCanvas.height = this.canvas.height;
                this.webglCanvas.style.width = this.canvas.style.width;
                this.webglCanvas.style.height = this.canvas.style.height;
            }
        };
        
        if (this.isMobile) {
            // Mobile: Dynamic resize handling
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.cursor = 'none';
            
            // Set actual canvas size (scaled for high DPI)
            this.canvas.width = this.CANVAS_WIDTH * devicePixelRatio;
            this.canvas.height = this.CANVAS_HEIGHT * devicePixelRatio;
            
            // Sync WebGL canvas
            syncWebGLCanvas();
            
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
                
                // Recalculate world scale for new canvas size
                this.updateWorldScale();
                console.log(`[GameEngine] Resize: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}, WorldScale: ${this.worldScale.toFixed(3)}`);
                
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = this.CANVAS_WIDTH * dpr;
                this.canvas.height = this.CANVAS_HEIGHT * dpr;
                this.ctx.scale(dpr, dpr);
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // Sync WebGL canvas
                syncWebGLCanvas();
                
                // Resize day/night shader canvases
                if (this.dayNightCycle?.shader) {
                    this.dayNightCycle.shader.resize(this.canvas.width, this.canvas.height);
                }
                
                // Resize WebGL renderer if available
                if (this.renderSystem?.webglRenderer) {
                    this.renderSystem.webglRenderer.resize(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                }
                
                // Resize editor collision/spawn layers if editor is active
                if (this.editorManager) {
                    this.editorManager.handleResize();
                }
                
                // Update camera immediately to prevent visible player jump
                this.updateCamera();
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
            
            // Sync WebGL canvas
            syncWebGLCanvas();
            
            // Enable smooth scaling for better quality on desktop
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Desktop resize handler (for when dev tools open/close)
            this.handleResize = () => {
                // Determine rendering resolution based on mode
                let newWidth, newHeight;
                let isFullscreen = false;
                
                // Check if we're in fullscreen mode
                if (window.electronAPI) {
                    // In Electron, use the cached fullscreen state
                    isFullscreen = this.isFullscreen || false;
                } else {
                    // Web fallback
                    isFullscreen = document.fullscreenElement != null;
                }
                
                if (isFullscreen && this.settings?.resolution) {
                    // FULLSCREEN MODE: Use the resolution setting as the RENDERING resolution
                    // This allows lower resolution for performance on weaker PCs
                    // The canvas CSS (100vw x 100vh) stretches it to fill the screen
                    const match = this.settings.resolution.match(/(\d+)x(\d+)/);
                    if (match) {
                        newWidth = parseInt(match[1]);
                        newHeight = parseInt(match[2]);
                        console.log(`[handleResize] Fullscreen - rendering at ${newWidth}x${newHeight} (stretched to fill screen)`);
                    } else {
                        // Fallback to screen size if resolution parsing fails
                        newWidth = Math.round(window.innerWidth);
                        newHeight = Math.round(window.innerHeight);
                    }
                } else if (this.pendingResolution) {
                    // WINDOWED MODE with pending resolution from settings change
                    newWidth = this.pendingResolution.width;
                    newHeight = this.pendingResolution.height;
                    console.log(`[handleResize] Using pending resolution: ${newWidth}x${newHeight}`);
                    // Keep pending resolution for 500ms to handle multiple resize events
                    if (!this.pendingResolutionTimeout) {
                        this.pendingResolutionTimeout = setTimeout(() => {
                            console.log('[handleResize] Clearing pending resolution');
                            this.pendingResolution = null;
                            this.pendingResolutionTimeout = null;
                        }, 500);
                    }
                } else {
                    // WINDOWED MODE: Use actual window size
                    newWidth = Math.round(window.innerWidth);
                    newHeight = Math.round(window.innerHeight);
                    console.log(`[handleResize] Using window size: ${newWidth}x${newHeight}`);
                }
                
                const maxWidth = this.BASE_WIDTH;
                const maxHeight = this.BASE_HEIGHT;

                if (newWidth <= maxWidth && newHeight <= maxHeight) {
                    this.CANVAS_WIDTH = newWidth;
                    this.CANVAS_HEIGHT = newHeight;
                } else {
                    this.CANVAS_WIDTH = maxWidth;
                    this.CANVAS_HEIGHT = maxHeight;
                }

                // Recalculate world scale for new canvas size
                this.updateWorldScale();

                // With force-device-scale-factor=1, dpr should be 1, but we keep it for robustness
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = this.CANVAS_WIDTH * dpr;
                this.canvas.height = this.CANVAS_HEIGHT * dpr;
                
                // Reset transform before scaling
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx.scale(dpr, dpr);
                
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // Sync WebGL canvas dimensions
                syncWebGLCanvas();
                
                // Resize day/night shader canvases
                if (this.dayNightCycle?.shader) {
                    this.dayNightCycle.shader.resize(this.canvas.width, this.canvas.height);
                }
                
                // Resize WebGL renderer to match logical canvas size
                if (this.renderSystem?.webglRenderer) {
                    this.renderSystem.webglRenderer.resize(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                }
                
                // Resize editor collision/spawn layers if editor is active
                if (this.editorManager) {
                    this.editorManager.handleResize();
                }
                
                // Update camera immediately to prevent visible player jump
                // The worldScale changed, so player's screen position changed
                this.updateCamera();
                
                // Update resolution setting to reflect current window size
                // BUT NOT in fullscreen mode - the resolution setting is the rendering resolution there
                if (this.settings && !this.isFullscreen) {
                    // All standard resolutions with aspect ratios
                    const standardResolutions = [
                        // 16:9
                        { w: 1280, h: 720, ratio: '16:9' },
                        { w: 1366, h: 768, ratio: '16:9' },
                        { w: 1600, h: 900, ratio: '16:9' },
                        { w: 1920, h: 1080, ratio: '16:9' },
                        { w: 2560, h: 1440, ratio: '16:9' },
                        { w: 3840, h: 2160, ratio: '16:9' },
                        // 16:10
                        { w: 1280, h: 800, ratio: '16:10' },
                        { w: 1440, h: 900, ratio: '16:10' },
                        { w: 1680, h: 1050, ratio: '16:10' },
                        { w: 1920, h: 1200, ratio: '16:10' },
                        { w: 2560, h: 1600, ratio: '16:10' },
                        // 21:9
                        { w: 2560, h: 1080, ratio: '21:9' },
                        { w: 3440, h: 1440, ratio: '21:9' },
                        { w: 3840, h: 1600, ratio: '21:9' },
                        // 32:9
                        { w: 5120, h: 1440, ratio: '32:9' },
                        // 4:3
                        { w: 1024, h: 768, ratio: '4:3' },
                        { w: 1280, h: 960, ratio: '4:3' },
                        { w: 1400, h: 1050, ratio: '4:3' },
                        { w: 1600, h: 1200, ratio: '4:3' },
                    ];
                    
                    const matchedRes = standardResolutions.find(r => 
                        r.w === this.CANVAS_WIDTH && r.h === this.CANVAS_HEIGHT
                    );
                    
                    let newResolution;
                    if (matchedRes) {
                        newResolution = `${matchedRes.w}x${matchedRes.h} (${matchedRes.ratio})`;
                    } else {
                        // Calculate aspect ratio for custom resolution
                        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                        const divisor = gcd(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                        const ratioW = this.CANVAS_WIDTH / divisor;
                        const ratioH = this.CANVAS_HEIGHT / divisor;
                        
                        // Simplify common ratios
                        let customRatio = `${ratioW}:${ratioH}`;
                        if (Math.abs(ratioW/ratioH - 16/9) < 0.02) customRatio = '~16:9';
                        else if (Math.abs(ratioW/ratioH - 16/10) < 0.02) customRatio = '~16:10';
                        else if (Math.abs(ratioW/ratioH - 21/9) < 0.02) customRatio = '~21:9';
                        else if (Math.abs(ratioW/ratioH - 4/3) < 0.02) customRatio = '~4:3';
                        
                        newResolution = `Custom ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT} (${customRatio})`;
                    }
                    
                    console.log(`[handleResize] Window resized to ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT} -> ${newResolution}`);
                    
                    this.settings.resolution = newResolution;
                    
                    // If SettingsState is active, refresh its resolution list
                    if (this.stateManager?.currentState?.refreshResolutionList) {
                        this.stateManager.currentState.refreshResolutionList();
                    }
                }
            };
            
            window.addEventListener('resize', this.handleResize);
            this.eventListeners.push({ target: window, type: 'resize', handler: this.handleResize });
        }
        
        // Common settings
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.textRendering = 'optimizeQuality';
    }
    
    /**
     * Handle debug key presses
     */
    handleDebugKeys = (e) => {
        // F1 - Toggle debug info display
        if (e.code === 'F1') {
            this.settings.showDebugInfo = !this.settings.showDebugInfo;
            console.log(`Debug info ${this.settings.showDebugInfo ? 'ENABLED' : 'DISABLED'}`);
            e.preventDefault(); // Prevent browser's help menu
        }
        
        // F3 - Toggle perspective system (Diablo 2 style fake 3D)
        if (e.code === 'F3' && !e.shiftKey && !e.ctrlKey) {
            if (this.perspectiveSystem) {
                this.perspectiveSystem.setEnabled(!this.perspectiveSystem.enabled);
                console.log(`🎮 Perspective ${this.perspectiveSystem.enabled ? 'ENABLED' : 'DISABLED'}`);
                // Save to settings
                this.settings.perspectiveEnabled = this.perspectiveSystem.enabled;
                this.settingsManager.set('perspectiveEnabled', this.perspectiveSystem.enabled);
                this.settingsManager.save();
            }
            e.preventDefault();
        }
        
        // Shift+F3 - Increase perspective strength
        if (e.shiftKey && e.code === 'F3') {
            if (this.perspectiveSystem) {
                const newStrength = Math.min(1.0, this.perspectiveSystem.perspectiveStrength + 0.1);
                this.perspectiveSystem.configure({ perspectiveStrength: newStrength });
                console.log(`📐 Perspective strength: ${(newStrength * 100).toFixed(0)}%`);
                // Save to settings
                this.settings.perspectiveStrength = newStrength;
                this.settingsManager.set('perspectiveStrength', newStrength);
                this.settingsManager.save();
            }
            e.preventDefault();
        }
        
        // Ctrl+F3 - Decrease perspective strength
        if (e.ctrlKey && e.code === 'F3') {
            if (this.perspectiveSystem) {
                const newStrength = Math.max(0, this.perspectiveSystem.perspectiveStrength - 0.1);
                this.perspectiveSystem.configure({ perspectiveStrength: newStrength });
                console.log(`📐 Perspective strength: ${(newStrength * 100).toFixed(0)}%`);
                // Save to settings
                this.settings.perspectiveStrength = newStrength;
                this.settingsManager.set('perspectiveStrength', newStrength);
                this.settingsManager.save();
            }
            e.preventDefault();
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
        
        // Day/Night cycle controls (when available and enabled for map)
        // Changed to Shift+F keys to avoid conflict with F2 editor toggle
        if (this.dayNightCycle && this.currentMap?.dayNightCycle) {
            // Shift+F6 - Jump to Dawn (6:00)
            if (e.shiftKey && e.code === 'F6') {
                this.dayNightCycle.setTime(6);
                console.log('🌅 Time set to Dawn (6:00)');
                e.preventDefault();
            }
            
            // Shift+F7 - Jump to Noon (12:00)
            if (e.shiftKey && e.code === 'F7') {
                this.dayNightCycle.setTime(12);
                console.log('☀️ Time set to Noon (12:00)');
                e.preventDefault();
            }
            
            // Shift+F8 - Jump to Dusk (18:00)
            if (e.shiftKey && e.code === 'F8') {
                this.dayNightCycle.setTime(18);
                console.log('🌆 Time set to Dusk (18:00)');
                e.preventDefault();
            }
            
            // Shift+F9 - Jump to Night (midnight)
            if (e.shiftKey && e.code === 'F9') {
                this.dayNightCycle.setTime(0);
                console.log('🌙 Time set to Night (00:00)');
                e.preventDefault();
            }
            
            // F6 - Increase time scale by 100x
            if (e.code === 'F6') {
                const newScale = Math.min(2000, this.dayNightCycle.timeScale + 100);
                this.dayNightCycle.setTimeScale(newScale);
                console.log(`⏩ Time scale increased to ${newScale}x`);
                e.preventDefault();
            }
            
            // F7 - Decrease time scale by 100x
            if (e.code === 'F7') {
                const newScale = Math.max(0, this.dayNightCycle.timeScale - 100);
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
        
        // Frame limiting variables
        const MAX_FPS = 300; // Cap at 300 FPS
        const MIN_FRAME_TIME = 1000 / MAX_FPS;
        
        // Initialize lastTime
        this.lastTime = performance.now();

        // Use MessageChannel for high-precision throttling (0ms delay)
        // This avoids the 4ms clamp of setTimeout and the background throttling of requestAnimationFrame
        const channel = new MessageChannel();
        const port = channel.port2;
        
        const gameLoop = () => {
            const now = performance.now();
            
            // Handle first frame edge case
            if (!this.lastTime) this.lastTime = now;

            // Calculate elapsed time since last frame
            const elapsed = now - this.lastTime;
            
            // If VSync was OFF at boot, we are in "unlocked" mode and MUST cap the frame rate
            if (!this.bootVSync) {
                if (elapsed < MIN_FRAME_TIME) {
                    // Schedule next check ASAP without blocking
                    port.postMessage(null);
                    return;
                }
            }
            
            // Calculate delta time in seconds
            const deltaTime = elapsed / 1000;
            
            // Update lastTime
            this.lastTime = now;
            
            // Safety cap for deltaTime to prevent spiral of death on lag spikes
            // If frame takes longer than 100ms (10fps), clamp it
            const safeDeltaTime = Math.min(deltaTime, 0.1);
            
            // Set gameTime for animations (in milliseconds)
            this.gameTime = now;
            
            if (!this.isPaused) {
                this.update(safeDeltaTime);
                this.render();
                this.updateFPS(safeDeltaTime);
            } else {
                // Still render when paused, just don't update game logic
                this.render();
                
                // Update editor even when paused (for mouse tracking and preview)
                if (this.editorManager && this.editorManager.isActive) {
                    this.editorManager.update(safeDeltaTime);
                }
                
                // Show pause indicator (but not when editor is active)
                if (!this.editorManager || !this.editorManager.isActive) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '48px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('PAUSED', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
                }
            }
            
            // Schedule next frame
            if (!this.bootVSync) {
                // VSync OFF: Use high-precision scheduler
                port.postMessage(null);
            } else {
                // VSync ON: Use standard rAF to align with refresh rate
                requestAnimationFrame(gameLoop);
            }
        };
        
        // Setup the message handler
        channel.port1.onmessage = gameLoop;
        
        // Start the loop
        if (!this.bootVSync) {
            port.postMessage(null);
        } else {
            requestAnimationFrame(gameLoop);
        }
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
        // Clear Canvas2D
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Clear WebGL canvas if not in gameplay state (to prevent leftover frames showing through)
        // The WebGL canvas is only rendered by PlayingState, so other states need to clear it
        const currentState = this.stateManager.getCurrentState();
        const isPlayingOnStack = this.stateManager.isStateInStack('PLAYING');
        const isGameplayActive = currentState === 'PLAYING' || isPlayingOnStack;
        
        if (!isGameplayActive && this.renderSystem?.webglRenderer?.initialized) {
            const gl = this.renderSystem.webglRenderer.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        
        // Render current state
        this.stateManager.render(this.ctx);
        
        // Render editor overlay
        this.editorManager.render(this.ctx);
        
        // Render debug info if enabled (FPS or full debug)
        if (this.settings.showDebugInfo || this.settings.showFPS) {
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
        
        // Update light system (flicker animation)
        if (this.lightManager) {
            this.lightManager.update(deltaTime);
        }
        
        // Update spawn manager for spirit spawning
        if (this.spawnManager) {
            this.spawnManager.update(deltaTime);
        }
        
        // Handle input for gameplay
        this.handleGameplayInput(this.inputManager);
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Manage player light (lantern) - ALWAYS ACTIVE
        if (this.lightManager) {
            const playerLightId = 'player_lantern';
            let playerLight = this.lightManager.getLightById(playerLightId);
            
            if (!playerLight) {
                // Create light if it doesn't exist
                playerLight = {
                    id: playerLightId,
                    x: this.player.x,
                    y: this.player.y,
                    radius: 600, // Increased from 450
                    color: { r: 255, g: 200, b: 150, a: 0.5 }, // Warm lantern light
                    flicker: { enabled: false, style: 'smooth', speed: 0, intensity: 0 }, // Static - no flicker for player light
                    castsShadows: false, // Player's light should NOT cast shadows
                    // Runtime state required for rendering
                    _flickerOffset: 0,
                    _currentIntensity: 1.0
                };
                this.lightManager.addLight(playerLight);
            }
            
            // Update position to follow player
            if (playerLight.x !== this.player.x || playerLight.y !== this.player.y) {
                playerLight.x = this.player.x;
                playerLight.y = this.player.y;
                this.lightManager.maskNeedsUpdate = true;
            }
        }
        
        // Update all objects on current map (NPCs, trees, chests, portals, etc.)
        this.objectManager.updateObjects(this.currentMapId, deltaTime, this);
        
        // Update objects on adjacent maps (for seamless simulation)
        if (this.currentMap && this.currentMap.adjacentMaps) {
            Object.values(this.currentMap.adjacentMaps).forEach(adjMapId => {
                if (adjMapId) {
                    this.objectManager.updateObjects(adjMapId, deltaTime, this);
                }
            });
        }
        
        // Update camera
        this.updateCamera();
        
        // Check collisions
        this.checkPortalCollisions();
        
        // Check map transitions
        this.checkMapTransitions();
    }
    
    /**
     * Check for map transitions at edges
     */
    checkMapTransitions() {
        if (!this.player || !this.currentMap || !this.currentMap.adjacentMaps || this.isTransitioning) return;

        const player = this.player;
        const map = this.currentMap;
        
        // Use standard 4K map dimensions (unscaled)
        const mapWidth = this.MAP_WIDTH;
        const mapHeight = this.MAP_HEIGHT;
        
        // Use getWidth()/getHeight() for player dimensions (Unscaled)
        const playerWidth = player.getWidth();
        const playerHeight = player.getHeight();
        const halfWidth = playerWidth / 2;
        const halfHeight = playerHeight / 2;

        // Allow player to walk slightly past the edge before transitioning
        // Trigger when the CENTER of the player crosses the boundary
        // This feels more natural than "leading edge" (too early) or "trailing edge" (too late)
        const margin = -halfHeight; 

        let nextMapId = null;
        let entryDirection = null;

        // Check North (Top edge) - Trigger when player center moves past top margin
        if (player.y < margin + halfHeight && map.adjacentMaps.north && player.inputY < 0) {
            nextMapId = map.adjacentMaps.north;
            entryDirection = 'north';
        }
        // Check South (Bottom edge) - Trigger when player center moves past bottom margin
        else if (player.y > mapHeight - halfHeight - margin && map.adjacentMaps.south && player.inputY > 0) {
            nextMapId = map.adjacentMaps.south;
            entryDirection = 'south';
        }
        // Check West (Left edge)
        else if (player.x < margin + halfWidth && map.adjacentMaps.west && player.inputX < 0) {
            nextMapId = map.adjacentMaps.west;
            entryDirection = 'west';
        }
        // Check East (Right edge)
        else if (player.x > mapWidth - halfWidth - margin && map.adjacentMaps.east && player.inputX > 0) {
            nextMapId = map.adjacentMaps.east;
            entryDirection = 'east';
        }

        if (nextMapId) {
            this.transitionToMap(nextMapId, entryDirection);
        }
    }

    /**
     * Transition to an adjacent map (Seamless Version)
     * Instead of loading and snapping, we shift coordinates to create an infinite world illusion
     */
    async transitionToMap(mapId, entryDirection) {
        // Prevent multiple transitions
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        console.log(`🔗 Seamless Transition ${entryDirection} to map: ${mapId}`);

        try {
            const newMapData = this.mapManager.getMapData(mapId);
            if (!newMapData) {
                throw new Error(`Map data not found for ${mapId}`);
            }

            // 1. Calculate Coordinate Shift
            // We need to shift the player and camera so they are relative to the NEW map's origin
            let shiftX = 0;
            let shiftY = 0;
            
            // Use standard 4K map dimensions for coordinate shifting
            // All maps are the same size, so shift is simply MAP_WIDTH or MAP_HEIGHT
            const mapWidth = this.MAP_WIDTH;
            const mapHeight = this.MAP_HEIGHT;
            
            if (entryDirection === 'north') {
                // Moving UP. New map is above.
                // Old Y=0 is New Y=Height
                // Shift = +Height
                shiftY = mapHeight;
            } else if (entryDirection === 'south') {
                // Moving DOWN. New map is below.
                // Old Y=Height is New Y=0
                // Shift = -Height
                shiftY = -mapHeight;
            } else if (entryDirection === 'west') {
                // Moving LEFT. New map is left.
                // Old X=0 is New X=Width
                // Shift = +Width
                shiftX = mapWidth;
            } else if (entryDirection === 'east') {
                // Moving RIGHT. New map is right.
                // Old X=Width is New X=0
                // Shift = -Width
                shiftX = -mapWidth;
            }

            console.log(`[Transition] Shift: x=${shiftX}, y=${shiftY} (Unscaled)`);

            // 2. Load the new map data (but don't reset camera/player yet)
            // We manually do what loadMap does, but preserve state
            
            // Load map image if not loaded
            await this.mapManager.loadMap(mapId);
            
            const previousMapId = this.currentMapId;
            this.currentMapId = mapId;
            this.currentMap = newMapData;
            
            // 3. Apply Coordinate Shift to Player
            this.player.x += shiftX;
            this.player.y += shiftY;
            
            // 4. Apply Coordinate Shift to Camera
            // Camera coordinates are SCALED, so we must scale the shift
            // This is critical for the "seamless" look. The camera must move exactly as much as the player
            // so the relative position on screen stays identical.
            const scaledShiftX = shiftX * this.resolutionScale;
            const scaledShiftY = shiftY * this.resolutionScale;
            
            if (this.renderSystem && this.renderSystem.camera) {
                this.renderSystem.camera.x += scaledShiftX;
                this.renderSystem.camera.y += scaledShiftY;
                this.renderSystem.camera.targetX += scaledShiftX;
                this.renderSystem.camera.targetY += scaledShiftY;
            }
            
            // 5. Initialize Systems for New Map
            
            // Layers
            this.layerManager.initializeMapLayers(mapId);
            
            // Objects
            this.objectManager.loadObjectsForMap(mapId);
            
            // Lights
            if (this.lightManager) {
                if (newMapData.lights) {
                    this.lightManager.loadLights(newMapData.lights);
                } else {
                    this.lightManager.clearLights();
                }
            }
            
            // Audio (Seamless crossfade)
            let bgmFilename = null;
            if (newMapData.music) bgmFilename = newMapData.music.split('/').pop();
            if (this.audioManager.currentBGM !== bgmFilename) {
                this.audioManager.playBGM(bgmFilename);
            }
            
            let ambienceFilename = null;
            if (newMapData.ambience) ambienceFilename = newMapData.ambience.split('/').pop();
            this.audioManager.playAmbience(ambienceFilename);
            
            // Weather
            if (this.weatherSystem) {
                this.weatherSystem.setWeather(newMapData.weather || null);
            }
            
            // Spawns
            if (this.spawnManager) {
                // Activate the new current map (it might already be active from adjacent loading)
                this.spawnManager.activateMap(mapId);
                
                // Cleanup distant maps
                // 1. Calculate new active set (Current + Neighbors)
                const activeSet = new Set([mapId]);
                if (newMapData.adjacentMaps) {
                    Object.values(newMapData.adjacentMaps).forEach(id => activeSet.add(id));
                }
                
                // 2. Deactivate any map currently active that is NOT in the new set
                // We access the internal map of active spawns
                for (const activeMapId of this.spawnManager.activeMaps.keys()) {
                    if (!activeSet.has(activeMapId)) {
                        this.spawnManager.deactivateMap(activeMapId);
                    }
                }
            }
            
            // Preload next set of adjacent maps
            this.loadAdjacentMaps();
            
            console.log(`✅ Seamless transition complete to ${mapId}`);

        } catch (error) {
            console.error('❌ Transition failed:', error);
        } finally {
            // Add a small delay before allowing another transition to prevent bouncing
            setTimeout(() => {
                this.isTransitioning = false;
            }, 200);
        }
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
        
        // Get adjacent map data for rendering (cardinal + diagonal directions)
        const adjacentMapsData = {};
        if (this.currentMap.adjacentMaps) {
            const adjacent = this.currentMap.adjacentMaps;
            // Cardinal directions
            if (adjacent.north) adjacentMapsData.north = this.mapManager.getMapData(adjacent.north);
            if (adjacent.south) adjacentMapsData.south = this.mapManager.getMapData(adjacent.south);
            if (adjacent.east) adjacentMapsData.east = this.mapManager.getMapData(adjacent.east);
            if (adjacent.west) adjacentMapsData.west = this.mapManager.getMapData(adjacent.west);
            // Diagonal directions (for fake 3D perspective)
            if (adjacent.northeast) adjacentMapsData.northeast = this.mapManager.getMapData(adjacent.northeast);
            if (adjacent.northwest) adjacentMapsData.northwest = this.mapManager.getMapData(adjacent.northwest);
            if (adjacent.southeast) adjacentMapsData.southeast = this.mapManager.getMapData(adjacent.southeast);
            if (adjacent.southwest) adjacentMapsData.southwest = this.mapManager.getMapData(adjacent.southwest);
        }

        this.renderSystem.renderWorld(
            this.currentMap,
            nonNPCObjects,
            npcs,
            this.player,
            this,
            adjacentMapsData
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
        
        // Get movement input (includes analog magnitude for controller/touch)
        const movement = inputManager.getMovementInput();
        
        // Set player input
        // alwaysRun: when enabled, player runs by default and holds shift to walk
        const shiftHeld = inputManager.isPressed('run');
        const alwaysRun = this.settings.alwaysRun || false;
        
        // Running requires holding the run button (same for keyboard and controller)
        // alwaysRun inverts this: run by default, hold button to walk
        const isRunning = alwaysRun ? !shiftHeld : shiftHeld;
        
        this.player.setInput({
            moveX: movement.x,
            moveY: movement.y,
            isRunning: isRunning,
            magnitude: movement.magnitude  // Pass magnitude for analog speed control
        });
        
        // Toggle always run mode with R key
        if (inputManager.isJustPressed('toggleRun')) {
            this.settings.alwaysRun = !this.settings.alwaysRun;
            this.settingsManager.update(this.settings);
            console.log(`[GameEngine] Always Run: ${this.settings.alwaysRun ? 'ON' : 'OFF'}`);
        }
        
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
     * @param {string} mapId - ID of map to load
     * @param {Object} spawnPosition - Optional {x, y} to set player position immediately
     */
    async loadMap(mapId, spawnPosition = null) {
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
        
        // Set player position immediately if provided (prevents camera glitching during transition)
        if (spawnPosition && this.player) {
            this.player.x = spawnPosition.x;
            this.player.y = spawnPosition.y;
            // Also snap camera immediately if it exists
            if (this.renderSystem && this.renderSystem.camera) {
                this.renderSystem.camera.snapToTarget = true;
            }
        }
        
        // Initialize layers for this map (creates base layer if doesn't exist)
        this.layerManager.initializeMapLayers(mapId);
        
        // Load all objects for this map (NPCs, trees, chests, portals, etc.)
        this.objectManager.loadObjectsForMap(mapId);
        
        // Load lights for this map
        if (this.lightManager && mapData.lights) {
            this.lightManager.loadLights(mapData.lights);
            console.log(`[GameEngine] Loaded ${mapData.lights.length} lights for map ${mapId}`);
        } else if (this.lightManager) {
            this.lightManager.clearLights();
        }
        
        // Handle BGM - extract just the filename from the full path
        let bgmFilename = null;
        if (mapData.music) {
            bgmFilename = mapData.music.split('/').pop(); // Get just the filename like '01.mp3'
        }
        
        console.log('🎵 Requesting BGM:', bgmFilename);
        // Use crossfade if switching maps (and not initial load)
        if (this.audioManager.currentBGM && this.audioManager.currentBGM !== bgmFilename) {
            // AudioManager.playBGM handles crossfade internally if implemented, 
            // but let's check if we need to explicitly call a crossfade method
            // Looking at AudioManager, playBGM calls crossfadeBGM if something is playing.
            this.audioManager.playBGM(bgmFilename); 
        } else {
            this.audioManager.playBGM(bgmFilename);
        }
        
        // Handle Ambience - extract just the filename from the full path
        let ambienceFilename = null;
        if (mapData.ambience) {
            ambienceFilename = mapData.ambience.split('/').pop(); // Get just the filename like 'forest-0.mp3'
        }
        
        console.log('🌲 Requesting Ambience:', ambienceFilename);
        this.audioManager.playAmbience(ambienceFilename); // AudioManager handles duplicate detection
        
        // Initialize weather system for this map
        if (this.weatherSystem) {
            // Check if weather is different to avoid restarting same weather
            const currentPrecip = this.weatherSystem.precipitation;
            const newPrecip = mapData.weather ? mapData.weather.precipitation : 'none';
            
            if (currentPrecip !== newPrecip) {
                // TODO: Implement smooth weather transition in WeatherSystem
                this.weatherSystem.setWeather(mapData.weather || null);
            } else {
                // Even if precipitation is same, update other params like wind/particles
                // But maybe don't restart the system completely
                this.weatherSystem.setWeather(mapData.weather || null);
            }
        }
        
        // Initialize spawn system for this map
        if (this.spawnManager) {
            this.spawnManager.activateMap(mapId);
        }
        
        // Load adjacent maps for seamless transitions
        this.loadAdjacentMaps();
        
        console.log(`Loaded map: ${mapId}`);
    }
    

    
    /**
     * Load adjacent maps for seamless transition
     * Includes diagonal maps for proper fake 3D perspective rendering
     */
    async loadAdjacentMaps() {
        if (!this.currentMap || !this.currentMap.adjacentMaps) return;
        
        const adjacent = this.currentMap.adjacentMaps;
        const promises = [];
        
        console.log('[GameEngine] Preloading adjacent maps:', adjacent);
        
        // Helper to load map AND its objects AND activate spawns
        const loadMapAndObjects = async (mapId) => {
            // Load map image
            await this.mapManager.loadMap(mapId);
            // Load objects for this map (if not already loaded)
            if (!this.objectManager.initializedMaps.has(mapId)) {
                this.objectManager.loadObjectsForMap(mapId);
            }
            // Activate spawn system for this map
            if (this.spawnManager) {
                this.spawnManager.activateMap(mapId);
            }
        };

        // Cardinal directions
        if (adjacent.north) promises.push(loadMapAndObjects(adjacent.north));
        if (adjacent.south) promises.push(loadMapAndObjects(adjacent.south));
        if (adjacent.east) promises.push(loadMapAndObjects(adjacent.east));
        if (adjacent.west) promises.push(loadMapAndObjects(adjacent.west));
        
        // Diagonal directions (for fake 3D perspective)
        if (adjacent.northeast) promises.push(loadMapAndObjects(adjacent.northeast));
        if (adjacent.northwest) promises.push(loadMapAndObjects(adjacent.northwest));
        if (adjacent.southeast) promises.push(loadMapAndObjects(adjacent.southeast));
        if (adjacent.southwest) promises.push(loadMapAndObjects(adjacent.southwest));
        
        try {
            await Promise.all(promises);
            console.log('[GameEngine] Adjacent maps, objects, and spawns loaded');
        } catch (error) {
            console.error('[GameEngine] Failed to load adjacent maps:', error);
        }
    }
    
    /**
     * Update camera system
     */
    updateCamera() {
        if (!this.player || !this.currentMap) return;
        
        // Map dimensions in screen space (world coords × worldScale)
        const screenMapWidth = this.MAP_WIDTH * this.worldScale;
        const screenMapHeight = this.MAP_HEIGHT * this.worldScale;
        
        // Get player position in screen space for camera following
        const screenPlayerX = this.player.getScaledX(this);
        const screenPlayerY = this.player.getScaledY(this);
        
        // Delegate camera update to RenderSystem
        this.renderSystem.updateCamera(
            screenPlayerX,
            screenPlayerY,
            this.CANVAS_WIDTH,
            this.CANVAS_HEIGHT,
            screenMapWidth,
            screenMapHeight,
            this.currentMap.adjacentMaps || {}
        );
    }
    
    // Rendering methods (renderMap, renderGameObjects, renderLegacyObject) now handled by RenderSystem
    
    /**
     * Render UI elements
     */
    renderUI(ctx) {
        // Render HUD if player exists and not in editor mode (unless testing)
        if (this.player && this.hudSystem) {
            // Don't hide HUD in editor mode, it's useful to see
            this.hudSystem.render(ctx, this.player);
        }
        
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
            this.currentMapId,
            this.settings
        );
    }
    
    /**
     * Calculate shadow properties based on time of day
     * Cached and updated every 100ms for smoother transitions
     */
    getShadowProperties() {
        const now = Date.now();
        
        // Check if weather system is transitioning (need to recalculate every frame)
        const isWeatherTransitioning = this.weatherSystem?.isTransitioning ?? false;
        
        // Cache shadow properties for 100ms (updates 10x per second)
        // Unless we're in a weather transition, then always recalculate
        if (!isWeatherTransitioning && this._shadowPropsCache && (now - this._shadowPropsCacheTime) < 100) {
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
            const isClearNight = !hasWeather || precipitation === 'none' || precipitation === 'sun';
            
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
                    shadowOpacity = 0.25 * fadeIn; // Dimmer moon shadows
                } else if (timeOfDay >= 4 && timeOfDay < 5) {
                    // Pre-dawn fade out (4-5 AM)
                    const fadeOut = 1 - (timeOfDay - 4); // 1 to 0
                    shadowOpacity = 0.25 * fadeOut; // Dimmer moon shadows
                } else {
                    // Full moon shadows (9 PM - 4 AM)
                    shadowOpacity = 0.25; // Reduced from 0.15 - subtler moon shadows
                }
            } else {
                // Cloudy/rainy/snowy night: no moon visible, no shadows
                shadowOpacity = 0;
                shadowDirection = 0;
            }
        }
        
        // WEATHER EFFECTS on shadow intensity (only affects sun shadows, not moon)
        // Use weather system's interpolated shadow multiplier for smooth transitions
        if (!isMoonShadow && this.weatherSystem) {
            const shadowMultiplier = this.weatherSystem.getShadowMultiplier?.() ?? 1.0;
            shadowOpacity *= shadowMultiplier;
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
    getSpriteCache(sprite, width, height, flipX = false) {
        // Create cache key from sprite src (include flip state)
        const cacheKey = `${sprite.src}_${Math.round(width)}_${Math.round(height)}_${flipX}`;
        
        // Return cached silhouette if available
        if (this._spriteShadowCache && this._spriteShadowCache[cacheKey]) {
            return this._spriteShadowCache[cacheKey];
        }
        
        // Initialize cache if needed
        if (!this._spriteShadowCache) {
            this._spriteShadowCache = {};
        }
        
        // Create silhouette canvas (only once per unique sprite/size/flip combination)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        // Draw sprite with optional flip
        if (flipX) {
            tempCtx.save();
            tempCtx.translate(width, 0);
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(sprite, 0, 0, width, height);
            tempCtx.restore();
        } else {
            tempCtx.drawImage(sprite, 0, 0, width, height);
        }
        
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
    drawShadow(x, y, width, height, altitudeOffset = 0, sprite = null, flipX = false) {
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
        // Shadow should always be at ground level, NOT affected by altitude
        const shadowX = x; // NO offsetX! Base stays put!
        const shadowY = y + (height / 2); // Exact bottom of sprite at ground level
        
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            // SPRITE-BASED SHADOW: Use cached sprite silhouette (already flipped if needed)
            const silhouette = this.getSpriteCache(sprite, width, height, flipX);
            
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
            
            // Draw the cached silhouette anchored at bottom center (no flip needed, already in cache)
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
     * Check for collisions with map boundaries and objects
     */
    checkActorCollisions(newX, newY, movingActor, game) {
        // Determine which map this actor belongs to
        const mapId = movingActor.mapId || this.currentMapId;
        const mapData = this.mapManager.maps[mapId];
        
        if (!mapData) return { collides: false };

        // Check map boundaries first
        if (movingActor.canBeBlocked) {
            // Use UNSCALED dimensions for boundary checks
            // Player coordinates are in unscaled map units
            const actorWidth = movingActor.getWidth();
            const actorHeight = movingActor.getHeight();
            const halfWidth = actorWidth / 2;
            const halfHeight = actorHeight / 2;
            
            // Use standard 4K map dimensions
            const mapWidth = this.MAP_WIDTH;
            const mapHeight = this.MAP_HEIGHT;
            
            // Check if actor would be outside map bounds
            // Allow walking off the edge IF there is an adjacent map in that direction
            const adjacent = mapData.adjacentMaps || {};
            
            // Check West (Left)
            if (newX - halfWidth < 0) {
                if (!adjacent.west) return { collides: true, object: 'map_boundary' };
            }
            
            // Check East (Right)
            if (newX + halfWidth > mapWidth) {
                if (!adjacent.east) return { collides: true, object: 'map_boundary' };
            }
            
            // Check North (Top)
            if (newY - halfHeight < 0) {
                // If no adjacent map, block
                if (!adjacent.north) return { collides: true, object: 'map_boundary' };
                // If adjacent map exists, allow passing
            }
            
            // Check South (Bottom)
            if (newY + halfHeight > mapHeight) {
                if (!adjacent.south) return { collides: true, object: 'map_boundary' };
            }
        }
        
        // Check vector collision zones
        if (movingActor.canBeBlocked && this.collisionSystem) {
            // Pass mapId to collision system
            if (this.collisionSystem.checkZoneCollision(newX, newY, this, movingActor, mapId)) {
                return { collides: true, object: 'vector_collision' };
            }
        }
        
        // Check painted collision areas
        if (movingActor.canBeBlocked && this.editorManager) {
            const collisionLayer = this.editorManager.getCollisionLayer(mapId);
            if (collisionLayer) {
                // Check if the actor's collision bounds intersect with painted collision
                if (this.checkPaintedCollision(newX, newY, movingActor, collisionLayer, game || this)) {
                    return { collides: true, object: 'painted_collision' };
                }
            }
        }
        
        // Get all objects that could block movement on the actor's map
        const allObjects = this.getAllGameObjectsOnMap(mapId);
        
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
        
        return { collides: false };
    }
    
    /**
     * Check if actor collides with painted collision areas
     * OPTIMIZED: Cache image data to avoid expensive getImageData() calls every frame
     * SMOOTHING: Uses edge tolerance to allow sliding along collision boundaries
     */
    checkPaintedCollision(newX, newY, movingActor, collisionLayer, game, currentPosOverride = null) {
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
        
        // Get actor's collision bounds (already in scaled/canvas space!)
        const collisionBounds = movingActor.getCollisionBounds(game);
        
        // Calculate what the collision bounds would be if actor were at newX, newY
        // newX and newY are in LOGICAL space, so we need to scale them
        const resolutionScale = game.resolutionScale || 1.0;
        const scaledNewX = newX * resolutionScale;
        const scaledNewY = newY * resolutionScale;
        
        const currentX = currentPosOverride ? currentPosOverride.x : movingActor.getScaledX(game);
        const currentY = currentPosOverride ? currentPosOverride.y : movingActor.getScaledY(game);
        const deltaX = scaledNewX - currentX;
        const deltaY = scaledNewY - currentY;
        
        // Offset collision bounds to new position (already in canvas space)
        const boundsAtNewPos = {
            x: collisionBounds.x + deltaX,
            y: collisionBounds.y + deltaY,
            width: collisionBounds.width,
            height: collisionBounds.height,
            left: collisionBounds.left + deltaX,
            right: collisionBounds.right + deltaX,
            top: collisionBounds.top + deltaY,
            bottom: collisionBounds.bottom + deltaY
        };
        
        // Bounds are already in canvas pixel space - no need to multiply again!
        const canvasLeft = boundsAtNewPos.left;
        const canvasRight = boundsAtNewPos.right;
        const canvasTop = boundsAtNewPos.top;
        const canvasBottom = boundsAtNewPos.bottom;
        const canvasCenterX = (canvasLeft + canvasRight) / 2;
        const canvasCenterY = (canvasTop + canvasBottom) / 2;
        
        // EDGE SMOOTHING: Shrink the collision check area slightly to create "slippery" edges
        // This prevents getting stuck on single pixels and allows sliding along walls
        const edgeTolerance = 2; // pixels of tolerance on edges
        const smoothLeft = canvasLeft + edgeTolerance;
        const smoothRight = canvasRight - edgeTolerance;
        const smoothTop = canvasTop + edgeTolerance;
        const smoothBottom = canvasBottom - edgeTolerance;
        
        // Sample multiple points around the actor's collision bounds
        // Using SMOOTHED bounds for edge points, original bounds for center
        const samplePoints = [
            { x: Math.floor(canvasCenterX), y: Math.floor(canvasCenterY) },           // Center (strict)
            { x: Math.floor(smoothLeft), y: Math.floor(smoothTop) },                  // Top-left (smooth)
            { x: Math.floor(smoothRight), y: Math.floor(smoothTop) },                 // Top-right (smooth)
            { x: Math.floor(smoothLeft), y: Math.floor(smoothBottom) },               // Bottom-left (smooth)
            { x: Math.floor(smoothRight), y: Math.floor(smoothBottom) },              // Bottom-right (smooth)
            { x: Math.floor(canvasCenterX), y: Math.floor(smoothTop) },               // Top-center (smooth)
            { x: Math.floor(canvasCenterX), y: Math.floor(smoothBottom) },            // Bottom-center (smooth)
            { x: Math.floor(smoothLeft), y: Math.floor(canvasCenterY) },              // Left-center (smooth)
            { x: Math.floor(smoothRight), y: Math.floor(canvasCenterY) }              // Right-center (smooth)
        ];
        
        // Count collision hits - require majority to block (reduces single-pixel snags)
        let collisionHits = 0;
        const collisionThreshold = 3; // Need at least 3 sample points hitting collision
        
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
            
            // Check if pixel is red (painted collision) with alpha > 0
            // Painted collision is solid red: rgba(255, 0, 0, 1.0)
            if (r > 200 && g < 50 && b < 50 && a > 200) {
                collisionHits++;
                
                // Early exit if threshold already exceeded
                if (collisionHits >= collisionThreshold) {
                    // Only log 1% of collisions to avoid console spam
                    if (Math.random() < 0.01) {
                        console.log(`🚫 [Collision] BLOCKED at world (${newX.toFixed(1)}, ${newY.toFixed(1)}) with ${collisionHits} hits`);
                    }
                    return true; // Solid collision detected
                }
            }
        }
        
        // Not enough collision hits - allow movement (creates "slippery" edges)
        if (collisionHits > 0 && Math.random() < 0.01) {
            console.log(`✨ [Collision] SLIDING with only ${collisionHits} hits (threshold: ${collisionThreshold})`);
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
     * Apply game zoom setting
     * Updates userZoom and recalculates worldScale
     */
    applyGameZoomSetting() {
        const zoomPercent = this.settings.gameZoom || 100;
        
        // Convert percentage to multiplier
        // 85% = 0.85 (zoomed in, see less world, bigger sprites)
        // 100% = 1.0 (default)
        // 115% = 1.15 (zoomed out, see more world, smaller sprites)
        this.userZoom = zoomPercent / 100;
        
        // Recalculate world scale with new user zoom
        this.updateWorldScale();
        
        // Force camera to snap instantly to new position (no smoothing)
        // This prevents the "character jumping" effect when zoom changes
        if (this.renderSystem?.camera) {
            this.renderSystem.camera.snapToTarget = true;
        }
        
        // Immediately update camera with new scaled positions
        this.updateCamera();
        
        console.log(`[GameEngine] ✅ Game zoom applied: ${zoomPercent}% (worldScale=${this.worldScale.toFixed(3)}, visible=${this.visibleWorldWidth.toFixed(0)}x${this.visibleWorldHeight.toFixed(0)} world units)`);
    }
    
    /**
     * Translation helper - shortcut to localeManager.t()
     * @param {string} key - Translation key (e.g., 'menu.main.newGame')
     * @param {Object} params - Optional parameters for interpolation
     * @returns {string} Translated string
     */
    t(key, params = {}) {
        // Fallback if localeManager isn't initialized yet (during early loading)
        if (!this.localeManager) {
            // Return a reasonable default based on the key
            const fallbacks = {
                'loading.loading': 'Loading...',
                'loading.audio': 'Loading audio...',
                'loading.maps': 'Loading maps...',
                'loading.initializing': 'Initializing game...',
                'loading.saveData': 'Loading save data...',
                'loading.map': 'Loading map...',
                'loading.restoring': 'Restoring game state...',
                'loading.ready': 'Ready!',
                'loading.failed': 'Failed to load save',
                'loading.clickToStart': 'Click to Start',
                'loading.clickToStartHint': 'Click anywhere or press any key to begin'
            };
            return fallbacks[key] || key.split('.').pop();
        }
        return this.localeManager.t(key, params);
    }
    
    /**
     * Change the current language
     * @param {string} localeCode - Locale code (e.g., 'en', 'ja', 'es')
     * @returns {Promise<boolean>} Success status
     */
    async changeLanguage(localeCode) {
        const success = await this.localeManager.setLocale(localeCode);
        if (success) {
            // Update settings
            this.settings.language = localeCode;
            this.settingsManager.set('language', localeCode);
            console.log(`[GameEngine] ✅ Language changed to: ${localeCode}`);
        }
        return success;
    }
    
    /**
     * Get available languages for settings UI
     * @returns {Array<{code: string, name: string, nativeName: string}>}
     */
    getAvailableLanguages() {
        return this.localeManager.getSupportedLocales();
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
    
    /**
     * Reset game state for a new game or when exiting to main menu
     */
    resetGame() {
        console.log('🔄 Resetting game state...');
        
        // Reset player
        this.initializePlayer();
        
        // Reset map state
        this.currentMapId = '0-0'; // Default start map
        this.currentMap = null;
        
        // Clear managers
        if (this.objectManager) this.objectManager.clear();
        if (this.spawnManager) this.spawnManager.clear();
        if (this.lightManager) this.lightManager.clearLights();
        if (this.weatherSystem) this.weatherSystem.setWeather('clear');
        if (this.dayNightCycle) this.dayNightCycle.setTime(12); // Reset to noon
        
        // Reset playtime
        this.playtime = 0;
        
        // Reset camera
        if (this.camera) {
            this.camera.x = 0;
            this.camera.y = 0;
            this.camera.target = this.player;
        }
        
        console.log('✅ Game state reset complete');
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