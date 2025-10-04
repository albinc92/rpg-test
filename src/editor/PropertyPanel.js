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

        // Sprite selector for objects that have sprites
        if (obj.spriteSrc !== undefined) {
            this.addSpriteSelector(obj);
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

    /**
     * Add sprite selector
     */
    addSpriteSelector(obj) {
        const container = document.createElement('div');
        container.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.textContent = 'Sprite';
        label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
            font-weight: bold;
        `;

        // Preview and select button container
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        `;

        // Preview image
        const preview = document.createElement('img');
        preview.style.cssText = `
            width: 64px;
            height: 64px;
            object-fit: contain;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        if (obj.spriteSrc) {
            preview.src = obj.spriteSrc;
        }

        // Select sprite button
        const selectBtn = document.createElement('button');
        selectBtn.textContent = '📁 Choose Sprite...';
        selectBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        selectBtn.onclick = () => {
            this.openSpritePicker(obj, (selectedPath) => {
                obj.spriteSrc = selectedPath;
                obj.loadSprite(selectedPath);
                preview.src = selectedPath;
                pathInput.value = selectedPath;
            });
        };
        selectBtn.onmouseover = () => selectBtn.style.background = '#5aafff';
        selectBtn.onmouseout = () => selectBtn.style.background = '#4a9eff';

        previewContainer.appendChild(preview);
        previewContainer.appendChild(selectBtn);

        // Current sprite path display
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.value = obj.spriteSrc || '';
        pathInput.placeholder = 'assets/npc/...';
        pathInput.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: #888;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 11px;
        `;
        pathInput.readOnly = true;

        container.appendChild(label);
        container.appendChild(previewContainer);
        container.appendChild(pathInput);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Open sprite picker modal
     */
    openSpritePicker(obj, onSelect) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
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
            max-width: 800px;
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
        title.textContent = 'Select Sprite';
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

        // Sprite grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 15px;
        `;

        // Available sprite paths
        const availableSprites = [
            'assets/npc/merchant-0.png',
            'assets/npc/sage-0.png',
            'assets/npc/main-0.png',
            'assets/npc/chest-0.png',
            'assets/npc/chest-0-open.png',
            'assets/npc/door-0.png',
            'assets/npc/navigation-0.png',
            'assets/npc/sign-0.png',
            'assets/npc/Spirits/Sylphie00.png',
        ];

        // Create sprite cards
        availableSprites.forEach(spritePath => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #2a2a2a;
                border: 2px solid ${obj.spriteSrc === spritePath ? '#4a9eff' : '#444'};
                border-radius: 8px;
                padding: 10px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;

            const img = document.createElement('img');
            img.src = spritePath;
            img.style.cssText = `
                width: 64px;
                height: 64px;
                object-fit: contain;
                background: #1a1a1a;
                border-radius: 4px;
            `;

            const name = document.createElement('div');
            name.textContent = spritePath.split('/').pop().replace('.png', '');
            name.style.cssText = `
                color: white;
                font-size: 11px;
                text-align: center;
                word-break: break-word;
            `;

            card.appendChild(img);
            card.appendChild(name);

            card.onmouseover = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = '#666';
                    card.style.background = '#333';
                }
            };
            card.onmouseout = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = '#444';
                    card.style.background = '#2a2a2a';
                }
            };
            card.onclick = () => {
                onSelect(spritePath);
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
window.PropertyPanel = PropertyPanel;
