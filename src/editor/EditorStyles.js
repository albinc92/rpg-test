/**
 * EditorStyles.js
 * Standardized styling and theming for all template editors
 * Provides consistent look and feel across NPC, Chest, Portal, Light, and other editors
 */

class EditorStyles {
    // Global cached scale value - set once by EditorUI when settings change
    static _cachedScale = 1.0;
    static _gameRef = null;
    
    /**
     * Set the global game reference for scaling
     * Called by EditorUI when editor is initialized or settings change
     * @param {Object} game - Game instance
     */
    static setGame(game) {
        EditorStyles._gameRef = game;
        EditorStyles.updateCachedScale();
    }
    
    /**
     * Update the cached scale value from settings
     * Call this when UI scale setting changes
     */
    static updateCachedScale() {
        const game = EditorStyles._gameRef;
        const userScale = (game?.settingsManager?.settings?.uiScale || 100) / 100;
        EditorStyles._cachedScale = userScale;
    }
    
    /**
     * Get the UI scale factor based on user settings
     * UI Scale is absolute - 100% means 1.0x regardless of OS display scaling
     * @param {Object} game - Game instance to read settings from (optional, uses cached if not provided)
     * @returns {number} Scale factor to multiply base pixel values by
     */
    static getUIScale(game = null) {
        // If game is explicitly provided, use it
        if (game) {
            const userScale = (game?.settingsManager?.settings?.uiScale || 100) / 100;
            return userScale;
        }
        // Otherwise use cached scale
        return EditorStyles._cachedScale;
    }

    /**
     * Scale a pixel value according to UI scale
     * @param {number} px - Base pixel value
     * @param {Object} game - Game instance (optional)
     * @returns {number} Scaled pixel value
     */
    static scaled(px, game = null) {
        return Math.round(px * EditorStyles.getUIScale(game));
    }

    /**
     * Get a scaled CSS value with 'px' suffix
     * @param {number} px - Base pixel value
     * @param {Object} game - Game instance (optional)
     * @returns {string} Scaled value with 'px' suffix
     */
    static scaledPx(px, game = null) {
        return `${EditorStyles.scaled(px, game)}px`;
    }

    /**
     * Color themes for different editor types
     */
    static THEMES = {
        npc: {
            primary: 'rgba(46, 204, 113, 0.8)',
            primaryLight: 'rgba(46, 204, 113, 0.2)',
            primaryDark: 'rgba(39, 174, 96, 0.4)',
            accent: '#2ecc71',
            name: 'NPC'
        },
        chest: {
            primary: 'rgba(243, 156, 18, 0.8)',
            primaryLight: 'rgba(243, 156, 18, 0.2)',
            primaryDark: 'rgba(211, 84, 0, 0.4)',
            accent: '#f39c12',
            name: 'Chest'
        },
        portal: {
            primary: 'rgba(155, 89, 182, 0.8)',
            primaryLight: 'rgba(155, 89, 182, 0.2)',
            primaryDark: 'rgba(142, 68, 173, 0.4)',
            accent: '#9b59b6',
            name: 'Portal'
        },
        light: {
            primary: 'rgba(241, 196, 15, 0.8)',
            primaryLight: 'rgba(241, 196, 15, 0.2)',
            primaryDark: 'rgba(243, 156, 18, 0.4)',
            accent: '#f1c40f',
            name: 'Light'
        },
        spirit: {
            primary: 'rgba(52, 152, 219, 0.8)',
            primaryLight: 'rgba(52, 152, 219, 0.2)',
            primaryDark: 'rgba(41, 128, 185, 0.4)',
            accent: '#3498db',
            name: 'Spirit'
        },
        doodad: {
            primary: 'rgba(149, 165, 166, 0.8)',
            primaryLight: 'rgba(149, 165, 166, 0.2)',
            primaryDark: 'rgba(127, 140, 141, 0.4)',
            accent: '#95a5a6',
            name: 'Doodad'
        }
    };

    /**
     * Get panel style for editor
     */
    static getPanelStyle(theme, game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            position: fixed;
            right: ${s(20)};
            top: ${s(80)};
            width: ${s(380)};
            max-height: 85vh;
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid ${theme.primary};
            border-radius: ${s(12)};
            padding: 0;
            color: #ecf0f1;
            font-family: 'Lato', sans-serif;
            font-size: ${s(14)};
            box-shadow: 0 ${s(10)} ${s(40)} rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
            display: flex;
            flex-direction: column;
            z-index: 9999;
            pointer-events: auto;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
    }

    /**
     * Get header style for editor
     */
    static getHeaderStyle(theme, game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            padding: ${s(16)} ${s(24)};
            background: linear-gradient(135deg, ${theme.primaryLight}, rgba(0,0,0,0));
            border-bottom: 1px solid rgba(255,255,255,0.1);
            border-radius: ${s(12)} ${s(12)} 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    }

    /**
     * Get content area style
     */
    static getContentStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            overflow-y: auto;
            flex: 1;
            padding: ${s(20)};
            pointer-events: auto;
            overscroll-behavior: contain;
        `;
    }

    /**
     * Get close button style
     */
    static getCloseButtonStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            background: transparent;
            border: none;
            color: #e74c3c;
            font-size: ${s(20)};
            width: ${s(32)};
            height: ${s(32)};
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
    }

    /**
     * Get new button style
     */
    static getNewButtonStyle(theme, game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            width: 100%;
            padding: ${s(12)};
            background: ${theme.primaryLight};
            border: 1px solid ${theme.primary};
            border-radius: ${s(8)};
            color: ${theme.accent};
            cursor: pointer;
            font-weight: 700;
            margin-bottom: ${s(20)};
            font-size: ${s(14)};
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
    }

    /**
     * Get list item style
     */
    static getListItemStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            padding: ${s(14)};
            margin-bottom: ${s(10)};
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: ${s(8)};
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    }

    /**
     * Get edit button style
     */
    static getEditButtonStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            background: rgba(52, 152, 219, 0.15);
            border: 1px solid rgba(52, 152, 219, 0.3);
            color: #3498db;
            padding: ${s(6)} ${s(14)};
            border-radius: ${s(6)};
            cursor: pointer;
            font-size: ${s(12)};
            font-weight: 600;
            transition: all 0.2s;
        `;
    }

    /**
     * Get delete button style
     */
    static getDeleteButtonStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            background: rgba(231, 76, 60, 0.15);
            border: 1px solid rgba(231, 76, 60, 0.3);
            color: #e74c3c;
            padding: ${s(6)} ${s(14)};
            border-radius: ${s(6)};
            cursor: pointer;
            font-size: ${s(12)};
            font-weight: 600;
            transition: all 0.2s;
        `;
    }

    /**
     * Get form field container style
     */
    static getFieldContainerStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            display: flex;
            flex-direction: column;
            gap: ${s(6)};
            margin-bottom: ${s(16)};
        `;
    }

    /**
     * Get form label style
     */
    static getLabelStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            font-size: ${s(12)};
            color: #95a5a6;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
    }

    /**
     * Get form input style
     */
    static getInputStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            padding: ${s(10)} ${s(12)};
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: ${s(6)};
            color: #ecf0f1;
            font-size: ${s(14)};
            font-family: 'Lato', sans-serif;
            transition: all 0.2s;
            outline: none;
        `;
    }

    /**
     * Get section title style
     */
    static getSectionTitleStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            font-weight: 700;
            color: #fff;
            margin-top: ${s(24)};
            margin-bottom: ${s(12)};
            font-size: ${s(16)};
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: ${s(8)};
        `;
    }

    /**
     * Get save button style
     */
    static getSaveButtonStyle(theme, game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            flex: 1;
            padding: ${s(12)};
            background: ${theme.primary};
            border: none;
            border-radius: ${s(6)};
            color: #fff;
            cursor: pointer;
            font-weight: 700;
            font-size: ${s(14)};
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 ${s(4)} ${s(12)} rgba(0,0,0,0.2);
        `;
    }

    /**
     * Get cancel button style
     */
    static getCancelButtonStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            flex: 1;
            padding: ${s(12)};
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: ${s(6)};
            color: #bdc3c7;
            cursor: pointer;
            font-weight: 600;
            font-size: ${s(14)};
            transition: all 0.2s;
        `;
    }

    /**
     * Get empty state style
     */
    static getEmptyStateStyle(game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            padding: ${s(40)} ${s(20)};
            text-align: center;
            color: #7f8c8d;
            background: rgba(0, 0, 0, 0.2);
            border-radius: ${s(8)};
            border: 1px dashed rgba(255, 255, 255, 0.1);
            margin: ${s(10)} 0;
            font-size: ${s(14)};
        `;
    }

    /**
     * Create standardized header HTML
     */
    static createHeader(theme, title, subtitle, game = null) {
        const s = (px) => EditorStyles.scaledPx(px, game);
        return `
            <div>
                <h3 style="margin: 0; font-size: ${s(20)}; font-weight: 700; color: ${theme.accent}; font-family: 'Cinzel', serif;">${title}</h3>
                <div style="font-size: ${s(12)}; color: #bdc3c7; margin-top: ${s(4)};">${subtitle}</div>
            </div>
        `;
    }

    /**
     * Apply hover effect to button
     */
    static applyButtonHover(button, hoverColor, normalColor) {
        button.onmouseover = () => button.style.background = hoverColor;
        button.onmouseout = () => button.style.background = normalColor;
    }

    /**
     * Apply hover effect to close button
     */
    static applyCloseButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(231, 76, 60, 0.2)';
            button.style.transform = 'rotate(90deg)';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.transform = 'rotate(0deg)';
        };
    }

    /**
     * Apply hover effect to new button
     */
    static applyNewButtonHover(button, theme) {
        button.onmouseover = () => {
            button.style.background = theme.primary;
            button.style.color = '#fff';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = `0 4px 12px ${theme.primaryDark}`;
        };
        button.onmouseout = () => {
            button.style.background = theme.primaryLight;
            button.style.color = theme.accent;
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
    }

    /**
     * Apply hover effect to edit button
     */
    static applyEditButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(52, 152, 219, 0.3)';
            button.style.borderColor = '#3498db';
        };
        button.onmouseout = () => {
            button.style.background = 'rgba(52, 152, 219, 0.15)';
            button.style.borderColor = 'rgba(52, 152, 219, 0.3)';
        };
    }

    /**
     * Apply hover effect to delete button
     */
    static applyDeleteButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(231, 76, 60, 0.3)';
            button.style.borderColor = '#e74c3c';
        };
        button.onmouseout = () => {
            button.style.background = 'rgba(231, 76, 60, 0.15)';
            button.style.borderColor = 'rgba(231, 76, 60, 0.3)';
        };
    }

    /**
     * Apply hover effect to save button
     */
    static applySaveButtonHover(button, theme) {
        button.onmouseover = () => {
            button.style.filter = 'brightness(1.1)';
            button.style.transform = 'translateY(-1px)';
        };
        button.onmouseout = () => {
            button.style.filter = 'brightness(1)';
            button.style.transform = 'translateY(0)';
        };
    }

    /**
     * Apply hover effect to cancel button
     */
    static applyCancelButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.color = '#fff';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.color = '#bdc3c7';
        };
    }

    /**
     * Apply focus effect to input
     */
    static applyInputFocus(input) {
        input.onfocus = () => {
            input.style.borderColor = '#3498db';
            input.style.background = 'rgba(0, 0, 0, 0.5)';
        };
        input.onblur = () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            input.style.background = 'rgba(0, 0, 0, 0.3)';
        };
    }
}

// Make globally available
window.EditorStyles = EditorStyles;
