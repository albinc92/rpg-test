/**
 * LightEditor - UI panel for managing light templates and placing lights
 */
class LightEditor {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.selectedTemplate = null;
        this.placementMode = false;
        this.editingLight = null; // Currently selected light instance
        
        this.createPanel();
    }
    
    /**
     * Create the light editor panel
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'light-editor-panel';
        this.panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            font-family: Arial, sans-serif;
            display: none;
            z-index: 10000;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        this.panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #4CAF50;">💡 Light Editor</h3>
                <button id="light-editor-close" style="background: #f44336; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 4px;">✕</button>
            </div>
            
            <!-- Template List and New Button -->
            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="light-template-select" style="flex: 1; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;">
                        <option value="">-- Select Template --</option>
                    </select>
                    <button id="light-new-template-btn" style="background: #2196F3; border: none; color: white; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold;">➕ New</button>
                </div>
            </div>
            
            <!-- Empty State Prompt -->
            <div id="light-empty-prompt" style="display: none; background: rgba(33, 150, 243, 0.2); padding: 20px; border-radius: 4px; text-align: center; margin-bottom: 15px;">
                <div style="font-size: 14px; line-height: 1.6;">
                    <strong>No template selected</strong><br>
                    Select a template above to edit it,<br>
                    or click <strong>➕ New</strong> to create one!
                </div>
            </div>
            
            <!-- Template Properties -->
            <div id="light-template-props" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Template Name:</label>
                    <input type="text" id="light-name" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Radius (px):</label>
                    <input type="number" id="light-radius" min="20" max="500" step="10" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Color:</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Red (0-255):</label>
                            <input type="number" id="light-color-r" min="0" max="255" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Green (0-255):</label>
                            <input type="number" id="light-color-g" min="0" max="255" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Blue (0-255):</label>
                            <input type="number" id="light-color-b" min="0" max="255" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Alpha (0-1):</label>
                            <input type="number" id="light-color-a" min="0" max="1" step="0.1" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                    </div>
                    <div id="light-color-preview" style="width: 100%; height: 40px; border-radius: 4px; margin-top: 10px; border: 1px solid #555;"></div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; margin-bottom: 8px;">
                        <input type="checkbox" id="light-flicker-enabled" style="margin-right: 8px;" />
                        <span style="font-weight: bold;">Enable Flicker</span>
                    </label>
                    
                    <div id="light-flicker-props">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Intensity (0-1):</label>
                            <input type="number" id="light-flicker-intensity" min="0" max="1" step="0.05" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 3px; font-size: 12px;">Speed:</label>
                            <input type="number" id="light-flicker-speed" min="0" max="1" step="0.01" style="width: 100%; padding: 6px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555;" />
                        </div>
                    </div>
                </div>
                
                <!-- Template Actions -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <button id="light-save-template" style="background: #4CAF50; border: none; color: white; padding: 10px; cursor: pointer; border-radius: 4px; font-weight: bold;">💾 Save</button>
                    <button id="light-delete-template" style="background: #f44336; border: none; color: white; padding: 10px; cursor: pointer; border-radius: 4px;">🗑️ Delete</button>
                </div>
            </div>
            
            <!-- Selected Light Info -->
            <div id="light-selected-info" style="display: none;">
                <hr style="border: 1px solid #555; margin: 15px 0;" />
                <h4 style="margin: 10px 0; color: #4CAF50;">Selected Light</h4>
                <div style="background: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <div style="font-size: 13px; margin-bottom: 5px;">
                        <strong>Template:</strong> <span id="selected-light-template">-</span>
                    </div>
                    <div style="font-size: 13px; margin-bottom: 5px;">
                        <strong>Position:</strong> <span id="selected-light-position">-</span>
                    </div>
                    <button id="light-delete-instance" style="width: 100%; background: #f44336; border: none; color: white; padding: 10px; cursor: pointer; border-radius: 4px; margin-top: 10px;">
                        🗑️ Delete Light
                    </button>
                </div>
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
        document.getElementById('light-editor-close').addEventListener('click', () => this.hide());
        
        // Template selection
        document.getElementById('light-template-select').addEventListener('change', (e) => {
            this.selectTemplate(e.target.value);
        });
        
        // Color inputs - update preview
        ['light-color-r', 'light-color-g', 'light-color-b', 'light-color-a'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateColorPreview());
        });
        
        // Flicker enabled checkbox
        document.getElementById('light-flicker-enabled').addEventListener('change', (e) => {
            document.getElementById('light-flicker-props').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // New template button (top)
        document.getElementById('light-new-template-btn').addEventListener('click', () => this.newTemplate());
        
        // Template actions
        document.getElementById('light-save-template').addEventListener('click', () => this.saveTemplate());
        document.getElementById('light-delete-template').addEventListener('click', () => this.deleteTemplate());
        
        // Delete instance button
        document.getElementById('light-delete-instance').addEventListener('click', () => this.deleteSelectedLight());
    }
    
    /**
     * Populate templates dropdown
     */
    populateTemplates() {
        const select = document.getElementById('light-template-select');
        const templates = this.game.lightManager.lightRegistry.getAllTemplates();
        
        // Clear existing options (except first)
        select.innerHTML = '<option value="">-- Select Template --</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }
    
    /**
     * Select a template
     */
    selectTemplate(templateName) {
        if (!templateName) {
            document.getElementById('light-template-props').style.display = 'none';
            document.getElementById('light-empty-prompt').style.display = 'block';
            this.selectedTemplate = null;
            return;
        }
        
        // Hide empty prompt when template is selected
        document.getElementById('light-empty-prompt').style.display = 'none';
        
        const template = this.game.lightManager.lightRegistry.getTemplate(templateName);
        if (!template) return;
        
        this.selectedTemplate = template;
        
        // Show properties panel
        document.getElementById('light-template-props').style.display = 'block';
        
        // Populate fields
        document.getElementById('light-name').value = template.name;
        document.getElementById('light-radius').value = template.radius;
        document.getElementById('light-color-r').value = template.color.r;
        document.getElementById('light-color-g').value = template.color.g;
        document.getElementById('light-color-b').value = template.color.b;
        document.getElementById('light-color-a').value = template.color.a;
        document.getElementById('light-flicker-enabled').checked = template.flicker.enabled;
        document.getElementById('light-flicker-intensity').value = template.flicker.intensity;
        document.getElementById('light-flicker-speed').value = template.flicker.speed;
        
        // Update flicker props visibility
        document.getElementById('light-flicker-props').style.display = template.flicker.enabled ? 'block' : 'none';
        
        // Update color preview
        this.updateColorPreview();
    }
    
    /**
     * Update color preview
     */
    updateColorPreview() {
        const r = document.getElementById('light-color-r').value || 0;
        const g = document.getElementById('light-color-g').value || 0;
        const b = document.getElementById('light-color-b').value || 0;
        const a = document.getElementById('light-color-a').value || 1;
        
        const preview = document.getElementById('light-color-preview');
        preview.style.background = `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    /**
     * Save template
     */
    saveTemplate() {
        const name = document.getElementById('light-name').value.trim();
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        const template = {
            name: name,
            radius: parseInt(document.getElementById('light-radius').value),
            color: {
                r: parseInt(document.getElementById('light-color-r').value),
                g: parseInt(document.getElementById('light-color-g').value),
                b: parseInt(document.getElementById('light-color-b').value),
                a: parseFloat(document.getElementById('light-color-a').value)
            },
            flicker: {
                enabled: document.getElementById('light-flicker-enabled').checked,
                intensity: parseFloat(document.getElementById('light-flicker-intensity').value),
                speed: parseFloat(document.getElementById('light-flicker-speed').value)
            }
        };
        
        this.game.lightManager.lightRegistry.addTemplate(template);
        this.populateTemplates();
        
        // Select the newly saved template
        document.getElementById('light-template-select').value = name;
        
        alert(`Template "${name}" saved successfully!`);
    }
    
    /**
     * Create new template
     */
    newTemplate() {
        // Clear form with sensible defaults
        document.getElementById('light-name').value = 'New Light';
        document.getElementById('light-radius').value = 100;
        document.getElementById('light-color-r').value = 255;
        document.getElementById('light-color-g').value = 255;
        document.getElementById('light-color-b').value = 255;
        document.getElementById('light-color-a').value = 0.8;
        document.getElementById('light-flicker-enabled').checked = false;
        document.getElementById('light-flicker-intensity').value = 0.3;
        document.getElementById('light-flicker-speed').value = 0.1;
        
        // Show the form and hide empty prompt
        document.getElementById('light-template-props').style.display = 'block';
        document.getElementById('light-empty-prompt').style.display = 'none';
        document.getElementById('light-flicker-props').style.display = 'none';
        document.getElementById('light-template-select').value = '';
        
        this.updateColorPreview();
        this.selectedTemplate = null;
        
        console.log('[LightEditor] Created new template form');
    }
    
    /**
     * Delete template
     */
    deleteTemplate() {
        if (!this.selectedTemplate) {
            alert('Please select a template to delete');
            return;
        }
        
        if (confirm(`Delete template "${this.selectedTemplate.name}"?`)) {
            this.game.lightManager.lightRegistry.removeTemplate(this.selectedTemplate.name);
            this.populateTemplates();
            document.getElementById('light-template-select').value = '';
            this.selectTemplate('');
            alert('Template deleted');
        }
    }
    
    /**
     * Handle map click for light placement (called from ObjectPlacementPanel)
     */
    handleMapClick(worldX, worldY) {
        if (!this.placementMode || !this.selectedTemplate) return false;
        
        // Create light instance from template
        const light = this.game.lightManager.lightRegistry.createLightFromTemplate(
            this.selectedTemplate.name,
            worldX,
            worldY
        );
        
        this.game.lightManager.addLight(light);
        
        console.log(`[LightEditor] Placed ${this.selectedTemplate.name} at (${worldX}, ${worldY})`);
        
        return true; // Handled
    }
    
    /**
     * Select a placed light instance
     */
    selectLight(light) {
        this.editingLight = light;
        
        // Show selected light info
        const infoPanel = document.getElementById('light-selected-info');
        infoPanel.style.display = 'block';
        
        document.getElementById('selected-light-template').textContent = light.templateName;
        document.getElementById('selected-light-position').textContent = `(${Math.round(light.x)}, ${Math.round(light.y)})`;
        
        // Load light properties into editor
        document.getElementById('light-template-select').value = light.templateName;
        this.selectTemplate(light.templateName);
        
        // Override with instance-specific values
        document.getElementById('light-radius').value = light.radius;
        document.getElementById('light-color-r').value = light.color.r;
        document.getElementById('light-color-g').value = light.color.g;
        document.getElementById('light-color-b').value = light.color.b;
        document.getElementById('light-color-a').value = light.color.a;
        document.getElementById('light-flicker-enabled').checked = light.flicker.enabled;
        document.getElementById('light-flicker-intensity').value = light.flicker.intensity;
        document.getElementById('light-flicker-speed').value = light.flicker.speed;
        
        this.updateColorPreview();
    }
    
    /**
     * Update selected light with current editor values
     */
    updateSelectedLight() {
        if (!this.editingLight) return;
        
        this.editingLight.radius = parseInt(document.getElementById('light-radius').value);
        this.editingLight.color.r = parseInt(document.getElementById('light-color-r').value);
        this.editingLight.color.g = parseInt(document.getElementById('light-color-g').value);
        this.editingLight.color.b = parseInt(document.getElementById('light-color-b').value);
        this.editingLight.color.a = parseFloat(document.getElementById('light-color-a').value);
        this.editingLight.flicker.enabled = document.getElementById('light-flicker-enabled').checked;
        this.editingLight.flicker.intensity = parseFloat(document.getElementById('light-flicker-intensity').value);
        this.editingLight.flicker.speed = parseFloat(document.getElementById('light-flicker-speed').value);
    }
    
    /**
     * Delete selected light instance
     */
    deleteSelectedLight() {
        if (!this.editingLight) return;
        
        if (confirm('Delete this light instance?')) {
            this.game.lightManager.removeLight(this.editingLight.id);
            this.deselectLight();
        }
    }
    
    /**
     * Deselect light
     */
    deselectLight() {
        this.editingLight = null;
        document.getElementById('light-selected-info').style.display = 'none';
    }
    
    /**
     * Show the panel
     */
    show() {
        this.panel.style.display = 'block';
        this.populateTemplates();
        
        // Show empty prompt if no template selected
        if (!this.selectedTemplate && !document.getElementById('light-template-select').value) {
            document.getElementById('light-empty-prompt').style.display = 'block';
            document.getElementById('light-template-props').style.display = 'none';
        }
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.style.display = 'none';
        // Placement mode is managed by ObjectPlacementPanel
        this.placementMode = false;
        this.deselectLight();
    }
    
    /**
     * Is the panel visible
     */
    isVisible() {
        return this.panel.style.display === 'block';
    }
}

// Export
window.LightEditor = LightEditor;
