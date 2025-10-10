# 🚀 Android Studio Deployment - Quick Reference Card

**Print this and keep it handy!**

---

## 📱 First Time Setup (Do Once)

```bash
# 1. Install dependencies
cd C:\Gossip\GossipApp
npm install

# 2. Add Firebase config
# Copy google-services.json to android/app/

# 3. Open in Android Studio
# File → Open → C:\Gossip\GossipApp\android

# 4. Wait for Gradle sync to complete
# (5-15 minutes first time)
```

---

## 🏃 Running Development Build (Daily Use)

### Two-Terminal Method

**Terminal 1: Start Metro**
```bash
cd C:\Gossip\GossipApp
npx react-native start
```

**Terminal 2: Run Android**
```bash
cd C:\Gossip\GossipApp
npx react-native run-android
```

**Keep both terminals running while developing!**

---

## 🔨 Building Release APK

```bash
# 1. Update version
# Edit android/app/build.gradle
# Increment: versionCode and versionName

# 2. Build
cd C:\Gossip\GossipApp\android
./gradlew clean
./gradlew assembleRelease

# 3. Output location
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 Building for Play Store (AAB)

```bash
cd C:\Gossip\GossipApp\android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 First-Time Keystore Setup

```bash
cd C:\Gossip\GossipApp\android\app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore gossipin-release.keystore \
  -alias gossipin-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**⚠️ SAVE THIS INFO:**
- Keystore password
- Key alias: gossipin-key
- File location: android/app/gossipin-release.keystore

**Add to `android/gradle.properties`:**
```properties
MYAPP_UPLOAD_STORE_FILE=gossipin-release.keystore
MYAPP_UPLOAD_STORE_PASSWORD=your_password
MYAPP_UPLOAD_KEY_ALIAS=gossipin-key
MYAPP_UPLOAD_KEY_PASSWORD=your_password
```

---

## 🛠️ Quick Fixes

### Metro Port Busy
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID [PID] /F

# Restart
npx react-native start --reset-cache
```

### Build Errors
```bash
cd C:\Gossip\GossipApp\android
./gradlew clean
cd ..
npx react-native run-android
```

### App Won't Install
```bash
adb devices              # Check device connected
adb uninstall com.gossipin  # Remove old version
npx react-native run-android  # Reinstall
```

### Check Logs
```bash
adb logcat               # All logs
adb logcat | grep -i ReactNative  # React Native logs
adb logcat | grep -i GossipIn     # Your app logs
```

---

## 📋 Deployment Checklist

### Before Building
- [ ] Test all features work
- [ ] Update versionCode (+1)
- [ ] Update versionName (e.g., 1.0.1)
- [ ] google-services.json present

### Building
- [ ] `./gradlew clean`
- [ ] `./gradlew bundleRelease`
- [ ] No build errors
- [ ] AAB file created

### Testing
- [ ] Install release build on device
- [ ] Test all critical features
- [ ] No crashes
- [ ] Performance good

### Uploading
- [ ] Login to Play Console
- [ ] Create new release
- [ ] Upload AAB file
- [ ] Add release notes
- [ ] Submit for review

---

## 🎯 Version Number Guide

**versionCode (integer, internal)**
- Start at 1
- Increment by 1 each upload
- Must always increase
- Example: 1, 2, 3, 4, 5...

**versionName (string, user-visible)**
- Semantic versioning
- Format: MAJOR.MINOR.PATCH
- Example: 1.0.0 → 1.0.1 → 1.1.0 → 2.0.0

**Example progression:**
```
Release 1: versionCode 1, versionName "1.0.0"
Release 2: versionCode 2, versionName "1.0.1"
Release 3: versionCode 3, versionName "1.1.0"
Release 4: versionCode 4, versionName "2.0.0"
```

---

## 📂 Important File Locations

```
GossipApp/
├── android/
│   ├── app/
│   │   ├── build.gradle          ← Version numbers here
│   │   ├── google-services.json  ← Firebase config
│   │   └── build/outputs/
│   │       ├── apk/release/      ← Release APK
│   │       └── bundle/release/   ← Release AAB
│   ├── build.gradle              ← Dependencies
│   ├── gradle.properties         ← Keystore config
│   └── local.properties          ← SDK location
└── package.json                  ← npm packages
```

---

## 🔍 Common Commands

```bash
# Development
npx react-native start              # Start Metro
npx react-native run-android        # Build & install debug
npx react-native log-android        # View logs

# Device
adb devices                         # List devices
adb install [path/to/app.apk]      # Install APK
adb uninstall com.gossipin          # Uninstall
adb shell pm clear com.gossipin     # Clear data
adb logcat                          # View logs

# Gradle
./gradlew clean                     # Clean build
./gradlew assembleDebug             # Build debug APK
./gradlew assembleRelease           # Build release APK
./gradlew bundleRelease             # Build release AAB
./gradlew installDebug              # Install debug
./gradlew installRelease            # Install release

# NPM
npm install                         # Install dependencies
npm start                           # Start Metro (alternative)
npm run android                     # Run Android (if configured)
```

---

## 🌐 Useful URLs

- **Google Play Console:** https://play.google.com/console
- **Firebase Console:** https://console.firebase.google.com
- **React Native Docs:** https://reactnative.dev
- **Android Studio:** https://developer.android.com/studio

---

## 💡 Pro Tips

1. **Always keep Metro running** during development
2. **Use Gradle clean** before release builds
3. **Test release builds** on real devices
4. **Backup your keystore** in multiple locations
5. **Never commit keystore** to Git
6. **Increment versionCode** for every upload
7. **Use semantic versioning** for versionName
8. **Read crash logs** before deploying
9. **Test on multiple devices** if possible
10. **Keep dependencies updated** regularly

---

## 🚨 Emergency Troubleshooting

```bash
# Nuclear option (fixes 90% of issues)
cd C:\Gossip\GossipApp

# Clean everything
rm -rf node_modules
rm -rf android/build
rm -rf android/app/build

# Reinstall
npm install

# Rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 📊 Build Times Reference

| Task | Time | Notes |
|------|------|-------|
| First npm install | 3-5 min | Downloads all packages |
| First Gradle sync | 5-15 min | Downloads Android libs |
| Debug build | 1-3 min | Fast, no optimization |
| Release build | 3-7 min | Slow, with optimization |
| Metro start | 30 sec | JavaScript bundler |
| Hot reload | 2-5 sec | File changes |

---

## 🎓 Remember

**Development Flow:**
```
Write Code → Save → Fast Refresh → Test
```

**Deployment Flow:**
```
Update Version → Build AAB → Test → Upload → Review → Publish
```

**Two Running Processes:**
```
Metro (Port 8081) + Android App (Emulator/Device)
```

---

**Keep this reference card handy! 📌**

*Last Updated: October 9, 2025*

