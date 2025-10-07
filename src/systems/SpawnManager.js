/**
 * SpawnManager - Handles automatic spirit spawning based on spawn zones and spawn tables
 * Uses weighted spawn system: map has total spawn density, each spirit has spawn weight (1-100)
 */
class SpawnManager {
    constructor(game) {
        this.game = game;
        this.spawnTable = [];
        this.allSpawnedSpirits = []; // All spirits spawned by this manager
        this.spawnDensity = 10; // Total number of spirits on the map
        this.spawnCheckInterval = 5000; // Check every 5 seconds
        this.lastSpawnCheck = 0;
        this.enabled = false;
        this.currentMapId = null;
    }

    /**
     * Initialize spawn manager for a specific map
     */
    initialize(mapId) {
        console.log(`[SpawnManager] 🔄 Initializing for map: ${mapId}`);
        
        // Clear previous spawns
        this.clearSpawns();
        
        this.currentMapId = mapId;
        const mapData = this.game.mapManager.maps[mapId];
        
        if (!mapData) {
            console.warn(`[SpawnManager] ❌ Map data not found for: ${mapId}`);
            this.enabled = false;
            return;
        }
        
        // Load spawn configuration from map data
        this.spawnTable = mapData.spawnTable || [];
        this.spawnDensity = mapData.spawnDensity || 10; // Default 10 spirits
        
        if (this.spawnTable.length === 0) {
            console.log(`[SpawnManager] ⚠️ No spawn table configured for map: ${mapId} - spawning disabled`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] 📋 Loaded spawn config:`, {
            spawnDensity: this.spawnDensity,
            spawnEntries: this.spawnTable.length,
            entries: this.spawnTable.map(e => ({
                spirit: e.spiritId,
                weight: e.spawnWeight,
                time: e.timeCondition
            }))
        });
        
        // Check if spawn zones exist
        const spawnLayer = this.game.editorManager.getSpawnLayer(mapId);
        if (!spawnLayer) {
            console.warn(`[SpawnManager] ⚠️ No spawn zones painted for map: ${mapId}. Paint spawn zones in Map Editor to enable spawning.`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] ✅ Spawn system enabled for map: ${mapId} (density: ${this.spawnDensity})`);
        this.enabled = true;
        this.lastSpawnCheck = Date.now();
        
        // Trigger initial spawn check immediately
        console.log(`[SpawnManager] 🎲 Triggering initial spawn check...`);
        this.lastSpawnCheck = 0; // Force immediate check on first update
    }

    /**
     * Update spawn manager - maintain spawn density
     */
    update(deltaTime) {
        if (!this.enabled || !this.spawnTable.length) return;
        
        const now = Date.now();
        
        // Only check spawns every X seconds
        if (now - this.lastSpawnCheck < this.spawnCheckInterval) {
            return;
        }
        
        this.lastSpawnCheck = now;
        
        // Clean up dead/removed spirits
        this.cleanUpSpirits();
        
        // Count current active spirits
        const currentCount = this.allSpawnedSpirits.length;
        
        // Get current time info
        const currentTime = this.game.dayNightCycle?.timeOfDay || 12;
        const timeFormatted = `${Math.floor(currentTime).toString().padStart(2, '0')}:${Math.floor((currentTime % 1) * 60).toString().padStart(2, '0')}`;
        
        // Spawn spirits to reach density
        const spawnNeeded = this.spawnDensity - currentCount;
        
        if (spawnNeeded > 0) {
            console.log(`[SpawnManager] 🎯 Spawn check at ${timeFormatted} - need ${spawnNeeded} spirits (current: ${currentCount}/${this.spawnDensity})`);
            
            for (let i = 0; i < spawnNeeded; i++) {
                this.spawnWeightedRandomSpirit();
            }
        }
    }

    /**
     * Spawn a random spirit based on weighted spawn table
     */
    spawnWeightedRandomSpirit() {
        const currentTime = this.game.dayNightCycle?.timeOfDay || 12;
        
        // Filter by time condition
        const validEntries = this.spawnTable.filter(entry => 
            this.checkTimeCondition(entry.timeCondition)
        );
        
        if (validEntries.length === 0) {
            console.log(`[SpawnManager] ⏰ No valid spirits for current time (${currentTime.toFixed(1)}h). Available conditions:`, 
                this.spawnTable.map(e => e.timeCondition));
            return;
        }
        
        // Calculate total weight
        const totalWeight = validEntries.reduce((sum, entry) => sum + (entry.spawnWeight || 50), 0);
        
        // Random weighted selection
        let random = Math.random() * totalWeight;
        let selectedEntry = null;
        
        for (const entry of validEntries) {
            random -= (entry.spawnWeight || 50);
            if (random <= 0) {
                selectedEntry = entry;
                break;
            }
        }
        
        if (!selectedEntry) {
            selectedEntry = validEntries[validEntries.length - 1]; // Fallback to last entry
        }
        
        // Attempt to spawn the selected spirit
        const template = this.game.spiritRegistry.getTemplate(selectedEntry.spiritId);
        console.log(`[SpawnManager] 🎲 Rolled ${template?.name || selectedEntry.spiritId} (weight: ${selectedEntry.spawnWeight}/${totalWeight}) at time ${currentTime.toFixed(1)}h`);
        
        this.spawnSpirit(selectedEntry.spiritId);
    }

    /**
     * Check if current time matches the time condition
     */
    checkTimeCondition(condition) {
        if (!condition || condition === 'any') return true;
        
        // Check if day/night cycle is active
        if (!this.game.dayNightCycle) return true;
        
        const currentTime = this.game.dayNightCycle.timeOfDay; // Fixed: use timeOfDay not currentTime
        
        // Normalize condition names (support both 'day' and 'daytime')
        const normalizedCondition = condition.toLowerCase().replace('time', '');
        
        switch(normalizedCondition) {
            case 'day':
                return currentTime >= 7 && currentTime < 17;
            case 'night':
                return (currentTime >= 0 && currentTime < 5) || (currentTime >= 21 && currentTime < 24);
            case 'dawn':
                return currentTime >= 5 && currentTime < 7;
            case 'dusk':
                return currentTime >= 17 && currentTime < 19;
            case 'evening':
            case 'nightfall':
                return currentTime >= 19 && currentTime < 21;
            default:
                console.warn(`[SpawnManager] Unknown time condition: ${condition}`);
                return true; // Default to allowing spawn if unknown condition
        }
    }

    /**
     * Clean up dead/removed spirits from tracking
     */
    cleanUpSpirits() {
        this.allSpawnedSpirits = this.allSpawnedSpirits.filter(spirit => {
            // Check if spirit still exists in ObjectManager for current map
            const mapObjects = this.game.objectManager.getObjectsForMap(this.currentMapId);
            return mapObjects.includes(spirit);
        });
    }

    /**
     * Spawn a spirit of the specified type
     */
    async spawnSpirit(spiritId) {
        // Check if spirit template exists
        if (!this.game.spiritRegistry.hasTemplate(spiritId)) {
            console.error(`[SpawnManager] Spirit template not found: ${spiritId}`);
            return;
        }
        
        // Find valid spawn position
        const position = this.findValidSpawnPosition(spiritId);
        
        if (!position) {
            console.log(`[SpawnManager] Could not find valid spawn position for: ${spiritId}`);
            return;
        }
        
        // Create spirit using registry
        const spirit = this.game.spiritRegistry.createSpirit(
            spiritId,
            position.x,
            position.y,
            this.currentMapId
        );
        
        if (!spirit) {
            console.error(`[SpawnManager] Failed to create spirit: ${spiritId}`);
            return;
        }
        
        // Add to ObjectManager (not npcs array - using new architecture)
        this.game.objectManager.addObject(this.currentMapId, spirit);
        
        // Track spawned spirit
        this.allSpawnedSpirits.push(spirit);
        
        const template = this.game.spiritRegistry.getTemplate(spiritId);
        console.log(`[SpawnManager] ✨ Spawned ${template.name} at (${Math.round(position.x)}, ${Math.round(position.y)}) [Total: ${this.allSpawnedSpirits.length}/${this.spawnDensity}]`);
    }

    /**
     * Find a valid spawn position within spawn zones
     */
    findValidSpawnPosition(spiritId, maxAttempts = 20) {
        const spawnLayer = this.game.editorManager.getSpawnLayer(this.currentMapId);
        
        if (!spawnLayer) {
            console.warn(`[SpawnManager] No spawn zones found for map: ${this.currentMapId}`);
            return null;
        }
        
        const mapData = this.game.mapManager.maps[this.currentMapId];
        const mapScale = mapData.scale || 1.0;
        const mapWidth = mapData.width * mapScale;
        const mapHeight = mapData.height * mapScale;
        
        // Get spawn zone canvas context for pixel checking
        const ctx = spawnLayer.getContext('2d');
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Random position within map bounds
            const x = Math.random() * mapWidth;
            const y = Math.random() * mapHeight;
            
            // Check if position is in spawn zone (blue pixel)
            if (!this.isInSpawnZone(ctx, x, y, mapScale)) {
                continue;
            }
            
            // Check collision with existing objects and NPCs
            if (this.hasCollisionAt(x, y)) {
                continue;
            }
            
            // Valid position found!
            return { x, y };
        }
        
        return null;
    }

    /**
     * Check if a position is within a spawn zone (blue pixel)
     */
    isInSpawnZone(ctx, x, y, mapScale) {
        try {
            // Scale coordinates to canvas resolution
            const resolutionScale = this.game.resolutionScale || 1.0;
            const canvasX = Math.floor(x * resolutionScale);
            const canvasY = Math.floor(y * resolutionScale);
            
            // Get pixel data
            const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            const [r, g, b, a] = imageData.data;
            
            // Check if pixel is blue (spawn zone color: rgba(0, 100, 255, 1.0))
            // Allow some tolerance for variations
            const isBlue = (r < 50 && g > 50 && g < 150 && b > 200 && a > 128);
            
            return isBlue;
        } catch (error) {
            // Out of bounds or error reading pixel
            return false;
        }
    }

    /**
     * Check if there's a collision at the given position
     */
    hasCollisionAt(x, y) {
        const checkRadius = 32; // Minimum distance from objects/NPCs
        
        // Check collision with all objects on current map (using ObjectManager)
        const mapObjects = this.game.objectManager.getObjectsForMap(this.currentMapId);
        for (const obj of mapObjects) {
            const dx = obj.x - x;
            const dy = obj.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < checkRadius) {
                return true;
            }
        }
        
        // Check collision with player
        if (this.game.player) {
            const dx = this.game.player.x - x;
            const dy = this.game.player.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < checkRadius) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Clear all spawned spirits (called on map change)
     */
    clearSpawns() {
        console.log(`[SpawnManager] Clearing ${this.allSpawnedSpirits.length} spawned spirits`);
        
        // Remove spawned spirits from ObjectManager
        this.allSpawnedSpirits.forEach(spirit => {
            this.game.objectManager.removeObject(this.currentMapId, spirit.id);
        });
        
        this.allSpawnedSpirits = [];
        this.enabled = false;
    }

    /**
     * Get spawn statistics for debugging
     */
    getStats() {
        const spiritCounts = {};
        this.allSpawnedSpirits.forEach(spirit => {
            const id = spirit.spiritId || 'unknown';
            spiritCounts[id] = (spiritCounts[id] || 0) + 1;
        });
        
        return {
            enabled: this.enabled,
            mapId: this.currentMapId,
            spawnDensity: this.spawnDensity,
            totalSpawned: this.allSpawnedSpirits.length,
            byType: spiritCounts
        };
    }

    /**
     * Force spawn a specific spirit (for testing)
     */
    forceSpawn(spiritId) {
        console.log(`[SpawnManager] Force spawning: ${spiritId}`);
        this.spawnSpirit(spiritId);
    }
}
