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
                    { label: '📝 Current Map Properties', disabled: true },
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
}

// Export
window.EditorUI = EditorUI;
