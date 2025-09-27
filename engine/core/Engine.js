/**
 * Main Game Engine Class
 * Manages the game loop, systems, and overall engine state
 */
class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Engine state
        this.running = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        
        // Systems
        this.inputSystem = new InputSystem();
        this.renderer = new Renderer(this.ctx);
        this.physics = new Physics();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.assetManager = new AssetManager();
        
        // Scene management
        this.currentScene = null;
        
        // Bind context
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize systems
        this.init();
    }

    init() {
        // Set up canvas properties
        this.ctx.imageSmoothingEnabled = false;
        
        // Initialize input system
        this.inputSystem.init(this.canvas);
        
        console.log('Game Engine initialized');
    }

    setScene(scene) {
        if (this.currentScene) {
            this.currentScene.destroy();
        }
        
        this.currentScene = scene;
        scene.engine = this;
        scene.init();
    }

    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
        
        console.log('Game Engine started');
    }

    stop() {
        this.running = false;
        console.log('Game Engine stopped');
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30);

        // Update FPS counter
        this.updateFPS();

        // Clear canvas
        this.renderer.clear();

        // Update current scene
        if (this.currentScene) {
            this.currentScene.update(this.deltaTime);
            this.currentScene.render(this.renderer);
        }

        // Update input system (should be last)
        this.inputSystem.update();

        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }

    updateFPS() {
        this.fpsCounter++;
        this.fpsTimer += this.deltaTime;

        if (this.fpsTimer >= 1.0) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;

            // Update UI
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
            }
        }
    }

    // Utility methods
    getCanvasSize() {
        return new Vector2(this.canvas.width, this.canvas.height);
    }

    getMousePosition() {
        return this.inputSystem.mousePosition.clone();
    }

    isKeyPressed(key) {
        return this.inputSystem.isKeyPressed(key);
    }

    isKeyDown(key) {
        return this.inputSystem.isKeyDown(key);
    }

    isMousePressed(button = 0) {
        return this.inputSystem.isMousePressed(button);
    }

    isMouseDown(button = 0) {
        return this.inputSystem.isMouseDown(button);
    }
}
