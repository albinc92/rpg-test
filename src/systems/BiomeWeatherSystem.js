/**
 * BiomeWeatherSystem - Dynamic, biome-driven weather that rolls per-region on a global clock.
 * 
 * Architecture:
 *   - Each region gets weather rolled from biome probability tables
 *   - Weather is represented as continuous 0-1 channel intensities (rain, snow, wind, fog, cloud)
 *   - Rolls happen on a global timer (15-20 min real-time intervals), NOT on map entry
 *   - Border cells blend weather from adjacent regions (3-cell gradient)
 *   - Time-of-day modifiers adjust probabilities (more fog at dawn, storms at dusk, etc.)
 *   - Maps biome ambience files for AudioManager
 */

// ─── Biome Weather Probability Tables ───────────────────────────────────────
// Each biome defines weighted weather "presets" that get rolled.
// Channels: rain (0-1), snow (0-1), wind (0-1), fog (0-1), cloud (0-1)
// weight = relative probability of being chosen

const BIOME_WEATHER_TABLES = {
    // ── Forests ──
    'woodland': [
        { weight: 40, channels: { rain: 0,    snow: 0,   wind: 0.1, fog: 0,    cloud: 0.2 } },  // clear
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.15, fog: 0,   cloud: 0.5 } },  // overcast
        { weight: 15, channels: { rain: 0.3,  snow: 0,   wind: 0.2, fog: 0,    cloud: 0.6 } },  // light rain
        { weight: 10, channels: { rain: 0.6,  snow: 0,   wind: 0.4, fog: 0,    cloud: 0.8 } },  // moderate rain
        { weight: 5,  channels: { rain: 0.9,  snow: 0,   wind: 0.7, fog: 0,    cloud: 1.0 } },  // heavy rain
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.05, fog: 0.5, cloud: 0.3 } },  // foggy
    ],
    'dense-forest': [
        { weight: 30, channels: { rain: 0,    snow: 0,   wind: 0.05, fog: 0.2, cloud: 0.3 } },  // misty clear
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.1,  fog: 0.5, cloud: 0.4 } },  // heavy mist
        { weight: 20, channels: { rain: 0.35, snow: 0,   wind: 0.15, fog: 0.3, cloud: 0.7 } },  // drizzle
        { weight: 15, channels: { rain: 0.65, snow: 0,   wind: 0.3,  fog: 0.1, cloud: 0.8 } },  // rain
        { weight: 5,  channels: { rain: 0.95, snow: 0,   wind: 0.6,  fog: 0,   cloud: 1.0 } },  // downpour
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.02, fog: 0.8, cloud: 0.2 } },  // deep fog
    ],

    // ── Grasslands & Plains ──
    'grassland': [
        { weight: 40, channels: { rain: 0,    snow: 0,   wind: 0.2,  fog: 0,   cloud: 0.1 } },  // sunny breezy
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.4 } },  // windy overcast
        { weight: 15, channels: { rain: 0.3,  snow: 0,   wind: 0.3,  fog: 0,   cloud: 0.6 } },  // light rain
        { weight: 10, channels: { rain: 0.6,  snow: 0,   wind: 0.5,  fog: 0,   cloud: 0.8 } },  // rainstorm
        { weight: 5,  channels: { rain: 0.85, snow: 0,   wind: 0.8,  fog: 0,   cloud: 1.0 } },  // thunderstorm
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.1,  fog: 0.4, cloud: 0.2 } },  // morning fog
    ],
    'plains': [
        { weight: 45, channels: { rain: 0,    snow: 0,   wind: 0.25, fog: 0,   cloud: 0.15 } }, // clear
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.45, fog: 0,   cloud: 0.4 } },  // gusty
        { weight: 15, channels: { rain: 0.25, snow: 0,   wind: 0.3,  fog: 0,   cloud: 0.55 } }, // drizzle
        { weight: 10, channels: { rain: 0.55, snow: 0,   wind: 0.5,  fog: 0,   cloud: 0.75 } }, // rain
        { weight: 5,  channels: { rain: 0.8,  snow: 0,   wind: 0.85, fog: 0,   cloud: 1.0 } },  // storm
        { weight: 5,  channels: { rain: 0,    snow: 0,   wind: 0.15, fog: 0.35, cloud: 0.2 } }, // hazy
    ],
    'meadow': [
        { weight: 50, channels: { rain: 0,    snow: 0,   wind: 0.15, fog: 0,   cloud: 0.1 } },  // sunny
        { weight: 20, channels: { rain: 0.2,  snow: 0,   wind: 0.2,  fog: 0,   cloud: 0.5 } },  // light shower
        { weight: 15, channels: { rain: 0.5,  snow: 0,   wind: 0.3,  fog: 0,   cloud: 0.7 } },  // rain
        { weight: 5,  channels: { rain: 0.8,  snow: 0,   wind: 0.6,  fog: 0,   cloud: 0.9 } },  // heavy rain
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.05, fog: 0.5, cloud: 0.15 } }, // dewy fog
    ],

    // ── Arid & Desert ──
    'desert': [
        { weight: 50, channels: { rain: 0,    snow: 0,   wind: 0.3,  fog: 0,   cloud: 0.05 } }, // scorching clear
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.6,  fog: 0,   cloud: 0.1 } },  // dust wind
        { weight: 15, channels: { rain: 0,    snow: 0,   wind: 0.9,  fog: 0,   cloud: 0.2 } },  // sandstorm
        { weight: 10, channels: { rain: 0.2,  snow: 0,   wind: 0.2,  fog: 0,   cloud: 0.6 } },  // rare drizzle
        { weight: 5,  channels: { rain: 0.5,  snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.8 } },  // desert rain
    ],
    'arid-desert': [
        { weight: 55, channels: { rain: 0,    snow: 0,   wind: 0.35, fog: 0,   cloud: 0.03 } }, // blazing
        { weight: 25, channels: { rain: 0,    snow: 0,   wind: 0.7,  fog: 0,   cloud: 0.1 } },  // hot wind
        { weight: 15, channels: { rain: 0,    snow: 0,   wind: 1.0,  fog: 0,   cloud: 0.15 } }, // fierce sandstorm
        { weight: 5,  channels: { rain: 0.15, snow: 0,   wind: 0.25, fog: 0,   cloud: 0.5 } },  // miracle rain
    ],

    // ── Cold & Snow ──
    'snow': [
        { weight: 25, channels: { rain: 0,    snow: 0.1, wind: 0.15, fog: 0,   cloud: 0.3 } },  // light flurries
        { weight: 25, channels: { rain: 0,    snow: 0.4, wind: 0.25, fog: 0,   cloud: 0.5 } },  // snow
        { weight: 15, channels: { rain: 0,    snow: 0.7, wind: 0.5,  fog: 0,   cloud: 0.8 } },  // heavy snow
        { weight: 10, channels: { rain: 0,    snow: 0.95,wind: 0.9,  fog: 0.2, cloud: 1.0 } },  // blizzard
        { weight: 15, channels: { rain: 0,    snow: 0,   wind: 0.3,  fog: 0,   cloud: 0.2 } },  // cold clear
        { weight: 10, channels: { rain: 0,    snow: 0.2, wind: 0.1,  fog: 0.5, cloud: 0.4 } },  // icy fog
    ],
    'tundra': [
        { weight: 30, channels: { rain: 0,    snow: 0.2, wind: 0.4,  fog: 0,   cloud: 0.3 } },  // windswept
        { weight: 20, channels: { rain: 0,    snow: 0.5, wind: 0.5,  fog: 0,   cloud: 0.6 } },  // snow
        { weight: 15, channels: { rain: 0,    snow: 0.8, wind: 0.7,  fog: 0.1, cloud: 0.9 } },  // heavy snow
        { weight: 10, channels: { rain: 0,    snow: 1.0, wind: 1.0,  fog: 0.3, cloud: 1.0 } },  // whiteout
        { weight: 15, channels: { rain: 0,    snow: 0,   wind: 0.5,  fog: 0,   cloud: 0.15 } }, // bitter cold clear
        { weight: 10, channels: { rain: 0,    snow: 0.1, wind: 0.2,  fog: 0.6, cloud: 0.3 } },  // frozen fog
    ],

    // ── Mountains ──
    'mountain': [
        { weight: 30, channels: { rain: 0,    snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.2 } },  // clear windy
        { weight: 15, channels: { rain: 0,    snow: 0.3, wind: 0.5,  fog: 0,   cloud: 0.5 } },  // mountain snow
        { weight: 15, channels: { rain: 0.3,  snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.6 } },  // mountain rain
        { weight: 10, channels: { rain: 0.7,  snow: 0,   wind: 0.7,  fog: 0,   cloud: 0.9 } },  // mountain storm
        { weight: 10, channels: { rain: 0,    snow: 0.6, wind: 0.8,  fog: 0.2, cloud: 0.8 } },  // snowstorm
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.2,  fog: 0.7, cloud: 0.4 } },  // cloud cover
        { weight: 10, channels: { rain: 0,    snow: 0,   wind: 0.6,  fog: 0,   cloud: 0.1 } },  // gale
    ],
    'high-mountain': [
        { weight: 20, channels: { rain: 0,    snow: 0.2, wind: 0.6,  fog: 0,   cloud: 0.3 } },  // exposed
        { weight: 20, channels: { rain: 0,    snow: 0.5, wind: 0.7,  fog: 0.2, cloud: 0.6 } },  // snow
        { weight: 15, channels: { rain: 0,    snow: 0.8, wind: 0.9,  fog: 0.3, cloud: 0.9 } },  // heavy snow
        { weight: 10, channels: { rain: 0,    snow: 1.0, wind: 1.0,  fog: 0.4, cloud: 1.0 } },  // summit blizzard
        { weight: 15, channels: { rain: 0,    snow: 0,   wind: 0.8,  fog: 0,   cloud: 0.1 } },  // fierce gale
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.3,  fog: 0.8, cloud: 0.5 } },  // cloud bank
    ],

    // ── Water ──
    'lake': [
        { weight: 35, channels: { rain: 0,    snow: 0,   wind: 0.1,  fog: 0.2, cloud: 0.2 } },  // calm misty
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.05, fog: 0.6, cloud: 0.3 } },  // lake fog
        { weight: 20, channels: { rain: 0.3,  snow: 0,   wind: 0.2,  fog: 0.1, cloud: 0.6 } },  // drizzle
        { weight: 15, channels: { rain: 0.6,  snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.8 } },  // rain
        { weight: 10, channels: { rain: 0.85, snow: 0,   wind: 0.6,  fog: 0,   cloud: 1.0 } },  // lake storm
    ],
    'river-valley': [
        { weight: 35, channels: { rain: 0,    snow: 0,   wind: 0.15, fog: 0.3, cloud: 0.2 } },  // misty valley
        { weight: 20, channels: { rain: 0,    snow: 0,   wind: 0.05, fog: 0.7, cloud: 0.3 } },  // valley fog
        { weight: 20, channels: { rain: 0.35, snow: 0,   wind: 0.2,  fog: 0.1, cloud: 0.6 } },  // rain
        { weight: 15, channels: { rain: 0.6,  snow: 0,   wind: 0.4,  fog: 0,   cloud: 0.8 } },  // downpour
        { weight: 10, channels: { rain: 0.8,  snow: 0,   wind: 0.7,  fog: 0,   cloud: 1.0 } },  // storm
    ],
};

// ─── Time-of-Day Modifiers ──────────────────────────────────────────────────
// Multiply channel probabilities/intensities by phase
// e.g., fog is more likely at dawn, storms more likely at dusk

const TIME_MODIFIERS = {
    night: { rain: 0.7, snow: 0.8, wind: 0.6, fog: 1.4, cloud: 1.1 },
    dawn:  { rain: 0.8, snow: 0.9, wind: 0.7, fog: 1.8, cloud: 1.0 },
    day:   { rain: 1.0, snow: 1.0, wind: 1.0, fog: 0.5, cloud: 1.0 },
    dusk:  { rain: 1.3, snow: 1.1, wind: 1.2, fog: 1.3, cloud: 1.2 },
};

// ─── Biome Ambience Mapping ─────────────────────────────────────────────────
// Maps biome types to ambience audio filenames

const BIOME_AMBIENCE_MAP = {
    'woodland':      'forest-0.mp3',
    'dense-forest':  'forest-0.mp3',
    'grassland':     'plains-0.mp3',
    'plains':        'plains-0.mp3',
    'meadow':        'plains-0.mp3',
    'desert':        'desert-0.mp3',
    'arid-desert':   'desert-0.mp3',
    'snow':          'snow-0.mp3',
    'tundra':        'snow-0.mp3',
    'mountain':      'mountain-0.mp3',
    'high-mountain': 'mountain-0.mp3',
    'lake':          'water-0.mp3',
    'river-valley':  'water-0.mp3',
};

// ─── Weather Roll Interval ──────────────────────────────────────────────────
// Real-time seconds between weather rerolls (15-20 minutes)
const WEATHER_ROLL_MIN_SECONDS = 15 * 60;  // 15 minutes
const WEATHER_ROLL_MAX_SECONDS = 20 * 60;  // 20 minutes

// Transition duration when weather changes (seconds) - smooth lerp between old and new
const WEATHER_LERP_DURATION = 30; // 30 seconds of gradual change

// Border blending distance (in cells from region edge)
const BLEND_DISTANCE = 3;

// ─── BiomeWeatherSystem Class ───────────────────────────────────────────────

class BiomeWeatherSystem {
    constructor(game) {
        this.game = game;

        // Region weather state: regionName → { channels: {rain,snow,wind,fog,cloud}, prevChannels, lerpProgress, lerpDuration }
        this.regionWeather = new Map();

        // Global reroll timer
        this.timeSinceLastRoll = 0;
        this.nextRollInterval = this._randomRollInterval();

        // Build region→biome lookup once from maps.json
        // Uses the dominant biome per region (most cells)
        this.regionBiomeMap = new Map();      // regionName → dominant biome
        this.regionCells = new Map();         // regionName → Set of "x-y" mapIds
        this.cellRegion = new Map();          // "x-y" → regionName
        this.cellBiome = new Map();           // "x-y" → biome string

        // Adjacency cache for border blending: "x-y" → Set<regionName> of nearby different regions
        this.cellBorderRegions = new Map();   // "x-y" → [{ region, distance }]

        this._initialized = false;
    }

    // ─── Initialization ─────────────────────────────────────────────────────

    /**
     * Initialize from maps.json data. Call once after maps are loaded.
     */
    initialize(mapsData) {
        if (this._initialized) return;

        console.log('🌦️ BiomeWeatherSystem: Initializing...');

        // 1. Build region/biome indices
        const regionBiomeCounts = {};  // regionName → { biome → count }

        for (const [mapId, mapData] of Object.entries(mapsData)) {
            if (!mapData.biome || !mapData.region) continue;

            const region = mapData.region;
            const biome = mapData.biome;

            this.cellRegion.set(mapId, region);
            this.cellBiome.set(mapId, biome);

            if (!this.regionCells.has(region)) {
                this.regionCells.set(region, new Set());
            }
            this.regionCells.get(region).add(mapId);

            if (!regionBiomeCounts[region]) regionBiomeCounts[region] = {};
            regionBiomeCounts[region][biome] = (regionBiomeCounts[region][biome] || 0) + 1;
        }

        // Pick dominant biome per region
        for (const [region, counts] of Object.entries(regionBiomeCounts)) {
            let maxBiome = 'plains';
            let maxCount = 0;
            for (const [biome, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxBiome = biome;
                }
            }
            this.regionBiomeMap.set(region, maxBiome);
        }

        // 2. Build border blending index
        this._buildBorderIndex(mapsData);

        // 3. Initial weather roll for all regions
        this._rollAllRegionWeather();

        this._initialized = true;
        console.log(`🌦️ BiomeWeatherSystem: Initialized ${this.regionBiomeMap.size} regions`);
    }

    /**
     * Build border blending index.
     * For each cell, find if it's near (within BLEND_DISTANCE) a different region.
     */
    _buildBorderIndex(mapsData) {
        // Parse all cell coordinates
        const cellCoords = new Map(); // "x-y" → {x, y}
        for (const mapId of this.cellRegion.keys()) {
            const parts = mapId.split('-');
            // Handle negative numbers: "-14-15" splits to ["", "14", "15"]
            // "5-10" splits to ["5", "10"]
            let x, y;
            if (mapId.startsWith('-')) {
                // Negative x
                const rest = mapId.substring(1); // "14-15" or "14--15"
                const idx = rest.indexOf('-');
                if (idx === -1) continue;
                x = -parseInt(rest.substring(0, idx));
                const yStr = rest.substring(idx + 1);
                y = parseInt(yStr.startsWith('-') ? yStr : yStr);
                if (yStr.startsWith('-')) y = -parseInt(yStr.substring(1));
                else y = parseInt(yStr);
            } else {
                const idx = mapId.indexOf('-');
                if (idx === -1) continue;
                x = parseInt(mapId.substring(0, idx));
                const yStr = mapId.substring(idx + 1);
                if (yStr.startsWith('-')) y = -parseInt(yStr.substring(1));
                else y = parseInt(yStr);
            }
            cellCoords.set(mapId, { x, y });
        }

        // For each cell, check surrounding cells within BLEND_DISTANCE
        for (const [mapId, coord] of cellCoords) {
            const myRegion = this.cellRegion.get(mapId);
            if (!myRegion) continue;

            const nearbyRegions = new Map(); // region → min distance

            for (let dx = -BLEND_DISTANCE; dx <= BLEND_DISTANCE; dx++) {
                for (let dy = -BLEND_DISTANCE; dy <= BLEND_DISTANCE; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance
                    const nx = coord.x + dx;
                    const ny = coord.y + dy;
                    const neighborId = `${nx}-${ny}`;
                    const neighborRegion = this.cellRegion.get(neighborId);

                    if (neighborRegion && neighborRegion !== myRegion) {
                        const existing = nearbyRegions.get(neighborRegion);
                        if (!existing || dist < existing) {
                            nearbyRegions.set(neighborRegion, dist);
                        }
                    }
                }
            }

            if (nearbyRegions.size > 0) {
                const borders = [];
                for (const [region, distance] of nearbyRegions) {
                    borders.push({ region, distance });
                }
                this.cellBorderRegions.set(mapId, borders);
            }
        }

        const borderCellCount = this.cellBorderRegions.size;
        console.log(`🌦️ BiomeWeatherSystem: ${borderCellCount} border cells indexed for blending`);
    }

    // ─── Weather Rolling ────────────────────────────────────────────────────

    /**
     * Roll weather for all regions.
     */
    _rollAllRegionWeather() {
        for (const [region, biome] of this.regionBiomeMap) {
            this._rollRegionWeather(region, biome);
        }
    }

    /**
     * Roll weather for a single region based on its biome + time of day.
     */
    _rollRegionWeather(region, biome) {
        const table = BIOME_WEATHER_TABLES[biome] || BIOME_WEATHER_TABLES['plains'];

        // Get time-of-day phase
        const phase = this._getTimePhase();
        const timeMod = TIME_MODIFIERS[phase] || TIME_MODIFIERS.day;

        // Weighted random selection from table
        const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * totalWeight;
        let selected = table[0];

        for (const entry of table) {
            roll -= entry.weight;
            if (roll <= 0) {
                selected = entry;
                break;
            }
        }

        // Apply time-of-day modifiers and clamp to 0-1
        const newChannels = {
            rain:  Math.min(1, Math.max(0, selected.channels.rain  * timeMod.rain)),
            snow:  Math.min(1, Math.max(0, selected.channels.snow  * timeMod.snow)),
            wind:  Math.min(1, Math.max(0, selected.channels.wind  * timeMod.wind)),
            fog:   Math.min(1, Math.max(0, selected.channels.fog   * timeMod.fog)),
            cloud: Math.min(1, Math.max(0, selected.channels.cloud * timeMod.cloud)),
        };

        // Set up lerp transition from current to new
        const existing = this.regionWeather.get(region);
        const prevChannels = existing
            ? { ...existing.channels }
            : { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };

        this.regionWeather.set(region, {
            channels: prevChannels,       // current (lerping)
            targetChannels: newChannels,   // target
            prevChannels: prevChannels,    // from
            lerpProgress: 0,
            lerpDuration: WEATHER_LERP_DURATION,
        });

        console.log(`🌦️ Weather rolled for "${region}" (${biome}, ${phase}):`,
            `rain=${newChannels.rain.toFixed(2)} snow=${newChannels.snow.toFixed(2)} ` +
            `wind=${newChannels.wind.toFixed(2)} fog=${newChannels.fog.toFixed(2)} ` +
            `cloud=${newChannels.cloud.toFixed(2)}`);
    }

    /**
     * Get current time-of-day phase from DayNightCycle.
     */
    _getTimePhase() {
        if (this.game.dayNightCycle) {
            const t = this.game.dayNightCycle.timeOfDay;
            if (t >= 0 && t < 5) return 'night';
            if (t >= 5 && t < 8) return 'dawn';
            if (t >= 8 && t < 17) return 'day';
            if (t >= 17 && t < 20) return 'dusk';
            return 'night';
        }
        return 'day';
    }

    /**
     * Random interval between rolls.
     */
    _randomRollInterval() {
        return WEATHER_ROLL_MIN_SECONDS + Math.random() * (WEATHER_ROLL_MAX_SECONDS - WEATHER_ROLL_MIN_SECONDS);
    }

    // ─── Update Loop ────────────────────────────────────────────────────────

    /**
     * Called every frame from GameEngine. Handles global timer + lerp transitions.
     * @param {number} deltaTime - seconds since last frame
     */
    update(deltaTime) {
        if (!this._initialized) return;

        // 1. Advance global reroll timer
        this.timeSinceLastRoll += deltaTime;
        if (this.timeSinceLastRoll >= this.nextRollInterval) {
            this.timeSinceLastRoll = 0;
            this.nextRollInterval = this._randomRollInterval();
            this._rollAllRegionWeather();
            console.log(`🌦️ Global weather reroll. Next in ${(this.nextRollInterval / 60).toFixed(1)} minutes`);
        }

        // 2. Lerp each region's channels toward target
        for (const [region, state] of this.regionWeather) {
            if (state.lerpProgress < 1) {
                state.lerpProgress += deltaTime / state.lerpDuration;
                if (state.lerpProgress >= 1) {
                    state.lerpProgress = 1;
                    // Snap to target
                    state.channels = { ...state.targetChannels };
                } else {
                    const t = this._smoothstep(state.lerpProgress);
                    state.channels.rain  = this._lerp(state.prevChannels.rain,  state.targetChannels.rain,  t);
                    state.channels.snow  = this._lerp(state.prevChannels.snow,  state.targetChannels.snow,  t);
                    state.channels.wind  = this._lerp(state.prevChannels.wind,  state.targetChannels.wind,  t);
                    state.channels.fog   = this._lerp(state.prevChannels.fog,   state.targetChannels.fog,   t);
                    state.channels.cloud = this._lerp(state.prevChannels.cloud, state.targetChannels.cloud, t);
                }
            }
        }
    }

    // ─── Query API ──────────────────────────────────────────────────────────

    /**
     * Get the effective weather channels for a specific map cell.
     * Handles border blending automatically.
     * @param {string} mapId - e.g. "5-10" or "-3-7"
     * @returns {{ rain: number, snow: number, wind: number, fog: number, cloud: number }}
     */
    getWeatherForCell(mapId) {
        const region = this.cellRegion.get(mapId);
        if (!region) {
            return { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        }

        const regionState = this.regionWeather.get(region);
        if (!regionState) {
            return { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        }

        // Check for border blending
        const borders = this.cellBorderRegions.get(mapId);
        if (!borders || borders.length === 0) {
            // Interior cell — pure region weather
            return { ...regionState.channels };
        }

        // Border cell — blend with nearby regions
        // Weight: own region gets base weight, neighbors get influence inversely proportional to distance
        // distance 1 → 35% neighbor, distance 2 → 15% neighbor, distance 3 → 5% neighbor
        const BLEND_WEIGHTS = { 1: 0.35, 2: 0.15, 3: 0.05 };

        let totalNeighborWeight = 0;
        const blended = {
            rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0
        };

        for (const border of borders) {
            const neighborState = this.regionWeather.get(border.region);
            if (!neighborState) continue;

            const w = BLEND_WEIGHTS[border.distance] || 0;
            totalNeighborWeight += w;

            blended.rain  += neighborState.channels.rain  * w;
            blended.snow  += neighborState.channels.snow  * w;
            blended.wind  += neighborState.channels.wind  * w;
            blended.fog   += neighborState.channels.fog   * w;
            blended.cloud += neighborState.channels.cloud * w;
        }

        // Clamp total neighbor weight (in case many neighbors overlap)
        totalNeighborWeight = Math.min(totalNeighborWeight, 0.5);

        const ownWeight = 1 - totalNeighborWeight;

        // Normalize neighbor blended values if we clamped
        const neighborScale = totalNeighborWeight > 0
            ? Math.min(totalNeighborWeight, 0.5) / (blended.rain > 0 || blended.snow > 0 || blended.wind > 0 || blended.fog > 0 || blended.cloud > 0 ? totalNeighborWeight : 1)
            : 0;

        return {
            rain:  Math.min(1, regionState.channels.rain  * ownWeight + blended.rain  * (totalNeighborWeight > 0 ? neighborScale : 0)),
            snow:  Math.min(1, regionState.channels.snow  * ownWeight + blended.snow  * (totalNeighborWeight > 0 ? neighborScale : 0)),
            wind:  Math.min(1, regionState.channels.wind  * ownWeight + blended.wind  * (totalNeighborWeight > 0 ? neighborScale : 0)),
            fog:   Math.min(1, regionState.channels.fog   * ownWeight + blended.fog   * (totalNeighborWeight > 0 ? neighborScale : 0)),
            cloud: Math.min(1, regionState.channels.cloud * ownWeight + blended.cloud * (totalNeighborWeight > 0 ? neighborScale : 0)),
        };
    }

    /**
     * Get the pure (unblended) region weather channels.
     * @param {string} region - region name
     * @returns {{ rain: number, snow: number, wind: number, fog: number, cloud: number }}
     */
    getRegionWeather(region) {
        const state = this.regionWeather.get(region);
        if (!state) return { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        return { ...state.channels };
    }

    /**
     * Get the biome ambience file for a given map cell.
     * @param {string} mapId - cell id
     * @returns {string|null} - ambience filename (e.g. "forest-0.mp3")
     */
    getBiomeAmbience(mapId) {
        const biome = this.cellBiome.get(mapId);
        if (!biome) return null;
        return BIOME_AMBIENCE_MAP[biome] || null;
    }

    /**
     * Get region name for a cell.
     */
    getRegionForCell(mapId) {
        return this.cellRegion.get(mapId) || null;
    }

    /**
     * Get dominant biome for a region.
     */
    getBiomeForRegion(region) {
        return this.regionBiomeMap.get(region) || null;
    }

    // ─── Save / Load ────────────────────────────────────────────────────────

    /**
     * Serialize weather state for saving.
     */
    serialize() {
        const regionStates = {};
        for (const [region, state] of this.regionWeather) {
            regionStates[region] = {
                channels: { ...state.channels },
                targetChannels: { ...state.targetChannels },
            };
        }
        return {
            timeSinceLastRoll: this.timeSinceLastRoll,
            nextRollInterval: this.nextRollInterval,
            regionStates,
        };
    }

    /**
     * Restore weather state from save data.
     */
    deserialize(data) {
        if (!data) return;

        this.timeSinceLastRoll = data.timeSinceLastRoll || 0;
        this.nextRollInterval = data.nextRollInterval || this._randomRollInterval();

        if (data.regionStates) {
            for (const [region, saved] of Object.entries(data.regionStates)) {
                if (this.regionWeather.has(region)) {
                    const state = this.regionWeather.get(region);
                    state.channels = { ...saved.channels };
                    state.targetChannels = { ...saved.targetChannels };
                    state.prevChannels = { ...saved.channels };
                    state.lerpProgress = 1; // Already at target
                }
            }
        }
    }

    // ─── Utilities ──────────────────────────────────────────────────────────

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    _smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Debug: print all region weather
     */
    debugPrint() {
        console.log('═══ BiomeWeatherSystem State ═══');
        console.log(`Next reroll in: ${((this.nextRollInterval - this.timeSinceLastRoll) / 60).toFixed(1)} min`);
        for (const [region, state] of this.regionWeather) {
            const c = state.channels;
            const biome = this.regionBiomeMap.get(region);
            console.log(
                `  ${region} (${biome}): ` +
                `rain=${c.rain.toFixed(2)} snow=${c.snow.toFixed(2)} ` +
                `wind=${c.wind.toFixed(2)} fog=${c.fog.toFixed(2)} cloud=${c.cloud.toFixed(2)}` +
                (state.lerpProgress < 1 ? ` [lerping ${(state.lerpProgress*100).toFixed(0)}%]` : '')
            );
        }
    }
}

// Make available globally (loaded via script tag, not ES modules)
window.BiomeWeatherSystem = BiomeWeatherSystem;
