/**
 * SaveGameManager - Handles save/load functionality
 * Manages multiple save slots with metadata (date, playtime, location, etc.)
 */
class SaveGameManager {
    constructor() {
        this.maxSaveSlots = 10; // Number of save slots available
        this.saveKeyPrefix = 'rpg-game-save-';
        this.metadataKey = 'rpg-game-save-metadata';
    }

    /**
     * Get all save game metadata sorted by date (newest first)
     */
    getAllSaves() {
        try {
            const metadataJson = localStorage.getItem(this.metadataKey);
            if (!metadataJson) return [];
            
            const metadata = JSON.parse(metadataJson);
            // Sort by timestamp, newest first
            return metadata.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to load save metadata:', error);
            return [];
        }
    }

    /**
     * Get the most recent save (for "Continue" button)
     */
    getLatestSave() {
        const saves = this.getAllSaves();
        return saves.length > 0 ? saves[0] : null;
    }

    /**
     * Check if there are any saves available
     */
    hasSaves() {
        return this.getAllSaves().length > 0;
    }

    /**
     * Save current game state
     * Returns the save slot ID
     */
    saveGame(game, saveName = null) {
        try {
            // Generate save ID
            const saveId = Date.now();
            const slotKey = this.saveKeyPrefix + saveId;

            // Create save data
            const saveData = {
                // Player data
                player: {
                    x: game.player.x,
                    y: game.player.y,
                    direction: game.player.direction,
                    spriteSrc: game.player.spriteSrc
                },
                
                // Map data
                currentMapId: game.currentMapId,
                
                // Inventory (if we have one)
                inventory: game.inventoryManager ? {
                    items: game.inventoryManager.inventory,
                    gold: game.inventoryManager.gold
                } : null,
                
                // Game time/stats
                playtime: game.playtime || 0,
                
                // Interactive objects state (opened chests, etc.)
                interactiveObjects: this.serializeInteractiveObjects(game),
                
                // Settings
                settings: game.settings
            };

            // Save the game data
            localStorage.setItem(slotKey, JSON.stringify(saveData));

            // Update metadata
            this.updateMetadata(saveId, {
                id: saveId,
                name: saveName || this.generateSaveName(game),
                timestamp: Date.now(),
                mapId: game.currentMapId,
                mapName: this.getMapName(game.currentMapId),
                playtime: saveData.playtime,
                playerLevel: game.player.level || 1, // If we add levels later
                gold: saveData.inventory ? saveData.inventory.gold : 0
            });

            console.log('✅ Game saved successfully:', saveId);
            return saveId;
        } catch (error) {
            console.error('❌ Failed to save game:', error);
            return null;
        }
    }

    /**
     * Load a saved game
     * Returns a Promise that resolves when the game is fully loaded
     */
    async loadGame(saveId, game) {
        try {
            const slotKey = this.saveKeyPrefix + saveId;
            const saveDataJson = localStorage.getItem(slotKey);
            
            if (!saveDataJson) {
                console.error('Save file not found:', saveId);
                return false;
            }

            const saveData = JSON.parse(saveDataJson);

            // Set map ID first (before loading map)
            if (saveData.currentMapId) {
                game.currentMapId = saveData.currentMapId;
            }

            // Load the map (this will trigger map loading with proper BGM/ambience)
            await game.loadMap(game.currentMapId);

            // Restore player position and state AFTER map is loaded
            if (saveData.player) {
                game.player.x = saveData.player.x;
                game.player.y = saveData.player.y;
                game.player.direction = saveData.player.direction;
            }

            // Restore inventory
            if (saveData.inventory && game.inventoryManager) {
                game.inventoryManager.inventory = saveData.inventory.items || [];
                game.inventoryManager.gold = saveData.inventory.gold || 0;
            }

            // Restore playtime
            if (saveData.playtime !== undefined) {
                game.playtime = saveData.playtime;
            }

            // Restore interactive objects state
            if (saveData.interactiveObjects) {
                this.deserializeInteractiveObjects(saveData.interactiveObjects, game);
            }

            // Restore settings
            if (saveData.settings) {
                game.settings = { ...game.settings, ...saveData.settings };
                game.applyAudioSettings();
            }

            console.log('✅ Game loaded successfully:', saveId);
            return true;
        } catch (error) {
            console.error('❌ Failed to load game:', error);
            return false;
        }
    }

    /**
     * Delete a save file
     */
    deleteSave(saveId) {
        try {
            const slotKey = this.saveKeyPrefix + saveId;
            localStorage.removeItem(slotKey);
            
            // Remove from metadata
            const metadata = this.getAllSaves();
            const updatedMetadata = metadata.filter(save => save.id !== saveId);
            localStorage.setItem(this.metadataKey, JSON.stringify(updatedMetadata));
            
            console.log('✅ Save deleted:', saveId);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete save:', error);
            return false;
        }
    }

    /**
     * Update save metadata
     */
    updateMetadata(saveId, saveInfo) {
        try {
            let metadata = this.getAllSaves();
            
            // Remove old entry if it exists
            metadata = metadata.filter(save => save.id !== saveId);
            
            // Add new entry
            metadata.push(saveInfo);
            
            // Limit to max save slots
            if (metadata.length > this.maxSaveSlots) {
                // Sort by timestamp and keep only the most recent
                metadata.sort((a, b) => b.timestamp - a.timestamp);
                const removed = metadata.slice(this.maxSaveSlots);
                metadata = metadata.slice(0, this.maxSaveSlots);
                
                // Delete the oldest save files
                removed.forEach(save => {
                    localStorage.removeItem(this.saveKeyPrefix + save.id);
                });
            }
            
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    }

    /**
     * Generate a default save name
     */
    generateSaveName(game) {
        const mapName = this.getMapName(game.currentMapId);
        const date = new Date();
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return `${mapName} - ${timeStr}`;
    }

    /**
     * Get human-readable map name from MapManager
     */
    getMapName(mapId) {
        const mapData = this.game.mapManager.getMapData(mapId);
        return mapData?.name || mapId;
    }

    /**
     * Serialize interactive objects state (opened chests, etc.)
     */
    serializeInteractiveObjects(game) {
        const state = {};
        
        if (game.interactiveObjectManager) {
            // Get all maps that have interactive objects
            const allMaps = game.interactiveObjectManager.objects;
            
            for (const mapId in allMaps) {
                state[mapId] = [];
                const objects = allMaps[mapId];
                
                objects.forEach((obj, index) => {
                    // Save state of objects that can change (like chests)
                    if (obj.type === 'chest') {
                        state[mapId].push({
                            index: index,
                            type: obj.type,
                            opened: obj.opened || false
                        });
                    }
                });
            }
        }
        
        return state;
    }

    /**
     * Deserialize interactive objects state
     */
    deserializeInteractiveObjects(state, game) {
        if (!game.interactiveObjectManager) return;
        
        for (const mapId in state) {
            const objects = game.interactiveObjectManager.objects[mapId];
            if (!objects) continue;
            
            state[mapId].forEach(savedObj => {
                const obj = objects[savedObj.index];
                if (obj && obj.type === savedObj.type) {
                    if (savedObj.opened !== undefined) {
                        obj.opened = savedObj.opened;
                        // Update sprite if chest was opened
                        if (obj.opened && obj.openSpriteSrc) {
                            obj.loadSprite(obj.openSpriteSrc);
                        }
                    }
                }
            });
        }
    }

    /**
     * Format playtime for display (hours:minutes)
     */
    formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    /**
     * Format timestamp for display
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
