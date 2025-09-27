/**
 * Main Game Initialization
 * Sets up and starts the isometric RPG game engine
 */

// Global game engine reference
window.gameEngine = null;

// Initialize the game when the page loads
window.addEventListener('load', () => {
    initializeGame();
});

function initializeGame() {
    console.log('Initializing Isometric RPG Game Engine...');
    
    try {
        // Create the game engine
        window.gameEngine = new Engine('gameCanvas');
        
        // Set up the main game scene
        const gameScene = new GameScene();
        window.gameEngine.setScene(gameScene);
        
        // Start the game loop
        window.gameEngine.start();
        
        // Add global event listeners
        setupGlobalControls();
        
        console.log('Game initialized successfully!');
        
        // Show initial instructions
        showInstructions();
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showError('Failed to initialize game. Please refresh the page and try again.');
    }
}

function setupGlobalControls() {
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Handle fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.code === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.gameEngine) {
            // You could add canvas resizing logic here if needed
            console.log('Window resized');
        }
    });
    
    // Add debug information panel
    addDebugPanel();
    
    // Set up background image handler
    setupBackgroundImageHandler();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

function addDebugPanel() {
    // Create debug controls
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        display: none;
        z-index: 100;
    `;
    
    debugPanel.innerHTML = `
        <div><strong>Debug Controls:</strong></div>
        <div>G - Toggle Grid</div>
        <div>C - Toggle Colliders</div>
        <div>O - Toggle Origins</div>
        <div>R - Reset Camera</div>
        <div>P - Pause/Resume</div>
        <div>F11 - Fullscreen</div>
        <div>F1 - Toggle This Panel</div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Toggle debug panel with F1
    document.addEventListener('keydown', (e) => {
        if (e.code === 'F1') {
            e.preventDefault();
            const panel = document.getElementById('debugPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    });
}

function setupBackgroundImageHandler() {
    const backgroundInput = document.getElementById('backgroundInput');
    const mapSelect = document.getElementById('mapSelect');
    
    backgroundInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const selectedMap = mapSelect.value;
        
        if (file && file.type.startsWith('image/')) {
            const scene = window.gameEngine ? window.gameEngine.currentScene : null;
            if (scene && scene.mapManager) {
                scene.mapManager.loadMapBackground(selectedMap, file);
                console.log(`Background loaded for map: ${selectedMap}`);
            }
        } else {
            console.warn('Please select a valid image file');
        }
    });
}

function showInstructions() {
    const instructions = `
    🎮 Welcome to the Isometric RPG Engine!
    
    Controls:
    • WASD or Arrow Keys - Move your character in 360 degrees
    • Mouse - Rotate character to face cursor
    • Space - Jump (with camera shake effect)
    • E - Interact with nearby objects
    • Mouse Wheel - Zoom in/out
    
    Debug Controls:
    • F1 - Show/hide debug panel
    • G - Toggle grid overlay
    • C - Toggle collision boxes
    • O - Toggle object origins
    • R - Reset camera position
    • P - Pause/resume game
    • F11 - Toggle fullscreen
    
    Features:
    • 360-degree smooth movement
    • Isometric perspective with depth sorting
    • Procedurally generated world with different biomes
    • Collision detection and physics
    • Camera following with smooth movement
    • Interactive objects and destructible obstacles
    • Minimap in top-right corner
    • Real-time performance monitoring
    
    Explore the world, interact with objects, and test the engine!
    `;
    
    console.log(instructions);
    
    // Create a temporary overlay with instructions
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
        text-align: center;
        cursor: pointer;
    `;
    
    overlay.innerHTML = `
        <div style="max-width: 600px; padding: 20px;">
            <h2>🎮 Isometric RPG Engine</h2>
            <div style="text-align: left; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                <strong>Controls:</strong><br>
                • WASD/Arrow Keys - 360° Movement<br>
                • E - Interact with objects<br>
                • Mouse Wheel - Zoom camera<br><br>
                
                <strong>Debug (F1 for full list):</strong><br>
                • G - Toggle grid<br>
                • C - Toggle colliders<br>
                • P - Pause/Resume<br>
            </div>
            <p><strong>Click anywhere to start exploring!</strong></p>
        </div>
    `;
    
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    document.body.appendChild(overlay);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px;
        border-radius: 5px;
        z-index: 1000;
        font-family: Arial, sans-serif;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
        }
    }, 5000);
}

// Export for debugging
window.gameUtils = {
    getEngine: () => window.gameEngine,
    getScene: () => window.gameEngine ? window.gameEngine.currentScene : null,
    getPlayer: () => {
        const scene = window.gameEngine ? window.gameEngine.currentScene : null;
        return scene ? scene.player : null;
    },
    
    // Useful debug functions
    teleportPlayer: (x, y) => {
        const player = window.gameUtils.getPlayer();
        if (player) {
            player.teleport(new Vector2(x, y));
        }
    },
    
    spawnObstacle: (type, x, y) => {
        const scene = window.gameUtils.getScene();
        if (scene && scene.spawnObstacle) {
            return scene.spawnObstacle(type, new Vector2(x, y));
        }
    },
    
    setZoom: (zoom) => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.camera) {
            engine.camera.setZoom(zoom);
        }
    },
    
    shakeCamera: (intensity = 10, duration = 1) => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.camera) {
            engine.camera.shakeSimple(intensity, duration);
        }
    },
    
    stopShake: () => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.camera) {
            engine.camera.stopShake();
        }
    },
    
    setBackgroundImage: (imageUrl, scale = 1.0) => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.renderer) {
            const img = new Image();
            img.onload = () => {
                engine.renderer.setBackgroundImage(img, scale);
                console.log('Background image set');
            };
            img.src = imageUrl;
        }
    },
    
    removeBackground: () => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.renderer) {
            engine.renderer.removeBackground();
            console.log('Background removed');
        }
    },
    
    setStaticFollow: (enabled) => {
        const engine = window.gameUtils.getEngine();
        if (engine && engine.camera) {
            engine.camera.setStaticFollow(enabled);
            console.log(`Camera follow: ${enabled ? 'Static' : 'Smooth'}`);
        }
    },
    
    checkCentering: () => {
        const engine = window.gameUtils.getEngine();
        const player = window.gameUtils.getPlayer();
        if (engine && player && engine.camera) {
            console.log('Player position:', player.position);
            console.log('Camera position:', engine.camera.position);
            console.log('Screen center should be:', engine.canvas.width/2, engine.canvas.height/2);
            
            const screenPos = engine.camera.worldToScreen(player.position);
            console.log('Player screen position:', screenPos);
        }
    }
};

console.log('Game utilities available via window.gameUtils');
console.log('Example: gameUtils.teleportPlayer(100, 100)');
console.log('Example: gameUtils.spawnObstacle("tree", 50, 50)');
console.log('Example: gameUtils.shakeCamera(15, 2)');
