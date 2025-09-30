class AudioManager {
    constructor() {
        this.bgmAudio = null;
        this.currentBGM = null;
        this.ambienceAudio = null;
        this.currentAmbience = null;
        this.effectsAudio = new Map();
        
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

    // Core BGM method - implements the requirement: "if a request is sent to play a bgm 
    // and that bgm is already recorded as playing then the request should be ignored"
    playBGM(filename) {
        // Handle null/empty filename (no BGM should play)
        if (!filename) {
            console.log('[AudioManager] No BGM filename provided, stopping current BGM');
            this.stopBGM();
            this.currentBGM = null;
            return;
        }

        // Critical check: if the requested BGM is already playing, ignore the request
        if (this.currentBGM === filename && this.bgmAudio && !this.bgmAudio.paused) {
            console.log(`[AudioManager] BGM '${filename}' is already playing, ignoring request`);
            return;
        }

        const playAction = () => {
            console.log(`[AudioManager] Playing BGM: ${filename}`);
            
            // Stop current BGM if playing
            if (this.bgmAudio && !this.bgmAudio.paused) {
                this.bgmAudio.pause();
                this.bgmAudio.currentTime = 0;
            }

            // Create new audio element
            this.bgmAudio = new Audio(`assets/audio/bgm/${filename}?t=${Date.now()}`);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = this.calculateBGMVolume();
            
            // Track the current BGM
            this.currentBGM = filename;

            // Play the audio
            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] BGM '${filename}' started successfully`);
                }).catch(error => {
                    console.error(`[AudioManager] Failed to play BGM '${filename}':`, error);
                    this.currentBGM = null;
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

    // Core Ambience method - works exactly like BGM but on separate channel
    playAmbience(filename) {
        // Handle null/empty filename (no ambience should play)
        if (!filename) {
            console.log('[AudioManager] No ambience filename provided, stopping current ambience');
            this.stopAmbience();
            this.currentAmbience = null;
            return;
        }

        // Critical check: if the requested ambience is already playing, ignore the request
        if (this.currentAmbience === filename && this.ambienceAudio && !this.ambienceAudio.paused) {
            console.log(`[AudioManager] Ambience '${filename}' is already playing, ignoring request`);
            return;
        }

        const playAction = () => {
            console.log(`[AudioManager] Playing Ambience: ${filename}`);
            
            // Stop current ambience if playing
            if (this.ambienceAudio && !this.ambienceAudio.paused) {
                this.ambienceAudio.pause();
                this.ambienceAudio.currentTime = 0;
            }

            // Create new audio element
            this.ambienceAudio = new Audio(`assets/audio/ambience/${filename}?t=${Date.now()}`);
            this.ambienceAudio.loop = true;
            this.ambienceAudio.volume = this.calculateAmbienceVolume();
            
            // Track the current ambience
            this.currentAmbience = filename;

            // Play the audio
            const playPromise = this.ambienceAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] Ambience '${filename}' started successfully`);
                }).catch(error => {
                    console.error(`[AudioManager] Failed to play ambience '${filename}':`, error);
                    this.currentAmbience = null;
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
            settings: this.settings
        };
    }
}

// Create global instance
window.AudioManager = new AudioManager();
