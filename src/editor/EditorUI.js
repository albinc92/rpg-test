/**
 * EditorUI - Main toolbar and UI for the editor with dropdown menus
 */
class EditorUI {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.dropdowns = [];
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'editor-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 20px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            border-bottom: 2px solid #4a9eff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        `;

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            display: flex;
            gap: 5px;
            align-items: center;
        `;

        // Title
        const title = document.createElement('span');
        title.textContent = '🎨 Map Editor';
        title.style.cssText = `
            font-weight: bold;
            font-size: 18px;
            margin-right: 15px;
            color: #4a9eff;
        `;
        toolbar.appendChild(title);

        // Create dropdown menus
        this.createEditMenu(toolbar);
        this.createViewMenu(toolbar);
        this.createDataMenu(toolbar);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.marginLeft = 'auto';
        toolbar.appendChild(spacer);

        // Close button (right side)
        const closeBtn = this.createButton('✖ Close', () => {
            this.editor.toggle();
        });
        closeBtn.style.background = '#c0392b';
        closeBtn.onmouseover = () => closeBtn.style.background = '#e74c3c';
        closeBtn.onmouseout = () => closeBtn.style.background = '#c0392b';
        toolbar.appendChild(closeBtn);

        this.container.appendChild(toolbar);
        document.body.appendChild(this.container);
    }

    /**
     * Create Edit dropdown menu
     */
    createEditMenu(toolbar) {
        const editMenu = new DropdownMenu('Edit', [
            {
                label: '↶ Undo',
                shortcut: 'Ctrl+Z',
                action: () => this.editor.undo()
            },
            {
                label: '↷ Redo',
                shortcut: 'Ctrl+Y',
                action: () => this.editor.redo()
            },
            { separator: true },
            {
                label: '📋 Copy',
                shortcut: 'Ctrl+C',
                action: () => {
                    if (this.editor.selectedObject) {
                        this.editor.copyObject(this.editor.selectedObject);
                    }
                }
            },
            {
                label: '📄 Paste',
                shortcut: 'Ctrl+V',
                action: () => this.editor.pasteObject()
            },
            { separator: true },
            {
                label: '💾 Save',
                shortcut: 'Ctrl+S',
                action: () => this.editor.save()
            }
        ]);
        
        this.dropdowns.push(editMenu);
        toolbar.appendChild(editMenu.getElement());
    }

    /**
     * Create View dropdown menu
     */
    createViewMenu(toolbar) {
        // Create menu items with checked state
        const viewMenuItems = [
            {
                label: '📏 Grid',
                shortcut: 'G',
                checked: this.editor.gridEnabled,
                action: () => {
                    this.editor.gridEnabled = !this.editor.gridEnabled;
                    console.log('[Editor] Grid:', this.editor.gridEnabled ? 'ON' : 'OFF');
                    this.updateViewMenu();
                }
            },
            {
                label: '🎯 Snap to Grid',
                shortcut: 'Shift',
                checked: this.editor.snapToGrid,
                action: () => {
                    this.editor.snapToGrid = !this.editor.snapToGrid;
                    console.log('[Editor] Snap:', this.editor.snapToGrid ? 'ON' : 'OFF');
                    this.updateViewMenu();
                }
            },
            {
                label: '📦 Collision Boxes',
                shortcut: 'C',
                checked: this.editor.showCollisionBoxes,
                action: () => {
                    this.editor.showCollisionBoxes = !this.editor.showCollisionBoxes;
                    console.log('[Editor] Collision Boxes:', this.editor.showCollisionBoxes ? 'ON' : 'OFF');
                    this.updateViewMenu();
                }
            },
            { separator: true },
            {
                label: '🔍 Zoom In',
                shortcut: '+',
                disabled: true
            },
            {
                label: '🔍 Zoom Out',
                shortcut: '-',
                disabled: true
            },
            {
                label: '🔍 Reset Zoom',
                shortcut: '0',
                disabled: true
            }
        ];
        
        const viewMenu = new DropdownMenu('View', viewMenuItems);
        this.viewMenu = viewMenu; // Store reference for updates
        
        this.dropdowns.push(viewMenu);
        toolbar.appendChild(viewMenu.getElement());
    }

    /**
     * Update View menu checkmarks
     */
    updateViewMenu() {
        if (!this.viewMenu) return;
        
        // Update checked states in menu items
        this.viewMenu.items[0].checked = this.editor.gridEnabled;
        this.viewMenu.items[1].checked = this.editor.snapToGrid;
        this.viewMenu.items[2].checked = this.editor.showCollisionBoxes;
        
        // Update visual checkmarks
        this.viewMenu.updateCheckmarks();
    }

    /**
     * Create Data dropdown menu with object placement integration
     */
    createDataMenu(toolbar) {
        const dataMenu = new DropdownMenu('Data', [
            {
                label: '🌲 Objects',
                items: [
                    { 
                        label: '🌳 Tree', 
                        action: () => this.selectObjectToPlace({
                            category: 'StaticObject', 
                            spriteSrc: 'assets/objects/trees/tree-01.png',
                            scale: 1.0,
                            collisionExpandTopPercent: -0.90,
                            collisionExpandRightPercent: -0.25,
                            collisionExpandLeftPercent: -0.25,
                            castsShadow: false
                        }, 'Tree')
                    },
                    { 
                        label: '🌿 Bush', 
                        action: () => this.selectObjectToPlace({
                            category: 'StaticObject', 
                            spriteSrc: 'assets/objects/bushes/bush-01.png',
                            scale: 0.5,
                            collisionExpandTopPercent: -0.70,
                            collisionExpandRightPercent: -0.05,
                            collisionExpandLeftPercent: -0.05,
                            castsShadow: false
                        }, 'Bush')
                    },
                    { 
                        label: '🪨 Rock', 
                        action: () => this.selectObjectToPlace({
                            category: 'StaticObject', 
                            spriteSrc: 'assets/objects/rocks/rock-01.png',
                            scale: 0.3,
                            castsShadow: false
                        }, 'Rock')
                    },
                    { separator: true },
                    { 
                        label: '🧙 NPC', 
                        action: () => this.selectObjectToPlace({
                            category: 'Actor', 
                            actorType: 'npc',
                            spriteSrc: 'assets/npc/main-0.png',
                            name: 'NPC',
                            dialogue: 'Hello!',
                            scale: 0.15
                        }, 'NPC')
                    },
                    { 
                        label: '👻 Spirit', 
                        action: () => this.selectObjectToPlace({
                            category: 'Actor', 
                            actorType: 'spirit',
                            spriteSrc: 'assets/npc/Spirits/Sylphie00.png',
                            name: 'Spirit',
                            scale: 0.2
                        }, 'Spirit')
                    },
                    { separator: true },
                    { 
                        label: '� Chest', 
                        action: () => this.selectObjectToPlace({
                            category: 'InteractiveObject', 
                            objectType: 'chest',
                            chestType: 'wooden',
                            gold: 0,
                            loot: []
                        }, 'Chest')
                    },
                    { 
                        label: '🚪 Portal', 
                        action: () => this.selectObjectToPlace({
                            category: 'InteractiveObject', 
                            objectType: 'portal',
                            spriteSrc: 'assets/npc/door-0.png',
                            portalType: 'door',
                            targetMap: '0-0',
                            spawnPoint: 'default'
                        }, 'Portal')
                    }
                ]
            },
            {
                label: '🎒 Items',
                items: [
                    { 
                        label: '📝 Item Browser', 
                        action: () => this.showItemBrowser() 
                    },
                    { 
                        label: '➕ New Item', 
                        action: () => this.showItemEditor(null) 
                    }
                ]
            },
            {
                label: '🗺️ Maps',
                items: [
                    { 
                        label: '⚙️ Current Map Config', 
                        action: () => this.showMapConfig() 
                    },
                    { label: '➕ New Map', disabled: true },
                    { separator: true },
                    { label: '📋 All Maps', disabled: true }
                ]
            }
        ]);
        
        this.dropdowns.push(dataMenu);
        toolbar.appendChild(dataMenu.getElement());
    }
    
    /**
     * Select an object type to place
     */
    selectObjectToPlace(objectData, name) {
        this.editor.selectedPrefab = objectData;
        this.editor.setTool('place');
        console.log(`[EditorUI] Selected ${name} for placement`);
        
        // Show notification
        this.showNotification(`🎨 Placing: ${name} - Click to place, Esc to cancel`);
    }
    
    /**
     * Show temporary notification
     */
    showNotification(message) {
        // Remove existing notification
        const existing = document.getElementById('editor-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'editor-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(74, 158, 255, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Create a button
     */
    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = '#555';
        btn.onmouseout = () => {
            const isActive = btn.dataset.tool && btn.dataset.tool === this.editor.selectedTool;
            btn.style.background = isActive ? '#4a9eff' : '#333';
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Update tool button states
     */
    updateToolButtons() {
        // No Actions dropdown anymore - selection happens directly through Data menu
        // This method kept for backward compatibility
    }

    /**
     * Show UI
     */
    show() {
        this.container.style.display = 'block';
    }

    /**
     * Hide UI
     */
    hide() {
        this.container.style.display = 'none';
    }

    /**
     * Show Map Configuration Modal
     */
    showMapConfig() {
        const currentMapId = this.editor.game.currentMapId;
        const mapData = this.editor.game.mapManager.maps[currentMapId];
        
        if (!mapData) {
            alert('No map data found!');
            return;
        }

        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #4a9eff;
            border-radius: 12px;
            padding: 24px;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = `🗺️ Map Configuration: ${mapData.name}`;
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Create form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

        // Map Name
        form.appendChild(this.createConfigField('Map Name', mapData.name, 'text', (value) => {
            mapData.name = value;
        }));

        // Map Scale
        form.appendChild(this.createConfigField('Map Scale', mapData.scale || 1, 'number', (value) => {
            mapData.scale = parseFloat(value);
        }, { step: 0.1, min: 0.1 }));

        // Background Image
        form.appendChild(this.createConfigField('Background Image', mapData.imageSrc, 'text', (value) => {
            mapData.imageSrc = value;
        }));

        // Background Music
        const musicOptions = ['none', 'assets/audio/bgm/00.mp3', 'assets/audio/bgm/01.mp3', 'assets/audio/bgm/02.mp3'];
        form.appendChild(this.createConfigSelect('Background Music', mapData.music || 'none', musicOptions, (value) => {
            mapData.music = value === 'none' ? null : value;
        }));

        // Ambience
        const ambienceOptions = ['none', 'assets/audio/ambience/forest-0.mp3'];
        form.appendChild(this.createConfigSelect('Ambience', mapData.ambience || 'none', ambienceOptions, (value) => {
            mapData.ambience = value === 'none' ? null : value;
        }));

        modal.appendChild(form);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save Changes';
        saveBtn.type = 'button';
        saveBtn.style.cssText = `
            padding: 10px 20px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        saveBtn.onclick = () => {
            this.showNotification('✅ Map configuration saved!');
            backdrop.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => backdrop.remove();

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        modal.appendChild(buttonContainer);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Create config form field
     */
    createConfigField(label, value, type, onChange, attrs = {}) {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'font-size: 13px; font-weight: bold; color: #aaa;';

        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        Object.assign(input, attrs);
        input.style.cssText = `
            padding: 8px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
        `;
        input.oninput = () => onChange(input.value);

        container.appendChild(labelEl);
        container.appendChild(input);
        return container;
    }

    /**
     * Create config select dropdown
     */
    createConfigSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'font-size: 13px; font-weight: bold; color: #aaa;';

        const select = document.createElement('select');
        select.style.cssText = `
            padding: 8px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt.replace('assets/audio/', '').replace(/\.(mp3|ogg)/, '');
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        return container;
    }

    /**
     * Show Item Browser Modal
     */
    showItemBrowser() {
        const items = this.editor.game.itemManager.items;
        
        if (!items || Object.keys(items).length === 0) {
            alert('No items found!');
            return;
        }

        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #4a9eff;
            border-radius: 12px;
            padding: 24px;
            width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = '🎒 Item Browser';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Filter/Search
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'margin-bottom: 16px;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search items...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 6px;
            font-size: 14px;
        `;
        searchContainer.appendChild(searchInput);
        modal.appendChild(searchContainer);

        // Item grid
        const itemGrid = document.createElement('div');
        itemGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        `;

        // Render items
        const renderItems = (filter = '') => {
            itemGrid.innerHTML = '';
            
            Object.values(items).forEach(item => {
                if (filter && !item.name.toLowerCase().includes(filter.toLowerCase()) && 
                    !item.type.toLowerCase().includes(filter.toLowerCase())) {
                    return;
                }

                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                `;
                itemCard.onmouseover = () => {
                    itemCard.style.borderColor = '#4a9eff';
                    itemCard.style.transform = 'translateY(-2px)';
                };
                itemCard.onmouseout = () => {
                    itemCard.style.borderColor = '#444';
                    itemCard.style.transform = 'translateY(0)';
                };
                itemCard.onclick = () => {
                    backdrop.remove();
                    this.showItemEditor(item.id);
                };

                // Icon
                const icon = document.createElement('img');
                icon.src = item.icon;
                icon.style.cssText = `
                    width: 48px;
                    height: 48px;
                    image-rendering: pixelated;
                    margin-bottom: 8px;
                `;
                itemCard.appendChild(icon);

                // Name
                const name = document.createElement('div');
                name.textContent = item.name;
                name.style.cssText = `
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: ${this.getRarityColor(item.rarity)};
                `;
                itemCard.appendChild(name);

                // Type
                const type = document.createElement('div');
                type.textContent = item.type;
                type.style.cssText = `
                    font-size: 10px;
                    color: #888;
                    text-transform: capitalize;
                `;
                itemCard.appendChild(type);

                itemGrid.appendChild(itemCard);
            });

            if (itemGrid.children.length === 0) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No items found';
                noResults.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #888;
                    padding: 20px;
                `;
                itemGrid.appendChild(noResults);
            }
        };

        searchInput.oninput = () => renderItems(searchInput.value);
        renderItems();

        modal.appendChild(itemGrid);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

        const newBtn = document.createElement('button');
        newBtn.textContent = '➕ New Item';
        newBtn.type = 'button';
        newBtn.style.cssText = `
            padding: 10px 20px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        newBtn.onclick = () => {
            backdrop.remove();
            this.showItemEditor(null);
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.type = 'button';
        closeBtn.style.cssText = `
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.onclick = () => backdrop.remove();

        buttonContainer.appendChild(newBtn);
        buttonContainer.appendChild(closeBtn);
        modal.appendChild(buttonContainer);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Show Item Editor Modal
     */
    showItemEditor(itemId) {
        const isNew = !itemId;
        const items = this.editor.game.itemManager.items;
        let itemData = isNew ? {
            id: '',
            name: 'New Item',
            description: '',
            icon: 'assets/icon/Items/Health_Potion-0.png',
            stackable: true,
            maxStack: 99,
            value: 10,
            type: 'consumable',
            rarity: 'common',
            stats: {},
            effects: {}
        } : { ...items[itemId] };

        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #4a9eff;
            border-radius: 12px;
            padding: 24px;
            width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = isNew ? '➕ Create New Item' : `📝 Edit Item: ${itemData.name}`;
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Two-column layout
        const columns = document.createElement('div');
        columns.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px;';

        // Left column - Basic info
        const leftCol = document.createElement('div');
        leftCol.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        if (isNew) {
            leftCol.appendChild(this.createConfigField('Item ID', itemData.id, 'text', (value) => {
                itemData.id = value;
            }));
        }

        leftCol.appendChild(this.createConfigField('Name', itemData.name, 'text', (value) => {
            itemData.name = value;
        }));

        leftCol.appendChild(this.createConfigField('Value', itemData.value, 'number', (value) => {
            itemData.value = parseInt(value);
        }, { min: 0 }));

        leftCol.appendChild(this.createConfigSelect('Type', itemData.type, 
            ['consumable', 'weapon', 'armor', 'material', 'key', 'treasure', 'currency'], 
            (value) => itemData.type = value));

        leftCol.appendChild(this.createConfigSelect('Rarity', itemData.rarity, 
            ['common', 'uncommon', 'rare', 'epic', 'legendary'], 
            (value) => itemData.rarity = value));

        const stackableContainer = document.createElement('div');
        stackableContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const stackableCheck = document.createElement('input');
        stackableCheck.type = 'checkbox';
        stackableCheck.checked = itemData.stackable;
        stackableCheck.onchange = () => itemData.stackable = stackableCheck.checked;
        const stackableLabel = document.createElement('label');
        stackableLabel.textContent = 'Stackable';
        stackableLabel.style.color = '#aaa';
        stackableContainer.appendChild(stackableCheck);
        stackableContainer.appendChild(stackableLabel);
        leftCol.appendChild(stackableContainer);

        if (itemData.stackable) {
            leftCol.appendChild(this.createConfigField('Max Stack', itemData.maxStack, 'number', (value) => {
                itemData.maxStack = parseInt(value);
            }, { min: 1 }));
        }

        columns.appendChild(leftCol);

        // Right column - Advanced
        const rightCol = document.createElement('div');
        rightCol.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Icon preview
        const iconPreview = document.createElement('div');
        iconPreview.style.cssText = 'text-align: center; margin-bottom: 8px;';
        const iconImg = document.createElement('img');
        iconImg.src = itemData.icon;
        iconImg.style.cssText = 'width: 64px; height: 64px; image-rendering: pixelated; border: 2px solid #4a9eff; border-radius: 4px;';
        iconPreview.appendChild(iconImg);
        rightCol.appendChild(iconPreview);

        rightCol.appendChild(this.createConfigField('Icon Path', itemData.icon, 'text', (value) => {
            itemData.icon = value;
            iconImg.src = value;
        }));

        const descTextarea = document.createElement('textarea');
        descTextarea.value = itemData.description;
        descTextarea.placeholder = 'Item description...';
        descTextarea.rows = 3;
        descTextarea.style.cssText = `
            padding: 8px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
            resize: vertical;
            font-family: Arial, sans-serif;
        `;
        descTextarea.oninput = () => itemData.description = descTextarea.value;
        const descLabel = document.createElement('label');
        descLabel.textContent = 'Description';
        descLabel.style.cssText = 'font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 4px;';
        const descContainer = document.createElement('div');
        descContainer.appendChild(descLabel);
        descContainer.appendChild(descTextarea);
        rightCol.appendChild(descContainer);

        columns.appendChild(rightCol);
        modal.appendChild(columns);

        // Stats section (collapsible)
        if (['weapon', 'armor'].includes(itemData.type)) {
            const statsSection = document.createElement('details');
            statsSection.style.cssText = 'margin-top: 16px; padding: 12px; background: #2a2a2a; border-radius: 6px;';
            const statsSummary = document.createElement('summary');
            statsSummary.textContent = '⚔️ Stats';
            statsSummary.style.cssText = 'cursor: pointer; font-weight: bold; color: #4a9eff;';
            statsSection.appendChild(statsSummary);

            const statsGrid = document.createElement('div');
            statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;';

            itemData.stats = itemData.stats || {};
            ['attack', 'defense', 'magic', 'speed'].forEach(stat => {
                statsGrid.appendChild(this.createConfigField(
                    stat.charAt(0).toUpperCase() + stat.slice(1), 
                    itemData.stats[stat] || 0, 
                    'number', 
                    (value) => itemData.stats[stat] = parseInt(value),
                    { min: 0 }
                ));
            });

            statsSection.appendChild(statsGrid);
            modal.appendChild(statsSection);
        }

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px; justify-content: space-between;';

        const leftButtons = document.createElement('div');
        leftButtons.style.cssText = 'display: flex; gap: 12px;';

        if (!isNew) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️ Delete';
            deleteBtn.type = 'button';
            deleteBtn.style.cssText = `
                padding: 10px 20px;
                background: #c0392b;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `;
            deleteBtn.onclick = () => {
                if (confirm(`Delete item "${itemData.name}"?`)) {
                    delete items[itemId];
                    this.showNotification(`🗑️ Item "${itemData.name}" deleted!`);
                    backdrop.remove();
                }
            };
            leftButtons.appendChild(deleteBtn);
        }

        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = 'display: flex; gap: 12px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = isNew ? '➕ Create' : '💾 Save';
        saveBtn.type = 'button';
        saveBtn.style.cssText = `
            padding: 10px 20px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        saveBtn.onclick = () => {
            if (isNew) {
                if (!itemData.id) {
                    alert('Please enter an Item ID!');
                    return;
                }
                if (items[itemData.id]) {
                    alert('Item ID already exists!');
                    return;
                }
            }
            
            items[itemData.id] = itemData;
            this.showNotification(isNew ? 
                `✅ Item "${itemData.name}" created!` : 
                `✅ Item "${itemData.name}" saved!`);
            backdrop.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => backdrop.remove();

        rightButtons.appendChild(cancelBtn);
        rightButtons.appendChild(saveBtn);

        buttonContainer.appendChild(leftButtons);
        buttonContainer.appendChild(rightButtons);
        modal.appendChild(buttonContainer);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Get rarity color
     */
    getRarityColor(rarity) {
        const colors = {
            common: '#ffffff',
            uncommon: '#1eff00',
            rare: '#0070dd',
            epic: '#a335ee',
            legendary: '#ff8000'
        };
        return colors[rarity] || '#ffffff';
    }
}

// Export
window.EditorUI = EditorUI;
