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
        await loadScript('/src/objects/InteractiveObject.js');
        await loadScript('/src/objects/Chest.js');
        await loadScript('/src/objects/Portal.js');
        
        // Load data loader FIRST (before managers)
        await loadScript('/src/systems/DataLoader.js');
        
        // Load static object registry for template management
        await loadScript('/src/systems/StaticObjectRegistry.js');
        
        // Load spirit registry for spirit templates
        await loadScript('/src/systems/SpiritRegistry.js');
        
        // Load NPC, Chest, and Portal registries
        await loadScript('/src/systems/NPCRegistry.js');
        await loadScript('/src/systems/ChestRegistry.js');
        await loadScript('/src/systems/PortalRegistry.js');
        
        // Load light system for dynamic lighting
        await loadScript('/src/systems/LightRegistry.js');
        await loadScript('/src/systems/LightManager.js');
        
        // Load manager systems
        await loadScript('/src/systems/AudioManager.js');
        await loadScript('/src/systems/InputManager.js');
        await loadScript('/src/systems/TouchControlsUI.js'); // NEW: Touch controls for mobile
        await loadScript('/src/systems/LocaleManager.js'); // NEW: Internationalization (i18n)
        await loadScript('/src/systems/DesignSystem.js'); // NEW: Centralized design tokens
        await loadScript('/src/systems/MenuRenderer.js'); // NEW: Standardized menu rendering
        await loadScript('/src/systems/GameStateManager.js');
        await loadScript('/src/systems/MapManager.js');
        await loadScript('/src/systems/ObjectManager.js'); // NEW: Unified object manager
        await loadScript('/src/systems/ItemManager.js');
        await loadScript('/src/systems/InventoryManager.js');
        
        // Load new subsystems for better architecture
        await loadScript('/src/systems/LayerManager.js'); // NEW: Multi-layer map system
        await loadScript('/src/systems/WebGLRenderer.js'); // NEW: GPU-accelerated rendering
        await loadScript('/src/systems/RenderSystem.js');
        await loadScript('/src/systems/CollisionSystem.js');
        await loadScript('/src/systems/InteractionSystem.js');
        await loadScript('/src/systems/SettingsManager.js');
        await loadScript('/src/systems/DayNightShader.js'); // NEW: WebGL shader for day/night lighting
        await loadScript('/src/systems/DayNightCycle.js'); // NEW: Day/night cycle system
        await loadScript('/src/systems/WeatherSystem.js'); // NEW: Weather effects system
        await loadScript('/src/systems/PerspectiveSystem.js'); // NEW: Fake 3D perspective (Diablo 2 style)
        await loadScript('/src/systems/SpawnManager.js'); // NEW: Spirit spawning system
        await loadScript('/src/systems/PerformanceMonitor.js');
        await loadScript('/src/systems/SaveGameManager.js');
        await loadScript('/src/systems/TemplateManager.js'); // NEW: Object template system
        await loadScript('/src/systems/HUDSystem.js'); // NEW: HUD rendering system
        
        // Load editor components
        await loadScript('/src/editor/EditorStyles.js'); // NEW: Standardized editor styling
        await loadScript('/src/editor/DropdownMenu.js'); // NEW: Dropdown menu component
        await loadScript('/src/editor/EditorUI.js');
        await loadScript('/src/editor/ObjectPalette.js');
        await loadScript('/src/editor/PropertyPanel.js');
        await loadScript('/src/editor/LayerPanel.js'); // NEW: Layer management panel
        await loadScript('/src/editor/TemplateEditor.js'); // NEW: Template editor (legacy)
        await loadScript('/src/editor/LightEditor.js'); // NEW: Light template editor (standardized)
        await loadScript('/src/editor/NPCEditor.js'); // NEW: NPC template editor (standardized)
        await loadScript('/src/editor/ChestEditor.js'); // NEW: Chest template editor (standardized)
        await loadScript('/src/editor/PortalEditor.js'); // NEW: Portal template editor (standardized)
        await loadScript('/src/editor/DoodadEditor.js'); // NEW: Doodad template editor (standardized)
        await loadScript('/src/editor/SpiritEditor.js'); // NEW: Spirit template editor (standardized)
        await loadScript('/src/editor/ObjectPlacementPanel.js'); // NEW: Unified placement panel
        await loadScript('/src/systems/EditorManager.js');
        
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