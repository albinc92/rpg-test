/**
 * Analyze worldmap.png texture — break into 30×30 grid, classify biome per cell,
 * generate region names, and update maps.json accordingly.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ───── Biome classifier based on average RGB ─────

function classifyBiome(r, g, b) {
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    
    // Very bright / white → snow / frozen
    if (brightness > 210 && saturation < 40) return 'snow';
    if (brightness > 195 && saturation < 50) return 'tundra';
    
    // Very bright warm tones → desert / arid
    if (brightness > 180 && r > g && g > b && saturation > 30) return 'desert';
    if (brightness > 160 && r > g && g > b && saturation > 40) return 'arid-desert';
    
    // Sandy / beige tones
    if (brightness > 150 && r > g - 10 && g > b && saturation > 25 && saturation < 80) return 'plains';
    
    // Blue-ish → water
    if (b > r + 30 && b > g + 10) return 'lake';
    if (b > r + 15 && b > g) return 'coast';
    
    // Dark green → dense forest / jungle
    if (g > r && g > b && brightness < 80) return 'dense-forest';
    if (g > r && g > b && brightness < 100 && saturation > 40) return 'jungle';
    
    // Medium green → woodland / forest
    if (g > r && g > b && brightness < 120 && saturation > 35) return 'woodland';
    if (g >= r - 5 && g > b && brightness < 135 && saturation > 30) return 'woodland';
    
    // Light green → grassland / meadow
    if (g > r && g > b && brightness < 160) return 'grassland';
    if (g >= r - 10 && g > b && brightness < 170 && saturation > 20) return 'meadow';
    
    // Grey-green tones → swamp
    if (brightness < 120 && saturation < 30 && g >= r && g >= b) return 'swamp';
    
    // Grey tones → mountain
    if (saturation < 25 && brightness < 140) return 'mountain';
    if (saturation < 30 && brightness < 170 && brightness > 120) return 'high-mountain';
    
    // Brown / tan tones
    if (r > g && g > b && brightness < 130 && saturation > 40) return 'woodland';
    if (r > g && g > b && brightness < 160) return 'plains';
    
    // Warm medium brightness → village / settlement feel
    if (brightness > 140 && brightness < 180 && saturation < 50) return 'plains';
    
    // Fallback
    if (brightness > 160) return 'plains';
    if (brightness > 120) return 'grassland';
    return 'woodland';
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
    
    // Analyze each cell
    const cellBiomes = {};
    const biomeCounts = {};
    
    for (let gy = 0; gy < 30; gy++) {
        for (let gx = 0; gx < 30; gx++) {
            let r = 0, g = 0, b = 0, count = 0;
            for (let py = gy * cellH; py < (gy + 1) * cellH && py < meta.height; py++) {
                for (let px = gx * cellW; px < (gx + 1) * cellW && px < meta.width; px++) {
                    const idx = (py * meta.width + px) * channels;
                    r += raw[idx]; g += raw[idx + 1]; b += raw[idx + 2];
                    count++;
                }
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            
            const mapX = gridMinX + gx;
            const mapY = gridMinY + gy;
            const biome = classifyBiome(r, g, b);
            const mapId = `${mapX}-${mapY}`;
            
            cellBiomes[mapId] = { biome, r, g, b };
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
    const specialMaps = ['0-1-shop', 'forest-battle-01'];
    
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
