/**
 * generate_spawns.cjs
 * 
 * Generates:
 * 1. All 56 stage-1 spirit templates in spirits.json (from spirit_registry.json species data)
 * 2. Biome-appropriate spawn tables for every map in maps.json
 */

const fs = require('fs');
const path = require('path');

// Load data
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/spirit_registry.json'), 'utf8'));
const maps = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/maps.json'), 'utf8'));

// ── Element colors for reference (used in Spirit.js tinting) ──
const ELEMENT_COLORS = {
    fire:      { r: 1.0, g: 0.4, b: 0.1 },
    water:     { r: 0.2, g: 0.5, b: 1.0 },
    earth:     { r: 0.7, g: 0.5, b: 0.2 },
    wind:      { r: 0.4, g: 0.9, b: 0.5 },
    lightning: { r: 1.0, g: 0.9, b: 0.2 },
    ice:       { r: 0.5, g: 0.8, b: 1.0 },
    light:     { r: 1.0, g: 1.0, b: 0.6 },
    dark:      { r: 0.5, g: 0.2, b: 0.8 }
};

// ── Biome → element affinity mapping ──
// Primary elements appear with high weight, secondary with lower weight
const BIOME_ELEMENTS = {
    'ocean':           { primary: ['water'],            secondary: ['wind', 'dark'] },
    'deep-ocean':      { primary: ['water', 'dark'],    secondary: ['ice'] },
    'lake':            { primary: ['water'],            secondary: ['wind', 'light'] },
    'river-valley':    { primary: ['water', 'earth'],   secondary: ['wind'] },
    'swamp':           { primary: ['water', 'dark'],    secondary: ['earth'] },
    'beach':           { primary: ['water', 'wind'],    secondary: ['earth', 'light'] },
    'volcanic':        { primary: ['fire'],             secondary: ['earth', 'dark'] },
    'volcanic-waste':  { primary: ['fire', 'dark'],     secondary: ['earth'] },
    'mountain':        { primary: ['wind', 'earth'],    secondary: ['ice'] },
    'high-mountain':   { primary: ['wind'],             secondary: ['ice', 'lightning'] },
    'snow':            { primary: ['ice'],              secondary: ['wind', 'water'] },
    'tundra':          { primary: ['ice'],              secondary: ['wind', 'dark'] },
    'frozen-peak':     { primary: ['ice', 'wind'],      secondary: ['dark'] },
    'desert':          { primary: ['earth', 'fire'],    secondary: ['light'] },
    'arid-desert':     { primary: ['earth', 'fire'],    secondary: ['wind'] },
    'dunes':           { primary: ['earth'],            secondary: ['fire', 'wind'] },
    'jungle':          { primary: ['lightning', 'earth'], secondary: ['water'] },
    'dense-forest':    { primary: ['lightning'],        secondary: ['earth', 'dark'] },
    'forest':          { primary: ['earth', 'wind'],    secondary: ['light', 'water'] },
    'dark-forest':     { primary: ['dark'],             secondary: ['earth', 'lightning'] },
    'plains':          { primary: ['wind', 'earth'],    secondary: ['light', 'fire'] },
    'grassland':       { primary: ['wind', 'light'],    secondary: ['earth', 'water'] },
    'meadow':          { primary: ['light', 'wind'],    secondary: ['earth', 'water'] },
    'savanna':         { primary: ['fire', 'earth'],    secondary: ['wind', 'lightning'] },
    'wetland':         { primary: ['water', 'earth'],   secondary: ['dark'] },
    'marsh':           { primary: ['water', 'dark'],    secondary: ['earth'] },
    'canyon':          { primary: ['earth'],            secondary: ['fire', 'wind'] },
    'cave':            { primary: ['dark', 'earth'],    secondary: ['ice'] },
    'ruins':           { primary: ['dark', 'light'],    secondary: ['fire'] },
    'crystal-cave':    { primary: ['light', 'ice'],     secondary: ['earth'] },
    'mushroom-forest': { primary: ['dark', 'earth'],    secondary: ['water'] },
    'coral-reef':      { primary: ['water', 'light'],   secondary: ['earth'] },
    'floating-island': { primary: ['wind', 'light'],    secondary: ['lightning'] },
    'shadow-realm':    { primary: ['dark'],             secondary: ['fire', 'ice'] },
    'enchanted':       { primary: ['light', 'dark'],    secondary: ['wind'] },
    'woodland':        { primary: ['earth', 'wind'],    secondary: ['light', 'water'] },
};

// ── Archetype-based properties ──
const ARCHETYPE_PROPS = {
    striker:   { moveSpeed: 2.2, movePattern: 'wander', isFloating: false, scale: 0.075 },
    mystic:    { moveSpeed: 1.8, movePattern: 'wander', isFloating: true,  scale: 0.07  },
    guardian:  { moveSpeed: 1.2, movePattern: 'wander', isFloating: false, scale: 0.08  },
    warden:    { moveSpeed: 1.6, movePattern: 'wander', isFloating: false, scale: 0.07  },
    swift:     { moveSpeed: 2.8, movePattern: 'wander', isFloating: false, scale: 0.065 },
    titan:     { moveSpeed: 1.0, movePattern: 'wander', isFloating: false, scale: 0.09  },
    channeler: { moveSpeed: 1.5, movePattern: 'wander', isFloating: true,  scale: 0.07  },
};

// ═══════════════════════════════════════════════════════════════
// STEP 1: Generate all 56 stage-1 spirit templates
// ═══════════════════════════════════════════════════════════════

function generateSpiritTemplates() {
    const spirits = [];
    
    for (const species of registry.species) {
        const stage1 = species.stages[0];
        const archProps = ARCHETYPE_PROPS[species.archetype];
        const totalStats = Object.values(species.baseStats).reduce((a, b) => a + b, 0);
        
        spirits.push({
            id: `${species.chainId}_spawn`,
            name: stage1.name,
            chainId: species.chainId,
            archetype: species.archetype,
            stage: 1,
            speciesId: stage1.id,
            spriteSrc: "/assets/npc/Spirits/sylphie.png",
            scale: archProps.scale,
            hasCollision: true,
            collisionShape: "circle",
            collisionPercent: 0.5,
            collisionExpandTopPercent: species.archetype === 'mystic' || species.archetype === 'channeler' ? -0.75 : 0,
            collisionExpandBottomPercent: 0,
            collisionExpandLeftPercent: 0,
            collisionExpandRightPercent: 0,
            isFloating: archProps.isFloating,
            level: 5,
            type1: species.element,
            type2: null,
            baseStats: { ...species.baseStats },
            expYield: Math.floor(totalStats * 0.15),
            goldYield: Math.floor(totalStats * 0.08),
            moveSpeed: archProps.moveSpeed,
            movePattern: archProps.movePattern,
            description: stage1.description
        });
    }
    
    return spirits;
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Generate spawn tables for every map
// ═══════════════════════════════════════════════════════════════

function generateSpawnTables(spiritTemplates) {
    // Build lookup: element → list of spirit template IDs
    const elementSpirits = {};
    for (const spirit of spiritTemplates) {
        if (!elementSpirits[spirit.type1]) elementSpirits[spirit.type1] = [];
        elementSpirits[spirit.type1].push(spirit.id);
    }
    
    let mapsUpdated = 0;
    
    for (const [mapId, mapData] of Object.entries(maps)) {
        const biome = mapData.biome || 'plains';
        const level = mapData.level || 1;
        
        // Skip ocean maps at very high level (inaccessible deep ocean)
        // but still populate them for completeness
        
        // Get element affinities for this biome
        const biomeConfig = BIOME_ELEMENTS[biome] || BIOME_ELEMENTS['plains'];
        const primaryElements = biomeConfig.primary;
        const secondaryElements = biomeConfig.secondary;
        
        const spawnTable = [];
        
        // Add primary element spirits (higher weight)
        for (const element of primaryElements) {
            const spirits = elementSpirits[element] || [];
            // Pick a subset based on archetype variety
            // For each primary element: 3-4 archetypes with varying weights
            const archetypes = ['striker', 'mystic', 'guardian', 'warden', 'swift', 'titan', 'channeler'];
            
            // Seed-based selection using map coordinates for consistency
            const coords = mapId.match(/-?\d+/g);
            const mx = coords ? parseInt(coords[0]) : 0;
            const my = coords ? parseInt(coords[1]) : 0;
            const seed = Math.abs(mx * 31 + my * 17 + element.length * 7);
            
            // Select 3-4 archetypes for this element in this map
            const shuffled = [...archetypes].sort((a, b) => {
                const ha = ((seed + a.charCodeAt(0) * 13) % 97);
                const hb = ((seed + b.charCodeAt(0) * 13) % 97);
                return ha - hb;
            });
            const count = 3 + (seed % 2); // 3 or 4
            const selected = shuffled.slice(0, count);
            
            for (const arch of selected) {
                const spiritId = `${element}_${arch}_spawn`;
                if (spiritTemplates.find(s => s.id === spiritId)) {
                    // Base weight 60-80 for primary elements
                    const weight = 60 + ((seed + arch.charCodeAt(1)) % 21);
                    
                    // Some spirits are nocturnal based on element
                    let timeCondition = 'any';
                    if (element === 'dark' && arch !== 'guardian') {
                        timeCondition = (seed % 3 === 0) ? 'night' : 'any';
                    }
                    if (element === 'light' && arch !== 'guardian') {
                        timeCondition = (seed % 3 === 0) ? 'day' : 'any';
                    }
                    
                    spawnTable.push({ spiritId, spawnWeight: weight, timeCondition });
                }
            }
        }
        
        // Add secondary element spirits (lower weight)
        for (const element of secondaryElements) {
            const spirits = elementSpirits[element] || [];
            const coords = mapId.match(/-?\d+/g);
            const mx = coords ? parseInt(coords[0]) : 0;
            const my = coords ? parseInt(coords[1]) : 0;
            const seed = Math.abs(mx * 23 + my * 41 + element.length * 11);
            
            const archetypes = ['striker', 'mystic', 'guardian', 'warden', 'swift', 'titan', 'channeler'];
            const shuffled = [...archetypes].sort((a, b) => {
                const ha = ((seed + a.charCodeAt(0) * 7) % 89);
                const hb = ((seed + b.charCodeAt(0) * 7) % 89);
                return ha - hb;
            });
            // 1-2 archetypes for secondary elements
            const count = 1 + (seed % 2);
            const selected = shuffled.slice(0, count);
            
            for (const arch of selected) {
                const spiritId = `${element}_${arch}_spawn`;
                if (spiritTemplates.find(s => s.id === spiritId)) {
                    // Lower weight 20-40 for secondary
                    const weight = 20 + ((seed + arch.charCodeAt(1)) % 21);
                    
                    let timeCondition = 'any';
                    if (element === 'dark') {
                        timeCondition = 'night';
                    }
                    
                    spawnTable.push({ spiritId, spawnWeight: weight, timeCondition });
                }
            }
        }
        
        // Rare: add a light/dark spirit with low weight to most biomes for variety
        // (only if not already in the table)
        const hasLight = spawnTable.some(e => e.spiritId.startsWith('light_'));
        const hasDark = spawnTable.some(e => e.spiritId.startsWith('dark_'));
        const coords = mapId.match(/-?\d+/g);
        const mx = coords ? parseInt(coords[0]) : 0;
        const my = coords ? parseInt(coords[1]) : 0;
        
        if (!hasLight && (Math.abs(mx + my * 3) % 5 === 0)) {
            const rareArchs = ['mystic', 'channeler', 'swift'];
            const pick = rareArchs[Math.abs(mx * 7 + my) % rareArchs.length];
            spawnTable.push({ spiritId: `light_${pick}_spawn`, spawnWeight: 10, timeCondition: 'day' });
        }
        if (!hasDark && (Math.abs(mx * 2 + my) % 5 === 0)) {
            const rareArchs = ['mystic', 'striker', 'swift'];
            const pick = rareArchs[Math.abs(mx + my * 7) % rareArchs.length];
            spawnTable.push({ spiritId: `dark_${pick}_spawn`, spawnWeight: 10, timeCondition: 'night' });
        }
        
        // Set spawn density based on biome type
        let spawnDensity;
        if (['ocean', 'deep-ocean'].includes(biome)) {
            spawnDensity = 1; // Very few spirits in open water
        } else if (['desert', 'arid-desert', 'tundra', 'frozen-peak', 'volcanic-waste'].includes(biome)) {
            spawnDensity = 2; // Harsh environments
        } else if (['jungle', 'dense-forest', 'forest', 'swamp', 'mushroom-forest'].includes(biome)) {
            spawnDensity = 5; // Lush environments
        } else if (['plains', 'grassland', 'meadow', 'savanna'].includes(biome)) {
            spawnDensity = 4; // Open areas
        } else {
            spawnDensity = 3; // Default
        }
        
        mapData.spawnTable = spawnTable;
        mapData.spawnDensity = spawnDensity;
        mapsUpdated++;
    }
    
    return mapsUpdated;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('=== Spirit Spawn Generator ===\n');

// Step 1: Generate spirit templates
const spiritTemplates = generateSpiritTemplates();
console.log(`Generated ${spiritTemplates.length} spirit templates`);

// Verify all elements covered
const elements = [...new Set(spiritTemplates.map(s => s.type1))];
console.log(`Elements: ${elements.join(', ')}`);

// Save spirits.json
fs.writeFileSync(
    path.join(__dirname, 'data/spirits.json'),
    JSON.stringify({ spirits: spiritTemplates }, null, 2)
);
console.log('✅ Saved data/spirits.json\n');

// Step 2: Generate spawn tables
const mapsUpdated = generateSpawnTables(spiritTemplates);
console.log(`Updated spawn tables for ${mapsUpdated} maps`);

// Stats
const biomes = {};
for (const mapData of Object.values(maps)) {
    const b = mapData.biome || 'unknown';
    biomes[b] = (biomes[b] || 0) + 1;
}
console.log('\nBiome distribution:');
for (const [biome, count] of Object.entries(biomes).sort((a, b) => b[1] - a[1])) {
    const config = BIOME_ELEMENTS[biome];
    const elems = config ? `[${config.primary.join(',')}]` : '[fallback:plains]';
    console.log(`  ${biome}: ${count} maps → ${elems}`);
}

// Save maps.json
fs.writeFileSync(
    path.join(__dirname, 'data/maps.json'),
    JSON.stringify(maps, null, 2)
);
console.log('\n✅ Saved data/maps.json');
console.log('\nDone!');
