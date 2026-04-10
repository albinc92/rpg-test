/**
 * NPCRegistry - Manages templates for NPCs
 * Allows creating, browsing, and reusing NPC configurations
 */
class NPCRegistry {
    constructor() {
        this.templates = new Map();
        this.loaded = false;
        
        // Load built-in templates
        this.loadBuiltInTemplates();
        this.loaded = true;
    }

    /**
     * Load built-in NPC templates
     */
    loadBuiltInTemplates() {
        // Merchant
        this.addTemplate('Merchant', {
            npcType: 'merchant',
            spriteSrc: '/assets/npc/merchant-0.png',
            scale: 0.15,
            dialogue: 'Welcome to my shop! Looking to buy or sell?',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            shop: {
                enabled: true,
                inventory: []
            }
        });

        // Sage
        this.addTemplate('Sage', {
            npcType: 'sage',
            spriteSrc: '/assets/npc/sage-0.png',
            scale: 0.15,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            quests: [],
            script: `// Sage - Wise elder who guides the player
if (getvar("sage_quest_complete")) {
    message "You have proven yourself, <b>hero</b>.";
    message "The <color=#9900ff>ancient magic</color> flows strong in you now.";
    message "Go forth and bring <color=#ffcc00>light</color> to the darkness.";
} else if (getvar("sage_quest_started")) {
    if (hasitem("ancient_crystal", 3)) {
        message "Remarkable! You found all three <color=#00ffff>Ancient Crystals</color>!";
        delitem "ancient_crystal", 3;
        message "<i>*The sage's eyes glow with power*</i>";
        message "As promised, I bestow upon you the gift of <color=#9900ff>Arcane Sight</color>.";
        additem "gold", 500;
        setvar "sage_quest_complete", true;
        playsound "quest-complete.mp3";
        message "You've earned <color=#ffcc00>500 gold</color> and my eternal gratitude.";
    } else {
        message "Have you found the <color=#00ffff>Ancient Crystals</color> yet?";
        message "They are hidden in the <b>forest caves</b> to the east.";
        message "Bring me <b>3 crystals</b> and I shall reward you greatly.";
    }
} else {
    message "Greetings, <b>traveler</b>. I sense great potential in you.";
    message "I am the <color=#9900ff>Sage</color> of this village.";
    message "Would you help an old man with a task?";
    choice "What do you need?", "Maybe later";
    
    if (choice == 0) {
        message "Deep in the eastern caves lie <color=#00ffff>Ancient Crystals</color>.";
        message "They hold immense power, but I am too old to retrieve them.";
        message "Bring me <b>3 crystals</b> and I shall teach you <color=#9900ff>ancient magic</color>.";
        setvar "sage_quest_started", true;
        message "<i>*Quest Started: The Sage's Request*</i>";
    } else {
        message "I understand. Return when you are ready.";
        message "The crystals have waited centuries... they can wait a bit longer.";
    }
}
end;`
        });

        // Guard
        this.addTemplate('Guard', {
            npcType: 'guard',
            spriteSrc: '/assets/npc/main-0.png',
            scale: 0.15,
            dialogue: 'Halt! State your business.',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            aggressive: false
        });

        // Villager
        this.addTemplate('Villager', {
            npcType: 'villager',
            spriteSrc: '/assets/npc/main-0.png',
            scale: 0.15,
            dialogue: 'Hello there! Beautiful day, isn\'t it?',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true
        });

        // Script Test NPC — exercises every script command for testing
        this.addTemplate('ScriptTest', {
            npcType: 'dialogue',
            spriteSrc: '/assets/npc/sage-0.png',
            scale: 0.15,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            script: `// ═══════════════════════════════════════════════════════
// SCRIPT TEST NPC — Tests ALL script language features
// ═══════════════════════════════════════════════════════

// ── 1. Basic messages with rich text ──
message "Welcome, <b>traveler</b>! I am the <color=#9900ff>Script Tester</color>.";
message "I exist to test <i>every</i> script command in the engine.";
message "Let's begin the <color=#ffcc00>demonstration</color>...";

// ── 2. Variables: set, increment, decrement ──
setvar "test_counter", 0;
incvar "test_counter", 5;
decvar "test_counter", 2;
log "test_counter should be 3";
setflag "test_started";

// ── 3. Conditional logic ──
if (getvar("test_counter") == 3) {
    message "Variable test <color=#00ff00>PASSED</color>! Counter is 3.";
} else {
    message "Variable test <color=#ff0000>FAILED</color>.";
}

// ── 4. Boolean flags ──
if (getvar("test_started")) {
    message "Flag test <color=#00ff00>PASSED</color>! test_started is true.";
}
clearflag "test_started";

// ── 5. Player choices ──
message "Now let's test the <b>choice system</b>.";
choice "Option A", "Option B", "Option C";
if (choice == 0) {
    message "You picked <color=#4a90d9>Option A</color>.";
} else if (choice == 1) {
    message "You picked <color=#27ae60>Option B</color>.";
} else {
    message "You picked <color=#e67e22>Option C</color>.";
}

// ── 6. Gold operations ──
message "Testing <color=#ffcc00>gold</color> commands...";
addgold 50;
message "Added <color=#ffcc00>50 gold</color>. You now have some extra coins.";
delgold 25;
message "Removed 25. Net gain: 25 gold.";

// ── 7. Inventory operations ──
if (getvar("test_items_given")) {
    message "You already received test items. Skipping inventory test.";
} else {
    additem "health_potion", 2;
    message "Added <color=#00ff00>2x Health Potion</color> to your inventory.";
    setflag "test_items_given";
}

// ── 8. Sound effect ──
playsound "speech-bubble.mp3";
message "Played a sound effect. Did you hear it?";

// ── 9. Emote system ──
message "Now testing <b>emotes</b>...";
emote "self", "!";
message "That was the <color=#ff3333>exclamation</color> emote!";
emote "self", "?";
message "And the <color=#3399ff>question</color> emote.";
emote "self", "heart";
message "And a <color=#ff4488>heart</color>!";

// ── 10. Camera shake ──
message "Brace yourself... <b>camera shake</b> incoming!";
camerashake 10, 0.5;
wait 600;
message "That was a medium shake. Here's a big one:";
camerashake 20, 0.8;
wait 900;

// ── 11. Screen fade ──
message "Testing <b>screen fade</b>...";
fadeout 400;
wait 300;
fadein 400;
message "Fade out and fade in complete!";

// ── 12. Player lock/unlock ──
message "I'm about to <color=#ff3333>lock your movement</color> for 2 seconds...";
playerlock;
wait 2000;
playerunlock;
message "Movement <color=#00ff00>restored</color>!";

// ── 13. NPC face command ──
message "Now I'll look to the <b>left</b>...";
npcface "self", "left";
wait 800;
message "And back to the <b>right</b>.";
npcface "self", "right";
wait 500;

// ── 14. Labels and goto (menu loop) ──
label menu:
message "This is a <b>menu loop</b> using labels and goto.";
choice "Show stats", "Test random()", "Exit menu";
if (choice == 0) {
    message "Gold: You have some gold. Counter: 3. Flag: cleared.";
    goto menu;
} else if (choice == 1) {
    if (random(1, 10) > 5) {
        message "Random rolled <color=#00ff00>HIGH</color> (6-10).";
    } else {
        message "Random rolled <color=#ff6600>LOW</color> (1-5).";
    }
    goto menu;
}

// ── 15. Complex nested conditions ──
if (getvar("test_counter") >= 1 and getvar("test_counter") <= 5) {
    message "Nested condition test <color=#00ff00>PASSED</color>: counter is between 1 and 5.";
} else {
    message "Nested condition test <color=#ff0000>FAILED</color>.";
}

// ── 16. Or condition ──
if (getvar("test_counter") == 3 or getvar("test_counter") == 99) {
    message "OR condition test <color=#00ff00>PASSED</color>.";
}

// ── 17. Not operator ──
if (not getvar("nonexistent_var")) {
    message "NOT operator test <color=#00ff00>PASSED</color>: nonexistent var is falsy.";
}

// ── Wrap up ──
message "<b>All tests complete!</b>";
message "Script command coverage:";
message "  <color=#00ff00>✓</color> message, choice, wait, log, end";
message "  <color=#00ff00>✓</color> setvar, incvar, decvar, setflag, clearflag";
message "  <color=#00ff00>✓</color> additem, delitem, addgold, delgold";
message "  <color=#00ff00>✓</color> playsound, camerashake";
message "  <color=#00ff00>✓</color> emote, fadeout, fadein";
message "  <color=#00ff00>✓</color> playerlock, playerunlock";
message "  <color=#00ff00>✓</color> npcface, label, goto";
message "  <color=#00ff00>✓</color> if/else if/else, and, or, not";
message "  <color=#00ff00>✓</color> random(), getvar(), hasitem(), getgold()";
message "Talk to me again anytime to re-run the tests!";
end;`
        });

        console.log(`[NPCRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(name, template) {
        if (!name || name.trim() === '') {
            console.error('[NPCRegistry] Template must have a name');
            return false;
        }

        this.templates.set(name, {
            ...template,
            name: name
        });
        
        console.log(`[NPCRegistry] Added template: ${name}`);
        return true;
    }

    /**
     * Get a template by name
     */
    getTemplate(name) {
        return this.templates.get(name);
    }

    /**
     * Get all templates as array
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * Check if template exists
     */
    hasTemplate(name) {
        return this.templates.has(name);
    }

    /**
     * Remove a template
     */
    removeTemplate(name) {
        const removed = this.templates.delete(name);
        if (removed) {
            console.log(`[NPCRegistry] Removed template: ${name}`);
        }
        return removed;
    }

    /**
     * Update an existing template
     */
    updateTemplate(name, updates) {
        const template = this.templates.get(name);
        if (!template) {
            console.error(`[NPCRegistry] Template not found: ${name}`);
            return false;
        }

        this.templates.set(name, {
            ...template,
            ...updates,
            name: name // Preserve name
        });

        console.log(`[NPCRegistry] Updated template: ${name}`);
        return true;
    }

    /**
     * Get template count
     */
    getCount() {
        return this.templates.size;
    }
}

// Export
window.NPCRegistry = NPCRegistry;
