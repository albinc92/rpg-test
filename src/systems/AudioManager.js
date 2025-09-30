class AudioManager {
    constructor() {
        this.bgmAudio = null;
        this.currentBGM = null;
        this.ambienceAudio = null;
        this.currentAmbience = null;
        this.effectsAudio = new Map();
        
        // Crossfade settings
        this.DEFAULT_CROSSFADE_DURATION = 1500; // 1.5 seconds default
        this.activeCrossfades = new Set();
        
        // Cache busting - only set on initial launch
        this.cacheBuster = Date.now();
        console.log(`[AudioManager] Cache buster initialized: ${this.cacheBuster}`);
        
        // Audio settings
        this.settings = {
            masterVolume: 1.0,
            bgmVolume: 1.0,
            effectVolume: 1.0,
            muted: false
        };
        
        // User gesture handling
        this.audioContext = null;
        this.audioEnabled = false;
        this.pendingActions = [];
        this.startScreenShown = false;
        
        // Cleanup tracking
        this.audioElements = new Set();
        
        this.initializeAudioContext();
        this.setupCleanupHandlers();
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log(`[AudioManager] Audio context created, state: ${this.audioContext.state}`);
            
            // Check if audio needs user interaction
            if (this.audioContext.state === 'suspended') {
                console.log('[AudioManager] Audio context suspended - user interaction required');
                
                // Let the game handle the start screen, just listen for clicks
                this.setupUserInteractionListener();
            } else {
                console.log('[AudioManager] ✅ Audio context ready immediately');
                this.audioEnabled = true;
                this.processPendingActions();
                this.notifyAudioReady();
            }

        } catch (error) {
            console.error('[AudioManager] ❌ Failed to initialize audio context:', error);
        }
    }

    processPendingActions() {
        console.log(`[AudioManager] Processing ${this.pendingActions.length} pending audio actions`);
        while (this.pendingActions.length > 0) {
            const action = this.pendingActions.shift();
            try {
                action();
            } catch (error) {
                console.error('[AudioManager] ❌ Error processing pending action:', error);
            }
        }
    }

    setupCleanupHandlers() {
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Cleanup on visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('[AudioManager] Page hidden, pausing non-essential audio');
            } else {
                console.log('[AudioManager] Page visible, resuming audio');
            }
        });
    }

    cleanup() {
        console.log('[AudioManager] Performing cleanup...');
        
        // Clear all crossfades
        this.clearAllCrossfades();
        
        // Stop and cleanup all audio
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.src = '';
        }
        if (this.ambienceAudio) {
            this.ambienceAudio.pause();
            this.ambienceAudio.src = '';
        }
        
        // Cleanup all effects
        this.effectsAudio.forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        this.effectsAudio.clear();
        
        // Cleanup tracked elements
        this.audioElements.forEach(audio => {
            if (audio && !audio.paused) {
                audio.pause();
                audio.src = '';
            }
        });
        this.audioElements.clear();
        
        console.log('[AudioManager] ✅ Cleanup complete');
    }

    // Ensure filename has .mp3 extension
    ensureMp3Extension(filename) {
        if (!filename) return filename;
        if (typeof filename !== 'string') {
            console.warn(`[AudioManager] ⚠️ Invalid filename type: ${typeof filename}, expected string`);
            return null;
        }
        return filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
    }

    // Create audio element with proper tracking and error handling
    createAudioElement(path, type = 'unknown') {
        try {
            const audio = new Audio(`${path}?cb=${this.cacheBuster}`);
            this.audioElements.add(audio);
            
            // Add error handling
            audio.addEventListener('error', (e) => {
                console.error(`[AudioManager] ❌ Failed to load ${type} audio:`, path, e);
                this.audioElements.delete(audio);
            });
            
            // Cleanup when done
            audio.addEventListener('ended', () => {
                if (type === 'effect') {
                    this.audioElements.delete(audio);
                }
            });
            
            console.log(`[AudioManager] 🎵 Created ${type} audio element: ${path}`);
            return audio;
        } catch (error) {
            console.error(`[AudioManager] ❌ Failed to create ${type} audio element:`, error);
            return null;
        }
    }

    // Core BGM method with crossfade support
    playBGM(filename, crossfadeDuration = this.DEFAULT_CROSSFADE_DURATION) {
        // Handle null/empty filename (no BGM should play)
        if (!filename) {
            console.log('[AudioManager] No BGM filename provided, stopping current BGM');
            this.crossfadeBGMOut(crossfadeDuration);
            return;
        }

        // Critical check: if the requested BGM is already playing, ignore the request
        if (this.currentBGM === filename && this.bgmAudio && !this.bgmAudio.paused) {
            console.log(`[AudioManager] BGM '${filename}' is already playing, ignoring request`);
            return;
        }

        const playAction = () => {
            const safeFilename = this.ensureMp3Extension(filename);
            if (!safeFilename) {
                console.error('[AudioManager] ❌ Invalid BGM filename provided');
                return;
            }

            console.log(`[AudioManager] 🎵 Playing BGM with crossfade: ${safeFilename} (${crossfadeDuration}ms)`);
            
            // Create new audio element with proper error handling
            const newBGM = this.createAudioElement(`assets/audio/bgm/${safeFilename}`, 'BGM');
            if (!newBGM) {
                console.error(`[AudioManager] ❌ Failed to create BGM audio element for: ${safeFilename}`);
                return;
            }

            newBGM.loop = true;
            newBGM.volume = 0; // Start at 0 for crossfade in
            
            // Start playing the new track
            const playPromise = newBGM.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] ✅ BGM '${safeFilename}' loaded successfully, starting crossfade`);
                    this.crossfadeBGM(this.bgmAudio, newBGM, crossfadeDuration, safeFilename);
                }).catch(error => {
                    console.error(`[AudioManager] ❌ Failed to play BGM '${safeFilename}':`, error);
                    this.audioElements.delete(newBGM);
                });
            }
        };

        if (this.audioEnabled) {
            playAction();
        } else {
            console.log(`[AudioManager] Audio not enabled yet, queueing BGM: ${filename}`);
            this.pendingActions.push(playAction);
        }
    }

    // Crossfade between BGM tracks
    crossfadeBGM(oldAudio, newAudio, duration, newFilename) {
        const steps = 50; // Number of volume steps
        const stepTime = duration / steps;
        const volumeStep = this.calculateBGMVolume() / steps;
        
        let currentStep = 0;
        const crossfadeId = `bgm_${Date.now()}`;
        this.activeCrossfades.add(crossfadeId);

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            const progress = currentStep / steps;
            
            // Fade out old audio
            if (oldAudio && !oldAudio.paused) {
                oldAudio.volume = Math.max(0, this.calculateBGMVolume() * (1 - progress));
            }
            
            // Fade in new audio
            if (newAudio && !newAudio.paused) {
                newAudio.volume = Math.min(this.calculateBGMVolume(), this.calculateBGMVolume() * progress);
            }
            
            if (currentStep >= steps) {
                // Crossfade complete
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                // Stop and cleanup old audio
                if (oldAudio && !oldAudio.paused) {
                    oldAudio.pause();
                    oldAudio.currentTime = 0;
                }
                
                // Set new audio as current
                this.bgmAudio = newAudio;
                this.currentBGM = newFilename;
                newAudio.volume = this.calculateBGMVolume();
                
                console.log(`[AudioManager] Crossfade complete, now playing: ${newFilename}`);
            }
        }, stepTime);
    }

    // Crossfade out current BGM (for stopping)
    crossfadeBGMOut(duration = this.DEFAULT_CROSSFADE_DURATION) {
        if (!this.bgmAudio || this.bgmAudio.paused) return;

        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = this.bgmAudio.volume / steps;
        
        let currentStep = 0;
        const crossfadeId = `bgm_out_${Date.now()}`;
        this.activeCrossfades.add(crossfadeId);

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            
            if (this.bgmAudio && !this.bgmAudio.paused) {
                this.bgmAudio.volume = Math.max(0, this.bgmAudio.volume - volumeStep);
            }
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                if (this.bgmAudio) {
                    this.bgmAudio.pause();
                    this.bgmAudio.currentTime = 0;
                }
                this.currentBGM = null;
                
                console.log('[AudioManager] BGM crossfade out complete');
            }
        }, stepTime);
    }

    stopBGM() {
        if (this.bgmAudio && !this.bgmAudio.paused) {
            console.log(`[AudioManager] Stopping BGM: ${this.currentBGM}`);
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
        // Important: DO NOT reset currentBGM to null here
        // This allows the system to remember what was playing for resume scenarios
    }

    pauseBGM() {
        if (this.bgmAudio && !this.bgmAudio.paused) {
            console.log(`[AudioManager] Pausing BGM: ${this.currentBGM}`);
            this.bgmAudio.pause();
        }
    }

    resumeBGM() {
        if (this.bgmAudio && this.bgmAudio.paused && this.currentBGM) {
            console.log(`[AudioManager] Resuming BGM: ${this.currentBGM}`);
            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(`[AudioManager] Failed to resume BGM '${this.currentBGM}':`, error);
                });
            }
        }
    }

    // Core Ambience method with crossfade support
    playAmbience(filename, crossfadeDuration = this.DEFAULT_CROSSFADE_DURATION) {
        // Handle null/empty filename (no ambience should play)
        if (!filename) {
            console.log('[AudioManager] No ambience filename provided, stopping current ambience');
            this.crossfadeAmbienceOut(crossfadeDuration);
            return;
        }

        // Critical check: if the requested ambience is already playing, ignore the request
        if (this.currentAmbience === filename && this.ambienceAudio && !this.ambienceAudio.paused) {
            console.log(`[AudioManager] Ambience '${filename}' is already playing, ignoring request`);
            return;
        }

        const playAction = () => {
            const safeFilename = this.ensureMp3Extension(filename);
            if (!safeFilename) {
                console.error('[AudioManager] ❌ Invalid ambience filename provided');
                return;
            }

            console.log(`[AudioManager] 🌲 Playing Ambience with crossfade: ${safeFilename} (${crossfadeDuration}ms)`);
            
            // Create new audio element with proper error handling
            const newAmbience = this.createAudioElement(`assets/audio/ambience/${safeFilename}`, 'Ambience');
            if (!newAmbience) {
                console.error(`[AudioManager] ❌ Failed to create ambience audio element for: ${safeFilename}`);
                return;
            }

            newAmbience.loop = true;
            newAmbience.volume = 0; // Start at 0 for crossfade in
            
            // Start playing the new track
            const playPromise = newAmbience.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] ✅ Ambience '${safeFilename}' loaded successfully, starting crossfade`);
                    this.crossfadeAmbience(this.ambienceAudio, newAmbience, crossfadeDuration, safeFilename);
                }).catch(error => {
                    console.error(`[AudioManager] ❌ Failed to play ambience '${safeFilename}':`, error);
                    this.audioElements.delete(newAmbience);
                });
            }
        };

        if (this.audioEnabled) {
            playAction();
        } else {
            console.log(`[AudioManager] Audio not enabled yet, queueing ambience: ${filename}`);
            this.pendingActions.push(playAction);
        }
    }

    // Crossfade between Ambience tracks
    crossfadeAmbience(oldAudio, newAudio, duration, newFilename) {
        const steps = 50; // Number of volume steps
        const stepTime = duration / steps;
        const volumeStep = this.calculateAmbienceVolume() / steps;
        
        let currentStep = 0;
        const crossfadeId = `ambience_${Date.now()}`;
        this.activeCrossfades.add(crossfadeId);

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            const progress = currentStep / steps;
            
            // Fade out old audio
            if (oldAudio && !oldAudio.paused) {
                oldAudio.volume = Math.max(0, this.calculateAmbienceVolume() * (1 - progress));
            }
            
            // Fade in new audio
            if (newAudio && !newAudio.paused) {
                newAudio.volume = Math.min(this.calculateAmbienceVolume(), this.calculateAmbienceVolume() * progress);
            }
            
            if (currentStep >= steps) {
                // Crossfade complete
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                // Stop and cleanup old audio
                if (oldAudio && !oldAudio.paused) {
                    oldAudio.pause();
                    oldAudio.currentTime = 0;
                    oldAudio.src = '';
                    this.audioElements.delete(oldAudio);
                }
                
                // Set new audio as current
                this.ambienceAudio = newAudio;
                this.currentAmbience = newFilename;
                newAudio.volume = this.calculateAmbienceVolume();
                
                console.log(`[AudioManager] ✅ Ambience crossfade complete, now playing: ${newFilename}`);
            }
        }, stepTime);
    }

    // Crossfade out current ambience (for stopping)
    crossfadeAmbienceOut(duration = this.DEFAULT_CROSSFADE_DURATION) {
        if (!this.ambienceAudio || this.ambienceAudio.paused) return;

        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = this.ambienceAudio.volume / steps;
        
        let currentStep = 0;
        const crossfadeId = `ambience_out_${Date.now()}`;
        this.activeCrossfades.add(crossfadeId);

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            
            if (this.ambienceAudio && !this.ambienceAudio.paused) {
                this.ambienceAudio.volume = Math.max(0, this.ambienceAudio.volume - volumeStep);
            }
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                if (this.ambienceAudio) {
                    this.ambienceAudio.pause();
                    this.ambienceAudio.currentTime = 0;
                }
                this.currentAmbience = null;
                
                console.log('[AudioManager] Ambience crossfade out complete');
            }
        }, stepTime);
    }

    stopAmbience() {
        if (this.ambienceAudio && !this.ambienceAudio.paused) {
            console.log(`[AudioManager] Stopping Ambience: ${this.currentAmbience}`);
            this.ambienceAudio.pause();
            this.ambienceAudio.currentTime = 0;
        }
        // Important: DO NOT reset currentAmbience to null here
        // This allows the system to remember what was playing for resume scenarios
    }

    pauseAmbience() {
        if (this.ambienceAudio && !this.ambienceAudio.paused) {
            console.log(`[AudioManager] Pausing Ambience: ${this.currentAmbience}`);
            this.ambienceAudio.pause();
        }
    }

    resumeAmbience() {
        if (this.ambienceAudio && this.ambienceAudio.paused && this.currentAmbience) {
            console.log(`[AudioManager] Resuming Ambience: ${this.currentAmbience}`);
            const playPromise = this.ambienceAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(`[AudioManager] Failed to resume ambience '${this.currentAmbience}':`, error);
                });
            }
        }
    }

    playEffect(filename, volume = 1.0) {
        const playAction = () => {
            const safeFilename = this.ensureMp3Extension(filename);
            if (!safeFilename) {
                console.error('[AudioManager] ❌ Invalid effect filename provided');
                return;
            }

            const effectId = `${safeFilename}_${Date.now()}_${Math.random()}`;
            const audio = this.createAudioElement(`assets/audio/effect/${safeFilename}`, 'Effect');
            
            if (!audio) {
                console.error(`[AudioManager] ❌ Failed to create effect audio element for: ${safeFilename}`);
                return;
            }

            audio.volume = this.calculateEffectVolume() * volume;
            this.effectsAudio.set(effectId, audio);
            
            // Cleanup when effect ends
            audio.addEventListener('ended', () => {
                this.effectsAudio.delete(effectId);
                this.audioElements.delete(audio);
                console.log(`[AudioManager] 🔊 Effect '${safeFilename}' completed and cleaned up`);
            });

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] ✅ Effect '${safeFilename}' started successfully`);
                }).catch(error => {
                    console.error(`[AudioManager] ❌ Failed to play effect '${safeFilename}':`, error);
                    this.effectsAudio.delete(effectId);
                    this.audioElements.delete(audio);
                });
            }
        };

        if (this.audioEnabled) {
            playAction();
        } else {
            console.log(`[AudioManager] 📋 Queueing effect: ${filename} (audio not enabled yet)`);
            this.pendingActions.push(playAction);
        }
    }



    // Volume calculation methods
    calculateBGMVolume() {
        return this.settings.muted ? 0 : this.settings.masterVolume * this.settings.bgmVolume;
    }

    calculateEffectVolume() {
        return this.settings.muted ? 0 : this.settings.masterVolume * this.settings.effectVolume;
    }

    calculateAmbienceVolume() {
        return this.settings.muted ? 0 : this.settings.masterVolume * this.settings.effectVolume * 0.6; // Ambience at 60% of effect volume
    }

    // Settings management
    setMasterVolume(volume) {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    setBGMVolume(volume) {
        this.settings.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.calculateBGMVolume();
        }
    }

    setEffectVolume(volume) {
        this.settings.effectVolume = Math.max(0, Math.min(1, volume));
        this.updateEffectVolumes();
    }

    setMuted(muted) {
        this.settings.muted = muted;
        this.updateAllVolumes();
    }

    updateAllVolumes() {
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.calculateBGMVolume();
        }
        if (this.ambienceAudio) {
            this.ambienceAudio.volume = this.calculateAmbienceVolume();
        }
        this.updateEffectVolumes();
    }

    updateEffectVolumes() {
        this.effectsAudio.forEach(audio => {
            audio.volume = this.calculateEffectVolume();
        });
    }

    // Get current settings
    getSettings() {
        return { ...this.settings };
    }

    // Load settings from storage
    loadSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this.updateAllVolumes();
    }

    // Setup user interaction listener without showing overlay
    setupUserInteractionListener() {
        console.log('[AudioManager] 🎮 Setting up user interaction listener');
        
        // Enable audio on any interaction
        const enableAudio = () => {
            console.log('[AudioManager] 🎯 User interaction detected, enabling audio...');
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    this.audioEnabled = true;
                    console.log('[AudioManager] ✅ Audio context enabled via user interaction');
                    this.processPendingActions();
                    this.notifyAudioReady();
                }).catch(error => {
                    console.error('[AudioManager] ❌ Failed to enable audio context:', error);
                    this.notifyAudioReady(); // Allow game to continue anyway
                });
            } else {
                this.audioEnabled = true;
                console.log('[AudioManager] ✅ Audio context already running');
                this.processPendingActions();
                this.notifyAudioReady();
            }
        };

        // Listen for interactions
        ['click', 'keydown', 'touchstart'].forEach(event => {
            document.addEventListener(event, enableAudio, { once: true });
        });
    }

    // Hide start screen
    hideStartScreen() {
        const overlay = document.getElementById('audio-start-screen');
        if (overlay) {
            overlay.remove();
            console.log('[AudioManager] ✅ Start screen removed');
        }
    }

    // Notify game that audio is ready
    notifyAudioReady() {
        console.log('[AudioManager] 🎵 Notifying game that audio is ready');
        
        // Dispatch custom event for game to listen to
        const audioReadyEvent = new CustomEvent('audioReady', {
            detail: { audioEnabled: this.audioEnabled }
        });
        document.dispatchEvent(audioReadyEvent);
        
        // Also set a global flag for simpler checking
        window.audioReady = true;
    }

    // Crossfade management
    clearAllCrossfades() {
        console.log(`[AudioManager] 🧹 Clearing ${this.activeCrossfades.size} active crossfades`);
        this.activeCrossfades.clear();
    }

    // Debug methods
    getCurrentBGM() {
        return this.currentBGM;
    }

    getCurrentAmbience() {
        return this.currentAmbience;
    }

    isBGMPlaying() {
        return this.bgmAudio && !this.bgmAudio.paused;
    }

    isAmbiencePlaying() {
        return this.ambienceAudio && !this.ambienceAudio.paused;
    }

    getDebugInfo() {
        return {
            currentBGM: this.currentBGM,
            currentAmbience: this.currentAmbience,
            isBGMPlaying: this.isBGMPlaying(),
            isAmbiencePlaying: this.isAmbiencePlaying(),
            audioEnabled: this.audioEnabled,
            audioContextState: this.audioContext?.state || 'null',
            pendingActions: this.pendingActions.length,
            activeCrossfades: this.activeCrossfades.size,
            crossfadeDuration: this.DEFAULT_CROSSFADE_DURATION,
            activeEffects: this.effectsAudio.size,
            trackedElements: this.audioElements.size,
            cacheBuster: this.cacheBuster,
            startScreenShown: this.startScreenShown,
            settings: this.settings
        };
    }
}

// Create global instance
window.AudioManager = new AudioManager();

// Global debug helpers
window.audioDebug = {
    info: () => console.table(window.AudioManager.getDebugInfo()),
    showStartScreen: () => window.AudioManager.showStartScreen(),
    hideStartScreen: () => window.AudioManager.hideStartScreen(),
    cleanup: () => window.AudioManager.cleanup(),
    testBGM: (filename = '00.mp3') => window.AudioManager.playBGM(filename),
    testEffect: (filename = 'coin.mp3') => window.AudioManager.playEffect(filename),
    testAmbience: (filename = 'forest-0.mp3') => window.AudioManager.playAmbience(filename)
};
