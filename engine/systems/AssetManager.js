/**
 * Asset Manager
 * Handles loading and managing game assets (images, sounds, etc.)
 */
class AssetManager {
    constructor() {
        this.assets = new Map();
        this.loadingPromises = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
        
        // Asset types
        this.assetTypes = {
            IMAGE: 'image',
            AUDIO: 'audio',
            JSON: 'json',
            TEXT: 'text'
        };
    }

    // Loading methods
    async loadImage(name, url) {
        if (this.assets.has(name)) {
            return this.assets.get(name);
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.assets.set(name, {
                    type: this.assetTypes.IMAGE,
                    data: img,
                    loaded: true
                });
                this.loadedCount++;
                resolve(img);
            };
            
            img.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.src = url;
        });

        this.loadingPromises.set(name, promise);
        this.totalCount++;
        
        return promise;
    }

    async loadAudio(name, url) {
        if (this.assets.has(name)) {
            return this.assets.get(name).data;
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                this.assets.set(name, {
                    type: this.assetTypes.AUDIO,
                    data: audio,
                    loaded: true
                });
                this.loadedCount++;
                resolve(audio);
            };
            
            audio.onerror = () => {
                console.error(`Failed to load audio: ${url}`);
                reject(new Error(`Failed to load audio: ${url}`));
            };
            
            audio.src = url;
        });

        this.loadingPromises.set(name, promise);
        this.totalCount++;
        
        return promise;
    }

    async loadJSON(name, url) {
        if (this.assets.has(name)) {
            return this.assets.get(name).data;
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.assets.set(name, {
                    type: this.assetTypes.JSON,
                    data: data,
                    loaded: true
                });
                this.loadedCount++;
                return data;
            })
            .catch(error => {
                console.error(`Failed to load JSON: ${url}`, error);
                throw error;
            });

        this.loadingPromises.set(name, promise);
        this.totalCount++;
        
        return promise;
    }

    async loadText(name, url) {
        if (this.assets.has(name)) {
            return this.assets.get(name).data;
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                this.assets.set(name, {
                    type: this.assetTypes.TEXT,
                    data: text,
                    loaded: true
                });
                this.loadedCount++;
                return text;
            })
            .catch(error => {
                console.error(`Failed to load text: ${url}`, error);
                throw error;
            });

        this.loadingPromises.set(name, promise);
        this.totalCount++;
        
        return promise;
    }

    // Batch loading
    async loadAssets(assetList) {
        const promises = [];
        
        for (const asset of assetList) {
            const { name, url, type } = asset;
            
            switch (type) {
                case this.assetTypes.IMAGE:
                    promises.push(this.loadImage(name, url));
                    break;
                case this.assetTypes.AUDIO:
                    promises.push(this.loadAudio(name, url));
                    break;
                case this.assetTypes.JSON:
                    promises.push(this.loadJSON(name, url));
                    break;
                case this.assetTypes.TEXT:
                    promises.push(this.loadText(name, url));
                    break;
                default:
                    console.warn(`Unknown asset type: ${type}`);
            }
        }
        
        return Promise.all(promises);
    }

    // Asset retrieval
    getAsset(name) {
        const asset = this.assets.get(name);
        return asset ? asset.data : null;
    }

    getImage(name) {
        const asset = this.assets.get(name);
        return (asset && asset.type === this.assetTypes.IMAGE) ? asset.data : null;
    }

    getAudio(name) {
        const asset = this.assets.get(name);
        return (asset && asset.type === this.assetTypes.AUDIO) ? asset.data : null;
    }

    getJSON(name) {
        const asset = this.assets.get(name);
        return (asset && asset.type === this.assetTypes.JSON) ? asset.data : null;
    }

    getText(name) {
        const asset = this.assets.get(name);
        return (asset && asset.type === this.assetTypes.TEXT) ? asset.data : null;
    }

    // Asset checking
    hasAsset(name) {
        return this.assets.has(name);
    }

    isLoaded(name) {
        const asset = this.assets.get(name);
        return asset ? asset.loaded : false;
    }

    areAllLoaded() {
        return this.loadedCount === this.totalCount;
    }

    getLoadingProgress() {
        return this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
    }

    // Sprite creation utilities
    createSprite(imageName, x = 0, y = 0, width = null, height = null) {
        const image = this.getImage(imageName);
        if (!image) {
            console.warn(`Image not found: ${imageName}`);
            return null;
        }

        return {
            image: image,
            x: x,
            y: y,
            width: width || image.width,
            height: height || image.height,
            
            draw(ctx, worldX, worldY, scale = 1) {
                ctx.drawImage(
                    this.image,
                    this.x, this.y,
                    this.width, this.height,
                    worldX - (this.width * scale) / 2,
                    worldY - (this.height * scale) / 2,
                    this.width * scale,
                    this.height * scale
                );
            }
        };
    }

    // Spritesheet utilities
    createSpriteSheet(imageName, frameWidth, frameHeight, framesPerRow = 1) {
        const image = this.getImage(imageName);
        if (!image) {
            console.warn(`Image not found: ${imageName}`);
            return null;
        }

        const totalFrames = Math.floor(image.width / frameWidth) * Math.floor(image.height / frameHeight);
        
        return {
            image: image,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            framesPerRow: framesPerRow,
            totalFrames: totalFrames,
            
            getFrame(frameIndex) {
                const row = Math.floor(frameIndex / this.framesPerRow);
                const col = frameIndex % this.framesPerRow;
                
                return {
                    x: col * this.frameWidth,
                    y: row * this.frameHeight,
                    width: this.frameWidth,
                    height: this.frameHeight
                };
            },
            
            drawFrame(ctx, frameIndex, worldX, worldY, scale = 1) {
                const frame = this.getFrame(frameIndex);
                
                ctx.drawImage(
                    this.image,
                    frame.x, frame.y,
                    frame.width, frame.height,
                    worldX - (frame.width * scale) / 2,
                    worldY - (frame.height * scale) / 2,
                    frame.width * scale,
                    frame.height * scale
                );
            }
        };
    }

    // Audio utilities
    playSound(name, volume = 1.0, loop = false) {
        const audio = this.getAudio(name);
        if (!audio) {
            console.warn(`Audio not found: ${name}`);
            return null;
        }

        // Clone audio for multiple simultaneous plays
        const audioClone = audio.cloneNode();
        audioClone.volume = volume;
        audioClone.loop = loop;
        audioClone.play().catch(e => console.warn('Audio play failed:', e));
        
        return audioClone;
    }

    // Cleanup
    unloadAsset(name) {
        if (this.assets.has(name)) {
            this.assets.delete(name);
            this.totalCount--;
            this.loadedCount--;
        }
        
        if (this.loadingPromises.has(name)) {
            this.loadingPromises.delete(name);
        }
    }

    unloadAll() {
        this.assets.clear();
        this.loadingPromises.clear();
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    // Debug
    listAssets() {
        console.log('Loaded Assets:');
        for (const [name, asset] of this.assets) {
            console.log(`- ${name} (${asset.type}): ${asset.loaded ? 'Loaded' : 'Loading'}`);
        }
    }
}
