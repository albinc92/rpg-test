/**
 * PropertyPanel - Edit properties of selected object
 */
class PropertyPanel {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.currentObject = null;
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'property-panel';
        this.container.style.cssText = `
            position: fixed;
            right: 10px;
            top: 70px;
            width: 300px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            border: 2px solid #444;
            border-radius: 8px;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Properties';
        title.style.marginTop = '0';
        this.container.appendChild(title);

        // Properties container
        this.propertiesContainer = document.createElement('div');
        this.container.appendChild(this.propertiesContainer);

        document.body.appendChild(this.container);
    }

    /**
     * Show panel with object properties
     */
    show(obj) {
        if (!obj) {
            this.hide();
            return;
        }

        this.currentObject = obj;
        this.container.style.display = 'block';

        // Clear previous properties
        this.propertiesContainer.innerHTML = '';

        // Object type
        this.addLabel('Type: ' + obj.constructor.name);

        // Common properties
        this.addNumberInput('X', obj.x, (value) => {
            obj.x = value;
        });

        this.addNumberInput('Y', obj.y, (value) => {
            obj.y = value;
        });

        this.addNumberInput('Scale', obj.scale, (value) => {
            obj.scale = value;
        }, 0.1, 0.01);

        if (obj.rotation !== undefined) {
            this.addNumberInput('Rotation', obj.rotation, (value) => {
                obj.rotation = value;
            }, 1, 0);
        }

        // Conditional properties
        if (obj.name !== undefined) {
            this.addTextInput('Name', obj.name, (value) => {
                obj.name = value;
            });
        }

        if (obj.dialogue !== undefined) {
            this.addTextArea('Dialogue', obj.dialogue, (value) => {
                obj.dialogue = value;
            });
        }

        if (obj.gold !== undefined) {
            this.addNumberInput('Gold', obj.gold, (value) => {
                obj.gold = value;
            });
        }

        if (obj.chestType !== undefined) {
            this.addSelect('Chest Type', obj.chestType, ['wooden', 'silver', 'golden'], (value) => {
                obj.chestType = value;
            });
        }

        if (obj.targetMap !== undefined) {
            this.addTextInput('Target Map', obj.targetMap, (value) => {
                obj.targetMap = value;
            });
        }

        if (obj.spawnPoint !== undefined) {
            this.addTextInput('Spawn Point', obj.spawnPoint, (value) => {
                obj.spawnPoint = value;
            });
        }

        // Animation properties
        if (obj.animation !== undefined) {
            this.addCollapsibleSection('Animation', () => {
                const section = document.createElement('div');
                
                section.appendChild(this.createSelect('Type', obj.animation.type || 'none', 
                    ['none', 'sway', 'pulse', 'rotate'], (value) => {
                        obj.animation.type = value;
                    }));
                
                if (obj.animation.speed !== undefined) {
                    section.appendChild(this.createNumberInput('Speed', obj.animation.speed, (value) => {
                        obj.animation.speed = value;
                    }, 0.1, 0));
                }
                
                if (obj.animation.intensity !== undefined) {
                    section.appendChild(this.createNumberInput('Intensity', obj.animation.intensity, (value) => {
                        obj.animation.intensity = value;
                    }, 0.1, 0));
                }
                
                return section;
            });
        }

        // Collision properties (collapsible)
        this.addCollapsibleSection('Collision', () => {
            const section = document.createElement('div');
            
            if (obj.collisionExpandTopPercent !== undefined) {
                section.appendChild(this.createNumberInput('Top %', obj.collisionExpandTopPercent, (value) => {
                    obj.collisionExpandTopPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandBottomPercent !== undefined) {
                section.appendChild(this.createNumberInput('Bottom %', obj.collisionExpandBottomPercent, (value) => {
                    obj.collisionExpandBottomPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandLeftPercent !== undefined) {
                section.appendChild(this.createNumberInput('Left %', obj.collisionExpandLeftPercent, (value) => {
                    obj.collisionExpandLeftPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandRightPercent !== undefined) {
                section.appendChild(this.createNumberInput('Right %', obj.collisionExpandRightPercent, (value) => {
                    obj.collisionExpandRightPercent = value;
                }, 0.01, 0.01));
            }
            
            return section;
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Object';
        deleteBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            margin-top: 20px;
            background: #d32f2f;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
        `;
        deleteBtn.onclick = () => {
            if (confirm('Delete this object?')) {
                this.editor.deleteObject(obj);
            }
        };
        this.propertiesContainer.appendChild(deleteBtn);
    }

    /**
     * Hide panel
     */
    hide() {
        this.container.style.display = 'none';
        this.currentObject = null;
    }

    /**
     * Add label
     */
    addLabel(text) {
        const label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            padding: 5px;
            background: rgba(74, 158, 255, 0.2);
            border-radius: 4px;
        `;
        this.propertiesContainer.appendChild(label);
    }

    /**
     * Add number input
     */
    addNumberInput(label, value, onChange, step = 1, min = null) {
        const container = this.createNumberInput(label, value, onChange, step, min);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Create number input (reusable)
     */
    createNumberInput(label, value, onChange, step = 1, min = null) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.step = step;
        if (min !== null) input.min = min;
        input.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        input.oninput = () => onChange(parseFloat(input.value));

        container.appendChild(labelEl);
        container.appendChild(input);
        return container;
    }

    /**
     * Add text input
     */
    addTextInput(label, value, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        input.oninput = () => onChange(input.value);

        container.appendChild(labelEl);
        container.appendChild(input);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add text area
     */
    addTextArea(label, value, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const textarea = document.createElement('textarea');
        textarea.value = value || '';
        textarea.rows = 3;
        textarea.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            resize: vertical;
        `;
        textarea.oninput = () => onChange(textarea.value);

        container.appendChild(labelEl);
        container.appendChild(textarea);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add select dropdown
     */
    addSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Create select dropdown (reusable)
     */
    createSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        return container;
    }

    /**
     * Add collapsible section
     */
    addCollapsibleSection(title, contentCreator) {
        const header = document.createElement('div');
        header.textContent = '▶ ' + title;
        header.style.cssText = `
            padding: 8px;
            background: #333;
            cursor: pointer;
            border-radius: 4px;
            margin-bottom: 5px;
            user-select: none;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            display: none;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            margin-bottom: 10px;
        `;
        
        const contentEl = contentCreator();
        content.appendChild(contentEl);

        let isExpanded = false;
        header.onclick = () => {
            isExpanded = !isExpanded;
            header.textContent = (isExpanded ? '▼ ' : '▶ ') + title;
            content.style.display = isExpanded ? 'block' : 'none';
        };

        this.propertiesContainer.appendChild(header);
        this.propertiesContainer.appendChild(content);
    }
}

// Export
window.PropertyPanel = PropertyPanel;
