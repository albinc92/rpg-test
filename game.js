class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.debug = document.getElementById('debug');
        
        // Game settings
        this.CANVAS_WIDTH = 800;
        this.CANVAS_HEIGHT = 600;
        this.PLAYER_SPEED = 3;
        
        // Player properties
        this.player = {
            x: 400, // Start in center of canvas
            y: 300,
            width: 32,
            height: 32,
            facingRight: true,
            sprite: null
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
        
        // Initialize the game
        this.init();
    }
    
    async init() {
        await this.loadAssets();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    async loadAssets() {
        // Load player sprite
        this.player.sprite = new Image();
        this.player.sprite.src = 'assets/npc/main-0.png';
        
        // Load map
        this.currentMap.image = new Image();
        this.currentMap.image.src = 'assets/maps/0-0.png';
        
        // Wait for both images to load
        await Promise.all([
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
        ]);
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Also handle arrow keys
            if (e.key === 'ArrowUp') this.keys['w'] = true;
            if (e.key === 'ArrowDown') this.keys['s'] = true;
            if (e.key === 'ArrowLeft') this.keys['a'] = true;
            if (e.key === 'ArrowRight') this.keys['d'] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            // Also handle arrow keys
            if (e.key === 'ArrowUp') this.keys['w'] = false;
            if (e.key === 'ArrowDown') this.keys['s'] = false;
            if (e.key === 'ArrowLeft') this.keys['a'] = false;
            if (e.key === 'ArrowRight') this.keys['d'] = false;
        });
    }
    
    update() {
        if (!this.currentMap.loaded) return;
        
        // Store previous position
        const prevX = this.player.x;
        const prevY = this.player.y;
        
        // Handle movement input
        let deltaX = 0;
        let deltaY = 0;
        
        if (this.keys['w']) deltaY -= this.PLAYER_SPEED;
        if (this.keys['s']) deltaY += this.PLAYER_SPEED;
        if (this.keys['a']) {
            deltaX -= this.PLAYER_SPEED;
            this.player.facingRight = true;
        }
        if (this.keys['d']) {
            deltaX += this.PLAYER_SPEED;
            this.player.facingRight = false;
        }
        
        // Normalize diagonal movement
        if (deltaX !== 0 && deltaY !== 0) {
            deltaX *= 0.707; // 1/sqrt(2)
            deltaY *= 0.707;
        }
        
        // Calculate new position
        const newX = this.player.x + deltaX;
        const newY = this.player.y + deltaY;
        
        // Check map boundaries and update position
        this.player.x = Math.max(this.player.width / 2, 
                        Math.min(this.currentMap.width - this.player.width / 2, newX));
        this.player.y = Math.max(this.player.height / 2, 
                        Math.min(this.currentMap.height - this.player.height / 2, newY));
        
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
        const minCameraX = 0;
        const maxCameraX = Math.max(0, this.currentMap.width - this.CANVAS_WIDTH);
        const minCameraY = 0;
        const maxCameraY = Math.max(0, this.currentMap.height - this.CANVAS_HEIGHT);
        
        // Clamp camera to map boundaries
        this.camera.x = Math.max(minCameraX, Math.min(maxCameraX, idealCameraX));
        this.camera.y = Math.max(minCameraY, Math.min(maxCameraY, idealCameraY));
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
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
        
        // Draw player
        this.drawPlayer();
        
        // Restore context
        this.ctx.restore();
    }
    
    drawPlayer() {
        const playerScreenX = this.player.x - this.player.width / 2;
        const playerScreenY = this.player.y - this.player.height / 2;
        
        this.ctx.save();
        
        // Handle horizontal flipping
        if (!this.player.facingRight) {
            this.ctx.translate(this.player.x + this.player.width / 2, playerScreenY);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.player.sprite, 
                             -this.player.width / 2, 0, 
                             this.player.width, this.player.height);
        } else {
            this.ctx.drawImage(this.player.sprite, 
                             playerScreenX, playerScreenY, 
                             this.player.width, this.player.height);
        }
        
        this.ctx.restore();
    }
    
    updateDebug() {
        this.debug.innerHTML = `
            Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})<br>
            Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})<br>
            Map: ${this.currentMap.width}x${this.currentMap.height}<br>
            Facing: ${this.player.facingRight ? 'Right' : 'Left'}
        `;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
