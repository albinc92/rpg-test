# Weather Audio Files Guide

## Required Audio Files

Place the following audio files in `assets/audio/effect/`:

### Rain Sounds (3 files)
- `rain-light.mp3` - Light rain, gentle drops
- `rain-medium.mp3` - Medium rain, steady rainfall
- `rain-heavy.mp3` - Heavy rain, downpour/storm

### Wind Sounds (3 files)
- `wind-light.mp3` - Light breeze, gentle whoosh
- `wind-medium.mp3` - Medium wind, steady gusts
- `wind-heavy.mp3` - Heavy wind, strong howling

## Audio Specifications

**Format:** MP3
**Sample Rate:** 44.1 kHz recommended
**Bitrate:** 128-192 kbps recommended
**Length:** 10-30 seconds (will loop seamlessly)
**Volume:** Normalize to -6dB to prevent clipping

## Loop Points

Ensure each audio file loops seamlessly:
- Fade in/out at edges for smooth looping
- Use crossfade if needed (handled by AudioManager)
- Test loop points before exporting

## Finding Free Audio

Sources for free weather sound effects:
- **Freesound.org** - Creative Commons licensed sounds
- **OpenGameArt.org** - Game-ready sound effects
- **Zapsplat.com** - Free sound effects library
- **BBC Sound Effects** - Public domain sounds

## Creating Your Own

Tips for recording/creating weather sounds:
1. **Rain:** Rice/beans in a colander, white noise filtered
2. **Wind:** Blow across mic with pop filter, or use synthesizer
3. **Processing:** Add reverb, EQ to taste, normalize volume

## Integration

The weather system automatically:
- Plays rain sounds when precipitation is rain-light/medium/heavy
- Plays wind sounds when wind is light/medium/heavy or when snowing
- Crossfades between different intensities smoothly
- Stops sounds when weather is disabled
- Respects master volume and effect volume settings

## Temporary Solution

If you don't have audio files yet:
- The game will log errors but continue working
- Visual weather effects will still display
- You can add audio files later without code changes
