// GameScene: Single map, single background, single player, no map manager
class GameScene extends Scene {
    constructor() {
        super('MainGame');
        this.player = null;
        this.map = null;
        this.backgroundLoaded = false;
    }

    init() {
        super.init();
        this.loadBackgroundAndSetup();
    }

    loadBackgroundAndSetup() {
        const img = new Image();
        img.onload = () => {
            // DEBUG: Draw image directly to canvas to confirm it loads
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Create the map with the exact image size
            this.map = new GameMap('main', img.width, img.height);
            this.map.setBackgroundImage(img);
            this.map.updateSizeAndBoundariesFromBackground();
            this.addGameObject(this.map);

            // Create player at center
            this.player = new Player(0, 0);
            this.addGameObject(this.player);

            // Center camera on player
            if (this.engine && this.engine.camera) {
                this.engine.camera.setStaticFollow(true);
                this.engine.camera.setPosition(this.player.position);
                this.engine.camera.follow(this.player);
                this.engine.camera.removeBounds();
            }
            this.backgroundLoaded = true;
            console.log('Background loaded, map and player created.');
        };
        img.onerror = (e) => {
            alert('Failed to load map background image!');
        };
        img.src = 'assets/maps/0-0.png';
    }

    update(deltaTime) {
        if (!this.backgroundLoaded) return;
        super.update(deltaTime);
        if (this.engine && this.engine.physics) {
            this.engine.physics.update(this.gameObjects, deltaTime);
        }
    }

    render(renderer) {
        if (!this.backgroundLoaded) return;
        super.render(renderer);
    }
}
