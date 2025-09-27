/**
 * GameScene Class
 * Main game scene that sets up the RPG world
 */
class GameScene extends Scene {
    constructor() {
        super('MainGame');
        
        this.player = null;
        this.worldSize = 50; // 50x50 tile world
        this.tiles = new Map();
        
        // World generation settings
        this.noiseScale = 0.1;
        this.treeChance = 0.15;
        this.rockChance = 0.08;
        this.crystalChance = 0.02;
    }

    init() {
        super.init();
        
        // Create the world
        this.generateWorld();
        
        // Create player
        this.createPlayer();
        
        // Set up camera to follow player
        this.setupCamera();
        
        // Add some debug controls
        this.setupDebugControls();
        
        console.log('Game Scene initialized with isometric RPG world');
    }

    generateWorld() {
        console.log('Generating world...');
        
        // Generate tiles first
        this.generateTiles();
        
        // Add obstacles
        this.generateObstacles();
        
        console.log(`Generated world with ${this.tiles.size} tiles and ${this.gameObjects.length} objects`);
    }

    generateTiles() {
        const centerX = this.worldSize / 2;
        const centerY = this.worldSize / 2;
        
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                // Distance from center for biome generation
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                // Simple noise function for terrain variation
                const noise = this.simpleNoise(x * this.noiseScale, y * this.noiseScale);
                
                let tileType = 'grass';
                
                // Determine tile type based on noise and distance
                if (noise > 0.6) {
                    tileType = 'stone';
                } else if (noise > 0.3 && distanceFromCenter > this.worldSize * 0.3) {
                    tileType = 'dirt';
                } else if (noise < -0.4) {
                    tileType = 'water';
                } else if (noise < -0.2 && distanceFromCenter < this.worldSize * 0.2) {
                    tileType = 'sand';
                }
                
                // Convert grid coordinates to world coordinates
                const worldX = (x - centerX) * 32;
                const worldY = (y - centerY) * 32;
                
                const tile = new Tile(worldX, worldY, tileType);
                const key = `${x}_${y}`;
                this.tiles.set(key, tile);
                
                this.addGameObject(tile);
            }
        }
    }

    generateObstacles() {
        const centerX = this.worldSize / 2;
        const centerY = this.worldSize / 2;
        
        for (let x = 1; x < this.worldSize - 1; x++) {
            for (let y = 1; y < this.worldSize - 1; y++) {
                const tileKey = `${x}_${y}`;
                const tile = this.tiles.get(tileKey);
                
                if (!tile || !tile.walkable) continue;
                
                // Don't spawn obstacles too close to center (player spawn)
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                if (distanceFromCenter < 3) continue;
                
                const random = Math.random();
                const worldX = (x - centerX) * 32;
                const worldY = (y - centerY) * 32;
                
                let obstacle = null;
                
                // Generate obstacles based on tile type and randomness
                if (tile.tileType === 'grass') {
                    if (random < this.treeChance) {
                        obstacle = Obstacle.createTree(worldX, worldY);
                    } else if (random < this.treeChance + this.rockChance) {
                        obstacle = Obstacle.createRock(worldX, worldY);
                    }
                } else if (tile.tileType === 'dirt') {
                    if (random < this.rockChance * 2) {
                        obstacle = Obstacle.createRock(worldX, worldY);
                    } else if (random < this.rockChance * 2 + 0.05) {
                        obstacle = new Obstacle(worldX, worldY, 'crate');
                    }
                } else if (tile.tileType === 'stone') {
                    if (random < this.crystalChance) {
                        obstacle = Obstacle.createCrystal(worldX, worldY);
                    }
                }
                
                if (obstacle) {
                    this.addGameObject(obstacle);
                }
            }
        }
    }

    createPlayer() {
        // Spawn player at the center of the world
        this.player = new Player(0, 0);
        this.addGameObject(this.player);
        
        console.log('Player created at world center');
    }

    setupCamera() {
        if (this.engine && this.engine.camera && this.player) {
            // Follow the player statically (no smoothing)
            this.engine.camera.follow(this.player);
            this.engine.camera.setFollowDeadzone(new Vector2(0, 0)); // No deadzone for static following
            this.engine.camera.smoothing = false; // Disable smoothing for instant following
            
            // Set initial camera position
            this.engine.camera.setPosition(this.player.position);
            
            // Set world bounds
            const padding = 200;
            const worldBounds = {
                x: -this.worldSize * 16 - padding,
                y: -this.worldSize * 16 - padding,
                width: this.worldSize * 32 + padding * 2,
                height: this.worldSize * 32 + padding * 2
            };
            this.engine.camera.setBounds(worldBounds);
        }
    }

    setupDebugControls() {
        // Add keyboard shortcuts for debugging
        document.addEventListener('keydown', (e) => {
            if (!this.engine) return;
            
            switch (e.code) {
                case 'KeyG':
                    // Toggle grid
                    this.engine.renderer.setShowGrid(!this.engine.renderer.showGrid);
                    console.log('Grid toggled');
                    break;
                    
                case 'KeyC':
                    // Toggle colliders
                    this.engine.renderer.setShowColliders(!this.engine.renderer.showColliders);
                    console.log('Colliders toggled');
                    break;
                    
                case 'KeyO':
                    // Toggle origins
                    this.engine.renderer.setShowOrigins(!this.engine.renderer.showOrigins);
                    console.log('Origins toggled');
                    break;
                    
                case 'KeyR':
                    // Reset camera
                    if (this.player) {
                        this.engine.camera.setPosition(this.player.position);
                        this.engine.camera.setZoom(1.0);
                    }
                    console.log('Camera reset');
                    break;
                    
                case 'KeyP':
                    // Pause/unpause
                    if (this.engine.running) {
                        this.engine.stop();
                        console.log('Game paused');
                    } else {
                        this.engine.start();
                        console.log('Game resumed');
                    }
                    break;
                    
                case 'KeyX':
                    // Stop camera shake (emergency fix)
                    if (this.engine.camera) {
                        this.engine.camera.stopShake();
                        console.log('Camera shake stopped');
                    }
                    break;
            }
        });
        
        // Mouse wheel for zoom
        this.engine.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
            this.engine.camera.adjustZoom(zoomDelta);
        });
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update physics
        if (this.engine && this.engine.physics) {
            this.engine.physics.update(this.gameObjects, deltaTime);
        }
        
        // Check for player interactions with world
        this.checkPlayerInteractions();
        
        // Update world-specific logic
        this.updateWorld(deltaTime);
    }

    checkPlayerInteractions() {
        if (!this.player) return;
        
        // Check if player is on special tiles
        const playerTilePos = this.worldToTileCoordinates(this.player.position);
        const tileKey = `${playerTilePos.x}_${playerTilePos.y}`;
        const currentTile = this.tiles.get(tileKey);
        
        if (currentTile) {
            if (currentTile.tileType === 'water' && this.player.health > 0) {
                // Player is in water - take damage or handle swimming
                this.player.takeDamage(5 * this.engine.deltaTime); // Slow damage
            } else if (currentTile.tileType === 'lava') {
                // Lava damage
                this.player.takeDamage(20 * this.engine.deltaTime);
            }
        }
    }

    updateWorld(deltaTime) {
        // Add any world-specific updates here
        // For example: day/night cycle, weather, spawning, etc.
    }

    render(renderer) {
        // Render grid first (if enabled)
        renderer.drawGrid();
        
        // Render all game objects (sorted by depth in Scene.render)
        super.render(renderer);
        
        // Render UI elements
        this.renderUI(renderer);
    }

    renderUI(renderer) {
        // Render minimap (simple version)
        this.renderMinimap(renderer);
    }

    renderMinimap(renderer) {
        if (!this.player) return;
        
        const minimapSize = 120;
        const minimapX = renderer.canvas.width - minimapSize - 10;
        const minimapY = 10;
        const scale = minimapSize / (this.worldSize * 32);
        
        renderer.ctx.save();
        
        // Minimap background
        renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        renderer.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Minimap border
        renderer.ctx.strokeStyle = '#ffffff';
        renderer.ctx.lineWidth = 2;
        renderer.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Draw world overview
        const centerX = this.worldSize / 2;
        const centerY = this.worldSize / 2;
        
        for (const [key, tile] of this.tiles) {
            const [x, y] = key.split('_').map(Number);
            const screenX = minimapX + ((x - centerX) * scale * 32) + minimapSize / 2;
            const screenY = minimapY + ((y - centerY) * scale * 32) + minimapSize / 2;
            
            if (screenX >= minimapX && screenX <= minimapX + minimapSize &&
                screenY >= minimapY && screenY <= minimapY + minimapSize) {
                
                let color = '#4CAF50'; // grass
                if (tile.tileType === 'water') color = '#2196F3';
                else if (tile.tileType === 'stone') color = '#757575';
                else if (tile.tileType === 'dirt') color = '#8D6E63';
                else if (tile.tileType === 'sand') color = '#FFC107';
                
                renderer.ctx.fillStyle = color;
                renderer.ctx.fillRect(screenX, screenY, Math.max(1, scale * 32), Math.max(1, scale * 32));
            }
        }
        
        // Draw player position
        const playerScreenX = minimapX + (this.player.position.x * scale) + minimapSize / 2;
        const playerScreenY = minimapY + (this.player.position.y * scale) + minimapSize / 2;
        
        renderer.ctx.fillStyle = '#FF0000';
        renderer.ctx.beginPath();
        renderer.ctx.arc(playerScreenX, playerScreenY, 3, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        renderer.ctx.restore();
    }

    // Utility methods
    worldToTileCoordinates(worldPos) {
        const centerX = this.worldSize / 2;
        const centerY = this.worldSize / 2;
        
        const tileX = Math.floor(worldPos.x / 32) + centerX;
        const tileY = Math.floor(worldPos.y / 32) + centerY;
        
        return new Vector2(tileX, tileY);
    }

    getTileAt(worldPos) {
        const tilePos = this.worldToTileCoordinates(worldPos);
        const key = `${tilePos.x}_${tilePos.y}`;
        return this.tiles.get(key);
    }

    simpleNoise(x, y) {
        // Simple pseudo-random noise function
        let value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (value - Math.floor(value)) * 2 - 1; // Normalize to [-1, 1]
    }

    // Spawning methods
    spawnObstacle(type, position) {
        const obstacle = new Obstacle(position.x, position.y, type);
        this.addGameObject(obstacle);
        return obstacle;
    }

    spawnTree(position) {
        return this.spawnObstacle('tree', position);
    }

    spawnRock(position) {
        return this.spawnObstacle('rock', position);
    }

    // Cleanup
    destroy() {
        super.destroy();
        this.tiles.clear();
        this.player = null;
    }
}
