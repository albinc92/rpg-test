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
        
        // Respawn system for continuous rotation
        this.respawnQueue = []; // Queue of spirits waiting to respawn: {spiritId, respawnTime}
        this.respawnDelay = 30000; // 30 seconds delay before respawning (configurable per map)
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
        this.respawnDelay = mapData.respawnDelay || 30000; // Default 30 seconds (configurable per map)
        
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
        const hasVectorZones = mapData.zones && mapData.zones.some(z => z.type === 'spawn');
        
        if (!spawnLayer && !hasVectorZones) {
            console.warn(`[SpawnManager] ⚠️ No spawn zones found for map: ${mapId}. Create vector spawn zones or paint them.`);
            this.enabled = false;
            return;
        }
        
        console.log(`[SpawnManager] 🗺️ Found spawn zones for map ${mapId}`);
        
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
     * Update spawn manager - maintain spawn density and handle respawns
     */
    update(deltaTime) {
        if (!this.enabled || !this.spawnTable.length) return;
        
        const now = Date.now();
        
        // Process respawn queue continuously (no interval needed for time-based checks)
        this.processRespawnQueue(now);
        
        // Only check spawns every X seconds
        if (now - this.lastSpawnCheck < this.spawnCheckInterval) {
            return;
        }
        
        this.lastSpawnCheck = now;
        
        // Clean up dead/removed spirits (this detects captures/defeats)
        this.cleanUpSpirits();
        
        // Count current active spirits
        const currentCount = this.allSpawnedSpirits.length;
        
        // Get current time info
        const currentTime = this.game.dayNightCycle?.timeOfDay || 12;
        const timeFormatted = `${Math.floor(currentTime).toString().padStart(2, '0')}:${Math.floor((currentTime % 1) * 60).toString().padStart(2, '0')}`;
        
        // Spawn spirits to reach density (initial spawns + respawns)
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
     * Process the respawn queue - respawn spirits that are ready
     */
    processRespawnQueue(now) {
        // Check each queued spirit for respawn
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const queueEntry = this.respawnQueue[i];
            
            if (now >= queueEntry.respawnTime) {
                // Time to respawn this spirit!
                console.log(`[SpawnManager] ♻️ Respawning ${queueEntry.spiritId} after cooldown`);
                this.spawnSpirit(queueEntry.spiritId);
                
                // Remove from queue
                this.respawnQueue.splice(i, 1);
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
     * Clean up dead/removed spirits from tracking and queue them for respawn
     */
    cleanUpSpirits() {
        const now = Date.now();
        const mapObjects = this.game.objectManager.getObjectsForMap(this.currentMapId);
        
        // Filter out removed spirits and queue them for respawn
        this.allSpawnedSpirits = this.allSpawnedSpirits.filter(spirit => {
            const stillExists = mapObjects.includes(spirit);
            
            if (!stillExists) {
                // Spirit was removed (captured/defeated) - queue for respawn
                const spiritId = spirit.spiritId || spirit.templateId;
                if (spiritId) {
                    const respawnTime = now + this.respawnDelay;
                    const respawnMinutes = (this.respawnDelay / 1000 / 60).toFixed(1);
                    
                    console.log(`[SpawnManager] 💀 ${spirit.name || spiritId} was removed - queuing for respawn in ${respawnMinutes}min`);
                    
                    this.respawnQueue.push({
                        spiritId: spiritId,
                        respawnTime: respawnTime
                    });
                }
            }
            
            return stillExists;
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
        
        console.log(`[SpawnManager] 🔍 Coordinate conversion:`);
        console.log(`  - Scaled position from cache: (${Math.round(scaledPosition.x)}, ${Math.round(scaledPosition.y)})`);
        console.log(`  - mapScale: ${mapScale}, resolutionScale: ${resolutionScale}, combined: ${combinedScale}`);
        console.log(`  - Unscaled for spirit creation: (${Math.round(unscaledX)}, ${Math.round(unscaledY)})`)
        
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

        // Mark as dynamic spawn so it doesn't get saved by EditorManager
        spirit.isDynamicSpawn = true;
        
        // Add to ObjectManager (not npcs array - using new architecture)
        this.game.objectManager.addObject(this.currentMapId, spirit);
        
        // Set spawn zone boundaries so spirit can respect them while roaming
        spirit.spawnZoneBounds = this.calculateSpawnZoneBounds();
        
        // Track spawned spirit
        this.allSpawnedSpirits.push(spirit);
        
        const template = this.game.spiritRegistry.getTemplate(spiritId);
        console.log(`[SpawnManager] ✨ Spawned ${template.name} at scaled(${Math.round(scaledPosition.x)}, ${Math.round(scaledPosition.y)}) / unscaled(${Math.round(unscaledX)}, ${Math.round(unscaledY)}) [Total: ${this.allSpawnedSpirits.length}/${this.spawnDensity}]`);
    }

    /**
     * Calculate spawn zone boundaries from cached spawn points
     * Returns { minX, maxX, minY, maxY } in scaled coordinates
     */
    calculateSpawnZoneBounds() {
        if (!this.spawnZoneCache || this.spawnZoneCache.length === 0) {
            return null;
        }
        
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        
        // Find min/max of all spawn points
        this.spawnZoneCache.forEach(point => {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
        });
        
        // Add some padding (50 pixels) so spirits don't hit the exact edge
        const padding = 50;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
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
        const spawnPoints = [];
        const sampleRate = 16;

        // 1. Check Vector Zones
        if (mapData.zones) {
            // Calculate scale to convert stored unscaled coordinates to world coordinates
            const mapScale = mapData.scale || 1.0;
            const resolutionScale = this.game.resolutionScale || 1.0;
            const totalScale = mapScale * resolutionScale;

            for (const zone of mapData.zones) {
                if (zone.type !== 'spawn') continue;
                
                // Convert zone points to scaled for sampling (matching painted layer coordinates)
                const scaledPoints = zone.points.map(p => ({
                    x: p.x * totalScale,
                    y: p.y * totalScale
                }));
                
                // Get bounding box of zone to minimize checks
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                scaledPoints.forEach(p => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });
                
                // Snap to sample grid
                minX = Math.floor(minX / sampleRate) * sampleRate;
                minY = Math.floor(minY / sampleRate) * sampleRate;
                
                for (let y = minY; y <= maxY; y += sampleRate) {
                    for (let x = minX; x <= maxX; x += sampleRate) {
                        if (this.pointInPolygon({x, y}, scaledPoints)) {
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
            
            // Get all pixel data at once
            const ctx = spawnLayer.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            const pixels = imageData.data;
            
            for (let cy = 0; cy < canvasHeight; cy += sampleRate) {
                for (let cx = 0; cx < canvasWidth; cx += sampleRate) {
                    const index = (cy * canvasWidth + cx) * 4;
                    const r = pixels[index];
                    const g = pixels[index + 1];
                    const b = pixels[index + 2];
                    const a = pixels[index + 3];
                    
                    // Check if pixel is blue
                    const isBlue = (r < 50 && g > 50 && g < 150 && b > 200 && a > 128);
                    
                    if (isBlue) {
                        spawnPoints.push({ x: cx, y: cy });
                    }
                }
            }
        }
        
        this.spawnZoneCache = spawnPoints;
        this.spawnZoneCacheValid = true;
        
        const endTime = performance.now();
        console.log(`[SpawnManager] ✅ Cached ${spawnPoints.length} spawn zone positions in ${(endTime - startTime).toFixed(2)}ms`);
        
        if (spawnPoints.length > 0) {
            // Find bounds of spawn points for debugging
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            spawnPoints.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
            console.log(`[SpawnManager] 📍 Spawn zone bounds: X(${minX} to ${maxX}), Y(${minY} to ${maxY})`);
        }
    }
    
    /**
     * Find a valid spawn position within spawn zones (using cached positions)
     * Now checks the full collision box to prevent spirits from spawning stuck
     */
    findValidSpawnPosition(spiritId, maxAttempts = 50) {
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
            
            // Check if spirit's collision box fits at this position
            if (this.hasCollisionAt(x, y, spiritId)) {
                continue;
            }
            
            // Valid position found - collision box fits!
            return { x, y };
        }
        
        // If still no valid position after maxAttempts, try center points without offset
        console.log(`[SpawnManager] ⚠️ No valid position found with offset, trying exact spawn points...`);
        for (let attempt = 0; attempt < 20; attempt++) {
            const randomIndex = Math.floor(Math.random() * this.spawnZoneCache.length);
            const spawnPoint = this.spawnZoneCache[randomIndex];
            
            // Try exact spawn point without offset
            if (!this.hasCollisionAt(spawnPoint.x, spawnPoint.y, spiritId)) {
                console.log(`[SpawnManager] ✓ Found valid position at exact spawn point`);
                return { x: spawnPoint.x, y: spawnPoint.y };
            }
        }
        
        // Last resort: return null to skip this spawn
        console.warn(`[SpawnManager] ❌ Could not find valid spawn position for ${spiritId} after ${maxAttempts + 20} attempts - skipping spawn`);
        return null;
    }



    /**
     * Check if there's a collision at the given position
     * Now checks the spirit's full collision box against painted collision zones and other objects
     */
    hasCollisionAt(x, y, spiritId) {
        // Get spirit template to determine collision box size
        const template = this.game.spiritRegistry?.getTemplate(spiritId);
        
        // Estimate spirit collision box size (spirits typically 64-128px with 30% collision)
        // Use conservative estimate if template not available yet
        const estimatedSpriteSize = 96; // Average spirit size
        const collisionPercent = 0.3; // Spirits use 30% collision area
        const collisionRadius = (estimatedSpriteSize * collisionPercent) / 2; // Half width for radius
        
        // Get map scale factors for proper coordinate comparison
        const mapData = this.game.mapManager.maps[this.currentMapId];
        const mapScale = mapData?.scale || 1.0;
        const resolutionScale = this.game.resolutionScale || 1.0;
        const combinedScale = mapScale * resolutionScale;
        
        // 1. Check painted collision zones (red pixels) in collision layer
        const collisionLayer = this.game.editorManager?.getCollisionLayer(this.currentMapId);
        if (collisionLayer) {
            if (!collisionLayer._cachedImageData || collisionLayer._dataDirty) {
                const ctx = collisionLayer.getContext('2d');
                collisionLayer._cachedImageData = ctx.getImageData(0, 0, collisionLayer.width, collisionLayer.height);
                collisionLayer._dataDirty = false;
            }
            
            const imageData = collisionLayer._cachedImageData;
            const data = imageData.data;
            const canvasWidth = collisionLayer.width;
            
            // Check multiple points around the spirit's collision circle
            const checkPoints = 8; // Sample 8 points around the circle
            for (let i = 0; i < checkPoints; i++) {
                const angle = (i / checkPoints) * Math.PI * 2;
                const checkX = Math.round(x + Math.cos(angle) * collisionRadius);
                const checkY = Math.round(y + Math.sin(angle) * collisionRadius);
                
                // Also check center point
                const pointsToCheck = i === 0 ? [{ x, y }, { x: checkX, y: checkY }] : [{ x: checkX, y: checkY }];
                
                for (const point of pointsToCheck) {
                    // Bounds check
                    if (point.x < 0 || point.x >= canvasWidth || point.y < 0 || point.y >= collisionLayer.height) {
                        return true; // Out of bounds = collision
                    }
                    
                    const pixelIndex = (Math.floor(point.y) * canvasWidth + Math.floor(point.x)) * 4;
                    const r = data[pixelIndex];
                    const g = data[pixelIndex + 1];
                    const b = data[pixelIndex + 2];
                    const a = data[pixelIndex + 3];
                    
                    // Check if pixel is red (collision zone)
                    const isRed = (r > 200 && g < 50 && b < 50 && a > 128);
                    if (isRed) {
                        return true; // Collision with painted zone
                    }
                }
            }
        }
        
        // 2. Check collision with all objects on current map (using ObjectManager)
        const minObjectDistance = collisionRadius + 32; // Spirit radius + safety margin
        const mapObjects = this.game.objectManager.getObjectsForMap(this.currentMapId);
        for (const obj of mapObjects) {
            // Skip objects that don't block movement
            if (!obj.blocksMovement) continue;
            
            // Get object's scaled position for comparison
            const objX = obj.x * combinedScale;
            const objY = obj.y * combinedScale;
            
            const dx = objX - x;
            const dy = objY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minObjectDistance) {
                return true; // Too close to another object
            }
        }
        
        // 3. Check collision with player (give extra space)
        if (this.game.player) {
            const playerX = this.game.player.x * combinedScale;
            const playerY = this.game.player.y * combinedScale;
            
            const dx = playerX - x;
            const dy = playerY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const minPlayerDistance = collisionRadius + 64; // Extra space around player
            if (distance < minPlayerDistance) {
                return true; // Too close to player
            }
        }
        
        return false; // No collision detected
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
     * Clear all spawned spirits and respawn queue (called on map change)
     */
    clearSpawns() {
        console.log(`[SpawnManager] Clearing ${this.allSpawnedSpirits.length} spawned spirits and ${this.respawnQueue.length} queued respawns`);
        
        // Remove spawned spirits from ObjectManager
        this.allSpawnedSpirits.forEach(spirit => {
            this.game.objectManager.removeObject(this.currentMapId, spirit.id);
        });
        
        this.allSpawnedSpirits = [];
        this.respawnQueue = []; // Clear respawn queue on map change
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
        
        const queuedCounts = {};
        this.respawnQueue.forEach(entry => {
            queuedCounts[entry.spiritId] = (queuedCounts[entry.spiritId] || 0) + 1;
        });
        
        return {
            enabled: this.enabled,
            mapId: this.currentMapId,
            spawnDensity: this.spawnDensity,
            respawnDelay: this.respawnDelay,
            totalSpawned: this.allSpawnedSpirits.length,
            queuedRespawns: this.respawnQueue.length,
            byType: spiritCounts,
            queuedByType: queuedCounts
        };
    }

    /**
     * Force spawn a specific spirit (for testing)
     */
    forceSpawn(spiritId) {
        console.log(`[SpawnManager] Force spawning: ${spiritId}`);
        this.spawnSpirit(spiritId);
    }

    /**
     * Invalidate spawn zone cache (call when spawn zones are modified)
     */
    invalidateSpawnZoneCache() {
        console.log(`[SpawnManager] 🔄 Invalidating spawn zone cache`);
        this.spawnZoneCacheValid = false;
        this.spawnZoneCache = null;
        
        // If we have a current map, try to rebuild cache
        if (this.currentMapId) {
            const spawnLayer = this.game.editorManager.getSpawnLayer(this.currentMapId);
            if (spawnLayer) {
                this.buildSpawnZoneCache(this.currentMapId, spawnLayer);
                
                // If spawn zones now exist AND we have a spawn table, enable the system
                if (!this.enabled && this.spawnZoneCache && this.spawnZoneCache.length > 0) {
                    const mapData = this.game.mapManager.maps[this.currentMapId];
                    if (mapData && mapData.spawnTable && mapData.spawnTable.length > 0) {
                        console.log(`[SpawnManager] ✅ Spawn zones now available - enabling spawn system`);
                        this.enabled = true;
                        this.lastSpawnCheck = 0; // Force immediate spawn check
                    }
                }
            }
        }
    }

    /**
     * Check if a point is inside a polygon
     */
    pointInPolygon(point, vs) {
        var x = point.x, y = point.y;
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i].x, yi = vs[i].y;
            var xj = vs[j].x, yj = vs[j].y;
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
