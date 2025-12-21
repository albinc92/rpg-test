# NPC Scripting System

A simple scripting language for NPC dialogues and interactions in the RPG game engine.

## Overview

The scripting system allows you to create dynamic NPC interactions with:
- Conditional dialogue based on player progress
- Inventory operations (give/take items)
- Global variables for quest tracking
- Rich text formatting (bold, italic, colors)
- Player choices with branching paths

## Quick Start

Add a script to any NPC through the NPC Editor's script textarea:

```javascript
message "Hello <b>traveler</b>!";
end;
```

## Commands Reference

### Messages

Display text in the dialogue box with optional HTML formatting.

```javascript
message "Hello world!";
message "This is <b>bold</b> text.";
message "This is <i>italic</i> text.";
message "<color=#ff0000>Red text</color> and <color=#00ff00>green text</color>.";
```

### Inventory Operations

```javascript
// Give items to player
additem "gold", 100;
additem "health_potion", 5;
additem "quest_key", 1;

// Take items from player
delitem "gold", 50;
delitem "quest_key", 1;
```

### Variables

Global variables persist across saves and can be used to track quest progress.

```javascript
// Set a variable
setvar "quest_started", true;
setvar "times_talked", 0;
setvar "player_name", "Hero";

// Increment/decrement numeric variables
incvar "times_talked", 1;
decvar "gold_owed", 10;

// Shorthand for boolean flags
setflag "met_sage";        // Same as: setvar "met_sage", true;
clearflag "met_sage";      // Same as: setvar "met_sage", false;
```

### Flow Control

```javascript
// End script execution
end;

// Labels and jumps
label greeting:
message "Hello!";
goto greeting;  // Creates infinite loop (don't do this!)

// Wait (milliseconds)
wait 1000;  // Wait 1 second
```

### Sound Effects

```javascript
playsound "coin.mp3";
playsound "quest-complete.mp3";
```

### Player Actions

```javascript
// Teleport player
teleport "forest_map", 500, 300;

// Heal/damage (if health system exists)
heal 50;
damage 10;
```

### Debug

```javascript
log "Debug message here";  // Outputs to console
```

## Conditions

### Basic If/Else

```javascript
if (getvar("talked_before")) {
    message "Good to see you again!";
} else {
    message "Nice to meet you!";
    setvar "talked_before", true;
}
```

### Else If Chains

```javascript
if (hasitem("gold_key", 1)) {
    message "You have the gold key!";
} else if (hasitem("silver_key", 1)) {
    message "A silver key? I need the GOLD one.";
} else if (getvar("knows_about_key")) {
    message "Did you find the key yet?";
} else {
    message "I need a gold key. Check the dungeon.";
    setvar "knows_about_key", true;
}
```

### Available Functions

| Function | Description | Example |
|----------|-------------|---------|
| `hasitem(id, qty)` | Check if player has item | `hasitem("gold", 100)` |
| `getvar(name)` | Get variable value | `getvar("quest_complete")` |
| `getvar(name, default)` | Get with default | `getvar("count", 0)` |
| `getitemqty(id)` | Get item quantity | `getitemqty("gold") > 50` |
| `random(min, max)` | Random integer | `random(1, 10) > 5` |
| `choice` | Last choice index | `choice == 0` |

### Comparison Operators

```javascript
if (getvar("level") == 5) { }      // Equal
if (getvar("level") != 5) { }      // Not equal
if (getvar("level") > 5) { }       // Greater than
if (getvar("level") < 5) { }       // Less than
if (getvar("level") >= 5) { }      // Greater or equal
if (getvar("level") <= 5) { }      // Less or equal
```

### Logical Operators

```javascript
// AND - both must be true
if (hasitem("key", 1) && getvar("door_unlocked") == false) {
    message "Use the key?";
}

// OR - either can be true
if (hasitem("gold", 100) || getvar("is_vip")) {
    message "Welcome, valued customer!";
}

// NOT - negate condition
if (!getvar("quest_complete")) {
    message "You haven't finished the quest yet.";
}
```

## Player Choices

Present options and react to player selection:

```javascript
message "Would you like to buy a potion?";
choice "Yes (50 gold)", "No thanks", "What does it do?";

if (choice == 0) {
    if (hasitem("gold", 50)) {
        delitem "gold", 50;
        additem "health_potion", 1;
        message "Here you go!";
    } else {
        message "You don't have enough gold!";
    }
} else if (choice == 1) {
    message "Maybe next time.";
} else if (choice == 2) {
    message "It restores 50 health points.";
}
end;
```

## HTML Text Formatting

Messages support basic HTML tags for rich text:

| Tag | Effect | Example |
|-----|--------|---------|
| `<b>text</b>` | **Bold** | `"This is <b>important</b>!"` |
| `<i>text</i>` | *Italic* | `"She said <i>quietly</i>..."` |
| `<color=#hex>text</color>` | Colored | `"<color=#ff0000>Warning!</color>"` |

### Common Colors

```javascript
message "<color=#ff0000>Red</color>";      // Red
message "<color=#00ff00>Green</color>";    // Green
message "<color=#0000ff>Blue</color>";     // Blue
message "<color=#ffcc00>Gold</color>";     // Gold
message "<color=#ff00ff>Purple</color>";   // Purple
message "<color=#00ffff>Cyan</color>";     // Cyan
```

## Complete Examples

### Quest Giver NPC

```javascript
// Check quest state
if (getvar("wolf_quest_complete")) {
    message "Thank you again for dealing with those wolves!";
    message "The village is safe because of you.";
} else if (getvar("wolf_quest_started")) {
    if (hasitem("wolf_pelt", 5)) {
        message "You collected all the pelts! <b>Well done!</b>";
        delitem "wolf_pelt", 5;
        additem "gold", 200;
        setvar "wolf_quest_complete", true;
        playsound "quest-complete.mp3";
        message "Here's your reward: <color=#ffcc00>200 gold</color>!";
    } else {
        message "Have you collected 5 wolf pelts yet?";
        message "You have " + getitemqty("wolf_pelt") + " so far.";
    }
} else {
    message "Wolves have been attacking our livestock!";
    message "Can you help us?";
    choice "I'll help!", "Not right now";
    
    if (choice == 0) {
        message "Thank you! Bring me <b>5 wolf pelts</b> as proof.";
        message "I'll pay you <color=#ffcc00>200 gold</color> for your trouble.";
        setvar "wolf_quest_started", true;
    } else {
        message "Please reconsider... we're desperate!";
    }
}
end;
```

### Shop Keeper NPC

```javascript
message "Welcome to my shop!";

label shop_menu:
choice "Buy Health Potion (50g)", "Buy Mana Potion (75g)", "Sell Items", "Leave";

if (choice == 0) {
    if (hasitem("gold", 50)) {
        delitem "gold", 50;
        additem "health_potion", 1;
        playsound "coin.mp3";
        message "Thanks for your purchase!";
    } else {
        message "You need 50 gold for that.";
    }
    goto shop_menu;
} else if (choice == 1) {
    if (hasitem("gold", 75)) {
        delitem "gold", 75;
        additem "mana_potion", 1;
        playsound "coin.mp3";
        message "Excellent choice!";
    } else {
        message "That costs 75 gold.";
    }
    goto shop_menu;
} else if (choice == 2) {
    message "Sorry, I'm not buying right now.";
    goto shop_menu;
} else {
    message "Come back anytime!";
}
end;
```

### Guard NPC with Reputation

```javascript
if (getvar("reputation") >= 100) {
    message "Hero! It's an honor to meet you!";
    message "Please, go right through.";
} else if (getvar("reputation") >= 50) {
    message "You may pass, citizen.";
} else if (getvar("reputation") >= 0) {
    message "State your business.";
    choice "Just passing through", "None of your concern";
    
    if (choice == 0) {
        message "Very well. Move along.";
    } else {
        message "Watch your tone, stranger.";
        incvar "reputation", -5;
    }
} else {
    message "You're not welcome here, criminal!";
    message "Leave before I call more guards!";
}
end;
```

### Mystery NPC with Random Response

```javascript
// Different greeting based on random chance
if (random(1, 10) > 7) {
    message "<i>*The stranger looks at you mysteriously*</i>";
    message "The <color=#9900ff>prophecy</color> spoke of one like you...";
} else {
    message "Hmm? Oh, just passing through.";
}
end;
```

## Talk Bubble Indicator

NPCs with scripts or messages automatically display a floating talk bubble above their head, indicating they can be interacted with. This helps players identify interactive NPCs at a glance.

The bubble shows animated "..." dots and bobs gently up and down.

To disable the talk bubble for a specific NPC, set `showTalkBubble: false` in the NPC options.

## Variable Persistence

All variables set with `setvar` are automatically:
- Saved when the player saves the game
- Restored when loading a save file
- Shared across all NPCs and scripts

Use naming conventions to organize variables:
- `quest_wolfhunt_started` - Quest states
- `npc_sage_met` - NPC interaction flags  
- `player_reputation` - Player stats
- `world_bridge_repaired` - World state changes

## Comments

Use `//` for single-line comments:

```javascript
// This is a comment
message "Hello!";  // This is also a comment

// TODO: Add more dialogue options
```

## Tips

1. **Always end with `end;`** - Scripts should explicitly end to return control to the game.

2. **Test incrementally** - Start with simple scripts and add complexity gradually.

3. **Use meaningful variable names** - `quest_dragon_defeated` is clearer than `q1done`.

4. **Combine conditions carefully** - Complex `&&` and `||` chains can be hard to debug.

5. **Provide player feedback** - Use messages to confirm actions like receiving items.

6. **Use colors sparingly** - Highlight important words, not entire sentences.
