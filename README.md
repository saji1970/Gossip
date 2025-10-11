# Gossip - Group Chat App with Privacy Controls

A React Native mobile application for group messaging with advanced privacy controls, member management, and real-time chat features.

## 🚀 Quick Start

### Main Project (USE THIS)
```bash
cd GossipAppFixed
npx react-native run-android
```

### Play Store Release
```bash
cd GossipAppFixed/android
.\gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## 📦 Current Version

- **Version Code**: 15
- **Version Name**: 2.0.0
- **Package**: com.gossipin
- **Status**: Production Ready

## ✨ Features

### Core Functionality
- 🔐 Firebase Authentication (username or email login)
- 💬 Real-time group chat with Firestore
- 👥 Public/Private group creation
- ✅ Member approval system with designated approvers
- 📜 Optional terms and conditions for groups
- 🔑 Admin and moderation capabilities
- 🎫 Invite codes for group joining
- 💌 1-on-1 chat within groups
- 📎 File, image, and video attachments
- 📞 Group voice and video calling
- 🐱 Custom app icon (2 cats gossiping)

### Technical Stack
- React Native 0.73.6
- Firebase Authentication
- Firebase Firestore
- Hermes JavaScript Engine
- TypeScript
- Android API Level 35

## 📁 Project Structure

```
Gossip/
├── GossipAppFixed/          ← MAIN PROJECT (use this)
│   ├── src/                 ← App source code
│   ├── android/             ← Android build config
│   ├── App.tsx              ← Main app component
│   └── package.json         ← Dependencies
│
└── Documentation/
    ├── UPLOAD_VERSION_15.txt        ← Play Store upload guide
    ├── FIRESTORE_PERMISSION_FIX.md  ← Fix slow sign-in issue
    ├── QUICK_START.md               ← Quick commands
    └── PROJECT_STATUS_FINAL.md      ← Complete status
```

## 🔧 Setup

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio
- JDK 17
- Android SDK (API 35)

### Installation
```bash
cd GossipAppFixed
npm install
```

### Firebase Configuration
1. Place `google-services.json` in `android/app/`
2. Update Firestore security rules (see `FIRESTORE_PERMISSION_FIX.md`)

### Run on Android
```bash
npx react-native run-android
```

## 📱 Build for Production

### Create Play Store AAB
```bash
cd GossipAppFixed/android
.\gradlew clean
.\gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Signing Configuration
The release keystore (`release.keystore`) is configured in `android/app/build.gradle`:
- Store Password: gossip123
- Key Alias: gossip-app
- Key Password: gossip123

## ⚠️ Important Notes

### Firestore Security Rules
Before deploying to production, update Firestore rules in Firebase Console:
- See: `FIRESTORE_PERMISSION_FIX.md`
- Required to fix slow sign-in issue
- Takes 2 minutes to configure

### Play Store Deployment
- **AAB Location**: `GossipAppFixed/android/app/build/outputs/bundle/release/app-release.aab`
- **Current Version**: 15 (v2.0.0)
- **Upload Guide**: See `UPLOAD_VERSION_15.txt`

## 🐛 Troubleshooting

### App Crashes on Startup
- Verify you're using AAB from `GossipAppFixed`, not old folders
- Check that all native libraries are included in build

### Slow Sign-In
- Update Firestore security rules
- See `FIRESTORE_PERMISSION_FIX.md`

### Build Errors
```bash
# Clean and rebuild
cd GossipAppFixed/android
.\gradlew clean
.\gradlew bundleRelease
```

## 📚 Documentation

- `UPLOAD_VERSION_15.txt` - Play Store upload instructions
- `FIRESTORE_PERMISSION_FIX.md` - Fix Firestore permissions
- `QUICK_START.md` - Quick command reference
- `PROJECT_STATUS_FINAL.md` - Complete project status
- `CRITICAL_DIFFERENCE.md` - Technical comparison
- `GossipAppFixed/MIGRATION_GUIDE.md` - Development guide

## 🎯 What's Fixed in v2.0.0

### Critical Bug Fixes
- ✅ Fixed missing native libraries (0 → 60+ .so files)
- ✅ Fixed app crash on startup
- ✅ Fixed Firestore integration
- ✅ Fixed signing configuration
- ✅ App now works perfectly!

### Why Version 2.0.0?
This is a major version bump because the project was completely rebuilt from scratch to fix fundamental architecture issues in earlier versions (1.x).

## 📞 Support

For issues or questions:
1. Check documentation files listed above
2. Review Firebase Console for backend errors
3. Check logcat for Android errors: `adb logcat *:E`

## 📄 License

Private project for personal use.

---

**Current Status**: ✅ Production Ready - Upload to Play Store!

**Repository**: https://github.com/saji1970/Gossip.git
