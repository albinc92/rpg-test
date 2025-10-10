/**
 * TemplateEditor - UI for editing object templates
 */
class TemplateEditor {
    constructor(editor) {
        this.editor = editor;
        this.game = editor.game;
        this.container = null;
        this.currentTemplate = null;
    }

    /**
     * Create template editor UI
     */
    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'template-editor';
        this.container.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-height: 80vh;
            background: rgba(20, 20, 20, 0.98);
            color: white;
            padding: 20px;
            font-family: Arial, sans-serif;
            z-index: 2000;
            display: none;
            border: 3px solid #4a9eff;
            border-radius: 12px;
            overflow-y: auto;
            overflow-x: hidden;
            box-shadow: 0 10px 50px rgba(0,0,0,0.8);
            box-sizing: border-box;
        `;

        document.body.appendChild(this.container);
    }

    /**
     * Show template list for editing
     */
    showTemplateList() {
        if (!this.container) this.createUI();

        this.container.style.display = 'block';
        this.container.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #4a9eff;
        `;

        const title = document.createElement('h2');
        title.textContent = '🎨 Template Editor';
        title.style.margin = '0';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
        `;
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.container.appendChild(header);

        // Instructions
        const info = document.createElement('div');
        info.style.cssText = `
            background: rgba(74, 158, 255, 0.2);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 13px;
            line-height: 1.6;
        `;
        info.innerHTML = `
            <strong>📝 How to use:</strong><br>
            • Click a template to edit its properties<br>
            • Changes apply to ALL objects using that template<br>
            • Perfect for bulk updates (shadows, collisions, animations)
        `;
        this.container.appendChild(info);

        // Template list
        const templates = this.game.templateManager.getAllTemplates();
        
        templates.forEach(template => {
            const templateCard = document.createElement('div');
            templateCard.style.cssText = `
                background: rgba(50, 50, 50, 0.8);
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            `;
            templateCard.onmouseover = () => templateCard.style.borderColor = '#4a9eff';
            templateCard.onmouseout = () => templateCard.style.borderColor = 'transparent';
            templateCard.onclick = () => this.editTemplate(template.id);

            const templateHeader = document.createElement('div');
            templateHeader.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
            `;
            templateHeader.innerHTML = `
                <span style="font-size: 24px;">${template.icon}</span>
                <span>${template.name}</span>
                ${template.modified ? '<span style="color: #ffa500; font-size: 12px;">(Modified)</span>' : ''}
            `;
            templateCard.appendChild(templateHeader);

            const templateInfo = document.createElement('div');
            templateInfo.style.cssText = `
                font-size: 12px;
                color: #aaa;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px;
            `;
            templateInfo.innerHTML = `
                <div>📦 ${template.category}</div>
                <div>🎭 ${template.animationType || 'none'}</div>
                <div>💨 Sway: ${template.swaysInWind ? '✓' : '✗'}</div>
                <div>🌑 Shadow: ${template.castsShadow ? '✓' : '✗'}</div>
            `;
            templateCard.appendChild(templateInfo);

            this.container.appendChild(templateCard);
        });
    }

    /**
     * Edit a specific template
     */
    editTemplate(templateId) {
        const template = this.game.templateManager.getTemplate(templateId);
        if (!template) return;

        this.currentTemplate = templateId;
        this.container.innerHTML = '';

        // Header with back button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #4a9eff;
        `;

        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back';
        backBtn.style.cssText = `
            background: #555;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
        `;
        backBtn.onclick = () => this.showTemplateList();
        header.appendChild(backBtn);

        const title = document.createElement('h2');
        title.textContent = `${template.icon} ${template.name}`;
        title.style.margin = '0';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
        `;
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.container.appendChild(header);

        // Form container with proper scrolling
        const formContainer = document.createElement('div');
        formContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 15px;
            overflow-y: visible;
        `;

        // Add editable fields
        this.addField(formContainer, 'Cast Shadow', 'castsShadow', template.castsShadow, 'checkbox');
        this.addField(formContainer, 'Animation Type', 'animationType', template.animationType || 'none', 'select', ['none', 'sway', 'pulse', 'rotate']);
        this.addField(formContainer, 'Sways in Wind', 'swaysInWind', template.swaysInWind || false, 'checkbox');
        this.addField(formContainer, 'Animation Speed', 'animationSpeed', template.animationSpeed || 0.001, 'number', null, 0.0001, 0.01, 0.0001);
        this.addField(formContainer, 'Animation Intensity', 'animationIntensity', template.animationIntensity || 1.0, 'number', null, 0.1, 5.0, 0.1);
        this.addField(formContainer, 'Scale', 'scale', template.scale || 1.0, 'number', null, 0.1, 5.0, 0.1);
        this.addField(formContainer, 'Collision Top %', 'collisionExpandTopPercent', template.collisionExpandTopPercent || 0, 'number', null, -1, 1, 0.05);
        this.addField(formContainer, 'Collision Bottom %', 'collisionExpandBottomPercent', template.collisionExpandBottomPercent || 0, 'number', null, -1, 1, 0.05);
        this.addField(formContainer, 'Collision Right %', 'collisionExpandRightPercent', template.collisionExpandRightPercent || 0, 'number', null, -1, 1, 0.05);
        this.addField(formContainer, 'Collision Left %', 'collisionExpandLeftPercent', template.collisionExpandLeftPercent || 0, 'number', null, -1, 1, 0.05);

        this.container.appendChild(formContainer);

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Apply to All Objects';
        saveBtn.style.cssText = `
            background: #4a9eff;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            margin-top: 20px;
        `;
        saveBtn.onclick = () => this.saveTemplate();
        this.container.appendChild(saveBtn);
    }

    /**
     * Add form field
     */
    addField(parent, label, key, value, type = 'text', options = null, min = null, max = null, step = null) {
        const field = document.createElement('div');
        field.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            color: #aaa;
        `;
        field.appendChild(labelEl);

        let input;
        if (type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = value;
            input.style.cssText = `
                width: 20px;
                height: 20px;
                cursor: pointer;
            `;
        } else if (type === 'select') {
            input = document.createElement('select');
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                option.selected = value === opt;
                input.appendChild(option);
            });
            input.style.cssText = `
                padding: 10px;
                background: #333;
                color: white;
                border: 1px solid #555;
                border-radius: 5px;
                cursor: pointer;
            `;
        } else {
            input = document.createElement('input');
            input.type = type;
            input.value = value;
            if (min !== null) input.min = min;
            if (max !== null) input.max = max;
            if (step !== null) input.step = step;
            input.style.cssText = `
                padding: 10px;
                background: #333;
                color: white;
                border: 1px solid #555;
                border-radius: 5px;
            `;
        }

        input.dataset.key = key;
        field.appendChild(input);
        parent.appendChild(field);
    }

    /**
     * Save template changes
     */
    saveTemplate() {
        const inputs = this.container.querySelectorAll('input, select');
        const updates = {};

        inputs.forEach(input => {
            const key = input.dataset.key;
            if (!key) return;

            if (input.type === 'checkbox') {
                updates[key] = input.checked;
            } else if (input.type === 'number') {
                updates[key] = parseFloat(input.value);
            } else {
                updates[key] = input.value;
            }
        });

        // Update template
        this.game.templateManager.updateTemplate(this.currentTemplate, updates);

        // Show success message
        alert(`✅ Template updated! Changes applied to all objects using this template.`);

        // Go back to list
        this.showTemplateList();
    }

    /**
     * Show editor
     */
    show() {
        if (!this.container) this.createUI();
        this.showTemplateList();
    }

    /**
     * Hide editor
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}

window.TemplateEditor = TemplateEditor;
