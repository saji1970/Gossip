# 🚀 GossipIn - Automated Firebase Setup

## Overview

This project includes **automated scripts** to make your app production-ready in minutes!

## 📋 What You Need to Do (10 Minutes)

### Step 1: Create Firebase Project (5 minutes)

1. Go to **https://console.firebase.google.com/**
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: **`GossipIn`** (or `gossipin`)
4. Disable Google Analytics (recommended for privacy)
5. Click **"Create project"** and wait for completion

### Step 2: Configure Firebase (3 minutes)

#### Enable Anonymous Authentication:
1. Click **Authentication** in sidebar
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Anonymous"** → Toggle **"Enable"** → **"Save"**

#### Create Firestore Database:
1. Click **Firestore Database** in sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll deploy rules automatically)
4. Select **location** (e.g., `us-central1` or closest region)
5. Click **"Enable"** and wait

#### Add Android App:
1. Click **Project Settings** (gear icon) → **"Your apps"**
2. Click **Android icon** (</>) to add Android app
3. Enter:
   - **Android package name**: `com.gossipin`
   - **App nickname**: `GossipIn`
   - **Debug signing certificate SHA-1**: (skip)
4. Click **"Register app"**
5. **Download `google-services.json`** file
6. Click **"Next"** → **"Next"** → **"Continue to console"**

### Step 3: Run Automated Setup (2 minutes)

#### Option A: Quick Start (Recommended)
```bash
.\QUICK_START.bat
```
This interactive menu will guide you through everything!

#### Option B: Manual Steps
```bash
# 1. Place google-services.json
.\setup-google-services.bat

# 2. Deploy Firebase backend
.\deploy-firebase.bat

# 3. Test the app
npx react-native run-android
```

---

## 🎯 Automated Scripts Overview

| Script | Purpose | Duration |
|--------|---------|----------|
| `QUICK_START.bat` | Interactive setup menu | 2-5 min |
| `setup-google-services.bat` | Places google-services.json automatically | 30 sec |
| `deploy-firebase.bat` | Deploys rules + functions + indexes | 2-3 min |
| `build-production.bat` | Builds production-ready APK | 3-5 min |

---

## ✅ What Gets Deployed Automatically

### 1. Firestore Security Rules (`firestore.rules`)
- ✅ Zero-PII enforcement
- ✅ Anonymous auth only
- ✅ Transient message TTL
- ✅ Group access control

### 2. Firestore Indexes (`firestore.indexes.json`)
- ✅ Group queries (type + lastActivity)
- ✅ Member queries (memberAnonIds + lastActivity)
- ✅ Message queries (target + timestamp)

### 3. Cloud Functions (`functions/index.ts`)
- ✅ `cleanupTransientDocs` - Runs every minute, deletes expired messages
- ✅ `updateGroupActivity` - Updates group timestamps
- ✅ `autoDeleteTransientMessage` - Backup message deletion

### 4. Firebase Configuration
- ✅ `.firebaserc` - Project configuration
- ✅ `firebase.json` - Deployment settings

---

## 📱 Testing Your Setup

### Development Mode:
```bash
# Start Metro
npx react-native start

# Install on emulator (new terminal)
npx react-native run-android
```

### Production Build:
```bash
.\build-production.bat
```

The APK will be at: `android\app\build\outputs\apk\release\app-release.apk`

---

## 🔍 Verify Everything Works

### 1. Check Firebase Console

**Authentication:**
- Go to Authentication → Users
- You should see anonymous users after testing

**Firestore:**
- Go to Firestore Database → Data
- Groups collection should appear
- Transient messages should auto-delete

**Functions:**
- Go to Functions → Dashboard
- `cleanupTransientDocs` should show executions
- Check logs for any errors

### 2. Check App

- ✅ App launches without errors
- ✅ "Initializing..." shows briefly
- ✅ HomeScreen displays
- ✅ Can create groups
- ✅ Messages send and auto-delete

---

## 🆘 Troubleshooting

### "google-services.json not found"
**Solution:**
1. Download from Firebase Console → Project Settings
2. Place in `Downloads` folder
3. Run `.\setup-google-services.bat`

### "Firebase project not found"
**Solution:**
1. Check `.firebaserc` - update project ID if needed
2. Run `firebase login` to re-authenticate
3. Run `firebase projects:list` to see your projects

### "Permission denied" errors
**Solution:**
1. Redeploy rules: `firebase deploy --only firestore:rules`
2. Check Firestore is in production mode
3. Verify Anonymous auth is enabled

### Build errors
**Solution:**
```bash
cd android
.\gradlew clean
cd ..
npx react-native run-android
```

---

## 📊 Firebase Free Tier Limits

Your app uses:
- ✅ **1 GB Firestore storage** (plenty for ephemeral data)
- ✅ **50K reads/day** (sufficient for moderate usage)
- ✅ **20K writes/day**
- ✅ **20K deletes/day** (cleanup function)
- ✅ **2M Cloud Function invocations/month**

💡 **Tip:** The ephemeral architecture keeps storage near zero!

---

## 📚 Documentation

- **`PRODUCTION_CHECKLIST.md`** - Complete production deployment guide
- **`FIREBASE_SETUP_GUIDE.md`** - Detailed Firebase setup instructions
- **`IMPLEMENTATION.md`** - Technical architecture documentation
- **`BUILD_COMPLETE.md`** - Feature status and API reference

---

## 🎉 You're Done!

Your GossipIn app is now:
- ✅ Connected to Firebase
- ✅ Using production security rules
- ✅ Auto-cleaning ephemeral messages
- ✅ Ready for testing and deployment

### Next Steps:
1. Test thoroughly on emulator
2. Build production APK
3. Test on physical device
4. Optional: Upload to Play Store

---

**Questions?** Check the troubleshooting section or review the documentation files.

**Status**: Production Ready! 🚀

