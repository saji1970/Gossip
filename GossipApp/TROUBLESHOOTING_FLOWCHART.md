# 🔧 Android Studio Troubleshooting Flowchart

**Follow this decision tree to solve issues quickly**

---

## 🎯 START: What's Your Problem?

```
┌──────────────────────────────────┐
│  What issue are you facing?      │
└────────────┬─────────────────────┘
             │
             ├─ Can't open project ────────→ [SECTION A]
             │
             ├─ Build fails ────────────────→ [SECTION B]
             │
             ├─ App won't install ─────────→ [SECTION C]
             │
             ├─ App crashes ───────────────→ [SECTION D]
             │
             ├─ Metro bundler issues ──────→ [SECTION E]
             │
             └─ Gradle/dependency issues ──→ [SECTION F]
```

---

## 🔴 SECTION A: Can't Open Project

### Problem: Android Studio won't open project

**Step 1:** Are you opening the correct folder?
```
✅ Open: C:\Gossip\GossipApp\android
❌ Not:  C:\Gossip\GossipApp
```

**Step 2:** Is Android Studio installed correctly?
```bash
# Check version
# Help → About

# Required: Arctic Fox or newer
```

**Step 3:** SDK location missing?
```
Error: "SDK location not found"

Solution:
1. Create file: android/local.properties
2. Add line: sdk.dir=C:\\Users\\saji\\AppData\\Local\\Android\\Sdk
3. Restart Android Studio
```

**Step 4:** Gradle sync fails?
→ Go to [SECTION F]

---

## 🔴 SECTION B: Build Fails

### Problem: Build errors when running

```
┌──────────────────────────────────┐
│  What's the error message?       │
└────────────┬─────────────────────┘
             │
             ├─ "Duplicate class" ─────────────────┐
             │                                     │
             ├─ "processDebugGoogleServices" ──────┤
             │                                     │
             ├─ "Unable to resolve dependency" ────┤
             │                                     │
             └─ Generic build error ───────────────┘
                                                   │
                                                   ▼
```

### Fix 1: Clean Everything

```bash
cd C:\Gossip\GossipApp

# Clean Gradle
cd android
./gradlew clean
cd ..

# Clean React Native
npx react-native clean

# Retry
npx react-native run-android
```

### Fix 2: Reinstall Dependencies

```bash
cd C:\Gossip\GossipApp

# Remove node modules
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Rebuild
npx react-native run-android
```

### Fix 3: Google Services Error

```
Error: "Execution failed for task ':app:processDebugGoogleServices'"

Check:
1. File exists: android/app/google-services.json
2. Valid JSON: cat android/app/google-services.json
3. Package name matches: "com.gossipin"
```

**Solution:**
```bash
# Re-copy file
copy "C:\Users\saji\Downloads\google-services (1).json" \
     "C:\Gossip\GossipApp\android\app\google-services.json"

# Rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Fix 4: Dependency Resolution Error

```
Error: "Could not resolve com.facebook.react:react-native:+"

Solution:
1. Check internet connection
2. Clear Gradle cache:
```

```bash
cd android
./gradlew clean --refresh-dependencies
cd ..
```

---

## 🔴 SECTION C: App Won't Install

### Problem: Build succeeds but install fails

**Step 1:** Is device/emulator connected?
```bash
adb devices

# Should show:
# List of devices attached
# emulator-5554   device

# If empty:
# - Start emulator
# - Enable USB debugging on device
```

**Step 2:** Previous version blocking?
```bash
# Uninstall old version
adb uninstall com.gossipin

# Retry
npx react-native run-android
```

**Step 3:** Storage full?
```bash
# Check device storage
adb shell df

# Clear app data
adb shell pm clear com.gossipin
```

**Step 4:** ADB not working?
```bash
# Restart ADB
adb kill-server
adb start-server
adb devices
```

---

## 🔴 SECTION D: App Crashes

### Problem: App installs but crashes on launch

```
┌──────────────────────────────────┐
│  When does it crash?             │
└────────────┬─────────────────────┘
             │
             ├─ Immediately on launch ──────────┐
             │                                   │
             ├─ After splash screen ─────────────┤
             │                                   │
             ├─ When using specific feature ─────┤
             │                                   │
             └─ Randomly ───────────────────────┘
                                                 │
                                                 ▼
                                        CHECK LOGS
```

### Step 1: Check Crash Logs

```bash
# View crash logs
adb logcat | grep -i "AndroidRuntime"

# Or full logs
adb logcat
```

### Step 2: Common Crash Causes

**Crash Type: Java Exception**
```
Look for:
"java.lang.RuntimeException"
"NullPointerException"
"ClassNotFoundException"

Solution: Check native module setup
```

**Crash Type: JavaScript Error**
```
Look for:
"Error: Cannot read property"
"TypeError"
"ReferenceError"

Solution: Fix JavaScript code
```

**Crash Type: Firebase Error**
```
Look for:
"FirebaseApp"
"google-services.json"

Solution:
1. Verify google-services.json present
2. Check Firebase project ID matches
3. Ensure Firebase initialized in code
```

### Step 3: Clear App Data

```bash
# Clear app data (resets app state)
adb shell pm clear com.gossipin

# Reinstall clean
adb uninstall com.gossipin
npx react-native run-android
```

### Step 4: Check JavaScript Bundle

```bash
# Metro might not be running
# Start Metro in separate terminal
npx react-native start

# Then run app
npx react-native run-android
```

---

## 🔴 SECTION E: Metro Bundler Issues

### Problem: Metro won't start or has errors

```
┌──────────────────────────────────┐
│  What's the Metro error?         │
└────────────┬─────────────────────┘
             │
             ├─ Port 8081 in use
             ├─ Module not found
             ├─ Bundling failed
             └─ Transform error
                     │
                     ▼
```

### Fix 1: Port Already in Use

```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID [PID_NUMBER] /F

# Restart Metro
npx react-native start --reset-cache
```

### Fix 2: Module Not Found

```
Error: "Unable to resolve module 'X'"

Solution:
1. Check if package installed
2. Reinstall dependencies
```

```bash
npm install

# For native modules
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Fix 3: Bundling Failed

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman cache (if using)
watchman watch-del-all

# Clear temp files
rm -rf /tmp/metro-*
```

### Fix 4: Transform Error

```
Error: "Unable to transform file"

Solution:
```

```bash
# Clear all caches
npx react-native start --reset-cache

# Clear node modules
rm -rf node_modules
npm install

# Restart
npx react-native start
```

---

## 🔴 SECTION F: Gradle/Dependency Issues

### Problem: Gradle sync or build fails

```
┌──────────────────────────────────┐
│  What's the Gradle error?        │
└────────────┬─────────────────────┘
             │
             ├─ Download failed
             ├─ Version conflict
             ├─ Plugin not found
             └─ Build timeout
                     │
                     ▼
```

### Fix 1: Download Failed

```bash
# Check internet connection
ping google.com

# Retry with refresh
cd android
./gradlew clean --refresh-dependencies
cd ..
```

### Fix 2: Version Conflict

```
Error: "Conflict with dependency"

Solution: Check android/app/build.gradle
Look for duplicate dependencies
```

**Example fix:**
```gradle
dependencies {
    // Remove duplicate
    // implementation 'com.google.firebase:firebase-auth:21.0.0'
    
    // Keep one version
    implementation 'com.google.firebase:firebase-auth:21.1.0'
}
```

### Fix 3: Gradle Daemon Issues

```bash
# Stop all Gradle daemons
cd android
./gradlew --stop

# Clear Gradle cache
rm -rf ~/.gradle/caches

# Rebuild
./gradlew clean
./gradlew assembleDebug
```

### Fix 4: Build Timeout

**Edit:** `android/gradle.properties`
```properties
# Increase memory
org.gradle.jvmargs=-Xmx4096m

# Enable daemon
org.gradle.daemon=true

# Enable parallel
org.gradle.parallel=true
```

---

## 🚨 NUCLEAR OPTION (Last Resort)

**When nothing else works:**

```bash
cd C:\Gossip\GossipApp

# 1. Remove everything
rm -rf node_modules
rm -rf android/build
rm -rf android/app/build
rm package-lock.json

# 2. Clean Gradle cache
cd android
./gradlew clean --refresh-dependencies
./gradlew --stop
cd ..

# 3. Reinstall everything
npm install

# 4. Restart computer (yes, really)
# Sometimes Android Studio locks files

# 5. Rebuild from scratch
npx react-native start        # Terminal 1
npx react-native run-android  # Terminal 2
```

---

## 📊 Issue Frequency & Solutions

| Issue | Frequency | Quick Fix |
|-------|-----------|-----------|
| Port 8081 busy | Very Common | `taskkill /PID [PID] /F` |
| Module not found | Common | `npm install` |
| Build fails | Common | `./gradlew clean` |
| App crashes | Common | `adb logcat` |
| Google services | Common | Check file location |
| Gradle sync | Occasional | `--refresh-dependencies` |
| SDK not found | Rare | Create `local.properties` |

---

## 🎯 Decision Matrix

**Use this to decide what to do:**

```
Problem Started After:
│
├─ Installing new package
│  └─ Solution: rm -rf node_modules, npm install
│
├─ Updating code
│  └─ Solution: Check syntax, npx react-native start --reset-cache
│
├─ Gradle sync
│  └─ Solution: ./gradlew clean --refresh-dependencies
│
├─ Android Studio update
│  └─ Solution: File → Invalidate Caches → Restart
│
└─ System restart/update
   └─ Solution: Check SDK location, restart ADB
```

---

## 📞 Getting Help

**Before asking for help, collect this info:**

```bash
# 1. Check versions
node --version
java --version
npm --version

# 2. Check devices
adb devices

# 3. Capture logs
adb logcat > error-log.txt

# 4. Gradle info
cd android
./gradlew --version

# 5. Package info
cat package.json | grep "react-native"
```

**Include in help request:**
- Full error message
- Steps to reproduce
- What you've already tried
- Relevant log files
- Environment info (OS, versions)

---

## ✅ Prevention Checklist

**Do these regularly to avoid issues:**

- [ ] Keep dependencies updated
- [ ] Run `./gradlew clean` before builds
- [ ] Clear Metro cache weekly
- [ ] Check `adb devices` before running
- [ ] Verify google-services.json present
- [ ] Test on clean install occasionally
- [ ] Monitor Android Studio updates
- [ ] Backup working configuration
- [ ] Document custom changes
- [ ] Keep keystore safe

---

## 🔄 Standard Debugging Workflow

```
1. Read error message carefully
   ↓
2. Check if device connected (adb devices)
   ↓
3. Check if Metro running
   ↓
4. Clear caches (./gradlew clean)
   ↓
5. Check logs (adb logcat)
   ↓
6. Reinstall dependencies (npm install)
   ↓
7. Restart everything (Metro, Android Studio, ADB)
   ↓
8. Nuclear option (delete everything, reinstall)
   ↓
9. Check online (Stack Overflow, GitHub issues)
   ↓
10. Ask for help (with full context)
```

---

**Remember: 90% of issues are fixed by cleaning and rebuilding!**

```bash
cd android && ./gradlew clean && cd .. && npm install && npx react-native run-android
```

*Last Updated: October 9, 2025*

