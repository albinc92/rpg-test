# Flutter WebView Integration Guide

This document explains how to integrate the RPG game web app with Flutter using WebView.

## Current Setup

The game now includes:
- ✅ Mobile detection
- ✅ Touch controls UI (HTML/CSS overlay)
- ✅ Virtual joystick and button system
- ✅ Touch-friendly menus with larger touch targets
- ✅ Button hints (A/B/X/Y for mobile, keyboard keys for desktop)

## Flutter WebView Integration (Future Enhancement)

### Option 1: Basic WebView (Current - Works Now)

The HTML/CSS touch controls work perfectly in Flutter WebView with no additional setup.

```dart
// In your Flutter app
import 'package:webview_flutter/webview_flutter.dart';

WebView(
  initialUrl: 'http://localhost:5173', // or your production URL
  javascriptMode: JavascriptMode.unrestricted,
)
```

### Option 2: Native Controls with JavaScript Bridge (Advanced)

For better performance and native feel, you can create Flutter touch controls and communicate with the WebView.

#### 1. Flutter Side (Native Controls)

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GameScreen extends StatefulWidget {
  @override
  _GameScreenState createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late WebViewController _controller;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // WebView with game
          WebView(
            initialUrl: 'http://localhost:5173',
            javascriptMode: JavascriptMode.unrestricted,
            onWebViewCreated: (controller) {
              _controller = controller;
            },
          ),
          
          // Native Flutter touch controls overlay
          Positioned(
            left: 60,
            bottom: 80,
            child: VirtualJoystick(
              onDirectionChanged: (x, y) {
                // Send joystick input to WebView
                _controller.runJavascript(
                  'window.game.inputManager.setVirtualJoystick($x, $y, true)'
                );
              },
            ),
          ),
          
          Positioned(
            right: 60,
            bottom: 80,
            child: ActionButtons(
              onButtonPressed: (button) {
                // Send button press to WebView
                _controller.runJavascript(
                  'window.game.inputManager.setVirtualButton("$button", true)'
                );
              },
              onButtonReleased: (button) {
                // Send button release to WebView
                _controller.runJavascript(
                  'window.game.inputManager.setVirtualButton("$button", false)'
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

#### 2. JavaScript Side (Already Implemented)

The `InputManager` already has these methods ready:
- `setVirtualButton(button, pressed)` - Set button state
- `setVirtualJoystick(x, y, active)` - Set joystick state

#### 3. Bi-directional Communication

For more advanced features (game telling Flutter what to do):

**JavaScript to Flutter:**
```javascript
// In your game code
if (window.flutter_inappwebview) {
  // Send message to Flutter
  window.flutter_inappwebview.callHandler('gameEvent', {
    type: 'vibrate',
    intensity: 0.5,
    duration: 100
  });
}
```

**Flutter Handler:**
```dart
_controller.addJavaScriptHandler(
  handlerName: 'gameEvent',
  callback: (args) {
    final event = args[0];
    if (event['type'] == 'vibrate') {
      HapticFeedback.vibrate();
    }
  },
);
```

## Mobile Optimizations

### Performance Tips

1. **Use `flutter_inappwebview` instead of `webview_flutter`** for better performance
2. **Enable hardware acceleration** in WebView
3. **Preload game assets** to reduce loading time
4. **Use native splash screen** while game initializes

### Touch Improvements

1. **Haptic Feedback**: Send vibration events from game to Flutter
2. **Native UI**: Use Flutter overlays for menus (faster than HTML)
3. **Gestures**: Add pinch-to-zoom, swipe gestures in Flutter

## Testing

### Desktop Browser
```bash
npm run dev
# Game shows HTML touch controls automatically on small screens
```

### Flutter WebView
```bash
# In flutter_app directory
flutter run
```

### Mobile Device Testing
```bash
# Expose Vite dev server to network
npm run dev -- --host

# Access from mobile device
http://YOUR_IP:5173
```

## Current Button Mapping

| Button | Action | Color | Position |
|--------|--------|-------|----------|
| A | Confirm / Interact | Green | Bottom |
| B | Cancel / Menu | Red | Right |
| X | Delete / Run | Blue | Left |
| Y | Inventory | Yellow | Top |

## File Structure

```
src/
├── systems/
│   ├── InputManager.js        # Handles both keyboard and touch input
│   ├── TouchControlsUI.js     # HTML/CSS touch controls overlay
│   └── GameStateManager.js    # Shows/hides controls based on state
└── main.js                     # Loads TouchControlsUI
```

## Future Enhancements

- [ ] Haptic feedback integration
- [ ] Gyroscope controls (tilt to move)
- [ ] Native UI for menus (Flutter overlay)
- [ ] Save games to device storage (via Flutter bridge)
- [ ] Share/screenshot features
- [ ] In-app purchases (if needed)
- [ ] Push notifications for game events

## Questions?

The game is fully playable on mobile browsers and Flutter WebView right now with the HTML/CSS touch controls. The native Flutter bridge is optional for enhanced features later.
