/**
 * Analyze worldmap.png texture — break into 30×30 grid, classify biome per cell
 * using sub-cell sampling with majority vote, then update maps.json.
 *
 * Each grid cell is divided into SUB_DIVISIONS × SUB_DIVISIONS sub-cells.
 * Each sub-cell is classified independently, then the cell's biome is decided
 * by majority vote.  Water sub-cells get a boost: if ≥ WATER_THRESHOLD of
 * sub-cells are water, the whole cell is classified as water (river-valley).
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SUB_DIVISIONS = 6;        // 6×6 = 36 sub-cells per grid cell
const WATER_THRESHOLD = 0.20;   // 20% water sub-cells → cell is river/water

// ───── Biome classifier for a small patch (average RGB) ─────

function classifyBiome(r, g, b) {
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    // ── Water (check FIRST — critical for rivers/lakes) ──
    // Strong blue dominance
    if (b > r + 25 && b > g + 5) return 'water';
    // Blue-teal (river color on this map): b ≈ g, both clearly > r
    if (b > r + 10 && b >= g - 5 && brightness < 160) return 'water';
    // Muted teal in shadow
    if (g > r + 5 && b > r + 5 && b >= g - 10 && brightness < 130) return 'water';

    // ── Snow / Frozen ──
    if (brightness > 210 && saturation < 40) return 'snow';
    if (brightness > 195 && saturation < 50) return 'tundra';

    // ── Desert / Arid (warm, bright, r > g > b) ──
    if (brightness > 180 && r > g && g > b && saturation > 30) return 'desert';
    if (brightness > 160 && r > g && g > b && saturation > 40) return 'arid-desert';
    if (brightness > 150 && r > g - 10 && g > b && saturation > 25 && saturation < 80) return 'plains';

    // ── Dark green ──
    if (g > r && g > b && brightness < 80) return 'dense-forest';
    if (g > r && g > b && brightness < 100 && saturation > 40) return 'jungle';

    // ── Medium green → woodland ──
    if (g > r && g > b && brightness < 120 && saturation > 35) return 'woodland';
    if (g >= r - 5 && g > b && brightness < 135 && saturation > 30) return 'woodland';

    // ── Light green → grassland / meadow ──
    if (g > r && g > b && brightness < 160) return 'grassland';
    if (g >= r - 10 && g > b && brightness < 170 && saturation > 20) return 'meadow';

    // ── Grey-green → swamp ──
    if (brightness < 120 && saturation < 30 && g >= r && g >= b) return 'swamp';

    // ── Grey → mountain ──
    if (saturation < 25 && brightness < 140) return 'mountain';
    if (saturation < 30 && brightness < 170 && brightness > 120) return 'high-mountain';

    // ── Brown / tan ──
    if (r > g && g > b && brightness < 130 && saturation > 40) return 'woodland';
    if (r > g && g > b && brightness < 160) return 'plains';
    if (brightness > 140 && brightness < 180 && saturation < 50) return 'plains';

    // ── Fallback ──
    if (brightness > 160) return 'plains';
    if (brightness > 120) return 'grassland';
    return 'woodland';
}

/**
 * Classify a grid cell using sub-cell majority vote.
 * Returns the final biome string (water sub-cells mapped to lake/coast/river-valley).
 */
function classifyCellByVoting(raw, imgW, channels, cellX0, cellY0, cellW, cellH, imgH) {
    const subW = Math.floor(cellW / SUB_DIVISIONS);
    const subH = Math.floor(cellH / SUB_DIVISIONS);
    const votes = {};  // biome → count
    let waterCount = 0;
    const totalSubs = SUB_DIVISIONS * SUB_DIVISIONS;

    for (let sy = 0; sy < SUB_DIVISIONS; sy++) {
        for (let sx = 0; sx < SUB_DIVISIONS; sx++) {
            const x0 = cellX0 + sx * subW;
            const y0 = cellY0 + sy * subH;
            let r = 0, g = 0, b = 0, cnt = 0;

            for (let py = y0; py < y0 + subH && py < imgH; py++) {
                for (let px = x0; px < x0 + subW && px < imgW; px++) {
                    const i = (py * imgW + px) * channels;
                    r += raw[i]; g += raw[i + 1]; b += raw[i + 2]; cnt++;
                }
            }
            if (cnt === 0) continue;
            r = Math.round(r / cnt);
            g = Math.round(g / cnt);
            b = Math.round(b / cnt);

            const biome = classifyBiome(r, g, b);
            if (biome === 'water') {
                waterCount++;
            }
            votes[biome] = (votes[biome] || 0) + 1;
        }
    }

    // Water boost: if enough sub-cells are water, the cell is water
    const waterRatio = waterCount / totalSubs;
    if (waterRatio >= WATER_THRESHOLD) {
        // Decide lake vs river-valley based on how much water
        if (waterRatio >= 0.6) return 'lake';
        return 'river-valley';
    }

    // Otherwise, majority vote (exclude 'water' since it didn't hit threshold)
    delete votes['water'];
    let bestBiome = 'grassland', bestCount = 0;
    for (const [biome, count] of Object.entries(votes)) {
        if (count > bestCount) {
            bestCount = count;
            bestBiome = biome;
        }
    }
    return bestBiome;
}

// ───── Region name generator ─────

const BIOME_NAME_PARTS = {
    'snow':         { adj: ['Frozen', 'White', 'Crystal', 'Silent', 'Pale', 'Winter', 'Frost'], noun: ['Wastes', 'Expanse', 'Tundra', 'Reaches', 'Fields', 'Plateau'] },
    'tundra':       { adj: ['Cold', 'Bitter', 'Northern', 'Wind-swept', 'Barren', 'Grey'], noun: ['Steppe', 'Heath', 'Flats', 'Barrens', 'Moor', 'Reach'] },
    'frozen-peak':  { adj: ['Ice', 'Frozen', 'Crystal', 'Howling'], noun: ['Peak', 'Summit', 'Crest', 'Pinnacle', 'Ridge'] },
    'mountain':     { adj: ['Stone', 'Iron', 'Grey', 'Craggy', 'Rugged', 'Stark'], noun: ['Mountains', 'Peaks', 'Cliffs', 'Ridge', 'Crags', 'Heights'] },
    'high-mountain':{ adj: ['Towering', 'Ancient', 'Storm', 'Cloud'], noun: ['Peaks', 'Summit', 'Spire', 'Pinnacle', 'Heights'] },
    'volcanic':     { adj: ['Burning', 'Ashen', 'Smoldering', 'Black'], noun: ['Caldera', 'Wastes', 'Crater', 'Furnace'] },
    'desert':       { adj: ['Golden', 'Scorching', 'Vast', 'Shifting', 'Sunbaked', 'Amber'], noun: ['Desert', 'Sands', 'Dunes', 'Expanse', 'Wastes', 'Flats'] },
    'arid-desert':  { adj: ['Dry', 'Cracked', 'Dusty', 'Parched', 'Red'], noun: ['Badlands', 'Wastes', 'Barrens', 'Flats', 'Mesa'] },
    'oasis':        { adj: ['Hidden', 'Verdant', 'Emerald', 'Blessed'], noun: ['Oasis', 'Springs', 'Haven', 'Pool'] },
    'plains':       { adj: ['Rolling', 'Open', 'Wide', 'Golden', 'Gentle', 'Amber'], noun: ['Plains', 'Prairie', 'Steppe', 'Fields', 'Grassland', 'Flatland'] },
    'grassland':    { adj: ['Green', 'Lush', 'Verdant', 'Sunlit', 'Bright', 'Wild'], noun: ['Meadow', 'Fields', 'Grassland', 'Pasture', 'Glen', 'Vale'] },
    'meadow':       { adj: ['Flower', 'Spring', 'Sunny', 'Gentle', 'Soft'], noun: ['Meadow', 'Dale', 'Glade', 'Lea', 'Garden'] },
    'woodland':     { adj: ['Whispering', 'Old', 'Shady', 'Quiet', 'Mossy', 'Amber'], noun: ['Woods', 'Forest', 'Grove', 'Thicket', 'Timberland'] },
    'dense-forest': { adj: ['Dark', 'Ancient', 'Deep', 'Tangled', 'Primeval', 'Shadow'], noun: ['Forest', 'Wilds', 'Depths', 'Thicket', 'Woodland'] },
    'jungle':       { adj: ['Twisted', 'Steaming', 'Wild', 'Overgrown', 'Lush'], noun: ['Jungle', 'Rainforest', 'Canopy', 'Wilds', 'Tangle'] },
    'swamp':        { adj: ['Murky', 'Foggy', 'Rotting', 'Dank', 'Misty'], noun: ['Swamp', 'Marsh', 'Bog', 'Mire', 'Fen'] },
    'tropical':     { adj: ['Warm', 'Balmy', 'Exotic', 'Vibrant', 'Bright'], noun: ['Coast', 'Shore', 'Isle', 'Paradise', 'Lagoon'] },
    'coast':        { adj: ['Salty', 'Breezy', 'Sandy', 'Calm', 'Rocky'], noun: ['Shore', 'Coast', 'Beach', 'Cove', 'Bay'] },
    'lake':         { adj: ['Still', 'Crystal', 'Deep', 'Mirror', 'Blue'], noun: ['Lake', 'Waters', 'Shallows', 'Mere', 'Pool'] },
    'river-valley': { adj: ['Winding', 'Rushing', 'Fertile', 'Gentle'], noun: ['Valley', 'Crossing', 'Banks', 'Basin', 'Bend'] },
    'village':      { adj: ['Quiet', 'Small', 'Humble', 'Cozy', 'Rustic'], noun: ['Village', 'Hamlet', 'Settlement', 'Town', 'Homestead'] }
};

function generateName(biome, usedNames) {
    const parts = BIOME_NAME_PARTS[biome] || BIOME_NAME_PARTS['grassland'];
    let attempts = 0;
    while (attempts < 50) {
        const adj = parts.adj[Math.floor(Math.random() * parts.adj.length)];
        const noun = parts.noun[Math.floor(Math.random() * parts.noun.length)];
        const name = `${adj} ${noun}`;
        if (!usedNames.has(name)) {
            usedNames.add(name);
            return name;
        }
        attempts++;
    }
    // Fallback with coordinate suffix
    const adj = parts.adj[Math.floor(Math.random() * parts.adj.length)];
    const noun = parts.noun[Math.floor(Math.random() * parts.noun.length)];
    return `${adj} ${noun} ${Math.floor(Math.random() * 100)}`;
}

// ───── Main ─────

async function main() {
    const imgPath = path.join(__dirname, 'assets', 'bg', 'worldmap.png');
    const mapsPath = path.join(__dirname, 'data', 'maps.json');
    
    // Load image
    const img = sharp(imgPath);
    const meta = await img.metadata();
    const raw = await img.raw().toBuffer();
    const channels = meta.channels || 3;
    const cellW = Math.floor(meta.width / 30);
    const cellH = Math.floor(meta.height / 30);
    
    console.log(`Image: ${meta.width}×${meta.height}, cell: ${cellW}×${cellH}, channels: ${channels}`);
    
    // Grid range: x -14..15, y -14..15
    const gridMinX = -14, gridMaxX = 15;
    const gridMinY = -14, gridMaxY = 15;
    
    // Analyze each cell using sub-cell majority vote
    const cellBiomes = {};
    const biomeCounts = {};
    
    for (let gy = 0; gy < 30; gy++) {
        for (let gx = 0; gx < 30; gx++) {
            const cellX0 = gx * cellW;
            const cellY0 = gy * cellH;
            
            const biome = classifyCellByVoting(raw, meta.width, channels, cellX0, cellY0, cellW, cellH, meta.height);
            
            const mapX = gridMinX + gx;
            const mapY = gridMinY + gy;
            const mapId = `${mapX}-${mapY}`;
            
            cellBiomes[mapId] = { biome };
            biomeCounts[biome] = (biomeCounts[biome] || 0) + 1;
        }
    }
    
    console.log('\nBiome distribution:');
    for (const [biome, count] of Object.entries(biomeCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${biome}: ${count}`);
    }
    
    // Load maps.json
    const mapsData = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
    
    // Preserve special maps (non-grid maps)
    const specialMaps = Object.entries(maps).filter(([k,v]) => v.isBattleMap).map(([k]) => k);
    
    // Preserved existing maps that have been manually edited (keep their names if set)
    const preservedIds = new Set(['0-0', '0-1', '1-0', '1-1', '-1-0', '-1-1']);
    
    // Generate names
    const usedNames = new Set();
    // Reserve existing names
    for (const id of preservedIds) {
        if (mapsData[id] && mapsData[id].name) {
            usedNames.add(mapsData[id].name);
        }
    }
    
    let updated = 0;
    for (const [mapId, cellInfo] of Object.entries(cellBiomes)) {
        if (specialMaps.includes(mapId)) continue;
        
        if (mapsData[mapId]) {
            // Update biome
            mapsData[mapId].biome = cellInfo.biome;
            
            // Update name only for non-preserved maps
            if (!preservedIds.has(mapId)) {
                const newName = generateName(cellInfo.biome, usedNames);
                mapsData[mapId].name = newName;
            }
            updated++;
        }
    }
    
    console.log(`\nUpdated ${updated} maps in maps.json`);
    
    // Backup and write
    fs.copyFileSync(mapsPath, mapsPath + '.bak2');
    fs.writeFileSync(mapsPath, JSON.stringify(mapsData, null, 2));
    console.log('Done! Backup saved as maps.json.bak2');
}

main().catch(console.error);
