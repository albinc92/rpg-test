/**
 * ObjectPalette - Browse and select objects to place
 */
class ObjectPalette {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'object-palette';
        this.container.style.cssText = `
            position: fixed;
            left: 10px;
            top: 80px;
            width: 250px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            border: 2px solid #444;
            border-radius: 8px;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Object Palette';
        title.style.marginTop = '0';
        this.container.appendChild(title);

        // Category tabs
        const categories = [
            { id: 'static', label: 'Static Objects', icon: '🌳' },
            { id: 'actors', label: 'Actors', icon: '🚶' },
            { id: 'interactive', label: 'Interactive', icon: '📦' }
        ];

        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
        `;

        categories.forEach((cat, i) => {
            const tab = document.createElement('button');
            tab.textContent = cat.icon;
            tab.title = cat.label;
            tab.style.cssText = `
                flex: 1;
                padding: 8px;
                background: ${i === 0 ? '#4a9eff' : '#333'};
                color: white;
                border: 1px solid #555;
                cursor: pointer;
                border-radius: 4px;
            `;
            tab.onclick = () => {
                // Update active tab
                tabContainer.querySelectorAll('button').forEach(b => b.style.background = '#333');
                tab.style.background = '#4a9eff';
                this.showCategory(cat.id);
            };
            tabContainer.appendChild(tab);
        });

        this.container.appendChild(tabContainer);

        // Object list container
        this.objectList = document.createElement('div');
        this.objectList.id = 'object-list';
        this.container.appendChild(this.objectList);

        // Show initial category
        this.showCategory('static');

        document.body.appendChild(this.container);
    }

    /**
     * Show objects for category
     */
    showCategory(categoryId) {
        this.objectList.innerHTML = '';

        let objects = [];

        if (categoryId === 'static') {
            objects = [
                { 
                    name: 'Tree', 
                    icon: '🌳',
                    data: { 
                        category: 'StaticObject', 
                        spriteSrc: 'assets/objects/trees/tree-01.png',
                        scale: 1.0,
                        collisionExpandTopPercent: -0.90,
                        collisionExpandRightPercent: -0.25,
                        collisionExpandLeftPercent: -0.25,
                        castsShadow: false
                    }
                },
                { 
                    name: 'Bush', 
                    icon: '🌿',
                    data: { 
                        category: 'StaticObject', 
                        spriteSrc: 'assets/objects/bushes/bush-01.png',
                        scale: 0.5,
                        collisionExpandTopPercent: -0.70,
                        collisionExpandRightPercent: -0.05,
                        collisionExpandLeftPercent: -0.05,
                        castsShadow: false
                    }
                },
                { 
                    name: 'Rock', 
                    icon: '🪨',
                    data: { 
                        category: 'StaticObject', 
                        spriteSrc: 'assets/objects/rocks/rock-01.png',
                        scale: 0.3,
                        castsShadow: false
                    }
                }
            ];
        } else if (categoryId === 'actors') {
            objects = [
                { 
                    name: 'NPC', 
                    icon: '🧙',
                    data: { 
                        category: 'Actor', 
                        actorType: 'npc',
                        spriteSrc: 'assets/npc/main-0.png',
                        name: 'NPC',
                        dialogue: 'Hello!',
                        scale: 0.15
                    }
                },
                { 
                    name: 'Spirit', 
                    icon: '👻',
                    data: { 
                        category: 'Actor', 
                        actorType: 'spirit',
                        spriteSrc: 'assets/npc/Spirits/Sylphie00.png',
                        name: 'Spirit',
                        scale: 0.2
                    }
                }
            ];
        } else if (categoryId === 'interactive') {
            objects = [
                { 
                    name: 'Chest', 
                    icon: '📦',
                    data: { 
                        category: 'InteractiveObject', 
                        objectType: 'chest',
                        spriteSrc: 'assets/npc/chest-0.png',
                        chestType: 'wooden',
                        gold: 0,
                        loot: [],
                        scale: 0.15
                    }
                },
                { 
                    name: 'Portal', 
                    icon: '🚪',
                    data: { 
                        category: 'InteractiveObject', 
                        objectType: 'portal',
                        spriteSrc: 'assets/npc/door-0.png',
                        portalType: 'door',
                        targetMap: '0-0',
                        spawnPoint: 'default'
                    }
                }
            ];
        }

        // Create object buttons
        objects.forEach(obj => {
            const btn = document.createElement('button');
            btn.textContent = obj.icon + ' ' + obj.name;
            btn.style.cssText = `
                width: 100%;
                padding: 10px;
                margin-bottom: 5px;
                background: #333;
                color: white;
                border: 1px solid #555;
                cursor: pointer;
                text-align: left;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            btn.onmouseover = () => btn.style.background = '#555';
            btn.onmouseout = () => btn.style.background = '#333';
            btn.onclick = () => {
                this.editor.selectedPrefab = obj.data;
                this.editor.setTool('place');
                console.log('[ObjectPalette] Selected:', obj.name);
            };
            this.objectList.appendChild(btn);
        });
    }

    /**
     * Show palette
     */
    show() {
        this.container.style.display = 'block';
    }

    /**
     * Hide palette
     */
    hide() {
        this.container.style.display = 'none';
    }
}

// Export
window.ObjectPalette = ObjectPalette;
