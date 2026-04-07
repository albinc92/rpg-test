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
    'snow':         [
        'Kelvarn\'s Summit', 'The Bleached Fangs', 'Hrothgar\'s Crown', 'The Shivering Expanse',
        'Dredmere Glacier', 'Ivellion Snowfields', 'The Pale Teeth', 'Whitecrest Range',
        'Sunderglass Peaks', 'Frosthollow Basin', 'Yeva\'s Lament', 'The Everfrost',
    ],
    'tundra':       [
        'The Windscour', 'Brennick\'s Folly', 'Ashenmoor Flats', 'The Grey Waste',
        'Haldr\'s Crossing', 'Wraithfen Tundra', 'Bleakwater Moor', 'The Scoured Reach',
        'Tormund\'s End', 'Duskmere Barrens',
    ],
    'frozen-peak':  [
        'The Shattered Spine', 'Algrimm\'s Spire', 'Frostfall Pinnacle', 'The Howling Crests',
        'Drakentooth Summit',
    ],
    'mountain':     [
        'Karstholm Ridge', 'The Iron Scarps', 'Torbreck Crags', 'Greymane Cliffs',
        'Aelric\'s Watch', 'Stonecutter Pass', 'Windshear Bluff', 'The Basalt Ramparts',
    ],
    'high-mountain':[
        'Drakenfall Heights', 'The Stormspear', 'Theron\'s Pinnacle', 'The Cloudbreak',
        'Titan\'s Jaw', 'Eaglerest Peaks', 'The Sundercrags',
    ],
    'volcanic':     [
        'The Ember Caldera', 'Ashenvault', 'Cinder Maw', 'Varakk\'s Furnace',
    ],
    'desert':       [
        'The Amber Desolation', 'Solarius Dunes', 'Kharad\'s Anvil', 'The Shimmersand',
        'Dust Veil Expanse', 'Orath\'s Crucible', 'Sandwhisper Flats', 'The Mirage Fields',
        'Cindergold Dunes', 'Thasseri Wastes',
    ],
    'arid-desert':  [
        'Redvein Badlands', 'The Cracked Maw', 'Dusthollow Mesa', 'Sable Flats',
        'Korrath\'s Blight', 'Ochrebane Wastes', 'The Scorchmark', 'Bleachbone Barrens',
        'Wrathwind Mesa', 'Carrack\'s Reach',
    ],
    'oasis':        [
        'Mistveil Springs', 'Lirien\'s Rest', 'The Jade Pool', 'Oasis of Selûn',
    ],
    'plains':       [
        'The Hearthlands', 'Aldenmere Fields', 'Tarven\'s Expanse', 'Goldbriar Prairie',
        'The Wayward Flats', 'Thornfield Basin', 'Harrowdale Plains', 'Longstride Prairie',
        'Millhaven Pastures', 'Brannock\'s Claim', 'The Rustgrass', 'Sunderfields',
        'Galsworth Run', 'Pennworth Downs', 'Duskwheat Reach', 'Calder\'s Prospect',
        'Ashford Grasslands', 'Ironwell Flats', 'The Heathermarch', 'Corwin\'s Pasture',
    ],
    'grassland':    [
        'Verdanthollow', 'Thistledown Vale', 'Briarcliff Meadows', 'Summerleigh Fields',
        'Fairhaven Pasture', 'Greenholme Dale', 'Harlowe Glen', 'Elowen\'s Lea',
        'The Dawngrass', 'Cloverwatch Downs',
    ],
    'meadow':       [
        'Willowbend Meadow', 'Petalwing Dale', 'Sorrel Glade', 'Honeyfield Lea',
        'Dewcrest Garden', 'Maren\'s Blush', 'Larkspur Hollow', 'Primeveil Meadow',
        'Goldpetal Clearing', 'Heather\'s Crown', 'Dawnpetal Drift', 'Fennwick Glade',
        'Silkwater Lea', 'Butterblossom Way',
    ],
    'woodland':     [
        'Evergloom Forest', 'The Tanglewood', 'Verdara\'s Canopy', 'Fernhollow Timberland',
        'Briarshadow Woods', 'The Mossweald', 'Ashenmere Forest', 'Thornwatch Thicket',
        'Elkrun Timberland', 'Grimshaw Woods', 'Larkhollow Grove', 'Cedarveil Reaches',
        'The Dapplewood', 'Ravenwild Forest', 'Dunmere Thicket', 'Corbin\'s Stand',
        'Harthwood', 'Mirewood', 'Silvbark Expanse', 'Wickerfen Woods',
    ],
    'dense-forest': [
        'The Blackthorn Depths', 'Gloomshroud Forest', 'Ironbark Wilds', 'Mordaunt\'s Hollow',
        'The Rotwood', 'Wraithveil Thicket', 'Nightfall Canopy', 'The Sunless Groves',
    ],
    'jungle':       [
        'The Verdant Maw', 'Serpentcoil Jungle', 'Mugava Wilds', 'The Steaming Tangle',
        'Thornvine Canopy',
    ],
    'swamp':        [
        'Brackenmire', 'Gaelwynn\'s Bog', 'The Rotmarsh', 'Gloomfen', 'Moldwater Fen',
        'Sorrowmere Marsh',
    ],
    'tropical':     [
        'Sunwrack Coast', 'The Cerulean Shallows', 'Palmhaven', 'Lanivar Bay',
        'Driftwood Strand',
    ],
    'coast':        [
        'Saltmere Shore', 'Gaelcrest Bay', 'Breakwater Cove', 'Driftwood Point',
        'Marren\'s Strand', 'Tidewatch Beach', 'Windbreak Shallows',
    ],
    'lake':         [
        'Lake Aethermere', 'The Stillwater', 'Crystalveil Mere', 'Sigren\'s Pool',
        'Moonhollow Lake', 'Lake Vyrendale', 'The Deepmirror', 'Ashwater Lake',
    ],
    'river-valley': [
        'The Serpent\'s Bend', 'Rivendale Crossing', 'Narrowbrook Valley', 'Galwyn\'s Ford',
        'Mistwater Banks', 'The Greenrun', 'Stonebridge Basin', 'Thornwater Gorge',
    ],
    'village':      [
        'Millhaven', 'Thornbury', 'Wycliffe Settlement', 'Brannock\'s Rest',
    ]
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

            // Merge into best neighbor — prefer same biome category
            const WATER_BIOMES = new Set(['lake', 'coast', 'river-valley']);
            const isWater = WATER_BIOMES.has(region.biome);

            // First pass: try same biome
            let bestRegion = -1, bestSize = 0;
            for (const [ri] of neighborRegions) {
                if (regions[ri].biome === region.biome && regions[ri].cells.length > bestSize) {
                    bestSize = regions[ri].cells.length;
                    bestRegion = ri;
                }
            }
            // Second pass: try same category (water↔water, land↔land)
            if (bestRegion < 0) {
                bestSize = 0;
                for (const [ri] of neighborRegions) {
                    const nWater = WATER_BIOMES.has(regions[ri].biome);
                    if (nWater === isWater && regions[ri].cells.length > bestSize) {
                        bestSize = regions[ri].cells.length;
                        bestRegion = ri;
                    }
                }
            }
            // Last resort: any neighbor
            if (bestRegion < 0) {
                bestSize = 0;
                for (const [ri] of neighborRegions) {
                    if (regions[ri].cells.length > bestSize) {
                        bestSize = regions[ri].cells.length;
                        bestRegion = ri;
                    }
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
