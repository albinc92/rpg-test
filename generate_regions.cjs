/**
 * Group map cells into named regions by flood-filling adjacent same-biome cells.
 * Small regions (< MIN_REGION_SIZE) get merged into their largest neighbor.
 * Updates maps.json with a `region` field per map.
 */
const fs = require('fs');
const path = require('path');

const MIN_REGION_SIZE = 4; // regions smaller than this get absorbed

// ───── Grid setup ─────
const gridMinX = -14, gridMaxX = 15;
const gridMinY = -14, gridMaxY = 15;
const cols = gridMaxX - gridMinX + 1; // 30
const rows = gridMaxY - gridMinY + 1; // 30

function mapId(x, y) { return `${x}-${y}`; }

// Map grid coords to array index
function idx(gx, gy) { return (gy - gridMinY) * cols + (gx - gridMinX); }

// Neighbors (4-connected for cleaner regions)
function neighbors(x, y) {
    return [
        [x-1, y], [x+1, y], [x, y-1], [x, y+1]
    ].filter(([nx, ny]) => nx >= gridMinX && nx <= gridMaxX && ny >= gridMinY && ny <= gridMaxY);
}

// ───── Region name generator ─────
const REGION_NAMES = {
    'snow':         ['Frozen Wastes', 'Crystal Expanse', 'Pale Reaches', 'Frost Hollows', 'Winter Fields', 'Silent Tundra', 'Icewind Flats', 'Snowdrift Plains', 'Glacial Plateau', 'White Veil'],
    'tundra':       ['Bitter Steppe', 'Wind-swept Heath', 'Grey Barrens', 'Cold Moor', 'Northern Reach', 'Frostbite Flats', 'Ashen Tundra', 'Bleakwind Steppe', 'Barren Moor', 'Pale Heath'],
    'frozen-peak':  ['Ice Crown Peaks', 'Frozen Spires', 'Crystal Summit', 'Howling Pinnacles', 'Shattered Ridge'],
    'mountain':     ['Ironstone Mountains', 'Grey Crags', 'Storm Peaks', 'Craggy Heights', 'Stone Ridge', 'Granite Reach', 'Windshear Cliffs', 'Basalt Spires'],
    'high-mountain':['Cloud Peaks', 'Towering Spires', 'Ancient Summit', 'Sky Ridge', 'Thundercrest Heights', 'Eagle Peaks', 'Titan Ridge'],
    'volcanic':     ['Burning Caldera', 'Ashen Wastes', 'Emberfall Crater', 'Black Furnace'],
    'desert':       ['Golden Sands', 'Sunbaked Expanse', 'Shifting Dunes', 'Amber Wastes', 'Scorching Flats', 'Mirage Desert', 'Dust Devil Sands', 'Sandstorm Reach'],
    'arid-desert':  ['Red Badlands', 'Cracked Mesa', 'Dusty Barrens', 'Parched Flats', 'Dry Gulch', 'Ochre Wastes', 'Sunscorch Barrens', 'Rust Flats', 'Bone Dry Mesa', 'Withered Expanse'],
    'oasis':        ['Hidden Oasis', 'Emerald Springs', 'Blessed Pool', 'Verdant Haven'],
    'plains':       ['Rolling Plains', 'Golden Prairie', 'Open Steppe', 'Amber Fields', 'Wide Grassland', 'Gentle Flatland', 'Windswept Prairie', 'Harvest Fields', 'Sunlit Steppe', 'Horizon Plains', 'Tall Grass Prairie', 'Settler Plains', 'Wanderer Flats', 'Dusty Trail', 'Wheatfield Run', 'Barley Reach', 'Dawn Meadow', 'Iron Steppe', 'Silver Grass Basin', 'Great Expanse'],
    'grassland':    ['Green Meadows', 'Verdant Fields', 'Sunlit Pasture', 'Wild Glen', 'Bright Vale', 'Lush Grassland', 'Spring Meadows', 'Emerald Dale', 'Grazing Lands', 'Clover Fields'],
    'meadow':       ['Flower Meadow', 'Spring Dale', 'Sunny Glade', 'Gentle Lea', 'Soft Garden', 'Blossom Fields', 'Dewdrop Meadow', 'Wildflower Glen', 'Honeybee Meadow', 'Morning Mist Lea', 'Petal Hollow', 'Daisy Drift', 'Primrose Way', 'Lily Path'],
    'woodland':     ['Whispering Woods', 'Old Forest', 'Shady Grove', 'Quiet Thicket', 'Mossy Timberland', 'Amber Woods', 'Rustling Forest', 'Dappled Grove', 'Birchwood Forest', 'Oakshade Woods', 'Thornbriar Thicket', 'Elm Hollow', 'Pinewood Trail', 'Cedar Canopy', 'Willowmere Woods'],
    'dense-forest': ['Dark Forest', 'Ancient Wilds', 'Deep Thicket', 'Shadow Woodland', 'Primeval Depths', 'Tanglewood', 'Nightshade Forest', 'Ironbark Wilds'],
    'jungle':       ['Twisted Jungle', 'Steaming Rainforest', 'Wild Canopy', 'Overgrown Tangle', 'Emerald Jungle'],
    'swamp':        ['Murky Swamp', 'Foggy Marsh', 'Dank Mire', 'Misty Fen', 'Rotting Bog', 'Gloom Marsh'],
    'tropical':     ['Warm Coast', 'Balmy Shore', 'Exotic Lagoon', 'Vibrant Isle', 'Palm Bay'],
    'coast':        ['Salty Shore', 'Rocky Coast', 'Sandy Cove', 'Calm Bay', 'Breezy Beach'],
    'lake':         ['Crystal Lake', 'Mirror Waters', 'Deep Mere', 'Still Shallows', 'Blue Pool'],
    'river-valley': ['Winding Valley', 'Rushing Banks', 'Fertile Basin', 'River Bend', 'Gentle Crossing'],
    'village':      ['Quiet Village', 'Small Hamlet', 'Rustic Settlement', 'Cozy Homestead']
};

// ───── Main ─────

function main() {
    const mapsPath = path.join(__dirname, 'data', 'maps.json');
    const mapsData = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));

    // Build biome grid
    const biomeGrid = {}; // mapId → biome
    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            if (mapsData[id]) {
                biomeGrid[id] = mapsData[id].biome || 'grassland';
            }
        }
    }

    // ───── Flood-fill to find connected components ─────
    const visited = new Set();
    const regions = []; // [{cells: [mapId, ...], biome: string}]

    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            if (visited.has(id) || !biomeGrid[id]) continue;

            const biome = biomeGrid[id];
            const cells = [];
            const queue = [[x, y]];
            visited.add(id);

            while (queue.length > 0) {
                const [cx, cy] = queue.shift();
                cells.push(mapId(cx, cy));

                for (const [nx, ny] of neighbors(cx, cy)) {
                    const nid = mapId(nx, ny);
                    if (!visited.has(nid) && biomeGrid[nid] === biome) {
                        visited.add(nid);
                        queue.push([nx, ny]);
                    }
                }
            }

            regions.push({ cells, biome });
        }
    }

    console.log(`Found ${regions.length} initial regions`);
    console.log('Size distribution:', regions.map(r => r.cells.length).sort((a,b) => b-a).join(', '));

    // ───── Merge small regions into largest adjacent neighbor ─────
    // Build cell→region index
    const cellToRegion = {};
    regions.forEach((r, i) => r.cells.forEach(c => cellToRegion[c] = i));

    let mergeCount = 0;
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            if (region.cells.length === 0) continue; // already merged away
            if (region.cells.length >= MIN_REGION_SIZE) continue;

            // Find neighboring regions
            const neighborRegions = new Map(); // regionIdx → count of border cells
            for (const cellId of region.cells) {
                // Parse coordinates from mapId
                const match = cellId.match(/^(-?\d+)-(-?\d+)$/);
                if (!match) continue;
                const cx = parseInt(match[1]), cy = parseInt(match[2]);
                for (const [nx, ny] of neighbors(cx, cy)) {
                    const nid = mapId(nx, ny);
                    const nRegion = cellToRegion[nid];
                    if (nRegion !== undefined && nRegion !== i) {
                        neighborRegions.set(nRegion, (neighborRegions.get(nRegion) || 0) + 1);
                    }
                }
            }

            if (neighborRegions.size === 0) continue;

            // Merge into largest neighbor
            let bestRegion = -1, bestSize = 0;
            for (const [ri] of neighborRegions) {
                if (regions[ri].cells.length > bestSize) {
                    bestSize = regions[ri].cells.length;
                    bestRegion = ri;
                }
            }

            if (bestRegion >= 0) {
                // Move cells to the larger region
                for (const cellId of region.cells) {
                    regions[bestRegion].cells.push(cellId);
                    cellToRegion[cellId] = bestRegion;
                }
                region.cells = [];
                mergeCount++;
                changed = true;
            }
        }
    }

    // Filter out empty regions
    const finalRegions = regions.filter(r => r.cells.length > 0);
    console.log(`After merging: ${finalRegions.length} regions (merged ${mergeCount} small regions)`);
    console.log('Final sizes:', finalRegions.map(r => `${r.biome}:${r.cells.length}`).sort().join(', '));

    // ───── Name each region ─────
    const usedNames = new Set();
    const regionNames = [];

    for (const region of finalRegions) {
        const candidates = REGION_NAMES[region.biome] || REGION_NAMES['grassland'];
        let name = null;
        for (const n of candidates) {
            if (!usedNames.has(n)) {
                name = n;
                usedNames.add(n);
                break;
            }
        }
        if (!name) {
            // All names used, append a number
            name = candidates[0] + ' ' + (usedNames.size + 1);
            usedNames.add(name);
        }
        regionNames.push(name);
    }

    // ───── Update maps.json ─────
    // Build cell → region name lookup
    const cellRegionName = {};
    finalRegions.forEach((region, i) => {
        region.cells.forEach(cellId => {
            cellRegionName[cellId] = regionNames[i];
        });
    });

    let updated = 0;
    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            if (!mapsData[id]) continue;

            const regionName = cellRegionName[id];
            if (regionName) {
                mapsData[id].region = regionName;
                // Display coordinate (offset so 0,0 center becomes a nice number)
                const displayX = x - gridMinX; // 0-29
                const displayY = y - gridMinY; // 0-29
                mapsData[id].name = `${regionName} (${displayX},${displayY})`;
                updated++;
            }
        }
    }

    // Backup and write
    fs.copyFileSync(mapsPath, mapsPath + '.bak3');
    fs.writeFileSync(mapsPath, JSON.stringify(mapsData, null, 2));

    console.log(`\nUpdated ${updated} maps with region names`);
    console.log('Backup saved as maps.json.bak3');

    // Print region summary
    console.log('\n=== Region Summary ===');
    finalRegions.forEach((region, i) => {
        console.log(`  ${regionNames[i]} — ${region.biome} — ${region.cells.length} cells`);
    });
}

main();
