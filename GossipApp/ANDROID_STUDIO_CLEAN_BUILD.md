# 🧹 Android Studio - Clean Rebuild Process

## Complete Clean Build & Reinstall

### Step 1: Remove Old Build in Android Studio

1. **Open Android Studio**
2. **Open Project:** `C:\Gossip\GossipApp\android`
3. **Clean Project:**
   - Go to: `Build → Clean Project`
   - Wait for completion (2-3 minutes)

4. **Invalidate Caches:**
   - Go to: `File → Invalidate Caches and Restart`
   - Click: `Invalidate and Restart`
   - Wait for Android Studio to restart

### Step 2: Remove App from Device

**Option A: Via Android Studio**
1. Go to: `Run → Uninstall 'GossipIn'`
2. Confirm uninstall

**Option B: Via ADB**
```cmd
adb uninstall com.gossipin
```

### Step 3: Fresh Build

1. **Build Release APK:**
   - Go to: `Build → Generate Signed Bundle/APK`
   - Select: `APK`
   - Click: `Next`

2. **Keystore Configuration:**
   - **Key store path:** `C:\Gossip\GossipApp\android\app\release.keystore`
   - **Key store password:** `gossip123`
   - **Key alias:** `gossip-app`
   - **Key password:** `gossip123`
   - Click: `Next`

3. **Build Configuration:**
   - **Destination folder:** `android\app\build\outputs\apk\release\`
   - **Build variants:** Select `release`
   - Check: `V2 (Full APK Signature)`
   - Click: `Finish`

4. **Wait for Build** (5-10 minutes)

### Step 4: Install Fresh APK

**Option A: Drag & Drop**
1. Navigate to: `android\app\build\outputs\apk\release\`
2. Drag `app-release.apk` to your device
3. Install when prompted

**Option B: ADB Install**
```cmd
cd C:\Gossip\GossipApp
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

### Step 5: Launch App

**Option A: From Device**
- Tap the GossipIn icon on your device

**Option B: Via ADB**
```cmd
adb shell am start -n com.gossipin/.MainActivity
```

---

## 🔧 Alternative: Automated Script

For a completely automated process, run:
```batch
C:\Gossip\GossipApp\CLEAN_REBUILD_INSTALL.bat
```

This script will:
- ✅ Stop Metro bundler
- ✅ Uninstall old app
- ✅ Clean all caches
- ✅ Build fresh APK
- ✅ Install on device
- ✅ Launch the app

---

## 🎯 Expected Result

After the clean rebuild:
- ✅ No TurboModule errors
- ✅ No "PlatformConstants" issues
- ✅ App launches successfully
- ✅ All Samsung fixes included
- ✅ Works without Metro connection

---

## 🐛 If Build Fails

### Common Issues & Solutions:

**1. "Gradle sync failed"**
- Solution: `File → Invalidate Caches and Restart`

**2. "Release keystore not found"**
- Solution: Verify `android\app\release.keystore` exists

**3. "Build tools version mismatch"**
- Solution: Update Android SDK Build Tools

**4. "Out of memory"**
- Solution: Close other applications, restart Android Studio

---

## 📱 Verification

After installation, verify:
1. App icon appears on device
2. App launches without red screen
3. No error messages
4. All features work

---

**Ready to clean rebuild?** Choose your method:
1. **Automated:** Run `CLEAN_REBUILD_INSTALL.bat`
2. **Manual:** Follow Android Studio steps above

The clean rebuild will fix all TurboModule issues! 🚀
