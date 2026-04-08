/**
 * 3-Tier Region Hierarchy Generator
 *
 * Tier 1 — Super-regions: adjacent cells sharing a biome *family*
 * Tier 2 — Regions:       adjacent cells sharing the exact same biome
 * Tier 3 — Map names:     unique individual cell names (Adjective + Noun)
 *
 * Word-level dedup across super-region and region names.
 * Map names are unique strings generated combinatorially per biome.
 *
 * Updates maps.json with  superRegion | region | name  per cell.
 */
const fs   = require('fs');
const path = require('path');

// ───── Config ─────
const MIN_REGION_SIZE       = 4;
const MIN_SUPER_REGION_SIZE = 6;

const gridMinX = -14, gridMaxX = 15;
const gridMinY = -14, gridMaxY = 15;

function mapId(x, y) { return `${x}-${y}`; }

function neighbors(x, y) {
    return [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
    ].filter(([nx, ny]) => nx >= gridMinX && nx <= gridMaxX &&
                           ny >= gridMinY && ny <= gridMaxY);
}

// ═══════════════════════════════════════════════════════════════════════
//  Biome → Family mapping
// ═══════════════════════════════════════════════════════════════════════
const BIOME_TO_FAMILY = {
    'snow':          'frozen',
    'tundra':        'frozen',
    'frozen-peak':   'frozen',
    'mountain':      'highland',
    'high-mountain': 'highland',
    'volcanic':      'highland',
    'desert':        'arid',
    'arid-desert':   'arid',
    'oasis':         'arid',
    'plains':        'temperate',
    'grassland':     'temperate',
    'meadow':        'temperate',
    'village':       'temperate',
    'woodland':      'forest',
    'dense-forest':  'forest',
    'jungle':        'forest',
    'swamp':         'wetland',
    'tropical':      'wetland',
    'coast':         'wetland',
    'lake':          'water',
    'river-valley':  'water',
};

// ═══════════════════════════════════════════════════════════════════════
//  Tier 1 — Super-region names  (per biome family)
// ═══════════════════════════════════════════════════════════════════════
// NOTE: Every significant word (3+ chars) must be unique across the ENTIRE pool
//       to avoid word-level dedup conflicts. No two names share a significant word.
const SUPER_REGION_NAMES = {
    'frozen': [
        'The Everwinter Reaches', 'Borean Icehold', 'Frigora Wastes',
        'The Pallid Hinterland', 'Rimeguard Expanse',
    ],
    'highland': [
        'The Stoneborn Citadel', 'Aethon Heights', 'Colossus Range',
        'Drakken Overlook', 'The Granite Bulwark',
    ],
    'arid': [
        'The Scorched Barrens', 'Pyrrha\'s Domain', 'Embersand Territory',
        'The Ochre Badlands', 'Dustwall Frontier',
    ],
    'temperate': [
        'The Verdant Heartland', 'The Golden Provinces', 'The Pastoral Commons',
        'The Brightmarch', 'Aeloria\'s Shire', 'The Midland Breadbasket',
        'Grainwatch Prefecture', 'The Harvest Lowfield', 'Thornbury Haven',
        'The Rustic Hinterlands', 'Wellspring Demesne', 'Dawnmere Tablelands',
        'Heathrow Cantonlands', 'Summergate Parcels',
    ],
    'forest': [
        'The Deepwood Realm', 'The Sylvan Empire', 'Timberhold Sanctuary',
        'The Greenwood Wilds', 'The Primeval Depths', 'Wildgrove Holdings',
        'The Mossborn League', 'Brackenweald Dominion',
    ],
    'wetland': [
        'The Drowned Marches', 'The Mistbound Watershed', 'Nereia\'s Basins',
        'The Tideswept Hollows', 'Brackenvale Lowlands',
    ],
    'water': [
        'The Shimmering Waterways', 'The Deepblue Lakeland', 'Aquilon\'s Heart',
        'Glasswater Sovereignty', 'The Azure Pools',
    ],
};

// ═══════════════════════════════════════════════════════════════════════
//  Tier 2 — Region names  (per biome)
// ═══════════════════════════════════════════════════════════════════════
const REGION_NAMES = {
    'snow': [
        'Kelvarn\'s Summit', 'The Bleached Fangs', 'Hrothgar\'s Crown', 'The Shivering Expanse',
        'Dredmere Glacier', 'Ivellion Snowfields', 'The Pale Teeth', 'Whitecrest Range',
        'Sunderglass Peaks', 'Frosthollow Basin', 'Yeva\'s Lament', 'The Everfrost',
        'Boreal Terrace', 'Glacierheim Shelf', 'Rime Veil Reach',
    ],
    'tundra': [
        'The Windscour', 'Brennick\'s Folly', 'Ashenmoor Flats', 'The Grey Waste',
        'Haldr\'s Crossing', 'Wraithfen Tundra', 'Bleakwater Moor', 'The Scoured Reach',
        'Tormund\'s End', 'Duskmere Barrens', 'Vakken Steppe', 'Hollowgust Plain',
    ],
    'frozen-peak': [
        'The Shattered Spine', 'Algrimm\'s Spire', 'Frostfall Pinnacle', 'The Howling Crests',
        'Drakentooth Summit',
    ],
    'mountain': [
        'Karstholm Ridge', 'The Iron Scarps', 'Torbreck Crags', 'Greymane Cliffs',
        'Aelric\'s Watch', 'Stonecutter Pass', 'Windshear Bluff', 'The Basalt Ramparts',
        'Valdrek Escarpment', 'Granitewall Shelf',
    ],
    'high-mountain': [
        'Drakenfall Heights', 'The Stormspear', 'Theron\'s Pinnacle', 'The Cloudbreak',
        'Titan\'s Jaw', 'Eaglerest Peaks', 'The Sundercrags',
    ],
    'volcanic': [
        'The Ember Caldera', 'Ashenvault', 'Cinder Maw', 'Varakk\'s Furnace',
    ],
    'desert': [
        'The Amber Desolation', 'Solarius Dunes', 'Kharad\'s Anvil', 'The Shimmersand',
        'Dust Veil Expanse', 'Orath\'s Crucible', 'Sandwhisper Flats', 'The Mirage Fields',
        'Cindergold Dunes', 'Thasseri Wastes', 'Sunscar Basin', 'Dryreach Hollow',
        'Molten Sands', 'Zarith Plateau', 'Emberdust Sweep',
    ],
    'arid-desert': [
        'Redvein Badlands', 'The Cracked Maw', 'Dusthollow Mesa', 'Sable Gully',
        'Korrath\'s Blight', 'Ochrebane Wastes', 'The Scorchmark', 'Bleachbone Barrens',
        'Wrathwind Plateau', 'Carrack\'s Reach', 'Sunblight Ravine', 'Skullcap Bluffs',
        'Rustmaw Canyon', 'Sandviper Gorge', 'The Withered Shelf',
    ],
    'oasis': [
        'Mistveil Springs', 'Lirien\'s Rest', 'The Jade Pool', 'Oasis of Sel\u00fbn',
    ],
    'plains': [
        'The Hearthlands', 'Aldenmere Fields', 'Tarven\'s Expanse', 'Goldbriar Steppe',
        'The Wayward Stretch', 'Thornfield Basin', 'Harrowdale Savanna', 'Longstride Reach',
        'Millhaven Pastures', 'Brannock\'s Claim', 'The Rustgrass', 'Sunderfields',
        'Galsworth Run', 'Pennworth Downs', 'Duskwheat Corridor', 'Calder\'s Prospect',
        'Ashford Grasslands', 'Ironwell Tablelands', 'The Heathermarch', 'Corwin\'s Paddock',
        'Wrenholm Prairielands', 'Dustthorn Lowlands', 'Barleycroft Expanse', 'Stonehearth Flats',
        'Tamworth Uplands', 'Fenwick Greenway',
    ],
    'grassland': [
        'Verdanthollow', 'Thistledown Vale', 'Briarcliff Meadows', 'Summerleigh Greens',
        'Fairhaven Paddock', 'Greenholme Dale', 'Harlowe Glen', 'Elowen\'s Lea',
        'The Dawngrass', 'Cloverwatch Downs', 'Marigold Expanse', 'Willowstep Savanna',
        'Hawthorn Glade', 'Cinderleaf Basin', 'Wheatveil Lowlands',
    ],
    'meadow': [
        'Willowbend Meadow', 'Petalwing Dale', 'Sorrel Glade', 'Honeyfield Lea',
        'Dewcrest Garden', 'Maren\'s Blush', 'Larkspur Hollow', 'Primeveil Clearing',
        'Goldpetal Terrace', 'Heather\'s Crown', 'Dawnpetal Drift', 'Fennwick Bower',
        'Silkwater Nook', 'Butterblossom Way',
    ],
    'woodland': [
        'Evergloom Forest', 'The Tanglewood', 'Verdara\'s Canopy', 'Fernhollow Timberland',
        'Briarshadow Woods', 'The Mossweald', 'Ashenmere Copse', 'Thornwatch Thicket',
        'Elkrun Timberland', 'Grimshaw Weald', 'Larkhollow Grove', 'Cedarveil Reaches',
        'The Dapplewood', 'Ravenwild Depths', 'Dunmere Thicket', 'Corbin\'s Stand',
        'Harthwood', 'Mirewood', 'Silvbark Expanse', 'Wickerfen Brake',
    ],
    'dense-forest': [
        'The Blackthorn Depths', 'Gloomshroud Wilds', 'Ironbark Sanctuary', 'Mordaunt\'s Hollow',
        'The Rotwood', 'Wraithveil Thicket', 'Nightfall Canopy', 'The Sunless Groves',
    ],
    'jungle': [
        'The Verdant Maw', 'Serpentcoil Jungle', 'Mugava Wilds', 'The Steaming Tangle',
        'Thornvine Canopy',
    ],
    'swamp': [
        'Brackenmire', 'Gaelwynn\'s Bog', 'The Rotmarsh', 'Gloomfen', 'Moldwater Fen',
        'Sorrowmere Quagmire',
    ],
    'tropical': [
        'Sunwrack Lagoon', 'The Cerulean Shallows', 'Palmhaven', 'Lanivar Atoll',
        'Driftwood Strand',
    ],
    'coast': [
        'Saltmere Shore', 'Gaelcrest Bay', 'Breakwater Cove', 'Tidebrine Point',
        'Marren\'s Strand', 'Tidewatch Bluff', 'Windbreak Inlet',
    ],
    'lake': [
        'Lake Aethermere', 'The Stillwater', 'Crystalveil Mere', 'Sigren\'s Pool',
        'Moonhollow Reservoir', 'Lake Vyrendale', 'The Deepmirror', 'Ashwater Tarn',
    ],
    'river-valley': [
        'The Serpent\'s Bend', 'Rivendale Crossing', 'Narrowbrook Valley', 'Galwyn\'s Ford',
        'Mistwater Banks', 'The Greenrun', 'Stonebridge Basin', 'Thornwater Gorge',
        'Willowcreek Lowlands', 'Rushford Narrows', 'Cedarbrook Dell', 'Ashvale Riverwalk',
    ],
    'village': [
        'Millhaven', 'Thornbury', 'Wycliffe Settlement', 'Brannock\'s Rest',
    ]
};

// ═══════════════════════════════════════════════════════════════════════
//  Tier 3 — Map name parts  (Adjective + Noun, combinatorial per biome)
// ═══════════════════════════════════════════════════════════════════════
const MAP_NAME_PARTS = {
    'snow': {
        adj: [
            'Frosted', 'Frozen', 'Icy', 'Glacial', 'Bitter', 'Hoarfrost',
            'Crystalline', 'Snowbound', 'Pallid', 'Silent', 'Shivering', 'Boreal',
        ],
        noun: [
            'Drift', 'Ridge', 'Pass', 'Shelf', 'Basin', 'Notch',
            'Saddle', 'Terrace', 'Alcove', 'Hollow',
        ],
    },
    'tundra': {
        adj: [
            'Bleak', 'Windblown', 'Frostbitten', 'Grey', 'Bare',
            'Desolate', 'Stark', 'Ashen', 'Pale', 'Barren',
        ],
        noun: [
            'Moor', 'Waste', 'Heath', 'Plain', 'Steppe',
            'Stretch', 'Flat', 'Expanse',
        ],
    },
    'frozen-peak': {
        adj: ['Jagged', 'Towering', 'Sheer', 'Windswept', 'Sunless'],
        noun: ['Pinnacle', 'Spire', 'Crag', 'Summit', 'Crown'],
    },
    'mountain': {
        adj: ['Rugged', 'Stark', 'Granite', 'Windsworn', 'Ironside', 'Scarred'],
        noun: ['Crag', 'Ridge', 'Bluff', 'Escarpment', 'Shelf', 'Ledge'],
    },
    'high-mountain': {
        adj: ['Sheer', 'Storm', 'Cloud', 'Eagle', 'Thunder', 'Skyward'],
        noun: ['Peak', 'Summit', 'Crag', 'Spire', 'Aerie', 'Tor'],
    },
    'volcanic': {
        adj: ['Ashen', 'Smoldering', 'Obsidian', 'Molten', 'Charred'],
        noun: ['Caldera', 'Crater', 'Vent', 'Shelf', 'Flow'],
    },
    'desert': {
        adj: [
            'Burning', 'Shifting', 'Gilded', 'Miragelit', 'Ochre',
            'Vast', 'Endless', 'Sunscorched', 'Windcarved', 'Dusty',
        ],
        noun: [
            'Dune', 'Waste', 'Basin', 'Pan', 'Flat',
            'Sands', 'Expanse', 'Sweep',
        ],
    },
    'arid-desert': {
        adj: [
            'Scorched', 'Bleached', 'Sunbaked', 'Parched', 'Cracked',
            'Weathered', 'Red', 'Dustblown', 'Sandworn', 'Striated',
            'Russet', 'Eroded',
        ],
        noun: [
            'Mesa', 'Bluff', 'Canyon', 'Ravine', 'Badlands',
            'Gulch', 'Gorge', 'Arroyo', 'Butte', 'Plateau',
        ],
    },
    'oasis': {
        adj: ['Lush', 'Verdant', 'Hidden', 'Tranquil'],
        noun: ['Spring', 'Oasis', 'Pool', 'Garden'],
    },
    'plains': {
        adj: [
            'Windswept', 'Golden', 'Sunlit', 'Open', 'Rolling',
            'Wild', 'Dusty', 'Fallow', 'Amber', 'Broad',
            'Long', 'Homestead', 'Russet', 'Quiet', 'Iron',
            'Harvest', 'Farrow', 'Tawny', 'Boundless',
        ],
        noun: [
            'Field', 'Steppe', 'Expanse', 'Flat', 'Prairie',
            'Stretch', 'Pasture', 'Run', 'Reach', 'Paddock',
            'Range', 'Lea', 'Terrace', 'Down', 'Crossroad',
            'Furrow', 'Sward',
        ],
    },
    'grassland': {
        adj: [
            'Clover', 'Wildflower', 'Brightleaf', 'Dewdrop', 'Thistle',
            'Gentle', 'Fair', 'Sweetgrass', 'Emerald', 'Lush',
        ],
        noun: [
            'Dale', 'Knoll', 'Downs', 'Sward', 'Lea',
            'Green', 'Rise', 'Hillock', 'Slope',
        ],
    },
    'meadow': {
        adj: ['Blooming', 'Petal', 'Dewlit', 'Sunbright', 'Rosy', 'Honeyed'],
        noun: ['Garden', 'Meadow', 'Lea', 'Glade', 'Bower'],
    },
    'village': {
        adj: ['Quiet', 'Rustic', 'Humble', 'Merry'],
        noun: ['Hamlet', 'Settlement', 'Common', 'Hearth'],
    },
    'woodland': {
        adj: [
            'Mossy', 'Shadowed', 'Ancient', 'Twilight', 'Overgrown',
            'Hidden', 'Tangled', 'Gnarled', 'Verdant', 'Misty',
            'Winding', 'Quiet', 'Dappled', 'Amber', 'Wild',
            'Sunken', 'Twisted', 'Lichened', 'Ferny', 'Whispering',
            'Drowsy', 'Fungal',
        ],
        noun: [
            'Hollow', 'Glen', 'Thicket', 'Clearing', 'Copse',
            'Grove', 'Dell', 'Brake', 'Stand', 'Bower',
            'Weald', 'Holt', 'Combe', 'Glade', 'Covert',
            'Trail', 'Nook', 'Path', 'Canopy', 'Roots',
            'Crossing', 'Arch',
        ],
    },
    'dense-forest': {
        adj: ['Dark', 'Primeval', 'Impassable', 'Gloom', 'Choking', 'Deeproot'],
        noun: ['Depths', 'Wilds', 'Thicket', 'Tangle', 'Morass'],
    },
    'jungle': {
        adj: ['Dense', 'Steaming', 'Vine', 'Verdant', 'Muggy'],
        noun: ['Canopy', 'Tangle', 'Understory', 'Thicket'],
    },
    'swamp': {
        adj: ['Murky', 'Fetid', 'Boggy', 'Mire', 'Stagnant', 'Black'],
        noun: ['Marsh', 'Fen', 'Hollow', 'Pool', 'Slough'],
    },
    'tropical': {
        adj: ['Balmy', 'Palm', 'Coral', 'Azure', 'Warm'],
        noun: ['Shore', 'Lagoon', 'Strand', 'Cay', 'Inlet'],
    },
    'coast': {
        adj: ['Windswept', 'Sandy', 'Rocky', 'Briny', 'Tide', 'Kelp'],
        noun: ['Cove', 'Point', 'Shore', 'Bluff', 'Headland'],
    },
    'lake': {
        adj: [
            'Still', 'Crystal', 'Deep', 'Mirror', 'Reedy',
            'Blue', 'Twilight', 'Glassy', 'Silver', 'Moonlit',
        ],
        noun: [
            'Pool', 'Mere', 'Tarn', 'Shore', 'Lakebed',
            'Bay', 'Shallows', 'Basin',
        ],
    },
    'river-valley': {
        adj: [
            'Winding', 'Rushing', 'Calm', 'Stony', 'Silver',
            'Narrow', 'Muddy', 'Reedy', 'Gentle', 'Rapid',
        ],
        noun: [
            'Crossing', 'Ford', 'Bank', 'Bend', 'Falls',
            'Rapids', 'Shallows', 'Eddy',
        ],
    },
};

// Generic fallback for biomes missing from MAP_NAME_PARTS
const GENERIC_NAME_PARTS = {
    adj: ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'Upper', 'Lower', 'Outer', 'Inner', 'Old'],
    noun: ['Tract', 'Reach', 'Zone', 'Sector', 'Quarter', 'Ward', 'Parcel', 'Plot', 'Bounds', 'Stretch'],
};

// ═══════════════════════════════════════════════════════════════════════
//  Naming utilities  (word-level dedup for tiers 1 & 2)
// ═══════════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set(['the', 'of', 'and', 'in', 'at', 'by']);

function getSignificantWords(name) {
    return name.replace(/['']/g, ' ').split(/\s+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function hasWordConflict(name, usedWords) {
    return getSignificantWords(name).some(w => usedWords.has(w));
}

function claimName(name, usedNames, usedWords) {
    usedNames.add(name);
    for (const w of getSignificantWords(name)) {
        usedWords.add(w);
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  Flood-fill utility
// ═══════════════════════════════════════════════════════════════════════
function floodFill(classifyFn) {
    const visited = new Set();
    const groups  = []; // [{ cells:[mapId,...], key:string }]

    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            const key = classifyFn(id);
            if (!key || visited.has(id)) continue;

            const cells  = [];
            const queue  = [[x, y]];
            visited.add(id);

            while (queue.length > 0) {
                const [cx, cy] = queue.shift();
                cells.push(mapId(cx, cy));

                for (const [nx, ny] of neighbors(cx, cy)) {
                    const nid = mapId(nx, ny);
                    if (!visited.has(nid) && classifyFn(nid) === key) {
                        visited.add(nid);
                        queue.push([nx, ny]);
                    }
                }
            }

            groups.push({ cells, key });
        }
    }
    return groups;
}

// ═══════════════════════════════════════════════════════════════════════
//  Merge small groups into best neighbor
// ═══════════════════════════════════════════════════════════════════════
function mergeSmallGroups(groups, minSize) {
    const cellToGroup = {};
    groups.forEach((g, i) => g.cells.forEach(c => cellToGroup[c] = i));

    let changed = true;
    let mergeCount = 0;
    while (changed) {
        changed = false;
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            if (group.cells.length === 0 || group.cells.length >= minSize) continue;

            // Find neighboring groups
            const neighborGroups = new Map();
            for (const cellId of group.cells) {
                const m = cellId.match(/^(-?\d+)-(-?\d+)$/);
                if (!m) continue;
                const cx = parseInt(m[1]), cy = parseInt(m[2]);
                for (const [nx, ny] of neighbors(cx, cy)) {
                    const nid = mapId(nx, ny);
                    const ng  = cellToGroup[nid];
                    if (ng !== undefined && ng !== i) {
                        neighborGroups.set(ng, (neighborGroups.get(ng) || 0) + 1);
                    }
                }
            }
            if (neighborGroups.size === 0) continue;

            // Prefer same key, then largest
            let best = -1, bestSize = 0;
            for (const [gi] of neighborGroups) {
                if (groups[gi].key === group.key && groups[gi].cells.length > bestSize) {
                    bestSize = groups[gi].cells.length;
                    best = gi;
                }
            }
            if (best < 0) {
                bestSize = 0;
                for (const [gi] of neighborGroups) {
                    if (groups[gi].cells.length > bestSize) {
                        bestSize = groups[gi].cells.length;
                        best = gi;
                    }
                }
            }
            if (best >= 0) {
                for (const cellId of group.cells) {
                    groups[best].cells.push(cellId);
                    cellToGroup[cellId] = best;
                }
                group.cells = [];
                mergeCount++;
                changed = true;
            }
        }
    }
    return { groups: groups.filter(g => g.cells.length > 0), mergeCount };
}

// ═══════════════════════════════════════════════════════════════════════
//  Main
// ═══════════════════════════════════════════════════════════════════════
function main() {
    const mapsPath = path.join(__dirname, 'data', 'maps.json');
    const mapsData = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));

    // ── Build grids ──
    const biomeGrid  = {}; // mapId → biome
    const familyGrid = {}; // mapId → family

    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            if (mapsData[id]) {
                const biome = mapsData[id].biome || 'grassland';
                biomeGrid[id]  = biome;
                familyGrid[id] = BIOME_TO_FAMILY[biome] || 'temperate';
            }
        }
    }

    // ══════════════════════════════════════════════
    //  Tier 2 — Regions  (same biome flood-fill)
    // ══════════════════════════════════════════════
    const rawRegions = floodFill(id => biomeGrid[id]);
    console.log(`Tier 2: ${rawRegions.length} raw regions`);

    const { groups: regions, mergeCount: rMerged } = mergeSmallGroups(rawRegions, MIN_REGION_SIZE);
    console.log(`Tier 2: ${regions.length} regions after merging ${rMerged} small groups`);

    // Build cell → region index
    const cellToRegionIdx = {};
    regions.forEach((r, i) => r.cells.forEach(c => cellToRegionIdx[c] = i));

    // ══════════════════════════════════════════════
    //  Tier 1 — Super-regions  (same family flood-fill)
    // ══════════════════════════════════════════════
    const rawSuperRegions = floodFill(id => familyGrid[id]);
    console.log(`Tier 1: ${rawSuperRegions.length} raw super-regions`);

    const { groups: superRegions, mergeCount: sMerged } = mergeSmallGroups(rawSuperRegions, MIN_SUPER_REGION_SIZE);
    console.log(`Tier 1: ${superRegions.length} super-regions after merging ${sMerged} small groups`);

    const cellToSuperIdx = {};
    superRegions.forEach((s, i) => s.cells.forEach(c => cellToSuperIdx[c] = i));

    // ══════════════════════════════════════════════
    //  Name tiers 1 & 2 with shared word blacklist
    // ══════════════════════════════════════════════
    const usedNames = new Set();
    const usedWords = new Set();

    // ── Name super-regions ──
    const superRegionNames = [];
    for (const sr of superRegions) {
        const family     = sr.key;
        const candidates = SUPER_REGION_NAMES[family] || SUPER_REGION_NAMES['temperate'];
        let name         = null;

        for (const n of candidates) {
            if (!usedNames.has(n) && !hasWordConflict(n, usedWords)) { name = n; break; }
        }
        if (!name) {
            for (const n of candidates) {
                if (!usedNames.has(n)) { name = n; break; }
            }
        }
        if (!name) {
            let idx = 1;
            do { name = `${candidates[0]} ${idx}`; idx++; } while (usedNames.has(name));
        }

        claimName(name, usedNames, usedWords);
        superRegionNames.push(name);
    }

    // ── Name regions ──
    const regionNames = [];
    for (const region of regions) {
        const biome      = region.key;
        const candidates = REGION_NAMES[biome] || REGION_NAMES['grassland'];
        let name         = null;

        for (const n of candidates) {
            if (!usedNames.has(n) && !hasWordConflict(n, usedWords)) { name = n; break; }
        }
        if (!name) {
            for (const n of candidates) {
                if (!usedNames.has(n)) { name = n; break; }
            }
        }
        if (!name) {
            let idx = 1;
            do { name = `${candidates[0]} ${idx}`; idx++; } while (usedNames.has(name));
        }

        claimName(name, usedNames, usedWords);
        regionNames.push(name);
    }

    // ══════════════════════════════════════════════
    //  Tier 3 — individual map names (combinatorial)
    // ══════════════════════════════════════════════
    // Pre-generate shuffled combo lists per biome
    function buildCombos(parts) {
        const combos = [];
        for (const a of parts.adj) {
            for (const n of parts.noun) {
                combos.push(`${a} ${n}`);
            }
        }
        // Shuffle (Fisher-Yates)
        for (let i = combos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combos[i], combos[j]] = [combos[j], combos[i]];
        }
        return combos;
    }

    const combosByBiome = {};
    const comboIndex    = {}; // track next index per biome
    const usedMapNames  = new Set();

    function getMapName(biome) {
        // Ensure combos exist
        if (!combosByBiome[biome]) {
            const parts = MAP_NAME_PARTS[biome] || GENERIC_NAME_PARTS;
            combosByBiome[biome] = buildCombos(parts);
            comboIndex[biome]    = 0;
        }

        const combos = combosByBiome[biome];
        // Try next unused combo
        while (comboIndex[biome] < combos.length) {
            const name = combos[comboIndex[biome]++];
            if (!usedMapNames.has(name)) {
                usedMapNames.add(name);
                return name;
            }
        }

        // Exhausted combos — use generic fallback
        if (biome !== '__generic') {
            if (!combosByBiome['__generic']) {
                combosByBiome['__generic'] = buildCombos(GENERIC_NAME_PARTS);
                comboIndex['__generic']    = 0;
            }
            const genCombos = combosByBiome['__generic'];
            while (comboIndex['__generic'] < genCombos.length) {
                const name = genCombos[comboIndex['__generic']++];
                if (!usedMapNames.has(name)) {
                    usedMapNames.add(name);
                    return name;
                }
            }
        }

        // Ultimate fallback — numbered
        let idx = 1;
        let name;
        do { name = `Tract ${idx++}`; } while (usedMapNames.has(name));
        usedMapNames.add(name);
        return name;
    }

    // ══════════════════════════════════════════════
    //  Update maps.json
    // ══════════════════════════════════════════════
    let updated = 0;
    for (let y = gridMinY; y <= gridMaxY; y++) {
        for (let x = gridMinX; x <= gridMaxX; x++) {
            const id = mapId(x, y);
            if (!mapsData[id]) continue;

            const biome    = biomeGrid[id];
            const rIdx     = cellToRegionIdx[id];
            const sIdx     = cellToSuperIdx[id];
            const rName    = rIdx !== undefined ? regionNames[rIdx] : 'Unknown';
            const sName    = sIdx !== undefined ? superRegionNames[sIdx] : 'Unknown';
            const cellName = getMapName(biome);

            mapsData[id].superRegion = sName;
            mapsData[id].region      = rName;
            mapsData[id].name        = cellName;
            updated++;
        }
    }

    // ── Write ──
    fs.copyFileSync(mapsPath, mapsPath + '.bak4');
    fs.writeFileSync(mapsPath, JSON.stringify(mapsData, null, 2));

    console.log(`\nUpdated ${updated} maps with 3-tier hierarchy`);
    console.log('Backup saved as maps.json.bak4');

    // ── Summary ──
    console.log('\n=== Super-Region Summary ===');
    superRegions.forEach((sr, i) => {
        console.log(`  ${superRegionNames[i]}  [${sr.key}]  ${sr.cells.length} cells`);
    });

    console.log('\n=== Region Summary ===');
    regions.forEach((r, i) => {
        console.log(`  ${regionNames[i]}  [${r.key}]  ${r.cells.length} cells`);
    });

    // Region → Super-region mapping
    console.log('\n=== Region -> Super-Region ===');
    for (let i = 0; i < regions.length; i++) {
        const sampleCell = regions[i].cells[0];
        const sIdx       = cellToSuperIdx[sampleCell];
        const srName     = sIdx !== undefined ? superRegionNames[sIdx] : '???';
        console.log(`  ${regionNames[i]}  =>  ${srName}`);
    }

    // Word conflict check (tiers 1 & 2)
    const allTierNames = [...superRegionNames, ...regionNames];
    let conflicts = 0;
    for (let i = 0; i < allTierNames.length; i++) {
        const wi = new Set(getSignificantWords(allTierNames[i]));
        for (let j = i + 1; j < allTierNames.length; j++) {
            for (const w of getSignificantWords(allTierNames[j])) {
                if (wi.has(w)) {
                    console.log(`  ! Word "${w}" shared: "${allTierNames[i]}" & "${allTierNames[j]}"`);
                    conflicts++;
                }
            }
        }
    }
    console.log(`\nWord conflicts (tiers 1+2): ${conflicts}`);
    console.log(`Unique map names (tier 3): ${usedMapNames.size}`);
}

main();
