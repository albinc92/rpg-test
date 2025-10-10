/**
 * NPCEditor.js
 * Full-featured NPC template editor with Create/Edit/Delete functionality
 * Similar to LightEditor but for NPC management
 */

class NPCEditor {
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
            border: 2px solid rgba(46, 204, 113, 0.6);
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
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.3), rgba(39, 174, 96, 0.3));
            border-bottom: 1px solid rgba(46, 204, 113, 0.3);
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <div>
                <h3 style="margin: 0; font-size: 18px; color: #2ecc71;">NPC Template Editor</h3>
                <div style="font-size: 12px; color: #95a5a6; margin-top: 4px;">Create, Edit, and Delete NPC Templates</div>
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
        newBtn.textContent = '+ Create New NPC Template';
        newBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: rgba(46, 204, 113, 0.2);
            border: 1px solid rgba(46, 204, 113, 0.4);
            border-radius: 6px;
            color: #2ecc71;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        newBtn.onmouseover = () => newBtn.style.background = 'rgba(46, 204, 113, 0.3)';
        newBtn.onmouseout = () => newBtn.style.background = 'rgba(46, 204, 113, 0.2)';
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

        const templates = this.game.npcRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #7f8c8d;">
                    No NPC templates yet. Click "Create New" to add one!
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
                        <div style="font-weight: bold; color: #2ecc71;">${template.name}</div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                            Sprite: ${template.spritePath} | Dialog: ${template.dialogId || 'None'}
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
        title.textContent = template ? `Edit: ${template.name}` : 'Create New NPC Template';
        title.style.cssText = 'margin: 0 0 15px 0; color: #2ecc71; font-size: 16px;';
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'npc-merchant-0'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/npc/main-0.png'));

        // Dialog ID field
        form.appendChild(this.createField('Dialog ID', 'text', 'dialogId', template?.dialogId || '', 'merchant_greeting'));

        // Is Interactive checkbox
        const interactiveContainer = document.createElement('div');
        interactiveContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const interactiveCheckbox = document.createElement('input');
        interactiveCheckbox.type = 'checkbox';
        interactiveCheckbox.id = 'isInteractive';
        interactiveCheckbox.checked = template?.isInteractive !== false;
        const interactiveLabel = document.createElement('label');
        interactiveLabel.htmlFor = 'isInteractive';
        interactiveLabel.textContent = 'Is Interactive';
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
            background: rgba(46, 204, 113, 0.2);
            border: 1px solid rgba(46, 204, 113, 0.4);
            border-radius: 6px;
            color: #2ecc71;
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
            dialogId: formData.get('dialogId') || null,
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
                this.game.npcRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[NPCEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.npcRegistry.addTemplate(templateData.name, templateData);
                console.log(`[NPCEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete NPC template "${name}"?`)) return;

        try {
            this.game.npcRegistry.removeTemplate(name);
            console.log(`[NPCEditor] Deleted template: ${name}`);
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
window.NPCEditor = NPCEditor;
