# Spirit Spawn System Guide

## Overview
The Spirit Spawn System automatically spawns spirits on maps using a **weighted spawn system**. You set a total spawn density for the map, and each spirit has a spawn weight (1-100) that determines how likely it is to spawn.

## How It Works

### 1. Paint Spawn Zones
- Open Map Editor (Ctrl+E)
- Select **Paint Tool** from Tools menu
- Choose **🎯 Spawn Zones** paint mode
- Paint areas where spirits can spawn (shows as blue overlay)
- Spawn zones use **hard-edge, binary painting** (100% opacity)

### 2. Configure Spawn System
- Open **Map → Map Config** in Map Editor
- Scroll to **🎯 Spirit Spawn Configuration** section
- Set **Spawn Density**: Total number of spirits on the map (e.g., 10)
- Add spawn entries with:
  - **Spirit Type**: Which spirit template to spawn
  - **Spawn Weight (1-100)**: Spawn probability relative to other spirits
  - **Time Condition**: When the spirit can spawn (Day, Night, Dawn, Dusk, etc.)

### 3. View Spawn Zones
- **In Editor**: Toggle **View → 🎯 Spawn Zones** (or check in View menu)
- **In Game**: Press **F1** to toggle debug mode (shows spawn zones, collision boxes, etc.)

### 4. Spawn System Behavior
- Checks spawn status every 5 seconds
- Maintains spawn density (spawns spirits until density is reached)
- Uses weighted random selection based on spawn weights
- Only spawns in painted spawn zones (blue areas)
- Checks time conditions (only spawns at appropriate times)
- Avoids spawning on collision areas or existing objects
- Automatically tracks spawned spirits and replaces defeated ones

## Example Spawn Configuration

### Forest Map Example
```
Spawn Density: 10 spirits

Spirit: forest_sprite (Sylphie)
Spawn Weight: 99
Time Condition: Day

Spirit: night_wisp (Nythra)
Spawn Weight: 1
Time Condition: Night
```

**Result**: The map will maintain 10 spirits total. During daytime, 99% of spawns will be Sylphie (forest sprite) and 1% will be rare spawns. At night, only night wisps can spawn.

## Debugging Spawn Issues

### Check Console Logs
The spawn system logs important information:
- `[SpawnManager] Loaded X spawn entries` - Spawn table loaded
- `[SpawnManager] ✅ Spawn system enabled` - System is active
- `[SpawnManager] ⚠️ No spawn zones painted` - Need to paint spawn zones
- `[SpawnManager] 🎲 Attempting to spawn` - Spawn attempt happening
- `[SpawnManager] ✨ Spawned X at (x, y)` - Successful spawn

### Common Issues
1. **No spirits spawning?**
   - Check if spawn zones are painted (press F1 to see blue overlay)
   - Verify spawn table is configured in Map Config
   - Check time conditions match current game time
   - Look for console warnings about missing spawn zones

2. **Spirits not spawning in certain areas?**
   - Ensure spawn zones are painted in those areas
   - Check for collision areas blocking spawns
   - Verify spawn zones use solid blue (100% opacity)

3. **Too many/few spirits?**
   - Adjust Max Population in spawn table
   - Adjust Spawn Rate (lower = fewer spawns)
   - Check if multiple spawn entries target same spirit

## Spawn Rate Tuning

**Spawn Rate** is probability per second:
- `0.01` = 1% chance per second = Very rare spawns
- `0.05` = 5% chance per second = Moderate spawns
- `0.1` = 10% chance per second = Common spawns
- `0.2` = 20% chance per second = Very common spawns

Since checks happen every 5 seconds, the actual spawn chance per check is:
- `spawnRate × 5` seconds

Example: `0.1` spawn rate = `0.1 × 5 = 0.5` = 50% chance per 5-second check

## Time Conditions

- **Any Time**: Spawns at any time (no restriction)
- **☀️ Day**: 7:00 - 17:00
- **🌙 Night**: 0:00 - 5:00
- **🌅 Dawn**: 5:00 - 7:00
- **🌆 Dusk**: 17:00 - 19:00
- **🌃 Nightfall**: 19:00 - 24:00

## Tips
- Paint spawn zones away from collision areas for best results
- Use different time conditions for day/night variety
- Lower spawn rates for rare/powerful spirits
- Test spawn rates in-game and adjust as needed
- Press F1 during gameplay to verify spawn zones are correct
- Check browser console (F12) for detailed spawn system logs
