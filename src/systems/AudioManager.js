/**
 * AudioManager - Centralized audio system for the game
 * Handles all sound effects, background music, and volume controls
 */
class AudioManager {
    constructor() {
        this.audioCache = new Map();
        this.currentBGM = null;
        this.masterVolume = 1.0;
        this.effectsVolume = 1.0;
        this.musicVolume = 1.0;
        this.isMuted = false;
        
        // Audio context for better control (optional)
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    /**
     * Load and cache audio file
     */
    async loadAudio(src, id = null) {
        const audioId = id || src;
        
        if (this.audioCache.has(audioId)) {
            return this.audioCache.get(audioId);
        }
        
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                this.audioCache.set(audioId, audio);
                resolve(audio);
            }, { once: true });
            
            audio.addEventListener('error', reject);
            audio.src = src;
        });
    }
    
    /**
     * Play a sound effect
     */
    async playEffect(soundId, volume = 1.0, loop = false) {
        if (this.isMuted) return null;
        
        try {
            let audio = this.audioCache.get(soundId);
            
            if (!audio) {
                // Try to load common sound effects
                const commonSounds = {
                    'coin': 'assets/audio/effect/coin.mp3',
                    'footstep': 'assets/audio/effect/footstep-01.mp3',
                    'menu-navigation': 'assets/audio/effect/menu-navigation.mp3',
                    'speech-bubble': 'assets/audio/effect/speech-bubble.mp3',
                    'chest-open': 'assets/audio/effect/chest-open.mp3',
                    'portal-travel': 'assets/audio/effect/portal-travel.mp3'
                };
                
                if (commonSounds[soundId]) {
                    audio = await this.loadAudio(commonSounds[soundId], soundId);
                } else {
                    console.warn(`Sound not found: ${soundId}`);
                    return null;
                }
            }
            
            // Clone audio for overlapping sounds
            const audioClone = audio.cloneNode();
            audioClone.volume = volume * this.effectsVolume * this.masterVolume;
            audioClone.loop = loop;
            
            const playPromise = audioClone.play();
            if (playPromise) {
                return playPromise.catch(e => console.warn('Audio play failed:', e));
            }
            
            return audioClone;
        } catch (error) {
            console.warn('Failed to play sound effect:', error);
            return null;
        }
    }
    
    /**
     * Play background music with crossfade
     */
    async playBGM(src, volume = 1.0, fadeTime = 1000) {
        if (this.isMuted) return;
        
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
            console.warn('Failed to play BGM:', error);
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
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBGM(0);
        }
        return this.isMuted;
    }
    
    /**
     * Update all volume levels
     */
    updateAllVolumes() {
        if (this.currentBGM) {
            this.currentBGM.volume = this.musicVolume * this.masterVolume;
        }
    }
    
    /**
     * Preload common audio files
     */
    async preloadCommonAudio() {
        const commonSounds = [
            { id: 'coin', src: 'assets/audio/effect/coin.mp3' },
            { id: 'footstep', src: 'assets/audio/effect/footstep-01.mp3' },
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
}

// Export for use in other files
window.AudioManager = AudioManager;