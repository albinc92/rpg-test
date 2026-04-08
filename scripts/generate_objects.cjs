#!/usr/bin/env node
/**
 * Procedural Object Placement Generator
 * 
 * Generates biome-appropriate objects (trees, rocks, bushes) for all world maps.
 * Respects collision zones. Uses sparse/natural density.
 * 
 * Usage: node scripts/generate_objects.js [--dry-run] [--preserve-existing]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Config ──────────────────────────────────────────────────────────────────
const MAP_SIZE = 3840;           // World units per map
const EDGE_MARGIN = 120;        // Don't place near map edges (avoids clipping)
const MIN_OBJECT_SPACING = 80;  // Minimum distance between any two objects
const SEED = 42;                // Deterministic seed

// ── Biome Object Tables ─────────────────────────────────────────────────────
// density = approximate objects per map at "sparse/natural" feel
// Each entry: { sprite, scale: [min, max], category, collision }

const TREE_01 = {
    sprite: '/assets/objects/trees/tree-01.png',
    scale: [0.8, 1.2],
    category: 'StaticObject',
    collision: { top: -0.9, left: -0.25, right: -0.25, bottom: 0 },
    name: 'Tree',
};
const TREE_02 = {
    sprite: '/assets/objects/trees/tree-02.png',
    scale: [0.7, 1.1],
    category: 'StaticObject',
    collision: { top: -0.9, left: -0.25, right: -0.25, bottom: 0 },
    name: 'Pine Tree',
};
const BUSH_01 = {
    sprite: '/assets/objects/bushes/bush-01.png',
    scale: [0.35, 0.6],
    category: 'StaticObject',
    collision: { top: -0.7, left: -0.05, right: -0.05, bottom: 0 },
    name: 'Bush',
};
const ROCK_01 = {
    sprite: '/assets/objects/rocks/rock-01.png',
    scale: [0.2, 0.4],
    category: 'StaticObject',
    collision: { top: 0, left: 0, right: 0, bottom: 0 },
    name: 'Boulder',
};
const ROCK_02 = {
    sprite: '/assets/objects/rocks/rock-02.png',
    scale: [0.25, 0.5],
    category: 'StaticObject',
    collision: { top: -0.3, left: -0.1, right: -0.1, bottom: 0 },
    name: 'Rock',
};

// Biome → object placement rules
const BIOME_RULES = {
    'woodland': {
        objects: [
            { template: TREE_01, weight: 40, count: [12, 20] },
            { template: TREE_02, weight: 30, count: [8, 14] },
            { template: BUSH_01, weight: 20, count: [4, 8] },
            { template: ROCK_01, weight: 5,  count: [1, 3] },
            { template: ROCK_02, weight: 5,  count: [1, 3] },
        ],
    },
    'dense-forest': {
        objects: [
            { template: TREE_01, weight: 35, count: [20, 32] },
            { template: TREE_02, weight: 35, count: [18, 28] },
            { template: BUSH_01, weight: 20, count: [8, 14] },
            { template: ROCK_01, weight: 5,  count: [1, 3] },
            { template: ROCK_02, weight: 5,  count: [2, 4] },
        ],
    },
    'grassland': {
        objects: [
            { template: TREE_01, weight: 30, count: [3, 7] },
            { template: BUSH_01, weight: 40, count: [5, 10] },
            { template: ROCK_01, weight: 15, count: [1, 3] },
            { template: ROCK_02, weight: 15, count: [1, 3] },
        ],
    },
    'plains': {
        objects: [
            { template: TREE_01, weight: 20, count: [1, 4] },
            { template: BUSH_01, weight: 40, count: [2, 5] },
            { template: ROCK_01, weight: 20, count: [1, 3] },
            { template: ROCK_02, weight: 20, count: [1, 2] },
        ],
    },
    'meadow': {
        objects: [
            { template: TREE_01, weight: 15, count: [2, 5] },
            { template: BUSH_01, weight: 55, count: [6, 12] },
            { template: ROCK_01, weight: 15, count: [1, 2] },
            { template: ROCK_02, weight: 15, count: [1, 2] },
        ],
    },
    'desert': {
        objects: [
            { template: ROCK_01, weight: 40, count: [4, 8] },
            { template: ROCK_02, weight: 40, count: [3, 7] },
            { template: BUSH_01, weight: 20, count: [1, 3] },  // scrub brush
        ],
    },
    'arid-desert': {
        objects: [
            { template: ROCK_01, weight: 45, count: [5, 10] },
            { template: ROCK_02, weight: 45, count: [4, 8] },
            { template: BUSH_01, weight: 10, count: [0, 2] },  // rare scrub
        ],
    },
    'snow': {
        objects: [
            { template: TREE_02, weight: 40, count: [4, 10] },  // pine trees
            { template: TREE_01, weight: 15, count: [1, 4] },
            { template: ROCK_01, weight: 25, count: [2, 5] },
            { template: ROCK_02, weight: 20, count: [2, 4] },
        ],
    },
    'tundra': {
        objects: [
            { template: ROCK_01, weight: 35, count: [3, 7] },
            { template: ROCK_02, weight: 35, count: [3, 6] },
            { template: TREE_02, weight: 20, count: [1, 3] },  // sparse pines
            { template: BUSH_01, weight: 10, count: [0, 2] },
        ],
    },
    'mountain': {
        objects: [
            { template: ROCK_01, weight: 35, count: [5, 10] },
            { template: ROCK_02, weight: 30, count: [4, 8] },
            { template: TREE_02, weight: 20, count: [2, 5] },
            { template: TREE_01, weight: 10, count: [1, 3] },
            { template: BUSH_01, weight: 5,  count: [0, 2] },
        ],
    },
    'high-mountain': {
        objects: [
            { template: ROCK_01, weight: 45, count: [6, 12] },
            { template: ROCK_02, weight: 40, count: [5, 10] },
            { template: TREE_02, weight: 15, count: [0, 2] },   // rare stunted trees
        ],
    },
    'lake': {
        objects: [
            { template: BUSH_01, weight: 35, count: [2, 5] },
            { template: ROCK_01, weight: 30, count: [2, 4] },
            { template: ROCK_02, weight: 20, count: [1, 3] },
            { template: TREE_01, weight: 15, count: [1, 3] },   // shoreline trees
        ],
    },
    'river-valley': {
        objects: [
            { template: TREE_01, weight: 30, count: [6, 12] },
            { template: TREE_02, weight: 20, count: [4, 8] },
            { template: BUSH_01, weight: 25, count: [4, 8] },
            { template: ROCK_01, weight: 15, count: [2, 4] },
            { template: ROCK_02, weight: 10, count: [1, 3] },
        ],
    },
};

// ── Seeded RNG ──────────────────────────────────────────────────────────────
class SeededRNG {
    constructor(seed) {
        this.state = this._hash(String(seed));
    }
    _hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        }
        return Math.abs(h) || 1;
    }
    // xorshift32
    next() {
        this.state ^= this.state << 13;
        this.state ^= this.state >> 17;
        this.state ^= this.state << 5;
        return (this.state >>> 0) / 0xFFFFFFFF;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    intRange(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
}

// ── Geometry Helpers ───────────────────────────────────────────────────────
function pointInPolygon(x, y, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function distSq(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy;
}

// ── Generate objects for a single map ────────────────────────────────────
function generateObjectsForMap(mapId, mapData, rng) {
    const biome = mapData.biome;
    if (!biome) return [];
    
    const rules = BIOME_RULES[biome];
    if (!rules) return [];

    // Gather collision zones
    const collisionPolygons = (mapData.zones || [])
        .filter(z => z.type === 'collision' && z.points && z.points.length >= 3)
        .map(z => z.points);

    const objects = [];
    const placedPositions = []; // {x, y} for spacing checks

    for (const rule of rules.objects) {
        const count = rng.intRange(rule.count[0], rule.count[1]);
        
        for (let i = 0; i < count; i++) {
            // Try up to 30 times to find a valid position
            let placed = false;
            for (let attempt = 0; attempt < 30; attempt++) {
                const x = rng.range(EDGE_MARGIN, MAP_SIZE - EDGE_MARGIN);
                const y = rng.range(EDGE_MARGIN, MAP_SIZE - EDGE_MARGIN);

                // Check collision zones
                let inCollision = false;
                for (const poly of collisionPolygons) {
                    if (pointInPolygon(x, y, poly)) {
                        inCollision = true;
                        break;
                    }
                }
                if (inCollision) continue;

                // Check spacing from other placed objects
                const minSpaceSq = MIN_OBJECT_SPACING * MIN_OBJECT_SPACING;
                let tooClose = false;
                for (const pos of placedPositions) {
                    if (distSq(x, y, pos.x, pos.y) < minSpaceSq) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                // Place it
                const t = rule.template;
                const scale = rng.range(t.scale[0], t.scale[1]);
                const reverseFacing = rng.next() > 0.5;

                const obj = {
                    category: t.category,
                    x: Math.round(x * 100) / 100,
                    y: Math.round(y * 100) / 100,
                    scale: Math.round(scale * 100) / 100,
                    spriteSrc: t.sprite,
                    id: `static_${crypto.randomUUID()}`,
                    name: t.name,
                    collisionExpandTopPercent: t.collision.top,
                    collisionExpandLeftPercent: t.collision.left,
                    collisionExpandRightPercent: t.collision.right,
                    collisionExpandBottomPercent: t.collision.bottom,
                    autoGenerated: true, // tag for identification
                };
                if (reverseFacing) obj.reverseFacing = true;

                objects.push(obj);
                placedPositions.push({ x, y });
                placed = true;
                break;
            }
        }
    }

    return objects;
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const preserveExisting = args.includes('--preserve-existing');

    const mapsPath = path.join(__dirname, '..', 'data', 'maps.json');
    const objectsPath = path.join(__dirname, '..', 'data', 'objects.json');

    console.log('📦 Loading maps and objects...');
    const maps = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
    const objects = JSON.parse(fs.readFileSync(objectsPath, 'utf-8'));

    // Backup objects.json
    if (!dryRun) {
        const backupPath = objectsPath + '.bak';
        fs.writeFileSync(backupPath, JSON.stringify(objects, null, 2));
        console.log(`💾 Backed up objects.json → objects.json.bak`);
    }

    // Filter to world grid maps only (format: "X-Y" with integer coordinates)
    const worldMapRegex = /^-?\d+-(-?\d+)$/;
    const worldMapIds = Object.keys(maps).filter(id => worldMapRegex.test(id));

    console.log(`🌍 Found ${worldMapIds.length} world maps out of ${Object.keys(maps).length} total`);

    let totalGenerated = 0;
    let mapsProcessed = 0;
    let mapsSkipped = 0;
    const biomeCounts = {};

    for (const mapId of worldMapIds) {
        const mapData = maps[mapId];
        
        // Skip maps without biome
        if (!mapData.biome) {
            mapsSkipped++;
            continue;
        }

        // Skip maps with existing objects if preserving
        if (preserveExisting && objects[mapId] && objects[mapId].length > 0) {
            mapsSkipped++;
            continue;
        }

        // Use map ID as seed for deterministic per-map randomness
        const rng = new SeededRNG(`${SEED}_${mapId}`);
        const generated = generateObjectsForMap(mapId, mapData, rng);

        if (generated.length > 0) {
            if (preserveExisting && objects[mapId]) {
                // Merge: keep existing, add generated
                objects[mapId] = [...objects[mapId], ...generated];
            } else {
                objects[mapId] = generated;
            }
            totalGenerated += generated.length;
            mapsProcessed++;
            
            // Track biome stats
            biomeCounts[mapData.biome] = (biomeCounts[mapData.biome] || 0) + generated.length;
        }
    }

    console.log(`\n📊 Generation Summary:`);
    console.log(`   Maps processed: ${mapsProcessed}`);
    console.log(`   Maps skipped: ${mapsSkipped}`);
    console.log(`   Total objects generated: ${totalGenerated}`);
    console.log(`   Avg objects/map: ${(totalGenerated / Math.max(1, mapsProcessed)).toFixed(1)}`);
    console.log(`\n   By biome:`);
    Object.entries(biomeCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([biome, count]) => {
            const mapCount = worldMapIds.filter(id => maps[id].biome === biome).length;
            console.log(`     ${biome.padEnd(16)} ${count} objects across ${mapCount} maps (${(count/mapCount).toFixed(1)}/map)`);
        });

    if (dryRun) {
        console.log(`\n🔍 DRY RUN — no files modified.`);
    } else {
        // Write updated objects.json
        fs.writeFileSync(objectsPath, JSON.stringify(objects, null, 2));
        console.log(`\n✅ Wrote updated objects.json (${(fs.statSync(objectsPath).size / 1024 / 1024).toFixed(1)} MB)`);
    }
}

main();
