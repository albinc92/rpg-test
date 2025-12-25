/**
 * PartyManager.js
 * Manages the player's spirit party and spirit box
 * Supports 4 active battlers + 2 bench spirits
 */

class PartyManager {
    constructor(game) {
        this.game = game;
        
        // Active party (up to 4 spirits in battle, 2 on bench)
        this.MAX_ACTIVE = 4;
        this.MAX_BENCH = 2;
        this.MAX_PARTY = this.MAX_ACTIVE + this.MAX_BENCH; // 6 total
        
        this.party = [];      // Active + bench spirits
        this.box = [];        // Spirit storage (no limit for now)
        
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
                
                // Migrate old data - add scale and floating properties if missing
                const migrateSpirit = (spirit) => {
                    if (!spirit.scale) {
                        // Default to 0.075 which matches Sylphie template
                        spirit.scale = 0.075;
                    }
                    // Add floating properties for Sylphie (name-based check for old saves)
                    if (spirit.isFloating === undefined) {
                        // Default: Sylphie floats, others don't
                        spirit.isFloating = spirit.name === 'Sylphie';
                        spirit.floatingSpeed = 0.002;
                        spirit.floatingRange = 15;
                    }
                    return spirit;
                };
                this.party = this.party.map(migrateSpirit);
                this.box = this.box.map(migrateSpirit);
            } catch (e) {
                console.warn('[PartyManager] Failed to load party data:', e);
            }
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
            box: this.box
        };
        localStorage.setItem('rpg_party_data', JSON.stringify(data));
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
     * Add default starter spirits (4 Sylphies)
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
        
        // Add 4 Sylphies to the party
        for (let i = 0; i < 4; i++) {
            this.party.push(createSylphie(i));
        }
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
            this.box.push(spirit);
            console.log(`[PartyManager] Party full, added ${spirit.name} to box`);
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
        
        this.box.push(spirit);
        console.log(`[PartyManager] Added ${spirit.name} to box`);
        this.savePartyData();
        return spirit;
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
            this.box.push(spirit);
            this.savePartyData();
            return true;
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
        return this.party.find(s => s.id === id) || this.box.find(s => s.id === id);
    }
    
    /**
     * Get party size info
     */
    getPartyInfo() {
        return {
            activeCount: Math.min(this.party.length, this.MAX_ACTIVE),
            benchCount: Math.max(0, this.party.length - this.MAX_ACTIVE),
            boxCount: this.box.length,
            maxActive: this.MAX_ACTIVE,
            maxBench: this.MAX_BENCH,
            maxParty: this.MAX_PARTY
        };
    }
}

// Export
window.PartyManager = PartyManager;
