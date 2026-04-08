/**
 * HUDIconBar — bottom-center icon strip showing available hotkeys.
 *
 * Each icon is a canvas-drawn glyph inside a rounded rectangle
 * with a hotkey badge below the icon box.
 * Icons pulse briefly on press for feedback.
 *
 * Layout (bottom-center):  [🎒]  [⚙]  [🗺]  [👁]
 *                            I     M    Tab    N
 */
class HUDIconBar {

    constructor(game) {
        this.game = game;

        // Icon definitions — order = left→right
        this.icons = [
            { id: 'inventory', glyph: 'bag',   key: 'I',   action: 'inventory', tooltip: 'Inventory' },
            { id: 'menu',      glyph: 'gear',  key: 'M',   action: 'menu',      tooltip: 'Menu' },
            { id: 'map',       glyph: 'map',   key: 'Tab', action: 'map',       tooltip: 'World Map' },
            { id: 'minimap',   glyph: 'eye',   key: 'N',   action: 'minimap',   tooltip: 'Minimap' },
        ];

        // Layout — larger icons, hotkey badge BELOW the box
        this.iconSize = 44;        // icon box size (was 28)
        this.iconGap  = 10;        // gap between boxes
        this.bottomMargin = 18;    // distance from canvas bottom to hotkey text bottom
        this.badgeGap = 4;         // gap between icon box bottom and hotkey text

        // Animation
        this.pressTimers = {}; // id → remaining flash time
    }

    /** Call when an action fires so the icon flashes */
    flash(actionId) {
        this.pressTimers[actionId] = 0.25; // seconds
    }

    update(deltaTime) {
        for (const id in this.pressTimers) {
            this.pressTimers[id] -= deltaTime;
            if (this.pressTimers[id] <= 0) delete this.pressTimers[id];
        }
    }

    render(ctx) {
        const canvasW = this.game.CANVAS_WIDTH;
        const canvasH = this.game.CANVAS_HEIGHT;
        const s = this.iconSize;
        const totalW = this.icons.length * s + (this.icons.length - 1) * this.iconGap;

        // Center horizontally, anchor to bottom
        const badgeH = 12; // approx height of hotkey text
        const startX = (canvasW - totalW) / 2;
        const boxY = canvasH - this.bottomMargin - badgeH - this.badgeGap - s;

        ctx.save();

        let x = startX;
        for (const icon of this.icons) {
            const isFlashing = this.pressTimers[icon.action] > 0;
            const bgAlpha = isFlashing ? 0.55 : 0.28;
            const borderAlpha = isFlashing ? 0.7 : 0.3;

            // Background box
            ctx.beginPath();
            this._roundRect(ctx, x, boxY, s, s, 8);
            ctx.fillStyle = `rgba(15, 18, 28, ${bgAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(180, 190, 215, ${borderAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Glyph — centered in the box, no overlap with key
            ctx.save();
            const cx = x + s / 2;
            const cy = boxY + s / 2;
            const glyphAlpha = isFlashing ? 0.95 : 0.65;
            ctx.fillStyle = `rgba(220, 225, 240, ${glyphAlpha})`;
            ctx.strokeStyle = `rgba(220, 225, 240, ${glyphAlpha})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._drawGlyph(ctx, icon.glyph, cx, cy, s * 0.36);
            ctx.restore();

            // Hotkey badge — BELOW the box, separate from glyph
            ctx.font = 'bold 11px "Lato", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = `rgba(170, 180, 200, ${isFlashing ? 0.9 : 0.5})`;
            ctx.fillText(icon.key, cx, boxY + s + this.badgeGap);

            x += s + this.iconGap;
        }

        ctx.restore();
    }

    // ── Glyph drawing ──

    _drawGlyph(ctx, glyph, cx, cy, r) {
        switch (glyph) {
            case 'bag':   this._drawBag(ctx, cx, cy, r); break;
            case 'gear':  this._drawGear(ctx, cx, cy, r); break;
            case 'map':   this._drawMap(ctx, cx, cy, r); break;
            case 'eye':   this._drawEye(ctx, cx, cy, r); break;
        }
    }

    /** Backpack / bag icon */
    _drawBag(ctx, cx, cy, r) {
        // Bag body (trapezoid-ish rounded rect)
        const w = r * 1.5, h = r * 1.6;
        const bx = cx - w / 2, by = cy - h / 2 + r * 0.2;
        ctx.beginPath();
        this._roundRect(ctx, bx, by, w, h, 3);
        ctx.stroke();
        // Flap
        ctx.beginPath();
        ctx.moveTo(bx + 2, by);
        ctx.lineTo(bx + w - 2, by);
        ctx.stroke();
        // Handle (arc on top)
        ctx.beginPath();
        ctx.arc(cx, by - 1, w * 0.28, Math.PI, 0);
        ctx.stroke();
        // Buckle
        ctx.beginPath();
        ctx.arc(cx, by + h * 0.35, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Gear / cog icon */
    _drawGear(ctx, cx, cy, r) {
        const inner = r * 0.45;
        const outer = r * 0.85;
        const teeth = 6;
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
            const a1 = (i / teeth) * Math.PI * 2 - Math.PI / 2;
            const a2 = a1 + (Math.PI / teeth) * 0.5;
            const a3 = a1 + (Math.PI / teeth);
            const a4 = a1 + (Math.PI / teeth) * 1.5;
            ctx.lineTo(cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer);
            ctx.lineTo(cx + Math.cos(a2) * outer, cy + Math.sin(a2) * outer);
            ctx.lineTo(cx + Math.cos(a3) * inner * 1.2, cy + Math.sin(a3) * inner * 1.2);
            ctx.lineTo(cx + Math.cos(a4) * inner * 1.2, cy + Math.sin(a4) * inner * 1.2);
        }
        ctx.closePath();
        ctx.stroke();
        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Folded map icon */
    _drawMap(ctx, cx, cy, r) {
        const w = r * 1.7, h = r * 1.4;
        const lx = cx - w / 2, ly = cy - h / 2;
        // Three panels (folded map)
        const thirdW = w / 3;
        ctx.beginPath();
        ctx.moveTo(lx, ly + 2);
        ctx.lineTo(lx + thirdW, ly);
        ctx.lineTo(lx + thirdW * 2, ly + 2);
        ctx.lineTo(lx + w, ly);
        ctx.lineTo(lx + w, ly + h);
        ctx.lineTo(lx + thirdW * 2, ly + h - 2);
        ctx.lineTo(lx + thirdW, ly + h);
        ctx.lineTo(lx, ly + h - 2);
        ctx.closePath();
        ctx.stroke();
        // Fold lines
        ctx.beginPath();
        ctx.moveTo(lx + thirdW, ly);
        ctx.lineTo(lx + thirdW, ly + h);
        ctx.moveTo(lx + thirdW * 2, ly + 2);
        ctx.lineTo(lx + thirdW * 2, ly + h - 2);
        ctx.stroke();
        // X marker
        const mx = cx + r * 0.15, my = cy - r * 0.05;
        ctx.beginPath();
        ctx.moveTo(mx - 2, my - 2);
        ctx.lineTo(mx + 2, my + 2);
        ctx.moveTo(mx + 2, my - 2);
        ctx.lineTo(mx - 2, my + 2);
        ctx.stroke();
    }

    /** Eye icon (minimap toggle) */
    _drawEye(ctx, cx, cy, r) {
        // Eye outline
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.7, cx, cy - r * 0.55);
        ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.7, cx + r, cy);
        ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.7, cx, cy + r * 0.55);
        ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.7, cx - r, cy);
        ctx.closePath();
        ctx.stroke();
        // Iris
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Utility ──

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// Export
window.HUDIconBar = HUDIconBar;
