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
        
        this.initializeAudioContext();
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Attempt to enable audio on first user interaction
            const enableAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        this.audioEnabled = true;
                        console.log('[AudioManager] Audio context enabled');
                        this.processPendingActions();
                    });
                } else {
                    this.audioEnabled = true;
                    this.processPendingActions();
                }
            };

            // Listen for any user interaction to enable audio
            ['click', 'keydown', 'touchstart'].forEach(event => {
                document.addEventListener(event, enableAudio, { once: true });
            });

        } catch (error) {
            console.error('[AudioManager] Failed to initialize audio context:', error);
        }
    }

    processPendingActions() {
        while (this.pendingActions.length > 0) {
            const action = this.pendingActions.shift();
            action();
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
            console.log(`[AudioManager] Playing BGM with crossfade: ${filename} (${crossfadeDuration}ms)`);
            
            // Create new audio element
            const newBGM = new Audio(`assets/audio/bgm/${filename}?t=${Date.now()}`);
            newBGM.loop = true;
            newBGM.volume = 0; // Start at 0 for crossfade in
            
            // Start playing the new track
            const playPromise = newBGM.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] New BGM '${filename}' loaded, starting crossfade`);
                    this.crossfadeBGM(this.bgmAudio, newBGM, crossfadeDuration, filename);
                }).catch(error => {
                    console.error(`[AudioManager] Failed to play BGM '${filename}':`, error);
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
            console.log(`[AudioManager] Playing Ambience with crossfade: ${filename} (${crossfadeDuration}ms)`);
            
            // Create new audio element
            const newAmbience = new Audio(`assets/audio/ambience/${filename}?t=${Date.now()}`);
            newAmbience.loop = true;
            newAmbience.volume = 0; // Start at 0 for crossfade in
            
            // Start playing the new track
            const playPromise = newAmbience.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] New Ambience '${filename}' loaded, starting crossfade`);
                    this.crossfadeAmbience(this.ambienceAudio, newAmbience, crossfadeDuration, filename);
                }).catch(error => {
                    console.error(`[AudioManager] Failed to play ambience '${filename}':`, error);
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
                }
                
                // Set new audio as current
                this.ambienceAudio = newAudio;
                this.currentAmbience = newFilename;
                newAudio.volume = this.calculateAmbienceVolume();
                
                console.log(`[AudioManager] Ambience crossfade complete, now playing: ${newFilename}`);
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
            const effectId = `${filename}_${Date.now()}_${Math.random()}`;
            const audio = new Audio(`assets/audio/effect/${filename}?t=${Date.now()}`);
            audio.volume = this.calculateEffectVolume() * volume;
            
            this.effectsAudio.set(effectId, audio);
            
            audio.addEventListener('ended', () => {
                this.effectsAudio.delete(effectId);
            });

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(`[AudioManager] Failed to play effect '${filename}':`, error);
                    this.effectsAudio.delete(effectId);
                });
            }
        };

        if (this.audioEnabled) {
            playAction();
        } else {
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

    // Crossfade management
    clearAllCrossfades() {
        this.activeCrossfades.clear();
        console.log('[AudioManager] All crossfades cleared');
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
            pendingActions: this.pendingActions.length,
            activeCrossfades: this.activeCrossfades.size,
            crossfadeDuration: this.DEFAULT_CROSSFADE_DURATION,
            settings: this.settings
        };
    }
}

// Create global instance
window.AudioManager = new AudioManager();
