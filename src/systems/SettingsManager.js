/**
 * SettingsManager - Handles game settings persistence
 * Responsible for: save/load settings, audio config, display settings
 */
class SettingsManager {
    constructor() {
        this.STORAGE_KEY = 'rpg-game-settings';
        
        // Default settings
        this.defaults = {
            masterVolume: 100,
            musicVolume: 100,
            effectsVolume: 100,
            isMuted: false,
            showFPS: true,
            showDebug: false,
            showDebugInfo: true,
            resolution: '1280x720',
            fullscreen: false
        };
        
        this.settings = { ...this.defaults };
    }
    
    /**
     * Load settings from localStorage
     */
    load() {
        try {
            const savedSettings = localStorage.getItem(this.STORAGE_KEY);
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.defaults, ...parsedSettings };
                console.log('✅ Settings loaded from localStorage');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load settings:', error);
        }
        return false;
    }
    
    /**
     * Save settings to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
            console.log('✅ Settings saved to localStorage');
            return true;
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            return false;
        }
    }
    
    /**
     * Get a specific setting
     */
    get(key) {
        return this.settings[key];
    }
    
    /**
     * Set a specific setting and save
     */
    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
    
    /**
     * Get all settings
     */
    getAll() {
        return { ...this.settings };
    }
    
    /**
     * Update multiple settings at once
     */
    update(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.save();
    }
    
    /**
     * Reset to defaults
     */
    reset() {
        this.settings = { ...this.defaults };
        this.save();
    }
}
