/**
 * NPCManager - Manages all NPCs across maps
 */
class NPCManager {
    constructor() {
        this.npcs = {};
        this.roamingNPCs = {};
        this.dialogues = {};
        this.currentDialogue = null;
    }
    
    /**
     * Initialize all NPCs - coordinates initialization of all NPC types
     */
    initializeAllNPCs() {
        // Initialize empty map structure
        this.npcs = {
            '0-0': [],
            '0-1': []
        };
        this.roamingNPCs = {
            '0-0': [],
            '0-1': []
        };
        
        // Initialize each type of NPC
        this.initializeStaticNPCs();
        this.initializeMerchantNPCs();
        this.initializeRoamingNPCs();
        
        return this.npcs;
    }
    
    /**
     * Initialize static dialogue NPCs
     */
    initializeStaticNPCs() {
        // Elder Sage on map 0-0
        const elderSage = new NPC({
            x: 600,
            y: 400,
            spriteSrc: 'assets/npc/sage-0.png',
            type: 'sage',
            name: 'Elder Sage',
            dialogue: "Welcome, young adventurer! The world is full of mysteries waiting to be discovered.",
            scale: 0.08
        });
        this.npcs['0-0'].push(elderSage);
    }
    
    /**
     * Initialize merchant NPCs
     */
    initializeMerchantNPCs() {
        // Trader Bob on map 0-0
        const traderBob = new NPC({
            x: 300,
            y: 500,
            spriteSrc: 'assets/npc/merchant-0.png',
            type: 'merchant',
            name: 'Trader Bob',
            dialogue: "I have the finest goods in all the land! Care to take a look?",
            scale: 0.08
        });
        this.npcs['0-0'].push(traderBob);
    }
    
    /**
     * Initialize roaming NPCs (spirits that move around)
     */
    initializeRoamingNPCs() {
        // Wandering Spirit on map 0-0
        const wanderingSpirit = new Spirit({
            x: 1200,
            y: 600,
            spriteSrc: 'assets/npc/navigation-0.png',
            name: 'Wandering Spirit',
            altitude: 25,
            floatingSpeed: 1.5,
            floatingRange: 15,
            roamingSpeed: 50,
            roamingRange: 200,
            roamingBounds: { x: 1000, y: 400, width: 400, height: 400 },
            scale: 0.06
        });
        
        this.roamingNPCs['0-0'].push(wanderingSpirit);
        this.npcs['0-0'].push(wanderingSpirit); // Add to main NPC list for collision detection
    }
    
    /**
     * Get NPCs for a specific map
     */
    getNPCsForMap(mapId) {
        return this.npcs[mapId] || [];
    }
    
    /**
     * Update roaming NPCs
     */
    updateRoamingNPCs(mapId, deltaTime, mapBounds) {
        const roamingNPCs = this.roamingNPCs[mapId] || [];
        
        roamingNPCs.forEach(npc => {
            if (npc.update) {
                npc.update(deltaTime, { mapBounds });
            }
        });
    }
    
    /**
     * Add an NPC to a map
     */
    addNPC(mapId, npc) {
        if (!this.npcs[mapId]) {
            this.npcs[mapId] = [];
        }
        this.npcs[mapId].push(npc);
    }
    
    /**
     * Remove an NPC from a map
     */
    removeNPC(mapId, npc) {
        if (this.npcs[mapId]) {
            const index = this.npcs[mapId].indexOf(npc);
            if (index > -1) {
                this.npcs[mapId].splice(index, 1);
            }
        }
    }
    
    /**
     * Start dialogue with an NPC
     */
    startDialogue(npc, onSoundCallback = null) {
        if (!npc.dialogue) return false;
        
        this.currentDialogue = {
            npc: npc,
            text: npc.dialogue,
            isActive: true
        };
        
        // Play speech bubble sound if callback provided
        if (onSoundCallback) {
            onSoundCallback();
        }
        
        return true;
    }
    
    /**
     * End current dialogue
     */
    endDialogue() {
        this.currentDialogue = null;
    }
    
    /**
     * Get current dialogue
     */
    getCurrentDialogue() {
        return this.currentDialogue;
    }
    
    /**
     * Check if dialogue is active
     */
    isDialogueActive() {
        return this.currentDialogue && this.currentDialogue.isActive;
    }
    
    /**
     * Find NPC by name
     */
    findNPCByName(name, mapId = null) {
        const mapsToSearch = mapId ? [mapId] : Object.keys(this.npcs);
        
        for (const map of mapsToSearch) {
            const npcs = this.npcs[map] || [];
            const found = npcs.find(npc => npc.name === name);
            if (found) {
                return found;
            }
        }
        
        return null;
    }
    
    /**
     * Find NPCs by type
     */
    findNPCsByType(type, mapId = null) {
        const mapsToSearch = mapId ? [mapId] : Object.keys(this.npcs);
        const results = [];
        
        for (const map of mapsToSearch) {
            const npcs = this.npcs[map] || [];
            const matches = npcs.filter(npc => npc.type === type);
            results.push(...matches);
        }
        
        return results;
    }
    
    /**
     * Get all NPCs across all maps
     */
    getAllNPCs() {
        const allNPCs = [];
        Object.values(this.npcs).forEach(mapNPCs => {
            allNPCs.push(...mapNPCs);
        });
        return allNPCs;
    }
    
    /**
     * Save NPCs state
     */
    saveState() {
        const state = {};
        Object.keys(this.npcs).forEach(mapId => {
            state[mapId] = this.npcs[mapId].map(npc => ({
                x: npc.x,
                y: npc.y,
                direction: npc.direction,
                health: npc.health,
                // Add other saveable properties as needed
            }));
        });
        return state;
    }
    
    /**
     * Load NPCs state
     */
    loadState(state) {
        Object.keys(state).forEach(mapId => {
            const npcStates = state[mapId];
            const npcs = this.npcs[mapId] || [];
            
            npcStates.forEach((npcState, index) => {
                if (npcs[index]) {
                    npcs[index].x = npcState.x;
                    npcs[index].y = npcState.y;
                    npcs[index].direction = npcState.direction;
                    npcs[index].health = npcState.health;
                }
            });
        });
    }
}

// Export for use
window.NPCManager = NPCManager;