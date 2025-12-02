/**
 * PropertyPanel - Edit properties of selected object
 */
class PropertyPanel {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.currentObject = null;
        
        // Define theme for property panel
        this.theme = {
            primary: 'rgba(74, 158, 255, 0.8)',
            primaryLight: 'rgba(74, 158, 255, 0.2)',
            primaryDark: 'rgba(41, 128, 185, 0.4)',
            accent: '#4a9eff',
            name: 'Properties'
        };
        
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        const scale = EditorStyles.getUIScale();
        const s = (px) => `${Math.round(px * scale)}px`;
        
        this.container = document.createElement('div');
        this.container.id = 'property-panel';
        
        // Use EditorStyles for consistent look
        this.container.style.cssText = EditorStyles.getPanelStyle(this.theme);
        // Override some specific styles for property panel positioning
        this.container.style.right = s(10);
        this.container.style.top = s(70);
        this.container.style.width = s(320);
        this.container.style.maxHeight = `calc(100vh - ${s(90)})`;
        this.container.style.display = 'none';

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(this.theme);
        header.innerHTML = EditorStyles.createHeader(this.theme, 'Properties', 'Edit Object Details');
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        closeBtn.onclick = () => this.hide();
        EditorStyles.applyCloseButtonHover(closeBtn);
        
        header.appendChild(closeBtn);
        this.container.appendChild(header);

        // Properties container
        this.propertiesContainer = document.createElement('div');
        this.propertiesContainer.style.cssText = EditorStyles.getContentStyle();
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

        // Check if this is a light (has templateName and doesn't have constructor.name like GameObject)
        const isLight = obj.templateName && !obj.constructor?.name?.includes('Object');
        
        // Object type
        this.addLabel('Type: ' + (isLight ? 'Light' : obj.constructor.name));

        // Common properties
        this.addNumberInput('X', obj.x, (value) => {
            obj.x = value;
        });

        this.addNumberInput('Y', obj.y, (value) => {
            obj.y = value;
        });

        // Light-specific properties
        if (isLight) {
            this.addLabel('Template: ' + obj.templateName);
            
            this.addNumberInput('Radius', obj.radius, (value) => {
                obj.radius = value;
            }, 10, 0);
            
            // Altitude property for lights (to match floating objects)
            this.addNumberInput('Altitude', obj.altitude || 0, (value) => {
                obj.altitude = value;
                // Invalidate mask to update rendering immediately
                if (this.editor.game.lightManager) {
                    this.editor.game.lightManager.invalidateMask();
                }
            }, 1, 0);
            
            // Color inputs
            this.addLabel('Color:');
            this.addNumberInput('  Red', obj.color.r, (value) => {
                obj.color.r = Math.max(0, Math.min(255, value));
            }, 1, 0);
            this.addNumberInput('  Green', obj.color.g, (value) => {
                obj.color.g = Math.max(0, Math.min(255, value));
            }, 1, 0);
            this.addNumberInput('  Blue', obj.color.b, (value) => {
                obj.color.b = Math.max(0, Math.min(255, value));
            }, 1, 0);
            this.addNumberInput('  Alpha', obj.color.a, (value) => {
                obj.color.a = Math.max(0, Math.min(1, value));
            }, 0.1, 0);
            
            // Flicker properties
            this.addLabel('Flicker:');
            this.addCheckbox('  Enabled', obj.flicker.enabled, (value) => {
                obj.flicker.enabled = value;
                this.show(obj); // Refresh to show/hide style options
            });
            if (obj.flicker.enabled) {
                this.addDropdown('  Style', obj.flicker.style || 'smooth', [
                    { value: 'smooth', label: 'Smooth (Candle)' },
                    { value: 'harsh', label: 'Harsh (Fire/Torch)' },
                    { value: 'strobe', label: 'Strobe (Flashing)' },
                    { value: 'flicker', label: 'Flicker (Failing Bulb)' },
                    { value: 'pulse', label: 'Pulse (Slow Deep)' }
                ], (value) => {
                    obj.flicker.style = value;
                });
                this.addNumberInput('  Intensity', obj.flicker.intensity, (value) => {
                    obj.flicker.intensity = Math.max(0, Math.min(1, value));
                }, 0.05, 0);
                this.addNumberInput('  Speed', obj.flicker.speed, (value) => {
                    obj.flicker.speed = value;
                }, 0.01, 0);
            }
        } else {
            // Non-light object properties
            this.addNumberInput('Scale', obj.scale, (value) => {
                obj.scale = value;
            }, 0.1, 0.01);

            if (obj.rotation !== undefined) {
                this.addNumberInput('Rotation', obj.rotation, (value) => {
                    obj.rotation = value;
                }, 1, 0);
            }

            // Reverse facing checkbox (for all objects with sprites)
            // Initialize reverseFacing if it doesn't exist
            if (obj.reverseFacing === undefined) {
                obj.reverseFacing = false;
            }
            this.addCheckbox('Reverse Facing', obj.reverseFacing, (value) => {
                obj.reverseFacing = value;
            });

            // Sprite selector for objects that have sprites
            if (obj.spriteSrc !== undefined) {
                this.addSpriteSelector(obj);
            }
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

        // Loot list editor for chests
        if (obj.loot !== undefined) {
            this.addLootListEditor(obj);
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
            
            // Collision shape selection (radio buttons)
            const shapeGroup = document.createElement('div');
            shapeGroup.style.cssText = 'margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;';
            
            const shapeLabel = document.createElement('div');
            shapeLabel.textContent = 'Collision Shape:';
            shapeLabel.style.cssText = 'margin-bottom: 8px; font-weight: 600; color: #90caf9;';
            shapeGroup.appendChild(shapeLabel);
            
            const radioContainer = document.createElement('div');
            radioContainer.style.cssText = 'display: flex; gap: 16px;';
            
            // Rectangle radio button
            const rectangleLabel = document.createElement('label');
            rectangleLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: #e0e0e0;';
            const rectangleRadio = document.createElement('input');
            rectangleRadio.type = 'radio';
            rectangleRadio.name = 'collisionShape';
            rectangleRadio.value = 'rectangle';
            rectangleRadio.checked = obj.collisionShape === 'rectangle';
            rectangleRadio.style.cssText = 'cursor: pointer;';
            rectangleRadio.onchange = () => {
                obj.collisionShape = 'rectangle';
            };
            rectangleLabel.appendChild(rectangleRadio);
            rectangleLabel.appendChild(document.createTextNode('⬜ Square'));
            radioContainer.appendChild(rectangleLabel);
            
            // Circle radio button
            const circleLabel = document.createElement('label');
            circleLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: #e0e0e0;';
            const circleRadio = document.createElement('input');
            circleRadio.type = 'radio';
            circleRadio.name = 'collisionShape';
            circleRadio.value = 'circle';
            circleRadio.checked = (obj.collisionShape || 'circle') === 'circle';
            circleRadio.style.cssText = 'cursor: pointer;';
            circleRadio.onchange = () => {
                obj.collisionShape = 'circle';
            };
            circleLabel.appendChild(circleRadio);
            circleLabel.appendChild(document.createTextNode('⚫ Round'));
            radioContainer.appendChild(circleLabel);
            
            shapeGroup.appendChild(radioContainer);
            section.appendChild(shapeGroup);
            
            // Ignores Collision checkbox
            const ignoresCollisionContainer = document.createElement('div');
            ignoresCollisionContainer.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; gap: 8px;';
            
            const ignoresCheckbox = document.createElement('input');
            ignoresCheckbox.type = 'checkbox';
            ignoresCheckbox.checked = obj.ignoresCollision || false;
            ignoresCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
            ignoresCheckbox.onchange = () => {
                obj.ignoresCollision = ignoresCheckbox.checked;
            };
            
            const ignoresLabel = document.createElement('label');
            ignoresLabel.textContent = 'Ignores Collision';
            ignoresLabel.style.cssText = 'font-size: 12px; cursor: pointer; user-select: none;';
            ignoresLabel.onclick = () => {
                ignoresCheckbox.checked = !ignoresCheckbox.checked;
                obj.ignoresCollision = ignoresCheckbox.checked;
            };
            
            ignoresCollisionContainer.appendChild(ignoresCheckbox);
            ignoresCollisionContainer.appendChild(ignoresLabel);
            section.appendChild(ignoresCollisionContainer);
            
            // Info text about ignores collision
            const ignoresInfoText = document.createElement('div');
            ignoresInfoText.textContent = 'When checked, object passes through others but keeps collision box for z-index rendering';
            ignoresInfoText.style.cssText = 'font-size: 11px; color: #90caf9; margin-bottom: 12px; font-style: italic;';
            section.appendChild(ignoresInfoText);
            
            // Info text about oval shapes
            const infoText = document.createElement('div');
            infoText.textContent = 'Tip: Use Round + different expand % to create ovals';
            infoText.style.cssText = 'font-size: 11px; color: #90caf9; margin-bottom: 12px; font-style: italic;';
            section.appendChild(infoText);
            
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
        const scale = EditorStyles.getUIScale();
        const s = (px) => `${Math.round(px * scale)}px`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Object';
        deleteBtn.style.cssText = `
            width: 100%;
            padding: ${s(10)};
            margin-top: ${s(20)};
            background: #d32f2f;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: ${s(4)};
            font-size: ${s(14)};
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
        const scale = EditorStyles.getUIScale();
        const s = (px) => `${Math.round(px * scale)}px`;
        
        const label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = `
            font-weight: bold;
            margin-bottom: ${s(10)};
            padding: ${s(8)};
            background: ${this.theme.primaryLight};
            border-left: ${s(3)} solid ${this.theme.accent};
            border-radius: ${s(4)};
            color: #fff;
            font-size: ${s(13)};
        `;
        this.propertiesContainer.appendChild(label);
    }

    /**
     * Add dropdown select
     */
    addDropdown(label, value, options, onChange) {
        const scale = EditorStyles.getUIScale();
        const s = (px) => `${Math.round(px * scale)}px`;
        
        const container = document.createElement('div');
        container.style.cssText = EditorStyles.getListItemStyle();
        container.style.padding = s(10);
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = s(10);

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: ${s(13)};
            color: #ecf0f1;
            flex: 1;
            min-width: ${s(80)};
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            flex: 2;
            padding: ${s(6)} ${s(10)};
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: ${s(4)};
            color: #ecf0f1;
            font-size: ${s(12)};
            cursor: pointer;
        `;
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            option.style.background = '#2c3e50';
            if (opt.value === value) option.selected = true;
            select.appendChild(option);
        });
        
        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add checkbox
     */
    addCheckbox(label, value, onChange) {
        const scale = EditorStyles.getUIScale();
        const s = (px) => `${Math.round(px * scale)}px`;
        
        const container = document.createElement('div');
        container.style.cssText = EditorStyles.getListItemStyle();
        container.style.padding = s(10);

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: ${s(13)};
            cursor: pointer;
            user-select: none;
            color: #ecf0f1;
            flex: 1;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.style.cssText = `
            width: ${s(18)};
            height: ${s(18)};
            cursor: pointer;
            accent-color: ${this.theme.accent};
        `;
        
        const toggle = () => {
            checkbox.checked = !checkbox.checked;
            onChange(checkbox.checked);
        };
        
        checkbox.onchange = () => onChange(checkbox.checked);
        labelEl.onclick = toggle;
        container.onclick = (e) => {
            if (e.target !== checkbox && e.target !== labelEl) toggle();
        };

        container.appendChild(labelEl);
        container.appendChild(checkbox);
        this.propertiesContainer.appendChild(container);
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
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();

        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.step = step;
        if (min !== null) input.min = min;
        input.style.cssText = EditorStyles.getInputStyle();
        
        EditorStyles.applyInputFocus(input);
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
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.style.cssText = EditorStyles.getInputStyle();
        
        EditorStyles.applyInputFocus(input);
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
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();

        const textarea = document.createElement('textarea');
        textarea.value = value || '';
        textarea.rows = 3;
        textarea.style.cssText = EditorStyles.getInputStyle();
        textarea.style.resize = 'vertical';
        
        EditorStyles.applyInputFocus(textarea);
        textarea.oninput = () => onChange(textarea.value);

        container.appendChild(labelEl);
        container.appendChild(textarea);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add select dropdown
     */
    addSelect(label, value, options, onChange) {
        const container = this.createSelect(label, value, options, onChange);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Create select dropdown (reusable)
     */
    createSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();

        const select = document.createElement('select');
        select.style.cssText = EditorStyles.getInputStyle();
        select.style.cursor = 'pointer';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        EditorStyles.applyInputFocus(select);
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
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            cursor: pointer;
            border-radius: 6px;
            margin-bottom: 5px;
            user-select: none;
            font-weight: 600;
            color: ${this.theme.accent};
            transition: all 0.2s;
            border: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        header.onmouseover = () => header.style.background = 'rgba(255, 255, 255, 0.1)';
        header.onmouseout = () => header.style.background = 'rgba(255, 255, 255, 0.05)';

        const content = document.createElement('div');
        content.style.cssText = `
            display: none;
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            margin-bottom: 15px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        const contentEl = contentCreator();
        content.appendChild(contentEl);

        let isExpanded = false;
        header.onclick = () => {
            isExpanded = !isExpanded;
            header.textContent = (isExpanded ? '▼ ' : '▶ ') + title;
            content.style.display = isExpanded ? 'block' : 'none';
            header.style.background = isExpanded ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
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
        label.style.cssText = EditorStyles.getLabelStyle();
        label.style.marginBottom = '8px';
        label.style.display = 'block';

        // Preview and select button container
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            background: rgba(0, 0, 0, 0.2);
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        `;

        // Preview image
        const preview = document.createElement('img');
        preview.style.cssText = `
            width: 64px;
            height: 64px;
            object-fit: contain;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
        `;
        if (obj.spriteSrc) {
            preview.src = obj.spriteSrc;
        }

        // Select sprite button
        const selectBtn = document.createElement('button');
        selectBtn.textContent = '📁 Choose Sprite...';
        selectBtn.style.cssText = EditorStyles.getNewButtonStyle(this.theme);
        selectBtn.style.marginBottom = '0';
        selectBtn.style.flex = '1';
        
        selectBtn.onclick = () => {
            this.openSpritePicker(obj, (selectedPath) => {
                obj.spriteSrc = selectedPath;
                obj.loadSprite(selectedPath);
                preview.src = selectedPath;
                pathInput.value = selectedPath;
            });
        };
        EditorStyles.applyNewButtonHover(selectBtn, this.theme);

        previewContainer.appendChild(preview);
        previewContainer.appendChild(selectBtn);

        // Current sprite path display
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.value = obj.spriteSrc || '';
        pathInput.placeholder = 'assets/npc/...';
        pathInput.style.cssText = EditorStyles.getInputStyle();
        pathInput.style.width = '100%';
        pathInput.style.fontSize = '11px';
        pathInput.style.color = '#95a5a6';
        pathInput.readOnly = true;

        container.appendChild(label);
        container.appendChild(previewContainer);
        container.appendChild(pathInput);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add loot list editor
     */
    addLootListEditor(obj) {
        const container = document.createElement('div');
        container.style.marginBottom = '15px';

        const button = document.createElement('button');
        button.textContent = '📦 Loot List';
        button.style.cssText = EditorStyles.getNewButtonStyle(this.theme);
        button.onclick = () => this.openLootListModal(obj);
        EditorStyles.applyNewButtonHover(button, this.theme);

        container.appendChild(button);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Open loot list modal
     */
    openLootListModal(obj) {
        // Load items data
        const items = this.editor.game.dataLoader.getItems() || {};
        
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
            backdrop-filter: blur(5px);
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = EditorStyles.getPanelStyle(this.theme);
        modal.style.position = 'relative';
        modal.style.top = 'auto';
        modal.style.right = 'auto';
        modal.style.width = '90%';
        modal.style.maxWidth = '700px';
        modal.style.maxHeight = '80vh';

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(this.theme);
        header.innerHTML = EditorStyles.createHeader(this.theme, 'Loot List Editor', 'Manage Chest Contents');

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        closeBtn.onclick = () => overlay.remove();
        EditorStyles.applyCloseButtonHover(closeBtn);

        header.appendChild(closeBtn);

        // Content container
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = EditorStyles.getContentStyle();
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.gap = '20px';

        // Current loot section
        const currentLootSection = document.createElement('div');
        currentLootSection.style.cssText = `
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            max-height: 300px;
            overflow-y: auto;
        `;

        const currentTitle = document.createElement('h4');
        currentTitle.textContent = 'Current Loot';
        currentTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        currentTitle.style.marginTop = '0';
        currentLootSection.appendChild(currentTitle);

        // Loot grid
        const lootGrid = document.createElement('div');
        lootGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        `;

        const updateLootGrid = () => {
            lootGrid.innerHTML = '';

            if (!obj.loot || obj.loot.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No items in loot list';
                emptyMsg.style.cssText = EditorStyles.getEmptyStateStyle();
                lootGrid.appendChild(emptyMsg);
                return;
            }

            obj.loot.forEach((lootItem, index) => {
                const itemData = items[lootItem.id];
                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                `;
                itemCard.onmouseover = () => {
                    itemCard.style.borderColor = this.theme.accent;
                    itemCard.style.background = 'rgba(255, 255, 255, 0.1)';
                };
                itemCard.onmouseout = () => {
                    itemCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    itemCard.style.background = 'rgba(255, 255, 255, 0.05)';
                };

                // Item icon
                if (itemData && itemData.icon) {
                    const icon = document.createElement('img');
                    icon.src = itemData.icon;
                    icon.style.cssText = `
                        width: 48px;
                        height: 48px;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto 8px;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 4px;
                    `;
                    itemCard.appendChild(icon);
                }

                // Item name
                const name = document.createElement('div');
                name.textContent = itemData ? itemData.name : lootItem.id;
                name.style.cssText = `
                    color: #ecf0f1;
                    font-size: 12px;
                    text-align: center;
                    margin-bottom: 8px;
                    font-weight: bold;
                    font-family: 'Lato', sans-serif;
                `;
                itemCard.appendChild(name);

                // Amount control
                const amountControl = document.createElement('div');
                amountControl.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    margin-bottom: 8px;
                `;

                const createBtn = (text, onClick) => {
                    const btn = document.createElement('button');
                    btn.textContent = text;
                    btn.style.cssText = `
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: none;
                        border-radius: 3px;
                        width: 24px;
                        height: 24px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    `;
                    btn.onclick = onClick;
                    btn.onmouseover = () => btn.style.background = 'rgba(255, 255, 255, 0.2)';
                    btn.onmouseout = () => btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    return btn;
                };

                const minusBtn = createBtn('-', (e) => {
                    e.stopPropagation();
                    lootItem.amount = Math.max(1, (lootItem.amount || 1) - 1);
                    amountDisplay.textContent = lootItem.amount;
                });

                const amountDisplay = document.createElement('div');
                amountDisplay.textContent = lootItem.amount || 1;
                amountDisplay.style.cssText = `
                    color: white;
                    font-size: 14px;
                    min-width: 30px;
                    text-align: center;
                    font-weight: bold;
                `;

                const plusBtn = createBtn('+', (e) => {
                    e.stopPropagation();
                    lootItem.amount = (lootItem.amount || 1) + 1;
                    amountDisplay.textContent = lootItem.amount;
                });

                amountControl.appendChild(minusBtn);
                amountControl.appendChild(amountDisplay);
                amountControl.appendChild(plusBtn);
                itemCard.appendChild(amountControl);

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️ Remove';
                deleteBtn.style.cssText = EditorStyles.getDeleteButtonStyle();
                deleteBtn.style.width = '100%';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    obj.loot.splice(index, 1);
                    updateLootGrid();
                };
                EditorStyles.applyDeleteButtonHover(deleteBtn);
                itemCard.appendChild(deleteBtn);

                lootGrid.appendChild(itemCard);
            });
        };

        currentLootSection.appendChild(lootGrid);

        // Available items section
        const availableSection = document.createElement('div');
        availableSection.style.cssText = `
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            flex: 1;
            overflow-y: auto;
        `;

        const availableTitle = document.createElement('h4');
        availableTitle.textContent = 'Add Items';
        availableTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        availableTitle.style.marginTop = '0';
        availableSection.appendChild(availableTitle);

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search items...';
        searchBox.style.cssText = EditorStyles.getInputStyle();
        searchBox.style.width = '100%';
        searchBox.style.marginBottom = '15px';
        availableSection.appendChild(searchBox);

        // Items grid
        const itemsGrid = document.createElement('div');
        itemsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
        `;

        const renderAvailableItems = (filter = '') => {
            itemsGrid.innerHTML = '';
            const filterLower = filter.toLowerCase();

            Object.values(items).forEach(item => {
                // Filter items
                if (filter && !item.name.toLowerCase().includes(filterLower) && 
                    !item.id.toLowerCase().includes(filterLower)) {
                    return;
                }

                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                `;
                itemCard.onmouseover = () => {
                    itemCard.style.borderColor = this.theme.accent;
                    itemCard.style.background = 'rgba(255, 255, 255, 0.1)';
                };
                itemCard.onmouseout = () => {
                    itemCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    itemCard.style.background = 'rgba(255, 255, 255, 0.05)';
                };
                itemCard.onclick = () => {
                    if (!obj.loot) obj.loot = [];
                    obj.loot.push({ id: item.id, amount: 1 });
                    updateLootGrid();
                };

                // Item icon
                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.src = item.icon;
                    icon.style.cssText = `
                        width: 48px;
                        height: 48px;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto 8px;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 4px;
                    `;
                    itemCard.appendChild(icon);
                }

                // Item name
                const name = document.createElement('div');
                name.textContent = item.name;
                name.style.cssText = `
                    color: #ecf0f1;
                    font-size: 11px;
                    word-break: break-word;
                    font-family: 'Lato', sans-serif;
                `;
                itemCard.appendChild(name);

                itemsGrid.appendChild(itemCard);
            });
        };

        searchBox.oninput = () => renderAvailableItems(searchBox.value);
        EditorStyles.applyInputFocus(searchBox);
        availableSection.appendChild(itemsGrid);

        // Assemble modal
        contentContainer.appendChild(currentLootSection);
        contentContainer.appendChild(availableSection);
        modal.appendChild(header);
        modal.appendChild(contentContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Initial render
        updateLootGrid();
        renderAvailableItems();

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
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
            backdrop-filter: blur(5px);
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = EditorStyles.getPanelStyle(this.theme);
        modal.style.position = 'relative';
        modal.style.top = 'auto';
        modal.style.right = 'auto';
        modal.style.width = '90%';
        modal.style.maxWidth = '800px';
        modal.style.maxHeight = '80vh';

        // Determine object type and filter sprites accordingly
        const objectType = obj.constructor.name;
        const spritesByType = {
            'NPC': [
                'assets/npc/merchant-0.png',
                'assets/npc/sage-0.png',
                'assets/npc/main-0.png',
            ],
            'Spirit': [
                'assets/npc/Spirits/sylphie.png',
                'assets/npc/Spirits/nythra.png',
            ],
            'Chest': [
                'assets/npc/chest-0.png',
                'assets/npc/chest-0-open.png',
            ],
            'Portal': [
                'assets/npc/door-0.png',
                'assets/npc/navigation-0.png',
            ],
            'StaticObject': [
                'assets/objects/trees/tree-01.png',
                'assets/objects/trees/tree-02.png',
                'assets/objects/bushes/bush-01.png',
                'assets/objects/rocks/rock-01.png',
                'assets/objects/rocks/rock-02.png',
            ],
            'InteractiveObject': [
                'assets/npc/sign-0.png',
                'assets/npc/chest-0.png',
                'assets/npc/door-0.png',
            ],
        };

        // Get sprites for this object type, or show all if type not found
        let availableSprites = spritesByType[objectType] || [];
        
        // If no specific sprites found, show all as fallback
        if (availableSprites.length === 0) {
            availableSprites = Object.values(spritesByType).flat();
        }

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(this.theme);
        header.innerHTML = EditorStyles.createHeader(this.theme, `Select Sprite (${objectType})`, 'Choose Visual Appearance');

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        closeBtn.onclick = () => overlay.remove();
        EditorStyles.applyCloseButtonHover(closeBtn);

        header.appendChild(closeBtn);

        // Filter toggle section
        const filterSection = document.createElement('div');
        filterSection.style.cssText = `
            padding: 15px 20px;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 15px;
        `;

        const filterLabel = document.createElement('span');
        filterLabel.textContent = 'Filter:';
        filterLabel.style.cssText = EditorStyles.getLabelStyle();

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = `✓ ${objectType} Only`;
        toggleBtn.style.cssText = `
            padding: 8px 16px;
            background: ${this.theme.primary};
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        `;

        let showingFiltered = true;
        toggleBtn.onclick = () => {
            showingFiltered = !showingFiltered;
            toggleBtn.textContent = showingFiltered ? `✓ ${objectType} Only` : '📋 Show All';
            toggleBtn.style.background = showingFiltered ? this.theme.primary : 'rgba(255, 255, 255, 0.1)';
            
            // Rebuild grid with new filter
            grid.innerHTML = '';
            const spritesToShow = showingFiltered ? 
                (spritesByType[objectType] || Object.values(spritesByType).flat()) : 
                Object.values(spritesByType).flat();
            
            createSpriteCards(spritesToShow);
        };

        filterSection.appendChild(filterLabel);
        filterSection.appendChild(toggleBtn);

        // Sprite grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = EditorStyles.getContentStyle();

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 15px;
        `;

        // Function to create sprite cards
        const createSpriteCards = (spritePaths) => {
            spritePaths.forEach(spritePath => {
            const card = document.createElement('div');
            const isSelected = obj.spriteSrc === spritePath;
            
            card.style.cssText = `
                background: ${isSelected ? 'rgba(74, 158, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
                border: 2px solid ${isSelected ? this.theme.accent : 'rgba(255, 255, 255, 0.1)'};
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
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            `;

            const name = document.createElement('div');
            name.textContent = spritePath.split('/').pop().replace('.png', '');
            name.style.cssText = `
                color: #ecf0f1;
                font-size: 11px;
                text-align: center;
                word-break: break-word;
                font-family: 'Lato', sans-serif;
            `;

            card.appendChild(img);
            card.appendChild(name);

            card.onmouseover = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    card.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            };
            card.onmouseout = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    card.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            };
            card.onclick = () => {
                onSelect(spritePath);
                overlay.remove();
            };

            grid.appendChild(card);
            });
        };

        // Initial sprite card creation
        createSpriteCards(availableSprites);

        gridContainer.appendChild(grid);
        modal.appendChild(header);
        modal.appendChild(filterSection);
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
