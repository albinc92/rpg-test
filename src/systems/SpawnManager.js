/**
 * SpawnManager - Handles automatic spirit spawning based on spawn zones and spawn tables
 * Manages population limits, time conditions, and spawn positioning
 */
class SpawnManager {
    constructor(game) {
        this.game = game;
        this.spawnTable = [];
        this.spawnedSpirits = new Map(); // spiritId -> array of spirit instances
        this.spawnCheckInterval = 5000; // Check every 5 seconds
        this.lastSpawnCheck = 0;
        this.enabled = false;
        this.currentMapId = null;
    }

    /**
     * Initialize spawn manager for a specific map
     */
    initialize(mapId) {
        console.log(`[SpawnManager] Initializing for map: ${mapId}`);
        
        // Clear previous spawns
        this.clearSpawns();
        
        this.currentMapId = mapId;
        const mapData = this.game.mapManager.maps[mapId];
        
        if (!mapData) {
            console.warn(`[SpawnManager] Map data not found for: ${mapId}`);
            this.enabled = false;
            return;
        }
        
        // Load spawn table from map data
        this.spawnTable = mapData.spawnTable || [];
        
        if (this.spawnTable.length === 0) {
            console.log(`[SpawnManager] No spawn table configured for map: ${mapId}`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] Loaded ${this.spawnTable.length} spawn entries`);
        this.enabled = true;
        this.lastSpawnCheck = Date.now();
    }

    /**
     * Update spawn manager - check for new spawns periodically
     */
    update(deltaTime) {
        if (!this.enabled || !this.spawnTable.length) return;
        
        const now = Date.now();
        
        // Only check spawns every X seconds
        if (now - this.lastSpawnCheck < this.spawnCheckInterval) {
            return;
        }
        
        this.lastSpawnCheck = now;
        
        // Check each spawn entry
        this.spawnTable.forEach(entry => {
            this.checkSpawn(entry);
        });
    }

    /**
     * Check if a spawn entry should spawn a spirit
     */
    checkSpawn(entry) {
        // Check time condition
        if (!this.checkTimeCondition(entry.timeCondition)) {
            return;
        }
        
        // Count current population for this spirit type
        const currentCount = this.countSpirits(entry.spiritId);
        
        // Check if we're at max population
        if (currentCount >= entry.maxPopulation) {
            return;
        }
        
        // Roll spawn chance (spawn rate is probability per second)
        // Convert to probability per check interval
        const checkIntervalSeconds = this.spawnCheckInterval / 1000;
        const spawnChance = entry.spawnRate * checkIntervalSeconds;
        const roll = Math.random();
        
        if (roll <= spawnChance) {
            // Attempt to spawn
            this.spawnSpirit(entry.spiritId);
        }
    }

    /**
     * Check if current time matches the time condition
     */
    checkTimeCondition(condition) {
        if (condition === 'any') return true;
        
        // Check if day/night cycle is active
        if (!this.game.dayNightCycle) return true;
        
        const currentTime = this.game.dayNightCycle.currentTime;
        
        switch(condition) {
            case 'day':
                return currentTime >= 7 && currentTime < 17;
            case 'night':
                return currentTime >= 0 && currentTime < 5;
            case 'dawn':
                return currentTime >= 5 && currentTime < 7;
            case 'dusk':
                return currentTime >= 17 && currentTime < 19;
            case 'nightfall':
                return currentTime >= 19 && currentTime < 24;
            default:
                return false;
        }
    }

    /**
     * Count how many spirits of a specific type are currently spawned
     */
    countSpirits(spiritId) {
        const spirits = this.spawnedSpirits.get(spiritId) || [];
        
        // Remove any spirits that have been deleted/removed from the game
        const activeSpirits = spirits.filter(spirit => {
            // Check if spirit is still in the NPC array
            return this.game.npcs.includes(spirit);
        });
        
        // Update the map with only active spirits
        if (activeSpirits.length !== spirits.length) {
            this.spawnedSpirits.set(spiritId, activeSpirits);
        }
        
        return activeSpirits.length;
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
        
        // Add to game
        this.game.npcs.push(spirit);
        
        // Track spawned spirit
        if (!this.spawnedSpirits.has(spiritId)) {
            this.spawnedSpirits.set(spiritId, []);
        }
        this.spawnedSpirits.get(spiritId).push(spirit);
        
        const template = this.game.spiritRegistry.getTemplate(spiritId);
        console.log(`[SpawnManager] ✨ Spawned ${template.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`);
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
            
            // Check if pixel is blue (spawn zone color: rgba(0, 100, 255, 0.5))
            // Allow some tolerance for variations
            const isBlue = (r < 50 && g > 50 && g < 150 && b > 200 && a > 0);
            
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
        
        // Check collision with static objects
        for (const obj of this.game.objects) {
            if (obj.mapId !== this.currentMapId) continue;
            
            const dx = obj.x - x;
            const dy = obj.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < checkRadius) {
                return true;
            }
        }
        
        // Check collision with NPCs (including other spirits)
        for (const npc of this.game.npcs) {
            if (npc.mapId !== this.currentMapId) continue;
            
            const dx = npc.x - x;
            const dy = npc.y - y;
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
        console.log(`[SpawnManager] Clearing spawned spirits`);
        
        // Remove spawned spirits from game
        this.spawnedSpirits.forEach((spirits, spiritId) => {
            spirits.forEach(spirit => {
                const index = this.game.npcs.indexOf(spirit);
                if (index !== -1) {
                    this.game.npcs.splice(index, 1);
                }
            });
        });
        
        this.spawnedSpirits.clear();
        this.enabled = false;
    }

    /**
     * Get spawn statistics for debugging
     */
    getStats() {
        const stats = {
            enabled: this.enabled,
            mapId: this.currentMapId,
            spawnTableSize: this.spawnTable.length,
            totalSpawned: 0,
            byType: {}
        };
        
        this.spawnedSpirits.forEach((spirits, spiritId) => {
            const count = this.countSpirits(spiritId);
            stats.byType[spiritId] = count;
            stats.totalSpawned += count;
        });
        
        return stats;
    }

    /**
     * Force spawn a specific spirit (for testing)
     */
    forceSpawn(spiritId) {
        console.log(`[SpawnManager] Force spawning: ${spiritId}`);
        this.spawnSpirit(spiritId);
    }
}
