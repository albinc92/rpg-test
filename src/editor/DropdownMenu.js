/**
 * DropdownMenu - Reusable dropdown menu component for editor
 */
class DropdownMenu {
    constructor(label, items) {
        this.label = label;
        this.items = items; // Array of { label, action, items (for submenu), separator, disabled }
        this.isOpen = false;
        this.container = null;
        this.button = null;
        this.menu = null;
        this.activeSubmenu = null;
        
        this.createUI();
    }

    /**
     * Get scale from EditorStyles cached value
     */
    getScale() {
        return EditorStyles._cachedScale || 1.0;
    }

    /**
     * Scale a pixel value
     */
    scaled(px) {
        return Math.round(px * this.getScale());
    }

    /**
     * Get scaled px string
     */
    scaledPx(px) {
        return `${this.scaled(px)}px`;
    }

    /**
     * Apply scale to this dropdown (called by EditorUI)
     */
    applyScale(scale) {
        // Update button
        if (this.button) {
            this.button.style.padding = `${this.scaledPx(8)} ${this.scaledPx(16)}`;
            this.button.style.fontSize = this.scaledPx(14);
            this.button.style.borderRadius = this.scaledPx(6);
            this.button.style.gap = this.scaledPx(8);
        }
        
        // Update menu container
        if (this.menu) {
            this.menu.style.minWidth = this.scaledPx(220);
            this.menu.style.borderRadius = this.scaledPx(8);
            this.menu.style.padding = `${this.scaledPx(6)} 0`;
            this.menu.style.top = `calc(100% + ${this.scaledPx(4)})`;
            
            // Update all menu items
            this.updateMenuItemsScale(this.menu);
        }
    }
    
    /**
     * Update scale for all menu items in a container
     */
    updateMenuItemsScale(container) {
        const menuItems = container.children;
        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            
            // Check if it's a separator
            if (item.style.height === '1px') {
                item.style.margin = `${this.scaledPx(6)} 0`;
            } else {
                // It's a menu item
                item.style.padding = `${this.scaledPx(10)} ${this.scaledPx(16)}`;
                item.style.fontSize = this.scaledPx(14);
                item.style.margin = `0 ${this.scaledPx(4)}`;
                item.style.borderRadius = this.scaledPx(4);
                
                // Update label container gap
                const labelContainer = item.querySelector('span[style*="display: flex"]');
                if (labelContainer) {
                    labelContainer.style.gap = this.scaledPx(10);
                }
                
                // Update shortcut styling
                const shortcut = item.querySelector('span[style*="margin-left: 20px"]');
                if (shortcut) {
                    shortcut.style.marginLeft = this.scaledPx(20);
                    shortcut.style.fontSize = this.scaledPx(11);
                    shortcut.style.padding = `${this.scaledPx(2)} ${this.scaledPx(6)}`;
                    shortcut.style.borderRadius = this.scaledPx(3);
                }
                
                // Update submenu arrow
                const arrow = item.querySelector('span[style*="padding-left: 12px"]');
                if (arrow) {
                    arrow.style.paddingLeft = this.scaledPx(12);
                }
                
                // Update nested submenus
                const submenu = item.querySelector('div[style*="position: absolute"]');
                if (submenu) {
                    submenu.style.borderRadius = this.scaledPx(8);
                    submenu.style.minWidth = this.scaledPx(200);
                    submenu.style.padding = `${this.scaledPx(6)} 0`;
                    submenu.style.marginLeft = this.scaledPx(8);
                    submenu.style.top = this.scaledPx(-4);
                    this.updateMenuItemsScale(submenu);
                }
            }
        }
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        // Create button
        this.button = document.createElement('button');
        this.button.style.cssText = `
            background: transparent;
            color: #ecf0f1;
            border: 1px solid transparent;
            padding: ${this.scaledPx(8)} ${this.scaledPx(16)};
            cursor: pointer;
            border-radius: ${this.scaledPx(6)};
            font-size: ${this.scaledPx(14)};
            font-family: 'Lato', sans-serif;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: ${this.scaledPx(8)};
        `;
        
        // Add label text
        const labelSpan = document.createElement('span');
        labelSpan.textContent = this.label;
        this.button.appendChild(labelSpan);
        
        // Add dropdown arrow
        const arrow = document.createElement('span');
        arrow.textContent = '▾';
        arrow.style.fontSize = '10px';
        this.button.appendChild(arrow);

        // Button hover effects
        this.button.onmouseover = () => {
            if (!this.isOpen) {
                this.button.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        };
        this.button.onmouseout = () => {
            if (!this.isOpen) {
                this.button.style.background = 'transparent';
            }
        };
        this.button.onclick = (e) => {
            e.stopPropagation();
            this.toggle();
        };

        // Create dropdown menu
        this.menu = document.createElement('div');
        this.menu.style.cssText = `
            position: absolute;
            top: calc(100% + ${this.scaledPx(4)});
            left: 0;
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid rgba(74, 158, 255, 0.3);
            border-radius: ${this.scaledPx(8)};
            min-width: ${this.scaledPx(220)};
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
            z-index: 10000;
            display: none;
            padding: ${this.scaledPx(6)} 0;
            animation: fadeIn 0.2s ease-out;
        `;
        
        // Add animation style
        if (!document.getElementById('dropdown-animation')) {
            const style = document.createElement('style');
            style.id = 'dropdown-animation';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        // Add menu items
        this.items.forEach((item, index) => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 6px 0;
                `;
                this.menu.appendChild(separator);
            } else {
                const menuItem = this.createMenuItem(item);
                this.menu.appendChild(menuItem);
            }
        });

        this.container.appendChild(this.button);
        this.container.appendChild(this.menu);

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    /**
     * Create a menu item
     */
    createMenuItem(item) {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: ${this.scaledPx(10)} ${this.scaledPx(16)};
            cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
            color: ${item.disabled ? '#666' : '#ecf0f1'};
            font-size: ${this.scaledPx(14)};
            font-family: 'Lato', sans-serif;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            margin: 0 ${this.scaledPx(4)};
            border-radius: ${this.scaledPx(4)};
        `;

        // Store reference to item for updates
        menuItem._item = item;

        // Create label container with checkmark
        const labelContainer = document.createElement('span');
        labelContainer.style.cssText = `display: flex; align-items: center; gap: ${this.scaledPx(10)};`;
        
        // Add checkmark if item is checkable and checked
        const checkmark = document.createElement('span');
        checkmark.textContent = '✓';
        checkmark.style.cssText = `
            display: ${item.checked ? 'inline' : 'none'};
            color: #4a9eff;
            font-weight: bold;
            width: 12px;
            font-size: 12px;
        `;
        checkmark.className = 'menu-checkmark';
        labelContainer.appendChild(checkmark);
        
        // Create label with icon
        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        labelContainer.appendChild(labelSpan);
        
        menuItem.appendChild(labelContainer);

        // Add keyboard shortcut if present
        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.textContent = item.shortcut;
            shortcutSpan.style.cssText = `
                color: #7f8c8d;
                font-size: 11px;
                margin-left: 20px;
                background: rgba(255, 255, 255, 0.05);
                padding: 2px 6px;
                border-radius: 3px;
            `;
            menuItem.appendChild(shortcutSpan);
        }

        // Add submenu indicator
        if (item.items) {
            const submenuArrow = document.createElement('span');
            submenuArrow.textContent = '▸';
            submenuArrow.style.cssText = `
                margin-left: auto;
                padding-left: 12px;
                color: #95a5a6;
            `;
            menuItem.appendChild(submenuArrow);

            // Create submenu
            const submenu = this.createSubmenu(item.items);
            menuItem.appendChild(submenu);

            // Show submenu on hover
            menuItem.onmouseenter = () => {
                if (!item.disabled) {
                    this.closeAllSubmenus();
                    submenu.style.display = 'block';
                    this.activeSubmenu = submenu;
                }
            };
        }

        // Hover effect
        if (!item.disabled) {
            menuItem.onmouseover = () => {
                menuItem.style.background = 'rgba(74, 158, 255, 0.15)';
                menuItem.style.color = '#fff';
                if (!item.items) {
                    this.closeAllSubmenus();
                }
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'transparent';
                menuItem.style.color = '#ecf0f1';
            };
        }

        // Click action
        if (!item.disabled && !item.items) {
            menuItem.onclick = (e) => {
                e.stopPropagation();
                if (item.action) {
                    item.action();
                }
                this.close();
            };
        }

        return menuItem;
    }

    /**
     * Create submenu
     */
    createSubmenu(items) {
        const submenu = document.createElement('div');
        submenu.style.cssText = `
            position: absolute;
            left: 100%;
            top: -4px;
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid rgba(74, 158, 255, 0.3);
            border-radius: 8px;
            min-width: 200px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
            display: none;
            z-index: 10001;
            padding: 6px 0;
            margin-left: 8px;
        `;

        items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 6px 0;
                `;
                submenu.appendChild(separator);
            } else {
                const submenuItem = this.createSubmenuItem(item);
                submenu.appendChild(submenuItem);
            }
        });

        return submenu;
    }

    /**
     * Create submenu item
     */
    createSubmenuItem(item) {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: 10px 16px;
            cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
            color: ${item.disabled ? '#666' : '#ecf0f1'};
            font-size: 14px;
            font-family: 'Lato', sans-serif;
            transition: all 0.2s;
            white-space: nowrap;
            margin: 0 4px;
            border-radius: 4px;
        `;

        menuItem.textContent = item.label;

        if (!item.disabled) {
            menuItem.onmouseover = () => {
                menuItem.style.background = 'rgba(74, 158, 255, 0.15)';
                menuItem.style.color = '#fff';
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'transparent';
                menuItem.style.color = '#ecf0f1';
            };

            menuItem.onclick = (e) => {
                e.stopPropagation();
                if (item.action) {
                    item.action();
                }
                this.close();
            };
        }

        return menuItem;
    }

    /**
     * Close all submenus
     */
    closeAllSubmenus() {
        const submenus = this.menu.querySelectorAll('div[style*="position: absolute"]');
        submenus.forEach(submenu => {
            submenu.style.display = 'none';
        });
        this.activeSubmenu = null;
    }

    /**
     * Toggle dropdown
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open dropdown
     */
    open() {
        // Close all other dropdowns first (mutually exclusive)
        if (window.editorDropdowns) {
            window.editorDropdowns.forEach(dropdown => {
                if (dropdown !== this) {
                    dropdown.close();
                }
            });
        }
        
        // Apply current scale (in case settings changed since last open)
        this.applyScale();
        
        this.isOpen = true;
        this.menu.style.display = 'block';
        this.button.style.background = 'rgba(74, 158, 255, 0.2)';
        this.button.style.color = '#4a9eff';
    }

    /**
     * Close dropdown
     */
    close() {
        this.isOpen = false;
        this.menu.style.display = 'none';
        this.button.style.background = 'transparent';
        this.button.style.color = '#ecf0f1';
        this.closeAllSubmenus();
    }

    /**
     * Get DOM element
     */
    getElement() {
        return this.container;
    }

    /**
     * Update menu items
     */
    updateItems(items) {
        this.items = items;
        this.menu.innerHTML = '';
        
        this.items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 6px 0;
                `;
                this.menu.appendChild(separator);
            } else {
                const menuItem = this.createMenuItem(item);
                this.menu.appendChild(menuItem);
            }
        });
    }

    /**
     * Update checkmarks for menu items
     */
    updateCheckmarks() {
        const menuItems = this.menu.querySelectorAll('div[style*="padding: 10px"]');
        menuItems.forEach(menuItem => {
            if (menuItem._item && menuItem._item.checked !== undefined) {
                const checkmark = menuItem.querySelector('.menu-checkmark');
                if (checkmark) {
                    checkmark.style.display = menuItem._item.checked ? 'inline' : 'none';
                }
            }
        });
    }
}

// Export
window.DropdownMenu = DropdownMenu;
