/**
 * HUDIconBar — bottom-center icon strip showing available hotkeys.
 *
 * Uses the global DesignSystem for consistent styling:
 *   - Sharp corners (no border-radius)
 *   - Gradient panel backgrounds (#1a1a24 → #0a0a0f)
 *   - Cyan corner accents (#4a9eff)
 *   - Cinzel / Lato fonts
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

        // Layout
        this.iconSize = 44;
        this.iconGap  = 6;
        this.bottomMargin = 20;
        this.badgeGap = 4;

        // Animation
        this.pressTimers = {};
    }

    /** @returns {DesignSystem|null} */
    get ds() { return window.ds; }

    flash(actionId) {
        this.pressTimers[actionId] = 0.25;
    }

    update(deltaTime) {
        for (const id in this.pressTimers) {
            this.pressTimers[id] -= deltaTime;
            if (this.pressTimers[id] <= 0) delete this.pressTimers[id];
        }
    }

    render(ctx) {
        const ds = this.ds;
        if (!ds) return;

        const W = this.game.CANVAS_WIDTH;
        const H = this.game.CANVAS_HEIGHT;
        const s = this.iconSize;
        const totalW = this.icons.length * s + (this.icons.length - 1) * this.iconGap;
        const badgeH = 14;
        const startX = (W - totalW) / 2;
        const boxY = H - this.bottomMargin - badgeH - this.badgeGap - s;

        ctx.save();

        let x = startX;
        for (const icon of this.icons) {
            const active = this.pressTimers[icon.action] > 0;
            const cx = x + s / 2;

            // ── Panel via DesignSystem ──
            ds.drawPanel(ctx, x, boxY, s, s, {
                alpha: active ? 0.6 : 0.35,
                showCorners: active,
                borderColor: active ? ds.colors.primaryAlpha(0.5) : null
            });

            // ── Glyph ──
            ctx.save();
            const glyphColor = active
                ? ds.colors.primary
                : ds.colors.alpha(ds.colors.text.secondary, 0.6);
            ctx.fillStyle = glyphColor;
            ctx.strokeStyle = glyphColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._drawGlyph(ctx, icon.glyph, cx, boxY + s / 2, s * 0.34);
            ctx.restore();

            // ── Hotkey badge (below box) ──
            ctx.font = ds.font('xxs', 'semibold', 'body');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = active
                ? ds.colors.primary
                : ds.colors.alpha(ds.colors.text.muted, 0.7);
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

    _drawBag(ctx, cx, cy, r) {
        const w = r * 1.5, h = r * 1.6;
        const bx = cx - w / 2, by = cy - h / 2 + r * 0.2;
        // Body
        ctx.strokeRect(bx, by, w, h);
        // Flap line
        ctx.beginPath();
        ctx.moveTo(bx + 2, by);
        ctx.lineTo(bx + w - 2, by);
        ctx.stroke();
        // Handle
        ctx.beginPath();
        ctx.arc(cx, by - 1, w * 0.28, Math.PI, 0);
        ctx.stroke();
        // Buckle
        ctx.beginPath();
        ctx.arc(cx, by + h * 0.35, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

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
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawMap(ctx, cx, cy, r) {
        const w = r * 1.7, h = r * 1.4;
        const lx = cx - w / 2, ly = cy - h / 2;
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
        ctx.beginPath();
        ctx.moveTo(lx + thirdW, ly);
        ctx.lineTo(lx + thirdW, ly + h);
        ctx.moveTo(lx + thirdW * 2, ly + 2);
        ctx.lineTo(lx + thirdW * 2, ly + h - 2);
        ctx.stroke();
        // X marker
        const mx = cx + r * 0.15, my = cy - r * 0.05;
        ctx.beginPath();
        ctx.moveTo(mx - 2, my - 2); ctx.lineTo(mx + 2, my + 2);
        ctx.moveTo(mx + 2, my - 2); ctx.lineTo(mx - 2, my + 2);
        ctx.stroke();
    }

    _drawEye(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.7, cx, cy - r * 0.55);
        ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.7, cx + r, cy);
        ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.7, cx, cy + r * 0.55);
        ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.7, cx - r, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.HUDIconBar = HUDIconBar;
