/**
 * NPC System for RPG Game
 * Contains all NPC definitions and related functionality
 */

class NPCManager {
    constructor() {
        this.npcRegistry = new Map(); // Registry of all NPCs by ID
        this.dialogue = {
            active: false,
            currentNPC: null,
            currentMessage: '',
            messageIndex: 0
        };
        
        // Initialize the NPC registry
        this.initializeNPCRegistry();
    }

    /**
     * Initialize the NPC registry with all NPC definitions
     */
    initializeNPCRegistry() {
        // Sage NPC - appears on map 0-0
        this.registerNPC({
            id: 'sage',
            type: 'dialogue',
            mapId: '0-0',
            x: 1000,
            y: 600,
            width: 96,
            height: 96,
            spriteSrc: 'assets/npc/sage-0.png',
            direction: 'right', // 'left' or 'right'
            messages: [
                "Greetings, young adventurer!",
                "Welcome to this mystical realm.",
                "Press SPACE or ENTER to continue dialogue.",
                "Use WASD to move around the world.",
                "May your journey be filled with wonder!"
            ]
        });

        // Portal from map 0-0 to 0-1
        this.registerNPC({
            id: 'portal_to_0-1',
            type: 'portal',
            mapId: '0-0',
            x: 867,
            y: 156,
            width: 80,
            height: 80,
            spriteSrc: 'assets/npc/navigation-0.png',
            rotation: 310,
            targetMap: '0-1',
            targetX: 535,
            targetY: 865,
            pulseSpeed: 2.0,
            baseAlpha: 0.7,
            pulseAlpha: 0.3
        });

        // Portal from map 0-1 to 0-0
        this.registerNPC({
            id: 'portal_to_0-0',
            type: 'portal',
            mapId: '0-1',
            x: 475,
            y: 960,
            width: 80,
            height: 80,
            spriteSrc: 'assets/npc/navigation-0.png',
            rotation: 225,
            targetMap: '0-0',
            targetX: 900,
            targetY: 200,
            pulseSpeed: 2.0,
            baseAlpha: 0.7,
            pulseAlpha: 0.3
        });

        // Door portal from map 0-1 to shop
        this.registerNPC({
            id: 'portal_to_shop',
            type: 'portal',
            mapId: '0-1',
            x: 695,
            y: 515,
            width: 80,
            height: 80,
            spriteSrc: 'assets/npc/door-0.png',
            rotation: 0,
            targetMap: '0-1-shop',
            targetX: 400,
            targetY: 300,
            pulseSpeed: 2.0,
            baseAlpha: 0.7,
            pulseAlpha: 0.3
        });

        // Return portal from shop to map 0-1
        this.registerNPC({
            id: 'portal_from_shop',
            type: 'portal',
            mapId: '0-1-shop',
            x: 400,
            y: 200,
            width: 80,
            height: 80,
            spriteSrc: 'assets/npc/door-0.png',
            rotation: 0,
            targetMap: '0-1',
            targetX: 695,
            targetY: 600,
            pulseSpeed: 2.0,
            baseAlpha: 0.7,
            pulseAlpha: 0.3
        });

        // Shop Keeper NPC
        this.registerNPC({
            id: 'shopkeeper',
            type: 'shop',
            mapId: '0-1-shop',
            x: 600,
            y: 400,
            width: 96,
            height: 96,
            spriteSrc: 'assets/npc/merchant-0.png',
            direction: 'left',
            messages: [
                "Welcome to my shop!",
                "I buy and sell all kinds of items.",
                "What would you like to do?"
            ],
            shop: {
                buyItems: [
                    { id: 'health_potion', price: 25, stock: 10 },
                    { id: 'mana_potion', price: 30, stock: 8 },
                    { id: 'iron_sword', price: 100, stock: 5 },
                    { id: 'leather_armor', price: 80, stock: 5 },
                    { id: 'iron_ore', price: 15, stock: 20 }
                ],
                sellMultiplier: 0.5 // Sells items for 50% of their value
            }
        });

        // Register treasure chests using the chest helper method
        this.createTreasureChest('treasure_chest_1', '0-0', 1200, 400, {
            gold: 75,
            items: [
                'health_potion:3',
                'iron_sword:1',
                'iron_ore:5'
            ]
        });

        this.createTreasureChest('treasure_chest_2', '0-1', 300, 700, {
            gold: 150,
            items: [
                'mana_potion:2',
                'leather_armor:1',
                'magic_scroll:1',
                'iron_ore:8'
            ]
        });

        // More treasure chests for testing
        this.createTreasureChest('treasure_chest_3', '0-0', 500, 800, {
            gold: 50,
            items: [
                'health_potion:2',
                'mana_potion:1'
            ]
        });

        this.createTreasureChest('treasure_chest_4', '0-1', 800, 300, {
            gold: 200,
            items: [
                'iron_sword:1',
                'leather_armor:1',
                'iron_ore:15'
            ]
        });

        // Create Sylphie - the roaming spirit NPC
        this.createRoamingSpirit('sylphie', '0-0', 600, 400, {
            speed: 0.6,
            roamRadius: 180,
            pauseTime: 2500,
            name: 'Sylphie',
            respawnDelay: 3000 // 30 seconds respawn time
        });
    }

    /**
     * Get all NPCs organized by map ID (for compatibility with game.js)
     * @returns {object} NPCs organized by map ID
     */
    initializeAllNPCs() {
        const npcsByMap = {};
        
        // Group NPCs by their mapId
        for (const npc of this.npcRegistry.values()) {
            if (!npcsByMap[npc.mapId]) {
                npcsByMap[npc.mapId] = [];
            }
            npcsByMap[npc.mapId].push(npc);
        }
        
        return npcsByMap;
    }

    /**
     * Register a new NPC in the registry
     * @param {object} npcData - The NPC data object
     */
    registerNPC(npcData) {
        // Create sprite object if spriteSrc is provided
        if (npcData.spriteSrc) {
            npcData.sprite = new Image();
            npcData.sprite.src = npcData.spriteSrc;
        }
        
        this.npcRegistry.set(npcData.id, npcData);
    }

    /**
     * Remove an NPC from the registry
     * @param {string} npcId - The ID of the NPC to remove
     */
    removeNPC(npcId) {
        this.npcRegistry.delete(npcId);
    }

    /**
     * Get all NPCs for a specific map
     * @param {string} mapId - The map ID to get NPCs for
     * @returns {array} Array of NPCs for the specified map
     */
    getNPCsForMap(mapId) {
        return Array.from(this.npcRegistry.values()).filter(npc => npc.mapId === mapId);
    }

    /**
     * Find an NPC by ID in a specific map
     * @param {string} mapId - The map ID to search in
     * @param {string} npcId - The ID of the NPC to find
     * @returns {object|null} The NPC object or null if not found
     */
    findNPC(mapId, npcId) {
        return this.npcRegistry.get(npcId) || null;
    }

    /**
     * Check for NPC interactions within a given distance
     * @param {object} player - Player object with x, y coordinates
     * @param {string} mapId - Current map ID
     * @param {number} interactionDistance - Maximum distance for interaction
     * @returns {object|null} The NPC that can be interacted with, or null
     */
    checkNearbyNPCs(player, mapId, interactionDistance = 120) {
        const mapNPCs = this.getNPCsForMap(mapId);
        
        for (let npc of mapNPCs) {
            const distance = Math.sqrt(
                Math.pow(player.x - npc.x, 2) + 
                Math.pow(player.y - npc.y, 2)
            );
            
            if (distance <= interactionDistance) {
                return npc;
            }
        }
        
        return null;
    }

    /**
     * Check for portal collisions (automatic teleportation)
     * @param {object} player - Player object with x, y, width, height
     * @param {string} mapId - Current map ID
     * @returns {object|null} Portal NPC if collision detected, null otherwise
     */
    checkPortalCollisions(player, mapId) {
        const mapNPCs = this.getNPCsForMap(mapId);
        
        for (let npc of mapNPCs) {
            if (npc.type === 'portal') {
                const distance = Math.sqrt(
                    Math.pow(player.x - npc.x, 2) + 
                    Math.pow(player.y - npc.y, 2)
                );
                
                // Check if player is touching the portal (collision detection)
                const collisionDistance = (npc.width + player.width) / 4; // Smaller collision area
                if (distance <= collisionDistance) {
                    return npc;
                }
            }
        }
        
        return null;
    }

    /**
     * Start dialogue with an NPC
     * @param {object} npc - The NPC to start dialogue with
     * @param {function} soundCallback - Optional callback to play sound effect
     */
    startDialogue(npc, soundCallback = null) {
        this.dialogue.active = true;
        this.dialogue.currentNPC = npc;
        this.dialogue.messageIndex = 0;
        this.dialogue.currentMessage = npc.messages[0];
        
        if (soundCallback) {
            soundCallback();
        }
    }

    /**
     * Advance to the next dialogue message
     * @param {function} soundCallback - Optional callback to play sound effect
     * @returns {boolean} True if dialogue continues, false if dialogue ended
     */
    nextDialogueMessage(soundCallback = null) {
        this.dialogue.messageIndex++;
        
        if (this.dialogue.messageIndex >= this.dialogue.currentNPC.messages.length) {
            const endedNPC = this.endDialogue();
            return { continues: false, npc: endedNPC };
        } else {
            this.dialogue.currentMessage = this.dialogue.currentNPC.messages[this.dialogue.messageIndex];
            if (soundCallback) {
                soundCallback();
            }
            return { continues: true, npc: null };
        }
    }

    /**
     * End the current dialogue
     * @returns {object|null} The NPC that was in dialogue, for post-dialogue actions
     */
    endDialogue() {
        const currentNPC = this.dialogue.currentNPC;
        
        this.dialogue.active = false;
        this.dialogue.currentNPC = null;
        this.dialogue.currentMessage = '';
        this.dialogue.messageIndex = 0;
        
        return currentNPC;
    }

    /**
     * Get the current dialogue state
     * @returns {object} Current dialogue state
     */
    getDialogueState() {
        return { ...this.dialogue };
    }

    /**
     * Check if dialogue is currently active
     * @returns {boolean} True if dialogue is active
     */
    isDialogueActive() {
        return this.dialogue.active;
    }

    /**
     * Get NPC states for saving (e.g., chest looted status)
     * @returns {object} Object with NPC states
     */
    getNPCStates() {
        const states = {};
        
        this.npcRegistry.forEach((npc, id) => {
            // Save states for NPCs that can change
            if (npc.type === 'chest') {
                states[id] = {
                    looted: npc.looted || false
                };
            }
            // Add other NPC types that need state saving here
        });
        
        return states;
    }

    /**
     * Restore NPC states from saved data
     * @param {object} states - Saved NPC states
     */
    restoreNPCStates(states) {
        if (!states) return;
        
        Object.entries(states).forEach(([npcId, state]) => {
            const npc = this.npcRegistry.get(npcId);
            if (npc && npc.type === 'chest') {
                npc.looted = state.looted || false;
                // Switch to open sprite if chest was looted
                if (npc.looted && npc.openSprite && npc.openSprite.complete) {
                    npc.sprite = npc.openSprite;
                }
            }
            // Add other NPC types that need state restoration here
        });
        
        console.log('NPC states restored');
    }

    /**
     * Helper method to create treasure chests easily
     * @param {string} id - Unique chest ID
     * @param {string} mapId - Map where chest appears
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} loot - Loot configuration
     * @param {number} loot.gold - Gold amount
     * @param {array} loot.items - Array of item strings in format 'itemId:quantity'
     */
    createTreasureChest(id, mapId, x, y, loot = {}) {
        // Parse items from string format to object format
        const parsedItems = [];
        if (loot.items && Array.isArray(loot.items)) {
            loot.items.forEach(itemString => {
                const [itemId, quantityStr] = itemString.split(':');
                const quantity = parseInt(quantityStr) || 1;
                parsedItems.push({ id: itemId.trim(), quantity });
            });
        }

        // Create the chest NPC with both closed and open sprites
        const chestNPC = {
            id: id,
            type: 'chest',
            mapId: mapId,
            x: x,
            y: y,
            width: 96,
            height: 96,
            spriteSrc: 'assets/npc/chest-0.png',
            openSpriteSrc: 'assets/npc/chest-0-open.png',
            direction: 'right',
            looted: false,
            loot: {
                gold: loot.gold || 0,
                items: parsedItems
            }
        };

        // Load both sprites
        chestNPC.sprite = new Image();
        chestNPC.sprite.src = chestNPC.spriteSrc;
        
        chestNPC.openSprite = new Image();
        chestNPC.openSprite.src = chestNPC.openSpriteSrc;

        this.registerNPC(chestNPC);

        console.log(`Created treasure chest ${id} on map ${mapId} at (${x}, ${y})`);
    }

    /**
     * Helper method to create roaming spirit NPCs
     * @param {string} id - Unique spirit ID
     * @param {string} mapId - Map where spirit appears
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {object} config - Spirit configuration
     * @param {number} config.speed - Movement speed
     * @param {number} config.roamRadius - How far from spawn point they can roam
     * @param {number} config.pauseTime - How long to pause between movements (ms)
     * @param {string} config.name - Display name for the spirit
     * @param {string} config.battleScene - (Optional) Override battle scene for this specific spirit
     * @param {number} config.respawnDelay - How long before spirit respawns after fleeing (ms)
     */
    createRoamingSpirit(id, mapId, x, y, config = {}) {
        const spiritNPC = {
            id: id,
            type: 'spirit',
            mapId: mapId,
            x: x,
            y: y,
            width: 96,
            height: 96,
            spriteSrc: 'assets/npc/Spirits/Sylphie00.png',
            direction: 'right',
            name: config.name || 'Spirit',
            battleScene: config.battleScene, // Optional override - will use map's battleScene if not specified
            respawnDelay: config.respawnDelay || 30000, // Default 30 seconds
            
            // Roaming properties
            isRoaming: true,
            spawnX: x,
            spawnY: y,
            targetX: x,
            targetY: y,
            speed: config.speed || 0.5,
            roamRadius: config.roamRadius || 150,
            pauseTime: config.pauseTime || 2000,
            lastMoveTime: 0,
            isPaused: false,
            pauseStartTime: 0,
            
            // Visual properties for spirits
            baseAlpha: 0.7,
            pulseSpeed: 1.5,
            glowEffect: true
        };

        // Load spirit sprite
        spiritNPC.sprite = new Image();
        spiritNPC.sprite.src = spiritNPC.spriteSrc;

        this.registerNPC(spiritNPC);
        const battleInfo = spiritNPC.battleScene ? `with custom battle scene: ${spiritNPC.battleScene}` : 'using map default battle scene';
        console.log(`Created roaming spirit ${id} on map ${mapId} at (${x}, ${y}) ${battleInfo}`);
    }

    /**
     * Quick helper to create additional spirits
     * Battle scenes are now configured per map in maps.js
     * Call this method to easily add more spirits to different maps
     */
    addAdditionalSpirits() {
        // Example: Add more spirits to different maps
        // They will automatically use their map's configured battle scene
        // Uncomment and modify as needed:
        
        // this.createRoamingSpirit('forest_guardian', '0-1', 200, 400, {
        //     speed: 0.4,
        //     roamRadius: 120,
        //     pauseTime: 3000,
        //     name: 'Forest Guardian'
        //     // Will use map 0-1's battleScene (Forest-Battlescene-0)
        // });
        
        // this.createRoamingSpirit('mountain_wraith', '0-1', 800, 600, {
        //     speed: 0.8,
        //     roamRadius: 200,
        //     pauseTime: 1500,
        //     name: 'Mountain Wraith',
        //     battleScene: 'Mountain-Battlescene-0' // Optional: Override map default
        // });
    }

    /**
     * Update all roaming NPCs on the current map
     * @param {string} mapId - Current map ID
     * @param {number} deltaTime - Time elapsed since last update
     * @param {object} mapBounds - Map boundaries {width, height}
     */
    updateRoamingNPCs(mapId, deltaTime, mapBounds) {
        const mapNPCs = this.getNPCsForMap(mapId);
        const currentTime = Date.now();
        
        mapNPCs.forEach(npc => {
            if (npc.type === 'spirit' && npc.isRoaming) {
                this.updateSpiritMovement(npc, currentTime, mapBounds);
            }
        });
    }

    /**
     * Update movement for a single spirit NPC
     * @param {object} spirit - The spirit NPC to update
     * @param {number} currentTime - Current timestamp
     * @param {object} mapBounds - Map boundaries
     */
    updateSpiritMovement(spirit, currentTime, mapBounds) {
        // Check if spirit is currently paused
        if (spirit.isPaused) {
            if (currentTime - spirit.pauseStartTime >= spirit.pauseTime) {
                spirit.isPaused = false;
                this.setSpiritNewTarget(spirit, mapBounds);
            }
            return;
        }

        // Calculate distance to target
        const dx = spirit.targetX - spirit.x;
        const dy = spirit.targetY - spirit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If close to target, pause and set new target
        if (distance < 5) {
            spirit.isPaused = true;
            spirit.pauseStartTime = currentTime;
            return;
        }

        // Move towards target
        const moveDistance = spirit.speed;
        const moveX = (dx / distance) * moveDistance;
        const moveY = (dy / distance) * moveDistance;

        spirit.x += moveX;
        spirit.y += moveY;

        // Set direction based on movement
        spirit.direction = moveX > 0 ? 'right' : 'left';
    }

    /**
     * Set a new random target for a spirit within its roaming radius
     * @param {object} spirit - The spirit NPC
     * @param {object} mapBounds - Map boundaries
     */
    setSpiritNewTarget(spirit, mapBounds) {
        // Generate random angle and distance within roaming radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spirit.roamRadius;
        
        let newX = spirit.spawnX + Math.cos(angle) * distance;
        let newY = spirit.spawnY + Math.sin(angle) * distance;

        // Keep within map bounds
        const margin = spirit.width / 2;
        newX = Math.max(margin, Math.min(mapBounds.width - margin, newX));
        newY = Math.max(margin, Math.min(mapBounds.height - margin, newY));

        spirit.targetX = newX;
        spirit.targetY = newY;
    }
}

// Export for use in other files
window.NPCManager = NPCManager;
