/**
 * BiomeBGMSystem — Selects background music based on biome + time of day.
 *
 * Replaces the static per-map "music" field with dynamic biome-driven BGM selection.
 * Uses AudioManager's existing crossfade infrastructure for smooth transitions.
 *
 * Design decisions:
 *   - Biome is the primary BGM driver (same biome = same track, no restart on map transition)
 *   - Time of day adds night variants (day → night crossfade)
 *   - Battle state is ignored — BattleState manages its own BGM independently
 *   - Region continuity: crossing between maps of the same biome = no BGM change
 *   - Checks biome + time every ~1s (not every frame) to avoid churn
 */

// ─── Biome → BGM Track Mapping ──────────────────────────────────────────────
// Each biome maps to a day and optional night track. If no night variant exists,
// the day track plays 24/7 (e.g. desert sounds mysterious regardless of time).
//
// File naming: bgm-{biome-group}-{time}.mp3
// All files live in assets/audio/bgm/

const BIOME_BGM_TABLE = {
    // ── Forests ──
    'woodland':       { day: 'bgm-forest-day.mp3',     night: 'bgm-forest-night.mp3' },
    'dense-forest':   { day: 'bgm-forest-day.mp3',     night: 'bgm-forest-night.mp3' },

    // ── Grasslands ──
    'grassland':      { day: 'bgm-field-day.mp3',      night: 'bgm-field-night.mp3' },
    'plains':         { day: 'bgm-field-day.mp3',       night: 'bgm-field-night.mp3' },
    'meadow':         { day: 'bgm-field-day.mp3',       night: 'bgm-field-night.mp3' },

    // ── Desert / Arid ──
    'desert':         { day: 'bgm-desert-day.mp3',      night: 'bgm-desert-night.mp3' },
    'arid-desert':    { day: 'bgm-desert-day.mp3',      night: 'bgm-desert-night.mp3' },

    // ── Cold / Snow ──
    'snow':           { day: 'bgm-snow-day.mp3',        night: 'bgm-snow-night.mp3' },
    'tundra':         { day: 'bgm-snow-day.mp3',        night: 'bgm-snow-night.mp3' },

    // ── Mountains ──
    'mountain':       { day: 'bgm-mountain-day.mp3',    night: 'bgm-mountain-night.mp3' },
    'high-mountain':  { day: 'bgm-mountain-day.mp3',    night: 'bgm-mountain-night.mp3' },

    // ── Water ──
    'lake':           { day: 'bgm-water-day.mp3',       night: 'bgm-water-night.mp3' },
    'river-valley':   { day: 'bgm-water-day.mp3',       night: 'bgm-water-night.mp3' },
};

// Fallback for unknown biomes
const DEFAULT_BGM = { day: '01.mp3', night: '01.mp3' };

// ─── Time-of-day → track selection ──────────────────────────────────────────
// Night tracks play from dusk through dawn. Day tracks play during day.
// Dawn/dusk are transition periods — we use crossfade timing to blend naturally.

function isNightTime(hour) {
    // Night: 20:00 → 5:00  (dusk starts at 18, but we switch at 20 to let
    // the visual transition lead, then music follows)
    return hour >= 20 || hour < 5;
}


class BiomeBGMSystem {
    constructor(game) {
        this.game = game;

        // Current state tracking
        this.currentBiome = null;
        this.currentIsNight = false;
        this.currentTrack = null;       // filename currently playing (or requested)

        // Check interval (don't poll every frame)
        this.checkInterval = 1.0;       // seconds between biome/time checks
        this.checkTimer = 0;

        // Enabled flag — disabled during battles, menus, cutscenes
        this.enabled = true;

        // Crossfade duration for biome transitions (longer than default for feel)
        this.biomeCrossfadeDuration = 6000;  // 6s for biome changes
        this.timeCrossfadeDuration = 8000;   // 8s for day↔night (slower, mood shift)

        console.log('🎵 BiomeBGMSystem initialized');
    }

    /**
     * Enable/disable dynamic BGM (e.g., disable during battle, re-enable on exit).
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            // Force re-evaluation on next update
            this.checkTimer = this.checkInterval;
        }
    }

    /**
     * Called every frame from GameEngine update loop.
     */
    update(deltaTime) {
        if (!this.enabled) return;

        this.checkTimer += deltaTime;
        if (this.checkTimer < this.checkInterval) return;
        this.checkTimer = 0;

        this._evaluateBGM();
    }

    /**
     * Force an immediate BGM evaluation (e.g., after map load or battle exit).
     */
    forceUpdate() {
        if (!this.enabled) return;
        this._evaluateBGM();
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    _evaluateBGM() {
        const bws = this.game.biomeWeatherSystem;
        const dnc = this.game.dayNightCycle;
        const mapId = this.game.currentMapId;
        const audio = this.game.audioManager;

        if (!bws || !mapId || !audio) return;

        // Get current biome
        const biome = bws.cellBiome?.get(mapId) || null;
        if (!biome) return;

        // Get time of day
        const hour = dnc ? dnc.timeOfDay : 12;
        const night = isNightTime(hour);

        // Check if anything changed
        const biomeChanged = biome !== this.currentBiome;
        const timeChanged = night !== this.currentIsNight;

        if (!biomeChanged && !timeChanged) return;

        // Determine target track
        const entry = BIOME_BGM_TABLE[biome] || DEFAULT_BGM;
        const targetTrack = night ? entry.night : entry.day;

        // Don't restart if same track (e.g., biome changed but both use same file)
        if (targetTrack === this.currentTrack) {
            this.currentBiome = biome;
            this.currentIsNight = night;
            return;
        }

        // Choose crossfade duration
        const duration = biomeChanged ? this.biomeCrossfadeDuration : this.timeCrossfadeDuration;

        console.log(`🎵 BGM transition: ${this.currentTrack || 'none'} → ${targetTrack}` +
            ` (biome: ${biome}, ${night ? 'night' : 'day'}, fade: ${duration / 1000}s)`);

        // Update state
        this.currentBiome = biome;
        this.currentIsNight = night;
        this.currentTrack = targetTrack;

        // Request BGM change via AudioManager (handles crossfade internally)
        audio.playBGM(targetTrack, duration);
    }

    /**
     * Get the track that would play for a given biome + time (for debug/UI).
     */
    getTrackForBiome(biome, isNight = false) {
        const entry = BIOME_BGM_TABLE[biome] || DEFAULT_BGM;
        return isNight ? entry.night : entry.day;
    }

    /**
     * Reset state (e.g., on new game or return to title).
     */
    reset() {
        this.currentBiome = null;
        this.currentIsNight = false;
        this.currentTrack = null;
        this.checkTimer = 0;
    }
}
