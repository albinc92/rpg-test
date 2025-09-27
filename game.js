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
            image: null,
            width: 0,
            height: 0,
            loaded: false
        };
        
        // Input handling
        this.keys = {};
        
        // Game state management
        this.gameState = 'MENU'; // MENU, SETTINGS, PLAYING, PAUSED
        this.gameStarted = false; // Track if game has been started
        this.menuOptions = ['Resume', 'Settings', 'Exit'];
        this.selectedMenuOption = 0;
        
        // Settings menu
        this.settingsOptions = ['Player Speed', 'Show Debug', 'Master Volume', 'Mute Audio', 'Back to Menu'];
        this.selectedSettingsOption = 0;
        
        // Game settings
        this.settings = {
            playerSpeed: 'Walk', // 'Walk' or 'Run'
            showDebug: true,
            masterVolume: 50,
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
        
        // NPC system
        this.npcs = [];
        this.dialogue = {
            active: false,
            currentNPC: null,
            currentMessage: '',
            messageIndex: 0
        };
        
        // Initialize the game
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        await this.loadAssets();
        this.setupEventListeners();
        this.updatePlayerSpeed(); // Initialize player speed based on settings
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
        
        // Load map
        this.currentMap.image = new Image();
        this.currentMap.image.src = 'assets/maps/0-0.png';
        
        // Load background music
        this.loadAudio();
        
        // Initialize NPCs
        this.initializeNPCs();
        
        // Wait for all assets to load
        const loadPromises = [
            new Promise(resolve => {
                this.player.sprite.onload = resolve;
            }),
            new Promise(resolve => {
                this.currentMap.image.onload = () => {
                    // Set map dimensions based on image
                    this.currentMap.width = this.currentMap.image.width;
                    this.currentMap.height = this.currentMap.image.height;
                    this.currentMap.loaded = true;
                    
                    // Position player in center of map initially
                    this.player.x = this.currentMap.width / 2;
                    this.player.y = this.currentMap.height / 2;
                    
                    resolve();
                };
            })
        ];
        
        // Add NPC loading promises
        this.npcs.forEach(npc => {
            loadPromises.push(new Promise(resolve => {
                npc.sprite.onload = resolve;
            }));
        });
        
        await Promise.all(loadPromises);
    }
    
    loadAudio() {
        // Load background music
        this.audio.bgm = new Audio('assets/bgm/00.mp3');
        this.audio.bgm.loop = true;
        this.audio.bgm.volume = this.settings.masterVolume / 100;
        
        // Load menu navigation sound effect
        this.audio.menuNavigation = new Audio('assets/audio/effect/menu-navigation.mp3');
        this.audio.menuNavigation.volume = this.settings.masterVolume / 100;
        
        // Load speech bubble sound effect
        this.audio.speechBubble = new Audio('assets/audio/effect/speech-bubble.mp3');
        this.audio.speechBubble.volume = this.settings.masterVolume / 100;
        
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
        if (this.audio.bgm) {
            this.audio.bgm.volume = this.settings.audioMuted ? 0 : (this.settings.masterVolume / 100);
        }
        if (this.audio.menuNavigation) {
            this.audio.menuNavigation.volume = this.settings.audioMuted ? 0 : (this.settings.masterVolume / 100);
        }
        if (this.audio.speechBubble) {
            this.audio.speechBubble.volume = this.settings.audioMuted ? 0 : (this.settings.masterVolume / 100);
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
    
    initializeNPCs() {
        // Create the sage NPC
        const sage = {
            id: 'sage',
            x: 1000, // Position on map
            y: 600,
            width: 96,
            height: 96,
            sprite: new Image(),
            messages: [
                "Greetings, young adventurer!",
                "Welcome to this mystical realm.",
                "Press SPACE or ENTER to continue dialogue.",
                "Use WASD to move around the world.",
                "May your journey be filled with wonder!"
            ]
        };
        sage.sprite.src = 'assets/npc/sage-0.png';
        
        this.npcs.push(sage);
    }
    
    handleDialogueInput(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.nextDialogueMessage();
        }
    }
    
    checkNPCInteraction() {
        const interactionDistance = 120; // Distance for interaction
        
        for (let npc of this.npcs) {
            const distance = Math.sqrt(
                Math.pow(this.player.x - npc.x, 2) + 
                Math.pow(this.player.y - npc.y, 2)
            );
            
            if (distance <= interactionDistance) {
                this.startDialogue(npc);
                break;
            }
        }
    }
    
    startDialogue(npc) {
        this.dialogue.active = true;
        this.dialogue.currentNPC = npc;
        this.dialogue.messageIndex = 0;
        this.dialogue.currentMessage = npc.messages[0];
        this.playSpeechBubbleSound(); // Play sound when dialogue starts
    }
    
    nextDialogueMessage() {
        this.dialogue.messageIndex++;
        
        if (this.dialogue.messageIndex >= this.dialogue.currentNPC.messages.length) {
            this.endDialogue();
        } else {
            this.dialogue.currentMessage = this.dialogue.currentNPC.messages[this.dialogue.messageIndex];
            this.playSpeechBubbleSound(); // Play sound when advancing dialogue
        }
    }
    
    endDialogue() {
        this.dialogue.active = false;
        this.dialogue.currentNPC = null;
        this.dialogue.currentMessage = '';
        this.dialogue.messageIndex = 0;
    }
    
    toggleWalkRun() {
        this.settings.playerSpeed = this.settings.playerSpeed === 'Walk' ? 'Run' : 'Walk';
        this.updatePlayerSpeed();
    }
    
    updatePlayerSpeed() {
        this.player.maxSpeed = this.speedSettings[this.settings.playerSpeed];
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'MENU') {
                this.handleMenuInput(e);
            } else if (this.gameState === 'SETTINGS') {
                this.handleSettingsInput(e);
            } else if (this.gameState === 'PLAYING') {
                if (this.dialogue.active) {
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
                
                // ESC to return to menu (works even during dialogue)
                if (e.key === 'Escape') {
                    if (this.dialogue.active) {
                        this.endDialogue();
                    } else {
                        this.gameState = 'MENU';
                        this.stopBGM(); // Stop music when returning to menu
                    }
                }
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
    
    handleMenuInput(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedMenuOption > 0) {
                    this.selectedMenuOption = Math.max(0, this.selectedMenuOption - 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedMenuOption < this.menuOptions.length - 1) {
                    this.selectedMenuOption = Math.min(this.menuOptions.length - 1, this.selectedMenuOption + 1);
                    this.playMenuNavigationSound();
                }
                break;
            case 'Enter':
            case ' ':
                this.selectMenuOption();
                break;
            case 'Escape':
                // If game has been started, ESC returns to game
                if (this.gameStarted) {
                    this.gameState = 'PLAYING';
                    this.playBGM();
                }
                break;
        }
    }
    
    selectMenuOption() {
        switch(this.selectedMenuOption) {
            case 0: // Resume
                this.gameState = 'PLAYING';
                this.gameStarted = true; // Mark game as started
                this.playBGM(); // Start background music when game starts
                break;
            case 1: // Settings
                this.gameState = 'SETTINGS';
                this.selectedSettingsOption = 0;
                break;
            case 2: // Exit
                // For web games, we can't really exit, so maybe return to menu or show a message
                if (confirm('Are you sure you want to exit?')) {
                    window.close();
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
                this.gameState = 'MENU';
                break;
        }
    }
    
    adjustSetting(direction) {
        switch(this.selectedSettingsOption) {
            case 0: // Player Speed (Walk/Run)
                if (direction !== 0) {
                    this.settings.playerSpeed = this.settings.playerSpeed === 'Walk' ? 'Run' : 'Walk';
                    this.updatePlayerSpeed();
                }
                break;
            case 1: // Show Debug
                if (direction !== 0) {
                    this.settings.showDebug = !this.settings.showDebug;
                }
                break;
            case 2: // Master Volume
                this.settings.masterVolume = Math.max(0, Math.min(100, this.settings.masterVolume + (direction * 10)));
                this.updateAudioVolume();
                break;
            case 3: // Mute Audio
                if (direction !== 0) {
                    this.settings.audioMuted = !this.settings.audioMuted;
                    this.updateAudioVolume();
                }
                break;
        }
    }
    
    selectSettingsOption() {
        switch(this.selectedSettingsOption) {
            case 0: // Player Speed
            case 1: // Show Debug
            case 2: // Master Volume
            case 3: // Mute Audio
                // These are adjusted with left/right arrows
                break;
            case 4: // Back to Menu
                this.gameState = 'MENU';
                break;
        }
    }
    
    update() {
        if (this.gameState !== 'PLAYING') return;
        if (!this.currentMap.loaded) return;
        if (this.dialogue.active) return; // Don't allow movement during dialogue
        
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
        
        if (this.gameState === 'MENU') {
            this.renderMenu();
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
        if (this.dialogue.active) {
            this.drawDialogue();
        }
    }
    
    renderMenu() {
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        const titleY = this.CANVAS_HEIGHT * 0.3;
        this.ctx.fillText('RPG Adventure', this.CANVAS_WIDTH / 2, titleY);
        
        // Draw menu options
        this.ctx.font = '24px Arial';
        const startY = this.CANVAS_HEIGHT * 0.5;
        const spacing = 50;
        
        this.menuOptions.forEach((option, index) => {
            const y = startY + (index * spacing);
            
            // Highlight selected option
            if (index === this.selectedMenuOption) {
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
        const instructionsY = this.CANVAS_HEIGHT * 0.8;
        this.ctx.fillText('Use W/S or Arrow Keys to navigate', this.CANVAS_WIDTH / 2, instructionsY);
        this.ctx.fillText('Press ENTER or SPACE to select', this.CANVAS_WIDTH / 2, instructionsY + 25);
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
        const startY = this.CANVAS_HEIGHT * 0.4;
        const spacing = 60;
        
        this.settingsOptions.forEach((option, index) => {
            const y = startY + (index * spacing);
            let displayText = option;
            let valueText = '';
            
            // Add current values for settings
            switch(index) {
                case 0: // Player Speed
                    valueText = `: ${this.settings.playerSpeed}`;
                    break;
                case 1: // Show Debug
                    valueText = `: ${this.settings.showDebug ? 'ON' : 'OFF'}`;
                    break;
                case 2: // Master Volume
                    valueText = `: ${this.settings.masterVolume}%`;
                    break;
                case 3: // Mute Audio
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
        const instructionsY = this.CANVAS_HEIGHT * 0.8;
        this.ctx.fillText('Use W/S to navigate, A/D to adjust values', this.CANVAS_WIDTH / 2, instructionsY);
        this.ctx.fillText('Press ENTER to select, ESC to go back', this.CANVAS_WIDTH / 2, instructionsY + 25);
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
        this.npcs.forEach(npc => {
            const npcScreenX = npc.x - npc.width / 2;
            const npcScreenY = npc.y - npc.height / 2;
            
            // Draw shadow first (behind NPC)
            this.drawShadow(npc.x, npc.y, npc.width, npc.height);
            
            // Draw NPC sprite
            this.ctx.drawImage(npc.sprite, npcScreenX, npcScreenY, npc.width, npc.height);
            
            // Draw interaction indicator if player is close
            const distance = Math.sqrt(
                Math.pow(this.player.x - npc.x, 2) + 
                Math.pow(this.player.y - npc.y, 2)
            );
            
            if (distance <= 120 && !this.dialogue.active) {
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
        });
    }
    
    drawDialogue() {
        if (!this.dialogue.currentNPC) return;
        
        // Calculate NPC position in screen coordinates
        const npcScreenX = this.dialogue.currentNPC.x - this.camera.x;
        const npcScreenY = this.dialogue.currentNPC.y - this.camera.y;
        
        // Speech bubble dimensions
        const padding = 15;
        const maxWidth = 300;
        const minWidth = 150;
        
        // Measure text to determine bubble size
        this.ctx.font = '16px Arial';
        const words = this.dialogue.currentMessage.split(' ');
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
        const bubbleY = npcScreenY - this.dialogue.currentNPC.height - bubbleHeight - 20;
        
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
        this.ctx.fillText(this.dialogue.currentNPC.id.toUpperCase(), adjustedX + padding, adjustedY + padding + 14);
        
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
        
        const isLastMessage = this.dialogue.messageIndex >= this.dialogue.currentNPC.messages.length - 1;
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
        if (this.gameState === 'MENU' || this.gameState === 'SETTINGS' || !this.settings.showDebug) {
            this.debug.style.display = 'none';
            return;
        }
        
        this.debug.style.display = 'block';
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
