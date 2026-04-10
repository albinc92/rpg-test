/**
 * LootSystem - Generates dynamic loot based on zone level
 * Uses levelled loot tables from data/loot_tables.json
 */
class LootSystem {
    constructor(game) {
        this.game = game;
        this.lootTables = null;
    }

    /**
     * Load loot tables from JSON
     */
    async initialize() {
        try {
            const response = await fetch('data/loot_tables.json');
            this.lootTables = await response.json();
            console.log(`[LootSystem] ✅ Loaded ${this.lootTables.tiers.length} loot tiers`);
        } catch (e) {
            console.error('[LootSystem] Failed to load loot tables:', e);
            this.lootTables = { tiers: [] };
        }
    }

    /**
     * Get the zone level at a given world position on a map
     * Checks spawn zones for a level field, returns the highest-level zone the point falls in
     */
    getZoneLevelAt(x, y, mapId) {
        const mapData = this.game.mapManager?.maps?.[mapId];
        if (!mapData || !mapData.zones) return 1;

        let maxLevel = 0;
        for (const zone of mapData.zones) {
            if (zone.type !== 'spawn' || !zone.level) continue;
            if (this._isPointInPolygon({ x, y }, zone.points)) {
                maxLevel = Math.max(maxLevel, zone.level);
            }
        }
        return maxLevel || 1;
    }

    /**
     * Get the loot tier for a given level
     */
    _getTier(level) {
        if (!this.lootTables || !this.lootTables.tiers.length) return null;

        for (const tier of this.lootTables.tiers) {
            if (level >= tier.minLevel && level <= tier.maxLevel) {
                return tier;
            }
        }
        // Fallback to highest tier
        return this.lootTables.tiers[this.lootTables.tiers.length - 1];
    }

    /**
     * Generate random loot for a given zone level
     * @param {number} zoneLevel - The zone level
     * @param {string} chestType - The chest type ('wooden', 'silver', 'golden', 'mystical')
     * @returns {{ items: Array<{id: string, amount: number}>, gold: number }}
     */
    generateLoot(zoneLevel, chestType) {
        const tier = this._getTier(zoneLevel);
        if (!tier) return { items: [], gold: 0 };

        // Chest type multiplier for gold and drop count
        const chestMultiplier = this._getChestMultiplier(chestType);

        // Roll gold
        const baseGold = this._randInt(tier.gold.min, tier.gold.max);
        const gold = Math.floor(baseGold * chestMultiplier);

        // Roll number of drops
        const baseDrops = this._randInt(tier.drops.min, tier.drops.max);
        const numDrops = Math.min(baseDrops + (chestMultiplier > 1 ? 1 : 0), tier.drops.max + 1);

        // Weighted random item selection
        const items = [];
        const totalWeight = tier.items.reduce((sum, i) => sum + i.weight, 0);

        for (let i = 0; i < numDrops; i++) {
            let roll = Math.random() * totalWeight;
            for (const entry of tier.items) {
                roll -= entry.weight;
                if (roll <= 0) {
                    const qty = entry.minQty ? this._randInt(entry.minQty, entry.maxQty || entry.minQty) : 1;
                    // Stack with existing same-id item
                    const existing = items.find(it => it.id === entry.id);
                    if (existing) {
                        existing.amount += qty;
                    } else {
                        items.push({ id: entry.id, amount: qty });
                    }
                    break;
                }
            }
        }

        return { items, gold };
    }

    /**
     * Get chest quality multiplier
     */
    _getChestMultiplier(chestType) {
        switch (chestType) {
            case 'iron':
            case 'silver': return 1.5;
            case 'golden': return 2.0;
            case 'mystical': return 3.0;
            default: return 1.0; // wooden
        }
    }

    _randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _isPointInPolygon(point, vs) {
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
}

// Global scope - loaded via script tag
