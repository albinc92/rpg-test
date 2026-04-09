/**
 * PartyManager.js
 * Manages the player's spirit party and spirit box
 * 1v1 battles: only 1 spirit is active at a time, rest are reserves
 */

class PartyManager {
    constructor(game) {
        this.game = game;
        
        // 1v1 party: 1 active spirit in battle, up to 5 reserves
        this.MAX_ACTIVE = 1;
        this.MAX_BENCH = 5;
        this.MAX_PARTY = this.MAX_ACTIVE + this.MAX_BENCH; // 6 total
        
        // Box storage system (Pokémon PC-style)
        this.BOX_CAPACITY = 30;   // spirits per box
        this.MAX_BOXES = 10;      // total boxes
        this.DEFAULT_BOX_NAMES = [
            'Gourd I', 'Gourd II', 'Gourd III', 'Gourd IV', 'Gourd V',
            'Gourd VI', 'Gourd VII', 'Gourd VIII', 'Gourd IX', 'Gourd X'
        ];
        
        this.party = [];      // Active + bench spirits
        this.box = [];        // Legacy flat box (migrated to boxes on load)
        this.boxes = [];      // Array of { name, spirits[] } — structured storage
        
        // Load saved party data
        this.loadPartyData();
    }
    
    /**
     * Load party data from save
     */
    loadPartyData() {
        const saveData = localStorage.getItem('rpg_party_data');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                this.party = data.party || [];
                this.box = data.box || [];
                this.boxes = data.boxes || [];
                
                // Migrate old data - add scale and floating properties if missing
                const migrateSpirit = (spirit) => {
                    if (!spirit.scale) {
                        spirit.scale = 0.075;
                    }
                    if (spirit.isFloating === undefined) {
                        spirit.isFloating = spirit.name === 'Sylphie';
                        spirit.floatingSpeed = 0.002;
                        spirit.floatingRange = 15;
                    }
                    return spirit;
                };
                this.party = this.party.map(migrateSpirit);
                this.box = this.box.map(migrateSpirit);
                
                // Migrate flat box[] to structured boxes[]
                if (this.boxes.length === 0) {
                    this._initializeBoxes();
                    // Move legacy flat box spirits into box 0
                    if (this.box.length > 0) {
                        for (const spirit of this.box) {
                            this._addToFirstAvailableBox(migrateSpirit(spirit));
                        }
                        this.box = []; // Clear legacy
                    }
                } else {
                    // Migrate spirits inside boxes
                    for (const box of this.boxes) {
                        box.spirits = (box.spirits || []).map(s => s ? migrateSpirit(s) : null);
                    }
                }
            } catch (e) {
                console.warn('[PartyManager] Failed to load party data:', e);
            }
        }
        
        // Ensure boxes are initialized
        if (this.boxes.length === 0) {
            this._initializeBoxes();
        }
        
        // Ensure player has at least one spirit
        if (this.party.length === 0) {
            this.addDefaultSpirit();
        }
    }
    
    /**
     * Save party data
     */
    savePartyData() {
        const data = {
            party: this.party,
            box: [],  // Legacy — kept empty, all storage in boxes[]
            boxes: this.boxes
        };
        localStorage.setItem('rpg_party_data', JSON.stringify(data));
    }
    
    /**
     * Initialize box storage with empty named boxes
     */
    _initializeBoxes() {
        this.boxes = [];
        for (let i = 0; i < this.MAX_BOXES; i++) {
            this.boxes.push({
                name: this.DEFAULT_BOX_NAMES[i] || `Gourd ${i + 1}`,
                spirits: new Array(this.BOX_CAPACITY).fill(null)
            });
        }
    }
    
    /**
     * Add a spirit to the first available slot across all boxes
     * @returns {boolean} true if placed successfully
     */
    _addToFirstAvailableBox(spirit) {
        for (const box of this.boxes) {
            const emptyIdx = box.spirits.indexOf(null);
            if (emptyIdx !== -1) {
                box.spirits[emptyIdx] = spirit;
                return true;
            }
        }
        return false; // All boxes full
    }
    
    /**
     * Get a specific box by index
     */
    getBox(index) {
        return this.boxes[index] || null;
    }
    
    /**
     * Get total spirit count across all boxes
     */
    getBoxSpiritCount() {
        let count = 0;
        for (const box of this.boxes) {
            count += box.spirits.filter(s => s !== null).length;
        }
        return count;
    }
    
    /**
     * Rename a box
     */
    renameBox(index, name) {
        if (this.boxes[index]) {
            this.boxes[index].name = name;
            this.savePartyData();
        }
    }
    
    /**
     * Move spirit from party to a specific box slot
     */
    moveToBoxSlot(partyIndex, boxIndex, slotIndex) {
        if (this.party.length <= 1) return false;
        if (!this.boxes[boxIndex]) return false;
        if (this.boxes[boxIndex].spirits[slotIndex] !== null) return false;
        
        const spirit = this.party.splice(partyIndex, 1)[0];
        if (spirit) {
            this.boxes[boxIndex].spirits[slotIndex] = spirit;
            this.savePartyData();
            return true;
        }
        return false;
    }
    
    /**
     * Move spirit from a box slot to party
     */
    moveFromBoxToParty(boxIndex, slotIndex) {
        if (this.party.length >= this.MAX_PARTY) return false;
        if (!this.boxes[boxIndex]) return false;
        
        const spirit = this.boxes[boxIndex].spirits[slotIndex];
        if (!spirit) return false;
        
        this.boxes[boxIndex].spirits[slotIndex] = null;
        this.party.push(spirit);
        this.savePartyData();
        return true;
    }
    
    /**
     * Swap party spirit with box spirit
     */
    swapPartyWithBox(partyIndex, boxIndex, slotIndex) {
        if (partyIndex < 0 || partyIndex >= this.party.length) return false;
        if (!this.boxes[boxIndex]) return false;
        
        const partySpirit = this.party[partyIndex];
        const boxSpirit = this.boxes[boxIndex].spirits[slotIndex];
        
        this.party[partyIndex] = boxSpirit;
        this.boxes[boxIndex].spirits[slotIndex] = partySpirit;
        
        // Clean up: if boxSpirit was null, party now has a null — remove it
        this.party = this.party.filter(s => s !== null);
        
        this.savePartyData();
        return true;
    }
    
    /**
     * Swap two box slots (within same box or across boxes)
     */
    swapBoxSlots(boxA, slotA, boxB, slotB) {
        if (!this.boxes[boxA] || !this.boxes[boxB]) return false;
        
        const spiritA = this.boxes[boxA].spirits[slotA];
        const spiritB = this.boxes[boxB].spirits[slotB];
        
        this.boxes[boxA].spirits[slotA] = spiritB;
        this.boxes[boxB].spirits[slotB] = spiritA;
        
        this.savePartyData();
        return true;
    }
    
    /**
     * Reset party for new game - clears all data and adds starter spirit
     */
    resetForNewGame() {
        console.log('[PartyManager] Resetting party for new game');
        this.party = [];
        this.box = [];
        localStorage.removeItem('rpg_party_data');
        this.addDefaultSpirit();
    }
    
    /**
     * Add default starter spirit (1 Sylphie for 1v1 battles)
     */
    addDefaultSpirit() {
        const createSylphie = (index) => ({
            id: 'starter_spirit_' + Date.now() + '_' + index,
            name: 'Sylphie',
            level: 5,
            exp: 0,
            type1: 'wind',
            type2: null,
            baseStats: {
                hp: 80,
                mp: 40,
                attack: 18,
                defense: 12,
                magicAttack: 22,
                magicDefense: 15,
                speed: 25
            },
            abilities: [
                { id: 'attack', name: 'Attack', type: 'physical', element: null, power: 40, mpCost: 0, target: 'single_enemy' },
                { id: 'gust', name: 'Gust', type: 'magical', element: 'wind', power: 50, mpCost: 8, target: 'single_enemy' },
                { id: 'heal', name: 'Heal', type: 'supportive', element: null, power: 30, mpCost: 10, target: 'single_ally' }
            ],
            sprite: '/assets/npc/Spirits/sylphie.png',
            scale: 0.075,  // Match the spirit template scale
            isFloating: true,  // Sylphie floats/hovers
            floatingSpeed: 0.002,
            floatingRange: 15
        });
        
        // Add 1 Sylphie to the party (1v1 - lead spirit)
        this.party.push(createSylphie(0));
        this.savePartyData();
    }
    
    /**
     * Get active party (spirits that can battle)
     */
    getActiveParty() {
        return this.party.slice(0, this.MAX_ACTIVE);
    }
    
    /**
     * Get bench spirits
     */
    getBenchSpirits() {
        return this.party.slice(this.MAX_ACTIVE, this.MAX_PARTY);
    }
    
    /**
     * Get full party (active + bench)
     */
    getFullParty() {
        return this.party;
    }
    
    /**
     * Add a spirit to the party (or box if full)
     */
    addSpirit(spiritData) {
        const spirit = {
            ...spiritData,
            id: spiritData.id || 'spirit_' + Date.now()
        };
        
        if (this.party.length < this.MAX_PARTY) {
            this.party.push(spirit);
            console.log(`[PartyManager] Added ${spirit.name} to party`);
        } else {
            // Party full — add to first available box slot
            if (this._addToFirstAvailableBox(spirit)) {
                console.log(`[PartyManager] Party full, added ${spirit.name} to box storage`);
            } else {
                console.warn(`[PartyManager] All boxes full! Cannot add ${spirit.name}`);
                return null;
            }
        }
        
        this.savePartyData();
        return spirit;
    }
    
    /**
     * Add a spirit directly to the box
     */
    addToBox(spiritData) {
        const spirit = {
            ...spiritData,
            id: spiritData.id || 'spirit_' + Date.now()
        };
        
        if (this._addToFirstAvailableBox(spirit)) {
            console.log(`[PartyManager] Added ${spirit.name} to box storage`);
            this.savePartyData();
            return spirit;
        }
        console.warn(`[PartyManager] All boxes full! Cannot add ${spirit.name}`);
        return null;
    }
    
    /**
     * Remove a spirit from party by index
     */
    removeFromParty(index) {
        if (index >= 0 && index < this.party.length) {
            const removed = this.party.splice(index, 1)[0];
            this.savePartyData();
            return removed;
        }
        return null;
    }
    
    /**
     * Remove a spirit from box by index
     */
    removeFromBox(index) {
        if (index >= 0 && index < this.box.length) {
            const removed = this.box.splice(index, 1)[0];
            this.savePartyData();
            return removed;
        }
        return null;
    }
    
    /**
     * Swap a party spirit with a box spirit
     */
    swapSpirits(partyIndex, boxIndex) {
        if (partyIndex < 0 || partyIndex >= this.party.length) return false;
        if (boxIndex < 0 || boxIndex >= this.box.length) return false;
        
        const partySpirit = this.party[partyIndex];
        const boxSpirit = this.box[boxIndex];
        
        this.party[partyIndex] = boxSpirit;
        this.box[boxIndex] = partySpirit;
        
        this.savePartyData();
        return true;
    }
    
    /**
     * Move a spirit from box to party
     */
    moveToParty(boxIndex) {
        if (this.party.length >= this.MAX_PARTY) {
            console.log('[PartyManager] Party is full');
            return false;
        }
        
        const spirit = this.removeFromBox(boxIndex);
        if (spirit) {
            this.party.push(spirit);
            this.savePartyData();
            return true;
        }
        return false;
    }
    
    /**
     * Move a spirit from party to box
     */
    moveToBox(partyIndex) {
        if (this.party.length <= 1) {
            console.log('[PartyManager] Cannot remove last party member');
            return false;
        }
        
        const spirit = this.removeFromParty(partyIndex);
        if (spirit) {
            if (this._addToFirstAvailableBox(spirit)) {
                this.savePartyData();
                return true;
            } else {
                // No space — put back
                this.party.splice(partyIndex, 0, spirit);
                console.warn('[PartyManager] All boxes full');
                return false;
            }
        }
        return false;
    }
    
    /**
     * Reorder party (for setting active vs bench)
     */
    reorderParty(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.party.length) return false;
        if (toIndex < 0 || toIndex >= this.party.length) return false;
        
        const [spirit] = this.party.splice(fromIndex, 1);
        this.party.splice(toIndex, 0, spirit);
        
        this.savePartyData();
        return true;
    }
    
    /**
     * Heal all party spirits
     */
    healAll() {
        this.party.forEach(spirit => {
            if (spirit.baseStats) {
                const level = spirit.level || 1;
                const multiplier = 1 + (level - 1) * 0.1;
                spirit.currentHp = Math.floor(spirit.baseStats.hp * multiplier);
                spirit.currentMp = Math.floor(spirit.baseStats.mp * multiplier);
            }
        });
        this.savePartyData();
    }
    
    /**
     * Award EXP to party spirits
     */
    awardExp(amount) {
        const expPerSpirit = Math.floor(amount / this.party.length);
        const levelUps = [];
        
        this.party.forEach(spirit => {
            spirit.exp = (spirit.exp || 0) + expPerSpirit;
            
            // Check for level up (simple formula: 100 * level^1.5)
            const expNeeded = Math.floor(100 * Math.pow(spirit.level || 1, 1.5));
            while (spirit.exp >= expNeeded) {
                spirit.exp -= expNeeded;
                spirit.level = (spirit.level || 1) + 1;
                levelUps.push({ spirit: spirit, newLevel: spirit.level });
                console.log(`[PartyManager] ${spirit.name} leveled up to ${spirit.level}!`);
            }
        });
        
        this.savePartyData();
        return levelUps;
    }
    
    /**
     * Get a spirit by ID
     */
    getSpiritById(id) {
        // Search party first
        const inParty = this.party.find(s => s.id === id);
        if (inParty) return inParty;
        // Then search all boxes
        for (const box of this.boxes) {
            const found = box.spirits.find(s => s && s.id === id);
            if (found) return found;
        }
        return null;
    }
    
    /**
     * Get party size info
     */
    getPartyInfo() {
        return {
            activeCount: Math.min(this.party.length, this.MAX_ACTIVE),
            benchCount: Math.max(0, this.party.length - this.MAX_ACTIVE),
            boxCount: this.getBoxSpiritCount(),
            maxActive: this.MAX_ACTIVE,
            maxBench: this.MAX_BENCH,
            maxParty: this.MAX_PARTY,
            totalBoxes: this.MAX_BOXES,
            boxCapacity: this.BOX_CAPACITY
        };
    }
}

// Export
window.PartyManager = PartyManager;
