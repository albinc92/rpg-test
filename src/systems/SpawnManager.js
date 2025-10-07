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
        
        // Performance optimization: cache spawn zone positions
        this.spawnZoneCache = null; // Array of valid spawn positions {x, y}
        this.spawnZoneCacheValid = false;
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
        
        // Check if spawn zones exist and build cache
        const spawnLayer = this.game.editorManager.getSpawnLayer(mapId);
        if (!spawnLayer) {
            console.warn(`[SpawnManager] ⚠️ No spawn zones painted for map: ${mapId}. Paint spawn zones in Map Editor to enable spawning.`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] 🗺️ Found spawn layer for map ${mapId}, dimensions: ${spawnLayer.width}x${spawnLayer.height}`);
        
        // Build spawn zone cache for performance (or use existing cache for this map)
        this.buildSpawnZoneCache(mapId, spawnLayer);
        
        if (!this.spawnZoneCache || this.spawnZoneCache.length === 0) {
            console.warn(`[SpawnManager] ⚠️ No valid spawn zone positions found for map: ${mapId}. Make sure spawn zones are painted with blue color.`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] ✅ Spawn system enabled for map: ${mapId} (density: ${this.spawnDensity}, spawn points: ${this.spawnZoneCache.length})`);
        this.enabled = true;
        
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
            // Spawn multiple spirits per check to reach target density faster
            // Cap at 5 per check to avoid FPS spike, but allow faster spawning
            const spawnThisCheck = Math.min(spawnNeeded, 5);
            console.log(`[SpawnManager] 🎯 Spawn check at ${timeFormatted} - attempting ${spawnThisCheck} spawns (current: ${currentCount}/${this.spawnDensity})`);
            
            for (let i = 0; i < spawnThisCheck; i++) {
                this.spawnWeightedRandomSpirit();
            }
        }
    }

    /**
     * Spawn a random spirit based on weighted spawn table
     * Uses rarity-based probability: spiritRarity/totalRaritySum
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
        
        // Calculate total rarity sum
        const totalRarity = validEntries.reduce((sum, entry) => sum + (entry.spawnWeight || 50), 0);
        
        // Generate random value between 0 and totalRarity
        const random = Math.random() * totalRarity;
        
        // Select spirit based on rarity ranges
        let cumulativeRarity = 0;
        let selectedEntry = null;
        
        for (const entry of validEntries) {
            const rarity = entry.spawnWeight || 50;
            cumulativeRarity += rarity;
            
            if (random <= cumulativeRarity) {
                selectedEntry = entry;
                break;
            }
        }
        
        if (!selectedEntry) {
            selectedEntry = validEntries[validEntries.length - 1]; // Fallback to last entry
        }
        
        // Calculate spawn probability for logging
        const spiritRarity = selectedEntry.spawnWeight || 50;
        const spawnProbability = ((spiritRarity / totalRarity) * 100).toFixed(1);
        
        // Attempt to spawn the selected spirit
        const template = this.game.spiritRegistry.getTemplate(selectedEntry.spiritId);
        console.log(`[SpawnManager] 🎲 Rolled ${template?.name || selectedEntry.spiritId} (${spawnProbability}% chance: ${spiritRarity}/${totalRarity}) at time ${currentTime.toFixed(1)}h`);
        
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
        
        // Find valid spawn position (in canvas/scaled coordinates)
        const scaledPosition = this.findValidSpawnPosition(spiritId);
        
        if (!scaledPosition) {
            console.log(`[SpawnManager] Could not find valid spawn position for: ${spiritId}`);
            return;
        }
        
        // Convert scaled position back to unscaled world coordinates for spirit creation
        const mapData = this.game.mapManager.maps[this.currentMapId];
        const mapScale = mapData?.scale || 1.0;
        const resolutionScale = this.game.resolutionScale || 1.0;
        const combinedScale = mapScale * resolutionScale;
        
        const unscaledX = scaledPosition.x / combinedScale;
        const unscaledY = scaledPosition.y / combinedScale;
        
        // Create spirit using registry with unscaled coordinates
        const spirit = this.game.spiritRegistry.createSpirit(
            spiritId,
            unscaledX,
            unscaledY,
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
        console.log(`[SpawnManager] ✨ Spawned ${template.name} at scaled(${Math.round(scaledPosition.x)}, ${Math.round(scaledPosition.y)}) / unscaled(${Math.round(unscaledX)}, ${Math.round(unscaledY)}) [Total: ${this.allSpawnedSpirits.length}/${this.spawnDensity}]`);
    }

    /**
     * Build spawn zone cache by scanning the spawn layer once (performance optimization)
     */
    buildSpawnZoneCache(mapId, spawnLayer) {
        // Skip if cache already valid
        if (this.spawnZoneCacheValid && this.spawnZoneCache) {
            console.log(`[SpawnManager] ✅ Using existing spawn zone cache (${this.spawnZoneCache.length} points)`);
            return;
        }
        
        console.log(`[SpawnManager] 🗺️ Building spawn zone cache for map: ${mapId}...`);
        const startTime = performance.now();
        
        const mapData = this.game.mapManager.maps[mapId];
        const mapScale = mapData.scale || 1.0;
        const resolutionScale = this.game.resolutionScale || 1.0;
        const combinedScale = mapScale * resolutionScale;
        
        const canvasWidth = spawnLayer.width;
        const canvasHeight = spawnLayer.height;
        
        console.log(`[SpawnManager] 🗺️ Spawn layer dimensions: ${canvasWidth}x${canvasHeight}`);
        console.log(`[SpawnManager] 🗺️ Map scale: ${mapScale}, Resolution scale: ${resolutionScale}, Combined: ${combinedScale}`);
        
        // Get all pixel data at once (much faster than repeated getImageData calls)
        const ctx = spawnLayer.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const pixels = imageData.data;
        
        // Sample grid for spawn points (every 16 pixels to avoid too many points)
        const sampleRate = 16;
        const spawnPoints = [];
        
        for (let cy = 0; cy < canvasHeight; cy += sampleRate) {
            for (let cx = 0; cx < canvasWidth; cx += sampleRate) {
                const index = (cy * canvasWidth + cx) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const a = pixels[index + 3];
                
                // Check if pixel is blue (spawn zone color: rgba(0, 100, 255, 1.0))
                const isBlue = (r < 50 && g > 50 && g < 150 && b > 200 && a > 128);
                
                if (isBlue) {
                    // Canvas coordinates are already in world coordinates
                    // The spawn layer canvas size matches the scaled world size
                    // So we just use cx, cy directly
                    spawnPoints.push({ x: cx, y: cy });
                }
            }
        }
        
        this.spawnZoneCache = spawnPoints;
        this.spawnZoneCacheValid = true;
        
        const endTime = performance.now();
        console.log(`[SpawnManager] ✅ Cached ${spawnPoints.length} spawn zone positions in ${(endTime - startTime).toFixed(2)}ms`);
        
        if (spawnPoints.length > 0) {
            console.log(`[SpawnManager] 📍 Sample spawn points:`, spawnPoints.slice(0, 3));
        }
    }
    
    /**
     * Find a valid spawn position within spawn zones (using cached positions)
     */
    findValidSpawnPosition(spiritId, maxAttempts = 30) {
        if (!this.spawnZoneCache || this.spawnZoneCache.length === 0) {
            console.warn(`[SpawnManager] No spawn zone cache available`);
            return null;
        }
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Pick a random spawn point from cache
            const randomIndex = Math.floor(Math.random() * this.spawnZoneCache.length);
            const spawnPoint = this.spawnZoneCache[randomIndex];
            
            // Add some random offset (±32 pixels) for more variety and spread
            const x = spawnPoint.x + (Math.random() - 0.5) * 64;
            const y = spawnPoint.y + (Math.random() - 0.5) * 64;
            
            // Check collision with existing objects and NPCs
            if (this.hasCollisionAt(x, y)) {
                continue;
            }
            
            // Valid position found!
            return { x, y };
        }
        
        // Fallback: return a random spawn point with offset even if there's a collision
        // This ensures spirits can spawn even in crowded areas
        const randomIndex = Math.floor(Math.random() * this.spawnZoneCache.length);
        const fallbackPoint = this.spawnZoneCache[randomIndex];
        console.log(`[SpawnManager] ⚠️ Using fallback spawn position after ${maxAttempts} attempts`);
        return { 
            x: fallbackPoint.x + (Math.random() - 0.5) * 64, 
            y: fallbackPoint.y + (Math.random() - 0.5) * 64 
        };
    }



    /**
     * Check if there's a collision at the given position
     */
    hasCollisionAt(x, y) {
        const checkRadius = 48; // Minimum distance from objects/NPCs (increased for better spacing)
        
        // Get map scale factors for proper coordinate comparison
        const mapData = this.game.mapManager.maps[this.currentMapId];
        const mapScale = mapData?.scale || 1.0;
        const resolutionScale = this.game.resolutionScale || 1.0;
        const combinedScale = mapScale * resolutionScale;
        
        // Check collision with all objects on current map (using ObjectManager)
        const mapObjects = this.game.objectManager.getObjectsForMap(this.currentMapId);
        for (const obj of mapObjects) {
            // Get object's scaled position for comparison
            const objX = obj.x * combinedScale;
            const objY = obj.y * combinedScale;
            
            const dx = objX - x;
            const dy = objY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < checkRadius) {
                return true;
            }
        }
        
        // Check collision with player
        if (this.game.player) {
            const playerX = this.game.player.x * combinedScale;
            const playerY = this.game.player.y * combinedScale;
            
            const dx = playerX - x;
            const dy = playerY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < checkRadius * 2) { // Give player more space
                return true;
            }
        }
        
        return false;
    }

    /**
     * Invalidate spawn zone cache (call when spawn zones are edited)
     */
    invalidateCache() {
        this.spawnZoneCache = null;
        this.spawnZoneCacheValid = false;
        console.log(`[SpawnManager] 🗑️ Spawn zone cache invalidated`);
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
        
        // Don't invalidate cache on map change - cache can be reused if returning to same map
        // Only invalidate when spawn zones are actually edited
        // this.invalidateCache();
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
