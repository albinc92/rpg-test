# Template Property Preservation Fix

## Problem
When placing objects through the placement tool, collision box settings and other template properties were being lost. For example:
- **Oak Tree**: Template has `collisionExpandTopPercent: -0.90` but placed object had full collision box
- **Spirits**: Template collision shapes and percentages not applied to placed objects

## Root Cause

### Cherry-Picking Properties
The `createPrefabData()` method was manually copying only specific properties:

**Doodads (Before Fix):**
```javascript
case 'doodads':
    return {
        category: 'StaticObject',
        spriteSrc: template.spriteSrc,    // ✓ Copied
        name: template.name,               // ✓ Copied
        scale: template.scale || 1.0,      // ✓ Copied
        castsShadow: template.castsShadow, // ✓ Copied
        templateId: template.id            // ✓ Copied
        // ❌ Missing: collisionExpandTopPercent
        // ❌ Missing: collisionExpandBottomPercent
        // ❌ Missing: collisionExpandLeftPercent
        // ❌ Missing: collisionExpandRightPercent
        // ❌ Missing: swaysInWind
        // ❌ Missing: objectCategory
    };
```

**Spirits (Before Fix):**
```javascript
case 'spirits':
    return {
        category: 'Actor',
        actorType: 'spirit',
        spriteSrc: template.spriteSrc,     // ✓ Copied
        name: template.name,                // ✓ Copied
        scale: template.scale || 0.2,       // ✓ Copied
        templateId: template.id             // ✓ Copied
        // ❌ Missing: hasCollision
        // ❌ Missing: collisionShape
        // ❌ Missing: collisionPercent
        // ❌ Missing: collisionExpandTopPercent
        // ❌ Missing: collisionExpandBottomPercent
        // ❌ Missing: collisionExpandLeftPercent
        // ❌ Missing: collisionExpandRightPercent
        // ❌ Missing: isFloating
        // ❌ Missing: stats
        // ❌ Missing: moveSpeed
        // ❌ Missing: movePattern
        // ❌ Missing: description
    };
```

### Impact
1. **Collision boxes wrong**: Full collision instead of adjusted collision
2. **Visual effects lost**: Wind sway, floating animation, etc.
3. **Stats missing**: Spirit HP, attack, defense not applied
4. **Behavior lost**: Movement patterns, speeds not set

## Solution

Use the spread operator to include ALL template properties:

```javascript
case 'spirits':
    return {
        category: 'Actor',
        actorType: 'spirit',
        ...template,      // ✅ Include ALL template properties
        templateId: template.id
    };
    
case 'doodads':
    return {
        category: 'StaticObject',
        ...template,      // ✅ Include ALL template properties
        templateId: template.id
    };
```

## Template Properties by Type

### Doodad Template Properties
```javascript
{
    name: 'Oak Tree',
    objectCategory: 'tree',
    spriteSrc: '/assets/objects/trees/tree-01.png',
    scale: 1.0,
    collisionExpandTopPercent: -0.90,      // ✅ Now preserved
    collisionExpandBottomPercent: 0,        // ✅ Now preserved
    collisionExpandRightPercent: -0.25,     // ✅ Now preserved
    collisionExpandLeftPercent: -0.25,      // ✅ Now preserved
    castsShadow: false,                     // ✅ Now preserved
    swaysInWind: true                       // ✅ Now preserved
}
```

### Spirit Template Properties
```javascript
{
    id: 'forest_sprite',
    name: 'Sylphie',
    spriteSrc: '/assets/npc/Spirits/sylphie.png',
    scale: 0.075,
    hasCollision: true,                     // ✅ Now preserved
    collisionShape: 'circle',               // ✅ Now preserved
    collisionPercent: 1,                    // ✅ Now preserved
    collisionExpandTopPercent: -0.75,       // ✅ Now preserved
    collisionExpandBottomPercent: 0,        // ✅ Now preserved
    collisionExpandLeftPercent: 0,          // ✅ Now preserved
    collisionExpandRightPercent: 0,         // ✅ Now preserved
    isFloating: true,                       // ✅ Now preserved
    stats: { hp: 50, attack: 12, ... },    // ✅ Now preserved
    moveSpeed: 2.5,                         // ✅ Now preserved
    movePattern: 'wander',                  // ✅ Now preserved
    description: '...'                      // ✅ Now preserved
}
```

## How It Works Now

### Before Fix - Lost Properties
```javascript
// Template
{
    name: 'Oak Tree',
    scale: 1.0,
    collisionExpandTopPercent: -0.90,
    collisionExpandLeftPercent: -0.25,
    swaysInWind: true
}

// Prefab created (missing properties!)
{
    category: 'StaticObject',
    name: 'Oak Tree',
    scale: 1.0,
    castsShadow: false
    // Missing: collision properties, swaysInWind
}

// Placed object uses defaults
- Full collision box (no expansion percentages)
- No wind sway
```

### After Fix - All Properties Preserved
```javascript
// Template
{
    name: 'Oak Tree',
    scale: 1.0,
    collisionExpandTopPercent: -0.90,
    collisionExpandLeftPercent: -0.25,
    swaysInWind: true
}

// Prefab created (all properties included!)
{
    category: 'StaticObject',
    name: 'Oak Tree',
    scale: 1.0,
    collisionExpandTopPercent: -0.90,  ✅
    collisionExpandLeftPercent: -0.25,  ✅
    swaysInWind: true,                  ✅
    castsShadow: false,
    templateId: 'Oak Tree'
}

// Placed object uses correct settings
- Collision box adjusted by expansion percentages ✅
- Wind sway enabled ✅
```

## Visual Differences

### Oak Tree Collision
**Before:** 
```
┌─────────────┐
│             │  Full collision box
│   🌳 Tree   │  (sprite sized)
│             │
└─────────────┘
```

**After:**
```
     🌳 Tree      -90% top (no collision on leaves)
       │
     ┌─┴─┐        Only trunk has collision
     │   │        -25% left/right (narrow trunk)
     └───┘
```

### Spirit Collision (Circle)
**Before:**
```
    ┌───────┐
   │         │    Full circle collision
   │   👻    │    (entire sprite)
   │         │
    └───────┘
```

**After (Sylphie with -75% top):**
```
       👻         -75% top (no collision on head)
       
      ╱ ╲        Smaller circle at bottom
     │   │       (body only)
      ╲ ╱
```

## Testing Checklist

### Doodad Collision
- [ ] Place Oak Tree
- [ ] Select it and view collision box in editor
- [ ] **Collision should be narrow at trunk** (not full sprite width)
- [ ] **Top 90% should have no collision** (not including leaves)

### Spirit Collision
- [ ] Place Sylphie spirit
- [ ] Select it and view collision shape
- [ ] **Should be circle shape** (not rectangle)
- [ ] **Top 75% should have reduced collision** (head area)

### Visual Effects
- [ ] Place Oak Tree
- [ ] **Tree should sway in wind** (if wind system active)
- [ ] Place spirit with `isFloating: true`
- [ ] **Spirit should have floating animation**

### Stats and Behavior
- [ ] Place spirit
- [ ] Spirit should have proper HP/stats from template
- [ ] Spirit should follow movement pattern (wander/etc)

## Property Validation

### Console Logs to Check
```javascript
// After placing Oak Tree
console.log('[EditorManager] Creating object with data:', objectData);

// Should show:
{
    category: 'StaticObject',
    name: 'Oak Tree',
    objectCategory: 'tree',
    spriteSrc: '/assets/objects/trees/tree-01.png',
    scale: 1.0,
    collisionExpandTopPercent: -0.9,     // ✅ Present
    collisionExpandBottomPercent: 0,      // ✅ Present
    collisionExpandRightPercent: -0.25,   // ✅ Present
    collisionExpandLeftPercent: -0.25,    // ✅ Present
    castsShadow: false,
    swaysInWind: true,                    // ✅ Present
    templateId: 'Oak Tree'
}
```

## Other Object Types

This fix also applies to NPCs, Chests, and Portals if they use templates with additional properties:

```javascript
case 'npcs':
    return {
        category: 'Actor',
        actorType: 'npc',
        spriteSrc: '/assets/npc/main-0.png',
        name: template.name,
        npcType: template.npcType,
        dialogue: 'Hello!',
        scale: 0.15
        // Consider: Should also use ...template if NPCs have collision properties
    };
```

## Best Practice

**Use spread operator first, then override specific values:**

```javascript
return {
    category: 'Actor',
    actorType: 'spirit',
    ...template,              // All template properties
    templateId: template.id,  // Add templateId
    // Override defaults if needed:
    // scale: template.scale || 0.2
};
```

This ensures:
1. All template properties are preserved
2. Required properties are added
3. Defaults can be overridden if template doesn't specify

## Related Systems

- **GameObject.js**: Reads collision properties during initialization
- **StaticObjectRegistry.js**: Stores doodad templates with collision settings
- **SpiritRegistry.js**: Stores spirit templates with collision and behavior
- **EditorManager.js**: Renders collision boxes in editor preview
- **CollisionSystem**: Uses collision properties for gameplay

## Future Improvements

- [ ] Validate template properties against schema
- [ ] Show collision preview in placement tool cursor
- [ ] Add collision property editor in template browsers
- [ ] Visual indicators for wind sway, floating, etc. in placement tool
- [ ] Template property inheritance/defaults system
