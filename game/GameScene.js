/**
 * GameScene Class
 * Main game scene that sets up the RPG world
 */
class GameScene extends Scene {
    constructor() {
        super('MainGame');
        
        this.player = null;
        this.mapManager = null;
        this.currentMap = null;
        
        // Map settings
        this.mapWidth = 800;  // Map width in pixels
        this.mapHeight = 600; // Map height in pixels
    }

    init() {
        super.init();
        
        // Initialize map system
        this.initializeMapSystem();
        
        // Create player
        this.createPlayer();
        
        // Set up camera to follow player
        this.setupCamera();
        
        // Add some debug controls
        this.setupDebugControls();
        
        console.log('Game Scene initialized with map-based system like Zelda');
    }

    initializeMapSystem() {
        console.log('Initializing map system...');
        
        // Create map manager
        this.mapManager = new MapManager(this);
        
        // Create initial maps
        this.createMaps();
        
        // Start on the first map
        this.mapManager.switchToMap('start', new Vector2(0, 0));
        
        console.log('Map system initialized');
    }

    createMaps() {
        // Create starting map
        const startMap = this.mapManager.createMap('start', this.mapWidth, this.mapHeight);
        
        // Add some obstacles to the start map
        startMap.addObstacle(Obstacle.createTree(100, 50));
        startMap.addObstacle(Obstacle.createRock(-100, -50));
        startMap.addObstacle(Obstacle.createCrate(150, -100));
        startMap.addObstacle(Obstacle.createCrystal(-150, 100));
        
        // Create a second map for testing
        const secondMap = this.mapManager.createMap('forest', this.mapWidth, this.mapHeight);
        secondMap.addObstacle(Obstacle.createTree(0, 100));
        secondMap.addObstacle(Obstacle.createTree(-50, 150));
        secondMap.addObstacle(Obstacle.createTree(50, 150));
        
        console.log('Created maps: start, forest');
    }



    createPlayer() {
        // Spawn player at the center of the world
        this.player = new Player(0, 0);
        this.addGameObject(this.player);
        
        console.log('Player created at world center');
    }

    setupCamera() {
        if (this.engine && this.engine.camera && this.player) {
            // Enable static following for Zelda-style camera
            this.engine.camera.setStaticFollow(true);
            
            // Set initial camera position to center on player
            this.engine.camera.setPosition(this.player.position);
            
            // Follow the player statically (locked to player position)
            this.engine.camera.follow(this.player);
            
            // Remove camera bounds - player movement bounds handle map boundaries
            this.engine.camera.removeBounds();
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
                    
                case 'KeyF':
                    // Toggle camera follow mode
                    if (this.engine.camera) {
                        const isStatic = !this.engine.camera.smoothing;
                        this.engine.camera.setStaticFollow(!isStatic);
                        console.log(`Camera follow: ${!isStatic ? 'Static' : 'Smooth'}`);
                    }
                    break;
                    
                case 'Digit1':
                    // Switch to start map
                    if (this.mapManager) {
                        this.mapManager.switchToMap('start', new Vector2(0, 0));
                    }
                    break;
                    
                case 'Digit2':
                    // Switch to forest map
                    if (this.mapManager) {
                        this.mapManager.switchToMap('forest', new Vector2(0, 0));
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
        // Map-based interaction logic can be added here
        // For now, no special tile interactions in map-based system
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
        if (!this.player || !this.currentMap) return;
        
        const minimapSize = 120;
        const minimapX = renderer.canvas.width - minimapSize - 10;
        const minimapY = 10;
        
        renderer.ctx.save();
        
        // Minimap background
        renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        renderer.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Minimap border
        renderer.ctx.strokeStyle = '#ffffff';
        renderer.ctx.lineWidth = 2;
        renderer.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Draw current map bounds
        renderer.ctx.fillStyle = '#4CAF50';
        renderer.ctx.fillRect(minimapX + 2, minimapY + 2, minimapSize - 4, minimapSize - 4);
        
        // Draw player position relative to map center
        const mapCenterX = minimapX + minimapSize / 2;
        const mapCenterY = minimapY + minimapSize / 2;
        
        // Scale based on map size
        const scaleX = (minimapSize - 4) / this.mapWidth;
        const scaleY = (minimapSize - 4) / this.mapHeight;
        
        const playerMinimapX = mapCenterX + (this.player.position.x * scaleX);
        const playerMinimapY = mapCenterY + (this.player.position.y * scaleY);
        
        renderer.ctx.fillStyle = '#FF0000';
        renderer.ctx.beginPath();
        renderer.ctx.arc(playerMinimapX, playerMinimapY, 3, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        // Show current map name
        renderer.ctx.fillStyle = '#FFFFFF';
        renderer.ctx.font = '12px Arial';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(
            this.mapManager ? this.mapManager.currentMapId : 'Unknown',
            mapCenterX,
            minimapY + minimapSize + 15
        );
        
        renderer.ctx.restore();
    }

    // Map-based utility methods
    switchMap(mapId, playerStartPosition = null) {
        if (this.mapManager) {
            return this.mapManager.switchToMap(mapId, playerStartPosition);
        }
        return false;
    }

    getCurrentMapId() {
        return this.mapManager ? this.mapManager.currentMapId : null;
    }

    addObstacleToCurrentMap(obstacle) {
        if (this.mapManager && this.mapManager.currentMapId) {
            this.mapManager.addObstacleToMap(this.mapManager.currentMapId, obstacle);
        }
    }

    // Cleanup
    destroy() {
        super.destroy();
        this.mapManager = null;
        this.currentMap = null;
        this.player = null;
    }
}
