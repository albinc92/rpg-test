// Main entry point for the game
// All imports are bundled by Vite for production builds

// Core classes
import './core/GameObject.js';
import './core/Actor.js';

// Entity classes
import './entities/Player.js';
import './entities/NPC.js';
import './entities/Spirit.js';

// Object classes
import './objects/StaticObject.js';
import './objects/InteractiveObject.js';
import './objects/Chest.js';
import './objects/Portal.js';

// Data loader (before managers)
import './systems/DataLoader.js';

// Registries
import './systems/StaticObjectRegistry.js';
import './systems/SpiritRegistry.js';
import './systems/NPCRegistry.js';
import './systems/ChestRegistry.js';
import './systems/PortalRegistry.js';

// Light system
import './systems/LightRegistry.js';
import './systems/LightManager.js';

// Manager systems
import './systems/AudioManager.js';
import './systems/InputManager.js';
import './systems/TouchControlsUI.js';
import './systems/LocaleManager.js';
import './systems/DesignSystem.js';
import './systems/MenuRenderer.js';
import './systems/GameVariables.js';
import './systems/ScriptEngine.js';
import './systems/GameStateManager.js';
import './systems/MapManager.js';
import './systems/ObjectManager.js';
import './systems/ItemManager.js';
import './systems/InventoryManager.js';

// Subsystems
import './systems/LayerManager.js';
import './systems/WebGLRenderer.js';
import './systems/RenderSystem.js';
import './systems/CollisionSystem.js';
import './systems/InteractionSystem.js';
import './systems/SettingsManager.js';
import './systems/DayNightShader.js';
import './systems/DayNightCycle.js';
import './systems/WeatherSystem.js';
import './systems/PerspectiveSystem.js';
import './systems/SpawnManager.js';
import './systems/PerformanceMonitor.js';
import './systems/SaveGameManager.js';
import './systems/TemplateManager.js';
import './systems/HUDSystem.js';
import './systems/CompressionUtils.js';
import './systems/PartyManager.js';
import './systems/BattleEffects.js';
import './systems/BattleSystem.js';

// Editor components
import './editor/EditorStyles.js';
import './editor/DropdownMenu.js';
import './editor/VisualScriptEditor.js';
import './editor/EditorUI.js';
import './editor/ObjectPalette.js';
import './editor/PropertyPanel.js';
import './editor/LayerPanel.js';
import './editor/TemplateEditor.js';
import './editor/LightEditor.js';
import './editor/NPCEditor.js';
import './editor/ChestEditor.js';
import './editor/PortalEditor.js';
import './editor/DoodadEditor.js';
import './editor/SpiritEditor.js';
import './editor/ObjectPlacementPanel.js';
import './systems/EditorManager.js';

// Game engine
import './GameEngine.js';

// Initialize the game engine when page loads
window.addEventListener('load', () => {
    window.game = new GameEngine();
    console.log('🎮 Game initialized with Vite!');
});