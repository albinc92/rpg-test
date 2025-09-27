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
            width: 96,
            height: 96,
            facingRight: true,
            sprite: null,
            velocityX: 0,
            velocityY: 0,
            acceleration: 0.5,
            friction: 0.8,
            maxSpeed: 2 // Will be set based on walk/run setting
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
        this.gameState = 'MAIN_MENU'; // MAIN_MENU, GAME_MENU, SETTINGS, PLAYING, PAUSED
        this.gameStarted = false; // Track if game has been started
        
        // Main menu (start of game)
        this.mainMenuOptions = ['New Game', 'Continue', 'Settings', 'Exit'];
        this.selectedMainMenuOption = 0;
        
        // In-game menu (pause menu)
        this.gameMenuOptions = ['Resume', 'Settings', 'Save Game', 'Load Game', 'Main Menu'];
        this.selectedGameMenuOption = 0;
        
        // Settings menu
        this.settingsOptions = ['Player Speed', 'Master Volume', 'BGM Volume', 'Effect Volume', 'Mute Audio', 'Back to Menu'];
        this.selectedSettingsOption = 0;
        this.previousMenuState = 'MAIN_MENU'; // Track which menu we came from
        
        // Game settings
        this.settings = {
            playerSpeed: 'Walk', // 'Walk' or 'Run'
            showDebug: true,
            masterVolume: 100,   // Overall volume multiplier (affects all sound)
            bgmVolume: 100,      // Background music volume
            effectVolume: 100,   // Sound effects volume
            audioMuted: false
        };
        
        // Speed values
        this.speedSettings = {
            'Walk': 2,
            'Run': 3
        };
        
        // Audio system
        this.audio = {
            bgm: null,
            currentTrack: null,
            menuNavigation: null,
            speechBubble: null
        };
        
        // Map system
        this.mapManager = new MapManager();
        this.maps = {}; // Maps organized by map ID (will be populated by MapManager)
        
        // NPC system
        this.npcManager = new NPCManager();
        this.npcs = {}; // NPCs organized by map ID (will be populated by NPCManager)
        
        // Save system
        this.saveSlotKey = 'rpg-game-save';
        this.settingsKey = 'rpg-game-settings';
        
        // Animation timing
        this.gameTime = 0;
        
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
        // Set canvas to full screen
        this.canvas.width = this.CANVAS_WIDTH;
        this.canvas.height = this.CANVAS_HEIGHT;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.CANVAS_WIDTH = window.innerWidth;
            this.CANVAS_HEIGHT = window.innerHeight;
            this.canvas.width = this.CANVAS_WIDTH;
            this.canvas.height = this.CANVAS_HEIGHT;
        });
    }
    
    async loadAssets() {
        // Load player sprite
        this.player.sprite = new Image();
        this.player.sprite.src = 'assets/npc/main-0.png';
        
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
            this.player.sprite.onload = resolve;
        });
    }
    
    loadAudio() {
        // Load background music
        this.audio.bgm = new Audio('assets/bgm/00.mp3');
        this.audio.bgm.loop = true;
        
        // Load menu navigation sound effect
        this.audio.menuNavigation = new Audio('assets/audio/effect/menu-navigation.mp3');
        
        // Load speech bubble sound effect
        this.audio.speechBubble = new Audio('assets/audio/effect/speech-bubble.mp3');
        
        // Set initial volumes
        this.updateAudioVolume();
        
        // Handle audio loading errors gracefully
        this.audio.bgm.onerror = () => {
            console.warn('Could not load background music');
        };
        
        this.audio.menuNavigation.onerror = () => {
            console.warn('Could not load menu navigation sound');
        };
        
        this.audio.speechBubble.onerror = () => {
            console.warn('Could not load speech bubble sound');
        };
    }
    
    playBGM() {
        if (this.audio.bgm && this.audio.currentTrack !== 'bgm') {
            this.audio.bgm.currentTime = 0;
            this.audio.bgm.play().catch(e => {
                console.warn('Could not play background music:', e);
            });
            this.audio.currentTrack = 'bgm';
        }
    }
    
    stopBGM() {
        if (this.audio.bgm) {
            this.audio.bgm.pause();
            this.audio.currentTrack = null;
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
            this.currentMapId = mapId;
            
            console.log(`Loaded map: ${mapData.name} (${mapData.width}x${mapData.height})`);
        } catch (error) {
            console.error('Failed to load map:', error);
        }
    }
    

    
    handleDialogueInput(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.npcManager.nextDialogueMessage(() => this.playSpeechBubbleSound());
        }
    }
    
    checkNPCInteraction() {
        const npc = this.npcManager.checkNearbyNPCs(this.player, this.currentMapId, 120);
        
        if (npc) {
            if (npc.type === 'teleporter') {
                this.handleTeleporter(npc);
            } else if (npc.type === 'portal') {
                // Portals are handled automatically in checkPortalCollisions
                return;
            } else {
                this.npcManager.startDialogue(npc, () => this.playSpeechBubbleSound());
            }
        }
    }
    

    
    toggleWalkRun() {
        this.settings.playerSpeed = this.settings.playerSpeed === 'Walk' ? 'Run' : 'Walk';
        this.updatePlayerSpeed();
    }
    
    updatePlayerSpeed() {
        this.player.maxSpeed = this.speedSettings[this.settings.playerSpeed];
    }
    
    checkPortalCollisions() {
        const portal = this.npcManager.checkPortalCollisions(this.player, this.currentMapId);
        
        if (portal) {
            // Automatically teleport
            this.teleportToMap(portal.targetMap, portal.targetX, portal.targetY);
        }
    }
    
    handleTeleporter(teleporter) {
        // Show teleporter dialogue first
        this.npcManager.startDialogue(teleporter, () => this.playSpeechBubbleSound());
        
        // Add teleportation confirmation after dialogue
        teleporter.onDialogueEnd = () => {
            this.showTeleportConfirmation(teleporter);
        };
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
                facingRight: this.player.facingRight
            },
            currentMapId: this.currentMapId,
            settings: { ...this.settings },
            gameStarted: this.gameStarted
        };
        
        try {
            localStorage.setItem(this.saveSlotKey, JSON.stringify(saveData));
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
            
            // Restore settings
            if (saveData.settings) {
                this.settings = { ...this.settings, ...saveData.settings };
                this.updatePlayerSpeed();
                this.updateAudioVolume();
            }
            
            // Restore game state
            this.gameStarted = saveData.gameStarted;
            
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
                    
                    // Toggle walk/run with Shift key
                    if (e.key === 'Shift') {
                        this.toggleWalkRun();
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
            case 1: // Settings
                this.previousMenuState = 'GAME_MENU';
                this.gameState = 'SETTINGS';
                this.selectedSettingsOption = 0;
                break;
            case 2: // Save Game
                if (this.saveGame()) {
                    alert('Game saved successfully!');
                } else {
                    alert('Failed to save game!');
                }
                break;
            case 3: // Load Game
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
            case 4: // Main Menu
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
            case 0: // Player Speed (Walk/Run)
                if (direction !== 0) {
                    this.settings.playerSpeed = this.settings.playerSpeed === 'Walk' ? 'Run' : 'Walk';
                    this.updatePlayerSpeed();
                    this.saveSettings();
                }
                break;
            case 1: // Master Volume
                this.settings.masterVolume = Math.max(0, Math.min(100, this.settings.masterVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 2: // BGM Volume
                this.settings.bgmVolume = Math.max(0, Math.min(100, this.settings.bgmVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 3: // Effect Volume
                this.settings.effectVolume = Math.max(0, Math.min(100, this.settings.effectVolume + (direction * 10)));
                this.updateAudioVolume();
                this.saveSettings();
                break;
            case 4: // Mute Audio
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
            case 0: // Player Speed
            case 1: // Master Volume
            case 2: // BGM Volume
            case 3: // Effect Volume
            case 4: // Mute Audio
                // These are adjusted with left/right arrows
                break;
            case 5: // Back to Menu
                this.gameState = this.previousMenuState;
                break;
        }
    }
    
    update() {
        if (this.gameState !== 'PLAYING') return;
        if (!this.currentMap.loaded) return;
        if (this.npcManager.isDialogueActive()) return; // Don't allow movement during dialogue
        
        // Update game time for animations
        this.gameTime += 0.016; // Approximate 60fps timing
        
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
        
        // Apply acceleration based on input
        if (inputX !== 0) {
            this.player.velocityX += inputX * this.player.acceleration;
        } else {
            // Apply friction when no input
            this.player.velocityX *= this.player.friction;
        }
        
        if (inputY !== 0) {
            this.player.velocityY += inputY * this.player.acceleration;
        } else {
            // Apply friction when no input
            this.player.velocityY *= this.player.friction;
        }
        
        // Clamp velocity to max speed
        const currentSpeed = Math.sqrt(this.player.velocityX * this.player.velocityX + this.player.velocityY * this.player.velocityY);
        if (currentSpeed > this.player.maxSpeed) {
            this.player.velocityX = (this.player.velocityX / currentSpeed) * this.player.maxSpeed;
            this.player.velocityY = (this.player.velocityY / currentSpeed) * this.player.maxSpeed;
        }
        
        // Stop very slow movement to prevent jitter
        if (Math.abs(this.player.velocityX) < 0.01) this.player.velocityX = 0;
        if (Math.abs(this.player.velocityY) < 0.01) this.player.velocityY = 0;
        
        // Calculate new position
        let newX = this.player.x + this.player.velocityX;
        let newY = this.player.y + this.player.velocityY;
        
        // Calculate sprite boundaries
        const halfWidth = this.player.width / 2;
        const halfHeight = this.player.height / 2;
        const minX = halfWidth;
        const maxX = this.currentMap.width - halfWidth;
        const minY = halfHeight;
        const maxY = this.currentMap.height - halfHeight;
        
        // Check boundaries and stop velocity if hitting them
        if (newX < minX) {
            console.log(`Hit left boundary: newX=${newX}, minX=${minX}`);
            newX = minX;
            this.player.velocityX = 0;
        } else if (newX > maxX) {
            console.log(`Hit right boundary: newX=${newX}, maxX=${maxX}`);
            newX = maxX;
            this.player.velocityX = 0;
        }
        
        if (newY < minY) {
            console.log(`Hit top boundary: newY=${newY}, minY=${minY}`);
            newY = minY;
            this.player.velocityY = 0;
        } else if (newY > maxY) {
            console.log(`Hit bottom boundary: newY=${newY}, maxY=${maxY}`);
            newY = maxY;
            this.player.velocityY = 0;
        }
        
        // Update player position
        this.player.x = newX;
        this.player.y = newY;
        
        // Check for portal collisions
        this.checkPortalCollisions();
        
        // Update camera (Zelda-style camera system)
        this.updateCamera();
        
        // Update debug info
        this.updateDebug();
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
        
        // Draw map background (stretched to fit map dimensions)
        this.ctx.drawImage(this.currentMap.image, 0, 0, this.currentMap.width, this.currentMap.height);
        
        // Draw NPCs
        this.drawNPCs();
        
        // Draw player
        this.drawPlayer();
        
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
            
            // Highlight selected option
            if (index === this.selectedMainMenuOption) {
                this.ctx.fillStyle = isDisabled ? '#666666' : '#FFD700'; // Gold color or gray if disabled
                this.ctx.fillText('> ' + option + ' <', this.CANVAS_WIDTH / 2, y);
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
            
            // Highlight selected option
            if (index === this.selectedGameMenuOption) {
                this.ctx.fillStyle = '#FFD700'; // Gold color
                this.ctx.fillText('> ' + option + ' <', this.CANVAS_WIDTH / 2, y);
            } else {
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(option, this.CANVAS_WIDTH / 2, y);
            }
        });
        
        // Draw instructions
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '16px Arial';
        const instructionsY = this.CANVAS_HEIGHT * 0.75;
        this.ctx.fillText('Use W/S or Arrow Keys to navigate', this.CANVAS_WIDTH / 2, instructionsY);
        this.ctx.fillText('Press ENTER or SPACE to select, ESC to return', this.CANVAS_WIDTH / 2, instructionsY + 25);
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
                case 0: // Player Speed
                    valueText = `: ${this.settings.playerSpeed}`;
                    break;
                case 1: // Master Volume
                    valueText = `: ${this.settings.masterVolume}%`;
                    break;
                case 2: // BGM Volume
                    valueText = `: ${this.settings.bgmVolume}%`;
                    break;
                case 3: // Effect Volume
                    valueText = `: ${this.settings.effectVolume}%`;
                    break;
                case 4: // Mute Audio
                    valueText = `: ${this.settings.audioMuted ? 'ON' : 'OFF'}`;
                    break;
            }
            
            // Highlight selected option
            if (index === this.selectedSettingsOption) {
                this.ctx.fillStyle = '#FFD700'; // Gold color
                this.ctx.fillText('> ' + displayText + valueText + ' <', this.CANVAS_WIDTH / 2, y);
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
    
    drawShadow(x, y, width, height) {
        // Draw a circular shadow underneath characters
        const shadowRadius = Math.min(width, height) * 0.3; // Shadow size relative to character
        const shadowX = x;
        const shadowY = y + height * 0.4; // Position shadow slightly below center of character
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3; // Make shadow transparent
        this.ctx.fillStyle = 'black';
        
        // Create elliptical shadow (squashed circle)
        this.ctx.beginPath();
        this.ctx.ellipse(shadowX, shadowY, shadowRadius, shadowRadius * 0.5, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
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
                this.drawShadow(npc.x, npc.y, npc.width, npc.height);
                
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
            }
        });
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
        let bubbleWidth = Math.max(minWidth, Math.min(maxWidth, 
            Math.max(...lines.map(line => this.ctx.measureText(line).width)) + (padding * 2)));
        
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
        this.ctx.fillText(dialogueState.currentNPC.id.toUpperCase(), adjustedX + padding, adjustedY + padding + 14);
        
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
        
        this.debug.innerHTML = `
            Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})<br>
            Player Size: ${this.player.width}x${this.player.height}<br>
            Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})<br>
            Velocity: (${this.player.velocityX.toFixed(2)}, ${this.player.velocityY.toFixed(2)})<br>
            Speed: ${speed.toFixed(2)}/${this.player.maxSpeed}<br>
            Mode: ${this.settings.playerSpeed} (SHIFT to toggle)<br>
            Map: ${this.currentMap.width}x${this.currentMap.height}<br>
            Boundaries: X(${minX}-${maxX}) Y(${minY}-${maxY})<br>
            Facing: ${this.player.facingRight ? 'Left' : 'Right'}<br>
            State: ${this.gameState}
        `;
    }
    
    gameLoop() {
        this.update();
        this.render();
        this.updateDebug();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
