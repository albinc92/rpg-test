/**
 * LocaleManager - Internationalization (i18n) System
 * Handles loading and retrieving localized text strings
 */
class LocaleManager {
    constructor() {
        this.currentLocale = 'en';
        this.fallbackLocale = 'en';
        this.strings = {};
        this.loadedLocales = new Set();
        
        // Supported languages with native names
        this.supportedLocales = {
            'en': { name: 'English', nativeName: 'English' },
            'es': { name: 'Spanish', nativeName: 'Español' },
            'fr': { name: 'French', nativeName: 'Français' },
            'de': { name: 'German', nativeName: 'Deutsch' },
            'it': { name: 'Italian', nativeName: 'Italiano' },
            'pt': { name: 'Portuguese', nativeName: 'Português' },
            'ru': { name: 'Russian', nativeName: 'Русский' },
            'ja': { name: 'Japanese', nativeName: '日本語' },
            'ko': { name: 'Korean', nativeName: '한국어' },
            'zh': { name: 'Chinese (Simplified)', nativeName: '简体中文' }
        };
    }
    
    /**
     * Initialize the locale manager
     * @param {string} locale - Initial locale to load
     */
    async initialize(locale = 'en') {
        // Load fallback locale first (English)
        await this.loadLocale(this.fallbackLocale);
        
        // Load requested locale if different
        if (locale !== this.fallbackLocale) {
            await this.loadLocale(locale);
        }
        
        this.currentLocale = locale;
        console.log(`[LocaleManager] Initialized with locale: ${locale}`);
    }
    
    /**
     * Load a locale file
     * @param {string} locale - Locale code (e.g., 'en', 'es')
     * @returns {boolean} Success status
     */
    async loadLocale(locale) {
        try {
            // Always try to load the fallback locale first if not loaded
            if (locale !== this.fallbackLocale && !this.loadedLocales.has(this.fallbackLocale)) {
                await this._loadLocaleFile(this.fallbackLocale);
            }
            
            // Load requested locale
            if (!this.loadedLocales.has(locale)) {
                await this._loadLocaleFile(locale);
            }
            
            // Set as current locale
            this.currentLocale = locale;
            return true;
        } catch (error) {
            console.warn(`[LocaleManager] Failed to load locale '${locale}':`, error.message);
            // Fall back to fallback locale
            if (locale !== this.fallbackLocale) {
                this.currentLocale = this.fallbackLocale;
            }
            return false;
        }
    }
    
    /**
     * Internal method to load a locale file
     * @private
     */
    async _loadLocaleFile(locale) {
        if (this.loadedLocales.has(locale)) {
            return; // Already loaded
        }
        
        const response = await fetch(`/data/locales/${locale}.json`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        this.strings[locale] = data;
        this.loadedLocales.add(locale);
        console.log(`[LocaleManager] Loaded locale: ${locale}`);
    }
    
    /**
     * Set the current locale
     * @param {string} locale - Locale code
     */
    async setLocale(locale) {
        if (!this.supportedLocales[locale]) {
            console.warn(`[LocaleManager] Unsupported locale: ${locale}`);
            return false;
        }
        
        // Load if not already loaded
        if (!this.loadedLocales.has(locale)) {
            await this.loadLocale(locale);
        }
        
        this.currentLocale = locale;
        console.log(`[LocaleManager] Changed locale to: ${locale}`);
        return true;
    }
    
    /**
     * Get a localized string by key
     * Supports nested keys with dot notation: 'menu.main.newGame'
     * Supports parameter substitution: 'Hello, {name}!'
     * 
     * @param {string} key - The string key (e.g., 'menu.main.continue')
     * @param {Object} params - Optional parameters for substitution
     * @returns {string} The localized string or the key if not found
     */
    t(key, params = {}) {
        // Try current locale first
        let value = this._getNestedValue(this.strings[this.currentLocale], key);
        
        // Fall back to fallback locale
        if (value === undefined && this.currentLocale !== this.fallbackLocale) {
            value = this._getNestedValue(this.strings[this.fallbackLocale], key);
        }
        
        // If still not found, return the key itself
        if (value === undefined) {
            // Only warn once per key to avoid spam
            if (!this._missingKeys) this._missingKeys = new Set();
            if (!this._missingKeys.has(key)) {
                console.warn(`[LocaleManager] Missing translation: ${key}`);
                this._missingKeys.add(key);
            }
            return key;
        }
        
        // Substitute parameters
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
            }
        }
        
        return value;
    }
    
    /**
     * Shorthand for t() - translate
     */
    get(key, params = {}) {
        return this.t(key, params);
    }
    
    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, key) {
        if (!obj) return undefined;
        
        const parts = key.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }
    
    /**
     * Get list of supported locales for UI
     * @returns {Array} Array of {code, name, nativeName}
     */
    getSupportedLocales() {
        return Object.entries(this.supportedLocales).map(([code, info]) => ({
            code,
            name: info.name,
            nativeName: info.nativeName
        }));
    }
    
    /**
     * Get current locale code
     */
    getCurrentLocale() {
        return this.currentLocale;
    }
    
    /**
     * Get display name for a locale (in that locale's native language)
     */
    getLocaleDisplayName(locale) {
        return this.supportedLocales[locale]?.nativeName || locale;
    }
}

// Global shorthand function for translations
function t(key, params = {}) {
    if (window.localeManager) {
        return window.localeManager.t(key, params);
    }
    return key; // Fallback if not initialized
}
window.LocaleManager = LocaleManager;
window.t = t;
