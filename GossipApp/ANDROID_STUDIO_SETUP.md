# Android Studio Setup Guide - GossipIn

Complete guide to install and run GossipIn app in Android Studio.

## Prerequisites

### Required Software
1. **Android Studio** (Latest version - Arctic Fox or newer)
2. **Node.js** (v16 or higher)
3. **JDK 11** or higher
4. **Android SDK** (API Level 33 or higher)

---

## Step-by-Step Installation

### Step 1: Install Node Modules

```bash
cd C:\Gossip\GossipApp
npm install
```

### Step 2: Open Project in Android Studio

1. Launch Android Studio
2. Click **"Open an Existing Project"**
3. Navigate to: `C:\Gossip\GossipApp\android`
4. Click **"OK"**

### Step 3: Sync Gradle

Android Studio will automatically start syncing Gradle files.

**If sync fails:**
1. File → Sync Project with Gradle Files
2. Build → Clean Project
3. Build → Rebuild Project

### Step 4: Configure Android SDK

1. File → Settings → Appearance & Behavior → System Settings → Android SDK
2. Install these SDK components:
   - Android SDK Platform 33
   - Android SDK Build-Tools 33.0.0
   - Android Emulator
   - Android SDK Platform-Tools

### Step 5: Setup Emulator

1. Tools → Device Manager (or AVD Manager)
2. Create Virtual Device
3. Choose device: **Pixel 5** or **Pixel 6**
4. Choose system image: **Android 13 (API 33)** or **Android 12 (API 31)**
5. Click **Finish**

---

## Running the App

### Method 1: Using React Native CLI (Recommended)

#### Terminal 1 - Start Metro Bundler:
```bash
cd C:\Gossip\GossipApp
npx react-native start
```

#### Terminal 2 - Run on Android:
```bash
cd C:\Gossip\GossipApp
npx react-native run-android
```

### Method 2: Using Android Studio

1. Open Android Studio with the project
2. Click **"Run"** → **"Run 'app'"** (or press Shift+F10)
3. Select your emulator or connected device
4. Wait for build and installation

---

## Configuration Steps

### 1. Update google-services.json

Copy your Firebase configuration:
```bash
# You have the file at: C:\Users\saji\Downloads\google-services (1).json
# Copy it to:
copy "C:\Users\saji\Downloads\google-services (1).json" "C:\Gossip\GossipApp\android\app\google-services.json"
```

Or manually:
1. Rename `google-services (1).json` to `google-services.json`
2. Copy to `C:\Gossip\GossipApp\android\app\`

### 2. Verify Firebase Setup

Check that `google-services.json` is in the correct location:
```
GossipApp/
  android/
    app/
      google-services.json  ← Should be here
```

### 3. Enable Multidex (if needed)

Edit `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        multiDexEnabled true
    }
}
```

---

## Troubleshooting

### Issue 1: "SDK location not found"

**Solution:**
1. Create `android/local.properties` file
2. Add this line (adjust path to your SDK):
```properties
sdk.dir=C\:\\Users\\saji\\AppData\\Local\\Android\\Sdk
```

### Issue 2: "Execution failed for task ':app:processDebugGoogleServices'"

**Solution:**
- Verify `google-services.json` is in `android/app/` directory
- Make sure the file is valid JSON
- Restart Android Studio

### Issue 3: Metro Bundler Port Already in Use

**Solution:**
```bash
# Kill the process on port 8081
npx react-native start --reset-cache
```

Or on Windows:
```powershell
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Issue 4: Build Failed - Gradle Errors

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Issue 5: "Unable to load script from assets"

**Solution:**
```bash
# Clear cache and rebuild
npx react-native start --reset-cache
# In another terminal:
npx react-native run-android
```

### Issue 6: App Crashes on Startup

**Check logs:**
```bash
adb logcat | grep -i gossip
```

**Common fixes:**
1. Clear app data: Settings → Apps → GossipIn → Clear Data
2. Uninstall and reinstall
3. Check Firebase configuration

---

## Build Configuration

### Debug Build (Development)

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release Build (Production)

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## Useful Commands

### Check Connected Devices
```bash
adb devices
```

### Install APK on Device
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### View Logs
```bash
adb logcat
```

### Clear App Data
```bash
adb shell pm clear com.gossipapp
```

### Uninstall App
```bash
adb uninstall com.gossipapp
```

---

## Android Studio Tips

### Enable Auto-Import
1. File → Settings → Editor → General → Auto Import
2. Check "Add unambiguous imports on the fly"

### Increase Memory (if slow)
1. Help → Edit Custom VM Options
2. Increase these values:
```
-Xms512m
-Xmx4096m
```

### Enable Instant Run
1. File → Settings → Build, Execution, Deployment → Instant Run
2. Check "Enable Instant Run"

---

## Package Information

**Package Name:** `com.gossipapp`
**App Name:** GossipIn
**Version:** Check `android/app/build.gradle`

---

## File Structure

```
GossipApp/
├── android/
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── AndroidManifest.xml
│   │   │       ├── java/
│   │   │       └── res/
│   │   ├── build.gradle
│   │   └── google-services.json  ← Firebase config
│   ├── build.gradle
│   ├── gradle.properties
│   ├── local.properties  ← May need to create
│   └── settings.gradle
├── src/
└── package.json
```

---

## Testing Checklist

- [ ] App installs successfully
- [ ] Registration works
- [ ] Login works
- [ ] Can create groups
- [ ] Can send messages
- [ ] Deep links work (`adb shell am start -W -a android.intent.action.VIEW -d "gossipin://invite/test"`)
- [ ] Firebase connection works
- [ ] Notifications appear (if enabled)

---

## Performance Tips

### Speed Up Build Times
1. Enable Gradle daemon: `android/gradle.properties`
```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

2. Increase Gradle memory:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

### Reduce APK Size
1. Enable ProGuard for release builds
2. Enable resource shrinking
3. Use APK Analyzer: Build → Analyze APK

---

## Next Steps After Installation

1. **Test Registration Flow**
   - Sign up with username/email/password
   - Add phone number and status

2. **Test Groups**
   - Create a group
   - Send invites
   - Test messaging

3. **Test Ephemeral Chat**
   - Profile → Ephemeral Chat
   - Create ephemeral group
   - Verify messages delete after 10 seconds

4. **Test Deep Linking**
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "gossipin://invite/test_123"
   ```

5. **Check Logs**
   ```bash
   adb logcat | grep -E "GossipIn|Firebase"
   ```

---

## Support

### Common Errors Reference
- **Error:** "Could not find com.google.gms:google-services"
  - **Fix:** Add Google repository to `android/build.gradle`

- **Error:** "Manifest merger failed"
  - **Fix:** Check AndroidManifest.xml for conflicts

- **Error:** "Duplicate class found"
  - **Fix:** Clean and rebuild project

### Get Help
1. Check Android Studio logs
2. Check React Native console
3. Check `adb logcat` output
4. Review Firebase Console

---

## Quick Start Summary

```bash
# 1. Install dependencies
cd C:\Gossip\GossipApp
npm install

# 2. Copy Firebase config
copy "C:\Users\saji\Downloads\google-services (1).json" "android\app\google-services.json"

# 3. Start Metro
npx react-native start

# 4. In new terminal, run Android
npx react-native run-android
```

**That's it! Your app should now be running in the emulator.** 🚀

---

*Last Updated: October 8, 2025*

