class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.debug = document.getElementById('debug');
        
        // Game settings - will be set to full screen
        this.CANVAS_WIDTH = window.innerWidth;
        this.CANVAS_HEIGHT = window.innerHeight;
        this.PLAYER_SPEED = 3;
        
        // Player properties
        this.player = {
            x: 400, // Start in center of canvas
            y: 300,
            width: 96,  // Will be calculated from scale
            height: 96, // Will be calculated from scale
            scale: 0.07, // Scale factor for sprite dimensions
            facingRight: true,
            sprite: null,
            velocityX: 0,
            velocityY: 0,
            acceleration: 0.5,
            friction: 0.8,
            maxSpeed: 2, // Will be set based on walk/run setting
            gold: 100, // Starting gold amount
            
            // Collision properties
            hasCollision: true,
            blocksMovement: true,
            canBeBlocked: true,
            collisionPercent: 0.25, // Player collision is bottom 25% of sprite (feet area)
            collisionOffsetY: 15 // Collision box at bottom of sprite
        };
        
        // Camera properties
        this.camera = {
            x: 0,
            y: 0
        };
        
        // Current map
        this.currentMap = {
            id: '0-0',
            image: null,
            width: 0,
            height: 0,
            loaded: false
        };
        
        // Map system
        this.maps = {};
        this.currentMapId = '0-0';
        
        // Input handling
        this.keys = {};
        
        // Game state management
        this.gameState = 'MAIN_MENU'; // MAIN_MENU, GAME_MENU, SETTINGS, PLAYING, PAUSED, LOOT_WINDOW, SHOP
        this.gameStarted = false; // Track if game has been started
        
        // Loot window state
        this.lootWindow = {
            active: false,
            items: [],
            gold: 0,
            message: ''
        };

        // Shop state
        this.shop = {
            active: false,
            npc: null,
            mode: 'buy', // 'buy', 'sell'
            selectedIndex: 0,
            items: [],
            quantitySelection: {
                active: false,
                itemData: null,
                mode: '',
                quantity: 1,
                maxQuantity: 1
            }
        };
        
        this.shopOptions = {
            active: false,
            npc: null,
            selectedIndex: 0,
            options: ['Trade', 'Goodbye']
        };
        
        // Battle system
        this.battleState = {
            active: false,
            spirit: null,
            playerStartX: 200,
            spiritStartX: 600
        };
        
        this.battleDialogue = {
            active: false,
            spirit: null,
            message: '',
            showTime: 0
        };
        
        // Disappeared spirits tracking (for respawning after flee)
        this.disappearedSpirits = new Map();
        
        // Main menu (start of game)
        this.mainMenuOptions = ['New Game', 'Continue', 'Settings', 'Exit'];
        this.selectedMainMenuOption = 0;
        
        // In-game menu (pause menu)
        this.gameMenuOptions = ['Resume', 'Inventory', 'Settings', 'Save Game', 'Load Game', 'Main Menu'];
        this.selectedGameMenuOption = 0;
        
        // Settings menu
        this.settingsOptions = ['Master Volume', 'BGM Volume', 'Effect Volume', 'Mute Audio', 'Back to Menu'];
        this.selectedSettingsOption = 0;
        this.previousMenuState = 'MAIN_MENU'; // Track which menu we came from
        
        // Game settings
        this.settings = {
            showDebug: true,
            masterVolume: 100,   // Overall volume multiplier (affects all sound)
            bgmVolume: 100,      // Background music volume
            effectVolume: 100,   // Sound effects volume
            audioMuted: false
        };
        
        // Running state (hold-to-run)
        this.isRunning = false;
        
        // Speed values
        this.speedSettings = {
            'Walk': 0.8,
            'Run': 1.2  // Faster but more reasonable
        };
        
        // Audio system
        this.audio = {
            bgm: null,
            currentTrack: null,
            ambientSound: null,
            currentAmbient: null,
            menuNavigation: null,
            speechBubble: null,
            coin: null,
            footstep: null
        };
        
        // Footstep system
        this.footsteps = {
            isPlaying: false,
            lastStepTime: 0,
            stepInterval: 0,
            baseStepInterval: 400 // Base interval in ms for walking
        };
        
        // Map system
        this.mapManager = new MapManager();
        this.maps = {}; // Maps organized by map ID (will be populated by MapManager)
        
        // NPC system
        this.npcManager = new NPCManager();
        this.npcs = {}; // NPCs organized by map ID (will be populated by NPCManager)
        
        // Interactive Object system
        this.interactiveObjectManager = new InteractiveObjectManager();
        
        // Item and Inventory system
        this.itemManager = new ItemManager();
        this.inventoryManager = new InventoryManager(this.itemManager);
        
        // World items (items that can be picked up from the world)
        this.worldItems = {}; // World items organized by map ID
        
        // Save system
        this.saveSlotKey = 'rpg-game-save';
        this.settingsKey = 'rpg-game-settings';
        
        // Animation timing
        this.gameTime = 0;
        
        // FPS tracking
        this.fps = {
            current: 0,
            min: Infinity,
            max: 0,
            lastTime: performance.now(),
            frameCount: 0,
            lastFpsUpdate: performance.now(),
            graceFrames: 0,
            graceFramesNeeded: 60 // Wait for 60 frames (~1 second) before tracking min/max
        };
        
        // Load saved settings before initializing
        this.loadSettings();
        
        // Initialize the game
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        await this.loadAssets();
        this.setupEventListeners();
        this.updatePlayerSpeed(); // Initialize player speed based on settings
        this.updateAudioVolume(); // Initialize audio volume based on settings
        this.gameLoop();
    }
    
    setupCanvas() {
        // Handle high-DPI displays for crisp rendering
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Set canvas display size
        this.canvas.style.width = this.CANVAS_WIDTH + 'px';
        this.canvas.style.height = this.CANVAS_HEIGHT + 'px';
        
        // Set canvas actual size in memory (accounting for pixel ratio)
        this.canvas.width = this.CANVAS_WIDTH * pixelRatio;
        this.canvas.height = this.CANVAS_HEIGHT * pixelRatio;
        
        // Scale the context to match the device pixel ratio
        this.ctx.scale(pixelRatio, pixelRatio);
        
        // Disable image smoothing for crisp pixel art
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.CANVAS_WIDTH = window.innerWidth;
            this.CANVAS_HEIGHT = window.innerHeight;
            
            // Update canvas display size
            this.canvas.style.width = this.CANVAS_WIDTH + 'px';
            this.canvas.style.height = this.CANVAS_HEIGHT + 'px';
            
            // Update canvas actual size in memory
            this.canvas.width = this.CANVAS_WIDTH * pixelRatio;
            this.canvas.height = this.CANVAS_HEIGHT * pixelRatio;
            
            // Re-scale the context
            this.ctx.scale(pixelRatio, pixelRatio);
            
            // Re-disable image smoothing after canvas resize
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.webkitImageSmoothingEnabled = false;
            this.ctx.mozImageSmoothingEnabled = false;
            this.ctx.msImageSmoothingEnabled = false;
        });
    }
    
    async loadAssets() {
        // Load player sprite
        this.player.sprite = new Image();
        this.player.sprite.src = 'assets/npc/main-0.png';
        
        // Load gold icon
        this.goldIcon = new Image();
        this.goldIcon.src = 'assets/icon/Currency/gold.png';
        
        // Load background music
        this.loadAudio();
        
        // Initialize maps and NPCs
        this.maps = this.mapManager.getAllMaps();
        this.npcs = this.npcManager.initializeAllNPCs();
        
        // Load initial map
        await this.loadMap(this.currentMapId);
        
        // Position player in center of map initially
        this.player.x = this.currentMap.width / 2;
        this.player.y = this.currentMap.height / 2;
        
        // Wait for player sprite to load
        await new Promise(resolve => {
            this.player.sprite.onload = () => {
                // Calculate width and height based on scale when sprite loads
                this.npcManager.calculateSpriteDimensions(this.player);
                
                // Add collision methods to player
                this.addCollisionMethodsToObject(this.player);
                
                resolve();
            };
        });
        
        // Add some test items to inventory for demonstration
        this.addTestItems();
    }
    
    loadAudio() {
        // BGM will be loaded dynamically when maps load
        this.audio.bgm = null;
        
        // Load menu navigation sound effect
        this.audio.menuNavigation = new Audio('assets/audio/effect/menu-navigation.mp3');
        
        // Load speech bubble sound effect
        this.audio.speechBubble = new Audio('assets/audio/effect/speech-bubble.mp3');
        
        // Load coin sound effect
        this.audio.coin = new Audio('assets/audio/effect/coin.mp3');
        
        // Load footstep sound effect
        this.audio.footstep = new Audio('assets/audio/effect/footstep-0.mp3');
        
        // Set initial volumes
        this.updateAudioVolume();
        
        this.audio.menuNavigation.onerror = () => {
            console.warn('Could not load menu navigation sound');
        };
        
        this.audio.speechBubble.onerror = () => {
            console.warn('Could not load speech bubble sound');
        };
    }
    
    async switchBGM(musicPath, fadeTime = 1000) {
        // Don't switch if it's the same track
        if (this.audio.currentTrack === musicPath) {
            return;
        }
        
        const oldBGM = this.audio.bgm;
        const oldTrack = this.audio.currentTrack;
        
        // Load new music track
        const newBGM = new Audio(musicPath);
        newBGM.loop = true;
        
        // Handle loading errors
        newBGM.onerror = () => {
            console.warn(`Could not load background music: ${musicPath}`);
        };
        
        // Wait for the new track to be ready
        await new Promise((resolve) => {
            newBGM.addEventListener('canplaythrough', resolve, { once: true });
            if (newBGM.readyState >= 3) resolve(); // Already loaded
        });
        
        // Set initial volume for new track to 0 (will fade in)
        newBGM.volume = 0;
        
        // Start playing new track
        if (!this.settings.audioMuted) {
            try {
                await newBGM.play();
            } catch (e) {
                console.warn(`Could not play background music (${musicPath}):`, e);
                return;
            }
        }
        
        // Update references
        this.audio.bgm = newBGM;
        this.audio.currentTrack = musicPath;
        
        // Perform crossfade
        this.crossfadeBGM(oldBGM, newBGM, fadeTime);
        
        console.log(`Switching BGM from ${oldTrack} to: ${musicPath} with ${fadeTime}ms fade`);
    }
    
    crossfadeBGM(oldBGM, newBGM, fadeTime) {
        const startTime = Date.now();
        const masterMultiplier = this.settings.masterVolume / 100;
        const targetVolume = (this.settings.bgmVolume / 100) * masterMultiplier;
        
        // Get initial volumes
        const oldInitialVolume = oldBGM ? (oldBGM.volume || targetVolume) : 0;
        const newInitialVolume = 0;
        
        const fadeStep = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeTime, 1);
            
            // Smooth easing function (ease-in-out)
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Fade out old track
            if (oldBGM && !this.settings.audioMuted) {
                oldBGM.volume = oldInitialVolume * (1 - easedProgress);
            }
            
            // Fade in new track
            if (newBGM && !this.settings.audioMuted) {
                newBGM.volume = targetVolume * easedProgress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fadeStep);
            } else {
                // Fade complete - clean up old track
                if (oldBGM) {
                    oldBGM.pause();
                    oldBGM.volume = 0;
                }
                
                // Ensure new track is at correct volume
                if (newBGM && !this.settings.audioMuted) {
                    newBGM.volume = targetVolume;
                }
            }
        };
        
        // Start the fade animation
        requestAnimationFrame(fadeStep);
    }
    
    playBGM() {
        if (this.audio.bgm && !this.settings.audioMuted) {
            this.audio.bgm.currentTime = 0;
            this.audio.bgm.play().catch(e => {
                console.warn('Could not play background music:', e);
            });
        }
    }
    
    stopBGM() {
        if (this.audio.bgm) {
            this.audio.bgm.pause();
            this.audio.currentTrack = null;
        }
    }
    
    async switchAmbientSound(ambientPath, fadeTime = 2000) {
        console.log(`switchAmbientSound called with: ${ambientPath}`);
        
        // Don't switch if it's the same ambient sound
        if (this.audio.currentAmbient === ambientPath) {
            console.log('Same ambient sound, skipping...');
            return;
        }
        
        const oldAmbient = this.audio.ambientSound;
        
        // Load new ambient sound
        const newAmbient = new Audio(ambientPath);
        newAmbient.loop = true;
        
        // Handle loading errors
        newAmbient.onerror = () => {
            console.error(`Could not load ambient sound: ${ambientPath}`);
        };
        
        newAmbient.onloadeddata = () => {
            console.log(`Ambient sound loaded: ${ambientPath}`);
        };
        
        try {
            // Wait for the new ambient sound to be ready
            await new Promise((resolve, reject) => {
                newAmbient.addEventListener('canplaythrough', resolve, { once: true });
                newAmbient.addEventListener('error', reject, { once: true });
                
                // Fallback timeout
                setTimeout(() => {
                    if (newAmbient.readyState >= 2) { // HAVE_CURRENT_DATA
                        resolve();
                    }
                }, 3000);
                
                if (newAmbient.readyState >= 3) resolve(); // Already loaded
            });
            
            // Set initial volume for new ambient sound to 0 (will fade in)
            newAmbient.volume = 0;
            
            // Start playing new ambient sound
            if (!this.settings.audioMuted) {
                console.log('Starting ambient sound playback...');
                await newAmbient.play();
                console.log('Ambient sound playback started successfully');
            }
            
            // Update references
            this.audio.ambientSound = newAmbient;
            this.audio.currentAmbient = ambientPath;
            
            // If no old ambient, just fade in directly
            if (!oldAmbient) {
                this.fadeInAmbient(newAmbient, 1000);
            } else {
                // Perform crossfade
                this.crossfadeAmbient(oldAmbient, newAmbient, fadeTime);
            }
            
            console.log(`Successfully switched ambient sound to: ${ambientPath}`);
            
        } catch (error) {
            console.error(`Failed to load or play ambient sound (${ambientPath}):`, error);
        }
    }
    
    fadeInAmbient(ambient, fadeTime) {
        const startTime = Date.now();
        const masterMultiplier = this.settings.masterVolume / 100;
        const targetVolume = (this.settings.effectVolume / 100) * masterMultiplier * 0.7;
        
        const fadeStep = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeTime, 1);
            
            // Smooth easing function
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            if (ambient && !this.settings.audioMuted) {
                ambient.volume = targetVolume * easedProgress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fadeStep);
            } else {
                console.log(`Ambient fade-in complete, final volume: ${ambient.volume}`);
            }
        };
        
        requestAnimationFrame(fadeStep);
    }
    
    crossfadeAmbient(oldAmbient, newAmbient, fadeTime) {
        const startTime = Date.now();
        const masterMultiplier = this.settings.masterVolume / 100;
        const targetVolume = (this.settings.effectVolume / 100) * masterMultiplier * 0.7; // Increased volume from 0.4 to 0.7
        
        console.log(`Ambient crossfade - Target volume: ${targetVolume}, Master: ${this.settings.masterVolume}, Effect: ${this.settings.effectVolume}, Muted: ${this.settings.audioMuted}`);
        
        // Get initial volumes
        const oldInitialVolume = oldAmbient ? (oldAmbient.volume || targetVolume) : 0;
        const newInitialVolume = 0;
        
        const fadeStep = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeTime, 1);
            
            // Smooth easing function (ease-in-out)
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Fade out old ambient sound
            if (oldAmbient && !this.settings.audioMuted) {
                oldAmbient.volume = oldInitialVolume * (1 - easedProgress);
            }
            
            // Fade in new ambient sound
            if (newAmbient && !this.settings.audioMuted) {
                newAmbient.volume = targetVolume * easedProgress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fadeStep);
            } else {
                // Fade complete - clean up old ambient sound
                if (oldAmbient) {
                    oldAmbient.pause();
                    oldAmbient.volume = 0;
                }
                
                // Ensure new ambient sound is at correct volume
                if (newAmbient && !this.settings.audioMuted) {
                    newAmbient.volume = targetVolume;
                }
            }
        };
        
        // Start the fade animation
        requestAnimationFrame(fadeStep);
    }
    
    stopAmbientSound() {
        if (this.audio.ambientSound) {
            this.audio.ambientSound.pause();
            this.audio.ambientSound = null;
            this.audio.currentAmbient = null;
            console.log('Stopped ambient sound');
        }
    }
    
    updateAudioVolume() {
        const masterMultiplier = this.settings.masterVolume / 100;
        
        if (this.audio.bgm) {
            const bgmVolume = (this.settings.bgmVolume / 100) * masterMultiplier;
            this.audio.bgm.volume = this.settings.audioMuted ? 0 : bgmVolume;
        }
        if (this.audio.menuNavigation) {
            const effectVolume = (this.settings.effectVolume / 100) * masterMultiplier;
            this.audio.menuNavigation.volume = this.settings.audioMuted ? 0 : effectVolume;
        }
        if (this.audio.speechBubble) {
            const effectVolume = (this.settings.effectVolume / 100) * masterMultiplier;
            this.audio.speechBubble.volume = this.settings.audioMuted ? 0 : effectVolume;
        }
        if (this.audio.coin) {
            const effectVolume = (this.settings.effectVolume / 100) * masterMultiplier;
            this.audio.coin.volume = this.settings.audioMuted ? 0 : effectVolume;
        }
        if (this.audio.ambientSound) {
            const ambientVolume = (this.settings.effectVolume / 100) * masterMultiplier * 0.7; // Increased volume
            this.audio.ambientSound.volume = this.settings.audioMuted ? 0 : ambientVolume;
        }
        if (this.audio.footstep) {
            const effectVolume = (this.settings.effectVolume / 100) * masterMultiplier;
            this.audio.footstep.volume = this.settings.audioMuted ? 0 : effectVolume * 0.15; // 50% of effect volume
        }
    }
    
    playMenuNavigationSound() {
        if (this.audio.menuNavigation && !this.settings.audioMuted) {
            this.audio.menuNavigation.currentTime = 0; // Reset to beginning
            this.audio.menuNavigation.play().catch(e => {
                console.warn('Could not play menu navigation sound:', e);
            });
        }
    }
    
    playSpeechBubbleSound() {
        if (this.audio.speechBubble && !this.settings.audioMuted) {
            this.audio.speechBubble.currentTime = 0; // Reset to beginning
            this.audio.speechBubble.play().catch(e => {
                console.warn('Could not play speech bubble sound:', e);
            });
        }
    }
    
    playCoinSound() {
        if (this.audio.coin && !this.settings.audioMuted) {
            this.audio.coin.currentTime = 0; // Reset to beginning
            this.audio.coin.play().catch(e => {
                console.warn('Could not play coin sound:', e);
            });
        }
    }
    

    
    async loadMap(mapId) {
        if (!this.mapManager.hasMap(mapId)) {
            console.error(`Map ${mapId} not found`);
            return;
        }
        
        try {
            const mapData = await this.mapManager.loadMap(mapId);
            
            // Update current map reference
            this.currentMap.image = mapData.image;
            this.currentMap.id = mapId;
            this.currentMap.width = mapData.width;
            this.currentMap.height = mapData.height;
            this.currentMap.loaded = mapData.loaded;
            this.currentMap.mapScale = mapData.mapScale;
            this.currentMap.originalWidth = mapData.originalWidth;
            this.currentMap.originalHeight = mapData.originalHeight;
            this.currentMapId = mapId;
            
            // Handle map music switching with different fade times
            if (mapData.music && mapData.music !== this.audio.currentTrack) {
                // Determine fade time based on map transition type
                let fadeTime = 1500; // Default fade time
                
                // Shorter fade for shop transitions
                if (mapId.includes('shop') || this.audio.currentTrack?.includes('shop')) {
                    fadeTime = 800;
                }
                
                this.switchBGM(mapData.music, fadeTime);
            }
            
            // Handle ambient sound switching
            console.log(`Map ambient sound: ${mapData.ambientSound}, Current: ${this.audio.currentAmbient}`);
            if (mapData.ambientSound && mapData.ambientSound !== this.audio.currentAmbient) {
                console.log('Starting ambient sound switch...');
                this.switchAmbientSound(mapData.ambientSound);
            } else if (!mapData.ambientSound && this.audio.currentAmbient) {
                // Stop ambient sound if new map doesn't have one
                console.log('Stopping ambient sound...');
                this.stopAmbientSound();
            }
            
            console.log(`Loaded map: ${mapData.name} (${mapData.width}x${mapData.height})`);
        } catch (error) {
            console.error('Failed to load map:', error);
        }
    }
    

    
    handleDialogueInput(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const result = this.npcManager.nextDialogueMessage(() => this.playSpeechBubbleSound());
            
            // If dialogue ended, check if this was a shop NPC
            if (!result.continues && result.npc && result.npc.type === 'shop') {
                // Show shop options menu
                this.showShopOptions(result.npc);
            }
        }
    }
    
    checkNPCInteraction() {
        // First check for interactive objects (chests, portals via manual interaction)
        const interactiveObj = this.interactiveObjectManager.checkNearbyInteractions(this.player, this.currentMapId);
        
        if (interactiveObj) {
            const result = this.interactiveObjectManager.handleInteraction(interactiveObj, this.player, this);
            this.handleInteractionResult(result);
            return;
        }
        
        // Then check for NPCs
        const npc = this.findClosestInteractableNPC();
        
        if (npc) {
            if (npc.type === 'teleporter') {
                this.handleTeleporter(npc);
            } else if (npc.type === 'spirit') {
                // Spirits are decorative and don't have dialogue
                console.log(`You see ${npc.name || 'a spirit'} floating nearby...`);
                return;
            } else {
                // Start dialogue for all other NPCs (shop NPCs, etc.)
                this.npcManager.startDialogue(npc, () => this.playSpeechBubbleSound());
            }
        }
    }
    

    
    updatePlayerSpeed() {
        // Set speed based on whether player is holding run key
        const currentSpeedType = this.isRunning ? 'Run' : 'Walk';
        this.player.maxSpeed = this.speedSettings[currentSpeedType];
    }
    
    /**
     * Unified collision detection system - works with any GameObject
     */
    checkGameObjectCollisions(newX, newY, movingObject = this.player) {
        // Get all objects that could block movement on current map
        const allObjects = this.getAllGameObjectsOnMap(this.currentMapId);
        
        for (let obj of allObjects) {
            // Skip self-collision
            if (obj === movingObject) continue;
            
            // Skip objects that don't block movement or aren't solid
            if (!obj.blocksMovement || !obj.hasCollision) continue;
            
            // Skip if moving object can't be blocked
            if (!movingObject.canBeBlocked) continue;
            
            // Check collision using GameObject collision system
            if (movingObject.wouldCollideAt(newX, newY, obj)) {
                return { collides: true, object: obj };
            }
        }
        
        return { collides: false, object: null };
    }

    /**
     * Get all GameObjects on a specific map (NPCs, interactive objects, etc.)
     */
    getAllGameObjectsOnMap(mapId) {
        const allObjects = [];
        
        // Add NPCs (convert legacy NPCs to have collision properties if needed)
        const currentMapNPCs = this.npcs[mapId] || [];
        for (let npc of currentMapNPCs) {
            // Add collision properties to legacy NPCs if they don't have them
            if (npc.hasCollision === undefined) {
                npc.hasCollision = true;
                npc.blocksMovement = (npc.type !== 'spirit' && npc.type !== 'portal');
                npc.canBeBlocked = true;
                npc.collisionPercent = (npc.type === 'chest') ? 0.7 : 0.4;
                npc.collisionOffsetY = (npc.type === 'chest') ? 5 : 10;
                
                // Add collision methods to legacy objects
                this.addCollisionMethodsToObject(npc);
            }
            
            // Only add objects that have collision enabled
            if (npc.hasCollision && npc.blocksMovement) {
                allObjects.push(npc);
            }
        }
        
        // Add interactive objects
        const interactiveObjects = this.interactiveObjectManager.getObjectsForMap(mapId);
        allObjects.push(...interactiveObjects.filter(obj => obj.hasCollision && obj.blocksMovement));
        
        // Add static objects if they exist
        // TODO: Add static objects when implemented
        
        return allObjects;
    }

    /**
     * Add collision methods to legacy game objects
     */
    addCollisionMethodsToObject(obj) {
        obj.getCollisionBounds = function() {
            const collisionWidth = this.width * this.collisionPercent;
            const collisionHeight = this.height * this.collisionPercent;
            const offsetY = this.collisionOffsetY;
            
            return {
                left: this.x - collisionWidth / 2,
                right: this.x + collisionWidth / 2,
                top: this.y - collisionHeight / 2 + offsetY,
                bottom: this.y + collisionHeight / 2 + offsetY
            };
        };
        
        obj.collidesWith = function(other) {
            if (!this.hasCollision || !other.hasCollision) return false;
            
            const thisBounds = this.getCollisionBounds();
            const otherBounds = other.getCollisionBounds();
            
            return !(thisBounds.right < otherBounds.left ||
                    thisBounds.left > otherBounds.right ||
                    thisBounds.bottom < otherBounds.top ||
                    thisBounds.top > otherBounds.bottom);
        };
        
        obj.wouldCollideAt = function(x, y, other) {
            if (!this.hasCollision || !other.hasCollision) return false;
            if (!this.canBeBlocked || !other.blocksMovement) return false;
            
            const originalX = this.x;
            const originalY = this.y;
            
            this.x = x;
            this.y = y;
            
            const collision = this.collidesWith(other);
            
            this.x = originalX;
            this.y = originalY;
            
            return collision;
        };
    }

    // Backwards compatibility - delegate to unified collision system
    checkNPCCollisions(newX, newY) {
        const result = this.checkGameObjectCollisions(newX, newY);
        return { collides: result.collides, npc: result.object };
    }

    checkPortalCollisions() {
        const portal = this.interactiveObjectManager.checkPortalCollisions(this.player, this.currentMapId);
        
        if (portal) {
            // Get spawn point from map
            const targetMapData = this.mapManager.getMapData(portal.targetMap);
            const spawnPoint = targetMapData?.spawnPoints[portal.spawnPoint] || targetMapData?.spawnPoints.default;
            
            if (spawnPoint) {
                this.teleportToMap(portal.targetMap, spawnPoint.x, spawnPoint.y);
            } else {
                // Fallback to map center
                this.teleportToMap(portal.targetMap, 400, 300);
            }
        }
    }
    
    checkSpiritBattleCollisions() {
        // Don't trigger battles if already in battle
        if (this.gameState === 'BATTLE' || this.gameState === 'BATTLE_DIALOGUE') return;
        
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        const playerHalfWidth = this.player.width / 2;
        const playerHalfHeight = this.player.height / 2;
        
        for (let npc of currentMapNPCs) {
            if (npc.type === 'spirit') {
                const npcHalfWidth = npc.width / 2;
                const npcHalfHeight = npc.height / 2;
                
                // Use the same collision system as regular NPCs - only bottom portions collide
                // Spirit collision area - bottom 25% of sprite (same as regular NPCs)
                const spiritCollisionPercent = 0.25; // Bottom 25% of spirit sprite
                const spiritCollisionTop = npc.y + npcHalfHeight - (npc.height * spiritCollisionPercent);
                const spiritCollisionBottom = npc.y + npcHalfHeight;
                const spiritCollisionLeft = npc.x - npcHalfWidth;
                const spiritCollisionRight = npc.x + npcHalfWidth;
                
                // Player collision area - bottom 25% of sprite (same as regular collision system)
                const playerCollisionPercent = 0.25; // Bottom 25% of player sprite
                const playerCollisionTop = this.player.y + playerHalfHeight - (this.player.height * playerCollisionPercent);
                const playerCollisionBottom = this.player.y + playerHalfHeight;
                const playerLeft = this.player.x - playerHalfWidth;
                const playerRight = this.player.x + playerHalfWidth;
                
                // Check for collision between player's bottom 25% and spirit's bottom 25%
                if (playerRight > spiritCollisionLeft && 
                    playerLeft < spiritCollisionRight && 
                    playerCollisionBottom > spiritCollisionTop && 
                    playerCollisionTop < spiritCollisionBottom) {
                    
                    // Trigger battle!
                    this.triggerSpiritBattle(npc);
                    return;
                }
            }
        }
    }
    
    triggerSpiritBattle(spirit) {
        // Show battle dialogue and transition to battle scene
        this.showBattleDialogue(spirit);
    }
    
    showBattleDialogue(spirit) {
        // Store player's current position and map before battle
        const playerPreBattleState = {
            x: this.player.x,
            y: this.player.y,
            mapId: this.currentMapId
        };
        
        // Set game state to battle dialogue
        this.gameState = 'BATTLE_DIALOGUE';
        this.battleDialogue = {
            active: true,
            spirit: spirit,
            message: 'Battle!',
            showTime: Date.now(),
            playerPreBattleState: playerPreBattleState
        };
        
        console.log(`Battle triggered with ${spirit.name} at player position (${playerPreBattleState.x}, ${playerPreBattleState.y})!`);
    }
    
    handleTeleporter(teleporter) {
        // Show teleporter dialogue first
        this.npcManager.startDialogue(teleporter, () => this.playSpeechBubbleSound());
        
        // Add teleportation confirmation after dialogue
        teleporter.onDialogueEnd = () => {
            this.showTeleportConfirmation(teleporter);
        };
    }
    
    handleChest(chest) {
        if (chest.looted) {
            // Show empty chest message in loot window
            this.showLootWindow([], 0, "This chest is empty.");
        } else {
            // Process loot immediately and show loot window
            this.processChestLoot(chest);
        }
    }
    
    processChestLoot(chest) {
        let lootedItems = [];
        let goldAmount = 0;
        
        // Add gold if any
        if (chest.loot.gold && chest.loot.gold > 0) {
            this.addGold(chest.loot.gold);
            goldAmount = chest.loot.gold;
        }
        
        // Add items if any
        if (chest.loot.items && chest.loot.items.length > 0) {
            chest.loot.items.forEach(lootItem => {
                // First check if item exists
                const item = this.itemManager.getItem(lootItem.id);
                if (!item) {
                    console.error(`Chest contains undefined item: ${lootItem.id}`);
                    lootedItems.push({
                        name: lootItem.id,
                        quantity: lootItem.quantity,
                        rarity: 'common',
                        success: false,
                        error: 'ITEM_NOT_FOUND'
                    });
                    return;
                }
                
                const success = this.inventoryManager.addItem(lootItem.id, lootItem.quantity);
                if (success) {
                    lootedItems.push({
                        name: item.name,
                        quantity: lootItem.quantity,
                        rarity: item.rarity,
                        success: true
                    });
                } else {
                    lootedItems.push({
                        name: item.name,
                        quantity: lootItem.quantity,
                        rarity: item.rarity,
                        success: false,
                        error: 'INVENTORY_FULL'
                    });
                }
            });
        }
        
        // Mark chest as looted and switch to open sprite
        chest.looted = true;
        if (chest.openSprite && chest.openSprite.complete) {
            chest.sprite = chest.openSprite;
        }
        
        // Show loot window
        this.showLootWindow(lootedItems, goldAmount);
        
        console.log(`Chest ${chest.id} looted:`, chest.loot);
    }
    
    /**
     * Handle interaction results from interactive objects
     */
    handleInteractionResult(result) {
        switch (result.type) {
            case 'loot':
                // Handle chest loot
                this.handleChestLoot(result);
                break;
            case 'portal':
                // Handle portal teleportation
                this.handlePortalTeleport(result);
                break;
            case 'dialogue':
                // Handle simple dialogue messages
                this.showTemporaryMessage(result.message);
                break;
            case 'none':
                // No interaction available
                break;
            default:
                console.log('Unhandled interaction result:', result);
        }
    }
    
    /**
     * Handle chest loot from interactive objects
     */
    handleChestLoot(result) {
        const lootedItems = [];
        
        // Add items to inventory
        if (result.items && result.items.length > 0) {
            result.items.forEach(item => {
                const success = this.inventoryManager.addItem(item.id, item.quantity || 1);
                if (success) {
                    lootedItems.push({
                        id: item.id,
                        name: this.itemManager.getItem(item.id)?.name || item.id,
                        quantity: item.quantity || 1
                    });
                }
            });
        }
        
        // Add gold
        if (result.gold > 0) {
            this.addGold(result.gold);
        }
        
        // Show loot window
        this.showLootWindow(lootedItems, result.gold, result.message);
    }
    
    /**
     * Handle portal teleportation (for manual portal activation)
     */
    handlePortalTeleport(result) {
        const targetMapData = this.mapManager.getMapData(result.targetMap);
        const spawnPoint = targetMapData?.spawnPoints[result.spawnPoint] || targetMapData?.spawnPoints.default;
        
        if (spawnPoint) {
            this.teleportToMap(result.targetMap, spawnPoint.x, spawnPoint.y);
        } else {
            this.teleportToMap(result.targetMap, 400, 300);
        }
    }
    
    /**
     * Show a temporary message to the player
     */
    showTemporaryMessage(message) {
        // You could implement a temporary message display system here
        console.log(message);
    }
    
    showLootWindow(items, gold = 0, message = '') {
        this.clearInputKeys(); // Clear input keys when entering loot window
        this.lootWindow.active = true;
        this.lootWindow.items = items;
        this.lootWindow.gold = gold;
        this.lootWindow.message = message;
        this.gameState = 'LOOT_WINDOW';
    }
    
    closeLootWindow() {
        this.lootWindow.active = false;
        this.lootWindow.items = [];
        this.lootWindow.gold = 0;
        this.lootWindow.message = '';
        this.clearInputKeys(); // Clear all input keys to prevent stuck movement
        this.gameState = 'PLAYING';
    }
    
    clearInputKeys() {
        // Clear all movement and input keys to prevent stuck states
        this.keys = {};
    }

    showShopOptions(npc) {
        this.clearInputKeys(); // Clear input keys when entering shop
        this.shopOptions.active = true;
        this.shopOptions.npc = npc;
        this.shopOptions.selectedIndex = 0;
        this.gameState = 'SHOP_OPTIONS';
        console.log('Showing shop options for:', npc.id);
    }

    handleShop(npc) {
        this.clearInputKeys(); // Clear input keys when entering shop
        this.shop.active = true;
        this.shop.npc = npc;
        this.shop.mode = 'buy'; // Start in buy mode instead of main
        this.shop.selectedIndex = 0;
        this.gameState = 'SHOP';
        console.log('Opened shop:', npc.id);
    }

    closeShop() {
        this.shop.active = false;
        this.shop.npc = null;
        this.shop.mode = 'buy'; // Reset to buy mode for next time
        this.shop.selectedIndex = 0;
        this.shop.items = [];
        this.clearInputKeys(); // Clear input keys when closing shop
        this.gameState = 'PLAYING';
    }

    buyItem(itemData, quantity = 1) {
        const totalPrice = itemData.price * quantity;
        
        // Check if player has enough gold
        if (this.player.gold < totalPrice) {
            console.log(`Not enough gold! Need ${totalPrice}, have ${this.player.gold}`);
            return false;
        }
        
        // Check if there's enough inventory space
        if (!this.inventoryManager.hasSpaceFor(itemData.id, quantity)) {
            const requiredSlots = this.inventoryManager.calculateRequiredSlots(itemData.id, quantity);
            const freeSlots = this.inventoryManager.getFreeSlots();
            console.log(`Not enough inventory space! Need ${requiredSlots} slots, have ${freeSlots} free slots`);
            return false;
        }
        
        // Attempt to add items to inventory
        const success = this.inventoryManager.addItem(itemData.id, quantity);
        if (success) {
            this.removeGold(totalPrice);
            // Reduce shop stock
            if (itemData.stock !== undefined) {
                itemData.stock = Math.max(0, itemData.stock - quantity);
            }
            this.playCoinSound(); // Play coin sound effect
            console.log(`Successfully bought ${quantity}x ${itemData.id} for ${totalPrice} gold`);
            return true;
        } else {
            console.log('Failed to add items to inventory despite space check!');
            return false;
        }
    }

    sellItem(inventorySlot, quantity = 1) {
        const item = this.inventoryManager.getInventory()[inventorySlot];
        if (!item) return false;

        const itemTemplate = this.itemManager.getItem(item.id);
        if (!itemTemplate) return false;

        // Ensure we don't sell more than we have
        const actualQuantity = Math.min(quantity, item.quantity);
        const sellPricePerItem = Math.floor(itemTemplate.value * this.shop.npc.shop.sellMultiplier);
        const totalSellPrice = sellPricePerItem * actualQuantity;
        
        // Remove items from inventory
        const success = this.inventoryManager.removeItem(item.id, actualQuantity);
        if (success) {
            this.addGold(totalSellPrice);
            this.playCoinSound(); // Play coin sound effect
            console.log(`Sold ${actualQuantity}x ${item.name} for ${totalSellPrice} gold`);
            return true;
        }
        return false;
    }

    /**
     * Sell items from consolidated view (handles multiple inventory slots for non-stackable items)
     * @param {object} consolidatedItem - The consolidated item data
     * @param {number} quantity - Quantity to sell
     * @returns {boolean} True if successful
     */
    sellConsolidatedItem(consolidatedItem, quantity) {
        if (!consolidatedItem || !consolidatedItem.inventorySlots) {
            console.error('Invalid consolidated item for selling');
            return false;
        }

        const itemTemplate = this.itemManager.getItem(consolidatedItem.id);
        if (!itemTemplate) return false;

        let remainingQuantity = quantity;
        let totalSellPrice = 0;
        const sellPricePerItem = Math.floor(itemTemplate.value * this.shop.npc.shop.sellMultiplier);
        
        // Sort inventory slots in reverse order to avoid index shifting issues when removing items
        const sortedSlots = [...consolidatedItem.inventorySlots].sort((a, b) => b - a);
        
        for (const slotIndex of sortedSlots) {
            if (remainingQuantity <= 0) break;
            
            const item = this.inventoryManager.getInventory()[slotIndex];
            if (!item || item.id !== consolidatedItem.id) continue;
            
            const quantityToSellFromThisSlot = Math.min(remainingQuantity, item.quantity);
            const success = this.inventoryManager.removeItem(item.id, quantityToSellFromThisSlot);
            
            if (success) {
                totalSellPrice += sellPricePerItem * quantityToSellFromThisSlot;
                remainingQuantity -= quantityToSellFromThisSlot;
                console.log(`Sold ${quantityToSellFromThisSlot}x ${item.name} from slot ${slotIndex}`);
            }
        }
        
        if (totalSellPrice > 0) {
            this.addGold(totalSellPrice);
            this.playCoinSound(); // Play coin sound effect
            const soldQuantity = quantity - remainingQuantity;
            console.log(`Successfully sold ${soldQuantity}x ${consolidatedItem.name} for ${totalSellPrice} gold total`);
            return true;
        }
        
        return false;
    }
    
    showTeleportConfirmation(teleporter) {
        const mapData = this.mapManager.getMap(teleporter.targetMap);
        const mapName = mapData?.name || 'another realm';
        const confirmed = confirm(`Travel to ${mapName}?`);
        if (confirmed) {
            this.teleportToMap(teleporter.targetMap, teleporter.targetX, teleporter.targetY);
        }
    }
    
    async teleportToMap(mapId, x, y) {
        if (!this.mapManager.hasMap(mapId)) {
            console.error(`Cannot teleport to unknown map: ${mapId}`);
            return;
        }
        
        // Fade effect or loading indicator could go here
        this.currentMap.loaded = false;
        
        try {
            await this.loadMap(mapId);
            
            // Position player at target coordinates
            this.player.x = x;
            this.player.y = y;
            
            // Reset camera
            this.updateCamera();
            
            const mapData = this.mapManager.getMap(mapId);
            console.log(`Teleported to ${mapData.name} at (${x}, ${y})`);
        } catch (error) {
            console.error('Failed to load map:', error);
        }
    }
    
    /**
     * Save the current game state to localStorage
     */
    saveGame() {
        const saveData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            player: {
                x: this.player.x,
                y: this.player.y,
                facingRight: this.player.facingRight,
                gold: this.player.gold
            },
            currentMapId: this.currentMapId,
            settings: { ...this.settings },
            gameStarted: this.gameStarted,
            npcStates: this.npcManager.getNPCStates(), // Save NPC states
            interactiveObjectStates: this.interactiveObjectManager.getObjectStates() // Save interactive object states (chest looted, etc.)
        };
        
        try {
            localStorage.setItem(this.saveSlotKey, JSON.stringify(saveData));
            // Save inventory separately
            this.inventoryManager.saveInventory(this.saveSlotKey);
            console.log('Game saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }
    
    /**
     * Load game state from localStorage
     */
    async loadGame() {
        try {
            const saveDataString = localStorage.getItem(this.saveSlotKey);
            if (!saveDataString) {
                console.log('No save data found');
                return false;
            }
            
            const saveData = JSON.parse(saveDataString);
            
            // Validate save data
            if (!saveData.version || !saveData.player || !saveData.currentMapId) {
                console.error('Invalid save data format');
                return false;
            }
            
            // Load the saved map
            await this.loadMap(saveData.currentMapId);
            
            // Restore player state
            this.player.x = saveData.player.x;
            this.player.y = saveData.player.y;
            this.player.facingRight = saveData.player.facingRight;
            this.player.gold = saveData.player.gold || 100; // Default to 100 if not saved
            
            // Restore settings
            if (saveData.settings) {
                this.settings = { ...this.settings, ...saveData.settings };
                this.updatePlayerSpeed();
                this.updateAudioVolume();
            }
            
            // Restore game state
            this.gameStarted = saveData.gameStarted;
            
            // Restore NPC states
            if (saveData.npcStates) {
                this.npcManager.restoreNPCStates(saveData.npcStates);
            }
            
            // Restore interactive object states (chest looted status, etc.)
            if (saveData.interactiveObjectStates) {
                this.interactiveObjectManager.restoreObjectStates(saveData.interactiveObjectStates);
            }
            
            // Load inventory
            this.inventoryManager.loadInventory(this.saveSlotKey);
            
            // Update camera
            this.updateCamera();
            
            console.log('Game loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }
    
    /**
     * Check if save data exists
     */
    hasSaveData() {
        return localStorage.getItem(this.saveSlotKey) !== null;
    }
    
    /**
     * Delete save data
     */
    deleteSaveData() {
        localStorage.removeItem(this.saveSlotKey);
        console.log('Save data deleted');
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settingsData = {
                playerSpeed: this.settings.playerSpeed,
                showDebug: this.settings.showDebug,
                masterVolume: this.settings.masterVolume,
                bgmVolume: this.settings.bgmVolume,
                effectVolume: this.settings.effectVolume,
                audioMuted: this.settings.audioMuted
            };
            localStorage.setItem(this.settingsKey, JSON.stringify(settingsData));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const settingsString = localStorage.getItem(this.settingsKey);
            if (settingsString) {
                const savedSettings = JSON.parse(settingsString);
                
                // Merge saved settings with default settings
                this.settings = {
                    ...this.settings,
                    ...savedSettings
                };
                
                console.log('Settings loaded from localStorage');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    /**
     * Start a new game
     */
    async startNewGame() {
        // Reset player to starting position
        this.player.x = 400;
        this.player.y = 300;
        this.player.facingRight = true;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        
        // Reset ambient sound to ensure it starts fresh
        this.stopAmbientSound();
        this.audio.currentAmbient = null;
        
        // Load starting map
        await this.loadMap('0-0');
        
        // Position player in center of map
        this.player.x = this.currentMap.width / 2;
        this.player.y = this.currentMap.height / 2;
        
        this.gameStarted = true;
        this.gameState = 'PLAYING';
        this.playBGM();
        
        console.log('New game started');
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'MAIN_MENU') {
                this.handleMainMenuInput(e);
            } else if (this.gameState === 'GAME_MENU') {
                this.handleGameMenuInput(e);
            } else if (this.gameState === 'SETTINGS') {
                this.handleSettingsInput(e);
            } else if (this.gameState === 'INVENTORY') {
                this.handleInventoryInput(e);
            } else if (this.gameState === 'LOOT_WINDOW') {
                this.handleLootWindowInput(e);
            } else if (this.gameState === 'SHOP_OPTIONS') {
                this.handleShopOptionsInput(e);
            } else if (this.gameState === 'SHOP') {
                this.handleShopInput(e);
            } else if (this.gameState === 'BATTLE_DIALOGUE') {
                this.handleBattleDialogueInput(e);
            } else if (this.gameState === 'BATTLE') {
                this.handleBattleInput(e);
            } else if (this.gameState === 'PLAYING') {
                if (this.npcManager.isDialogueActive()) {
                    this.handleDialogueInput(e);
                } else {
                    this.keys[e.key.toLowerCase()] = true;
                    
                    // Also handle arrow keys
                    if (e.key === 'ArrowUp') this.keys['w'] = true;
                    if (e.key === 'ArrowDown') this.keys['s'] = true;
                    if (e.key === 'ArrowLeft') this.keys['a'] = true;
                    if (e.key === 'ArrowRight') this.keys['d'] = true;
                    
                    // Interaction key
                    if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
                        this.checkNPCInteraction();
                    }
                    
                    // Inventory key
                    if (e.key === 'i' || e.key === 'I') {
                        this.clearInputKeys(); // Clear input keys when opening inventory
                        this.gameState = 'INVENTORY';
                        this.inventoryManager.openInventory();
                    }
                    
                    // Hold SHIFT to run
                    if (e.key === 'Shift') {
                        this.isRunning = true;
                        this.updatePlayerSpeed();
                    }
                }
                
                // ESC to return to in-game menu (works even during dialogue)
                if (e.key === 'Escape') {
                    if (this.npcManager.isDialogueActive()) {
                        const currentNPC = this.npcManager.endDialogue();
                        // Handle post-dialogue actions (like teleportation)
                        if (currentNPC && currentNPC.onDialogueEnd) {
                            currentNPC.onDialogueEnd();
                            currentNPC.onDialogueEnd = null; // Clear the callback
                        }
                    } else {
                        this.clearInputKeys(); // Clear input keys when opening game menu
                        this.gameState = 'GAME_MENU';
                        this.selectedGameMenuOption = 0;
                    }
                }
            }
            
            // F1 to toggle debug info (works in any state)
            if (e.key === 'F1') {
                e.preventDefault(); // Prevent browser help menu
                this.settings.showDebug = !this.settings.showDebug;
                this.saveSettings();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.gameState === 'PLAYING') {
                this.keys[e.key.toLowerCase()] = false;
                
                // Also handle arrow keys
                if (e.key === 'ArrowUp') this.keys['w'] = false;
                if (e.key === 'ArrowDown') this.keys['s'] = false;
                if (e.key === 'ArrowLeft') this.keys['a'] = false;
                if (e.key === 'ArrowRight') this.keys['d'] = false;
                
                // Release SHIFT to stop running
                if (e.key === 'Shift') {
                    this.isRunning = false;
                    this.updatePlayerSpeed();
                }
            }
        });
    }
    
    handleMainMenuInput(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedMainMenuOption > 0) {
                    this.selectedMainMenuOption = Math.max(0, this.selectedMainMenuOption - 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedMainMenuOption < this.mainMenuOptions.length - 1) {
                    this.selectedMainMenuOption = Math.min(this.mainMenuOptions.length - 1, this.selectedMainMenuOption + 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'Enter':
            case ' ':
                this.selectMainMenuOption();
                break;
        }
    }
    
    handleGameMenuInput(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedGameMenuOption > 0) {
                    this.selectedGameMenuOption = Math.max(0, this.selectedGameMenuOption - 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedGameMenuOption < this.gameMenuOptions.length - 1) {
                    this.selectedGameMenuOption = Math.min(this.gameMenuOptions.length - 1, this.selectedGameMenuOption + 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'Enter':
            case ' ':
                this.selectGameMenuOption();
                break;
            case 'Escape':
                // ESC returns to game from game menu
                this.gameState = 'PLAYING';
                break;
        }
    }
    
    selectMainMenuOption() {
        switch(this.selectedMainMenuOption) {
            case 0: // New Game
                this.startNewGame();
                break;
            case 1: // Continue
                if (this.hasSaveData()) {
                    this.loadGame().then(success => {
                        if (success) {
                            this.gameState = 'PLAYING';
                            this.playBGM();
                        }
                    });
                } else {
                    alert('No save data found!');
                }
                break;
            case 2: // Settings
                this.previousMenuState = 'MAIN_MENU';
                this.gameState = 'SETTINGS';
                this.selectedSettingsOption = 0;
                break;
            case 3: // Exit
                if (confirm('Are you sure you want to exit?')) {
                    window.close();
                }
                break;
        }
    }
    
    selectGameMenuOption() {
        switch(this.selectedGameMenuOption) {
            case 0: // Resume
                this.gameState = 'PLAYING';
                break;
            case 1: // Inventory
                this.gameState = 'INVENTORY';
                this.inventoryManager.openInventory();
                break;
            case 2: // Settings
                this.previousMenuState = 'GAME_MENU';
                this.gameState = 'SETTINGS';
                this.selectedSettingsOption = 0;
                break;
            case 3: // Save Game
                if (this.saveGame()) {
                    alert('Game saved successfully!');
                } else {
                    alert('Failed to save game!');
                }
                break;
            case 4: // Load Game
                if (this.hasSaveData()) {
                    if (confirm('Load saved game? (Current progress will be lost if not saved!)')) {
                        this.loadGame().then(success => {
                            if (success) {
                                this.gameState = 'PLAYING';
                                alert('Game loaded successfully!');
                            } else {
                                alert('Failed to load game!');
                            }
                        });
                    }
                } else {
                    alert('No save data found!');
                }
                break;
            case 5: // Main Menu
                if (confirm('Return to main menu? (Make sure to save your progress!)')) {
                    this.gameState = 'MAIN_MENU';
                    this.selectedMainMenuOption = 0;
                    this.stopBGM();
                }
                break;
        }
    }
    
    handleSettingsInput(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedSettingsOption > 0) {
                    this.selectedSettingsOption = Math.max(0, this.selectedSettingsOption - 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedSettingsOption < this.settingsOptions.length - 1) {
                    this.selectedSettingsOption = Math.min(this.settingsOptions.length - 1, this.selectedSettingsOption + 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.adjustSetting(-1);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.adjustSetting(1);
                break;
            case 'Enter':
            case ' ':
                this.selectSettingsOption();
                break;
            case 'Escape':
                this.gameState = this.previousMenuState;
                break;
        }
    }
    
    adjustSetting(direction) {
        switch(this.selectedSettingsOption) {
            case 0: // Master Volume
                this.settings.masterVolume = Math.max(0, Math.min(100, this.settings.masterVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 1: // BGM Volume
                this.settings.bgmVolume = Math.max(0, Math.min(100, this.settings.bgmVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 2: // Effect Volume
                this.settings.effectVolume = Math.max(0, Math.min(100, this.settings.effectVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 3: // Mute Audio
                if (direction !== 0) {
                    this.settings.audioMuted = !this.settings.audioMuted;
                    this.updateAudioVolume();
                    this.saveSettings();
                }
                break;
        }
    }
    
    selectSettingsOption() {
        switch(this.selectedSettingsOption) {
            case 0: // Master Volume
            case 1: // BGM Volume
            case 2: // Effect Volume
            case 3: // Mute Audio
                // These are adjusted with left/right arrows
                break;
            case 4: // Back to Menu
                this.gameState = this.previousMenuState;
                break;
        }
    }
    
    handleInventoryInput(e) {
        console.log(`*** INVENTORY INPUT *** key: ${e.key}, gameState: ${this.gameState}`);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.navigateInventoryGrid('up');
                this.playMenuNavigationSound();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.navigateInventoryGrid('down');
                this.playMenuNavigationSound();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.navigateInventoryGrid('left');
                this.playMenuNavigationSound();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.navigateInventoryGrid('right');
                this.playMenuNavigationSound();
                break;
            case 'Enter':
            case ' ':
                // Use selected item
                const selectedItem = this.inventoryManager.getSelectedItem();
                if (selectedItem) {
                    this.inventoryManager.useItem(this.inventoryManager.selectedSlot);
                }
                break;
            case 'x':
            case 'X':
                // Drop selected item
                const itemToDrop = this.inventoryManager.getSelectedItem();
                if (itemToDrop && confirm(`Drop ${itemToDrop.name}?`)) {
                    const droppedItem = this.inventoryManager.dropItem(this.inventoryManager.selectedSlot, 1);
                    if (droppedItem) {
                        this.dropItemInWorld(droppedItem);
                    }
                }
                break;
            case 'Escape':
            case 'i':
            case 'I':
                console.log('*** CLOSING INVENTORY ***');
                this.inventoryManager.closeInventory();
                this.clearInputKeys(); // Clear input keys when closing inventory
                this.gameState = 'PLAYING';
                console.log(`Game state changed to: ${this.gameState}`);
                break;
            case 'q':
            case 'Q':
                // Emergency force close for debugging
                console.log('*** FORCE CLOSING INVENTORY ***');
                this.clearInputKeys(); // Clear input keys when force closing inventory
                this.gameState = 'PLAYING';
                break;
            case '1':
                // Test navigation - force move to slot 1
                console.log('*** FORCE MOVE TO SLOT 1 ***');
                this.inventoryManager.selectedSlot = 1;
                break;
            case '2':
                // Test navigation - force move to slot 2
                console.log('*** FORCE MOVE TO SLOT 2 ***');
                this.inventoryManager.selectedSlot = 2;
                break;
        }
    }
    
    handleLootWindowInput(e) {
        switch(e.key) {
            case 'Escape':
            case 'Enter':
            case ' ':
            case 'e':
            case 'E':
                this.closeLootWindow();
                break;
        }
    }

    handleShopOptionsInput(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.shopOptions.selectedIndex > 0) {
                    this.shopOptions.selectedIndex--;
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.shopOptions.selectedIndex < this.shopOptions.options.length - 1) {
                    this.shopOptions.selectedIndex++;
                    this.playMenuNavigationSound();
                }
                break;
            case 'Enter':
            case ' ':
                this.handleShopOptionSelection();
                break;
            case 'Escape':
                this.closeShopOptions();
                break;
        }
    }
    
    handleShopOptionSelection() {
        const selectedOption = this.shopOptions.options[this.shopOptions.selectedIndex];
        
        if (selectedOption === 'Trade') {
            // Close shop options and open trade interface
            const npc = this.shopOptions.npc;
            this.closeShopOptions();
            this.handleShop(npc);
        } else if (selectedOption === 'Goodbye') {
            // Close shop options
            this.closeShopOptions();
        }
    }
    
    closeShopOptions() {
        this.shopOptions.active = false;
        this.shopOptions.npc = null;
        this.shopOptions.selectedIndex = 0;
        this.clearInputKeys(); // Clear input keys when closing shop options
        this.gameState = 'PLAYING';
    }

    handleShopInput(e) {
        // Check if quantity selection is active first
        if (this.shop.quantitySelection.active) {
            this.handleQuantitySelectionInput(e);
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.shop.selectedIndex > 0) {
                    this.shop.selectedIndex--;
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                const maxIndex = this.shop.mode === 'buy' ? 
                    (this.shop.npc.shop.buyItems.length - 1) : 
                    (this.getConsolidatedSellItems().length - 1);
                if (this.shop.selectedIndex < maxIndex) {
                    this.shop.selectedIndex++;
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.shop.mode === 'sell') {
                    this.shop.mode = 'buy';
                    this.shop.selectedIndex = 0;
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.shop.mode === 'buy') {
                    this.shop.mode = 'sell';
                    this.shop.selectedIndex = 0;
                    this.playMenuNavigationSound();
                }
                break;
            case 'Enter':
            case ' ':
                this.handleShopSelection();
                break;
            case 'Escape':
                this.closeShop();
                break;
        }
    }

    handleShopSelection() {
        console.log(`*** SHOP SELECTION TRIGGERED *** mode=${this.shop.mode}, index=${this.shop.selectedIndex}`);
        
        if (this.shop.mode === 'buy') {
            const itemData = this.shop.npc.shop.buyItems[this.shop.selectedIndex];
            console.log('Trying to buy item:', itemData);
            
            if (itemData && itemData.stock > 0) {
                // Show quantity selection if stock > 1, regardless of stackable property
                console.log(`Stock check: ${itemData.stock} > 1 = ${itemData.stock > 1}`);
                
                if (itemData.stock > 1) {
                    console.log('*** MULTIPLE STOCK DETECTED - SHOWING QUANTITY SELECTION ***');
                    this.showQuantitySelection(itemData, 'buy', itemData.stock);
                    
                    // If quantity selection wasn't activated (no space/gold), try single purchase
                    if (!this.shop.quantitySelection.active) {
                        console.log('*** QUANTITY SELECTION FAILED - TRYING DIRECT PURCHASE ***');
                        const success = this.buyItem(itemData, 1);
                        if (!success) {
                            console.log('Direct purchase also failed!');
                        }
                    }
                } else {
                    console.log('*** SINGLE STOCK - DIRECT PURCHASE ***');
                    const success = this.buyItem(itemData, 1);
                    if (!success) {
                        console.log('Purchase failed!');
                    }
                }
            } else {
                console.log('Item not available or out of stock');
            }
        } else if (this.shop.mode === 'sell') {
            const consolidatedItems = this.getConsolidatedSellItems();
            const consolidatedItem = consolidatedItems[this.shop.selectedIndex];
            console.log('Trying to sell consolidated item:', consolidatedItem);
            
            if (consolidatedItem) {
                console.log(`Sell quantity check: ${consolidatedItem.quantity} > 1 = ${consolidatedItem.quantity > 1}`);
                
                if (consolidatedItem.quantity > 1) {
                    console.log('*** MULTIPLE QUANTITY ITEM - SHOWING QUANTITY SELECTION ***');
                    this.showQuantitySelection(consolidatedItem, 'sell', consolidatedItem.quantity);
                } else {
                    console.log('*** SINGLE ITEM - DIRECT SALE ***');
                    // For single items, sell from the first inventory slot
                    this.sellItem(consolidatedItem.inventorySlots[0], 1);
                }
            } else {
                console.log('No item selected for sale');
            }
        }
    }
    
    showQuantitySelection(itemData, mode, maxQuantity) {
        console.log(`*** SHOWING QUANTITY SELECTION *** item=${itemData.name || itemData.id}, mode=${mode}, max=${maxQuantity}`);
        
        let actualMaxQuantity = maxQuantity;
        
        if (mode === 'buy') {
            // Limit by what player can afford
            if (itemData.price > 0) {
                const affordableQuantity = Math.floor(this.player.gold / itemData.price);
                actualMaxQuantity = Math.min(actualMaxQuantity, affordableQuantity);
                console.log(`Player can afford ${affordableQuantity}, stock is ${maxQuantity}`);
            }
            
            // Also limit by inventory space
            let maxByInventorySpace = maxQuantity;
            for (let testQuantity = maxQuantity; testQuantity > 0; testQuantity--) {
                if (this.inventoryManager.hasSpaceFor(itemData.id, testQuantity)) {
                    maxByInventorySpace = testQuantity;
                    break;
                }
            }
            
            actualMaxQuantity = Math.min(actualMaxQuantity, maxByInventorySpace);
            console.log(`Inventory space allows ${maxByInventorySpace}, final max: ${actualMaxQuantity}`);
        }
        
        // Ensure we have at least 1 as max quantity, or show error
        if (actualMaxQuantity < 1) {
            console.log('Cannot buy any items - no space or no gold');
            return;
        }
        
        this.shop.quantitySelection = {
            active: true,
            itemData: itemData,
            mode: mode,
            quantity: 1,
            maxQuantity: actualMaxQuantity
        };
        
        console.log('Quantity selection state:', this.shop.quantitySelection);
    }
    
    closeQuantitySelection() {
        console.log('*** CLOSING QUANTITY SELECTION ***');
        this.shop.quantitySelection = {
            active: false,
            itemData: null,
            mode: '',
            quantity: 1,
            maxQuantity: 1
        };
    }
    
    confirmQuantitySelection() {
        const qs = this.shop.quantitySelection;
        console.log(`*** CONFIRMING QUANTITY SELECTION *** quantity=${qs.quantity}, mode=${qs.mode}`);
        
        if (!qs.active || !qs.itemData) {
            console.log('No active quantity selection to confirm');
            return;
        }
        
        // Additional validation for buying
        if (qs.mode === 'buy') {
            const totalCost = qs.itemData.price * qs.quantity;
            if (totalCost > this.player.gold) {
                console.log(`Cannot afford ${qs.quantity} items. Cost: ${totalCost}, Gold: ${this.player.gold}`);
                this.closeQuantitySelection();
                return;
            }
            
            if (qs.quantity > qs.itemData.stock) {
                console.log(`Not enough stock. Requested: ${qs.quantity}, Available: ${qs.itemData.stock}`);
                this.closeQuantitySelection();
                return;
            }
        }
        
        let success = false;
        
        if (qs.mode === 'buy') {
            success = this.buyItem(qs.itemData, qs.quantity);
        } else if (qs.mode === 'sell') {
            success = this.sellConsolidatedItem(qs.itemData, qs.quantity);
        }
        
        if (success) {
            console.log(`Successfully ${qs.mode === 'buy' ? 'bought' : 'sold'} ${qs.quantity} items`);
        } else {
            console.log(`Failed to ${qs.mode === 'buy' ? 'buy' : 'sell'} items`);
        }
        
        this.closeQuantitySelection();
    }
    
    handleQuantitySelectionInput(e) {
        if (!this.shop.quantitySelection.active) return;
        
        const qs = this.shop.quantitySelection;
        console.log(`*** QUANTITY SELECTION INPUT *** key=${e.key}, current quantity=${qs.quantity}`);
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                // If at maximum, wrap around to 1. Otherwise, increase by 1.
                if (qs.quantity === qs.maxQuantity) {
                    qs.quantity = 1;
                    console.log(`Quantity wrapped to minimum: ${qs.quantity}`);
                } else {
                    qs.quantity = Math.min(qs.maxQuantity, qs.quantity + 1);
                    // Double-check affordability for buying
                    if (qs.mode === 'buy' && qs.itemData.price * qs.quantity > this.player.gold) {
                        qs.quantity = Math.floor(this.player.gold / qs.itemData.price);
                    }
                    console.log(`Quantity increased to ${qs.quantity}`);
                }
                break;
                
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                // If quantity is 1, jump to maximum. Otherwise, decrease by 1.
                if (qs.quantity === 1) {
                    qs.quantity = qs.maxQuantity;
                    console.log(`Quantity jumped to maximum: ${qs.quantity}`);
                } else {
                    qs.quantity = Math.max(1, qs.quantity - 1);
                    console.log(`Quantity decreased to: ${qs.quantity}`);
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                this.confirmQuantitySelection();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.closeQuantitySelection();
                break;
        }
    }
    
    handleBattleDialogueInput(e) {
        switch(e.key) {
            case 'Enter':
            case ' ':
            case 'Escape':
                // Any key proceeds to battle scene
                this.proceedToBattle();
                break;
        }
    }
    
    proceedToBattle() {
        if (this.battleDialogue && this.battleDialogue.spirit) {
            // Get battle scene from current map, fallback to spirit's battle scene if not defined
            const currentMapData = this.mapManager.getMap(this.currentMapId);
            const battleScene = currentMapData?.battleScene || this.battleDialogue.spirit.battleScene || 'Forest-Battlescene-0';
            const spirit = this.battleDialogue.spirit;
            
            console.log(`Proceeding to battle scene: ${battleScene} with ${spirit.name} (from map: ${this.currentMapId})`);
            
            // Store battle information
            this.battleState = {
                active: true,
                spirit: { ...spirit }, // Copy spirit data
                playerStartX: 200, // Player on the left
                spiritStartX: 600, // Spirit on the right
                playerPreBattleState: this.battleDialogue.playerPreBattleState // Store original position
            };
            
            // Clear battle dialogue
            this.battleDialogue.active = false;
            this.gameState = 'BATTLE';
            
            // Clear movement state before entering battle
            this.clearMovementState();
            
            // Teleport to battle scene with player positioned on the left
            this.teleportToMap(battleScene, this.battleState.playerStartX, 300);
        }
    }
    
    handleBattleInput(e) {
        switch(e.key) {
            case 'f':
            case 'F':
                // Flee from battle
                this.fleeBattle();
                break;
            case 'Escape':
                // For now, allow escaping from battle (later can be replaced with proper battle mechanics)
                this.exitBattle();
                break;
            // Add battle-specific controls here later (attack, defend, etc.)
        }
    }
    
    fleeBattle() {
        if (this.battleState && this.battleState.spirit) {
            const spirit = this.battleState.spirit;
            const originalMapId = spirit.mapId;
            
            console.log(`Fleeing from battle with ${spirit.name}`);
            
            // Make the spirit disappear temporarily
            this.makeSpiritsDisappear(spirit.id, originalMapId);
            
            // Return to the original map
            this.exitBattle();
        }
    }
    
    makeSpiritsDisappear(spiritId, mapId) {
        // Remove spirit from the current map's NPC list
        if (this.npcs[mapId]) {
            const spiritIndex = this.npcs[mapId].findIndex(npc => npc.id === spiritId);
            if (spiritIndex !== -1) {
                const spirit = this.npcs[mapId][spiritIndex];
                
                // Store the disappeared spirit data for respawning
                if (!this.disappearedSpirits) {
                    this.disappearedSpirits = new Map();
                }
                
                this.disappearedSpirits.set(spiritId, {
                    spiritData: { ...spirit }, // Copy the spirit data
                    mapId: mapId,
                    disappearTime: Date.now(),
                    respawnDelay: spirit.respawnDelay || 30000 // 30 seconds default
                });
                
                // Remove from NPCManager registry (for roaming behavior)
                this.npcManager.removeNPC(spiritId);
                
                // Remove from active NPCs (for rendering)
                this.npcs[mapId].splice(spiritIndex, 1);
                
                console.log(`${spirit.name} disappeared from map ${mapId}, will respawn in ${(spirit.respawnDelay || 30000) / 1000} seconds`);
            }
        }
    }
    
    exitBattle() {
        // Return to the exact position where the battle was triggered
        if (this.battleState && this.battleState.playerPreBattleState) {
            const preBattleState = this.battleState.playerPreBattleState;
            
            this.battleState.active = false;
            this.gameState = 'PLAYING';
            
            // Clear all movement keys and reset player velocity to prevent auto-walking
            this.clearMovementState();
            
            // Return to the exact pre-battle position
            this.teleportToMap(preBattleState.mapId, preBattleState.x, preBattleState.y);
            
            console.log(`Exited battle, returned to exact pre-battle position (${preBattleState.x}, ${preBattleState.y}) on map ${preBattleState.mapId}`);
        } else {
            // Fallback to spirit's spawn location if pre-battle state not available
            const originalMapId = this.battleState?.spirit?.mapId || '0-0';
            const originalX = this.battleState?.spirit?.spawnX || 600;
            const originalY = this.battleState?.spirit?.spawnY || 400;
            
            this.battleState.active = false;
            this.gameState = 'PLAYING';
            
            // Clear all movement keys and reset player velocity to prevent auto-walking
            this.clearMovementState();
            
            this.teleportToMap(originalMapId, originalX, originalY);
            
            console.log(`Exited battle, fallback to map ${originalMapId} at (${originalX}, ${originalY})`);
        }
    }
    
    clearMovementState() {
        // Clear all movement key states
        this.keys['w'] = false;
        this.keys['a'] = false;
        this.keys['s'] = false;
        this.keys['d'] = false;
        this.keys['arrowup'] = false;
        this.keys['arrowdown'] = false;
        this.keys['arrowleft'] = false;
        this.keys['arrowright'] = false;
        
        // Reset player velocity to stop any ongoing movement
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        
        console.log('Cleared movement state and player velocity');
    }
    
    navigateInventoryGrid(direction) {
        const inventory = this.inventoryManager.getInventory();
        if (inventory.length === 0) {
            console.log('No inventory items to navigate');
            return;
        }
        
        const itemsPerRow = 5; // Same as defined in renderInventory
        const currentSlot = this.inventoryManager.selectedSlot;
        const totalItems = inventory.length;
        
        console.log(`*** NAVIGATING *** direction: ${direction}, current: ${currentSlot}, total: ${totalItems}`);
        
        let newSlot = currentSlot;
        
        switch(direction) {
            case 'up':
                // Simple up navigation with wrapping
                if (currentSlot >= itemsPerRow) {
                    newSlot = currentSlot - itemsPerRow;
                } else {
                    // Wrap to bottom row, same column
                    const lastRow = Math.floor((totalItems - 1) / itemsPerRow);
                    const currentCol = currentSlot % itemsPerRow;
                    newSlot = Math.min((lastRow * itemsPerRow) + currentCol, totalItems - 1);
                }
                break;
                
            case 'down':
                // Simple down navigation with wrapping
                if (currentSlot + itemsPerRow < totalItems) {
                    newSlot = currentSlot + itemsPerRow;
                } else {
                    // Wrap to top row, same column
                    newSlot = currentSlot % itemsPerRow;
                }
                break;
                
            case 'left':
                // Simple left navigation with wrapping
                if (currentSlot > 0) {
                    newSlot = currentSlot - 1;
                } else {
                    newSlot = totalItems - 1; // Wrap to last item
                }
                break;
                
            case 'right':
                // Simple right navigation with wrapping
                if (currentSlot < totalItems - 1) {
                    newSlot = currentSlot + 1;
                } else {
                    newSlot = 0; // Wrap to first item
                }
                break;
        }
        
        // Ensure newSlot is within bounds
        newSlot = Math.max(0, Math.min(newSlot, totalItems - 1));
        
        console.log(`*** NAVIGATION RESULT *** old slot: ${currentSlot}, new slot: ${newSlot}`);
        this.inventoryManager.selectedSlot = newSlot;
    }
    
    update(deltaTime) {
        if (this.gameState !== 'PLAYING') return;
        if (!this.currentMap.loaded) return;
        if (this.npcManager.isDialogueActive()) return; // Don't allow movement during dialogue
        
        // Update game time for animations using actual delta time
        this.gameTime += deltaTime;
        
        // Handle movement input with acceleration
        let inputX = 0;
        let inputY = 0;
        
        if (this.keys['w']) inputY -= 1;
        if (this.keys['s']) inputY += 1;
        if (this.keys['a']) {
            inputX -= 1;
            this.player.facingRight = true;
        }
        if (this.keys['d']) {
            inputX += 1;
            this.player.facingRight = false;
        }
        
        // Normalize diagonal input
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707; // 1/sqrt(2)
            inputY *= 0.707;
        }
        
        // Convert speeds to per-second values (much higher multiplier for good feel)
        const accelerationPerSecond = this.player.acceleration * 3600; // 60fps * 60 for proper acceleration
        const maxSpeedPerSecond = this.player.maxSpeed * 300; // Increased for proper movement speed
        const frictionPerSecond = Math.pow(this.player.friction, deltaTime * 60); // Exponential friction
        
        // Apply acceleration based on input (delta-time corrected)
        if (inputX !== 0) {
            this.player.velocityX += inputX * accelerationPerSecond * deltaTime;
        } else {
            // Apply friction when no input (delta-time corrected)
            this.player.velocityX *= frictionPerSecond;
        }
        
        if (inputY !== 0) {
            this.player.velocityY += inputY * accelerationPerSecond * deltaTime;
        } else {
            // Apply friction when no input (delta-time corrected)
            this.player.velocityY *= frictionPerSecond;
        }
        
        // Clamp velocity to max speed
        const currentSpeed = Math.sqrt(this.player.velocityX * this.player.velocityX + this.player.velocityY * this.player.velocityY);
        if (currentSpeed > maxSpeedPerSecond) {
            this.player.velocityX = (this.player.velocityX / currentSpeed) * maxSpeedPerSecond;
            this.player.velocityY = (this.player.velocityY / currentSpeed) * maxSpeedPerSecond;
        }
        
        // Stop very slow movement to prevent jitter
        if (Math.abs(this.player.velocityX) < 0.01) this.player.velocityX = 0;
        if (Math.abs(this.player.velocityY) < 0.01) this.player.velocityY = 0;
        
        // Calculate new position (delta-time corrected)
        let newX = this.player.x + this.player.velocityX * deltaTime;
        let newY = this.player.y + this.player.velocityY * deltaTime;
        
        // Calculate sprite boundaries
        const halfWidth = this.player.width / 2;
        const halfHeight = this.player.height / 2;
        const minX = halfWidth;
        const maxX = this.currentMap.width - halfWidth;
        const minY = halfHeight;
        const maxY = this.currentMap.height - halfHeight;
        
        // Check boundaries and stop velocity if hitting them
        if (newX < minX) {
            newX = minX;
            this.player.velocityX = 0;
        } else if (newX > maxX) {
            newX = maxX;
            this.player.velocityX = 0;
        }
        
        if (newY < minY) {
            newY = minY;
            this.player.velocityY = 0;
        } else if (newY > maxY) {
            newY = maxY;
            this.player.velocityY = 0;
        }
        
        // Check NPC collisions before updating position
        const collisionResult = this.checkNPCCollisions(newX, newY);
        if (!collisionResult.collides) {
            // Update player position
            this.player.x = newX;
            this.player.y = newY;
        } else {
            // Stop movement if colliding with NPC
            this.player.velocityX = 0;
            this.player.velocityY = 0;
        }
        
        // Check for portal collisions
        this.checkPortalCollisions();
        
        // Check for spirit battle collisions
        this.checkSpiritBattleCollisions();
        
        // Update spirit respawning
        this.updateSpiritRespawning();
        
        // Update roaming NPCs
        this.updateRoamingNPCs(deltaTime);
        
        // Update interactive objects (animations, effects, etc.)
        this.interactiveObjectManager.updateObjects(this.currentMapId, deltaTime, this);
        
        // Update camera (Zelda-style camera system)
        this.updateCamera();
        
        // Update footsteps based on movement
        this.updateFootsteps(inputX, inputY);
    }
    
    updateRoamingNPCs(deltaTime) {
        // Update roaming NPCs with current map bounds
        const mapBounds = {
            width: this.currentMap.width,
            height: this.currentMap.height
        };
        
        this.npcManager.updateRoamingNPCs(this.currentMapId, deltaTime, mapBounds);
    }
    
    updateFootsteps(inputX, inputY) {
        const isMoving = inputX !== 0 || inputY !== 0;
        const currentTime = Date.now();
        
        if (isMoving) {
            // Calculate step interval based on current speed
            const currentSpeedType = this.isRunning ? 'Run' : 'Walk';
            const currentSpeed = this.speedSettings[currentSpeedType];
            
            // Faster speed = shorter interval between steps
            // Base interval (400ms for walking) divided by speed ratio
            const speedMultiplier = currentSpeed / this.speedSettings['Walk'];
            this.footsteps.stepInterval = this.footsteps.baseStepInterval / speedMultiplier;
            
            // Play footstep if enough time has passed
            if (currentTime - this.footsteps.lastStepTime >= this.footsteps.stepInterval) {
                this.playFootstep();
                this.footsteps.lastStepTime = currentTime;
            }
            
            this.footsteps.isPlaying = true;
        } else {
            // Stop footsteps when not moving
            this.footsteps.isPlaying = false;
        }
    }
    
    playFootstep() {
        if (this.audio.footstep && !this.settings.audioMuted) {
            // Reset audio to beginning for rapid playback
            this.audio.footstep.currentTime = 0;
            
            // Set volume based on effect volume settings
            const effectVolume = (this.settings.effectVolume / 100) * (this.settings.masterVolume / 100);
            this.audio.footstep.volume = effectVolume * 0.5; // 50% of effect volume for footsteps
            
            this.audio.footstep.play().catch(e => {
                // Ignore errors (common with rapid audio playback)
            });
        }
    }
    
    updateSpiritRespawning() {
        if (!this.disappearedSpirits) return;
        
        const currentTime = Date.now();
        const spiritsToRespawn = [];
        
        // Check which spirits are ready to respawn
        this.disappearedSpirits.forEach((spiritInfo, spiritId) => {
            const timeSinceDisappear = currentTime - spiritInfo.disappearTime;
            if (timeSinceDisappear >= spiritInfo.respawnDelay) {
                spiritsToRespawn.push({ spiritId, spiritInfo });
            }
        });
        
        // Respawn the spirits
        spiritsToRespawn.forEach(({ spiritId, spiritInfo }) => {
            this.respawnSpirit(spiritId, spiritInfo);
        });
    }
    
    respawnSpirit(spiritId, spiritInfo) {
        const { spiritData, mapId } = spiritInfo;
        
        // Reset spirit to its original spawn position while preserving all roaming behavior
        const respawnedSpirit = {
            ...spiritData,
            x: spiritData.spawnX,
            y: spiritData.spawnY,
            targetX: spiritData.spawnX,
            targetY: spiritData.spawnY,
            isPaused: false,
            pauseStartTime: 0,
            lastMoveTime: 0, // Reset movement timing
            
            // Preserve roaming properties
            isRoaming: spiritData.isRoaming,
            speed: spiritData.speed,
            roamRadius: spiritData.roamRadius,
            pauseTime: spiritData.pauseTime,
            
            // Preserve visual properties
            baseAlpha: spiritData.baseAlpha,
            pulseSpeed: spiritData.pulseSpeed,
            glowEffect: spiritData.glowEffect,
            
            // Add spawn effect properties
            spawnEffect: {
                active: true,
                startTime: Date.now(),
                duration: 1500, // 1.5 seconds
                maxRadius: 100
            }
        };
        
        // Re-register the spirit with NPCManager for roaming behavior
        this.npcManager.registerNPC(respawnedSpirit);
        
        // Add back to the map's NPC list for rendering
        if (!this.npcs[mapId]) {
            this.npcs[mapId] = [];
        }
        this.npcs[mapId].push(respawnedSpirit);
        
        // Remove from disappeared spirits list
        this.disappearedSpirits.delete(spiritId);
        
        console.log(`${spiritData.name} respawned on map ${mapId} at (${spiritData.spawnX}, ${spiritData.spawnY}) with roaming behavior and spawn effect`);
    }
    
    updateCamera() {
        // Calculate ideal camera position (centered on player)
        const idealCameraX = this.player.x - this.CANVAS_WIDTH / 2;
        const idealCameraY = this.player.y - this.CANVAS_HEIGHT / 2;
        
        // Calculate camera bounds based on map size
        let minCameraX, maxCameraX, minCameraY, maxCameraY;
        
        if (this.currentMap.width < this.CANVAS_WIDTH) {
            // If map is smaller than screen width, center it
            const centerOffset = (this.CANVAS_WIDTH - this.currentMap.width) / 2;
            minCameraX = maxCameraX = -centerOffset;
        } else {
            // Normal camera bounds for larger maps
            minCameraX = 0;
            maxCameraX = this.currentMap.width - this.CANVAS_WIDTH;
        }
        
        if (this.currentMap.height < this.CANVAS_HEIGHT) {
            // If map is smaller than screen height, center it
            const centerOffset = (this.CANVAS_HEIGHT - this.currentMap.height) / 2;
            minCameraY = maxCameraY = -centerOffset;
        } else {
            // Normal camera bounds for larger maps
            minCameraY = 0;
            maxCameraY = this.currentMap.height - this.CANVAS_HEIGHT;
        }
        
        // Clamp camera to calculated boundaries
        this.camera.x = Math.max(minCameraX, Math.min(maxCameraX, idealCameraX));
        this.camera.y = Math.max(minCameraY, Math.min(maxCameraY, idealCameraY));
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        if (this.gameState === 'MAIN_MENU') {
            this.renderMainMenu();
            return;
        }
        
        if (this.gameState === 'GAME_MENU') {
            this.renderGameMenu();
            return;
        }
        
        if (this.gameState === 'SETTINGS') {
            this.renderSettings();
            return;
        }
        
        if (this.gameState === 'INVENTORY') {
            this.renderInventory();
            return;
        }
        
        if (this.gameState === 'LOOT_WINDOW') {
            this.renderLootWindow();
            return;
        }
        
        if (this.gameState === 'SHOP_OPTIONS') {
            this.renderShopOptions();
            return;
        }
        
        if (this.gameState === 'SHOP') {
            this.renderShop();
            return;
        }
        
        if (this.gameState === 'BATTLE_DIALOGUE') {
            this.renderBattleDialogue();
            return;
        }
        
        if (this.gameState === 'BATTLE') {
            this.renderBattle();
            return;
        }
        
        if (!this.currentMap.loaded) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Loading...', this.CANVAS_WIDTH / 2 - 50, this.CANVAS_HEIGHT / 2);
            return;
        }
        
        // Save context for camera transformation
        this.ctx.save();
        
        // Apply camera translation
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw map background with optional scaling
        const mapScale = this.currentMap.mapScale || 1.0;
        
        if (mapScale !== 1.0 && this.currentMap.originalWidth && this.currentMap.originalHeight) {
            // Apply scaling transformation to the map
            this.ctx.save();
            this.ctx.scale(mapScale, mapScale);
            this.ctx.drawImage(this.currentMap.image, 0, 0, this.currentMap.originalWidth, this.currentMap.originalHeight);
            this.ctx.restore();
        } else {
            // Draw map normally (use width/height which might be scaled)
            const drawWidth = this.currentMap.originalWidth || this.currentMap.width;
            const drawHeight = this.currentMap.originalHeight || this.currentMap.height;
            this.ctx.drawImage(this.currentMap.image, 0, 0, drawWidth, drawHeight);
        }
        
        // Draw all sprites in depth order (Y-coordinate based)
        this.drawSpritesInDepthOrder();
        
        // Restore context
        this.ctx.restore();
        
        // Draw dialogue box (after restoring context so it's not affected by camera)
        if (this.npcManager.isDialogueActive()) {
            this.drawDialogue();
        }
    }
    
    renderMainMenu() {
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        const titleY = this.CANVAS_HEIGHT * 0.25;
        this.ctx.fillText('RPG Adventure', this.CANVAS_WIDTH / 2, titleY);
        
        // Draw subtitle
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Welcome to the Adventure!', this.CANVAS_WIDTH / 2, titleY + 40);
        
        // Draw menu options
        this.ctx.font = '28px Arial';
        const startY = this.CANVAS_HEIGHT * 0.5;
        const spacing = 60;
        
        this.mainMenuOptions.forEach((option, index) => {
            const y = startY + (index * spacing);
            
            // Gray out Continue if no save data
            let isDisabled = false;
            if (option === 'Continue' && !this.hasSaveData()) {
                isDisabled = true;
            }
            
            // Highlight selected option with background bar
            if (index === this.selectedMainMenuOption) {
                // Calculate text width for proper bar sizing
                this.ctx.font = '28px Arial';
                const textWidth = this.ctx.measureText(option).width;
                const barWidth = textWidth + 40; // Add padding
                const barHeight = 40;
                const barX = (this.CANVAS_WIDTH - barWidth) / 2;
                const barY = y - 30;
                
                // Draw background bar
                this.ctx.fillStyle = isDisabled ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Draw border around bar
                this.ctx.strokeStyle = isDisabled ? '#666666' : '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // Draw text
                this.ctx.fillStyle = isDisabled ? '#666666' : '#FFD700';
                this.ctx.fillText(option, this.CANVAS_WIDTH / 2, y);
            } else {
                this.ctx.fillStyle = isDisabled ? '#444444' : 'white';
                this.ctx.fillText(option, this.CANVAS_WIDTH / 2, y);
            }
        });
        

    }
    
    renderGameMenu() {
        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        const titleY = this.CANVAS_HEIGHT * 0.3;
        this.ctx.fillText('Game Menu', this.CANVAS_WIDTH / 2, titleY);
        
        // Draw menu options
        this.ctx.font = '24px Arial';
        const startY = this.CANVAS_HEIGHT * 0.45;
        const spacing = 50;
        
        this.gameMenuOptions.forEach((option, index) => {
            const y = startY + (index * spacing);
            
            // Highlight selected option with background bar
            if (index === this.selectedGameMenuOption) {
                // Calculate text width for proper bar sizing
                this.ctx.font = '24px Arial';
                const textWidth = this.ctx.measureText(option).width;
                const barWidth = textWidth + 40; // Add padding
                const barHeight = 35;
                const barX = (this.CANVAS_WIDTH - barWidth) / 2;
                const barY = y - 25;
                
                // Draw background bar
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Semi-transparent gold
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Draw border around bar
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // Draw text in gold
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillText(option, this.CANVAS_WIDTH / 2, y);
            } else {
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(option, this.CANVAS_WIDTH / 2, y);
            }
        });
    }
    
    renderSettings() {
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        const titleY = this.CANVAS_HEIGHT * 0.2;
        this.ctx.fillText('Settings', this.CANVAS_WIDTH / 2, titleY);
        
        // Draw settings options
        this.ctx.font = '24px Arial';
        const startY = this.CANVAS_HEIGHT * 0.35;
        const spacing = 50;
        
        this.settingsOptions.forEach((option, index) => {
            const y = startY + (index * spacing);
            let displayText = option;
            let valueText = '';
            
            // Add current values for settings
            switch(index) {
                case 0: // Master Volume
                    valueText = `: ${this.settings.masterVolume}%`;
                    break;
                case 1: // BGM Volume
                    valueText = `: ${this.settings.bgmVolume}%`;
                    break;
                case 2: // Effect Volume
                    valueText = `: ${this.settings.effectVolume}%`;
                    break;
                case 3: // Mute Audio
                    valueText = `: ${this.settings.audioMuted ? 'ON' : 'OFF'}`;
                    break;
                case 4: // Back to Menu
                    valueText = '';
                    break;
            }
            
            // Highlight selected option with background bar
            if (index === this.selectedSettingsOption) {
                // Calculate text width for proper bar sizing
                this.ctx.font = '24px Arial';
                const fullText = displayText + valueText;
                const textWidth = this.ctx.measureText(fullText).width;
                const barWidth = textWidth + 40; // Add padding
                const barHeight = 35;
                const barX = (this.CANVAS_WIDTH - barWidth) / 2;
                const barY = y - 25;
                
                // Draw background bar
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Semi-transparent gold
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Draw border around bar
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // Draw text in gold
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillText(fullText, this.CANVAS_WIDTH / 2, y);
            } else {
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(displayText + valueText, this.CANVAS_WIDTH / 2, y);
            }
        });
        
        // Draw instructions
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '16px Arial';
        const instructionsY = this.CANVAS_HEIGHT * 0.85;
        this.ctx.fillText('Use W/S to navigate, A/D to adjust values', this.CANVAS_WIDTH / 2, instructionsY);
        this.ctx.fillText('Press ENTER to select, ESC to go back', this.CANVAS_WIDTH / 2, instructionsY + 25);
        this.ctx.fillText('Press F1 to toggle debug info', this.CANVAS_WIDTH / 2, instructionsY + 50);
    }
    
    renderInventory() {
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        const titleY = this.CANVAS_HEIGHT * 0.1;
        this.ctx.fillText('Inventory', this.CANVAS_WIDTH / 2, titleY);
        
        // Get inventory items
        const inventory = this.inventoryManager.getInventory();
        const slotInfo = this.inventoryManager.getSlotInfo();
        
        // Draw slot counter
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`${slotInfo.used} / ${slotInfo.max} slots`, this.CANVAS_WIDTH / 2, titleY + 40);
        
        if (inventory.length === 0) {
            // Empty inventory message
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Your inventory is empty', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
        } else {
            // Draw inventory items in a grid
            const itemsPerRow = 5;
            const itemSize = 80;
            const itemSpacing = 100;
            const startX = this.CANVAS_WIDTH / 2 - (itemsPerRow * itemSpacing) / 2;
            const startY = this.CANVAS_HEIGHT * 0.25;
            
            inventory.forEach((item, index) => {
                const row = Math.floor(index / itemsPerRow);
                const col = index % itemsPerRow;
                const x = startX + (col * itemSpacing);
                const y = startY + (row * itemSpacing);
                
                // Draw slot background
                this.ctx.fillStyle = index === this.inventoryManager.selectedSlot ? 
                    'rgba(255, 215, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)';
                this.ctx.fillRect(x - itemSize/2, y - itemSize/2, itemSize, itemSize);
                
                // Draw slot border
                this.ctx.strokeStyle = index === this.inventoryManager.selectedSlot ? 
                    '#FFD700' : '#666666';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x - itemSize/2, y - itemSize/2, itemSize, itemSize);
                
                // Draw item sprite with proper scaling and error handling
                if (item.sprite && item.sprite.complete && item.sprite.naturalWidth > 0) {
                    try {
                        // Calculate scaling to fit the item slot properly
                        const spriteSize = 45; // Slightly smaller than slot for padding
                        const spriteX = x - spriteSize / 2;
                        const spriteY = y - spriteSize / 2;
                        
                        // Save context for potential transformations
                        this.ctx.save();
                        
                        // Draw the actual item sprite with consistent sizing
                        this.ctx.drawImage(item.sprite, spriteX, spriteY, spriteSize, spriteSize);
                        
                        this.ctx.restore();
                    } catch (error) {
                        console.warn(`Failed to draw sprite for ${item.name}:`, error);
                        // Fallback to colored rectangle if sprite drawing fails
                        this.ctx.fillStyle = this.getItemRarityColor(item.rarity);
                        this.ctx.fillRect(x - 25, y - 25, 50, 50);
                    }
                } else {
                    // Fallback to colored rectangle if sprite not loaded or broken
                    this.ctx.fillStyle = this.getItemRarityColor(item.rarity);
                    this.ctx.fillRect(x - 25, y - 25, 50, 50);
                }
                
                // Draw quantity if stackable
                if (item.stackable && item.quantity > 1) {
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(item.quantity.toString(), x + itemSize/2 - 5, y + itemSize/2 - 5);
                }
            });
            
            // Draw selected item details
            const selectedItem = this.inventoryManager.getSelectedItem();
            if (selectedItem) {
                const detailsY = this.CANVAS_HEIGHT * 0.7;
                
                // Item name
                this.ctx.fillStyle = this.getItemRarityColor(selectedItem.rarity);
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(selectedItem.name, this.CANVAS_WIDTH / 2, detailsY);
                
                // Item description
                if (selectedItem.description) {
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '18px Arial';
                    this.ctx.fillText(selectedItem.description, this.CANVAS_WIDTH / 2, detailsY + 30);
                }
                
                // Item stats or effects
                if (selectedItem.effect) {
                    this.ctx.fillStyle = '#AAFFAA';
                    this.ctx.font = '16px Arial';
                    this.ctx.fillText(`${selectedItem.effect.type}: +${selectedItem.effect.amount}`, 
                        this.CANVAS_WIDTH / 2, detailsY + 55);
                }
            }
        }
        
        // Draw gold counter in bottom right
        this.drawGoldCounter();
        
        // Draw instructions
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        const instructionsY = this.CANVAS_HEIGHT * 0.9;
        this.ctx.fillText('Use WASD to navigate, ENTER to use item, X to drop', this.CANVAS_WIDTH / 2, instructionsY);
        this.ctx.fillText('Press ESC or I to close inventory', this.CANVAS_WIDTH / 2, instructionsY + 20);
    }
    
    getItemRarityColor(rarity) {
        const colors = {
            common: '#FFFFFF',
            uncommon: '#1EFF00',
            rare: '#0070DD',
            epic: '#A335EE',
            legendary: '#FF8000'
        };
        return colors[rarity] || colors.common;
    }
    
    drawGoldCounter() {
        const goldX = this.CANVAS_WIDTH - 150;
        const goldY = this.CANVAS_HEIGHT - 100;
        
        // Draw background for gold counter
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(goldX - 10, goldY - 35, 140, 50);
        
        // Draw border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(goldX - 10, goldY - 35, 140, 50);
        
        // Draw gold icon
        if (this.goldIcon.complete && this.goldIcon.naturalWidth > 0) {
            try {
                this.ctx.drawImage(this.goldIcon, goldX, goldY - 30, 32, 32);
            } catch (e) {
                console.warn('Failed to draw gold icon:', e);
                // Draw a simple gold circle as fallback
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(goldX + 16, goldY - 14, 12, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // Draw a simple gold circle as fallback
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(goldX + 16, goldY - 14, 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw gold amount
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.player.gold.toString(), goldX + 40, goldY - 8);
    }
    
    renderLootWindow() {
        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Calculate window dimensions
        const windowWidth = 500;
        const windowHeight = 400;
        const windowX = (this.CANVAS_WIDTH - windowWidth) / 2;
        const windowY = (this.CANVAS_HEIGHT - windowHeight) / 2;
        
        // Draw window background
        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw window border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw title
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        const titleY = windowY + 40;
        
        if (this.lootWindow.message) {
            this.ctx.fillText(this.lootWindow.message, windowX + windowWidth / 2, titleY);
        } else {
            this.ctx.fillText('Treasure Found!', windowX + windowWidth / 2, titleY);
        }
        
        let contentY = titleY + 50;
        
        // Draw gold if any
        if (this.lootWindow.gold > 0) {
            // Draw gold icon and amount
            if (this.goldIcon.complete && this.goldIcon.naturalWidth > 0) {
                try {
                    this.ctx.drawImage(this.goldIcon, windowX + 50, contentY - 25, 32, 32);
                } catch (e) {
                    console.warn('Failed to draw gold icon in loot window:', e);
                    // Draw a simple gold circle as fallback
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.beginPath();
                    this.ctx.arc(windowX + 66, contentY - 9, 12, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else {
                // Draw a simple gold circle as fallback
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(windowX + 66, contentY - 9, 12, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${this.lootWindow.gold} Gold`, windowX + 90, contentY);
            contentY += 40;
        }
        
        // Draw items
        if (this.lootWindow.items && this.lootWindow.items.length > 0) {
            this.ctx.font = '18px Arial';
            
            this.lootWindow.items.forEach(item => {
                const color = item.success ? 
                    this.getItemRarityColor(item.rarity) : 
                    '#FF6666'; // Red for failed items
                
                this.ctx.fillStyle = color;
                this.ctx.textAlign = 'left';
                
                let itemText = `${item.quantity}x ${item.name}`;
                if (!item.success) {
                    if (item.error === 'ITEM_NOT_FOUND') {
                        itemText += ' (Item Not Found!)';
                    } else if (item.error === 'INVENTORY_FULL') {
                        itemText += ' (Inventory Full!)';
                    } else {
                        itemText += ' (Failed!)';
                    }
                }
                
                this.ctx.fillText(itemText, windowX + 50, contentY);
                contentY += 30;
            });
        }
        
        // Draw empty message if no loot
        if (this.lootWindow.items.length === 0 && this.lootWindow.gold === 0 && !this.lootWindow.message) {
            this.ctx.fillStyle = '#CCCCCC';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('The chest was empty.', windowX + windowWidth / 2, contentY);
        }
        
        // Draw instructions
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        const instructionsY = windowY + windowHeight - 30;
        this.ctx.fillText('Press ENTER, ESC, or E to close', windowX + windowWidth / 2, instructionsY);
    }
    
    renderShopOptions() {
        // Draw game world background (darkened)
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw map background with optional scaling
        const mapScale = this.currentMap.mapScale || 1.0;
        
        if (mapScale !== 1.0 && this.currentMap.originalWidth && this.currentMap.originalHeight) {
            this.ctx.save();
            this.ctx.scale(mapScale, mapScale);
            this.ctx.drawImage(this.currentMap.image, 0, 0, this.currentMap.originalWidth, this.currentMap.originalHeight);
            this.ctx.restore();
        } else {
            const drawWidth = this.currentMap.originalWidth || this.currentMap.width;
            const drawHeight = this.currentMap.originalHeight || this.currentMap.height;
            this.ctx.drawImage(this.currentMap.image, 0, 0, drawWidth, drawHeight);
        }
        
        this.drawSpritesInDepthOrder();
        this.ctx.restore();
        
        // Draw darkening overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw shop options window
        const windowWidth = 300;
        const windowHeight = 200;
        const windowX = (this.CANVAS_WIDTH - windowWidth) / 2;
        const windowY = (this.CANVAS_HEIGHT - windowHeight) / 2;
        
        // Draw window background
        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw window border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw NPC name
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        const npcDisplayName = this.shopOptions.npc.name || this.shopOptions.npc.id.charAt(0).toUpperCase() + this.shopOptions.npc.id.slice(1);
        this.ctx.fillText(npcDisplayName, windowX + windowWidth / 2, windowY + 40);
        
        // Draw options
        const startY = windowY + 80;
        const optionHeight = 40;
        
        this.shopOptions.options.forEach((option, index) => {
            const optionY = startY + index * optionHeight;
            
            // Calculate centered positions
            const highlightY = optionY - 20;
            const highlightHeight = 35;
            const highlightCenterY = highlightY + highlightHeight/2;
            
            // Center text within the highlight area
            const textY = highlightCenterY + 5; // Offset for text baseline
            
            // Draw selection highlight
            if (index === this.shopOptions.selectedIndex) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(windowX + 20, highlightY, windowWidth - 40, highlightHeight);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.strokeRect(windowX + 20, highlightY, windowWidth - 40, highlightHeight);
            }
            
            // Draw option text
            this.ctx.fillStyle = index === this.shopOptions.selectedIndex ? '#FFD700' : '#FFF';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(option, windowX + windowWidth / 2, textY);
        });
        
        // Draw instructions
        this.ctx.fillStyle = '#CCC';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓: Select | Enter: Choose | ESC: Cancel', windowX + windowWidth / 2, windowY + windowHeight - 20);
    }

    /**
     * Get consolidated sell items - groups multiple non-stackable items of same type
     * @returns {Array} Array of consolidated sell items
     */
    getConsolidatedSellItems() {
        const inventory = this.inventoryManager.getInventory().filter(item => item.id && item.quantity > 0);
        const consolidated = new Map();
        
        for (const item of inventory) {
            const itemTemplate = this.itemManager.getItem(item.id);
            if (!itemTemplate) continue;
            
            if (consolidated.has(item.id)) {
                // Add to existing consolidated entry
                const existing = consolidated.get(item.id);
                if (itemTemplate.stackable) {
                    // For stackable items, this shouldn't happen as they should already be in one stack
                    existing.quantity += item.quantity;
                } else {
                    // For non-stackable items, count how many we have
                    existing.quantity += item.quantity; // Each item has quantity 1, so this counts individual items
                }
                existing.inventorySlots.push(inventory.indexOf(item));
            } else {
                // Create new consolidated entry
                consolidated.set(item.id, {
                    id: item.id,
                    name: itemTemplate.name,
                    quantity: item.quantity,
                    value: itemTemplate.value,
                    rarity: itemTemplate.rarity,
                    stackable: itemTemplate.stackable,
                    inventorySlots: [inventory.indexOf(item)] // Track which inventory slots this represents
                });
            }
        }
        
        return Array.from(consolidated.values());
    }

    renderShop() {
        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Calculate window dimensions
        const windowWidth = 600;
        const windowHeight = 500;
        const windowX = (this.CANVAS_WIDTH - windowWidth) / 2;
        const windowY = (this.CANVAS_HEIGHT - windowHeight) / 2;
        
        // Draw window background
        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw window border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw shop title
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        const titleY = windowY + 40;
        const npcName = this.shop.npc.name || this.shop.npc.id.charAt(0).toUpperCase() + this.shop.npc.id.slice(1);
        this.ctx.fillText(`${npcName}'s Shop`, windowX + windowWidth / 2, titleY);
        
        // Draw player gold
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Gold: ${this.player.gold}`, windowX + windowWidth - 20, titleY);
        
        // Draw mode tabs
        const tabWidth = windowWidth / 2;
        const tabHeight = 40;
        const tabY = titleY + 20;
        
        // Buy tab
        this.ctx.fillStyle = this.shop.mode === 'buy' ? 'rgba(100, 100, 100, 0.8)' : 'rgba(60, 60, 60, 0.8)';
        this.ctx.fillRect(windowX, tabY, tabWidth, tabHeight);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.strokeRect(windowX, tabY, tabWidth, tabHeight);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Buy', windowX + tabWidth / 2, tabY + 25);
        
        // Sell tab
        this.ctx.fillStyle = this.shop.mode === 'sell' ? 'rgba(100, 100, 100, 0.8)' : 'rgba(60, 60, 60, 0.8)';
        this.ctx.fillRect(windowX + tabWidth, tabY, tabWidth, tabHeight);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.strokeRect(windowX + tabWidth, tabY, tabWidth, tabHeight);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Sell', windowX + tabWidth + tabWidth / 2, tabY + 25);
        
        // Draw items list
        const listY = tabY + tabHeight + 20;
        const itemHeight = 35;
        const maxVisibleItems = Math.floor((windowHeight - (listY - windowY) - 80) / itemHeight);
        
        let items = [];
        if (this.shop.mode === 'buy') {
            items = this.shop.npc.shop.buyItems || [];
        } else {
            items = this.getConsolidatedSellItems();
        }
        
        // Draw items
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        
        for (let i = 0; i < Math.min(items.length, maxVisibleItems); i++) {
            const item = items[i];
            const itemY = listY + i * itemHeight;
            
            // Calculate centered positions
            const highlightY = itemY - itemHeight/2 + 5;
            const highlightHeight = itemHeight - 5;
            const highlightCenterY = highlightY + highlightHeight/2;
            
            // Center text and icon within the highlight area
            const textY = highlightCenterY + 5; // Offset for text baseline
            const iconY = highlightCenterY - 12; // Center 24px icon
            
            // Selection highlight
            if (i === this.shop.selectedIndex) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(windowX + 10, highlightY, windowWidth - 20, itemHeight - 5);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.strokeRect(windowX + 10, highlightY, windowWidth - 20, itemHeight - 5);
            }
            
            if (this.shop.mode === 'buy') {
                // Show buy items
                const itemData = this.itemManager.getItem(item.id);
                if (itemData) {
                    // Draw item icon
                    const iconSize = 24;
                    const iconX = windowX + 15;
                    
                    if (itemData.sprite && itemData.sprite.complete && itemData.sprite.naturalWidth > 0) {
                        try {
                            this.ctx.drawImage(itemData.sprite, iconX, iconY, iconSize, iconSize);
                        } catch (e) {
                            // Fallback to colored rectangle if sprite fails
                            this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                            this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
                        }
                    } else {
                        // Fallback to colored rectangle if no sprite
                        this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                        this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
                    }
                    
                    // Draw item name (moved right to make room for icon)
                    this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                    this.ctx.fillText(itemData.name, windowX + 50, textY);
                    
                    // Show stock (red if out of stock)
                    if (item.stock !== undefined) {
                        this.ctx.fillStyle = item.stock === 0 ? '#FF4444' : '#CCC';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(`Stock: ${item.stock}`, windowX + windowWidth / 2, textY);
                    }
                    
                    // Show price (red if player can't afford it)
                    const canAfford = this.player.gold >= item.price;
                    this.ctx.fillStyle = canAfford ? '#FFD700' : '#FF4444';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`${item.price}g`, windowX + windowWidth - 20, textY);
                }
            } else {
                // Show sell items
                const itemData = this.itemManager.getItem(item.id);
                if (itemData) {
                    // Draw item icon
                    const iconSize = 24;
                    const iconX = windowX + 15;
                    
                    if (itemData.sprite && itemData.sprite.complete && itemData.sprite.naturalWidth > 0) {
                        try {
                            this.ctx.drawImage(itemData.sprite, iconX, iconY, iconSize, iconSize);
                        } catch (e) {
                            // Fallback to colored rectangle if sprite fails
                            this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                            this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
                        }
                    } else {
                        // Fallback to colored rectangle if no sprite
                        this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                        this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
                    }
                    
                    // Draw item name and quantity (moved right to make room for icon)
                    this.ctx.fillStyle = this.getItemRarityColor(itemData.rarity || 'common');
                    this.ctx.fillText(`${itemData.name} x${item.quantity}`, windowX + 50, textY);
                    
                    // Show sell price
                    const sellPrice = Math.floor(itemData.value * this.shop.npc.shop.sellMultiplier);
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`${sellPrice}g`, windowX + windowWidth - 20, textY);
                }
            }
            
            this.ctx.textAlign = 'left'; // Reset alignment
        }
        
        // Draw instructions
        this.ctx.fillStyle = '#CCC';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        const instructionsY = windowY + windowHeight - 30;
        this.ctx.fillText('↑↓: Select | ←→: Change Tab | Enter: Buy/Sell | ESC: Exit', windowX + windowWidth / 2, instructionsY);
        
        // Show empty message if no items
        if (items.length === 0) {
            this.ctx.fillStyle = '#888';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            const emptyMessage = this.shop.mode === 'buy' ? 'No items for sale' : 'No items to sell';
            this.ctx.fillText(emptyMessage, windowX + windowWidth / 2, listY + 50);
        }
        
        // Draw quantity selection window if active
        if (this.shop.quantitySelection.active) {
            this.renderQuantitySelection();
        }
    }
    
    renderQuantitySelection() {
        console.log('*** RENDERING QUANTITY SELECTION ***');
        
        // Darken the background further
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Calculate window dimensions
        const windowWidth = 350;
        const windowHeight = 250;
        const windowX = (this.CANVAS_WIDTH - windowWidth) / 2;
        const windowY = (this.CANVAS_HEIGHT - windowHeight) / 2;
        
        // Draw window background
        this.ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        
        // Draw window border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
        
        // Get item info
        const qs = this.shop.quantitySelection;
        const mode = qs.mode;
        const quantity = qs.quantity;
        const maxQuantity = qs.maxQuantity;
        
        let itemName = '';
        let pricePerItem = 0;
        
        if (mode === 'buy') {
            const itemTemplate = this.itemManager.getItem(qs.itemData.id);
            itemName = itemTemplate ? itemTemplate.name : qs.itemData.id;
            pricePerItem = qs.itemData.price;
        } else {
            itemName = qs.itemData.name;
            const itemTemplate = this.itemManager.getItem(qs.itemData.id);
            pricePerItem = itemTemplate ? Math.floor(itemTemplate.value * this.shop.npc.shop.sellMultiplier) : 0;
        }
        
        // Draw title
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 22px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${mode === 'buy' ? 'Buy' : 'Sell'} ${itemName}`, windowX + windowWidth / 2, windowY + 40);
        
        // Draw quantity selector
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Select Quantity:', windowX + windowWidth / 2, windowY + 80);
        
        // Draw quantity display with visual feedback
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`${quantity}`, windowX + windowWidth / 2, windowY + 120);
        
        // Draw max quantity
        this.ctx.fillStyle = '#CCC';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`(max: ${maxQuantity})`, windowX + windowWidth / 2, windowY + 145);
        
        // Draw total price
        const totalPrice = pricePerItem * quantity;
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        const priceText = mode === 'buy' ? `Total Cost: ${totalPrice} gold` : `Total Value: ${totalPrice} gold`;
        this.ctx.fillText(priceText, windowX + windowWidth / 2, windowY + 180);
        
        // Draw controls hint (only if debug mode is enabled)
        if (this.settings.showDebug) {
            this.ctx.fillStyle = '#CCC';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('↑: +1/Min  ↓: Max/-1  Enter: Confirm  Esc: Cancel', windowX + windowWidth / 2, windowY + 210);
        }
        
        // Draw info and warnings for buying
        if (mode === 'buy') {
            let messageY = windowY + 200;
            
            // Show how many of this item the player owns
            const ownedQuantity = this.inventoryManager.getItemQuantity(qs.itemData.id);
            this.ctx.fillStyle = '#CCCCCC';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Owned: ${ownedQuantity}`, windowX + windowWidth / 2, messageY);
            messageY += 20;
            
            // Show slots that would be available after purchase (accurate for stackable items)
            const currentFreeSlots = this.inventoryManager.getFreeSlots();
            const slotsNeeded = this.inventoryManager.calculateRequiredSlots(qs.itemData.id, quantity);
            const slotsAfterPurchase = currentFreeSlots - slotsNeeded;
            
            this.ctx.fillStyle = '#AAAAAA';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Available slots after purchase: ${slotsAfterPurchase}`, windowX + windowWidth / 2, messageY);
            messageY += 25;
            
            if (totalPrice > this.player.gold) {
                this.ctx.fillStyle = '#FF6666';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText('Not enough gold!', windowX + windowWidth / 2, messageY);
                messageY += 20;
            }
            
            if (!this.inventoryManager.hasSpaceFor(qs.itemData.id, quantity)) {
                this.ctx.fillStyle = '#FF6666';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText('Not enough inventory space!', windowX + windowWidth / 2, messageY);
            }
        }
    }
    
    renderBattleDialogue() {
        // Draw the current game world first (blurred background)
        this.ctx.save();
        
        // Apply camera translation
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw map background with optional scaling
        const mapScale = this.currentMap.mapScale || 1.0;
        
        if (mapScale !== 1.0 && this.currentMap.originalWidth && this.currentMap.originalHeight) {
            // Apply scaling transformation to the map
            this.ctx.save();
            this.ctx.scale(mapScale, mapScale);
            this.ctx.drawImage(this.currentMap.image, 0, 0, this.currentMap.originalWidth, this.currentMap.originalHeight);
            this.ctx.restore();
        } else {
            // Draw map normally
            const drawWidth = this.currentMap.originalWidth || this.currentMap.width;
            const drawHeight = this.currentMap.originalHeight || this.currentMap.height;
            this.ctx.drawImage(this.currentMap.image, 0, 0, drawWidth, drawHeight);
        }
        
        // Draw all sprites in depth order
        this.drawSpritesInDepthOrder();
        
        this.ctx.restore();
        
        // Draw dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw battle dialogue box
        const boxWidth = 400;
        const boxHeight = 150;
        const boxX = (this.CANVAS_WIDTH - boxWidth) / 2;
        const boxY = (this.CANVAS_HEIGHT - boxHeight) / 2;
        
        // Draw dialogue box background
        this.ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw dialogue box border
        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw inner border glow
        this.ctx.strokeStyle = '#FFB3B3';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boxX + 2, boxY + 2, boxWidth - 4, boxHeight - 4);
        
        // Draw battle message
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Battle!', boxX + boxWidth / 2, boxY + boxHeight / 2 - 10);
        
        // Draw spirit name
        if (this.battleDialogue && this.battleDialogue.spirit) {
            this.ctx.fillStyle = '#FFB3B3';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`vs ${this.battleDialogue.spirit.name}`, boxX + boxWidth / 2, boxY + boxHeight / 2 + 25);
        }
        
        // Draw "Press any key" instruction
        this.ctx.fillStyle = '#CCC';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Press any key to continue', boxX + boxWidth / 2, boxY + boxHeight - 20);
    }
    
    renderBattleDialogue() {
        // Draw semi-transparent background over current scene
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw battle announcement
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        
        const message = this.battleDialogue.message;
        const x = this.CANVAS_WIDTH / 2;
        const y = this.CANVAS_HEIGHT / 2;
        
        // Draw text with outline
        this.ctx.strokeText(message, x, y);
        this.ctx.fillText(message, x, y);
        
        // Draw instruction
        this.ctx.font = '20px Arial';
        const instruction = 'Press any key to continue...';
        const instructionY = y + 60;
        
        this.ctx.strokeText(instruction, x, instructionY);
        this.ctx.fillText(instruction, x, instructionY);
    }
    
    renderBattle() {
        if (!this.currentMap.loaded) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Loading battle scene...', this.CANVAS_WIDTH / 2 - 100, this.CANVAS_HEIGHT / 2);
            return;
        }
        
        // Save context for camera transformation
        this.ctx.save();
        
        // Apply camera translation (still use camera system for battle)
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw battle background
        const mapScale = this.currentMap.mapScale || 1.0;
        
        if (mapScale !== 1.0 && this.currentMap.originalWidth && this.currentMap.originalHeight) {
            this.ctx.save();
            this.ctx.scale(mapScale, mapScale);
            this.ctx.drawImage(this.currentMap.image, 0, 0, this.currentMap.originalWidth, this.currentMap.originalHeight);
            this.ctx.restore();
        } else {
            const drawWidth = this.currentMap.originalWidth || this.currentMap.width;
            const drawHeight = this.currentMap.originalHeight || this.currentMap.height;
            this.ctx.drawImage(this.currentMap.image, 0, 0, drawWidth, drawHeight);
        }
        
        // Draw player sprite (static on the left)
        this.drawPlayerSprite();
        
        // Draw spirit sprite (static on the right)
        if (this.battleState && this.battleState.spirit) {
            this.drawBattleSpirit();
        }
        
        // Restore context
        this.ctx.restore();
        
        // Draw battle UI
        this.drawBattleUI();
    }
    
    drawBattleSpirit() {
        const spirit = this.battleState.spirit;
        const mapScale = this.currentMap.scale || 1.0;
        
        // Position spirit on the right side
        const spiritX = this.battleState.spiritStartX;
        const spiritY = 300; // Center vertically
        
        // Apply ethereal effects like in normal rendering
        this.ctx.save();
        
        // Pulsing alpha for ethereal effect
        const basePulse = Math.sin(this.gameTime * (spirit.pulseSpeed || 1.5)) * 0.2;
        const spiritAlpha = (spirit.baseAlpha || 0.7) + basePulse;
        this.ctx.globalAlpha = Math.max(0.3, Math.min(1.0, spiritAlpha));
        
        // Glow effect
        this.ctx.shadowColor = '#87CEEB'; // Sky blue glow
        this.ctx.shadowBlur = 15;
        
        const scaledWidth = spirit.width * mapScale;
        const scaledHeight = spirit.height * mapScale;
        const spiritScreenX = spiritX - scaledWidth / 2;
        const spiritScreenY = spiritY - scaledHeight / 2;
        
        // Draw spirit sprite (always facing left in battle to face the player)
        this.ctx.translate(spiritX, spiritY);
        this.ctx.scale(-1, 1); // Flip to face left
        this.ctx.drawImage(spirit.sprite, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        
        this.ctx.restore();
    }
    
    drawBattleUI() {
        // Draw battle status info
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, this.CANVAS_HEIGHT - 100, this.CANVAS_WIDTH, 100);
        
        // Draw battle text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        
        const spirit = this.battleState.spirit;
        this.ctx.fillText(`Battle with ${spirit.name}!`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT - 60);
        
        // Draw controls
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText('Press F to FLEE (spirit will disappear temporarily)', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT - 30);
    }
    
    addGold(amount) {
        this.player.gold += amount;
        console.log(`Added ${amount} gold. Total: ${this.player.gold}`);
    }
    
    removeGold(amount) {
        if (this.player.gold >= amount) {
            this.player.gold -= amount;
            console.log(`Removed ${amount} gold. Total: ${this.player.gold}`);
            return true;
        } else {
            console.log(`Not enough gold. Required: ${amount}, Available: ${this.player.gold}`);
            return false;
        }
    }
    
    getGold() {
        return this.player.gold;
    }
    
    dropItemInWorld(droppedItem) {
        // Add item to world near player
        const worldItem = {
            id: droppedItem.id,
            name: droppedItem.name,
            quantity: droppedItem.quantity,
            x: this.player.x + (Math.random() - 0.5) * 100, // Random position near player
            y: this.player.y + (Math.random() - 0.5) * 100,
            sprite: droppedItem.sprite
        };
        
        // Initialize world items for current map if not exists
        if (!this.worldItems[this.currentMapId]) {
            this.worldItems[this.currentMapId] = [];
        }
        
        this.worldItems[this.currentMapId].push(worldItem);
        console.log(`Dropped ${droppedItem.quantity} ${droppedItem.name} in the world`);
    }
    
    drawSpritesInDepthOrder() {
        // Find the closest interactable NPC first
        const closestNPC = this.findClosestInteractableNPC();
        
        // Get current map NPCs
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        
        // Calculate player bottom for depth sorting
        const playerBottom = this.player.y + this.player.height/2;
        
        // Draw NPCs that should be behind player
        for (let i = 0; i < currentMapNPCs.length; i++) {
            const npc = currentMapNPCs[i];
            const npcBottom = npc.y + npc.height/2;
            if (npcBottom <= playerBottom) {
                this.drawNPCSprite(npc, closestNPC);
            }
        }
        
        // Draw player
        this.drawPlayerSprite();
        
        // Draw NPCs that should be in front of player
        for (let i = 0; i < currentMapNPCs.length; i++) {
            const npc = currentMapNPCs[i];
            const npcBottom = npc.y + npc.height/2;
            if (npcBottom > playerBottom) {
                this.drawNPCSprite(npc, closestNPC);
            }
        }
        
        // Draw interactive objects (chests, portals, etc.) with depth sorting
        this.drawInteractiveObjects(playerBottom, closestNPC);
    }
    
    drawInteractiveObjects(playerBottom, closestNPC) {
        const interactiveObjects = this.interactiveObjectManager.getObjectsForMap(this.currentMapId);
        
        // Draw objects behind player first
        for (let obj of interactiveObjects) {
            const objBottom = obj.y + obj.height/2;
            if (objBottom <= playerBottom) {
                obj.render(this.ctx, this);
                this.drawInteractiveObjectIndicator(obj, closestNPC);
            }
        }
        
        // Then draw objects in front of player
        for (let obj of interactiveObjects) {
            const objBottom = obj.y + obj.height/2;
            if (objBottom > playerBottom) {
                obj.render(this.ctx, this);
                this.drawInteractiveObjectIndicator(obj, closestNPC);
            }
        }
    }
    
    drawInteractiveObjectIndicator(obj, closestNPC) {
        // Check if this is the closest interactable object
        const closestInteractable = this.interactiveObjectManager.checkNearbyInteractions(this.player, this.currentMapId);
        
        if (closestInteractable && closestInteractable.id === obj.id) {
            const mapScale = this.currentMap?.scale || 1.0;
            
            // Draw "E" indicator above object
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.lineWidth = 2 * mapScale;
            this.ctx.font = `${Math.floor(24 * mapScale)}px Arial`;
            this.ctx.textAlign = 'center';
            
            const indicatorY = obj.y - (obj.height/2) - (30 * mapScale);
            this.ctx.strokeText('E', obj.x, indicatorY);
            this.ctx.fillText('E', obj.x, indicatorY);
            this.ctx.restore();
        }
    }
    
    findClosestInteractableNPC() {
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        const mapScale = this.currentMap.scale || 1.0;
        const scaledInteractionDistance = 120 * mapScale;
        
        let closestNPC = null;
        let closestDistance = Infinity;
        
        currentMapNPCs.forEach(npc => {
            // Skip portals, chests, and spirits as they don't show interaction indicators (handled by InteractiveObjectManager)
            if (npc.type === 'portal' || npc.type === 'chest' || npc.type === 'spirit') return;
            
            const distance = Math.sqrt(
                Math.pow(this.player.x - npc.x, 2) + 
                Math.pow(this.player.y - npc.y, 2)
            );
            
            // Check if within interaction distance and closer than current closest
            if (distance <= scaledInteractionDistance && distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        });
        
        return closestNPC;
    }

    drawPlayerSprite() {
        // Get map scale factor (default to 1.0 if not specified)
        const mapScale = this.currentMap.scale || 1.0;
        const scaledWidth = this.player.width * mapScale;
        const scaledHeight = this.player.height * mapScale;
        
        const playerScreenX = this.player.x - scaledWidth / 2;
        const playerScreenY = this.player.y - scaledHeight / 2;
        
        // Draw shadow first (behind character) - also scaled
        this.drawShadow(this.player.x, this.player.y, scaledWidth, scaledHeight);
        
        this.ctx.save();
        
        // Handle horizontal flipping
        if (!this.player.facingRight) {
            // Translate to the center of the sprite, flip, then translate back
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.player.sprite, 
                             -scaledWidth / 2, -scaledHeight / 2, 
                             scaledWidth, scaledHeight);
        } else {
            this.ctx.drawImage(this.player.sprite, 
                             playerScreenX, playerScreenY, 
                             scaledWidth, scaledHeight);
        }
        
        this.ctx.restore();
    }

    drawPlayer() {
        const playerScreenX = this.player.x - this.player.width / 2;
        const playerScreenY = this.player.y - this.player.height / 2;
        
        // Draw shadow first (behind character)
        this.drawShadow(this.player.x, this.player.y, this.player.width, this.player.height);
        
        this.ctx.save();
        
        // Handle horizontal flipping
        if (!this.player.facingRight) {
            // Translate to the center of the sprite, flip, then translate back
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.player.sprite, 
                             -this.player.width / 2, -this.player.height / 2, 
                             this.player.width, this.player.height);
        } else {
            this.ctx.drawImage(this.player.sprite, 
                             playerScreenX, playerScreenY, 
                             this.player.width, this.player.height);
        }
        
        this.ctx.restore();
    }
    
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
    
    drawNPCSprite(npc, closestNPC = null) {
        // Get map scale factor (default to 1.0 if not specified)
        const mapScale = this.currentMap.scale || 1.0;
        
        if (npc.type === 'portal') {
            // Handle portal rendering with rotation and pulsing scale effects
            this.ctx.save();
            
            // Calculate pulsing scale (grow and shrink) - subtle effect
            const baseScale = mapScale;
            const pulseScale = baseScale + (0.15 * Math.sin(this.gameTime * npc.pulseSpeed));
            
            // Set much more transparency for portal (more ghostly)
            this.ctx.globalAlpha = 0.4;
            
            // Move to portal center, apply rotation and scaling
            this.ctx.translate(npc.x, npc.y);
            this.ctx.rotate((npc.rotation * Math.PI) / 180);
            this.ctx.scale(pulseScale, pulseScale);
            
            // Apply map scale to portal dimensions
            const scaledWidth = npc.width * mapScale;
            const scaledHeight = npc.height * mapScale;
            
            // Draw portal sprite centered
            this.ctx.drawImage(npc.sprite, 
                             -scaledWidth / 2, -scaledHeight / 2, 
                             scaledWidth, scaledHeight);
            
            this.ctx.restore();
        } else if (npc.type === 'spirit') {
            // Handle spirit NPCs with special ethereal effects
            this.ctx.save();
            
            // Calculate pulsing alpha for ethereal effect
            const basePulse = Math.sin(this.gameTime * npc.pulseSpeed) * 0.2;
            const spiritAlpha = npc.baseAlpha + basePulse;
            this.ctx.globalAlpha = Math.max(0.3, Math.min(1.0, spiritAlpha));
            
            const scaledWidth = npc.width * mapScale;
            const scaledHeight = npc.height * mapScale;
            
            // Calculate altitude offset with floating animation
            let altitudeOffset = 0;
            if (npc.altitude !== undefined && npc.altitude > 0) {
                altitudeOffset = npc.altitude * mapScale;
                
                // Add floating animation if specified
                if (npc.floatingSpeed && npc.floatingRange) {
                    const floatingOffset = Math.sin(this.gameTime * npc.floatingSpeed) * (npc.floatingRange * mapScale);
                    altitudeOffset += floatingOffset;
                }
            }
            
            const npcScreenX = npc.x - scaledWidth / 2;
            const npcScreenY = npc.y - scaledHeight / 2 - altitudeOffset;
            
            // Draw shadow first (behind spirit) - ethereal spirits cast faint shadows
            // Note: Shadows stay on the ground level regardless of altitude
            this.ctx.save();
            this.ctx.globalAlpha = 0.15; // Very faint shadow for ethereal spirits
            this.ctx.shadowColor = 'transparent'; // Remove glow from shadow
            this.ctx.shadowBlur = 0;
            this.drawShadow(npc.x, npc.y, scaledWidth, scaledHeight, altitudeOffset);
            this.ctx.restore();
            
            // Apply glow effect for the sprite
            if (npc.glowEffect) {
                this.ctx.shadowColor = '#87CEEB'; // Sky blue glow
                this.ctx.shadowBlur = 15;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }
            
            // Draw spirit sprite with direction support
            // Note: Spirit sprites face left by default (like other NPCs)
            if (npc.direction === 'right') {
                // Flip sprite horizontally for right-facing spirits
                this.ctx.translate(npc.x, npc.y - altitudeOffset);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(npc.sprite, 
                                 -scaledWidth / 2, -scaledHeight / 2, 
                                 scaledWidth, scaledHeight);
            } else {
                // Default left-facing (no flip needed)
                this.ctx.drawImage(npc.sprite, npcScreenX, npcScreenY, scaledWidth, scaledHeight);
            }
            
            this.ctx.restore();
            
            // Draw spawn effect on top of spirit if active
            if (npc.spawnEffect && npc.spawnEffect.active) {
                this.drawSpawnEffect(npc);
            }
            
            // Draw interaction indicator only if this is the closest NPC
            if (closestNPC && closestNPC.id === npc.id && !this.npcManager.isDialogueActive()) {
                // Draw ethereal "E" indicator above spirit
                this.ctx.save();
                this.ctx.globalAlpha = spiritAlpha;
                this.ctx.fillStyle = 'rgba(135, 206, 235, 0.9)'; // Sky blue
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.lineWidth = 2 * mapScale;
                this.ctx.font = `bold ${Math.round(16 * mapScale)}px Arial`;
                this.ctx.textAlign = 'center';
                
                const indicatorX = npc.x;
                const indicatorY = npc.y - altitudeOffset - (scaledHeight / 2) - (20 * mapScale);
                
                this.ctx.strokeText('E', indicatorX, indicatorY);
                this.ctx.fillText('E', indicatorX, indicatorY);
                this.ctx.restore();
            }
        } else {
            // Handle regular NPCs with map scaling
            const scaledWidth = npc.width * mapScale;
            const scaledHeight = npc.height * mapScale;
            
            // Calculate altitude offset with floating animation
            let altitudeOffset = 0;
            if (npc.altitude !== undefined && npc.altitude > 0) {
                altitudeOffset = npc.altitude * mapScale;
                
                // Add floating animation if specified
                if (npc.floatingSpeed && npc.floatingRange) {
                    const floatingOffset = Math.sin(this.gameTime * npc.floatingSpeed) * (npc.floatingRange * mapScale);
                    altitudeOffset += floatingOffset;
                }
            }
            
            const npcScreenX = npc.x - scaledWidth / 2;
            const npcScreenY = npc.y - scaledHeight / 2 - altitudeOffset;
            
            // Draw shadow first (behind NPC) - also scaled
            this.drawShadow(npc.x, npc.y, scaledWidth, scaledHeight, altitudeOffset);
            
            // Draw NPC sprite with direction support
            this.ctx.save();
            
            if (npc.direction === 'left') {
                // Flip sprite horizontally for left-facing NPCs
                this.ctx.translate(npc.x, npc.y - altitudeOffset);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(npc.sprite, 
                                 -scaledWidth / 2, -scaledHeight / 2, 
                                 scaledWidth, scaledHeight);
            } else {
                // Default right-facing or no flip
                this.ctx.drawImage(npc.sprite, npcScreenX, npcScreenY, scaledWidth, scaledHeight);
            }
            
            this.ctx.restore();
            
            // Draw spawn effect on top of NPC if active
            if (npc.spawnEffect && npc.spawnEffect.active) {
                this.drawSpawnEffect(npc);
            }
            
            // Draw interaction indicator only if this is the closest NPC
            if (closestNPC && closestNPC.id === npc.id && !this.npcManager.isDialogueActive()) {
                // Draw "E" indicator above NPC - scale the font and position
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 2 * mapScale;
                this.ctx.font = `bold ${Math.round(16 * mapScale)}px Arial`;
                this.ctx.textAlign = 'center';
                
                const indicatorX = npc.x;
                const indicatorY = npc.y - altitudeOffset - (scaledHeight / 2) - (20 * mapScale);
                
                this.ctx.strokeText('E', indicatorX, indicatorY);
                this.ctx.fillText('E', indicatorX, indicatorY);
            }
        }
    }

    drawNPCs() {
        const currentMapNPCs = this.npcs[this.currentMapId] || [];
        currentMapNPCs.forEach(npc => {
            if (npc.type === 'portal') {
                // Handle portal rendering with rotation and pulsing scale effects
                this.ctx.save();
                
                // Calculate pulsing scale (grow and shrink) - subtle effect
                const baseScale = 1.0;
                const pulseScale = baseScale + (0.15 * Math.sin(this.gameTime * npc.pulseSpeed));
                
                // Set much more transparency for portal (more ghostly)
                this.ctx.globalAlpha = 0.4;
                
                // Move to portal center, apply rotation and scaling
                this.ctx.translate(npc.x, npc.y);
                this.ctx.rotate((npc.rotation * Math.PI) / 180);
                this.ctx.scale(pulseScale, pulseScale);
                
                // Draw portal sprite centered
                this.ctx.drawImage(npc.sprite, 
                                 -npc.width / 2, -npc.height / 2, 
                                 npc.width, npc.height);
                
                this.ctx.restore();
            } else {
                // Handle regular NPCs
                const npcScreenX = npc.x - npc.width / 2;
                const npcScreenY = npc.y - npc.height / 2;
                
                // Draw shadow first (behind NPC)
                this.drawShadow(npc.x, npc.y, npc.width, npc.height, 0);
                
                // Draw NPC sprite with direction support
                this.ctx.save();
                
                if (npc.direction === 'left') {
                    // Flip sprite horizontally for left-facing NPCs
                    this.ctx.translate(npc.x, npc.y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(npc.sprite, 
                                     -npc.width / 2, -npc.height / 2, 
                                     npc.width, npc.height);
                } else {
                    // Default right-facing or no flip
                    this.ctx.drawImage(npc.sprite, npcScreenX, npcScreenY, npc.width, npc.height);
                }
                
                this.ctx.restore();
                
                // Draw interaction indicator if player is close and not a portal
                const distance = Math.sqrt(
                    Math.pow(this.player.x - npc.x, 2) + 
                    Math.pow(this.player.y - npc.y, 2)
                );
                
                if (distance <= 120 && !this.npcManager.isDialogueActive()) {
                    // Draw "E" indicator above NPC
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    this.ctx.strokeStyle = 'black';
                    this.ctx.lineWidth = 2;
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.textAlign = 'center';
                    
                    const indicatorX = npc.x;
                    const indicatorY = npc.y - npc.height / 2 - 20;
                    
                    this.ctx.strokeText('E', indicatorX, indicatorY);
                    this.ctx.fillText('E', indicatorX, indicatorY);
                }
                
                // Draw spawn effect on top of everything if active
                if (npc.spawnEffect && npc.spawnEffect.active) {
                    this.drawSpawnEffect(npc);
                }
            }
        });
    }
    
    drawSpawnEffect(npc) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - npc.spawnEffect.startTime;
        const progress = Math.min(elapsedTime / npc.spawnEffect.duration, 1);
        
        if (progress >= 1) {
            // Effect is complete, remove it
            npc.spawnEffect.active = false;
            return;
        }
        
        this.ctx.save();
        
        // Create expanding light effect
        const centerX = npc.x;
        const centerY = npc.y;
        
        // Calculate current radius (expands quickly, then fades)
        const maxRadius = npc.spawnEffect.maxRadius;
        let currentRadius;
        let alpha;
        
        if (progress < 0.4) {
            // Rapid expansion phase
            const expansionProgress = progress / 0.4;
            currentRadius = maxRadius * expansionProgress;
            alpha = 0.9 * (1 - expansionProgress * 0.3); // Higher initial alpha
        } else {
            // Fade out phase
            const fadeProgress = (progress - 0.4) / 0.6;
            currentRadius = maxRadius;
            alpha = 0.6 * (1 - fadeProgress); // Higher fade alpha
        }
        
        // Create radial gradient for the light effect
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, currentRadius
        );
        
        // Bright golden center fading to blue-white edges
        gradient.addColorStop(0, `rgba(255, 255, 100, ${alpha})`);
        gradient.addColorStop(0.2, `rgba(255, 255, 255, ${alpha * 0.8})`);
        gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.6})`);
        gradient.addColorStop(0.8, `rgba(150, 200, 255, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        // Draw the expanding light circle
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add sparkle effect around the edge
        if (progress < 0.7) {
            const sparkleCount = 12;
            for (let i = 0; i < sparkleCount; i++) {
                const angle = (i / sparkleCount) * Math.PI * 2 + (currentTime * 0.005);
                const sparkleRadius = currentRadius * (0.7 + Math.sin(currentTime * 0.01 + i) * 0.2);
                const sparkleX = centerX + Math.cos(angle) * sparkleRadius;
                const sparkleY = centerY + Math.sin(angle) * sparkleRadius;
                
                const sparkleSize = 2 + Math.sin(currentTime * 0.01 + i) * 2;
                this.ctx.fillStyle = `rgba(255, 255, 150, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }
    
    drawDialogue() {
        const dialogueState = this.npcManager.getDialogueState();
        if (!dialogueState.currentNPC) return;
        
        // Calculate NPC position in screen coordinates
        const npcScreenX = dialogueState.currentNPC.x - this.camera.x;
        const npcScreenY = dialogueState.currentNPC.y - this.camera.y;
        
        // Speech bubble dimensions
        const padding = 15;
        const maxWidth = 300;
        const minWidth = 150;
        
        // Measure text to determine bubble size
        this.ctx.font = '16px Arial';
        const words = dialogueState.currentMessage.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Calculate word-wrapped lines
        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = this.ctx.measureText(testLine).width;
            
            if (testWidth > maxWidth - (padding * 2) && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Calculate bubble dimensions
        const lineHeight = 20;
        const bubbleHeight = (lines.length * lineHeight) + (padding * 2) + 30; // +30 for name
        
        // Find widest line without creating array
        let maxLineWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineWidth = this.ctx.measureText(lines[i]).width;
            if (lineWidth > maxLineWidth) {
                maxLineWidth = lineWidth;
            }
        }
        let bubbleWidth = Math.max(minWidth, Math.min(maxWidth, maxLineWidth + (padding * 2)));
        
        // Position above NPC's head
        const bubbleX = npcScreenX - bubbleWidth / 2;
        const bubbleY = npcScreenY - dialogueState.currentNPC.height - bubbleHeight - 20;
        
        // Ensure bubble stays on screen
        const adjustedX = Math.max(10, Math.min(this.CANVAS_WIDTH - bubbleWidth - 10, bubbleX));
        const adjustedY = Math.max(10, bubbleY);
        
        // Draw speech bubble background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        
        // Rounded rectangle for speech bubble
        this.drawRoundedRect(adjustedX, adjustedY, bubbleWidth, bubbleHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw speech bubble tail (pointing to NPC)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.strokeStyle = '#333';
        this.ctx.beginPath();
        
        const tailX = npcScreenX;
        const tailY = adjustedY + bubbleHeight;
        const tailSize = 15;
        
        // Clamp tail position to bubble width
        const clampedTailX = Math.max(adjustedX + 20, Math.min(adjustedX + bubbleWidth - 20, tailX));
        
        this.ctx.moveTo(clampedTailX, tailY);
        this.ctx.lineTo(clampedTailX - tailSize, tailY + tailSize);
        this.ctx.lineTo(clampedTailX + tailSize, tailY + tailSize);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw NPC name
        this.ctx.fillStyle = '#2C5282';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        const npcDialogueName = dialogueState.currentNPC.name || dialogueState.currentNPC.id.charAt(0).toUpperCase() + dialogueState.currentNPC.id.slice(1);
        this.ctx.fillText(npcDialogueName, adjustedX + padding, adjustedY + padding + 14);
        
        // Draw message text
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, adjustedX + padding, adjustedY + padding + 35 + (index * lineHeight));
        });
        
        // Continue indicator
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        
        const isLastMessage = dialogueState.messageIndex >= dialogueState.currentNPC.messages.length - 1;
        const continueText = isLastMessage ? 'ESC to close' : 'SPACE/ENTER to continue';
        this.ctx.fillText(continueText, adjustedX + bubbleWidth - padding, adjustedY + bubbleHeight - 8);
    }
    
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
    
    updateDebug() {
        const controlsContainer = this.debug.parentElement;
        
        if (this.gameState !== 'PLAYING' || !this.settings.showDebug) {
            controlsContainer.style.display = 'none';
            return;
        }
        
        controlsContainer.style.display = 'block';
        const speed = Math.sqrt(this.player.velocityX * this.player.velocityX + this.player.velocityY * this.player.velocityY);
        const halfWidth = this.player.width / 2;
        const halfHeight = this.player.height / 2;
        const minX = halfWidth;
        const maxX = this.currentMap.width - halfWidth;
        const minY = halfHeight;
        const maxY = this.currentMap.height - halfHeight;
        
        // FPS display with grace period status
        let fpsDisplay;
        if (this.gameState !== 'PLAYING') {
            fpsDisplay = 'FPS: Not tracking (menu/loading)';
        } else if (this.fps.graceFrames <= this.fps.graceFramesNeeded) {
            const remainingFrames = this.fps.graceFramesNeeded - this.fps.graceFrames;
            fpsDisplay = `FPS: ${this.fps.current} (Stabilizing... ${remainingFrames} frames)`;
        } else {
            fpsDisplay = `FPS: ${this.fps.current} (Min: ${this.fps.min === Infinity ? '-' : this.fps.min} | Max: ${this.fps.max})`;
        }
        
        this.debug.innerHTML = `
            ${fpsDisplay}<br>
            Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})<br>
            Player Size: ${this.player.width}x${this.player.height}<br>
            Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})<br>
            Velocity: (${this.player.velocityX.toFixed(2)}, ${this.player.velocityY.toFixed(2)})<br>
            Speed: ${speed.toFixed(2)}/${this.player.maxSpeed}<br>
            Mode: ${this.isRunning ? 'Running' : 'Walking'} (Hold SHIFT to run)<br>
            Map: ${this.currentMap.width}x${this.currentMap.height}<br>
            Boundaries: X(${minX}-${maxX}) Y(${minY}-${maxY})<br>
            Facing: ${this.player.facingRight ? 'Left' : 'Right'}<br>
            State: ${this.gameState}
        `;
    }
    
    addTestItems() {
        // Add some test items to demonstrate the inventory system
        this.inventoryManager.addItem('health_potion', 5);
        this.inventoryManager.addItem('mana_potion', 3);
        this.inventoryManager.addItem('iron_sword');
        this.inventoryManager.addItem('leather_armor');
        this.inventoryManager.addItem('iron_ore', 10);
        this.inventoryManager.addItem('magic_scroll');
        
        // Add extra gold for testing
        this.addGold(150); // Adds to the starting 100, so player will have 250 total
        
        console.log('Test items added to inventory and gold added');
    }
    
    gameLoop() {
        // Track FPS when actually playing the game
        if (this.gameState === 'PLAYING') {
            // Calculate FPS
            const currentTime = performance.now();
            const deltaTime = currentTime - this.fps.lastTime;
            this.fps.lastTime = currentTime;
            
            // Calculate current FPS (1000ms / deltaTime gives FPS)
            if (deltaTime > 0) {
                const currentFps = 1000 / deltaTime;
                this.fps.current = Math.round(currentFps);
                
                // Increment grace frame counter
                this.fps.graceFrames++;
                
                // Only update min/max after grace period
                if (this.fps.graceFrames > this.fps.graceFramesNeeded) {
                    if (currentFps < this.fps.min) {
                        this.fps.min = Math.round(currentFps);
                    }
                    if (currentFps > this.fps.max) {
                        this.fps.max = Math.round(currentFps);
                    }
                }
            }
        } else {
            // Reset grace period when not playing
            this.fps.graceFrames = 0;
            this.fps.min = Infinity;
            this.fps.max = 0;
        }
        
        // Simple performance tracking
        const frameStart = performance.now();
        
        // Calculate delta time for movement (cap at 100ms to prevent large jumps)
        const currentTime = performance.now();
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Convert to seconds, cap at 100ms
        this.lastFrameTime = currentTime;
        
        this.update(deltaTime);
        const updateTime = performance.now();
        
        this.render();
        const renderTime = performance.now();
        
        this.updateDebug();
        const debugTime = performance.now();
        
        // Log timing if frame takes too long (over 20ms = under 50fps)
        const totalFrameTime = debugTime - frameStart;
        if (totalFrameTime > 20) {
            console.log(`Slow frame: ${totalFrameTime.toFixed(2)}ms (Update: ${(updateTime-frameStart).toFixed(2)}ms, Render: ${(renderTime-updateTime).toFixed(2)}ms, Debug: ${(debugTime-renderTime).toFixed(2)}ms)`);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
