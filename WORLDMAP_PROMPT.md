# World Map Texture Generation Prompt

Copy the prompt below into Grok / ChatGPT image generation.

---

## Prompt

Generate a top-down fantasy world map texture at **4096×4096** resolution. This is a **terrain texture only** — no labels, text, icons, markers, roads, buildings, or UI elements. No grid lines. Pure painted terrain viewed from directly above, like a satellite image of a fantasy continent.

The map should depict a single large landmass (continent) surrounded by deep ocean at the edges. The continent fills roughly 80% of the canvas. Use natural, organic region boundaries — no sharp geometric divisions. Regions should blend and transition into each other at their borders with natural-looking biome gradients.

### Layout — 7 Regions arranged as follows:

```
        NW (Wind)      N (Ice)      NE (Lightning)
              ╲           │           ╱
                ── CENTER (Neutral) ──
              ╱           │           ╲
        SW (Water)     S (Fire)     SE (Earth)
```

**CENTER — Neutral Capital Region (~12% of land area)**
Flat, open grassland and gentle plains at the exact center of the map. Simple temperate terrain — short green grass, mild rolling hills, scattered wildflower patches. This is the neutral heartland where all elements meet. No dense forests, no mountains, no extreme terrain — just calm, welcoming open fields. Colors: medium greens (#6C8E48 to #88B258), light grass (#A8C878), soft wheat tones (#C8C088). A major river passes through this region. This is where the capital city will be placed later (don't render any city or structures).

**NORTH — Ice Region (~15% of land area)**
Frozen tundra, glaciers, snow-covered plains, and frozen lakes. Jagged ice cliffs and permafrost wastelands. The northernmost reaches of the continent. Transitions from snowy foothills near the center to solid white glacial sheets and pack ice at the far north edge. Frozen rivers, frost-cracked earth, and icy windswept barrens. Colors: whites (#D4DCE6), pale blues (#A8E6FF), icy grays (#94A0AE). The coldest, most inhospitable part of the map.

**SOUTH — Fire Region (~15% of land area)**  
A volcanic hellscape. Massive volcanic peaks (the largest at the far south), rivers of glowing lava, fields of black basalt and obsidian, and cracked scorched earth venting sulfurous gas. Ash-covered wastelands between volcanic cones. Transitions from arid, heat-cracked terrain near the center to actively erupting volcanic terrain at the southern edge. Colors: deep reds (#8B2500), charred blacks (#2A1A1A), molten oranges (#FF6B35), ash grays (#4A4040). Lava rivers glow bright orange-red. No vegetation survives here.

**NORTHEAST — Lightning Region (~13% of land area)**
Dense, towering tropical rainforest. Thick jungle canopy with massive ancient trees, tangled undergrowth, and a perpetually humid, storm-drenched atmosphere. This is the most lightning-struck region on the continent — the terrain should look lush, dark green, and overgrown. Winding rivers cut through the jungle floor. Occasional clearings reveal dark, waterlogged soil. Colors: deep jungle greens (#1A4A1A to #2A5A2A), dark canopy (#1A3A12), muddy browns (#3A3020), dark teal (#2A4A3A). Dense, claustrophobic vegetation everywhere.

**NORTHWEST — Wind Region (~13% of land area)**
Dramatic high mountain peaks and alpine ridges. Towering rocky summits with exposed cliff faces, windswept rocky plateaus, and high-altitude passes. Snow dusts only the very highest peaks but this is not a frozen region — it's rugged exposed stone and alpine meadows between the peaks. Steep valleys and dramatic elevation changes visible through shading. Colors: stone grays (#7C7870, #8A8A8A), blue-gray rock (#6A7080), touches of alpine green (#5A7A4A) in valleys, and exposed bedrock browns (#6A5A4A). The wind howls through these peaks.

**SOUTHEAST — Earth Region (~13% of land area)**
Arid desert and badlands. Sun-baked cracked earth, sand dunes, red-rock mesa formations, deep dry canyons, and eroded sandstone arches. Sparse scrubland clings to life in dry riverbeds. The terrain is layered — exposed sedimentary rock in canyon walls showing bands of red, orange, and tan. Occasional small oases with a patch of green around a water source. Colors: warm sand (#D4B878), red-rock (#A0603A), burnt orange (#C47830), dry earth brown (#8B6914), bleached tan (#E0D0A8). Hot, dry, and ancient.

**SOUTHWEST — Water Region (~13% of land area)**
Murky swampland and wetlands. Dark, still water pools surrounded by dense marsh grass, cypress-like trees emerging from shallow water, moss-covered dead trees, and boggy terrain. Winding waterways and bayous thread through the region. The ground is perpetually waterlogged — muddy banks, peat bogs, and flooded lowlands. A labyrinth of channels and islands. Colors: murky dark water (#2A4A3A to #3A5A4A), swamp greens (#4A6A3A), muddy browns (#4A3A2A), dark moss (#3A4A2A), stagnant blue-green (#3A5A5A). Humid, mysterious, and perpetually damp.

### Ocean
Deep ocean surrounds the entire continent. Colors: dark blue (#1A3A5A) to very dark (#0A1A2A) at the edges. The ocean should be visible on all four sides of the map.

### Key Requirements
- **Top-down satellite view** — no perspective, no horizon, no 3D angle
- **No text, labels, icons, or markers of any kind**
- **No buildings, cities, roads, or man-made structures**  
- **Natural, organic transitions** between regions (no hard lines)
- **Painterly/hand-drawn fantasy map style** with visible terrain texture detail
- **Rivers** should be thin, visible blue lines connecting regions — at least 4-5 major rivers flowing from mountains/ice toward swamps/lakes
- **The center region should feel like a natural crossroads** where all surrounding biomes gently meet
- Ensure enough **color contrast between regions** that they are clearly distinguishable
- The overall shape should be a **roughly circular or organic blob** continent, not a perfect square

---

## Reference: How This Map Will Be Used

The generated image will be programmatically analyzed by dividing it into a **30×30 grid** (900 cells). Each cell's average color determines its biome classification:

| Biome | Trigger Colors | Element |
|-------|---------------|---------|
| snow | Very bright, low saturation (brightness >210) | Ice |
| tundra | Bright, low saturation (brightness >195) | Ice |
| frozen-peak | Icy blue-white, very high altitude feel | Ice |
| volcanic | Dark reds, blacks, orange lava veins | Fire |
| arid-desert | Warm dark, scorched earth (r>g>b) | Fire |
| mountain | Gray, low saturation (brightness <140) | Wind |
| high-mountain | Lighter gray, alpine rock (brightness 120-170) | Wind |
| desert | Warm bright sand (r>g>b, brightness >180) | Earth |
| badlands | Red-orange rock, dry canyons | Earth |
| oasis | Green patch in desert/earth tones | Earth |
| swamp | Dark murky green-brown, waterlogged (brightness <120) | Water |
| lake | Strong blue dominance (b > r+25) | Water |
| river-valley | Blue-green with some green | Water |
| jungle | Very dark green, dense canopy (brightness <100) | Lightning |
| dense-forest | Dark green, saturated (brightness <80) | Lightning |
| rainforest | Deep lush green, dark teal | Lightning |
| grassland | Medium green (brightness 135-160) | Neutral |
| plains | Light tan/yellow-green (brightness >150) | Neutral |
| meadow | Very light green (brightness 150-170) | Neutral |

Ensure each region has enough distinct area (multiple cells worth) to be detected as a coherent zone at 30×30 resolution.

---

## Image Generation Prompt (copy this into Grok / ChatGPT)

Top-down fantasy world map texture, satellite view looking straight down. A single large organic-shaped continent surrounded by deep dark ocean. No text, no labels, no icons, no buildings, no roads, no markers of any kind. Pure terrain texture only, painterly hand-drawn fantasy style with rich detail.

The continent has 7 distinct biome regions with natural blended transitions between them:

CENTER: Open green grassland and gentle plains, the neutral heartland. Calm temperate fields, mild rolling hills, soft greens and wheat tones. A river passes through.

NORTH: Frozen icy tundra and glaciers. Snow-covered plains, frozen lakes, jagged ice cliffs. Pure whites, pale blues, icy grays. Gets more frozen toward the top edge.

SOUTH: Volcanic hellscape. Massive volcanic peaks, rivers of glowing orange-red lava, black basalt fields, cracked scorched earth, ash-covered wastelands. Deep reds, charred blacks, molten orange. The largest volcano sits at the far south.

NORTHWEST: Towering mountain peaks and alpine ridges. Rugged exposed gray stone, steep cliff faces, high-altitude passes, windswept rocky plateaus. Some alpine green in valleys. No snow except the very tallest peaks.

NORTHEAST: Dense dark tropical rainforest. Thick jungle canopy, massive ancient trees, tangled undergrowth, winding rivers cutting through the jungle floor. Very dark greens, deep teal, claustrophobic dense vegetation.

SOUTHEAST: Arid desert and badlands. Sun-baked cracked earth, sand dunes, red-rock mesas, dry canyons with layered sedimentary walls. Warm sandy tans, burnt orange, red-rock. Occasional tiny green oasis patches.

SOUTHWEST: Dark murky swampland. Still dark water pools, marsh grass, moss-covered dead trees emerging from shallow water, boggy waterlogged terrain, winding bayous and channels. Murky dark greens, muddy browns, stagnant blue-green water.

Thin blue rivers connect the regions, flowing from mountains and ice toward swamps and lakes. The center grassland feels like a natural crossroads where all biomes gently meet. Strong color contrast between regions so each is clearly distinct. The continent fills about 80 percent of the image with ocean visible on all sides.
