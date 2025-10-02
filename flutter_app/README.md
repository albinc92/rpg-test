# RPG Game - Flutter WebView Wrapper

This Flutter app wraps the web-based RPG game in a native mobile app using WebView.

## Quick Start

### Prerequisites
- Flutter SDK installed ([Install Flutter](https://flutter.dev/docs/get-started/install))
- Android Studio / Xcode for mobile development
- Node.js and npm (for running the game server)

### Setup

1. **Install Flutter dependencies:**
```bash
cd flutter_app
flutter pub get
```

2. **Start the game development server:**
```bash
# In the root project directory
npm run dev -- --host
```

This will start Vite and show you the network URL (e.g., `http://192.168.1.100:5173`)

3. **Update the game URL in Flutter:**

Edit `lib/main.dart` and change the `gameUrl`:

```dart
// For Android emulator
final String gameUrl = 'http://10.0.2.2:5173';

// For iOS simulator  
final String gameUrl = 'http://localhost:5173';

// For physical device (replace with your computer's IP)
final String gameUrl = 'http://192.168.1.100:5173';
```

4. **Run the Flutter app:**
```bash
# Android
flutter run

# iOS
flutter run -d ios

# Specific device
flutter devices  # List available devices
flutter run -d <device-id>
```

## Platform Configuration

### Android Permissions

The app already has internet permission configured in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS Configuration

For iOS, enable WebView debugging by ensuring your `Info.plist` has:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

(Only for development - use HTTPS in production!)

## Features

- ✅ Full-screen game experience
- ✅ Touch controls automatically enabled
- ✅ Loading indicator while game initializes
- ✅ Safe area handling for notched devices
- ✅ Dark theme to match game aesthetic
- ✅ JavaScript fully enabled for game functionality

## Testing on Physical Device

### Option 1: Connect via USB
```bash
# Connect your phone via USB
# Enable USB debugging on Android / Trust computer on iOS
flutter run
```

### Option 2: Wireless (Same Network)
```bash
# Start game server with network access
npm run dev -- --host

# Note the network URL (e.g., http://192.168.1.100:5173)
# Update lib/main.dart with this URL
# Run Flutter app
flutter run
```

## Building for Production

### Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### iOS App
```bash
flutter build ios --release
# Then open in Xcode and archive for App Store
```

## Troubleshooting

### Game won't load
- Check that the Vite dev server is running (`npm run dev -- --host`)
- Verify the URL in `main.dart` matches your network IP
- Check console for errors: `flutter logs`

### Touch controls not working
- The game automatically detects mobile and shows touch controls
- Check browser console in WebView (use Chrome DevTools remote debugging)

### Black screen
- Make sure JavaScript is enabled (it is by default in this setup)
- Check that the game URL is accessible from your device
- Try accessing the URL in device browser first

## Production Deployment

For production, you'll need to:

1. **Host the game on a web server** (not localhost)
2. **Use HTTPS** for security
3. **Update the gameUrl** in `main.dart` to your production URL
4. **Build release versions** of the app
5. **Submit to app stores** (Google Play / App Store)

Example production URL:
```dart
final String gameUrl = 'https://yourdomain.com/rpg-game';
```

## Advanced Features (Future)

See [FLUTTER_INTEGRATION.md](../FLUTTER_INTEGRATION.md) for:
- Native touch controls (better performance)
- Haptic feedback integration
- JavaScript ↔ Flutter communication
- Save games to device storage
- Native UI overlays

## File Structure

```
flutter_app/
├── lib/
│   └── main.dart          # Main app entry point
├── android/               # Android specific config
├── ios/                   # iOS specific config
├── pubspec.yaml          # Flutter dependencies
└── README.md             # This file
```

## Need Help?

- Flutter docs: https://flutter.dev/docs
- WebView Flutter: https://pub.dev/packages/webview_flutter
- Game issues: Check main project README.md
