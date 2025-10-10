/**
 * ObjectPlacementPanel - Unified panel for placing all types of game objects
 * Allows switching between object types and selecting templates to place
 */
class ObjectPlacementPanel {
    constructor(editor) {
        this.editor = editor;
        this.game = editor.game;
        this.panel = null;
        this.selectedType = 'lights'; // Current object type
        this.selectedTemplate = null; // Currently selected template
        this.placementMode = false;
        
        this.createPanel();
    }
    
    /**
     * Create the placement panel UI
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'object-placement-panel';
        this.panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            font-family: Arial, sans-serif;
            display: none;
            z-index: 10000;
            overflow-y: auto;
        `;
        
        this.panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #4CAF50;">📍 Place Objects</h3>
                <button id="placement-panel-close" style="background: #f44336; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 4px;">✕</button>
            </div>
            
            <!-- Object Type Selector -->
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Object Type:</label>
                <select id="placement-type-select" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;">
                    <option value="lights">💡 Lights</option>
                    <option value="spirits">👻 Spirits</option>
                    <option value="doodads">🎨 Doodads</option>
                    <option value="npcs">🧙 NPCs</option>
                    <option value="chests">📦 Chests</option>
                    <option value="portals">🚪 Portals</option>
                </select>
            </div>
            
            <!-- Template List Container -->
            <div id="placement-template-list" style="margin-bottom: 15px;">
                <!-- Dynamically populated -->
            </div>
            
            <!-- Placement Status -->
            <div id="placement-status" style="background: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 4px; margin-bottom: 10px; display: none;">
                <div style="font-size: 13px; margin-bottom: 5px;">
                    <strong>Placement Active</strong>
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    Selected: <span id="placement-selected-name">-</span><br>
                    Click on map to place<br>
                    Press ESC to cancel
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center;">
                <button id="placement-cancel-btn" style="background: #f44336; border: none; color: white; padding: 10px 20px; cursor: pointer; border-radius: 4px; display: none; width: 100%;">
                    🛑 Cancel Placement
                </button>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        this.setupEventListeners();
        this.populateTemplates();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('placement-panel-close').addEventListener('click', () => this.hide());
        
        // Type selector
        document.getElementById('placement-type-select').addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.selectedTemplate = null;
            this.populateTemplates();
            this.deactivatePlacementMode(); // Cancel placement when switching types
        });
        
        // Cancel button
        document.getElementById('placement-cancel-btn').addEventListener('click', () => {
            this.deactivatePlacementMode();
        });
    }
    
    /**
     * Populate template list based on selected type
     */
    populateTemplates() {
        const container = document.getElementById('placement-template-list');
        container.innerHTML = '';
        
        let templates = [];
        
        switch(this.selectedType) {
            case 'lights':
                templates = this.game.lightManager.lightRegistry.getAllTemplates();
                break;
            case 'spirits':
                templates = this.game.spiritRegistry.getAllTemplates();
                break;
            case 'doodads':
                // StaticObjectRegistry returns {name, template} format - merge name into template
                templates = this.game.staticObjectRegistry.getAllTemplates()
                    .map(item => ({ ...item.template, name: item.name, id: item.name }));
                break;
            case 'npcs':
                templates = this.getNPCTemplates();
                break;
            case 'chests':
                templates = this.getChestTemplates();
                break;
            case 'portals':
                templates = this.getPortalTemplates();
                break;
        }
        
        if (templates.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">
                    No templates available.<br>
                    Create templates in the Data menu first.
                </div>
            `;
            return;
        }
        
        // Create template list
        const list = document.createElement('div');
        list.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #555;
            border-radius: 4px;
            max-height: 300px;
            overflow-y: auto;
        `;
        
        templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'placement-template-item';
            item.dataset.templateId = template.id || template.name;
            item.style.cssText = `
                padding: 10px;
                border-bottom: 1px solid #333;
                cursor: pointer;
                transition: background 0.2s;
            `;
            
            const icon = this.getTypeIcon(this.selectedType);
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${template.name || template.id}</div>
                        <div style="font-size: 11px; color: #999;">${this.getTemplateInfo(template)}</div>
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = '#2a2a2a';
            });
            
            item.addEventListener('mouseleave', () => {
                if (!this.selectedTemplate || this.selectedTemplate.name !== template.name) {
                    item.style.background = 'transparent';
                }
            });
            
            item.addEventListener('click', () => {
                this.selectTemplate(template);
            });
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    /**
     * Get icon for object type
     */
    getTypeIcon(type) {
        const icons = {
            lights: '💡',
            spirits: '👻',
            doodads: '🎨',
            npcs: '🧙',
            chests: '📦',
            portals: '🚪'
        };
        return icons[type] || '📍';
    }
    
    /**
     * Get template info string
     */
    getTemplateInfo(template) {
        switch(this.selectedType) {
            case 'lights':
                return `Radius: ${template.radius}px`;
            case 'spirits':
                return `Level: ${template.level || 1}`;
            case 'doodads':
                return `Scale: ${template.scale || 1.0}`;
            case 'npcs':
                return template.npcType || 'Generic NPC';
            case 'chests':
                return template.chestType || 'Wooden';
            case 'portals':
                return template.portalType || 'Door';
            default:
                return '';
        }
    }
    
    /**
     * Get NPC templates (placeholder until we create NPC registry)
     */
    getNPCTemplates() {
        return [
            { id: 'npc-merchant', name: 'Merchant', npcType: 'merchant' },
            { id: 'npc-sage', name: 'Sage', npcType: 'sage' },
            { id: 'npc-guard', name: 'Guard', npcType: 'guard' }
        ];
    }
    
    /**
     * Get chest templates (placeholder until we create chest registry)
     */
    getChestTemplates() {
        return [
            { id: 'chest-wooden', name: 'Wooden Chest', chestType: 'wooden' },
            { id: 'chest-iron', name: 'Iron Chest', chestType: 'iron' },
            { id: 'chest-golden', name: 'Golden Chest', chestType: 'golden' }
        ];
    }
    
    /**
     * Get portal templates (placeholder until we create portal registry)
     */
    getPortalTemplates() {
        return [
            { id: 'portal-door', name: 'Door', portalType: 'door' },
            { id: 'portal-teleport', name: 'Teleport', portalType: 'teleport' },
            { id: 'portal-stairs', name: 'Stairs', portalType: 'stairs' }
        ];
    }
    
    /**
     * Select a template
     */
    selectTemplate(template) {
        this.selectedTemplate = template;
        
        // Update visual selection
        const items = document.querySelectorAll('.placement-template-item');
        items.forEach(item => {
            if (item.dataset.templateId === (template.id || template.name)) {
                item.style.background = '#2a4a2a';
            } else {
                item.style.background = 'transparent';
            }
        });
        
        // Auto-activate placement mode when template is selected
        this.activatePlacementMode();
    }
    
    /**
     * Update UI state
     */
    updateUI() {
        const statusDiv = document.getElementById('placement-status');
        const cancelBtn = document.getElementById('placement-cancel-btn');
        
        if (this.placementMode) {
            cancelBtn.style.display = 'block';
            statusDiv.style.display = 'block';
            
            if (this.selectedTemplate) {
                document.getElementById('placement-selected-name').textContent = this.selectedTemplate.name || this.selectedTemplate.id;
            }
        } else {
            cancelBtn.style.display = 'none';
            statusDiv.style.display = 'none';
        }
    }
    
    /**
     * Activate placement mode
     */
    activatePlacementMode() {
        if (!this.selectedTemplate) return;
        
        // Clear any previous placement state first
        this.editor.selectedPrefab = null;
        if (this.editor.lightEditor) {
            this.editor.lightEditor.placementMode = false;
            this.editor.lightEditor.selectedTemplate = null;
        }
        
        this.placementMode = true;
        
        // Create prefab data based on type
        const prefabData = this.createPrefabData(this.selectedTemplate);
        this.editor.selectedPrefab = prefabData;
        
        // Set editor to place mode AFTER setting prefab
        this.editor.setTool('place');
        
        // Load preview sprite if prefab has one
        if (prefabData && prefabData.spriteSrc) {
            this.editor.loadPreviewSprite(prefabData.spriteSrc);
        }
        
        console.log('[ObjectPlacementPanel] Activated placement mode:', this.selectedType);
        console.log('[ObjectPlacementPanel] Template:', this.selectedTemplate);
        console.log('[ObjectPlacementPanel] Prefab data:', prefabData);
        console.log('[ObjectPlacementPanel] Editor tool:', this.editor.selectedTool);
        console.log('[ObjectPlacementPanel] Light editor mode:', this.editor.lightEditor?.placementMode || false);
        console.log('[ObjectPlacementPanel] Preview sprite loading:', prefabData?.spriteSrc || 'none');
        
        this.updateUI();
    }
    
    /**
     * Deactivate placement mode
     */
    deactivatePlacementMode() {
        this.placementMode = false;
        this.editor.setTool('select');
        this.editor.selectedPrefab = null;
        
        // Clear light editor placement mode if it was active
        if (this.editor.lightEditor) {
            this.editor.lightEditor.placementMode = false;
            this.editor.lightEditor.selectedTemplate = null;
        }
        
        console.log('[ObjectPlacementPanel] Deactivated placement mode');
        this.updateUI();
    }
    
    /**
     * Create prefab data for placement
     */
    createPrefabData(template) {
        switch(this.selectedType) {
            case 'lights':
                // Lights use special placement through LightEditor
                if (this.editor.lightEditor) {
                    this.editor.lightEditor.selectedTemplate = template;
                    this.editor.lightEditor.placementMode = true;
                }
                return null;
                
            case 'spirits':
                return {
                    category: 'Actor',
                    actorType: 'spirit',
                    ...template,  // Include ALL template properties (collision, stats, etc.)
                    templateId: template.id
                };
                
            case 'doodads':
                return {
                    category: 'StaticObject',
                    ...template,  // Include ALL template properties (collision, sway, shadow, etc.)
                    templateId: template.id
                };
                
            case 'npcs':
                return {
                    category: 'Actor',
                    actorType: 'npc',
                    spriteSrc: '/assets/npc/main-0.png',
                    name: template.name,
                    npcType: template.npcType,
                    dialogue: 'Hello!',
                    scale: 0.15
                };
                
            case 'chests':
                return {
                    category: 'InteractiveObject',
                    objectType: 'chest',
                    spriteSrc: '/assets/npc/chest-0.png',
                    chestType: template.chestType,
                    gold: 0,
                    loot: []
                };
                
            case 'portals':
                return {
                    category: 'InteractiveObject',
                    objectType: 'portal',
                    spriteSrc: '/assets/npc/door-0.png',
                    portalType: template.portalType,
                    targetMap: '0-0',
                    spawnPoint: 'default'
                };
                
            default:
                return null;
        }
    }
    
    /**
     * Handle map click (for light placement)
     */
    handleMapClick(worldX, worldY) {
        if (!this.placementMode) return false;
        
        // Lights are handled specially through LightEditor
        if (this.selectedType === 'lights' && this.editor.lightEditor) {
            return this.editor.lightEditor.handleMapClick(worldX, worldY);
        }
        
        // Other objects use standard placement
        return false; // Let EditorManager handle it
    }
    
    /**
     * Show the panel
     */
    show() {
        this.panel.style.display = 'block';
        this.populateTemplates();
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.style.display = 'none';
        if (this.placementMode) {
            this.deactivatePlacementMode();
        }
    }
    
    /**
     * Is the panel visible
     */
    isVisible() {
        return this.panel.style.display === 'block';
    }
    
    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Export
window.ObjectPlacementPanel = ObjectPlacementPanel;
