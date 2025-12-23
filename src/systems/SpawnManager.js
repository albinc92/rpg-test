/**
 * SpawnManager - Handles automatic spirit spawning based on spawn zones and spawn tables
 * Uses weighted spawn system: map has total spawn density, each spirit has spawn weight (1-100)
 * Supports multiple active maps for seamless open world.
 */
class SpawnManager {
    constructor(game) {
        this.game = game;
        
        // Map-specific spawn configurations and state
        // Key: mapId, Value: { spawnTable, spawnDensity, respawnDelay, lastSpawnCheck, spawnZoneCache, spirits: [] }
        this.activeMaps = new Map();
        
        this.spawnCheckInterval = 5000; // Check every 5 seconds
        this.enabled = true; // Global enable switch
    }

    /**
     * Activate spawning for a specific map (Current or Adjacent)
     */
    activateMap(mapId) {
        if (this.activeMaps.has(mapId)) return;

        console.log(`[SpawnManager] 🔄 Activating spawn system for map: ${mapId}`);
        
        const mapData = this.game.mapManager.maps[mapId];
        if (!mapData) {
            console.warn(`[SpawnManager] ❌ Map data not found for: ${mapId}`);
            return;
        }
        
        const spawnTable = mapData.spawnTable || [];
        const spawnDensity = mapData.spawnDensity || 10;
        const respawnDelay = mapData.respawnDelay || 30000;
        
        if (spawnTable.length === 0) {
            // console.log(`[SpawnManager] ⚠️ No spawn table for map: ${mapId}`);
            return;
        }
        
        const mapConfig = {
            spawnTable,
            spawnDensity,
            respawnDelay,
            lastSpawnCheck: 0,
            spawnZoneCache: null,
            spirits: []
        };
        
        // Build cache
        const spawnLayer = this.game.editorManager.getSpawnLayer(mapId);
        mapConfig.spawnZoneCache = this.buildSpawnZoneCache(mapId, spawnLayer, mapData);
        
        if (!mapConfig.spawnZoneCache || mapConfig.spawnZoneCache.length === 0) {
            // console.warn(`[SpawnManager] ⚠️ No valid spawn zones for map: ${mapId}`);
            return;
        }
        
        this.activeMaps.set(mapId, mapConfig);
        console.log(`[SpawnManager] ✅ Map ${mapId} activated. Density: ${spawnDensity}`);
    }

    /**
     * Deactivate spawning for a map and remove its spirits
     */
    deactivateMap(mapId) {
        if (!this.activeMaps.has(mapId)) return;
        
        console.log(`[SpawnManager] 🛑 Deactivating map: ${mapId}`);
        this.clearSpawnsForMap(mapId);
        this.activeMaps.delete(mapId);
    }

    /**
     * Clear spawns for a specific map
     */
    clearSpawnsForMap(mapId) {
        const config = this.activeMaps.get(mapId);
        if (!config) return;
        
        console.log(`[SpawnManager] 🧹 Clearing ${config.spirits.length} spirits from map ${mapId}`);
        
        config.spirits.forEach(spirit => {
            this.game.objectManager.removeObject(mapId, spirit.id);
        });
        
        config.spirits = [];
    }

    /**
     * Clear ALL spawns (Global reset)
     */
    clearAllSpawns() {
        for (const mapId of this.activeMaps.keys()) {
            this.deactivateMap(mapId);
        }
        this.activeMaps.clear();
    }

    /**
     * Update spawn manager - maintain spawn density for ALL active maps
     */
    update(deltaTime) {
        if (!this.enabled) return;
        
        const now = Date.now();
        
        for (const [mapId, config] of this.activeMaps) {
            if (now - config.lastSpawnCheck > this.spawnCheckInterval) {
                this.checkSpawnsForMap(mapId, config);
                config.lastSpawnCheck = now;
            }
        }
    }

    /**
     * Check and spawn spirits for a specific map
     */
    checkSpawnsForMap(mapId, config) {
        // Clean up dead/removed spirits
        config.spirits = config.spirits.filter(s => !s.isDead && !s.markedForDeletion);
        
        const currentCount = config.spirits.length;
        const missingCount = config.spawnDensity - currentCount;
        
        if (missingCount > 0) {
            // Spawn one spirit per check to spread load
            this.spawnSpirit(mapId, config);
        }
    }

    /**
     * Spawn a single spirit for a specific map
     */
    spawnSpirit(mapId, config) {
        if (!config.spawnZoneCache || config.spawnZoneCache.length === 0) return;
        
        // 1. Select Spirit Type (considering time conditions)
        const spiritId = this.selectRandomSpirit(config.spawnTable);
        if (!spiritId) return;
        
        // 2. Find Valid Position (with collision check)
        const position = this.findValidSpawnPosition(mapId, config, spiritId);
        if (!position) return;
        
        // 3. Convert to Unscaled World Coordinates
        const resolutionScale = this.game.resolutionScale || 1.0;
        
        const unscaledX = position.x / resolutionScale;
        const unscaledY = position.y / resolutionScale;
        
        // 4. Create Spirit
        const spirit = this.game.spiritRegistry.createSpirit(
            spiritId,
            unscaledX,
            unscaledY,
            mapId
        );
        
        if (!spirit) return;

        spirit.isDynamicSpawn = true;
        
        // Add spawn visual effect
        spirit.spawnEffectTimer = 1.0; // 1 second spawn effect
        spirit.isSpawning = true;
        
        // Play spawn sound effect with distance-based falloff
        if (this.game.player) {
            const dx = unscaledX - this.game.player.x;
            const dy = unscaledY - this.game.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Sound parameters
            const maxHearingDistance = 600; // Max distance to hear spawn sound
            const fullVolumeDistance = 150; // Distance at which volume is at max
            
            if (distance < maxHearingDistance) {
                // Calculate volume falloff (1.0 at fullVolumeDistance, 0 at maxHearingDistance)
                let volume = 0.3; // Base max volume
                if (distance > fullVolumeDistance) {
                    const falloff = 1 - (distance - fullVolumeDistance) / (maxHearingDistance - fullVolumeDistance);
                    volume *= falloff;
                }
                if (volume > 0.02) { // Only play if audible
                    this.game.audioManager?.playEffect('spawn.mp3', volume);
                }
            }
        }
        
        this.game.objectManager.addObject(mapId, spirit);
        config.spirits.push(spirit);
    }

    /**
     * Select a random spirit based on weights and time conditions
     */
    selectRandomSpirit(spawnTable) {
        // Filter by time condition
        const validEntries = spawnTable.filter(entry => 
            this.checkTimeCondition(entry.timeCondition)
        );
        
        if (validEntries.length === 0) return null;

        const totalWeight = validEntries.reduce((sum, entry) => sum + (entry.spawnWeight || 50), 0);
        let random = Math.random() * totalWeight;
        
        for (const entry of validEntries) {
            random -= (entry.spawnWeight || 50);
            if (random <= 0) {
                return entry.spiritId;
            }
        }
        return validEntries[0]?.spiritId;
    }

    /**
     * Check if current time matches the time condition
     */
    checkTimeCondition(condition) {
        if (!condition || condition === 'any') return true;
        if (!this.game.dayNightCycle) return true;
        
        const currentTime = this.game.dayNightCycle.timeOfDay;
        const normalizedCondition = condition.toLowerCase().replace('time', '');
        
        switch(normalizedCondition) {
            case 'day': return currentTime >= 7 && currentTime < 17;
            case 'night': return (currentTime >= 0 && currentTime < 5) || (currentTime >= 21 && currentTime < 24);
            case 'dawn': return currentTime >= 5 && currentTime < 7;
            case 'dusk': return currentTime >= 17 && currentTime < 19;
            case 'evening':
            case 'nightfall': return currentTime >= 19 && currentTime < 21;
            default: return true;
        }
    }

    /**
     * Find a valid spawn position within spawn zones
     */
    findValidSpawnPosition(mapId, config, spiritId, maxAttempts = 20) {
        if (!config.spawnZoneCache || config.spawnZoneCache.length === 0) return null;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const randomIndex = Math.floor(Math.random() * config.spawnZoneCache.length);
            const spawnPoint = config.spawnZoneCache[randomIndex];
            
            // Add random offset (±32 pixels)
            const x = spawnPoint.x + (Math.random() - 0.5) * 64;
            const y = spawnPoint.y + (Math.random() - 0.5) * 64;
            
            if (!this.hasCollisionAt(mapId, x, y, spiritId)) {
                return { x, y };
            }
        }
        
        // Fallback to exact point
        const randomIndex = Math.floor(Math.random() * config.spawnZoneCache.length);
        return config.spawnZoneCache[randomIndex];
    }

    /**
     * Check if there's a collision at the given position
     */
    hasCollisionAt(mapId, x, y, spiritId) {
        // The x,y passed here are SCALED (from spawnZoneCache).
        // We need to unscale them to check against map zones.
        
        const resolutionScale = this.game.resolutionScale || 1.0;
        
        const unscaledX = x / resolutionScale;
        const unscaledY = y / resolutionScale;
        
        // Check map collision zones
        if (this.game.collisionSystem.checkZoneCollision(unscaledX, unscaledY, this.game, null, mapId)) {
            return true;
        }
        
        // Check against other objects on that map
        const minDistance = 64 * resolutionScale; // Minimum distance between spirits
        const objects = this.game.objectManager.getObjectsForMap(mapId);
        
        for (const obj of objects) {
            const dx = (obj.x * resolutionScale) - x;
            const dy = (obj.y * resolutionScale) - y;
            if (Math.sqrt(dx*dx + dy*dy) < minDistance) return true;
        }
        
        return false;
    }

    /**
     * Invalidate and rebuild spawn caches for all active maps
     * Called by EditorManager when painting spawn zones
     */
    invalidateSpawnZoneCache() {
        console.log('[SpawnManager] Invalidating spawn zone cache...');
        for (const [mapId, config] of this.activeMaps) {
            const mapData = this.game.mapManager.maps[mapId];
            if (!mapData) continue;
            
            const spawnLayer = this.game.editorManager.getSpawnLayer(mapId);
            config.spawnZoneCache = this.buildSpawnZoneCache(mapId, spawnLayer, mapData);
            console.log(`[SpawnManager] Rebuilt cache for map ${mapId}: ${config.spawnZoneCache.length} points`);
        }
    }

    /**
     * Refresh spawns for a map (e.g. after editing spawn zones)
     */
    refreshMap(mapId) {
        this.deactivateMap(mapId);
        this.activateMap(mapId);
    }

    /**
     * Build spawn zone cache
     */
    buildSpawnZoneCache(mapId, spawnLayer, mapData) {
        const spawnPoints = [];
        const sampleRate = 32; // Coarser grid for performance

        if (mapData.zones) {
            const resolutionScale = this.game.resolutionScale || 1.0;

            for (const zone of mapData.zones) {
                if (zone.type !== 'spawn') continue;
                
                const scaledPoints = zone.points.map(p => ({
                    x: p.x * resolutionScale,
                    y: p.y * resolutionScale
                }));
                
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                scaledPoints.forEach(p => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });
                
                for (let y = minY; y <= maxY; y += sampleRate) {
                    for (let x = minX; x <= maxX; x += sampleRate) {
                        if (this.isPointInPolygon({x, y}, scaledPoints)) {
                            spawnPoints.push({x, y});
                        }
                    }
                }
            }
        }

        // 2. Check Painted Zones (if layer exists)
        if (spawnLayer) {
            const canvasWidth = spawnLayer.width;
            const canvasHeight = spawnLayer.height;
            
            if (canvasWidth > 0 && canvasHeight > 0) {
                const ctx = spawnLayer.getContext('2d');
                // Only try to get image data if context exists
                if (ctx) {
                    try {
                        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                        const pixels = imageData.data;
                        
                        for (let cy = 0; cy < canvasHeight; cy += sampleRate) {
                            for (let cx = 0; cx < canvasWidth; cx += sampleRate) {
                                const index = (cy * canvasWidth + cx) * 4;
                                const r = pixels[index];
                                const g = pixels[index + 1];
                                const b = pixels[index + 2];
                                const a = pixels[index + 3];
                                
                                // Check if pixel is blue (spawn zone color)
                                // Robust check: Blue channel is significantly stronger than Red and Green
                                const isBlue = (b > r + 50 && b > g + 50 && a > 128);
                                
                                if (isBlue) {
                                    spawnPoints.push({ x: cx, y: cy });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[SpawnManager] Failed to read spawn layer data:', e);
                    }
                }
            }
        }

        return spawnPoints;
    }

    isPointInPolygon(point, vs) {
        let x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            let xi = vs[i].x, yi = vs[i].y;
            let xj = vs[j].x, yj = vs[j].y;
            let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    /**
     * Remove a specific spirit from the active spawns
     * Called by BattleSystem when a spirit is defeated
     * @param {Spirit} spirit - The spirit to remove
     */
    removeSpirit(spirit) {
        if (!spirit) return;
        
        // Find which map this spirit belongs to
        for (const [mapId, config] of this.activeMaps) {
            const index = config.spirits.findIndex(s => s.id === spirit.id);
            if (index !== -1) {
                // Remove from spawn manager's tracking
                config.spirits.splice(index, 1);
                
                // Remove from object manager
                this.game.objectManager.removeObject(mapId, spirit.id);
                
                console.log(`[SpawnManager] Removed spirit ${spirit.name} (${spirit.id}) from map ${mapId}`);
                return;
            }
        }
        
        console.warn(`[SpawnManager] Could not find spirit ${spirit?.id} to remove`);
    }
    
    // Legacy support / Helper
    clearSpawns() {
        this.clearAllSpawns();
    }

    /**
     * Clear all spawn data (used for game reset)
     */
    clear() {
        this.clearAllSpawns();
        this.activeMaps.clear();
        console.log('[SpawnManager] Full reset complete');
    }
}

// Export for global access
window.SpawnManager = SpawnManager;