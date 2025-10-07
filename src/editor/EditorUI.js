/**
 * EditorUI - Main toolbar and UI for the editor with dropdown menus
 */
class EditorUI {
    constructor(editor) {
        this.editor = editor;
        this.game = editor.game; // Reference to game instance
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
        // Initialize global dropdown array for mutual exclusivity
        window.editorDropdowns = [];
        
        this.createEditMenu(toolbar);
        this.createViewMenu(toolbar);
        this.createToolsMenu(toolbar);
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
        window.editorDropdowns.push(editMenu);
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
            {
                label: '🎯 Spawn Zones',
                shortcut: 'Z',
                checked: this.editor.showSpawnZones,
                action: () => {
                    this.editor.showSpawnZones = !this.editor.showSpawnZones;
                    console.log('[Editor] Spawn Zones:', this.editor.showSpawnZones ? 'ON' : 'OFF');
                    this.updateViewMenu();
                }
            },
            {
                label: '📚 Layers',
                shortcut: 'L',
                action: () => {
                    if (this.editor.layerPanel) {
                        if (this.editor.layerPanel.isVisible()) {
                            this.editor.layerPanel.hide();
                            console.log('[Editor] Layers Panel: Hidden');
                        } else {
                            this.editor.layerPanel.show();
                            console.log('[Editor] Layers Panel: Shown');
                        }
                    }
                }
            },
            { separator: true },
            {
                label: '🔍 Zoom In',
                shortcut: '+',
                action: () => {
                    this.editor.zoomIn();
                    console.log('[Editor] Zoom In:', (this.editor.game.camera.zoom * 100).toFixed(0) + '%');
                }
            },
            {
                label: '🔍 Zoom Out',
                shortcut: '-',
                action: () => {
                    this.editor.zoomOut();
                    console.log('[Editor] Zoom Out:', (this.editor.game.camera.zoom * 100).toFixed(0) + '%');
                }
            },
            {
                label: '🔍 Reset Zoom',
                shortcut: '0',
                action: () => {
                    this.editor.resetZoom();
                    console.log('[Editor] Reset Zoom: 100%');
                }
            }
        ];
        
        const viewMenu = new DropdownMenu('View', viewMenuItems);
        this.viewMenu = viewMenu; // Store reference for updates
        
        this.dropdowns.push(viewMenu);
        window.editorDropdowns.push(viewMenu);
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
        this.viewMenu.items[3].checked = this.editor.showSpawnZones;
        
        // Update visual checkmarks
        this.viewMenu.updateCheckmarks();
    }

    /**
     * Create Tools dropdown menu
     */
    createToolsMenu(toolbar) {
        const toolsMenu = new DropdownMenu('Tools', [
            {
                label: '🖌️ Paint Tool',
                action: () => {
                    this.editor.setTool('paint');
                    this.showPaintToolPanel();
                }
            },
            {
                label: '🎨 Manage Textures',
                action: () => this.showTextureManager()
            },
            { separator: true },
            {
                label: '🔨 Select Tool',
                action: () => this.editor.setTool('select')
            }
        ]);
        
        this.dropdowns.push(toolsMenu);
        window.editorDropdowns.push(toolsMenu);
        toolbar.appendChild(toolsMenu.getElement());
    }

    /**
     * Create Data dropdown menu with object placement integration
     */
    createDataMenu(toolbar) {
        const dataMenu = new DropdownMenu('Data', [
            {
                label: '� Game Object',
                items: [
                    { 
                        label: '📚 Browse Templates', 
                        action: () => this.showStaticObjectBrowser(),
                        get disabled() {
                            const count = window.game?.staticObjectRegistry?.templates?.size || 0;
                            return count === 0;
                        }
                    },
                    { 
                        label: '➕ Create New', 
                        action: () => this.showStaticObjectCreator()
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
                label: '� Spirit Templates',
                items: [
                    { 
                        label: '📝 Browse Spirits', 
                        action: () => this.showSpiritBrowser(),
                        get disabled() {
                            const count = window.game?.spiritRegistry?.templates?.size || 0;
                            return count === 0;
                        }
                    },
                    { 
                        label: '➕ New Spirit', 
                        action: () => this.showSpiritEditor(null) 
                    }
                ]
            },
            {
                label: '�🗺️ Maps',
                items: [
                    { 
                        label: '⚙️ Current Map Config', 
                        action: () => this.showMapConfig() 
                    },
                    { 
                        label: '➕ New Map', 
                        action: () => this.showMapCreator() 
                    },
                    { separator: true },
                    { 
                        label: '📋 All Maps', 
                        action: () => this.showMapBrowser() 
                    }
                ]
            }
        ]);
        
        this.dropdowns.push(dataMenu);
        window.editorDropdowns.push(dataMenu);
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

        // Day/Night Cycle
        const dayNightCheckbox = document.createElement('div');
        dayNightCheckbox.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const dayNightInput = document.createElement('input');
        dayNightInput.type = 'checkbox';
        dayNightInput.id = 'dayNightCycle';
        dayNightInput.checked = mapData.dayNightCycle || false;
        dayNightInput.onchange = () => {
            mapData.dayNightCycle = dayNightInput.checked;
        };
        const dayNightLabel = document.createElement('label');
        dayNightLabel.htmlFor = 'dayNightCycle';
        dayNightLabel.textContent = '☀️ Enable Day/Night Cycle';
        dayNightLabel.style.cssText = 'cursor: pointer; font-size: 14px;';
        dayNightCheckbox.appendChild(dayNightInput);
        dayNightCheckbox.appendChild(dayNightLabel);
        form.appendChild(dayNightCheckbox);

        // Weather Section Header
        const weatherHeader = document.createElement('div');
        weatherHeader.textContent = '🌤️ Weather Configuration';
        weatherHeader.style.cssText = 'font-size: 16px; font-weight: bold; color: #4a9eff; margin-top: 20px; margin-bottom: 12px; border-top: 1px solid #444; padding-top: 12px;';
        form.appendChild(weatherHeader);

        // Initialize weather object if it doesn't exist
        if (!mapData.weather) {
            mapData.weather = {
                precipitation: 'none',
                wind: 'none',
                particles: 'none'
            };
        }

        // Precipitation
        const precipitationOptions = [
            'none',
            'dynamic',
            'sun',
            'rain-light',
            'rain-medium',
            'rain-heavy',
            'snow-light',
            'snow-medium',
            'snow-heavy'
        ];
        form.appendChild(this.createConfigSelect('Precipitation', mapData.weather.precipitation || 'none', precipitationOptions, (value) => {
            mapData.weather.precipitation = value;
        }));

        // Wind
        const windOptions = ['none', 'dynamic', 'light', 'medium', 'heavy'];
        form.appendChild(this.createConfigSelect('Wind', mapData.weather.wind || 'none', windOptions, (value) => {
            mapData.weather.wind = value;
        }));

        // Falling Particles
        const particleOptions = [
            'none',
            'leaf-green',
            'leaf-orange',
            'leaf-red',
            'leaf-brown',
            'sakura'
        ];
        form.appendChild(this.createConfigSelect('Falling Particles', mapData.weather.particles || 'none', particleOptions, (value) => {
            mapData.weather.particles = value;
        }));

        // Spawn Configuration Section
        const spawnHeader = document.createElement('div');
        spawnHeader.textContent = '🎯 Spirit Spawn Configuration';
        spawnHeader.style.cssText = 'font-size: 16px; font-weight: bold; color: #4a9eff; margin-top: 20px; margin-bottom: 12px; border-top: 1px solid #444; padding-top: 12px;';
        form.appendChild(spawnHeader);

        // Initialize spawn table if it doesn't exist
        if (!mapData.spawnTable) {
            mapData.spawnTable = [];
        }

        // Spawn table container
        const spawnTableContainer = document.createElement('div');
        spawnTableContainer.style.cssText = 'background: #252525; padding: 12px; border-radius: 8px; border: 1px solid #444;';

        // Display existing spawn entries
        const spawnEntriesDiv = document.createElement('div');
        spawnEntriesDiv.style.cssText = 'margin-bottom: 12px;';
        
        const renderSpawnEntries = () => {
            spawnEntriesDiv.innerHTML = '';
            
            if (mapData.spawnTable.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No spawn entries configured';
                emptyMsg.style.cssText = 'color: #888; font-style: italic; font-size: 13px; text-align: center; padding: 12px;';
                spawnEntriesDiv.appendChild(emptyMsg);
            } else {
                mapData.spawnTable.forEach((entry, index) => {
                    const entryDiv = document.createElement('div');
                    entryDiv.style.cssText = 'background: #1a1a1a; padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #333;';
                    
                    const spiritName = this.editor.game.spiritRegistry.getTemplate(entry.spiritId)?.name || entry.spiritId;
                    const timeLabel = entry.timeCondition === 'any' ? 'Any Time' : 
                                     entry.timeCondition === 'day' ? '☀️ Day' :
                                     entry.timeCondition === 'night' ? '🌙 Night' :
                                     entry.timeCondition === 'dawn' ? '🌅 Dawn' :
                                     entry.timeCondition === 'dusk' ? '🌆 Dusk' :
                                     entry.timeCondition === 'nightfall' ? '🌃 Nightfall' : entry.timeCondition;
                    
                    entryDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <div style="font-weight: bold; color: #4a9eff; font-size: 14px;">${spiritName}</div>
                                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">
                                    Max: ${entry.maxPopulation} | Rate: ${entry.spawnRate}/s | Time: ${timeLabel}
                                </div>
                            </div>
                            <button type="button" style="background: #d9534f; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px;">
                                🗑️ Remove
                            </button>
                        </div>
                    `;
                    
                    const removeBtn = entryDiv.querySelector('button');
                    removeBtn.onclick = () => {
                        mapData.spawnTable.splice(index, 1);
                        renderSpawnEntries();
                    };
                    
                    spawnEntriesDiv.appendChild(entryDiv);
                });
            }
        };
        
        renderSpawnEntries();
        spawnTableContainer.appendChild(spawnEntriesDiv);

        // Add new spawn entry form
        const addEntryHeader = document.createElement('div');
        addEntryHeader.textContent = 'Add New Spawn Entry';
        addEntryHeader.style.cssText = 'font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #ccc;';
        spawnTableContainer.appendChild(addEntryHeader);

        const addEntryForm = document.createElement('div');
        addEntryForm.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';

        // Spirit dropdown
        const spiritLabel = document.createElement('label');
        spiritLabel.textContent = 'Spirit Type:';
        spiritLabel.style.cssText = 'font-size: 12px; color: #ccc; font-weight: bold; grid-column: 1 / -1; margin-bottom: -4px;';
        addEntryForm.appendChild(spiritLabel);

        const spiritSelect = document.createElement('select');
        spiritSelect.style.cssText = 'padding: 8px; background: #1a1a1a; color: white; border: 1px solid #555; border-radius: 4px; font-size: 12px; grid-column: 1 / -1;';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Spirit --';
        spiritSelect.appendChild(defaultOption);
        
        if (this.editor.game.spiritRegistry && this.editor.game.spiritRegistry.loaded) {
            const allTemplates = this.editor.game.spiritRegistry.getAllTemplates();
            allTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                spiritSelect.appendChild(option);
            });
        }
        addEntryForm.appendChild(spiritSelect);

        // Max Population
        const maxPopLabel = document.createElement('label');
        maxPopLabel.textContent = 'Max Population:';
        maxPopLabel.style.cssText = 'font-size: 12px; color: #ccc; font-weight: bold; margin-top: 4px; margin-bottom: -4px;';
        addEntryForm.appendChild(maxPopLabel);

        const spawnRateLabel = document.createElement('label');
        spawnRateLabel.textContent = 'Spawn Rate (per second):';
        spawnRateLabel.style.cssText = 'font-size: 12px; color: #ccc; font-weight: bold; margin-top: 4px; margin-bottom: -4px;';
        addEntryForm.appendChild(spawnRateLabel);

        const maxPopInput = document.createElement('input');
        maxPopInput.type = 'number';
        maxPopInput.placeholder = '5';
        maxPopInput.value = '5';
        maxPopInput.min = '1';
        maxPopInput.style.cssText = 'padding: 8px; background: #1a1a1a; color: white; border: 1px solid #555; border-radius: 4px; font-size: 12px;';
        addEntryForm.appendChild(maxPopInput);

        // Spawn Rate
        const spawnRateInput = document.createElement('input');
        spawnRateInput.type = 'number';
        spawnRateInput.placeholder = '0.1';
        spawnRateInput.value = '0.1';
        spawnRateInput.step = '0.01';
        spawnRateInput.min = '0.01';
        spawnRateInput.style.cssText = 'padding: 8px; background: #1a1a1a; color: white; border: 1px solid #555; border-radius: 4px; font-size: 12px;';
        addEntryForm.appendChild(spawnRateInput);

        // Time Condition
        const timeLabel = document.createElement('label');
        timeLabel.textContent = 'Time Condition:';
        timeLabel.style.cssText = 'font-size: 12px; color: #ccc; font-weight: bold; grid-column: 1 / -1; margin-top: 4px; margin-bottom: -4px;';
        addEntryForm.appendChild(timeLabel);

        const timeSelect = document.createElement('select');
        timeSelect.style.cssText = 'padding: 8px; background: #1a1a1a; color: white; border: 1px solid #555; border-radius: 4px; font-size: 12px; grid-column: 1 / -1;';
        
        const timeOptions = [
            { value: 'any', label: 'Any Time' },
            { value: 'day', label: '☀️ Day (7:00 - 17:00)' },
            { value: 'night', label: '🌙 Night (0:00 - 5:00)' },
            { value: 'dawn', label: '🌅 Dawn (5:00 - 7:00)' },
            { value: 'dusk', label: '🌆 Dusk (17:00 - 19:00)' },
            { value: 'nightfall', label: '🌃 Nightfall (19:00 - 24:00)' }
        ];
        
        timeOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            timeSelect.appendChild(option);
        });
        addEntryForm.appendChild(timeSelect);

        // Add button
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = '➕ Add Spawn Entry';
        addBtn.style.cssText = 'padding: 10px; background: #5cb85c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; grid-column: 1 / -1; margin-top: 4px;';
        addBtn.onclick = () => {
            const spiritId = spiritSelect.value;
            const maxPopulation = parseInt(maxPopInput.value);
            const spawnRate = parseFloat(spawnRateInput.value);
            const timeCondition = timeSelect.value;
            
            if (!spiritId) {
                this.showNotification('⚠️ Please select a spirit', 'warning');
                return;
            }
            
            if (maxPopulation < 1) {
                this.showNotification('⚠️ Max population must be at least 1', 'warning');
                return;
            }
            
            if (spawnRate <= 0) {
                this.showNotification('⚠️ Spawn rate must be greater than 0', 'warning');
                return;
            }
            
            mapData.spawnTable.push({
                spiritId: spiritId,
                maxPopulation: maxPopulation,
                spawnRate: spawnRate,
                timeCondition: timeCondition
            });
            
            renderSpawnEntries();
            spiritSelect.value = '';
            maxPopInput.value = '5';
            spawnRateInput.value = '0.1';
            timeSelect.value = 'any';
            
            this.showNotification('✅ Spawn entry added!');
        };
        addEntryForm.appendChild(addBtn);

        spawnTableContainer.appendChild(addEntryForm);
        form.appendChild(spawnTableContainer);

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
            // Reinitialize weather system with new settings
            if (this.editor.game.weatherSystem) {
                this.editor.game.weatherSystem.setWeather(mapData.weather || null);
            }
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
     * Show map browser (all maps)
     */
    showMapBrowser() {
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
        title.textContent = '📋 All Maps';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Map list container
        const mapList = document.createElement('div');
        mapList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        const maps = this.editor.game.mapManager.maps;
        const currentMapId = this.editor.game.currentMapId;

        Object.entries(maps).forEach(([mapId, mapData]) => {
            const mapCard = document.createElement('div');
            mapCard.style.cssText = `
                background: ${mapId === currentMapId ? '#2a3a4a' : '#252525'};
                border: 2px solid ${mapId === currentMapId ? '#4a9eff' : '#444'};
                border-radius: 8px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            // Map info
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1;';
            
            const mapName = document.createElement('div');
            mapName.textContent = `${mapData.name}${mapId === currentMapId ? ' (Current)' : ''}`;
            mapName.style.cssText = 'font-weight: bold; font-size: 16px; margin-bottom: 4px;';
            
            const mapDetails = document.createElement('div');
            mapDetails.style.cssText = 'font-size: 12px; color: #aaa;';
            mapDetails.innerHTML = `
                ID: <code style="color: #4a9eff">${mapId}</code> | 
                Scale: ${mapData.scale || 1} | 
                Music: ${mapData.music ? '🎵' : '🔇'} | 
                Ambience: ${mapData.ambience ? '🌊' : '-'}
            `;

            info.appendChild(mapName);
            info.appendChild(mapDetails);

            // Action buttons
            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; gap: 8px;';

            // Go To button
            const goToBtn = document.createElement('button');
            goToBtn.textContent = mapId === currentMapId ? '✓ Here' : '🚀 Go';
            goToBtn.disabled = mapId === currentMapId;
            goToBtn.style.cssText = `
                padding: 6px 12px;
                background: ${mapId === currentMapId ? '#555' : '#4a9eff'};
                color: white;
                border: none;
                border-radius: 4px;
                cursor: ${mapId === currentMapId ? 'default' : 'pointer'};
                font-size: 12px;
                font-weight: bold;
            `;
            goToBtn.onclick = () => {
                this.editor.game.loadMap(mapId);
                backdrop.remove();
                this.showNotification(`🗺️ Teleported to ${mapData.name}`);
            };

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = '⚙️';
            editBtn.style.cssText = `
                padding: 6px 12px;
                background: #666;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            editBtn.onclick = () => {
                backdrop.remove();
                // Load the map first if not current
                if (mapId !== currentMapId) {
                    this.editor.game.loadMap(mapId);
                }
                this.showMapConfig();
            };

            actions.appendChild(goToBtn);
            actions.appendChild(editBtn);

            mapCard.appendChild(info);
            mapCard.appendChild(actions);
            mapList.appendChild(mapCard);
        });

        modal.appendChild(mapList);

        // Export button
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '💾 Export maps.json';
        exportBtn.style.cssText = `
            margin-top: 16px;
            padding: 10px 20px;
            background: #2a8a2a;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
        `;
        exportBtn.onclick = () => {
            this.exportMapsJSON();
        };
        modal.appendChild(exportBtn);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            margin-top: 12px;
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
        `;
        closeBtn.onclick = () => backdrop.remove();
        modal.appendChild(closeBtn);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Show map creator
     */
    showMapCreator() {
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
        title.textContent = '➕ Create New Map';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Form data
        const formData = {
            mapId: '',
            name: '',
            imageSrc: 'assets/maps/',
            scale: 3.0,
            music: null,
            ambience: null,
            dayNightCycle: false,
            weather: {
                precipitation: 'none',
                wind: 'none',
                particles: 'none'
            }
        };

        // Create form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

        // Map ID
        form.appendChild(this.createConfigField('Map ID', '', 'text', (value) => {
            formData.mapId = value;
        }, { placeholder: 'e.g. 0-3, cave-1, town-center', required: true }));

        // Map Name
        form.appendChild(this.createConfigField('Map Name', '', 'text', (value) => {
            formData.name = value;
        }, { placeholder: 'e.g. Dark Forest, Town Square', required: true }));

        // Background Image
        form.appendChild(this.createConfigField('Background Image Path', 'assets/maps/', 'text', (value) => {
            formData.imageSrc = value;
        }, { placeholder: 'assets/maps/map-name.png', required: true }));

        // Map Scale
        form.appendChild(this.createConfigField('Map Scale', '3.0', 'number', (value) => {
            formData.scale = parseFloat(value);
        }, { step: 0.1, min: 0.1 }));

        // Background Music
        const musicOptions = ['none', 'assets/audio/bgm/00.mp3', 'assets/audio/bgm/01.mp3', 'assets/audio/bgm/02.mp3'];
        form.appendChild(this.createConfigSelect('Background Music', 'none', musicOptions, (value) => {
            formData.music = value === 'none' ? null : value;
        }));

        // Ambience
        const ambienceOptions = ['none', 'assets/audio/ambience/forest-0.mp3'];
        form.appendChild(this.createConfigSelect('Ambience', 'none', ambienceOptions, (value) => {
            formData.ambience = value === 'none' ? null : value;
        }));

        // Day/Night Cycle checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'dayNightCycle';
        checkbox.checked = false;
        checkbox.onchange = () => {
            formData.dayNightCycle = checkbox.checked;
        };
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = 'dayNightCycle';
        checkboxLabel.textContent = '☀️ Enable Day/Night Cycle';
        checkboxLabel.style.cssText = 'cursor: pointer; font-size: 14px;';
        
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(checkboxLabel);
        form.appendChild(checkboxContainer);

        // Weather Section Header
        const weatherHeader = document.createElement('div');
        weatherHeader.textContent = '🌤️ Weather Configuration';
        weatherHeader.style.cssText = 'font-size: 16px; font-weight: bold; color: #4a9eff; margin-top: 20px; margin-bottom: 12px; border-top: 1px solid #444; padding-top: 12px;';
        form.appendChild(weatherHeader);

        // Precipitation
        const precipitationOptions = [
            'none',
            'dynamic',
            'sun',
            'rain-light',
            'rain-medium',
            'rain-heavy',
            'snow-light',
            'snow-medium',
            'snow-heavy'
        ];
        form.appendChild(this.createConfigSelect('Precipitation', 'none', precipitationOptions, (value) => {
            formData.weather.precipitation = value;
        }));

        // Wind
        const windOptions = ['none', 'dynamic', 'light', 'medium', 'heavy'];
        form.appendChild(this.createConfigSelect('Wind', 'none', windOptions, (value) => {
            formData.weather.wind = value;
        }));

        // Falling Particles
        const particleOptions = [
            'none',
            'leaf-green',
            'leaf-orange',
            'leaf-red',
            'leaf-brown',
            'sakura'
        ];
        form.appendChild(this.createConfigSelect('Falling Particles', 'none', particleOptions, (value) => {
            formData.weather.particles = value;
        }));

        modal.appendChild(form);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;';

        const createBtn = document.createElement('button');
        createBtn.textContent = '✨ Create Map';
        createBtn.type = 'button';
        createBtn.style.cssText = `
            padding: 10px 20px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        createBtn.onclick = () => {
            // Validate
            if (!formData.mapId || !formData.name || !formData.imageSrc) {
                alert('Please fill in all required fields!');
                return;
            }

            // Check if map ID already exists
            if (this.editor.game.mapManager.maps[formData.mapId]) {
                alert(`Map ID "${formData.mapId}" already exists!`);
                return;
            }

            // Create the new map
            this.editor.game.mapManager.maps[formData.mapId] = {
                name: formData.name,
                imageSrc: formData.imageSrc,
                scale: formData.scale,
                music: formData.music,
                ambience: formData.ambience,
                dayNightCycle: formData.dayNightCycle,
                weather: formData.weather
            };

            this.showNotification(`✅ Map "${formData.name}" created!`);
            backdrop.remove();
            
            // Ask if they want to go to the new map
            setTimeout(() => {
                if (confirm(`Go to the new map "${formData.name}" now?`)) {
                    this.editor.game.loadMap(formData.mapId);
                }
            }, 100);
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
        buttonContainer.appendChild(createBtn);
        modal.appendChild(buttonContainer);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Export maps.json
     */
    exportMapsJSON() {
        const mapsData = JSON.stringify(this.editor.game.mapManager.maps, null, 2);
        const blob = new Blob([mapsData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maps.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('💾 maps.json exported!');
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
        buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: space-between;';

        const leftButtons = document.createElement('div');
        leftButtons.style.cssText = 'display: flex; gap: 12px;';

        const exportBtn = document.createElement('button');
        exportBtn.textContent = '💾 Export JSON';
        exportBtn.type = 'button';
        exportBtn.style.cssText = `
            padding: 10px 20px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        exportBtn.onclick = () => {
            const json = JSON.stringify(items, null, 2);
            console.log('[ItemBrowser] Items JSON:', json);
            
            // Copy to clipboard
            navigator.clipboard.writeText(json).then(() => {
                this.showNotification('✅ Items JSON copied to clipboard!');
            }).catch(err => {
                alert('Items JSON:\n\n' + json);
            });
        };

        leftButtons.appendChild(exportBtn);

        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = 'display: flex; gap: 12px;';

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

        rightButtons.appendChild(newBtn);
        rightButtons.appendChild(closeBtn);
        
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
     * Show Item Editor Modal
     */
    showItemEditor(itemId) {
        const isNew = !itemId;
        
        // Ensure itemManager and items exist
        if (!this.editor.game.itemManager) {
            alert('Error: Item Manager not found!');
            console.error('[ItemEditor] itemManager is undefined');
            return;
        }
        
        if (!this.editor.game.itemManager.items) {
            console.log('[ItemEditor] Creating empty items object');
            this.editor.game.itemManager.items = {};
        }
        
        const items = this.editor.game.itemManager.items;
        console.log('[ItemEditor] Items object:', items);
        
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

        // Icon selector with preview and button
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = 'margin-bottom: 16px;';

        const iconLabel = document.createElement('label');
        iconLabel.textContent = 'Icon';
        iconLabel.style.cssText = 'display: block; font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 8px;';
        iconContainer.appendChild(iconLabel);

        const iconPreviewContainer = document.createElement('div');
        iconPreviewContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';

        const iconImg = document.createElement('img');
        iconImg.src = itemData.icon;
        iconImg.style.cssText = 'width: 64px; height: 64px; image-rendering: pixelated; background: #1a1a1a; border: 2px solid #555; border-radius: 4px;';
        iconPreviewContainer.appendChild(iconImg);

        const selectIconBtn = document.createElement('button');
        selectIconBtn.textContent = '📁 Choose Icon...';
        selectIconBtn.type = 'button';
        selectIconBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        selectIconBtn.onclick = () => {
            this.openItemIconPicker((selectedPath) => {
                itemData.icon = selectedPath;
                iconImg.src = selectedPath;
                iconPathInput.value = selectedPath;
            });
        };
        selectIconBtn.onmouseover = () => selectIconBtn.style.background = '#5aafff';
        selectIconBtn.onmouseout = () => selectIconBtn.style.background = '#4a9eff';
        iconPreviewContainer.appendChild(selectIconBtn);

        iconContainer.appendChild(iconPreviewContainer);

        // Icon path display (read-only)
        const iconPathInput = document.createElement('input');
        iconPathInput.type = 'text';
        iconPathInput.value = itemData.icon;
        iconPathInput.readOnly = true;
        iconPathInput.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: #888;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 11px;
        `;
        iconContainer.appendChild(iconPathInput);

        rightCol.appendChild(iconContainer);

        // Description field with proper layout
        const descContainer = document.createElement('div');
        descContainer.style.cssText = 'margin-bottom: 16px;';

        const descLabel = document.createElement('label');
        descLabel.textContent = 'Description';
        descLabel.style.cssText = 'display: block; font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 8px;';
        descContainer.appendChild(descLabel);

        const descTextarea = document.createElement('textarea');
        descTextarea.value = itemData.description;
        descTextarea.placeholder = 'Item description...';
        descTextarea.rows = 3;
        descTextarea.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
            resize: vertical;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        `;
        descTextarea.oninput = () => itemData.description = descTextarea.value;
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
            console.log('[ItemEditor] Saving item:', itemData);
            console.log('[ItemEditor] Is new:', isNew);
            console.log('[ItemEditor] Item ID:', itemData.id);
            console.log('[ItemEditor] Item ID type:', typeof itemData.id);
            console.log('[ItemEditor] Item ID trimmed:', itemData.id.trim());
            
            if (isNew) {
                // Trim the ID and check
                const trimmedId = (itemData.id || '').trim();
                if (!trimmedId) {
                    alert('Please enter an Item ID!');
                    return;
                }
                itemData.id = trimmedId; // Use trimmed version
                
                if (items[itemData.id]) {
                    alert('Item ID already exists!');
                    return;
                }
            }
            
            items[itemData.id] = itemData;
            console.log('[ItemEditor] Item saved successfully!');
            console.log('[ItemEditor] All items:', items);
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
     * Show spirit browser
     */
    showSpiritBrowser() {
        const spirits = this.editor.game.spiritRegistry;
        
        if (!spirits || !spirits.loaded || spirits.templates.size === 0) {
            alert('No spirit templates found! Spirit registry not loaded.');
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
            width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = '👻 Spirit Template Browser';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Filter/Search
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'margin-bottom: 16px;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search spirits...';
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

        // Spirit grid
        const spiritGrid = document.createElement('div');
        spiritGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        `;

        // Render spirits
        const renderSpirits = (filter = '') => {
            spiritGrid.innerHTML = '';
            
            const allTemplates = spirits.getAllTemplates();
            allTemplates.forEach(spirit => {
                if (filter && !spirit.name.toLowerCase().includes(filter.toLowerCase())) {
                    return;
                }

                const spiritCard = document.createElement('div');
                spiritCard.style.cssText = `
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                `;
                spiritCard.onmouseover = () => {
                    spiritCard.style.borderColor = '#4a9eff';
                    spiritCard.style.transform = 'translateY(-2px)';
                };
                spiritCard.onmouseout = () => {
                    spiritCard.style.borderColor = '#444';
                    spiritCard.style.transform = 'translateY(0)';
                };
                spiritCard.onclick = () => {
                    backdrop.remove();
                    this.showSpiritEditor(spirit.id);
                };

                // Sprite preview
                const sprite = document.createElement('img');
                sprite.src = spirit.spriteSrc;
                sprite.style.cssText = `
                    width: 64px;
                    height: 64px;
                    image-rendering: pixelated;
                    margin-bottom: 8px;
                    opacity: 0.8;
                `;
                spiritCard.appendChild(sprite);

                // Name
                const name = document.createElement('div');
                name.textContent = spirit.name;
                name.style.cssText = `
                    font-size: 13px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #4a9eff;
                `;
                spiritCard.appendChild(name);

                // Stats summary
                const stats = document.createElement('div');
                stats.style.cssText = `
                    font-size: 10px;
                    color: #aaa;
                    line-height: 1.4;
                `;
                stats.innerHTML = `
                    HP: ${spirit.stats.hp} | ATK: ${spirit.stats.attack}<br>
                    DEF: ${spirit.stats.defense} | SPD: ${spirit.stats.speed}
                `;
                spiritCard.appendChild(stats);

                spiritGrid.appendChild(spiritCard);
            });

            if (spiritGrid.children.length === 0) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No spirits found';
                noResults.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #888;
                    padding: 20px;
                `;
                spiritGrid.appendChild(noResults);
            }
        };

        renderSpirits();
        searchInput.oninput = () => renderSpirits(searchInput.value);

        modal.appendChild(spiritGrid);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

        const newBtn = document.createElement('button');
        newBtn.textContent = '➕ New Spirit';
        newBtn.style.cssText = `
            padding: 10px 20px;
            background: #5cb85c;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        newBtn.onclick = () => {
            backdrop.remove();
            this.showSpiritEditor(null);
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
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
     * Show spirit editor
     */
    showSpiritEditor(spiritId) {
        const isNew = !spiritId;
        let spiritData;

        if (isNew) {
            // Create new spirit template
            spiritData = {
                id: '',
                name: 'New Spirit',
                spriteSrc: 'assets/npc/Spirits/Sylphie00.png',
                spriteWidth: 32,
                spriteHeight: 32,
                collisionShape: 'circle',
                collisionPercent: {
                    top: -0.7,
                    left: -0.1,
                    right: -0.1,
                    bottom: 0
                },
                stats: {
                    hp: 50,
                    attack: 10,
                    defense: 10,
                    speed: 15
                },
                moveSpeed: 1.5,
                movePattern: 'wander',
                description: ''
            };
        } else {
            // Load existing spirit
            const template = this.editor.game.spiritRegistry.getTemplate(spiritId);
            if (!template) {
                alert('Spirit not found!');
                return;
            }
            spiritData = JSON.parse(JSON.stringify(template)); // Deep copy
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
            width: 600px;
            max-height: 85vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = isNew ? '👻 Create New Spirit' : `👻 Edit Spirit: ${spiritData.name}`;
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

        // ID (disabled for existing)
        form.appendChild(this.createConfigField('Spirit ID', spiritData.id, 'text', (value) => {
            spiritData.id = value;
        }, { disabled: !isNew, required: isNew }));

        // Name
        form.appendChild(this.createConfigField('Name', spiritData.name, 'text', (value) => {
            spiritData.name = value;
        }));

        // Sprite Source
        form.appendChild(this.createConfigField('Sprite Path', spiritData.spriteSrc, 'text', (value) => {
            spiritData.spriteSrc = value;
        }));

        // Sprite Dimensions
        const dimensionsDiv = document.createElement('div');
        dimensionsDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;';
        dimensionsDiv.appendChild(this.createConfigField('Sprite Width', spiritData.spriteWidth, 'number', (value) => {
            spiritData.spriteWidth = parseInt(value);
        }, { min: 1 }));
        dimensionsDiv.appendChild(this.createConfigField('Sprite Height', spiritData.spriteHeight, 'number', (value) => {
            spiritData.spriteHeight = parseInt(value);
        }, { min: 1 }));
        form.appendChild(dimensionsDiv);

        // Collision Shape
        form.appendChild(this.createConfigSelect('Collision Shape', spiritData.collisionShape, ['circle', 'rectangle'], (value) => {
            spiritData.collisionShape = value;
        }));

        // Stats Section
        const statsHeader = document.createElement('div');
        statsHeader.textContent = '⚔️ Combat Stats';
        statsHeader.style.cssText = 'font-size: 14px; font-weight: bold; color: #4a9eff; margin-top: 8px;';
        form.appendChild(statsHeader);

        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;';
        statsGrid.appendChild(this.createConfigField('HP', spiritData.stats.hp, 'number', (value) => {
            spiritData.stats.hp = parseInt(value);
        }, { min: 1 }));
        statsGrid.appendChild(this.createConfigField('Attack', spiritData.stats.attack, 'number', (value) => {
            spiritData.stats.attack = parseInt(value);
        }, { min: 0 }));
        statsGrid.appendChild(this.createConfigField('Defense', spiritData.stats.defense, 'number', (value) => {
            spiritData.stats.defense = parseInt(value);
        }, { min: 0 }));
        statsGrid.appendChild(this.createConfigField('Speed', spiritData.stats.speed, 'number', (value) => {
            spiritData.stats.speed = parseInt(value);
        }, { min: 1 }));
        form.appendChild(statsGrid);

        // Movement
        const movementHeader = document.createElement('div');
        movementHeader.textContent = '🏃 Movement';
        movementHeader.style.cssText = 'font-size: 14px; font-weight: bold; color: #4a9eff; margin-top: 8px;';
        form.appendChild(movementHeader);

        form.appendChild(this.createConfigField('Move Speed', spiritData.moveSpeed, 'number', (value) => {
            spiritData.moveSpeed = parseFloat(value);
        }, { min: 0.1, step: 0.1 }));

        form.appendChild(this.createConfigSelect('Move Pattern', spiritData.movePattern, ['wander', 'static'], (value) => {
            spiritData.movePattern = value;
        }));

        // Description
        const descLabel = document.createElement('label');
        descLabel.textContent = 'Description';
        descLabel.style.cssText = 'font-size: 13px; font-weight: bold;';
        form.appendChild(descLabel);

        const descTextarea = document.createElement('textarea');
        descTextarea.value = spiritData.description || '';
        descTextarea.style.cssText = `
            padding: 8px;
            background: #2a2a2a;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 13px;
            font-family: Arial, sans-serif;
            resize: vertical;
            min-height: 60px;
        `;
        descTextarea.oninput = () => {
            spiritData.description = descTextarea.value;
        };
        form.appendChild(descTextarea);

        modal.appendChild(form);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px; justify-content: space-between;';

        const leftButtons = document.createElement('div');
        leftButtons.style.cssText = 'display: flex; gap: 12px;';

        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = 'display: flex; gap: 12px;';

        // Delete button (only for existing)
        if (!isNew) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️ Delete';
            deleteBtn.type = 'button';
            deleteBtn.style.cssText = `
                padding: 10px 20px;
                background: #d9534f;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `;
            deleteBtn.onclick = () => {
                if (confirm(`Delete spirit "${spiritData.name}"?`)) {
                    this.deleteSpiritTemplate(spiritData.id);
                    backdrop.remove();
                }
            };
            leftButtons.appendChild(deleteBtn);
        }

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save Spirit';
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
            if (isNew && !spiritData.id) {
                alert('Please enter a Spirit ID');
                return;
            }
            if (!spiritData.name) {
                alert('Please enter a name');
                return;
            }

            this.saveSpiritTemplate(spiritData, isNew);
            this.showNotification(isNew ? '✅ Spirit created!' : '✅ Spirit updated!');
            backdrop.remove();
        };

        // Cancel button
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
     * Save spirit template to spirits.json
     */
    saveSpiritTemplate(spiritData, isNew) {
        // Get current spirits data
        fetch('data/spirits.json')
            .then(response => response.json())
            .then(data => {
                if (isNew) {
                    // Add new spirit
                    data.spirits.push(spiritData);
                } else {
                    // Update existing spirit
                    const index = data.spirits.findIndex(s => s.id === spiritData.id);
                    if (index !== -1) {
                        data.spirits[index] = spiritData;
                    } else {
                        data.spirits.push(spiritData);
                    }
                }

                // Save back to file (this would need a server endpoint in production)
                console.log('[SpiritEditor] Spirit data to save:', data);
                console.warn('[SpiritEditor] Auto-save not implemented. Please manually update data/spirits.json:');
                console.log(JSON.stringify(data, null, 2));

                // Update registry in memory
                this.editor.game.spiritRegistry.templates.set(spiritData.id, spiritData);
                
                this.showNotification('⚠️ Note: Please manually copy the console JSON to data/spirits.json', 'warning');
            })
            .catch(error => {
                console.error('[SpiritEditor] Error loading spirits.json:', error);
                alert('Error loading spirits.json. Check console for details.');
            });
    }

    /**
     * Delete spirit template
     */
    deleteSpiritTemplate(spiritId) {
        fetch('data/spirits.json')
            .then(response => response.json())
            .then(data => {
                // Remove spirit
                data.spirits = data.spirits.filter(s => s.id !== spiritId);

                console.log('[SpiritEditor] Updated spirits data:', data);
                console.warn('[SpiritEditor] Auto-save not implemented. Please manually update data/spirits.json:');
                console.log(JSON.stringify(data, null, 2));

                // Update registry
                this.editor.game.spiritRegistry.templates.delete(spiritId);
                
                this.showNotification('✅ Spirit deleted (copy JSON from console to spirits.json)');
            })
            .catch(error => {
                console.error('[SpiritEditor] Error loading spirits.json:', error);
                alert('Error loading spirits.json');
            });
    }

    /**
     * Show Static Object Creator Modal
     */
    showStaticObjectCreator() {
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
        title.textContent = '🎨 Create New Static Object';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Object data
        const objectData = {
            name: '',
            objectCategory: 'decoration',
            category: 'StaticObject',
            spriteSrc: 'assets/objects/trees/tree-01.png',
            scale: 1.0,
            collisionExpandTopPercent: 0,
            collisionExpandBottomPercent: 0,
            collisionExpandLeftPercent: 0,
            collisionExpandRightPercent: 0,
            castsShadow: true,
            swaysInWind: false
        };

        // Form container
        const form = document.createElement('div');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

        // Template Name
        form.appendChild(this.createConfigField('Template Name', objectData.name, 'text', (value) => {
            objectData.name = value;
        }));

        // Category Dropdown
        const categoryContainer = document.createElement('div');
        categoryContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
        
        const categoryLabel = document.createElement('label');
        categoryLabel.textContent = 'Object Category';
        categoryLabel.style.cssText = 'font-size: 13px; font-weight: bold; color: #aaa;';
        categoryContainer.appendChild(categoryLabel);
        
        const categorySelect = document.createElement('select');
        categorySelect.style.cssText = `
            padding: 10px;
            background: #2a2a2a;
            border: 1px solid #4a9eff;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            cursor: pointer;
        `;
        
        const categories = ['tree', 'bush', 'rock', 'clutter', 'decoration', 'structure', 'flora', 'furniture', 'other'];
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            if (cat === objectData.objectCategory) option.selected = true;
            categorySelect.appendChild(option);
        });
        
        categorySelect.onchange = () => objectData.objectCategory = categorySelect.value;
        categoryContainer.appendChild(categorySelect);
        form.appendChild(categoryContainer);

        // Sprite Path
        const spriteField = this.createConfigField('Sprite Path', objectData.spriteSrc, 'text', (value) => {
            objectData.spriteSrc = value;
            spritePreviewImg.src = value;
        });
        form.appendChild(spriteField);

        // Sprite Preview with Collision Box
        const spritePreviewContainer = document.createElement('div');
        spritePreviewContainer.style.cssText = 'text-align: center; padding: 16px; background: #2a2a2a; border-radius: 8px;';
        const spritePreviewLabel = document.createElement('div');
        spritePreviewLabel.textContent = 'Sprite Preview (with Collision Box)';
        spritePreviewLabel.style.cssText = 'font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 12px;';
        spritePreviewContainer.appendChild(spritePreviewLabel);
        
        // Canvas wrapper for layered rendering
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.cssText = `
            position: relative;
            display: inline-block;
            background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px;
            border: 2px solid #4a9eff;
            border-radius: 4px;
        `;
        
        const spritePreviewImg = document.createElement('img');
        spritePreviewImg.src = objectData.spriteSrc;
        spritePreviewImg.style.cssText = `
            display: block;
            max-width: 200px;
            max-height: 200px;
            image-rendering: pixelated;
        `;
        
        const collisionCanvas = document.createElement('canvas');
        collisionCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;
        
        // Function to redraw collision box (matches editor visualization)
        const updateCollisionPreview = () => {
            if (!spritePreviewImg.complete || !spritePreviewImg.naturalWidth) return;
            
            const width = spritePreviewImg.width;
            const height = spritePreviewImg.height;
            
            collisionCanvas.width = width;
            collisionCanvas.height = height;
            
            const ctx = collisionCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            
            // Calculate collision box based on offsets (matching GameObject.getCollisionBounds)
            const renderedWidth = width;
            const renderedHeight = height;
            
            // Apply expansion values in all 4 directions
            const expandLeft = renderedWidth * (objectData.collisionExpandLeftPercent || 0);
            const expandRight = renderedWidth * (objectData.collisionExpandRightPercent || 0);
            const expandTop = renderedHeight * (objectData.collisionExpandTopPercent || 0);
            const expandBottom = renderedHeight * (objectData.collisionExpandBottomPercent || 0);
            
            let collisionWidth = renderedWidth + expandLeft + expandRight;
            let collisionHeight = renderedHeight + expandTop + expandBottom;
            
            // Calculate base position (centered on sprite)
            let collisionX = (width - collisionWidth) / 2;
            let collisionY = (height - collisionHeight) / 2;
            
            // Adjust for asymmetric expansion
            collisionX += (expandRight - expandLeft) / 2;
            collisionY += (expandBottom - expandTop) / 2;
            
            // Draw collision box with red outline (matching editor style)
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]); // Solid line, not dashed
            ctx.strokeRect(collisionX, collisionY, collisionWidth, collisionHeight);
            
            // Draw semi-transparent red fill
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(collisionX, collisionY, collisionWidth, collisionHeight);
        };
        
        spritePreviewImg.onload = () => {
            updateCollisionPreview();
        };
        
        spritePreviewImg.onerror = () => {
            canvasWrapper.style.borderColor = '#c0392b';
        };
        
        canvasWrapper.appendChild(spritePreviewImg);
        canvasWrapper.appendChild(collisionCanvas);
        spritePreviewContainer.appendChild(canvasWrapper);
        form.appendChild(spritePreviewContainer);

        // Scale
        form.appendChild(this.createConfigField('Scale', objectData.scale, 'number', (value) => {
            objectData.scale = parseFloat(value);
        }, { step: 0.1, min: 0.1, max: 5.0 }));

        // Collision Section
        const collisionSection = document.createElement('div');
        collisionSection.style.cssText = 'padding: 16px; background: #2a2a2a; border-radius: 8px;';
        
        const collisionTitle = document.createElement('div');
        collisionTitle.textContent = '📦 Collision Box Adjustments';
        collisionTitle.style.cssText = 'font-size: 14px; font-weight: bold; color: #4a9eff; margin-bottom: 12px;';
        collisionSection.appendChild(collisionTitle);

        const collisionHint = document.createElement('div');
        collisionHint.textContent = 'Negative values shrink the collision box (e.g., -0.90 = 90% smaller)';
        collisionHint.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 12px;';
        collisionSection.appendChild(collisionHint);

        const collisionGrid = document.createElement('div');
        collisionGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;';

        // Collision offsets (with live preview update)
        collisionGrid.appendChild(this.createConfigField('Top Offset %', objectData.collisionExpandTopPercent, 'number', (value) => {
            objectData.collisionExpandTopPercent = parseFloat(value);
            updateCollisionPreview();
        }, { step: 0.05, min: -1.0, max: 1.0 }));

        collisionGrid.appendChild(this.createConfigField('Bottom Offset %', objectData.collisionExpandBottomPercent, 'number', (value) => {
            objectData.collisionExpandBottomPercent = parseFloat(value);
            updateCollisionPreview();
        }, { step: 0.05, min: -1.0, max: 1.0 }));

        collisionGrid.appendChild(this.createConfigField('Left Offset %', objectData.collisionExpandLeftPercent, 'number', (value) => {
            objectData.collisionExpandLeftPercent = parseFloat(value);
            updateCollisionPreview();
        }, { step: 0.05, min: -1.0, max: 1.0 }));

        collisionGrid.appendChild(this.createConfigField('Right Offset %', objectData.collisionExpandRightPercent, 'number', (value) => {
            objectData.collisionExpandRightPercent = parseFloat(value);
            updateCollisionPreview();
        }, { step: 0.05, min: -1.0, max: 1.0 }));

        collisionSection.appendChild(collisionGrid);
        form.appendChild(collisionSection);

        // Sways in Wind Checkbox
        const swayContainer = document.createElement('div');
        swayContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 12px; background: #2a2a2a; border-radius: 8px;';
        
        const swayCheck = document.createElement('input');
        swayCheck.type = 'checkbox';
        swayCheck.checked = objectData.swaysInWind;
        swayCheck.id = 'swaysInWind';
        swayCheck.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
        swayCheck.onchange = () => objectData.swaysInWind = swayCheck.checked;
        
        const swayLabel = document.createElement('label');
        swayLabel.htmlFor = 'swaysInWind';
        swayLabel.textContent = '🍃 Sways in Wind (trees, grass)';
        swayLabel.style.cssText = 'font-size: 14px; font-weight: bold; color: #fff; cursor: pointer;';
        
        swayContainer.appendChild(swayCheck);
        swayContainer.appendChild(swayLabel);
        form.appendChild(swayContainer);

        // Cast Shadow Checkbox
        const shadowContainer = document.createElement('div');
        shadowContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 12px; background: #2a2a2a; border-radius: 8px;';
        
        const shadowCheck = document.createElement('input');
        shadowCheck.type = 'checkbox';
        shadowCheck.checked = objectData.castsShadow;
        shadowCheck.id = 'castsShadow';
        shadowCheck.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
        shadowCheck.onchange = () => objectData.castsShadow = shadowCheck.checked;
        
        const shadowLabel = document.createElement('label');
        shadowLabel.htmlFor = 'castsShadow';
        shadowLabel.textContent = '🌑 Casts Shadow';
        shadowLabel.style.cssText = 'font-size: 14px; font-weight: bold; color: #fff; cursor: pointer;';
        
        shadowContainer.appendChild(shadowCheck);
        shadowContainer.appendChild(shadowLabel);
        form.appendChild(shadowContainer);

        modal.appendChild(form);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;';

        const saveTemplateBtn = document.createElement('button');
        saveTemplateBtn.textContent = '💾 Save as Template';
        saveTemplateBtn.type = 'button';
        saveTemplateBtn.style.cssText = `
            padding: 10px 20px;
            background: #8e44ad;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;
        saveTemplateBtn.onclick = () => {
            console.log('[EditorUI] Save template clicked');
            console.log('[EditorUI] Game object:', this.game);
            console.log('[EditorUI] Registry:', this.game?.staticObjectRegistry);
            
            // Validate
            if (!objectData.spriteSrc || objectData.spriteSrc.trim() === '') {
                alert('Please enter a sprite path!');
                return;
            }
            if (!objectData.name || objectData.name.trim() === '') {
                alert('Please enter a template name!');
                return;
            }

            // Save to registry
            try {
                const success = this.game.staticObjectRegistry.addTemplate(objectData.name, {
                    spriteSrc: objectData.spriteSrc,
                    scale: objectData.scale,
                    objectCategory: objectData.objectCategory,
                    collisionExpandTopPercent: objectData.collisionExpandTopPercent,
                    collisionExpandBottomPercent: objectData.collisionExpandBottomPercent,
                    collisionExpandLeftPercent: objectData.collisionExpandLeftPercent,
                    collisionExpandRightPercent: objectData.collisionExpandRightPercent,
                    castsShadow: objectData.castsShadow,
                    swaysInWind: objectData.swaysInWind
                });

                if (success) {
                    alert(`Template "${objectData.name}" saved successfully!`);
                    backdrop.remove();
                } else {
                    alert('Failed to save template. Check console for errors.');
                }
            } catch (error) {
                console.error('[EditorUI] Error saving template:', error);
                alert('Error saving template: ' + error.message);
            }
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
        buttonContainer.appendChild(saveTemplateBtn);
        modal.appendChild(buttonContainer);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    showStaticObjectBrowser() {
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
            width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = '📚 Browse Static Object Templates';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);

        // Category filter
        const filterContainer = document.createElement('div');
        filterContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; align-items: center;';
        
        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Filter by Category:';
        filterLabel.style.cssText = 'font-size: 14px; font-weight: bold; color: #aaa;';
        filterContainer.appendChild(filterLabel);
        
        const categorySelect = document.createElement('select');
        categorySelect.style.cssText = `
            padding: 8px;
            background: #2a2a2a;
            border: 1px solid #4a9eff;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
        `;
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Categories';
        categorySelect.appendChild(allOption);
        
        const categories = ['tree', 'bush', 'rock', 'clutter', 'decoration', 'structure', 'flora', 'furniture', 'other'];
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categorySelect.appendChild(option);
        });
        
        filterContainer.appendChild(categorySelect);
        modal.appendChild(filterContainer);

        // Templates grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
        `;

        // Function to render templates
        const renderTemplates = (category) => {
            gridContainer.innerHTML = '';
            
            const allTemplates = this.game.staticObjectRegistry.getAllTemplates();
            const filteredTemplates = category === 'all' 
                ? allTemplates 
                : allTemplates.filter(t => t.template.objectCategory === category);

            if (filteredTemplates.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No templates found in this category.';
                emptyMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;';
                gridContainer.appendChild(emptyMsg);
                return;
            }

            filteredTemplates.forEach(({name, template}) => {
                const card = document.createElement('div');
                card.style.cssText = `
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                
                card.onmouseenter = () => {
                    card.style.borderColor = '#4a9eff';
                    card.style.transform = 'scale(1.05)';
                };
                card.onmouseleave = () => {
                    card.style.borderColor = '#444';
                    card.style.transform = 'scale(1)';
                };

                // Sprite preview
                const previewImg = document.createElement('img');
                previewImg.src = template.spriteSrc;
                previewImg.style.cssText = `
                    width: 100%;
                    height: 120px;
                    object-fit: contain;
                    image-rendering: pixelated;
                    background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                `;

                // Name
                const nameLabel = document.createElement('div');
                nameLabel.textContent = name;
                nameLabel.style.cssText = 'font-weight: bold; color: #fff; margin-bottom: 4px; font-size: 14px;';

                // Category badge
                const categoryBadge = document.createElement('div');
                categoryBadge.textContent = template.objectCategory;
                categoryBadge.style.cssText = `
                    display: inline-block;
                    padding: 4px 8px;
                    background: #4a9eff;
                    color: white;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                `;

                card.appendChild(previewImg);
                card.appendChild(nameLabel);
                card.appendChild(categoryBadge);

                // Click to select
                card.onclick = () => {
                    this.selectObjectToPlace({
                        category: 'StaticObject',
                        spriteSrc: template.spriteSrc,
                        scale: template.scale,
                        objectCategory: template.objectCategory,
                        collisionExpandTopPercent: template.collisionExpandTopPercent,
                        collisionExpandBottomPercent: template.collisionExpandBottomPercent,
                        collisionExpandLeftPercent: template.collisionExpandLeftPercent,
                        collisionExpandRightPercent: template.collisionExpandRightPercent,
                        castsShadow: template.castsShadow,
                        swaysInWind: template.swaysInWind
                    }, name);
                    backdrop.remove();
                };

                gridContainer.appendChild(card);
            });
        };

        // Initial render
        renderTemplates('all');

        // Category filter change
        categorySelect.onchange = () => renderTemplates(categorySelect.value);

        modal.appendChild(gridContainer);

        // Close button
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
            margin-top: 20px;
            display: block;
            margin-left: auto;
        `;
        closeBtn.onclick = () => backdrop.remove();
        modal.appendChild(closeBtn);

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

    /**
     * Show Paint Tool Panel
     */
    showPaintToolPanel() {
        // Remove existing panel if any
        const existing = document.getElementById('paint-tool-panel');
        if (existing) existing.remove();
        
        const panel = document.createElement('div');
        panel.id = 'paint-tool-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 280px;
            max-height: calc(100vh - 100px);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #4a9eff;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1001;
            display: flex;
            flex-direction: column;
        `;
        
        // Title
        const title = document.createElement('h3');
        title.textContent = '🖌️ Paint Tool';
        title.style.cssText = 'margin: 0; padding: 16px 16px 12px 16px; color: #4a9eff; flex-shrink: 0;';
        panel.appendChild(title);
        
        // Scrollable content container
        const scrollContent = document.createElement('div');
        scrollContent.style.cssText = `
            overflow-y: auto;
            overflow-x: hidden;
            flex: 1;
            padding: 0 16px 16px 16px;
        `;
        
        // Add custom scrollbar styling
        const style = document.createElement('style');
        style.textContent = `
            #paint-tool-panel div::-webkit-scrollbar {
                width: 8px;
            }
            #paint-tool-panel div::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            #paint-tool-panel div::-webkit-scrollbar-thumb {
                background: #4a9eff;
                border-radius: 4px;
            }
            #paint-tool-panel div::-webkit-scrollbar-thumb:hover {
                background: #6bb3ff;
            }
        `;
        document.head.appendChild(style);
        
        // Paint Mode Selector
        const paintModeLabel = document.createElement('div');
        paintModeLabel.textContent = 'Paint Mode:';
        paintModeLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px; font-weight: bold;';
        scrollContent.appendChild(paintModeLabel);
        
        // Layer selection (Texture, Collision, or Spawn)
        const paintModes = [
            { value: 'texture', label: '🎨 Texture Layer' },
            { value: 'collision', label: '🚧 Collision Layer' },
            { value: 'spawn', label: '🎯 Spawn Zones' }
        ];
        
        // Initialize paint mode if not set
        if (!this.editor.paintMode) {
            this.editor.paintMode = 'texture';
        }
        
        const paintModeButtons = [];
        
        paintModes.forEach((mode, index) => {
            const btn = document.createElement('button');
            btn.textContent = mode.label;
            btn.dataset.paintMode = mode.value;
            btn.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: ${this.editor.paintMode === mode.value ? '#4a9eff' : '#333'};
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                display: block;
            `;
            btn.onclick = () => {
                this.editor.paintMode = mode.value;
                paintModeButtons.forEach(b => {
                    b.style.background = b.dataset.paintMode === mode.value ? '#4a9eff' : '#333';
                });
                // Update section visibility based on mode
                if (mode.value === 'collision') {
                    // Collision mode: show brush shape and tool actions, hide texture, style, and opacity
                    textureSection.style.display = 'none';
                    brushStyleSection.style.display = 'none';
                    opacitySection.style.display = 'none';
                    brushShapeSection.style.display = 'block';
                    toolActionSection.style.display = 'block';
                } else if (mode.value === 'spawn') {
                    // Spawn Zone mode: show brush shape and tool actions, hide texture, style, and opacity
                    textureSection.style.display = 'none';
                    brushStyleSection.style.display = 'none';
                    opacitySection.style.display = 'none';
                    brushShapeSection.style.display = 'block';
                    toolActionSection.style.display = 'block';
                } else {
                    // Texture mode: show texture, style, opacity, and tool actions, hide brush shape
                    textureSection.style.display = 'block';
                    brushStyleSection.style.display = 'block';
                    opacitySection.style.display = 'block';
                    brushShapeSection.style.display = 'none';
                    toolActionSection.style.display = 'block';
                }
            };
            paintModeButtons.push(btn);
            scrollContent.appendChild(btn);
        });
        
        // Add spacing
        const spacer2 = document.createElement('div');
        spacer2.style.cssText = 'margin-bottom: 8px;';
        scrollContent.appendChild(spacer2);
        
        // Tool Action (Paint, Erase, Fill)
        const toolActionLabel = document.createElement('div');
        toolActionLabel.textContent = 'Tool Action:';
        toolActionLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px; font-weight: bold;';
        scrollContent.appendChild(toolActionLabel);
        
        const toolActionSection = document.createElement('div');
        
        const toolActions = [
            { value: 'paint', label: '🖌️ Paint' },
            { value: 'erase', label: '🧹 Erase' },
            { value: 'fill', label: '🪣 Fill' }
        ];
        
        // Initialize tool action if not set
        if (!this.editor.toolAction) {
            this.editor.toolAction = 'paint';
        }
        
        const toolActionButtons = [];
        
        toolActions.forEach(action => {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.dataset.toolAction = action.value;
            btn.style.cssText = `
                width: 32%;
                padding: 8px;
                margin-bottom: 8px;
                margin-right: ${action.value !== 'fill' ? '2%' : '0'};
                background: ${this.editor.toolAction === action.value ? '#4a9eff' : '#333'};
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                display: inline-block;
            `;
            btn.onclick = () => {
                this.editor.toolAction = action.value;
                toolActionButtons.forEach(b => {
                    b.style.background = b.dataset.toolAction === action.value ? '#4a9eff' : '#333';
                });
                // Update brush size visibility (hide for fill)
                if (action.value === 'fill') {
                    brushSizeLabel.style.display = 'none';
                    brushSizeSlider.style.display = 'none';
                } else {
                    brushSizeLabel.style.display = 'block';
                    brushSizeSlider.style.display = 'block';
                }
            };
            toolActionButtons.push(btn);
            toolActionSection.appendChild(btn);
        });
        
        scrollContent.appendChild(toolActionSection);
        
        // Add spacing
        const spacer = document.createElement('div');
        spacer.style.cssText = 'margin-bottom: 16px; clear: both;';
        scrollContent.appendChild(spacer);
        
        // Brush Size
        const brushSizeLabel = document.createElement('div');
        brushSizeLabel.textContent = `Brush Size: ${this.editor.brushSize}px`;
        brushSizeLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px;';
        scrollContent.appendChild(brushSizeLabel);
        
        const brushSizeSlider = document.createElement('input');
        brushSizeSlider.type = 'range';
        brushSizeSlider.min = '16';
        brushSizeSlider.max = '256';
        brushSizeSlider.value = this.editor.brushSize;
        brushSizeSlider.style.cssText = 'width: 100%; margin-bottom: 16px;';
        brushSizeSlider.oninput = () => {
            this.editor.brushSize = parseInt(brushSizeSlider.value);
            brushSizeLabel.textContent = `Brush Size: ${this.editor.brushSize}px`;
        };
        scrollContent.appendChild(brushSizeSlider);
        
        // Brush Style Section (only for texture mode)
        const brushStyleSection = document.createElement('div');
        brushStyleSection.style.display = this.editor.paintMode === 'texture' ? 'block' : 'none';
        
        const brushStyleLabel = document.createElement('div');
        brushStyleLabel.textContent = 'Brush Style:';
        brushStyleLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px; font-weight: bold;';
        brushStyleSection.appendChild(brushStyleLabel);
        
        const brushStyles = [
            { value: 'hard', label: 'Hard Edge' },
            { value: 'soft', label: 'Soft Edge' },
            { value: 'very-soft', label: 'Very Soft' }
        ];
        
        // Store brush style buttons for proper updates
        const brushStyleButtons = [];
        
        brushStyles.forEach(style => {
            const btn = document.createElement('button');
            btn.textContent = style.label;
            btn.dataset.brushStyle = style.value;
            btn.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-bottom: 4px;
                background: ${this.editor.brushStyle === style.value ? '#4a9eff' : '#333'};
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            btn.onclick = () => {
                this.editor.brushStyle = style.value;
                brushStyleButtons.forEach(b => {
                    b.style.background = b.dataset.brushStyle === style.value ? '#4a9eff' : '#333';
                });
            };
            brushStyleButtons.push(btn);
            brushStyleSection.appendChild(btn);
        });
        
        // Opacity Section (only for texture mode)
        const opacitySection = document.createElement('div');
        opacitySection.style.display = this.editor.paintMode === 'texture' ? 'block' : 'none';
        
        const opacityLabel = document.createElement('div');
        opacityLabel.textContent = `Opacity: ${Math.round(this.editor.brushOpacity * 100)}%`;
        opacityLabel.style.cssText = 'margin: 16px 0 8px 0; font-size: 13px;';
        opacitySection.appendChild(opacityLabel);
        
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = '0';
        opacitySlider.max = '100';
        opacitySlider.value = this.editor.brushOpacity * 100;
        opacitySlider.style.cssText = 'width: 100%; margin-bottom: 16px;';
        opacitySlider.oninput = () => {
            this.editor.brushOpacity = parseInt(opacitySlider.value) / 100;
            opacityLabel.textContent = `Opacity: ${Math.round(this.editor.brushOpacity * 100)}%`;
        };
        opacitySection.appendChild(opacitySlider);
        
        // Brush Shape Section (only for collision mode)
        const brushShapeSection = document.createElement('div');
        brushShapeSection.style.display = this.editor.paintMode === 'collision' ? 'block' : 'none';
        
        const brushShapeLabel = document.createElement('div');
        brushShapeLabel.textContent = 'Brush Shape:';
        brushShapeLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px; font-weight: bold;';
        brushShapeSection.appendChild(brushShapeLabel);
        
        const brushShapes = [
            { value: 'circle', label: '⭕ Circle' },
            { value: 'square', label: '⬜ Square' }
        ];
        
        const brushShapeButtons = [];
        
        brushShapes.forEach(shape => {
            const btn = document.createElement('button');
            btn.textContent = shape.label;
            btn.dataset.brushShape = shape.value;
            btn.style.cssText = `
                width: 48%;
                padding: 8px;
                margin-bottom: 8px;
                margin-right: ${shape.value === 'circle' ? '4%' : '0'};
                background: ${this.editor.brushShape === shape.value ? '#4a9eff' : '#333'};
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: inline-block;
            `;
            btn.onclick = () => {
                this.editor.brushShape = shape.value;
                brushShapeButtons.forEach(b => {
                    b.style.background = b.dataset.brushShape === shape.value ? '#4a9eff' : '#333';
                });
            };
            brushShapeButtons.push(btn);
            brushShapeSection.appendChild(btn);
        });
        
        // Add sections to scrollContent
        scrollContent.appendChild(brushStyleSection);
        scrollContent.appendChild(opacitySection);
        scrollContent.appendChild(brushShapeSection);
        
        // Texture Section (only for texture mode)
        const textureSection = document.createElement('div');
        textureSection.style.display = this.editor.paintMode === 'texture' ? 'block' : 'none';
        
        // Current Texture
        const textureLabel = document.createElement('div');
        textureLabel.textContent = 'Current Texture:';
        textureLabel.style.cssText = 'margin-bottom: 8px; font-size: 13px; font-weight: bold;';
        textureSection.appendChild(textureLabel);
        
        const texturePreview = document.createElement('div');
        texturePreview.style.cssText = `
            width: 100%;
            height: 80px;
            background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px;
            border: 2px solid #555;
            border-radius: 4px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            font-size: 12px;
        `;
        
        if (this.editor.selectedTexture && this.editor.loadedTextures[this.editor.selectedTexture]) {
            const img = document.createElement('img');
            img.src = this.editor.selectedTexture;
            img.style.cssText = 'max-width: 100%; max-height: 100%; image-rendering: pixelated;';
            texturePreview.innerHTML = '';
            texturePreview.appendChild(img);
        } else {
            texturePreview.textContent = 'No texture selected';
        }
        textureSection.appendChild(texturePreview);
        
        // Select Texture Button
        const selectTextureBtn = document.createElement('button');
        selectTextureBtn.textContent = '🎨 Select Texture';
        selectTextureBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        selectTextureBtn.onclick = () => this.showTextureManager();
        textureSection.appendChild(selectTextureBtn);
        
        // Add texture section to scrollContent
        scrollContent.appendChild(textureSection);
        
        // Add scrollContent to panel
        panel.appendChild(scrollContent);
        
        // Footer with close button (fixed at bottom)
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 12px 16px;
            border-top: 1px solid #555;
            flex-shrink: 0;
        `;
        
        // Close Panel Button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖ Close Paint Tool';
        closeBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #c0392b;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        `;
        closeBtn.onclick = () => {
            this.editor.setTool('select');
            panel.remove();
        };
        footer.appendChild(closeBtn);
        panel.appendChild(footer);
        
        document.body.appendChild(panel);
    }

    /**
     * Show Texture Manager
     */
    showTextureManager() {
        // Predefined textures from assets/texture folder
        const availableTextures = [
            { path: 'assets/texture/grass.png', name: 'Grass' },
            // Add more textures here as they are added to the folder
            // { path: 'assets/texture/dirt.png', name: 'Dirt' },
            // { path: 'assets/texture/stone.png', name: 'Stone' },
        ];
        
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
        title.textContent = '🎨 Select Texture';
        title.style.cssText = 'margin-top: 0; color: #4a9eff;';
        modal.appendChild(title);
        
        // Info text
        const infoText = document.createElement('div');
        infoText.textContent = 'Select a texture to paint with:';
        infoText.style.cssText = 'margin-bottom: 16px; color: #aaa; font-size: 14px;';
        modal.appendChild(infoText);
        
        // Texture Grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        `;
        
        // Populate grid with available textures
        availableTextures.forEach(texture => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #2a2a2a;
                border: 2px solid ${this.editor.selectedTexture === texture.path ? '#4a9eff' : '#444'};
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s;
            `;
            
            card.onmouseover = () => {
                if (this.editor.selectedTexture !== texture.path) {
                    card.style.borderColor = '#666';
                    card.style.transform = 'translateY(-2px)';
                }
            };
            card.onmouseout = () => {
                if (this.editor.selectedTexture !== texture.path) {
                    card.style.borderColor = '#444';
                }
                card.style.transform = 'translateY(0)';
            };
            
            card.onclick = () => {
                this.editor.loadTexture(texture.path, texture.name);
                this.showNotification(`✅ Selected: ${texture.name}`);
                backdrop.remove();
                // Update paint panel if open
                const panel = document.getElementById('paint-tool-panel');
                if (panel) {
                    panel.remove();
                    this.showPaintToolPanel();
                }
            };
            
            // Texture preview image
            const img = document.createElement('img');
            img.src = texture.path;
            img.style.cssText = `
                width: 100%;
                height: 100px;
                object-fit: cover;
                image-rendering: pixelated;
                border-radius: 4px;
                margin-bottom: 8px;
                background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px;
            `;
            img.onerror = () => {
                img.style.background = '#c0392b';
                img.alt = '❌ Failed to load';
            };
            card.appendChild(img);
            
            // Texture name
            const name = document.createElement('div');
            name.textContent = texture.name;
            name.style.cssText = 'font-size: 13px; font-weight: bold; color: #fff;';
            card.appendChild(name);
            
            // Selected indicator
            if (this.editor.selectedTexture === texture.path) {
                const selectedBadge = document.createElement('div');
                selectedBadge.textContent = '✓ Selected';
                selectedBadge.style.cssText = `
                    margin-top: 8px;
                    padding: 4px 8px;
                    background: #4a9eff;
                    color: white;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                `;
                card.appendChild(selectedBadge);
            }
            
            grid.appendChild(card);
        });
        
        modal.appendChild(grid);
        
        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => backdrop.remove();
        modal.appendChild(closeBtn);
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        
        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.remove();
        };
    }

    /**
     * Open item icon picker modal
     */
    openItemIconPicker(onSelect) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #444;
            border-radius: 8px;
            width: 90%;
            max-width: 700px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: #2a2a2a;
            border-bottom: 2px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Select Item Icon';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 4px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        `;
        closeBtn.onclick = () => overlay.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Icon grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
        `;

        // Available item icon paths
        const availableIcons = [
            'assets/icon/Items/Health_Potion-0.png',
            'assets/icon/Items/Mana_Potion-0.png',
            'assets/icon/Items/Iron_Sword.png',
            'assets/icon/Items/Leather_Armor-0.png',
            'assets/icon/Items/Magic_Scroll-0.png',
            'assets/icon/Items/Iron_Ore-0.png',
            'assets/icon/Items/Mysterious_Key-0.png',
        ];

        // Create icon cards
        availableIcons.forEach(iconPath => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #2a2a2a;
                border: 2px solid #444;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;

            const img = document.createElement('img');
            img.src = iconPath;
            img.style.cssText = `
                width: 64px;
                height: 64px;
                image-rendering: pixelated;
                background: #1a1a1a;
                border-radius: 4px;
            `;

            const name = document.createElement('div');
            name.textContent = iconPath.split('/').pop().replace('.png', '').replace(/_/g, ' ');
            name.style.cssText = `
                color: white;
                font-size: 11px;
                text-align: center;
                word-break: break-word;
            `;

            card.appendChild(img);
            card.appendChild(name);

            card.onmouseover = () => {
                card.style.borderColor = '#4a9eff';
                card.style.background = '#333';
            };
            card.onmouseout = () => {
                card.style.borderColor = '#444';
                card.style.background = '#2a2a2a';
            };
            card.onclick = () => {
                onSelect(iconPath);
                overlay.remove();
            };

            grid.appendChild(card);
        });

        gridContainer.appendChild(grid);
        modal.appendChild(header);
        modal.appendChild(gridContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }
}

// Export
window.EditorUI = EditorUI;
