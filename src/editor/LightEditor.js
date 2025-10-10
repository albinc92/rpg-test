/**
 * LightEditor.js
 * Full-featured Light template editor with Create/Edit/Delete functionality
 * Standardized design matching NPC, Chest, and Portal editors
 */

class LightEditor {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.listContainer = null;
        this.formContainer = null;
        this.currentEditingTemplate = null;
    }

    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
            this.refresh();
            return;
        }

        this.createPanel();
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    createPanel() {
        const theme = EditorStyles.THEMES.light;
        
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme);

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme);
        header.innerHTML = EditorStyles.createHeader(theme, '💡 Light Template Editor', 'Create, Edit, and Delete Light Templates');

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        EditorStyles.applyCloseButtonHover(closeBtn);
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.panel.appendChild(header);

        // Scrollable content
        const content = document.createElement('div');
        content.style.cssText = EditorStyles.getContentStyle();

        // New Template Button
        const newBtn = document.createElement('button');
        newBtn.textContent = '+ Create New Light Template';
        newBtn.style.cssText = EditorStyles.getNewButtonStyle(theme);
        EditorStyles.applyNewButtonHover(newBtn, theme);
        newBtn.onclick = () => this.showForm();
        content.appendChild(newBtn);

        // Template List
        this.listContainer = document.createElement('div');
        content.appendChild(this.listContainer);

        // Form Container (hidden by default)
        this.formContainer = document.createElement('div');
        this.formContainer.style.display = 'none';
        content.appendChild(this.formContainer);

        this.panel.appendChild(content);
        document.body.appendChild(this.panel);

        this.refresh();
    }

    refresh() {
        if (!this.listContainer) return;

        this.listContainer.innerHTML = '';

        const templates = this.game.lightRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle()}">
                    No light templates yet. Click "Create New" to add one!
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const item = document.createElement('div');
            item.style.cssText = EditorStyles.getListItemStyle();

            // Color preview swatch
            const colorPreview = `rgba(${template.color.r}, ${template.color.g}, ${template.color.b}, ${template.color.a})`;

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: ${colorPreview};
                            border-radius: 4px;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            box-shadow: 0 0 10px ${colorPreview};
                        "></div>
                        <div>
                            <div style="font-weight: bold; color: #f1c40f;">${template.name}</div>
                            <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                                Radius: ${template.radius}px | Flicker: ${template.flicker?.enabled ? 'Yes' : 'No'}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="edit-btn" style="${EditorStyles.getEditButtonStyle()}">Edit</button>
                        <button class="delete-btn" style="${EditorStyles.getDeleteButtonStyle()}">Delete</button>
                    </div>
                </div>
            `;

            const editBtn = item.querySelector('.edit-btn');
            const deleteBtn = item.querySelector('.delete-btn');
            
            EditorStyles.applyEditButtonHover(editBtn);
            EditorStyles.applyDeleteButtonHover(deleteBtn);
            
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.showForm(template);
            };

            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteTemplate(template.name);
            };

            this.listContainer.appendChild(item);
        });
    }

    showForm(template = null) {
        const theme = EditorStyles.THEMES.light;
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New Light Template';
        title.style.cssText = `margin: 0 0 15px 0; color: ${theme.accent}; font-size: 16px;`;
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'torch-light'));

        // Radius field
        form.appendChild(this.createField('Radius (px)', 'number', 'radius', template?.radius || 100, null, 10));

        // Color section
        const colorTitle = document.createElement('div');
        colorTitle.textContent = 'Light Color';
        colorTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(colorTitle);

        const colorRow = document.createElement('div');
        colorRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        colorRow.appendChild(this.createField('Red (0-255)', 'number', 'colorR', template?.color?.r || 255, null, 1));
        colorRow.appendChild(this.createField('Green (0-255)', 'number', 'colorG', template?.color?.g || 220, null, 1));
        form.appendChild(colorRow);

        const colorRow2 = document.createElement('div');
        colorRow2.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        colorRow2.appendChild(this.createField('Blue (0-255)', 'number', 'colorB', template?.color?.b || 100, null, 1));
        colorRow2.appendChild(this.createField('Alpha (0-1)', 'number', 'colorA', template?.color?.a || 0.8, null, 0.1));
        form.appendChild(colorRow2);

        // Color preview
        const colorPreview = document.createElement('div');
        colorPreview.id = 'color-preview';
        colorPreview.style.cssText = `
            width: 100%;
            height: 40px;
            border-radius: 4px;
            margin-top: 8px;
            border: 1px solid rgba(149, 165, 166, 0.3);
            box-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
        `;
        form.appendChild(colorPreview);

        // Update preview on color change
        const updatePreview = () => {
            const r = form.querySelector('[name="colorR"]').value || 255;
            const g = form.querySelector('[name="colorG"]').value || 255;
            const b = form.querySelector('[name="colorB"]').value || 255;
            const a = form.querySelector('[name="colorA"]').value || 1;
            colorPreview.style.background = `rgba(${r}, ${g}, ${b}, ${a})`;
            colorPreview.style.boxShadow = `0 0 20px rgba(${r}, ${g}, ${b}, ${a})`;
        };
        
        ['colorR', 'colorG', 'colorB', 'colorA'].forEach(name => {
            form.querySelector(`[name="${name}"]`).addEventListener('input', updatePreview);
        });
        updatePreview();

        // Flicker section
        const flickerTitle = document.createElement('div');
        flickerTitle.textContent = 'Flicker Effect';
        flickerTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(flickerTitle);

        // Enable Flicker checkbox
        const flickerContainer = document.createElement('div');
        flickerContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
        const flickerCheckbox = document.createElement('input');
        flickerCheckbox.type = 'checkbox';
        flickerCheckbox.id = 'flickerEnabled';
        flickerCheckbox.checked = template?.flicker?.enabled || false;
        const flickerLabel = document.createElement('label');
        flickerLabel.htmlFor = 'flickerEnabled';
        flickerLabel.textContent = 'Enable Flicker';
        flickerLabel.style.color = '#ecf0f1';
        flickerContainer.appendChild(flickerCheckbox);
        flickerContainer.appendChild(flickerLabel);
        form.appendChild(flickerContainer);

        // Flicker properties (shown when enabled)
        const flickerProps = document.createElement('div');
        flickerProps.id = 'flicker-props';
        flickerProps.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        flickerProps.style.display = flickerCheckbox.checked ? 'flex' : 'none';

        const flickerRow = document.createElement('div');
        flickerRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        flickerRow.appendChild(this.createField('Intensity (0-1)', 'number', 'flickerIntensity', template?.flicker?.intensity || 0.2, null, 0.05));
        flickerRow.appendChild(this.createField('Speed', 'number', 'flickerSpeed', template?.flicker?.speed || 0.1, null, 0.01));
        flickerProps.appendChild(flickerRow);

        form.appendChild(flickerProps);

        // Toggle flicker props visibility
        flickerCheckbox.addEventListener('change', () => {
            flickerProps.style.display = flickerCheckbox.checked ? 'flex' : 'none';
        });

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 8px; margin-top: 15px;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = template ? 'Save Changes' : 'Create Template';
        saveBtn.style.cssText = EditorStyles.getSaveButtonStyle(theme);
        EditorStyles.applySaveButtonHover(saveBtn, theme);
        buttonRow.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = EditorStyles.getCancelButtonStyle();
        EditorStyles.applyCancelButtonHover(cancelBtn);
        cancelBtn.onclick = () => this.hideForm();
        buttonRow.appendChild(cancelBtn);

        form.appendChild(buttonRow);

        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveTemplate(form);
        };

        this.formContainer.appendChild(form);
    }

    createField(label, type, name, value, placeholder = '', step = null) {
        const container = document.createElement('div');
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();
        container.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.value = value;
        if (placeholder) input.placeholder = placeholder;
        if (step) input.step = step;
        if (type === 'number') {
            input.min = 0;
            if (name.includes('color') && !name.includes('A')) input.max = 255;
            if (name.includes('colorA')) input.max = 1;
        }
        input.style.cssText = EditorStyles.getInputStyle();
        EditorStyles.applyInputFocus(input);
        container.appendChild(input);

        return container;
    }

    saveTemplate(form) {
        const formData = new FormData(form);
        
        const templateData = {
            name: formData.get('name'),
            radius: parseFloat(formData.get('radius')),
            color: {
                r: parseInt(formData.get('colorR')),
                g: parseInt(formData.get('colorG')),
                b: parseInt(formData.get('colorB')),
                a: parseFloat(formData.get('colorA'))
            },
            flicker: {
                enabled: form.querySelector('#flickerEnabled').checked,
                intensity: parseFloat(formData.get('flickerIntensity')) || 0.2,
                speed: parseFloat(formData.get('flickerSpeed')) || 0.1
            }
        };

        // Validate
        if (!templateData.name) {
            alert('Name is required!');
            return;
        }

        if (templateData.radius <= 0) {
            alert('Radius must be greater than 0!');
            return;
        }

        try {
            if (this.currentEditingTemplate) {
                // Update existing
                this.game.lightRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[LightEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.lightRegistry.addTemplate(templateData.name, templateData);
                console.log(`[LightEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete light template "${name}"?`)) return;

        try {
            this.game.lightRegistry.removeTemplate(name);
            console.log(`[LightEditor] Deleted template: ${name}`);
            this.refresh();
        } catch (error) {
            alert(`Error deleting template: ${error.message}`);
        }
    }

    hideForm() {
        this.currentEditingTemplate = null;
        this.formContainer.style.display = 'none';
        this.listContainer.style.display = 'block';
    }
}

// Make globally available
window.LightEditor = LightEditor;
