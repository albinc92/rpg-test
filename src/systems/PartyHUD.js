/**
 * PartyHUD — top-left overlay showing the player's spirit party.
 *
 * Uses the global DesignSystem for consistent styling:
 *   - Sharp corners (no border-radius)
 *   - Gradient panel backgrounds (#1a1a24 → #0a0a0f)
 *   - Cyan corner accents (#4a9eff)
 *   - Cinzel (display) / Lato (body) fonts
 *   - Semantic colors: success #4ade80, warning #fbbf24, danger #ef4444
 *
 * Layout (top-left, vertical):
 *   ┌───────────────────────┐
 *   │ [sprite] Sylphie Lv.5 │  ← lead spirit
 *   │ ██████████░░░  68/80  │  ← HP bar
 *   ├───────────────────────┤
 *   │ [s] Spirit2     Lv.4  │  ← bench (compact)
 *   └───────────────────────┘
 */
class PartyHUD {

    constructor(game) {
        this.game = game;

        // Layout
        this.margin = 14;
        this.panelWidth = 200;

        // Lead spirit slot
        this.leadPortraitSize = 36;
        this.leadRowH = 56;

        // Bench spirit slot
        this.benchPortraitSize = 22;
        this.benchRowH = 28;

        // HP bar
        this.hpBarW = 110;
        this.hpBarH = 5;

        // Sprite cache  { spriteKey → Image }
        this._spriteCache = {};

        // Animation
        this.hpFlashTimers = {};
    }

    _getSprite(src) {
        if (!src) return null;
        if (this._spriteCache[src]) {
            const img = this._spriteCache[src];
            return img._loaded ? img : null;
        }
        const img = new Image();
        img._loaded = false;
        img.onload = () => { img._loaded = true; };
        img.onerror = () => { img._loaded = false; };
        img.src = src;
        this._spriteCache[src] = img;
        return null;
    }

    update(deltaTime) {
        for (const id in this.hpFlashTimers) {
            this.hpFlashTimers[id] -= deltaTime;
            if (this.hpFlashTimers[id] <= 0) delete this.hpFlashTimers[id];
        }
    }

    /** @returns {DesignSystem|null} */
    get ds() { return window.ds; }

    render(ctx) {
        const pm = this.game.partyManager;
        if (!pm) return;

        const party = pm.getFullParty();
        if (!party || party.length === 0) return;

        const ds = this.ds;
        if (!ds) return;

        const x = this.margin;
        let y = this.margin;
        const pw = this.panelWidth;

        ctx.save();

        // ── Lead spirit (index 0) ──
        const lead = party[0];
        const leadH = this.leadRowH;

        // Panel via DesignSystem
        ds.drawPanel(ctx, x, y, pw, leadH, { alpha: 0.45, showCorners: true });

        // Portrait
        const ps = this.leadPortraitSize;
        const portraitX = x + 8;
        const portraitY = y + (leadH - ps) / 2;
        this._drawPortrait(ctx, lead, portraitX, portraitY, ps);

        // Name (Cinzel display font)
        const textX = portraitX + ps + 8;
        ctx.font = ds.font('xxs', 'bold', 'display');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = ds.colors.text.primary;
        ctx.fillText(lead.name || '???', textX, y + 7);

        // Level (Lato body font, muted)
        ctx.font = ds.font('tiny', 'normal', 'body');
        ctx.fillStyle = ds.colors.text.muted;
        ctx.fillText(`Lv. ${lead.level || 1}`, textX, y + 23);

        // HP bar
        const currentHP = lead.currentHP ?? lead.baseStats?.hp ?? 1;
        const maxHP = lead.baseStats?.hp ?? 1;
        const hpRatio = Math.max(0, Math.min(1, currentHP / maxHP));
        this._drawHPBar(ctx, textX, y + 38, this.hpBarW, this.hpBarH, hpRatio, currentHP, maxHP);

        y += leadH + 2;

        // ── Bench spirits (index 1+) ──
        if (party.length > 1) {
            const benchCount = party.length - 1;
            const benchH = benchCount * this.benchRowH + 6;

            // Bench panel — slightly dimmer, no corner accents
            ds.drawPanel(ctx, x, y, pw, benchH, { alpha: 0.3, showCorners: false });

            let by = y + 3;
            for (let i = 1; i < party.length; i++) {
                const spirit = party[i];
                const bps = this.benchPortraitSize;
                const bpx = x + 8;
                const bpy = by + (this.benchRowH - bps) / 2;

                // Mini portrait
                this._drawPortrait(ctx, spirit, bpx, bpy, bps);

                // Name (Lato body)
                ctx.font = ds.font('tiny', 'normal', 'body');
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = ds.colors.text.secondary;
                ctx.fillText(spirit.name || '???', bpx + bps + 6, by + this.benchRowH / 2);

                // Level — right-aligned (muted)
                ctx.font = ds.font('micro', 'normal', 'body');
                ctx.textAlign = 'right';
                ctx.fillStyle = ds.colors.text.muted;
                ctx.fillText(`Lv.${spirit.level || 1}`, x + pw - 8, by + this.benchRowH / 2);

                // HP pip — small square with semantic color
                const sHP = spirit.currentHP ?? spirit.baseStats?.hp ?? 1;
                const sMaxHP = spirit.baseStats?.hp ?? 1;
                const sRatio = Math.max(0, Math.min(1, sHP / sMaxHP));
                const pipColor = sRatio > 0.5 ? ds.colors.success
                               : sRatio > 0.2 ? ds.colors.warning
                               : ds.colors.danger;
                ctx.fillStyle = pipColor;
                ctx.fillRect(x + pw - 32, by + this.benchRowH / 2 - 2, 4, 4);

                by += this.benchRowH;
            }
        }

        ctx.restore();
    }

    // ── Portrait (sharp rect, DS tokens) ──

    _drawPortrait(ctx, spirit, x, y, size) {
        const ds = this.ds;
        const img = this._getSprite(spirit.sprite || spirit.spriteSrc);

        ctx.save();

        // Clip to sharp rect
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.clip();

        // Dark background
        ctx.fillStyle = ds.colors.alpha(ds.colors.background.elevated, 0.8);
        ctx.fillRect(x, y, size, size);

        if (img) {
            const aspect = img.width / img.height;
            let dw, dh;
            if (aspect >= 1) {
                dh = size;
                dw = size * aspect;
            } else {
                dw = size;
                dh = size / aspect;
            }
            ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
        } else {
            // Fallback — element-colored initial
            const typeColors = {
                fire: ds.colors.danger,
                water: ds.colors.primary,
                wind: ds.colors.success,
                earth: ds.colors.warning,
                light: '#f0e060',
                dark: ds.colors.rarity.epic,
                ice: ds.colors.primaryLight,
                electric: ds.colors.warning
            };
            const color = typeColors[spirit.type1] || ds.colors.text.muted;
            ctx.fillStyle = color;
            ctx.font = `${ds.typography.weights.bold} ${Math.round(size * 0.45)}px ${ds.typography.families.display}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((spirit.name || '?')[0], x + size / 2, y + size / 2 + 1);
        }

        ctx.restore();

        // Sharp border
        ctx.strokeStyle = ds.colors.alpha(ds.colors.text.primary, 0.15);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
    }

    // ── HP Bar (sharp rect, DS semantic colors) ──

    _drawHPBar(ctx, x, y, w, h, ratio, current, max) {
        const ds = this.ds;

        // Track
        ctx.fillStyle = ds.colors.alpha(ds.colors.background.overlay, 0.5);
        ctx.fillRect(x, y, w, h);

        // Fill
        const fillW = Math.max(0, w * ratio);
        if (fillW > 0) {
            const color = ratio > 0.5 ? ds.colors.success
                        : ratio > 0.2 ? ds.colors.warning
                        : ds.colors.danger;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, fillW, h);
        }

        // Track border
        ctx.strokeStyle = ds.colors.alpha(ds.colors.text.primary, 0.08);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);

        // Numeric label (muted)
        ctx.font = ds.font('micro', 'normal', 'body');
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ds.colors.text.muted;
        ctx.fillText(`${current}/${max}`, x + w + 30, y + h / 2);
    }
}

window.PartyHUD = PartyHUD;
