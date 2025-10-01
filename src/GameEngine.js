/**
 * GameEngine - Core game engine with proper separation of concerns
 * Manages the main game loop and coordinates all systems
 */
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.debug = document.getElementById('debug');
        
        // Canvas setup
        this.CANVAS_WIDTH = window.innerWidth;
        this.CANVAS_HEIGHT = window.innerHeight;
        this.setupCanvas();
        
        // Core systems
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager();
        this.stateManager = new GameStateManager(this);
        
        // Game systems
        this.mapManager = new MapManager();
        this.npcManager = new NPCManager();
        this.interactiveObjectManager = new InteractiveObjectManager();
        this.itemManager = new ItemManager();
        this.inventoryManager = new InventoryManager(this.itemManager);
        
        // Game state
        this.currentMapId = '0-0';
        this.currentMap = null;
        this.maps = {};
        this.npcs = {};
        
        // Player - use proper Player class instance
        this.player = null;
        this.initializePlayer();
        
        // Camera system
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        // Performance tracking
        this.lastTime = 0;
        this.fpsCounter = {
            fps: 60,
            frameCount: 0,
            lastSecond: 0,
            minFPS: 60,
            maxFPS: 60,
            gracePeriod: 60 // Skip first 60 frames for accurate measurement
        };
        
        // Game settings
        this.settings = {
            masterVolume: 100,
            musicVolume: 100,
            effectsVolume: 100,
            isMuted: false,
            showFPS: true,
            showDebug: false,
            showDebugInfo: true
        };
        
        // Debug controls
        this.isPaused = false;
        
        // Load saved settings
        this.loadSettings();
        
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
            // Load game data
            this.maps = this.mapManager.initializeAllMaps();
            this.npcs = this.npcManager.initializeAllNPCs();
            
            // Don't load map yet - wait until game starts
            
            // Start game loop
            this.startGameLoop();
            
            console.log('Game engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
        }
    }
    
    /**
     * Initialize player using proper Player class
     */
    initializePlayer() {
        this.player = new Player({
            x: 400,
            y: 300,
            spriteSrc: 'assets/npc/main-0.png',
            scale: 0.07,
            gold: 100
        });
    }
    
    /**
     * Setup canvas properties
     */
    setupCanvas() {
        // Get device pixel ratio for high DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set display size first
        this.canvas.style.width = this.CANVAS_WIDTH + 'px';
        this.canvas.style.height = this.CANVAS_HEIGHT + 'px';
        this.canvas.style.cursor = 'none';
        
        // Set actual canvas size (scaled for high DPI)
        this.canvas.width = this.CANVAS_WIDTH * devicePixelRatio;
        this.canvas.height = this.CANVAS_HEIGHT * devicePixelRatio;
        
        // Scale context back to logical pixels
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Disable image smoothing for pixel art (if needed)
        this.ctx.imageSmoothingEnabled = false;
        
        // Improve text rendering
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.textRendering = 'optimizeQuality';
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.CANVAS_WIDTH = window.innerWidth;
            this.CANVAS_HEIGHT = window.innerHeight;
            
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            // Set display size first
            this.canvas.style.width = this.CANVAS_WIDTH + 'px';
            this.canvas.style.height = this.CANVAS_HEIGHT + 'px';
            
            // Set actual canvas size (scaled for high DPI)
            this.canvas.width = this.CANVAS_WIDTH * devicePixelRatio;
            this.canvas.height = this.CANVAS_HEIGHT * devicePixelRatio;
            
            // Scale context back to logical pixels
            this.ctx.scale(devicePixelRatio, devicePixelRatio);
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textRendering = 'optimizeQuality';
        });
    }
    
    /**
     * Start the main game loop
     */
    startGameLoop() {
        // Add pause control with P key and debug controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP') {
                this.isPaused = !this.isPaused;
                console.log(`Game ${this.isPaused ? 'PAUSED' : 'UNPAUSED'}`);
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
        });
        
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            if (!this.isPaused) {
                this.update(deltaTime);
                this.render();
                this.updateFPS(deltaTime);
            } else {
                // Still render when paused, just don't update
                this.render();
                
                // Show pause indicator
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('PAUSED', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
                this.ctx.fillText('Press P to continue', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 60);
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
        
        // Handle input for gameplay
        this.handleGameplayInput(this.inputManager);
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Update NPCs
        this.npcManager.updateRoamingNPCs(this.currentMapId, deltaTime, {
            width: this.currentMap.width,
            height: this.currentMap.height
        });
        
        // Update interactive objects
        this.interactiveObjectManager.updateObjects(this.currentMapId, deltaTime, this);
        
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
        
        // Set camera transform
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render map
        this.renderMap(ctx);
        
        // Render game objects with depth sorting
        this.renderGameObjects(ctx);
        
        // Restore transform
        ctx.restore();
        
        // Render UI elements (not affected by camera)
        this.renderUI(ctx);
    }
    
    /**
     * Handle gameplay input
     */
    handleGameplayInput(inputManager) {
        if (!this.player) return;
        
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
        const interactiveObj = this.interactiveObjectManager.checkNearbyInteractions(this.player, this.currentMapId);
        if (interactiveObj) {
            const result = this.interactiveObjectManager.handleInteraction(interactiveObj, this.player, this);
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
            this.npcManager.startDialogue(npc, () => this.audioManager.playEffect('speech-bubble.mp3'));
            this.stateManager.pushState('DIALOGUE', { npc: npc });
        }
    }
    
    /**
     * Check for portal collisions
     */
    checkPortalCollisions() {
        const portal = this.interactiveObjectManager.checkPortalCollisions(this.player, this.currentMapId);
        if (portal) {
            this.teleportToMap(portal.targetMap, portal.spawnPoint);
        }
    }
    
    /**
     * Teleport to a different map
     */
    async teleportToMap(mapId, spawnPoint = 'default') {
        try {
            await this.loadMap(mapId);
            this.positionPlayerOnMap(mapId, spawnPoint);
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
        
        // Load interactive objects for this map
        this.interactiveObjectManager.loadObjectsForMap(mapId);
        
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
        this.audioManager.playAmbience(ambienceFilename); // AudioManager handles duplicate detection        console.log(`Loaded map: ${mapId}`);
    }
    
    /**
     * Position player on map
     */
    positionPlayerOnMap(mapId, spawnPoint = 'default') {
        const mapData = this.mapManager.getMapData(mapId);
        if (!mapData) return;
        
        const spawn = mapData.spawnPoints[spawnPoint] || mapData.spawnPoints.default;
        if (spawn && this.player) {
            this.player.setPosition(spawn.x, spawn.y);
        }
    }
    
    /**
     * Update camera system
     */
    updateCamera() {
        if (!this.player) return;
        
        const targetX = this.player.x - this.CANVAS_WIDTH / 2;
        const targetY = this.player.y - this.CANVAS_HEIGHT / 2;
        
        // Smooth camera movement
        this.camera.x += (targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (targetY - this.camera.y) * this.camera.smoothing;
        
        // Keep camera within map bounds
        if (this.currentMap) {
            this.camera.x = Math.max(0, Math.min(this.currentMap.width - this.CANVAS_WIDTH, this.camera.x));
            this.camera.y = Math.max(0, Math.min(this.currentMap.height - this.CANVAS_HEIGHT, this.camera.y));
        }
    }
    
    /**
     * Render map background
     */
    renderMap(ctx) {
        if (!this.currentMap || !this.currentMap.image) return;
        
        const scale = this.currentMap.scale || 1.0;
        ctx.drawImage(
            this.currentMap.image,
            0, 0,
            this.currentMap.width * scale,
            this.currentMap.height * scale
        );
    }
    
    /**
     * Render all game objects with depth sorting
     */
    renderGameObjects(ctx) {
        const allObjects = [];
        
        // Add player
        if (this.player) {
            allObjects.push(this.player);
        }
        
        // Add NPCs
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        allObjects.push(...currentMapNPCs);
        
        // Add interactive objects
        const interactiveObjects = this.interactiveObjectManager.getObjectsForMap(this.currentMapId);
        allObjects.push(...interactiveObjects);
        
        // Sort by Y position for depth
        allObjects.sort((a, b) => (a.y + a.height/2) - (b.y + b.height/2));
        
        // Render all objects
        allObjects.forEach(obj => {
            if (obj.render) {
                obj.render(ctx, this);
            } else {
                // Fallback for legacy objects
                this.renderLegacyObject(ctx, obj);
            }
        });
    }
    
    /**
     * Render legacy objects that don't have render methods
     */
    renderLegacyObject(ctx, obj) {
        if (!obj.sprite || !obj.sprite.complete) return;
        
        const screenX = obj.x - obj.width / 2;
        const screenY = obj.y - obj.height / 2;
        
        ctx.drawImage(obj.sprite, screenX, screenY, obj.width, obj.height);
    }
    
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
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        const interactionDistance = 120;
        
        let closestNPC = null;
        let closestDistance = Infinity;
        
        currentMapNPCs.forEach(npc => {
            if (npc.type === 'spirit') return; // Spirits don't have dialogue
            
            const distance = this.player.distanceTo(npc);
            if (distance <= interactionDistance && distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        });
        
        return closestNPC;
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(deltaTime) {
        const currentSecond = Math.floor(performance.now() / 1000);
        
        if (currentSecond !== this.fpsCounter.lastSecond) {
            this.fpsCounter.fps = this.fpsCounter.frameCount;
            this.fpsCounter.frameCount = 0;
            this.fpsCounter.lastSecond = currentSecond;
            
            // Track min/max FPS after grace period
            if (this.fpsCounter.gracePeriod <= 0) {
                this.fpsCounter.minFPS = Math.min(this.fpsCounter.minFPS, this.fpsCounter.fps);
                this.fpsCounter.maxFPS = Math.max(this.fpsCounter.maxFPS, this.fpsCounter.fps);
            } else {
                this.fpsCounter.gracePeriod--;
            }
        }
        
        this.fpsCounter.frameCount++;
    }
    
    /**
     * Render FPS display
     */
    renderDebugInfo() {
        // Bottom left debug panel with improved styling
        const panelWidth = 260;
        const panelHeight = 110;
        const padding = 12;
        const lineHeight = 16;
        
        // Semi-transparent background with border
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, this.CANVAS_HEIGHT - panelHeight - 10, panelWidth, panelHeight);
        
        // Border
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(10, this.CANVAS_HEIGHT - panelHeight - 10, panelWidth, panelHeight);
        
        // Text styling
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px Courier New, monospace';
        this.ctx.textAlign = 'left';
        
        let y = this.CANVAS_HEIGHT - panelHeight + padding;
        
        // FPS info
        this.ctx.fillText(`FPS: ${this.fpsCounter.fps}`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Min: ${this.fpsCounter.minFPS}  Max: ${this.fpsCounter.maxFPS}`, 20, y);
        y += lineHeight;
        
        // Game state info
        this.ctx.fillText(`State: ${this.stateManager.getCurrentState()}`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Map: ${this.currentMapId}`, 20, y);
        y += lineHeight + 4;
        
        // F1 hint in dimmer color
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px Courier New, monospace';
        this.ctx.fillText('Press F1 to toggle debug info', 20, y);
    }
    
    /**
     * Draw shadow for game objects
     */
    drawShadow(x, y, width, height, altitudeOffset = 0) {
        // Draw an elliptical shadow proportional to character width
        const shadowWidth = width * 0.6; // Shadow width based on character width
        const shadowHeight = width * 0.2; // Shadow height much smaller for ground effect
        const shadowX = x;
        const shadowY = y + height * 0.4 + altitudeOffset; // Position shadow at feet level + altitude offset
        
        this.ctx.save();
        // Make shadow fainter for higher altitude objects
        this.ctx.globalAlpha = Math.max(0.15, 0.35 - (altitudeOffset / 300));
        this.ctx.fillStyle = 'black';
        
        // Create elliptical shadow proportional to character width
        this.ctx.beginPath();
        this.ctx.ellipse(shadowX, shadowY, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Check actor collisions with other objects and map boundaries
     */
    checkActorCollisions(newX, newY, movingActor) {
        // Check map boundaries first
        if (this.currentMap && movingActor.canBeBlocked) {
            const actorWidth = movingActor.getWidth();
            const actorHeight = movingActor.getHeight();
            const halfWidth = actorWidth / 2;
            const halfHeight = actorHeight / 2;
            
            // Check if actor would be outside map bounds
            if (newX - halfWidth < 0 || 
                newX + halfWidth > this.currentMap.width ||
                newY - halfHeight < 0 || 
                newY + halfHeight > this.currentMap.height) {
                return { collides: true, object: 'map_boundary' };
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
            
            // Check collision using GameObject collision system
            if (movingActor.wouldCollideAt(newX, newY, obj)) {
                return { collides: true, object: obj };
            }
        }
        
        return { collides: false, object: null };
    }
    
    /**
     * Get all GameObjects on a specific map (NPCs, interactive objects, etc.)
     */
    getAllGameObjectsOnMap(mapId) {
        const objects = [];
        
        // Add NPCs for this specific map
        const npcs = this.npcManager.getNPCsForMap(mapId);
        objects.push(...npcs);
        
        // Add interactive objects
        const interactiveObjects = this.interactiveObjectManager.getObjectsForMap(mapId);
        objects.push(...interactiveObjects);
        
        return objects;
    }


    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('rpg-game-settings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                // Merge saved settings with defaults
                this.settings = { ...this.settings, ...parsedSettings };
                console.log('Settings loaded from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
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