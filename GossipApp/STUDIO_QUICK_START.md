# 🚀 Quick Start - Android Studio

## Option 1: Automatic (Easiest)

### Double-click: `RUN_IN_STUDIO.bat`

This will:
- ✅ Check dependencies
- ✅ Verify Firebase config
- ✅ Start Metro Bundler
- ✅ Show next steps

---

## Option 2: Manual Steps

### Step 1: Open in Android Studio

1. Launch **Android Studio**
2. Click **"Open"** or **"Open an Existing Project"**
3. Navigate to: `C:\Gossip\GossipApp\android`
4. Click **"OK"**
5. Wait for **Gradle Sync** to complete (5-10 minutes first time)

### Step 2: Start Metro Bundler

**Open Terminal in Android Studio** (View → Tool Windows → Terminal)

```bash
npx react-native start
```

Keep this running!

### Step 3: Run the App

**Open another Terminal tab** (click + in Terminal window)

```bash
npx react-native run-android
```

---

## Option 3: Using Android Studio Run Button

### Prerequisites
1. Metro Bundler must be running first
2. Emulator or device must be connected

### Steps
1. In Android Studio, click **Run** → **Run 'app'** (or press **Shift+F10**)
2. Select your device/emulator
3. Wait for build and installation

---

## Troubleshooting

### Problem: "SDK location not found"

**Solution:** Create `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\saji\\AppData\\Local\\Android\\Sdk
```

### Problem: "Unable to load script"

**Solution:** 
```bash
npx react-native start --reset-cache
```

### Problem: Port 8081 already in use

**Solution:**
```bash
npx react-native start --port 8082
```

### Problem: Build fails

**Solution:**
```bash
cd android
gradlew clean
cd ..
npx react-native run-android
```

---

## First Time Setup Only

### 1. Create Android Emulator
1. Tools → Device Manager
2. Create Virtual Device
3. Choose: **Pixel 5**
4. System Image: **Android 13 (API 33)**
5. Finish

### 2. Verify Installation
```bash
# Check Node
node --version

# Check npm
npm --version

# Check Java
java -version

# Check Android
adb version
```

---

## Expected Results

### After successful installation:

✅ App installs on emulator/device
✅ You see **Login Screen**
✅ Can click **"Sign Up"**
✅ Can register new account
✅ Can login
✅ Can see main app interface

---

## Quick Commands Reference

```bash
# Start Metro
npx react-native start

# Run Android
npx react-native run-android

# Clean build
cd android && gradlew clean && cd ..

# Reset cache
npx react-native start --reset-cache

# Check devices
adb devices

# View logs
adb logcat | findstr GossipIn

# Uninstall app
adb uninstall com.gossipapp
```

---

## Need Help?

1. Check **ANDROID_STUDIO_SETUP.md** for detailed guide
2. Review **TROUBLESHOOTING.md**
3. Check Android Studio logs
4. Check Metro Bundler console

---

## That's It! 🎉

Your app should now be running. Enjoy using GossipIn!

