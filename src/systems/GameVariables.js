/**
 * GameVariables - Global variable system for tracking game state
 * Used for quest progress, NPC states, story flags, counters, etc.
 * 
 * Variables are persisted in save files and can be accessed from scripts.
 */
class GameVariables {
    constructor() {
        // Core variables storage
        this.variables = new Map();
        
        // Variable change listeners (for reactive updates)
        this.listeners = new Map();
        
        // Pre-defined variable types for validation
        this.TYPES = {
            BOOLEAN: 'boolean',
            NUMBER: 'number',
            STRING: 'string'
        };
    }
    
    /**
     * Set a variable value
     * @param {string} name - Variable name (e.g., "quest_started", "npc_sage_talked")
     * @param {*} value - Value to set
     */
    set(name, value) {
        const oldValue = this.variables.get(name);
        this.variables.set(name, value);
        
        // Notify listeners
        if (this.listeners.has(name)) {
            this.listeners.get(name).forEach(callback => {
                callback(value, oldValue, name);
            });
        }
        
        console.log(`[GameVariables] Set "${name}" = ${JSON.stringify(value)}`);
    }
    
    /**
     * Get a variable value
     * @param {string} name - Variable name
     * @param {*} defaultValue - Default if not set
     * @returns {*} Variable value or default
     */
    get(name, defaultValue = null) {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        return defaultValue;
    }
    
    /**
     * Check if a variable exists
     * @param {string} name - Variable name
     * @returns {boolean}
     */
    has(name) {
        return this.variables.has(name);
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name
     */
    delete(name) {
        this.variables.delete(name);
        console.log(`[GameVariables] Deleted "${name}"`);
    }
    
    /**
     * Increment a numeric variable
     * @param {string} name - Variable name
     * @param {number} amount - Amount to add (default: 1)
     */
    increment(name, amount = 1) {
        const current = this.get(name, 0);
        this.set(name, current + amount);
    }
    
    /**
     * Decrement a numeric variable
     * @param {string} name - Variable name
     * @param {number} amount - Amount to subtract (default: 1)
     */
    decrement(name, amount = 1) {
        const current = this.get(name, 0);
        this.set(name, current - amount);
    }
    
    /**
     * Toggle a boolean variable
     * @param {string} name - Variable name
     */
    toggle(name) {
        const current = this.get(name, false);
        this.set(name, !current);
    }
    
    /**
     * Subscribe to variable changes
     * @param {string} name - Variable name to watch
     * @param {Function} callback - (newValue, oldValue, name) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(name, callback) {
        if (!this.listeners.has(name)) {
            this.listeners.set(name, new Set());
        }
        this.listeners.get(name).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(name).delete(callback);
        };
    }
    
    /**
     * Get all variables (for debugging/saving)
     * @returns {Object} All variables as plain object
     */
    getAll() {
        const obj = {};
        this.variables.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
    
    /**
     * Load variables from object (for save/load)
     * @param {Object} data - Variables object
     */
    loadFrom(data) {
        this.variables.clear();
        if (data && typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                this.variables.set(key, value);
            });
        }
        console.log(`[GameVariables] Loaded ${this.variables.size} variables`);
    }
    
    /**
     * Clear all variables
     */
    clear() {
        this.variables.clear();
        console.log('[GameVariables] Cleared all variables');
    }
    
    /**
     * Get variables matching a prefix (e.g., "quest_" for all quest vars)
     * @param {string} prefix - Prefix to match
     * @returns {Object} Matching variables
     */
    getByPrefix(prefix) {
        const result = {};
        this.variables.forEach((value, key) => {
            if (key.startsWith(prefix)) {
                result[key] = value;
            }
        });
        return result;
    }
    
    /**
     * Serialize for save game
     */
    serialize() {
        return this.getAll();
    }
    
    /**
     * Deserialize from save game
     */
    deserialize(data) {
        this.loadFrom(data);
    }
}

// Make globally available
window.GameVariables = GameVariables;
