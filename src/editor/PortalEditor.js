/**
 * PortalEditor.js
 * Full-featured Portal template editor with Create/Edit/Delete functionality
 * Includes portal type system and destination configuration
 */

class PortalEditor {
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
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 380px;
            max-height: 85vh;
            background: rgba(30, 30, 40, 0.95);
            border: 2px solid rgba(155, 89, 182, 0.6);
            border-radius: 8px;
            padding: 0;
            color: #ecf0f1;
            font-family: 'Segoe UI', Arial, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            z-index: 9999;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: linear-gradient(135deg, rgba(155, 89, 182, 0.3), rgba(142, 68, 173, 0.3));
            border-bottom: 1px solid rgba(155, 89, 182, 0.3);
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <div>
                <h3 style="margin: 0; font-size: 18px; color: #9b59b6;">Portal Template Editor</h3>
                <div style="font-size: 12px; color: #95a5a6; margin-top: 4px;">Create, Edit, and Delete Portal Templates</div>
            </div>
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid rgba(231, 76, 60, 0.4);
            color: #e74c3c;
            font-size: 24px;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            cursor: pointer;
            line-height: 1;
            padding: 0;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(231, 76, 60, 0.4)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(231, 76, 60, 0.2)';
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.panel.appendChild(header);

        // Scrollable content
        const content = document.createElement('div');
        content.style.cssText = `
            overflow-y: auto;
            flex: 1;
            padding: 15px;
        `;

        // New Template Button
        const newBtn = document.createElement('button');
        newBtn.textContent = '+ Create New Portal Template';
        newBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: rgba(155, 89, 182, 0.2);
            border: 1px solid rgba(155, 89, 182, 0.4);
            border-radius: 6px;
            color: #9b59b6;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        newBtn.onmouseover = () => newBtn.style.background = 'rgba(155, 89, 182, 0.3)';
        newBtn.onmouseout = () => newBtn.style.background = 'rgba(155, 89, 182, 0.2)';
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

        const templates = this.game.portalRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #7f8c8d;">
                    No portal templates yet. Click "Create New" to add one!
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px;
                margin-bottom: 8px;
                background: rgba(52, 73, 94, 0.3);
                border: 1px solid rgba(149, 165, 166, 0.3);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            `;

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #9b59b6;">
                            ${template.name} <span style="font-size: 11px; opacity: 0.7;">[${template.portalType}]</span>
                        </div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                            Sprite: ${template.spritePath} | Dest: ${template.targetMapId || 'Not Set'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="edit-btn" style="
                            background: rgba(52, 152, 219, 0.2);
                            border: 1px solid rgba(52, 152, 219, 0.4);
                            color: #3498db;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Edit</button>
                        <button class="delete-btn" style="
                            background: rgba(231, 76, 60, 0.2);
                            border: 1px solid rgba(231, 76, 60, 0.4);
                            color: #e74c3c;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Delete</button>
                    </div>
                </div>
            `;

            item.querySelector('.edit-btn').onclick = (e) => {
                e.stopPropagation();
                this.showForm(template);
            };

            item.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteTemplate(template.name);
            };

            this.listContainer.appendChild(item);
        });
    }

    showForm(template = null) {
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New Portal Template';
        title.style.cssText = 'margin: 0 0 15px 0; color: #9b59b6; font-size: 16px;';
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'dungeon-door'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/npc/door-0.png'));

        // Portal Type dropdown
        const typeContainer = document.createElement('div');
        typeContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Portal Type';
        typeLabel.style.cssText = 'font-size: 12px; color: #bdc3c7; font-weight: 500;';
        typeContainer.appendChild(typeLabel);
        const typeSelect = document.createElement('select');
        typeSelect.name = 'portalType';
        typeSelect.style.cssText = `
            padding: 8px;
            background: rgba(52, 73, 94, 0.5);
            border: 1px solid rgba(149, 165, 166, 0.3);
            border-radius: 4px;
            color: #ecf0f1;
            font-size: 13px;
        `;
        ['Door', 'Teleporter', 'Stairs', 'Cave', 'Magic'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (template?.portalType === type) option.selected = true;
            typeSelect.appendChild(option);
        });
        typeContainer.appendChild(typeSelect);
        form.appendChild(typeContainer);

        // Destination section
        const destTitle = document.createElement('div');
        destTitle.textContent = 'Destination';
        destTitle.style.cssText = 'font-weight: bold; color: #3498db; margin-top: 8px;';
        form.appendChild(destTitle);

        // Target Map ID field
        form.appendChild(this.createField('Target Map ID', 'text', 'targetMapId', template?.targetMapId || '', '0-1'));

        // Target Position
        const posRow = document.createElement('div');
        posRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        posRow.appendChild(this.createField('Target X', 'number', 'targetX', template?.targetX || 0, null, 1));
        posRow.appendChild(this.createField('Target Y', 'number', 'targetY', template?.targetY || 0, null, 1));
        form.appendChild(posRow);

        // Requires Item field
        form.appendChild(this.createField('Requires Item', 'text', 'requiresItem', template?.requiresItem || '', 'key_001 (optional)'));

        // Is Interactive checkbox
        const interactiveContainer = document.createElement('div');
        interactiveContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const interactiveCheckbox = document.createElement('input');
        interactiveCheckbox.type = 'checkbox';
        interactiveCheckbox.id = 'isInteractive';
        interactiveCheckbox.checked = template?.isInteractive !== false;
        const interactiveLabel = document.createElement('label');
        interactiveLabel.htmlFor = 'isInteractive';
        interactiveLabel.textContent = 'Is Interactive (Requires Activation)';
        interactiveLabel.style.color = '#ecf0f1';
        interactiveContainer.appendChild(interactiveCheckbox);
        interactiveContainer.appendChild(interactiveLabel);
        form.appendChild(interactiveContainer);

        // Collision dimensions
        const collisionTitle = document.createElement('div');
        collisionTitle.textContent = 'Collision Box';
        collisionTitle.style.cssText = 'font-weight: bold; color: #3498db; margin-top: 8px;';
        form.appendChild(collisionTitle);

        const collisionRow = document.createElement('div');
        collisionRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        collisionRow.appendChild(this.createField('Width', 'number', 'collisionWidth', template?.collision?.width || 32, null, 1));
        collisionRow.appendChild(this.createField('Height', 'number', 'collisionHeight', template?.collision?.height || 32, null, 1));
        form.appendChild(collisionRow);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 8px; margin-top: 15px;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = template ? 'Save Changes' : 'Create Template';
        saveBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background: rgba(155, 89, 182, 0.2);
            border: 1px solid rgba(155, 89, 182, 0.4);
            border-radius: 6px;
            color: #9b59b6;
            cursor: pointer;
            font-weight: bold;
        `;
        buttonRow.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background: rgba(127, 140, 141, 0.2);
            border: 1px solid rgba(127, 140, 141, 0.4);
            border-radius: 6px;
            color: #95a5a6;
            cursor: pointer;
        `;
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
        container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'font-size: 12px; color: #bdc3c7; font-weight: 500;';
        container.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.value = value;
        if (placeholder) input.placeholder = placeholder;
        if (step) input.step = step;
        input.style.cssText = `
            padding: 8px;
            background: rgba(52, 73, 94, 0.5);
            border: 1px solid rgba(149, 165, 166, 0.3);
            border-radius: 4px;
            color: #ecf0f1;
            font-size: 13px;
        `;
        container.appendChild(input);

        return container;
    }

    saveTemplate(form) {
        const formData = new FormData(form);
        
        const templateData = {
            name: formData.get('name'),
            spritePath: formData.get('spritePath'),
            portalType: formData.get('portalType'),
            targetMapId: formData.get('targetMapId') || null,
            targetX: parseFloat(formData.get('targetX')),
            targetY: parseFloat(formData.get('targetY')),
            requiresItem: formData.get('requiresItem') || null,
            isInteractive: form.querySelector('#isInteractive').checked,
            collision: {
                width: parseFloat(formData.get('collisionWidth')),
                height: parseFloat(formData.get('collisionHeight'))
            }
        };

        // Validate
        if (!templateData.name) {
            alert('Name is required!');
            return;
        }

        if (!templateData.spritePath) {
            alert('Sprite Path is required!');
            return;
        }

        try {
            if (this.currentEditingTemplate) {
                // Update existing
                this.game.portalRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[PortalEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.portalRegistry.addTemplate(templateData.name, templateData);
                console.log(`[PortalEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete portal template "${name}"?`)) return;

        try {
            this.game.portalRegistry.removeTemplate(name);
            console.log(`[PortalEditor] Deleted template: ${name}`);
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
window.PortalEditor = PortalEditor;
