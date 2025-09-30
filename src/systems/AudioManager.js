/**
 * AudioManager - Centralized audio system for the game
 * Handles all sound effects, background music, and volume controls
 */
class AudioManager {
    constructor() {
        this.audioCache = new Map();
        this.currentBGM = null;
        this.currentAmbience = null;
        this.masterVolume = 1.0;
        this.effectsVolume = 1.0;
        this.musicVolume = 1.0;
        this.ambienceVolume = 0.6; // Ambient sounds are usually quieter
        this.isMuted = false;
        
        // Audio context for better control (optional)
        this.audioContext = null;
        this.audioEnabled = false;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        
        // Set up user gesture handler to enable audio
        this.setupAudioActivation();
        
        // Debug log to confirm AudioManager is working
        console.log('AudioManager initialized successfully');
    }
    
    /**
     * Setup audio activation on user gesture
     */
    setupAudioActivation() {
        this.pendingAudio = []; // Queue for audio that should play when enabled
        
        const enableAudio = () => {
            if (this.audioEnabled) return;
            
            console.log('AudioManager: User gesture detected, enabling audio');
            
            // Resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    this.audioEnabled = true;
                    console.log('AudioManager: Audio context resumed, processing pending audio');
                    this.processPendingAudio();
                }).catch(e => {
                    // Silently fail, user will just not get audio
                    console.log('AudioManager: Audio context resume failed, but enabling audio anyway');
                    this.audioEnabled = true;
                    this.processPendingAudio();
                });
            } else {
                this.audioEnabled = true;
                console.log('AudioManager: Audio enabled, processing pending audio');
                this.processPendingAudio();
            }
        };
        
        // Listen for ANY user interaction - be very aggressive
        document.addEventListener('keydown', enableAudio, { once: true });
        document.addEventListener('keyup', enableAudio, { once: true });
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('mousedown', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('touchend', enableAudio, { once: true });
        
        // Also try to enable on focus events
        window.addEventListener('focus', enableAudio, { once: true });
        
        // Force enable audio after a short delay (some browsers allow this)
        setTimeout(() => {
            if (!this.audioEnabled) {
                enableAudio();
            }
        }, 1000);
    }
    
    /**
     * Process queued audio that was waiting for user gesture
     */
    processPendingAudio() {
        if (!this.audioEnabled || this.pendingAudio.length === 0) return;
        
        this.pendingAudio.forEach(pendingItem => {
            if (pendingItem.type === 'effect') {
                this.playEffect(pendingItem.soundId, pendingItem.volume, pendingItem.loop);
            } else if (pendingItem.type === 'bgm') {
                this.playBGM(pendingItem.src, pendingItem.volume, pendingItem.fadeTime);
            } else if (pendingItem.type === 'ambience') {
                this.playAmbience(pendingItem.src, pendingItem.volume, pendingItem.fadeTime);
            }
        });
        
        this.pendingAudio = []; // Clear the queue
    }
    
    /**
     * Try to force enable audio (for important cases like menu music)
     */
    tryForceEnableAudio() {
        if (this.audioEnabled) return;
        
        // Try to create and play a silent audio to trigger permission
        try {
            const silentAudio = new Audio();
            silentAudio.volume = 0;
            silentAudio.muted = true;
            
            // Try to play silent audio - this might enable audio context
            const playPromise = silentAudio.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.audioEnabled = true;
                    this.processPendingAudio();
                }).catch(() => {
                    // Silent fail - user still needs to interact
                });
            }
        } catch (e) {
            // Silent fail - user still needs to interact
        }
    }
    
    /**
     * Load and cache audio file
     */
    async loadAudio(src, id = null) {
        const audioId = id || src;
        
        // Force fresh load by clearing cache and adding timestamp
        if (this.audioCache.has(audioId)) {
            this.audioCache.delete(audioId);
        }
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                this.audioCache.set(audioId, audio);
                resolve(audio);
            }, { once: true });
            
            audio.addEventListener('error', reject);
            // Add cache-busting timestamp
            const cacheBuster = Date.now();
            audio.src = `${src}?v=${cacheBuster}`;
        });
    }
    
    /**
     * Play a sound effect
     */
    async playEffect(soundId, volume = 1.0, loop = false) {
        console.log(`AudioManager: playEffect called - ${soundId}, muted: ${this.isMuted}, enabled: ${this.audioEnabled}`);
        
        if (this.isMuted) {
            console.log('AudioManager: Audio is muted, not playing');
            return null;
        }
        
        if (!this.audioEnabled) {
            // Queue the audio to play when enabled, but don't wait
            console.log('AudioManager: Audio not enabled, queuing sound:', soundId);
            this.pendingAudio.push({
                type: 'effect',
                soundId: soundId,
                volume: volume,
                loop: loop
            });
            return null;
        }
        
        try {
            let audio = this.audioCache.get(soundId);
            
            if (!audio) {
                // Try to load common sound effects
                const commonSounds = {
                    'coin': 'assets/audio/effect/coin.mp3',
                    'footstep': 'assets/audio/effect/footstep-0.mp3',
                    'menu-navigation': 'assets/audio/effect/menu-navigation.mp3',
                    'speech-bubble': 'assets/audio/effect/speech-bubble.mp3'
                };
                
                if (commonSounds[soundId]) {
                    audio = await this.loadAudio(commonSounds[soundId], soundId);
                } else {
                    // Sound not found, fail silently
                    return null;
                }
            }
            
            // Clone audio for overlapping sounds
            const audioClone = audio.cloneNode();
            audioClone.volume = volume * this.effectsVolume * this.masterVolume;
            audioClone.loop = loop;
            
            // Playing sound effect
            
            const playPromise = audioClone.play();
            if (playPromise) {
                return playPromise.catch(e => {
                    // Audio play failed silently
                });
            }
            
            return audioClone;
        } catch (error) {
            // Failed to play sound effect silently
            return null;
        }
    }
    
    /**
     * Play background music with crossfade
     */
    async playBGM(src, volume = 1.0, fadeTime = 1000) {
        console.log(`AudioManager: playBGM called - ${src}, muted: ${this.isMuted}, enabled: ${this.audioEnabled}`);
        
        if (this.isMuted) {
            console.log('AudioManager: BGM is muted, not playing');
            return;
        }
        
        if (!this.audioEnabled) {
            // Queue BGM to play when enabled
            console.log('AudioManager: Audio not enabled, queuing BGM:', src);
            this.pendingAudio.push({
                type: 'bgm',
                src: src,
                volume: volume,
                fadeTime: fadeTime
            });
            
            // Try to force enable audio for important BGM (like menu music)
            this.tryForceEnableAudio();
            return;
        }
        
        try {
            // Stop current BGM with fade
            if (this.currentBGM) {
                this.fadeOut(this.currentBGM, fadeTime);
            }
            
            // Load new BGM
            const bgm = await this.loadAudio(src);
            const bgmClone = bgm.cloneNode();
            
            bgmClone.loop = true;
            bgmClone.volume = 0;
            
            const playPromise = bgmClone.play();
            if (playPromise) {
                await playPromise;
            }
            
            this.currentBGM = bgmClone;
            this.fadeIn(bgmClone, volume * this.musicVolume * this.masterVolume, fadeTime);
            
        } catch (error) {
            // Failed to play BGM silently
        }
    }
    
    /**
     * Stop background music
     */
    stopBGM(fadeTime = 1000) {
        if (this.currentBGM) {
            this.fadeOut(this.currentBGM, fadeTime);
            this.currentBGM = null;
        }
    }
    
    /**
     * Play ambient sound with crossfade
     */
    async playAmbience(src, volume = 1.0, fadeTime = 2000) {
        if (this.isMuted) {
            return;
        }
        
        if (!this.audioEnabled) {
            // Queue ambience to play when enabled
            this.pendingAudio.push({
                type: 'ambience',
                src: src,
                volume: volume,
                fadeTime: fadeTime
            });
            return;
        }
        
        try {
            // Stop current ambience with fade
            if (this.currentAmbience) {
                this.fadeOut(this.currentAmbience, fadeTime);
            }
            
            // Load new ambience
            const ambience = await this.loadAudio(src);
            const ambienceClone = ambience.cloneNode();
            
            ambienceClone.loop = true;
            ambienceClone.volume = 0;
            
            const playPromise = ambienceClone.play();
            if (playPromise) {
                await playPromise;
            }
            
            this.currentAmbience = ambienceClone;
            this.fadeIn(ambienceClone, volume * this.ambienceVolume * this.masterVolume, fadeTime);
            
        } catch (error) {
            // Failed to play ambience silently
        }
    }
    
    /**
     * Stop ambient sound
     */
    stopAmbience(fadeTime = 2000) {
        if (this.currentAmbience) {
            this.fadeOut(this.currentAmbience, fadeTime);
            this.currentAmbience = null;
        }
    }
    
    /**
     * Fade in audio
     */
    fadeIn(audio, targetVolume, duration) {
        if (!audio) return;
        
        audio.volume = 0;
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(volumeStep * currentStep, targetVolume);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
        }, stepTime);
    }
    
    /**
     * Fade out audio
     */
    fadeOut(audio, duration) {
        if (!audio) return;
        
        const startVolume = audio.volume;
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = startVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(startVolume - (volumeStep * currentStep), 0);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audio.pause();
            }
        }, stepTime);
    }
    
    /**
     * Set volume levels
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    
    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentBGM) {
            this.currentBGM.volume = volume * this.masterVolume;
        }
    }
    
    /**
     * Set mute state and immediately apply it
     */
    setMuted(muted) {
        const wasUnmuting = this.isMuted && !muted;
        const wasMuting = !this.isMuted && muted;
        this.isMuted = muted;
        
        if (this.isMuted) {
            // Immediately stop all audio when muting
            console.log('AudioManager: Muting audio');
            if (this.currentBGM) {
                this.currentBGM.volume = 0;
                this.currentBGM.pause();
                console.log('AudioManager: BGM paused');
            }
            if (this.currentAmbience) {
                this.currentAmbience.volume = 0;
                this.currentAmbience.pause();
                console.log('AudioManager: Ambience paused');
            }
            // Clear pending audio queue when muting
            this.pendingAudio = [];
        } else {
            // When unmuting, restore volumes and try to resume paused audio
            console.log('AudioManager: Unmuting audio');
            this.updateAllVolumes();
            
            // Log unmuting for debugging
            if (wasUnmuting) {
                console.log('AudioManager: Audio was unmuted, volumes restored');
            }
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }
    
    /**
     * Update all volume levels
     */
    updateAllVolumes() {
        if (this.isMuted) {
            // When muted, ensure all audio is at volume 0 and paused
            if (this.currentBGM) {
                this.currentBGM.volume = 0;
                if (!this.currentBGM.paused) {
                    this.currentBGM.pause();
                }
            }
            if (this.currentAmbience) {
                this.currentAmbience.volume = 0;
                if (!this.currentAmbience.paused) {
                    this.currentAmbience.pause();
                }
            }
        } else {
            // When not muted, apply proper volume levels
            if (this.currentBGM) {
                this.currentBGM.volume = this.musicVolume * this.masterVolume;
                // If BGM was paused due to muting, resume it
                if (this.currentBGM.paused) {
                    this.currentBGM.play().catch(e => {
                        // Silent fail if can't resume
                    });
                }
            }
            if (this.currentAmbience) {
                this.currentAmbience.volume = this.ambienceVolume * this.masterVolume;
                // If ambience was paused due to muting, resume it
                if (this.currentAmbience.paused) {
                    this.currentAmbience.play().catch(e => {
                        // Silent fail if can't resume
                    });
                }
            }
        }
    }
    
    /**
     * Preload common audio files
     */
    async preloadCommonAudio() {
        const commonSounds = [
            { id: 'coin', src: 'assets/audio/effect/coin.mp3' },
            { id: 'footstep', src: 'assets/audio/effect/footstep-0.mp3' },
            { id: 'menu-navigation', src: 'assets/audio/effect/menu-navigation.mp3' },
            { id: 'speech-bubble', src: 'assets/audio/effect/speech-bubble.mp3' }
        ];
        
        const loadPromises = commonSounds.map(sound => 
            this.loadAudio(sound.src, sound.id).catch(e => 
                console.warn(`Failed to preload ${sound.id}:`, e)
            )
        );
        
        await Promise.allSettled(loadPromises);
        console.log('Common audio files preloaded');
    }
    
    /**
     * Clear all cached audio to force fresh loads
     */
    clearAudioCache() {
        // Stop any currently playing audio
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM = null;
        }
        if (this.currentAmbience) {
            this.currentAmbience.pause();
            this.currentAmbience = null;
        }
        
        // Clear the cache
        this.audioCache.clear();
        
        console.log('Audio cache cleared - forcing fresh audio loads');
    }
}

// Export for use in other files
window.AudioManager = AudioManager;