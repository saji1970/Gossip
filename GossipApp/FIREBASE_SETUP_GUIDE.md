# 🔥 Firebase Setup Guide for GossipIn

## Step 1: Place google-services.json

After downloading `google-services.json` from Firebase Console:

1. Move the file to: `C:\Gossip\GossipApp\android\app\google-services.json`
2. The file should be in the `android/app/` directory, next to `build.gradle`

## Step 2: Deploy Firestore Security Rules

```bash
cd C:\Gossip\GossipApp
npm install -g firebase-tools
firebase login
firebase init firestore
# Select "Use an existing project"
# Choose "GossipIn"
# Use existing firestore.rules
firebase deploy --only firestore:rules
```

## Step 3: Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Step 4: Test the App

```bash
npx react-native run-android
```

## Production Checklist

- ✅ Firebase project created
- ✅ Anonymous auth enabled
- ✅ Firestore database created in production mode
- ✅ `google-services.json` placed in correct location
- ✅ Security rules deployed
- ✅ Cloud functions deployed
- ✅ App tested on emulator
- ✅ Release APK built and signed

## Firestore Indexes (If Needed)

If you get index errors, Firebase will provide a link to create them automatically.
Or manually create in Firebase Console → Firestore Database → Indexes.

## Monitoring

- **Authentication**: Firebase Console → Authentication → Users
- **Database**: Firebase Console → Firestore Database
- **Functions**: Firebase Console → Functions → Dashboard
- **Usage**: Firebase Console → Usage and billing

## Support

For issues, check:
1. `google-services.json` is in `android/app/`
2. Firebase project exists and is active
3. Anonymous auth is enabled
4. Firestore rules are deployed
5. App package name matches: `com.gossipin`

