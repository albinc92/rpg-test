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
        this.createActionsMenu(toolbar);
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
     * Create Actions dropdown menu
     */
    createActionsMenu(toolbar) {
        const actionsMenu = new DropdownMenu('Actions', [
            {
                label: '👆 Select',
                shortcut: 'V',
                action: () => this.editor.setTool('select')
            },
            {
                label: '➕ Place',
                shortcut: 'B',
                action: () => this.editor.setTool('place')
            }
        ]);
        
        this.dropdowns.push(actionsMenu);
        toolbar.appendChild(actionsMenu.getElement());
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
        const viewMenu = new DropdownMenu('View', [
            {
                label: '📏 Toggle Grid',
                shortcut: 'G',
                action: () => {
                    this.editor.gridEnabled = !this.editor.gridEnabled;
                    console.log('[Editor] Grid:', this.editor.gridEnabled ? 'ON' : 'OFF');
                }
            },
            {
                label: '🎯 Toggle Snap',
                shortcut: 'Shift',
                action: () => {
                    this.editor.snapToGrid = !this.editor.snapToGrid;
                    console.log('[Editor] Snap:', this.editor.snapToGrid ? 'ON' : 'OFF');
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
        ]);
        
        this.dropdowns.push(viewMenu);
        toolbar.appendChild(viewMenu.getElement());
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
                    { label: '📝 Edit Items', disabled: true },
                    { label: '➕ New Item', disabled: true }
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
        this.showNotification(`🎨 Placing: ${name} - Click to place, V to cancel`);
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
        // Tool buttons are now in dropdown menus, so we just update the Actions dropdown
        // to show which tool is active
        const actionsDropdown = this.dropdowns[0]; // First dropdown is Actions
        if (actionsDropdown && this.editor.selectedTool === 'place' && this.editor.selectedPrefab) {
            // Update button to show placement mode
            actionsDropdown.button.style.background = '#27ae60';
        } else {
            // Reset to normal
            if (actionsDropdown && !actionsDropdown.isOpen) {
                actionsDropdown.button.style.background = '#333';
            }
        }
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
}

// Export
window.EditorUI = EditorUI;
