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
        
        // BULLETPROOF TRACKING - Track ALL audio elements created
        this.allAudioElements = new Set();
        this.debugMode = true;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        
        // Set up user gesture handler to enable audio
        this.setupAudioActivation();
        
        // Debug log to confirm AudioManager is working
        console.log('🎵 NEW BULLETPROOF AudioManager initialized');
        
        // Monitor ALL audio elements on the page
        this.monitorAllPageAudio();
        
        // Expose global debug functions
        window.audioDebug = {
            listAll: () => this.debugListAllAudio(),
            killAll: () => this.killAllAudio(),
            status: () => this.debugStatus()
        };
    }
    
    /**
     * Monitor ALL audio elements on the page to catch rogue audio
     */
    monitorAllPageAudio() {
        // Override Audio constructor to track all audio elements
        const originalAudio = window.Audio;
        const self = this;
        
        window.Audio = function(src) {
            const audio = new originalAudio(src);
            self.allAudioElements.add(audio);
            
            if (self.debugMode) {
                console.log('🎵 NEW AUDIO ELEMENT CREATED:', src || 'no src');
                console.trace('Audio creation stack trace:');
            }
            
            // Monitor when it starts playing
            audio.addEventListener('play', () => {
                if (self.debugMode) {
                    console.log('🎵 AUDIO STARTED PLAYING:', audio.src);
                }
            });
            
            // Monitor when it's paused/stopped
            audio.addEventListener('pause', () => {
                if (self.debugMode) {
                    console.log('🎵 AUDIO PAUSED:', audio.src);
                }
            });
            
            return audio;
        };
        
        // Copy static methods
        for (let prop in originalAudio) {
            window.Audio[prop] = originalAudio[prop];
        }
    }
    
    /**
     * Debug function to list all audio elements
     */
    debugListAllAudio() {
        console.log('🎵 ALL TRACKED AUDIO ELEMENTS:');
        let count = 0;
        this.allAudioElements.forEach(audio => {
            count++;
            console.log(`${count}. ${audio.src} - Playing: ${!audio.paused} - Volume: ${audio.volume} - Muted: ${audio.muted}`);
        });
        console.log(`Total: ${count} audio elements tracked`);
        
        // Also check for any rogue audio elements not tracked
        const allAudioInDOM = document.querySelectorAll('audio');
        console.log('🎵 AUDIO ELEMENTS IN DOM:', allAudioInDOM.length);
        allAudioInDOM.forEach((audio, i) => {
            console.log(`DOM ${i + 1}. ${audio.src} - Playing: ${!audio.paused} - Volume: ${audio.volume}`);
        });
    }
    
    /**
     * Kill ALL audio on the page
     */
    killAllAudio() {
        console.log('🎵 KILLING ALL AUDIO ELEMENTS');
        
        // Kill tracked audio
        this.allAudioElements.forEach(audio => {
            audio.pause();
            audio.volume = 0;
            audio.src = '';
            audio.currentTime = 0;
        });
        
        // Kill DOM audio
        const allAudioInDOM = document.querySelectorAll('audio');
        allAudioInDOM.forEach(audio => {
            audio.pause();
            audio.volume = 0;
            audio.src = '';
            audio.currentTime = 0;
        });
        
        // Clear our references
        this.currentBGM = null;
        this.currentAmbience = null;
        this.allAudioElements.clear();
        
        console.log('🎵 ALL AUDIO KILLED');
    }
    
    /**
     * Debug status
     */
    debugStatus() {
        console.log('🎵 AUDIOMANAGER STATUS:');
        console.log('Current BGM:', this.currentBGM?.src || 'none');
        console.log('Current Ambience:', this.currentAmbience?.src || 'none');
        console.log('Muted:', this.isMuted);
        console.log('Master Volume:', this.masterVolume);
        console.log('Music Volume:', this.musicVolume);
        console.log('Effects Volume:', this.effectsVolume);
        console.log('Tracked elements:', this.allAudioElements.size);
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
        
        console.log('🎵 LOADING AUDIO:', src, 'ID:', audioId);
        
        // Force fresh load by clearing cache and adding timestamp
        if (this.audioCache.has(audioId)) {
            this.audioCache.delete(audioId);
        }
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            // Audio is automatically tracked by our overridden constructor
            
            audio.addEventListener('canplaythrough', () => {
                console.log('🎵 AUDIO LOADED:', src);
                this.audioCache.set(audioId, audio);
                resolve(audio);
            }, { once: true });
            
            audio.addEventListener('error', (e) => {
                console.error('🎵 AUDIO LOAD ERROR:', src, e);
                reject(e);
            });
            
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
        console.log(`🎵 PLAY BGM CALLED: ${src}, muted: ${this.isMuted}, enabled: ${this.audioEnabled}`);
        console.trace('BGM call stack:');
        
        // ALWAYS stop any existing BGM first, regardless of mute state
        if (this.currentBGM) {
            console.log('🎵 STOPPING EXISTING BGM:', this.currentBGM.src);
            this.currentBGM.pause();
            this.currentBGM.volume = 0;
            this.currentBGM.src = '';
            this.currentBGM = null;
        }
        
        if (this.isMuted) {
            console.log('🎵 BGM is muted, not starting new BGM');
            return;
        }
        
        if (!this.audioEnabled) {
            // Queue BGM to play when enabled
            console.log('🎵 Audio not enabled, queuing BGM:', src);
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
            console.log('🎵 LOADING NEW BGM:', src);
            
            // Load new BGM
            const bgm = await this.loadAudio(src);
            const bgmClone = bgm.cloneNode();
            
            bgmClone.loop = true;
            bgmClone.volume = this.isMuted ? 0 : (volume * this.musicVolume * this.masterVolume);
            
            console.log('🎵 STARTING BGM PLAYBACK:', src);
            const playPromise = bgmClone.play();
            if (playPromise) {
                await playPromise;
            }
            
            this.currentBGM = bgmClone;
            console.log('🎵 BGM NOW PLAYING:', src);
            
        } catch (error) {
            console.error('🎵 FAILED TO PLAY BGM:', src, error);
        }
    }
    
    /**
     * Stop background music
     */
    stopBGM(fadeTime = 1000) {
        console.log('🎵 STOP BGM CALLED, fadeTime:', fadeTime);
        
        if (this.currentBGM) {
            console.log('🎵 STOPPING BGM:', this.currentBGM.src);
            
            if (fadeTime === 0) {
                // Stop immediately and aggressively
                this.currentBGM.pause();
                this.currentBGM.volume = 0;
                this.currentBGM.src = '';
                this.currentBGM.currentTime = 0;
                this.currentBGM = null;
                console.log('🎵 BGM STOPPED IMMEDIATELY');
            } else {
                // Fade out but don't clear currentBGM until fade is complete
                const bgmToStop = this.currentBGM;
                this.currentBGM = null; // Clear reference so new BGM can start
                this.fadeOut(bgmToStop, fadeTime);
                console.log('🎵 BGM FADE OUT STARTED');
            }
        } else {
            console.log('🎵 NO BGM TO STOP');
        }
        
        // NUCLEAR OPTION: Kill any rogue BGM that might be playing
        console.log('🎵 CHECKING FOR ROGUE AUDIO...');
        this.allAudioElements.forEach(audio => {
            if (!audio.paused && audio.src.includes('00.mp3')) {
                console.log('🎵 FOUND ROGUE MAIN MENU BGM, KILLING IT:', audio.src);
                audio.pause();
                audio.volume = 0;
                audio.src = '';
            }
        });
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
                audio.currentTime = 0; // Reset to beginning
                audio.src = ''; // Clear the source to fully stop it
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
        this.isMuted = muted;
        // Just update volumes - don't stop/start anything
        // BGM continues playing in background, just at volume 0 when muted
        this.updateAllVolumes();
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
        // Calculate effective volumes based on mute state
        const effectiveMasterVolume = this.isMuted ? 0 : this.masterVolume;
        
        if (this.currentBGM) {
            this.currentBGM.volume = this.musicVolume * effectiveMasterVolume;
        }
        if (this.currentAmbience) {
            this.currentAmbience.volume = this.ambienceVolume * effectiveMasterVolume;
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