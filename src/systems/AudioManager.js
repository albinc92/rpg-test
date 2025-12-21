class AudioManager {
    constructor() {
        this.bgmAudio = null;
        this.currentBGM = null;
        this.ambienceAudio = null;
        this.currentAmbience = null;
        this.effectsAudio = new Map();
        
        // Weather sound effects
        this.weatherAudio = null;
        this.currentWeatherSound = null;
        
        // Crossfade settings
        this.DEFAULT_CROSSFADE_DURATION = 5000; // 5 seconds to match weather transitions
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
            
            // Capture old BGM before updating reference
            const oldBGM = this.bgmAudio;
            
            // Update current BGM reference immediately to prevent race conditions
            // This ensures subsequent calls know about this new BGM even before it starts playing
            this.bgmAudio = newBGM;
            
            // Start playing the new track
            const playPromise = newBGM.play();
            
            // Update current BGM filename immediately to prevent stacking
            this.currentBGM = safeFilename;
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Check if we've been superseded by another BGM request
                    if (this.currentBGM !== safeFilename) {
                        console.log(`[AudioManager] BGM '${safeFilename}' superseded by '${this.currentBGM}', skipping crossfade`);
                        // Cleanup the track we were supposed to replace (oldBGM)
                        // because the new request (which superseded us) will handle fading out OUR newBGM
                        // but nobody is handling oldBGM anymore if we abort.
                        if (oldBGM && !oldBGM.paused) {
                            oldBGM.pause();
                            oldBGM.currentTime = 0;
                        }
                        // We also need to ensure our newBGM (which is playing at volume 0) 
                        // is properly tracked or stopped? 
                        // Actually, the superseding request captured OUR newBGM as its oldBGM.
                        // So it will fade it out (from 0 to 0) and stop it.
                        return;
                    }

                    console.log(`[AudioManager] ✅ BGM '${safeFilename}' loaded successfully, starting crossfade`);
                    this.crossfadeBGM(oldBGM, newBGM, crossfadeDuration, safeFilename);
                }).catch(error => {
                    console.error(`[AudioManager] ❌ Failed to play BGM '${safeFilename}':`, error);
                    this.audioElements.delete(newBGM);
                    // Revert currentBGM if playback failed and we haven't switched to another one
                    if (this.currentBGM === safeFilename) {
                        this.currentBGM = null;
                        // If we reverted, we might want to restore oldBGM if it was still playing?
                        // But for now, just clearing is safer than playing wrong audio
                        if (this.bgmAudio === newBGM) {
                            this.bgmAudio = oldBGM;
                        }
                    }
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

        // Capture starting volume of old audio to prevent volume jumps
        const startVolumeOld = oldAudio ? oldAudio.volume : 0;
        const targetVolumeNew = this.calculateBGMVolume();

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            const progress = currentStep / steps;
            
            // Fade out old audio
            if (oldAudio && !oldAudio.paused) {
                // Fade from current volume down to 0
                oldAudio.volume = Math.max(0, startVolumeOld * (1 - progress));
            }
            
            // Fade in new audio
            if (newAudio && !newAudio.paused) {
                newAudio.volume = Math.min(targetVolumeNew, targetVolumeNew * progress);
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
                
                // Ensure new audio volume is set correctly
                // Note: this.bgmAudio is already updated in playBGM
                newAudio.volume = this.calculateBGMVolume();
                
                console.log(`[AudioManager] Crossfade complete, now playing: ${newFilename}`);
            }
        }, stepTime);
    }

    // Crossfade out current BGM (for stopping)
    crossfadeBGMOut(duration = this.DEFAULT_CROSSFADE_DURATION) {
        if (!this.bgmAudio || this.bgmAudio.paused) {
            this.currentBGM = null; // Ensure currentBGM is cleared if nothing is playing
            return;
        }

        // If we're already fading out, don't start another one
        // But DO clear currentBGM so new tracks can start
        this.currentBGM = null;

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
            this.crossfadeBGMOut(1000);
        } else {
            // Reset currentBGM to allow new BGM to start even if nothing was playing
            this.currentBGM = null;
            console.log('[AudioManager] BGM stopped and tracking cleared');
        }
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

    /**
     * Play weather sound effects (rain, wind)
     * @param {string} weatherType - Type of weather sound (e.g., 'rain-light', 'wind-medium')
     * @param {number} crossfadeDuration - Duration of crossfade in milliseconds
     */
    playWeatherSound(weatherType, crossfadeDuration = this.DEFAULT_CROSSFADE_DURATION) {
        // Handle null/empty (no weather sound should play)
        if (!weatherType || weatherType === 'none') {
            console.log('[AudioManager] No weather sound, stopping current weather audio');
            this.crossfadeWeatherOut(crossfadeDuration);
            return;
        }

        // Map weather types to audio files
        const weatherSoundMap = {
            'rain-light': 'rain-light.mp3',
            'rain-medium': 'rain-medium.mp3',
            'rain-heavy': 'rain-heavy.mp3',
            'snow-light': 'wind-light.mp3',  // Snow uses wind sounds
            'snow-medium': 'wind-medium.mp3',
            'snow-heavy': 'wind-heavy.mp3',
            'wind-light': 'wind-light.mp3',
            'wind-medium': 'wind-medium.mp3',
            'wind-heavy': 'wind-heavy.mp3'
        };

        const filename = weatherSoundMap[weatherType];
        if (!filename) {
            console.log(`[AudioManager] No sound mapped for weather type: ${weatherType}`);
            return;
        }

        // Check if already playing
        if (this.currentWeatherSound === filename && this.weatherAudio && !this.weatherAudio.paused) {
            console.log(`[AudioManager] Weather sound '${filename}' is already playing, ignoring request`);
            return;
        }

        const playAction = () => {
            console.log(`[AudioManager] 🌧️ Playing Weather Sound with crossfade: ${filename} (${crossfadeDuration}ms)`);
            
            // Create new audio element
            const newWeather = this.createAudioElement(`assets/audio/effect/${filename}`, 'Weather');
            if (!newWeather) {
                console.error(`[AudioManager] ❌ Failed to create weather audio element for: ${filename}`);
                return;
            }

            newWeather.loop = true;
            newWeather.volume = 0; // Start at 0 for crossfade in
            
            // Start playing the new track
            const playPromise = newWeather.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[AudioManager] ✅ Weather sound '${filename}' loaded successfully, starting crossfade`);
                    this.crossfadeWeather(this.weatherAudio, newWeather, crossfadeDuration, filename);
                }).catch(error => {
                    console.error(`[AudioManager] ❌ Failed to play weather sound '${filename}':`, error);
                    this.audioElements.delete(newWeather);
                });
            }
        };

        if (this.audioEnabled) {
            playAction();
        } else {
            console.log(`[AudioManager] Audio not enabled yet, queueing weather sound: ${filename}`);
            this.pendingActions.push(playAction);
        }
    }

    /**
     * Crossfade between weather tracks
     */
    crossfadeWeather(oldAudio, newAudio, duration, newFilename) {
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = this.calculateWeatherVolume() / steps;
        
        let currentStep = 0;
        const crossfadeId = `weather_${Date.now()}`;
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
                oldAudio.volume = Math.max(0, this.calculateWeatherVolume() * (1 - progress));
            }
            
            // Fade in new audio
            if (newAudio && !newAudio.paused) {
                newAudio.volume = Math.min(this.calculateWeatherVolume(), this.calculateWeatherVolume() * progress);
            }
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                // Stop and clean up old audio
                if (oldAudio && oldAudio !== newAudio) {
                    oldAudio.pause();
                    oldAudio.currentTime = 0;
                    this.audioElements.delete(oldAudio);
                }
                
                // Update current weather reference
                this.weatherAudio = newAudio;
                this.currentWeatherSound = newFilename;
                
                console.log(`[AudioManager] Weather crossfade complete: ${newFilename}`);
            }
        }, stepTime);
    }

    /**
     * Crossfade weather sound out
     */
    crossfadeWeatherOut(duration) {
        if (!this.weatherAudio || this.weatherAudio.paused) {
            this.currentWeatherSound = null;
            return;
        }

        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = this.calculateWeatherVolume() / steps;
        
        let currentStep = 0;
        const crossfadeId = `weather_out_${Date.now()}`;
        this.activeCrossfades.add(crossfadeId);

        const fadeInterval = setInterval(() => {
            if (!this.activeCrossfades.has(crossfadeId)) {
                clearInterval(fadeInterval);
                return;
            }

            currentStep++;
            
            if (this.weatherAudio && !this.weatherAudio.paused) {
                this.weatherAudio.volume = Math.max(0, this.weatherAudio.volume - volumeStep);
            }
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.activeCrossfades.delete(crossfadeId);
                
                if (this.weatherAudio) {
                    this.weatherAudio.pause();
                    this.weatherAudio.currentTime = 0;
                    this.audioElements.delete(this.weatherAudio);
                }
                this.currentWeatherSound = null;
                this.weatherAudio = null;
                
                console.log('[AudioManager] Weather sound crossfade out complete');
            }
        }, stepTime);
    }

    stopWeatherSound() {
        if (this.weatherAudio && !this.weatherAudio.paused) {
            console.log(`[AudioManager] Stopping Weather Sound: ${this.currentWeatherSound}`);
            this.weatherAudio.pause();
            this.weatherAudio.currentTime = 0;
            this.audioElements.delete(this.weatherAudio);
        }
        this.currentWeatherSound = null;
        this.weatherAudio = null;
    }

    pauseWeatherSound() {
        if (this.weatherAudio && !this.weatherAudio.paused) {
            console.log(`[AudioManager] Pausing Weather Sound: ${this.currentWeatherSound}`);
            this.weatherAudio.pause();
        }
    }

    resumeWeatherSound() {
        if (this.weatherAudio && this.weatherAudio.paused && this.currentWeatherSound) {
            console.log(`[AudioManager] Resuming Weather Sound: ${this.currentWeatherSound}`);
            const playPromise = this.weatherAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(`[AudioManager] Failed to resume weather sound '${this.currentWeatherSound}':`, error);
                });
            }
        }
    }

    /**
     * Pause all audio (BGM and Ambience)
     */
    pauseAll() {
        console.log('[AudioManager] ⏸️ Pausing all audio');
        this.pauseBGM();
        this.pauseAmbience();
        this.pauseWeatherSound();
    }

    /**
     * Resume all audio (BGM, Ambience, and Weather)
     */
    resumeAll() {
        console.log('[AudioManager] ▶️ Resuming all audio');
        this.resumeBGM();
        this.resumeAmbience();
        this.resumeWeatherSound();
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

    calculateWeatherVolume() {
        return this.settings.muted ? 0 : this.settings.masterVolume * this.settings.effectVolume * 0.7; // Weather at 70% of effect volume
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
        if (this.weatherAudio) {
            this.weatherAudio.volume = this.calculateWeatherVolume();
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
