/**
 * World Map Grid Generator
 * Generates a 30x30 map grid (900 maps) with biome regions, weather, and adjacency.
 * 
 * Grid: x from -14 to 15, y from -14 to 15
 * Center (0,0) = Starting Village (existing)
 * 
 * BIOME LAYOUT:
 *          NORTH (Mountains → Snow Peaks)
 *               |
 *     NW        |        NE
 *   (Tundra/    |    (Volcanic/
 *    Frozen)    |     Ashlands)
 *               |
 * WEST ----  CENTER ---- EAST
 * (Arid       (Starting   (Deep
 *  Desert)    Village)    Forest)
 *               |
 *     SW        |        SE
 *   (Coastal    |    (Swamp/
 *    Cliffs)    |     Marsh)
 *               |
 *          SOUTH (Tropical Coast / Ocean)
 * 
 * Travel time at running speed (~810 px/s):
 *   Horizontal (3840px): ~4.7s per cell → 30 cells = ~141s (2.4 min) straight line
 *   With obstacles/encounters: ~15-30 min real exploration end-to-end
 */

const fs = require('fs');
const path = require('path');

const MIN_X = -15, MAX_X = 16;
const MIN_Y = -8, MAX_Y = 9;

// ==================== MAP LEVEL (distance-based) ====================

/**
 * Compute map level from grid coordinates.
 * Level scales with distance from the center (0,0).
 * Village center = 1, edges (~dist 20) = 100.
 */
function getMapLevel(x, y) {
    const dist = Math.sqrt(x * x + y * y);
    const maxDist = Math.sqrt(MAX_X * MAX_X + MAX_Y * MAX_Y); // ~21.2
    // Linear ramp 1..100 with slight floor so the very center is always 1
    if (dist <= 1) return 1;
    return Math.min(100, Math.max(1, Math.round(1 + (dist / maxDist) * 99)));
}

// ==================== BIOME CLASSIFICATION ====================

function getBiome(x, y) {
    const dist = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) * (180 / Math.PI); // -180 to 180, 0 = east
    
    // Starting area (very center)
    if (dist <= 2) return 'village';
    
    // Inner ring - transitional areas
    if (dist <= 5) {
        if (angle >= 45 && angle < 135) return 'grassland';      // north
        if (angle >= -45 && angle < 45) return 'woodland';        // east
        if (angle >= -135 && angle < -45) return 'meadow';        // south
        return 'plains';                                            // west
    }
    
    // Mid ring
    if (dist <= 10) {
        if (angle >= 60 && angle < 120) return 'mountain';         // north
        if (angle >= 20 && angle < 60) return 'highland';          // northeast
        if (angle >= -20 && angle < 20) return 'deep_forest';      // east
        if (angle >= -60 && angle < -20) return 'dark_forest';     // southeast
        if (angle >= -120 && angle < -60) return 'tropical';       // south
        if (angle >= -160 && angle < -120) return 'coast';         // southwest
        if (angle >= 120 && angle < 160) return 'taiga';           // northwest
        return 'desert';                                            // west
    }
    
    // Outer ring - extreme biomes
    if (angle >= 60 && angle < 120) return 'snow_peak';            // far north
    if (angle >= 20 && angle < 60) return 'volcanic';              // far northeast
    if (angle >= -20 && angle < 20) return 'ancient_forest';       // far east
    if (angle >= -60 && angle < -20) return 'swamp';               // far southeast
    if (angle >= -120 && angle < -60) return 'ocean_coast';        // far south
    if (angle >= -160 && angle < -120) return 'cliff';             // far southwest
    if (angle >= 120 && angle < 160) return 'tundra';              // far northwest
    return 'wasteland';                                             // far west
}

// ==================== REGION NAMES ====================

const BIOME_CONFIG = {
    village: {
        names: ['Starting Village', 'Village Outskirts', 'Old Farm Road', 'Willowbrook', 'Village Garden', 
                'Cobblestone Path', 'Market Road', 'Village Well', 'Founders Square', 'Chapel Hill',
                'Bakery Lane', 'Millpond', 'Village Gate', 'Herb Garden', 'Training Grounds'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'none', particles: 'none',
        spawnDensity: 5
    },
    grassland: {
        names: ['Rolling Hills', 'Sunlit Meadow', 'Windswept Field', 'Flower Fields', 'Golden Prairie',
                'Breezy Knoll', 'Shepherd\'s Rest', 'Tall Grass Path', 'Butterfly Glade', 'Harvest Road',
                'Clover Patch', 'Stone Bridge', 'Quiet Creek', 'Ranch Road', 'Hill Overlook',
                'North Road', 'Vineyard Trail', 'Grassy Basin', 'Wildflower Hill', 'Pebble Stream'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'light', particles: 'none',
        spawnDensity: 8
    },
    woodland: {
        names: ['Birch Woods', 'Mossy Trail', 'Woodland Path', 'Shady Grove', 'Fern Hollow',
                'Oakwood Trail', 'Timber Road', 'Leafy Passage', 'Mushroom Clearing', 'Deer Run',
                'Woodcutter\'s Rest', 'Berry Thicket', 'Owl\'s Perch', 'Fallen Oak', 'Creek Crossing',
                'Sun-Dappled Path', 'Ivy Tunnel', 'Fox Den', 'Bramble Patch', 'Hollow Stump'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'none', particles: 'leaves',
        spawnDensity: 10
    },
    meadow: {
        names: ['Southern Meadow', 'Daisy Fields', 'Warm Springs', 'Sunny Glade', 'Honeybee Field',
                'Lazy River Bend', 'Orchid Fields', 'Picnic Hill', 'Dragonfly Pond', 'Willow Creek',
                'Reed Marsh', 'Sandy Bank', 'Cattail Pond', 'Frog Hollow', 'Evening Meadow',
                'Lotus Lake', 'Turtle Shore', 'Firefly Field', 'Poppy Lane', 'Blue Bell Valley'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'none', particles: 'fireflies',
        spawnDensity: 8
    },
    plains: {
        names: ['Western Plains', 'Dusty Trail', 'Open Range', 'Prairie Wind', 'Flatrock',
                'Dry Creek Bed', 'Cactus Flats', 'Tumbleweed Pass', 'Scorched Path', 'Sun-Beaten Road',
                'Red Rock', 'Mesa View', 'Lone Tree', 'Dry Gulch', 'Wind Gap',
                'Cracked Earth', 'Barren Stretch', 'Heat Shimmer', 'Salt Flat', 'Dust Bowl'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'strong', particles: 'none',
        spawnDensity: 6
    },
    mountain: {
        names: ['Mountain Pass', 'Rocky Ascent', 'Boulder Trail', 'Granite Ridge', 'Eagle\'s Peak',
                'Mountain Spring', 'Cliff Face', 'High Ledge', 'Alpine Meadow', 'Stone Steps',
                'Goat Trail', 'Windy Summit', 'Cave Entrance', 'Rockslide Path', 'Mountain Town',
                'Watchtower Peak', 'Mining Camp', 'Ore Vein', 'Crystal Cavern', 'Summit Trail',
                'Falcon\'s Nest', 'Misty Ridge', 'Boulder Field', 'Mountain Lake', 'Steep Climb'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'strong', particles: 'none',
        spawnDensity: 7
    },
    highland: {
        names: ['Highland Path', 'Misty Heights', 'Stony Hill', 'Wind Ridge', 'Barrow Downs',
                'Ancient Ruins', 'Highland Lake', 'Heather Moor', 'Standing Stones', 'Foggy Pass',
                'Ruined Tower', 'Old Fortress', 'Highland Village', 'Sheep Pasture', 'Watch Hill',
                'Cairn Trail', 'Peat Bog', 'Stone Circle', 'Raven\'s Roost', 'Twilight Hill',
                'Signal Fire', 'Broken Wall', 'Mossy Ruin', 'Windmill Hill', 'Shepherd\'s Hut'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'light', particles: 'none',
        spawnDensity: 8
    },
    deep_forest: {
        names: ['Deep Forest', 'Darkwood Path', 'Ancient Canopy', 'Twisted Trees', 'Root Maze',
                'Giant\'s Grove', 'Shadow Wood', 'Whispering Trees', 'Enchanted Clearing', 'Sacred Oak',
                'Spirit Grove', 'Moonlit Path', 'Thornwall', 'Witch\'s Wood', 'Forgotten Trail',
                'Hollow Tree', 'Moss Cathedral', 'Canopy Bridge', 'Fairy Ring', 'Elder Tree',
                'Lost Trail', 'Verdant Maze', 'Hidden Glade', 'Druid\'s Rest', 'Ancient Stump'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'none', particles: 'fireflies',
        spawnDensity: 12
    },
    dark_forest: {
        names: ['Dark Thicket', 'Shadowed Path', 'Gloom Wood', 'Murky Depths', 'Spider\'s Nest',
                'Bog Wood', 'Rotting Logs', 'Misty Wood', 'Tangled Roots', 'Dead Man\'s Trail',
                'Cursed Grove', 'Black Bark', 'Bone Hollow', 'Weeping Willows', 'Night Trail',
                'Phantom Wood', 'Haunted Clearing', 'Ghost Light Path', 'Wailing Wood', 'Dread Hollow',
                'Poison Bog', 'Fungus Grotto', 'Blighted Grove', 'Sorrow\'s Edge', 'Twilight Marsh'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'none', particles: 'fireflies',
        spawnDensity: 12
    },
    tropical: {
        names: ['Palm Beach', 'Coral Shore', 'Tropical Path', 'Banana Grove', 'Coconut Beach',
                'Jungle Trail', 'Paradise Cove', 'Lagoon', 'Mangrove Walk', 'Island Bridge',
                'Waterfall Basin', 'Parrot Perch', 'Tiki Village', 'Fishing Dock', 'Sunset Bay',
                'Coral Reef Overlook', 'Shell Beach', 'Tide Pool', 'Sea Breeze Path', 'Harbor Town',
                'Bamboo Bridge', 'Monkey Trail', 'Orchid Cave', 'Rainbow Falls', 'Trade Port'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'light', particles: 'none',
        spawnDensity: 10
    },
    coast: {
        names: ['Rocky Coast', 'Seaside Village', 'Lighthouse Point', 'Fisherman\'s Wharf', 'Pier',
                'Tide Caves', 'Driftwood Beach', 'Sea Cliff', 'Anchor Bay', 'Sailor\'s Rest',
                'Shipwreck Cove', 'Storm Beach', 'Seagull Rock', 'Kelp Shore', 'Coast Guard Post',
                'Salt Spray Path', 'Wave Break', 'Barnacle Point', 'Foghorn Cliff', 'Coastal Road',
                'Beach Camp', 'Crab Cove', 'Sandbar', 'Mussel Rock', 'Lookout Bluff'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain', wind: 'strong', particles: 'none',
        spawnDensity: 7
    },
    taiga: {
        names: ['Pine Forest', 'Snowy Pines', 'Frost Wood', 'Wolf\'s Trail', 'Northern Pines',
                'Frozen Creek', 'Ice Bridge', 'Snow Drift', 'Bear Den', 'Timber Camp',
                'Logging Road', 'Frost Glade', 'Icicle Falls', 'Cold Spring', 'Northern Lodge',
                'Elk Run', 'Frozen Bog', 'Snow Cap Trail', 'Ice Flow', 'Silent Wood',
                'Hoarfrost Path', 'Crystal Pine', 'Silver Birch', 'Snowshoe Trail', 'Blizzard Pass'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'snow', wind: 'light', particles: 'none',
        spawnDensity: 6
    },
    desert: {
        names: ['Sand Dunes', 'Desert Road', 'Oasis', 'Scorching Sands', 'Mirage Basin',
                'Cactus Valley', 'Sandstone Arch', 'Dried Riverbed', 'Desert Camp', 'Nomad\'s Rest',
                'Sun Temple Ruins', 'Quicksand Pit', 'Duststorm Ridge', 'Bone Yard', 'Ancient Pyramid',
                'Caravan Trail', 'Desert Town', 'Water Well', 'Sand Crawler Lair', 'Buried City',
                'Heat Haze', 'Scorpion Pass', 'Glass Sand', 'Twilight Dunes', 'Star Gazer\'s Camp'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'strong', particles: 'none',
        spawnDensity: 5
    },
    snow_peak: {
        names: ['Snow Peak', 'Frozen Summit', 'Ice Wall', 'Blizzard Pass', 'Glacial Lake',
                'Frozen Throne', 'Avalanche Ridge', 'Crystal Peak', 'Frost Giant\'s Path', 'Ice Cavern',
                'Snowdrift Canyon', 'Polar Wind', 'Eternal Winter', 'Frostbite Falls', 'Diamond Dust',
                'Aurora Point', 'Frozen Citadel', 'Ice Pillar', 'Snow Queen\'s Domain', 'Permafrost',
                'Rime Path', 'Hailstone Peak', 'Frozen Lake', 'Winter\'s Heart', 'Glacial Pass',
                'Ice Shard Valley', 'Frost Crown', 'Snowblind Trail', 'Frozen Waterfall', 'Peak Observatory'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'snow', wind: 'strong', particles: 'none',
        spawnDensity: 4
    },
    volcanic: {
        names: ['Lava Fields', 'Volcanic Path', 'Ash Valley', 'Magma Flow', 'Ember Peak',
                'Sulfur Springs', 'Obsidian Ridge', 'Fire Crater', 'Charred Forest', 'Molten River',
                'Cinder Wastes', 'Smoke Stack', 'Dragon\'s Maw', 'Forge Mountain', 'Flame Geyser',
                'Burning Path', 'Ash Storm', 'Inferno Gate', 'Soot Plains', 'Lava Tube',
                'Eruption Site', 'Phoenix Nest', 'Hellfire Pass', 'Scorched Earth', 'Magma Chamber',
                'Volcanic Vent', 'Fire Temple', 'Ashen Ruins', 'Obsidian Fortress', 'Caldera Lake'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'light', particles: 'none',
        spawnDensity: 6
    },
    ancient_forest: {
        names: ['Ancient Treeway', 'Primeval Forest', 'Titan Oaks', 'Living Cathedral', 'World Tree Root',
                'Eternal Canopy', 'Druid Sanctum', 'Nature\'s Heart', 'Overgrown Temple', 'Vine Bridge',
                'Emerald Corridor', 'Bioluminescent Cave', 'Genesis Pool', 'Life Spring', 'Root Palace',
                'Ancient Hollow', 'Timeless Grove', 'Memory Tree', 'Elf Ruins', 'Secret Garden',
                'Crystal Spring', 'Harmony Glade', 'Beast King\'s Den', 'Verdant Throne', 'Sylvan Gate',
                'Eternal Bloom', 'Spirit Tree', 'Ancient Archive', 'Mythic Grove', 'Last Eden'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'none', particles: 'fireflies',
        spawnDensity: 15
    },
    swamp: {
        names: ['Murky Swamp', 'Bog Trail', 'Stagnant Pool', 'Toxic Mire', 'Foggy Marsh',
                'Quicksand Marsh', 'Leech Lake', 'Dead Water', 'Rot Bog', 'Sunken Ruin',
                'Witch\'s Swamp', 'Gator Bayou', 'Slimy Banks', 'Croaking Hollow', 'Mist Veil',
                'Plague Marsh', 'Putrid Pool', 'Drowned Village', 'Mud Pit', 'Cypress Bayou',
                'Cursed Waters', 'Toad Stool Bog', 'Bubbling Muck', 'Grave Marsh', 'Serpent\'s Pool',
                'Venom Swamp', 'Pestilence Bog', 'Lost Souls Marsh', 'Shadow Fen', 'Blight Marsh'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain', wind: 'none', particles: 'fireflies',
        spawnDensity: 10
    },
    ocean_coast: {
        names: ['Ocean Shore', 'Deep Blue Beach', 'Coral Bay', 'Sunken Ship', 'Mermaid\'s Cove',
                'Pearl Beach', 'Tidal Flats', 'Ocean View', 'Whale Watch', 'Undersea Cave',
                'Storm Surge Beach', 'Pirate\'s Landing', 'Ocean Temple', 'Deep Current', 'Blue Lagoon',
                'Tropical Bay', 'Volcanic Beach', 'Black Sand Shore', 'Jellyfish Cove', 'Dolphin Bay',
                'Sea Shrine', 'Ocean Citadel', 'Kraken\'s Wake', 'Siren\'s Shore', 'Abyssal Gate',
                'Treasure Beach', 'Smuggler\'s Cove', 'Coral Fortress', 'Sea King\'s Domain', 'Tidal Palace'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain', wind: 'strong', particles: 'none',
        spawnDensity: 8
    },
    cliff: {
        names: ['Sea Cliff', 'Wind-Battered Cliff', 'Cliff Path', 'Gull\'s Edge', 'Razor Ridge',
                'Howling Cliffs', 'Cliff Fortress', 'Hanging Bridge', 'Vertigo Path', 'Eagle\'s Drop',
                'Storm Cliff', 'Thunderhead Point', 'Crumbling Edge', 'Cliff Cave', 'Windy Ledge',
                'Cliff Village', 'Rope Bridge', 'Cliff Garden', 'Lookout Tower', 'Precipice Path',
                'Jagged Edge', 'Cliff Mine', 'Falcon Roost', 'Cloud Walk', 'Sky Bridge',
                'Aerie', 'Cliff Temple', 'Wind Altar', 'Storm Watchtower', 'Cliff\'s End'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'rain-light', wind: 'strong', particles: 'none',
        spawnDensity: 6
    },
    tundra: {
        names: ['Frozen Tundra', 'Icy Wastes', 'Permafrost Plain', 'White Desert', 'Ice Field',
                'Frozen Outpost', 'Tundra Trail', 'Polar Bear\'s Den', 'Ice Shelf', 'Frozen Harbor',
                'Snow Blind', 'Arctic Camp', 'Glacier Trail', 'Frost Bite', 'Cold Wind Pass',
                'Northern Lights Camp', 'Ice Wall Fortress', 'Frozen Temple', 'White Walker Path', 'Dead Frost',
                'Eternal Ice', 'Frozen Tomb', 'Ice Queen\'s Road', 'Crystalline Wastes', 'Frost Hollow',
                'Ice Cavern Entrance', 'Tundra Village', 'Frozen River', 'Sub-Zero Pass', 'Howling White'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'snow', wind: 'strong', particles: 'none',
        spawnDensity: 3
    },
    wasteland: {
        names: ['Scorched Wasteland', 'Dead Zone', 'Barren Land', 'Ash Desert', 'Blasted Heath',
                'Ruined City', 'Toxic Waste', 'Wasteland Road', 'Crater Field', 'Nuclear Desert',
                'Bone Desert', 'Shattered Plain', 'Dust Storm Alley', 'Abandoned Mine', 'Ghost Town',
                'Cursed Ground', 'Desolation Row', 'Wind-Scoured Flats', 'Ruin Fields', 'Hollow Canyon',
                'Wasted Village', 'Dry Bones Path', 'Decay Road', 'Forsaken Land', 'End of the Road',
                'Void\'s Edge', 'Death Valley', 'Last Outpost', 'Wasteland Fortress', 'Oblivion Gate'],
        music: '/assets/audio/bgm/01.mp3',
        ambience: '/assets/audio/ambience/forest-0.mp3',
        precipitation: 'none', wind: 'strong', particles: 'none',
        spawnDensity: 4
    }
};

// ==================== MAP ID HELPERS ====================

function mapId(x, y) {
    return `${x}-${y}`;
}

function isInBounds(x, y) {
    return x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y;
}

function getAdjacentMaps(x, y) {
    const adj = {};
    const directions = {
        north:     [0, 1],
        south:     [0, -1],
        east:      [1, 0],
        west:      [-1, 0],
        northeast: [1, 1],
        northwest: [-1, 1],
        southeast: [1, -1],
        southwest: [-1, -1]
    };
    
    for (const [dir, [dx, dy]] of Object.entries(directions)) {
        const nx = x + dx;
        const ny = y + dy;
        if (isInBounds(nx, ny)) {
            adj[dir] = mapId(nx, ny);
        }
    }
    
    return adj;
}

// ==================== WEATHER WITH INTENSITY GRADIENTS ====================

function getWeather(x, y, biome) {
    const config = BIOME_CONFIG[biome];
    const dist = Math.sqrt(x * x + y * y);
    
    // Base weather from biome
    let precipitation = config.precipitation;
    let wind = config.wind;
    let particles = config.particles;
    
    // Intensify weather further from center
    if (dist > 8 && precipitation === 'rain-light') {
        precipitation = 'rain';
    }
    if (dist > 12 && precipitation === 'rain') {
        precipitation = 'rain-heavy';
    }
    if (dist > 12 && precipitation === 'snow' && wind !== 'strong') {
        wind = 'strong'; // Blizzard conditions at the edges
    }
    
    return { precipitation, wind, particles };
}

// ==================== NAME GENERATION ====================

// Track used names to avoid duplicates
const usedNames = new Set();
const biomeNameIndex = {};

function getMapName(x, y, biome) {
    if (!biomeNameIndex[biome]) biomeNameIndex[biome] = 0;
    
    const names = BIOME_CONFIG[biome].names;
    let name;
    
    // Try to get an unused name from the pool
    let attempts = 0;
    do {
        const idx = biomeNameIndex[biome] % names.length;
        biomeNameIndex[biome]++;
        name = names[idx];
        attempts++;
        
        // If we've cycled through all names, add a suffix
        if (attempts > names.length) {
            const suffix = Math.floor(biomeNameIndex[biome] / names.length);
            name = `${names[idx]} ${toRoman(suffix + 1)}`;
        }
    } while (usedNames.has(name) && attempts < names.length * 3);
    
    usedNames.add(name);
    return name;
}

function toRoman(num) {
    const roman = { X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (const [key, value] of Object.entries(roman)) {
        while (num >= value) { str += key; num -= value; }
    }
    return str;
}

// ==================== SPAWN TABLE ====================

const BIOME_SPAWN_TABLES = {
    village:        [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    grassland:      [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    woodland:       [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    meadow:         [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    plains:         [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    mountain:       [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    highland:       [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    deep_forest:    [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    dark_forest:    [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    tropical:       [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    coast:          [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    taiga:          [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    desert:         [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    snow_peak:      [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    volcanic:       [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    ancient_forest: [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    swamp:          [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    ocean_coast:    [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    cliff:          [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    tundra:         [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
    wasteland:      [{ spiritId: 'forest_sprite', spawnWeight: 100, timeCondition: 'any' }],
};

// ==================== MAIN GENERATION ====================

function generateWorld() {
    // Read existing maps
    const mapsPath = path.join(__dirname, 'data', 'maps.json');
    const existingMaps = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
    
    // Special maps that aren't part of the grid
    const specialMaps = Object.entries(existingMaps).filter(([k,v]) => v.isBattleMap).map(([k]) => k);
    
    // Track which maps already exist (grid maps only)
    const existingGridMaps = new Set();
    for (const key of Object.keys(existingMaps)) {
        if (!specialMaps.includes(key)) {
            existingGridMaps.add(key);
        }
    }
    
    console.log(`Existing grid maps: ${[...existingGridMaps].join(', ')}`);
    console.log(`Special maps (preserved): ${specialMaps.join(', ')}`);
    
    const newMaps = {};
    let generatedCount = 0;
    let updatedCount = 0;
    
    // Pre-reserve existing map names
    for (const key of existingGridMaps) {
        if (existingMaps[key].name) {
            usedNames.add(existingMaps[key].name);
        }
    }
    
    // Generate all grid cells
    for (let y = MAX_Y; y >= MIN_Y; y--) {
        for (let x = MIN_X; x <= MAX_X; x++) {
            const id = mapId(x, y);
            const biome = getBiome(x, y);
            const adjacentMaps = getAdjacentMaps(x, y);
            
            if (existingGridMaps.has(id)) {
                // Update existing map's adjacentMaps to include new neighbors
                const existing = existingMaps[id];
                const mergedAdj = { ...adjacentMaps };
                
                // Preserve any special adjacencies (like portals to interior maps)
                if (existing.adjacentMaps) {
                    for (const [dir, target] of Object.entries(existing.adjacentMaps)) {
                        if (specialMaps.includes(target) || !isInBounds(...parseMapId(target))) {
                            mergedAdj[dir] = target;
                        }
                    }
                }
                
                existingMaps[id].adjacentMaps = mergedAdj;
                updatedCount++;
            } else {
                // Generate new map
                const config = BIOME_CONFIG[biome];
                const weather = getWeather(x, y, biome);
                
                newMaps[id] = {
                    name: getMapName(x, y, biome),
                    imageSrc: `/assets/maps/${id}.png`,
                    music: config.music,
                    ambience: config.ambience,
                    dayNightCycle: true,
                    spawnDensity: config.spawnDensity,
                    spawnTable: BIOME_SPAWN_TABLES[biome] || [],
                    lights: [],
                    adjacentMaps: adjacentMaps,
                    zones: [],
                    weather: weather,
                    biome: biome,
                    level: getMapLevel(x, y)
                };
                generatedCount++;
            }
        }
    }
    
    // Merge: existing maps first, then new maps, then special maps
    const finalMaps = {};
    
    // Add all grid maps in coordinate order (y descending, x ascending - north to south, west to east)
    for (let y = MAX_Y; y >= MIN_Y; y--) {
        for (let x = MIN_X; x <= MAX_X; x++) {
            const id = mapId(x, y);
            if (existingMaps[id]) {
                finalMaps[id] = existingMaps[id];
            } else if (newMaps[id]) {
                finalMaps[id] = newMaps[id];
            }
        }
    }
    
    // Add special maps at the end
    for (const key of specialMaps) {
        if (existingMaps[key]) {
            finalMaps[key] = existingMaps[key];
        }
    }

    // Ensure every grid map has a level property (patch existing maps too)
    for (let y = MAX_Y; y >= MIN_Y; y--) {
        for (let x = MIN_X; x <= MAX_X; x++) {
            const id = mapId(x, y);
            if (finalMaps[id] && finalMaps[id].level === undefined) {
                finalMaps[id].level = getMapLevel(x, y);
            }
        }
    }
    
    // Write output
    const outputPath = path.join(__dirname, 'data', 'maps.json');
    const backupPath = path.join(__dirname, 'data', 'maps.json.bak');
    
    // Backup first
    fs.copyFileSync(mapsPath, backupPath);
    console.log(`\nBackup saved to: ${backupPath}`);
    
    // Write new maps
    fs.writeFileSync(outputPath, JSON.stringify(finalMaps, null, 2));
    
    console.log(`\n=== World Generation Complete ===`);
    console.log(`Grid: ${MAX_X - MIN_X + 1}x${MAX_Y - MIN_Y + 1} (${(MAX_X - MIN_X + 1) * (MAX_Y - MIN_Y + 1)} cells)`);
    console.log(`New maps generated: ${generatedCount}`);
    console.log(`Existing maps updated: ${updatedCount}`);
    console.log(`Special maps preserved: ${specialMaps.length}`);
    console.log(`Total maps: ${Object.keys(finalMaps).length}`);
    
    // Print biome distribution
    const biomeCounts = {};
    for (let y = MIN_Y; y <= MAX_Y; y++) {
        for (let x = MIN_X; x <= MAX_X; x++) {
            const b = getBiome(x, y);
            biomeCounts[b] = (biomeCounts[b] || 0) + 1;
        }
    }
    console.log(`\n=== Biome Distribution ===`);
    for (const [biome, count] of Object.entries(biomeCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${biome}: ${count} maps`);
    }
    
    // Print travel time estimates
    const GRID_W = MAX_X - MIN_X + 1;
    const GRID_H = MAX_Y - MIN_Y + 1;
    const RUN_SPEED = 810; // px/s
    const MAP_W = 3840;
    const MAP_H = 2160;
    console.log(`\n=== Travel Time Estimates ===`);
    console.log(`  Running speed: ${RUN_SPEED} px/s`);
    console.log(`  Per cell horizontal: ${(MAP_W / RUN_SPEED).toFixed(1)}s`);
    console.log(`  Per cell vertical: ${(MAP_H / RUN_SPEED).toFixed(1)}s`);
    console.log(`  End-to-end horizontal (${GRID_W} cells): ${(GRID_W * MAP_W / RUN_SPEED).toFixed(0)}s (${(GRID_W * MAP_W / RUN_SPEED / 60).toFixed(1)} min)`);
    console.log(`  End-to-end vertical (${GRID_H} cells): ${(GRID_H * MAP_H / RUN_SPEED).toFixed(0)}s (${(GRID_H * MAP_H / RUN_SPEED / 60).toFixed(1)} min)`);
    console.log(`  With gameplay (3-5x): ~${(GRID_W * MAP_W / RUN_SPEED / 60 * 3).toFixed(0)}-${(GRID_W * MAP_W / RUN_SPEED / 60 * 5).toFixed(0)} min exploration time`);
}

function parseMapId(id) {
    // Parse "x-y" format, handling negative numbers
    // Examples: "0-0" → [0,0], "-1-0" → [-1,0], "0--1" → [0,-1], "-1--1" → [-1,-1]
    const match = id.match(/^(-?\d+)-(-?\d+)$/);
    if (match) {
        return [parseInt(match[1]), parseInt(match[2])];
    }
    return [NaN, NaN];
}

generateWorld();
