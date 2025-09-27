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
            maxSpeed: 3
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
        this.setupCanvas();
        await this.loadAssets();
        this.setupEventListeners();
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
        const newX = this.player.x + this.player.velocityX;
        const newY = this.player.y + this.player.velocityY;
        
        // Check map boundaries and update position
        this.player.x = Math.max(this.player.width / 2, 
                        Math.min(this.currentMap.width - this.player.width / 2, newX));
        this.player.y = Math.max(this.player.height / 2, 
                        Math.min(this.currentMap.height - this.player.height / 2, newY));
        
        // Stop velocity if hitting boundaries
        if (this.player.x <= this.player.width / 2 || this.player.x >= this.currentMap.width - this.player.width / 2) {
            this.player.velocityX = 0;
        }
        if (this.player.y <= this.player.height / 2 || this.player.y >= this.currentMap.height - this.player.height / 2) {
            this.player.velocityY = 0;
        }
        
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
        const speed = Math.sqrt(this.player.velocityX * this.player.velocityX + this.player.velocityY * this.player.velocityY);
        this.debug.innerHTML = `
            Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})<br>
            Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})<br>
            Velocity: (${this.player.velocityX.toFixed(2)}, ${this.player.velocityY.toFixed(2)})<br>
            Speed: ${speed.toFixed(2)}/${this.player.maxSpeed}<br>
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
