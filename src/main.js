// Main entry point for the game - load scripts in order

// Function to dynamically load scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load all scripts in the correct order
async function loadGameScripts() {
    try {
        // Load core classes first
        await loadScript('/src/core/GameObject.js');
        await loadScript('/src/core/Actor.js');
        
        // Load entity classes
        await loadScript('/src/entities/Player.js');
        await loadScript('/src/entities/NPC.js');
        await loadScript('/src/entities/Spirit.js');
        
        // Load object classes
        await loadScript('/src/objects/StaticObject.js');
        await loadScript('/src/objects/Tree.js');
        await loadScript('/src/objects/Bush.js');
        await loadScript('/src/objects/Rock.js');
        
        // Load sprite-specific subclasses
        await loadScript('/src/objects/sprites/Tree01.js');
        await loadScript('/src/objects/sprites/Bush01.js');
        
        await loadScript('/src/objects/InteractiveObject.js');
        await loadScript('/src/objects/Chest.js');
        await loadScript('/src/objects/Portal.js');
        
        // Load manager systems
        await loadScript('/src/systems/AudioManager.js');
        await loadScript('/src/systems/InputManager.js');
        await loadScript('/src/systems/GameStateManager.js');
        await loadScript('/src/systems/MapManager.js');
        await loadScript('/src/systems/ObjectManager.js'); // NEW: Unified object manager
        await loadScript('/src/systems/ItemManager.js');
        await loadScript('/src/systems/InventoryManager.js');
        
        // Load new subsystems for better architecture
        await loadScript('/src/systems/RenderSystem.js');
        await loadScript('/src/systems/CollisionSystem.js');
        await loadScript('/src/systems/InteractionSystem.js');
        await loadScript('/src/systems/SettingsManager.js');
        await loadScript('/src/systems/PerformanceMonitor.js');
        await loadScript('/src/systems/SaveGameManager.js');
        
        // Load game engine
        await loadScript('/src/GameEngine.js');
        
        // Initialize the game engine
        window.game = new GameEngine();
        console.log('🎮 Game initialized with Vite!');
        
    } catch (error) {
        console.error('Failed to load game scripts:', error);
    }
}

// Start loading when page loads
window.addEventListener('load', loadGameScripts);