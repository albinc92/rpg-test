/**
 * Analyze worldmap texture — break into 32×18 grid, classify biome per cell
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
const OCEAN_THRESHOLD = 0.50;   // 50% ocean sub-cells → cell is ocean
const LAVA_THRESHOLD = 0.05;    // 5% lava sub-cells → cell is volcanic (bright lava only)

// ───── Biome classifier for a small patch (average RGB) ─────
// Tuned for grok-worldmap.jpg color palette

function classifyBiome(r, g, b) {
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    // ── Ocean (strong blue, B well above both R and G) ──
    if (b > r + 25 && b > g + 10 && brightness < 150) return 'ocean';
    if (b > r + 30 && brightness < 100) return 'ocean';

    // ── Snow / Ice (very bright, low saturation) ──
    if (brightness > 200 && saturation < 45) return 'snow';
    if (brightness > 175 && saturation < 55) return 'tundra';
    // Blue-gray transition between ice and mountains
    if (brightness > 130 && saturation < 40 && b > r + 10 && b > g) return 'tundra';

    // ── Lava (bright red/orange — tracked separately for volcanic boost) ──
    // Require low G to avoid catching warm sandy desert tones
    if (r > 120 && g < 70 && r > g * 1.5 && r > b * 1.5) return 'lava';
    if (r > 80 && g < 50 && b < 40) return 'lava';

    // ── Desert / Badlands (warm R>G>B, moderate+ brightness) ──
    if (r > g && g > b && brightness > 108 && saturation > 40) return 'desert';
    if (r > g && g > b && brightness > 80 && saturation > 40 && (g - b) < 42) return 'arid-desert';

    // ── Plains / Center (golden wheat tones, large gap between G and B) ──
    if (r > b + 30 && g > b + 25 && brightness > 80 && (g - b) >= 35) return 'plains';

    // ── Grassland (green dominant, moderate brightness) ──
    if (g > r && g > b && brightness > 65 && saturation > 25) return 'grassland';
    if (g >= r - 10 && g > b + 10 && brightness > 65 && saturation > 25) return 'grassland';

    // ── Mountain (gray, low saturation, not too dark) ──
    if (saturation < 20 && brightness >= 55) return 'mountain';

    // ── Dark biome discrimination (brightness < 55) ──
    // Swamp vs Jungle: both dark with green, but jungle has much stronger green dominance
    if (brightness < 55 && g > b + 3) {
        if (g > r + 12) return 'jungle';       // strong green = rainforest
        if (saturation < 30) return 'swamp';    // muted dark = swamp
    }

    // ── Dark mountain (blue-gray, B clearly above R) ──
    if (brightness < 55 && saturation < 20 && b > r + 8) return 'mountain';

    // ── Volcanic (very dark, nearly neutral) ──
    if (brightness < 55 && saturation < 15) return 'volcanic';

    // ── Fallback ──
    if (saturation < 15) return 'mountain';
    if (brightness > 120) return 'plains';
    if (g >= r) return 'grassland';
    return 'plains';
}

/**
 * Classify a grid cell using sub-cell majority vote.
 * Returns the final biome string (water sub-cells mapped to lake/coast/river-valley).
 */
function classifyCellByVoting(raw, imgW, channels, cellX0, cellY0, cellW, cellH, imgH) {
    const subW = Math.floor(cellW / SUB_DIVISIONS);
    const subH = Math.floor(cellH / SUB_DIVISIONS);
    const votes = {};  // biome → count
    let oceanCount = 0;
    let lavaCount = 0;
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
            if (biome === 'ocean') oceanCount++;
            if (biome === 'lava') lavaCount++;
            votes[biome] = (votes[biome] || 0) + 1;
        }
    }

    // Ocean boost: majority ocean sub-cells → ocean
    const oceanRatio = oceanCount / totalSubs;
    if (oceanRatio >= OCEAN_THRESHOLD) return 'ocean';

    // Water/ocean presence → lake or river-valley
    if (oceanRatio >= WATER_THRESHOLD) {
        if (oceanRatio >= 0.4) return 'lake';
        return 'river-valley';
    }

    // Lava boost: bright lava pixels detected → cell is volcanic
    // Only 'lava' (bright red/orange) counts, not dark basalt
    if (lavaCount / totalSubs >= LAVA_THRESHOLD) return 'volcanic';

    // Merge lava votes into volcanic for majority voting
    if (votes['lava']) {
        votes['volcanic'] = (votes['volcanic'] || 0) + votes['lava'];
        delete votes['lava'];
    }

    // Otherwise, majority vote (exclude 'ocean' since it didn't hit threshold)
    delete votes['ocean'];
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
    'ocean':        { adj: ['Deep', 'Open', 'Storm', 'Dark', 'Endless'], noun: ['Sea', 'Ocean', 'Waters', 'Depths', 'Abyss'] },
    'snow':         { adj: ['Frozen', 'White', 'Crystal', 'Silent', 'Pale', 'Winter', 'Frost'], noun: ['Wastes', 'Expanse', 'Tundra', 'Reaches', 'Fields', 'Plateau'] },
    'tundra':       { adj: ['Cold', 'Bitter', 'Northern', 'Wind-swept', 'Barren', 'Grey'], noun: ['Steppe', 'Heath', 'Flats', 'Barrens', 'Moor', 'Reach'] },
    'frozen-peak':  { adj: ['Ice', 'Frozen', 'Crystal', 'Howling'], noun: ['Peak', 'Summit', 'Crest', 'Pinnacle', 'Ridge'] },
    'mountain':     { adj: ['Stone', 'Iron', 'Grey', 'Craggy', 'Rugged', 'Stark'], noun: ['Mountains', 'Peaks', 'Cliffs', 'Ridge', 'Crags', 'Heights'] },
    'high-mountain':{ adj: ['Towering', 'Ancient', 'Storm', 'Cloud'], noun: ['Peaks', 'Summit', 'Spire', 'Pinnacle', 'Heights'] },
    'volcanic':     { adj: ['Burning', 'Ashen', 'Smoldering', 'Black'], noun: ['Caldera', 'Wastes', 'Crater', 'Furnace'] },
    'lava':         { adj: ['Burning', 'Ashen', 'Smoldering', 'Black'], noun: ['Caldera', 'Wastes', 'Crater', 'Furnace'] },
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
    const imgPath = path.join(__dirname, 'assets', 'bg', 'grok-worldmap.jpg');
    const mapsPath = path.join(__dirname, 'data', 'maps.json');
    
    // Load image
    const img = sharp(imgPath);
    const meta = await img.metadata();
    const raw = await img.raw().toBuffer();
    const channels = meta.channels || 3;
    const GRID_COLS = 32, GRID_ROWS = 18;
    const cellW = Math.floor(meta.width / GRID_COLS);
    const cellH = Math.floor(meta.height / GRID_ROWS);
    
    console.log(`Image: ${meta.width}×${meta.height}, grid: ${GRID_COLS}×${GRID_ROWS}, cell: ${cellW}×${cellH}, channels: ${channels}`);
    
    // Grid range: x -15..16, y -8..9
    const gridMinX = -15, gridMaxX = 16;
    const gridMinY = -8, gridMaxY = 9;
    
    // Analyze each cell using sub-cell majority vote
    const cellBiomes = {};
    const biomeCounts = {};
    
    for (let gy = 0; gy < GRID_ROWS; gy++) {
        for (let gx = 0; gx < GRID_COLS; gx++) {
            const cellX0 = gx * cellW;
            const cellY0 = gy * cellH;
            
            const biome = classifyCellByVoting(raw, meta.width, channels, cellX0, cellY0, cellW, cellH, meta.height);
            
            const mapX = gridMinX + gx;
            const mapY = gridMaxY - gy;  // Image top = north = maxY
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
    const specialMaps = Object.entries(mapsData).filter(([k,v]) => v.isBattleMap).map(([k]) => k);
    
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
