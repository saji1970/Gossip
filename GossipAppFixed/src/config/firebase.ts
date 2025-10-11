/**
 * Firebase Configuration
 * GossipIn - Ephemeral Gossiping App
 */

import { FirebaseApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// App ID for Firestore paths
export const APP_ID = 'gossipin-v1';

// Firebase instances (automatically initialized by React Native Firebase)
// Using the (default) database
const db = firestore();
const authInstance = auth();

// Initialize Firebase (React Native Firebase auto-initializes from google-services.json)
export const initializeFirebase = () => {
  // React Native Firebase initializes automatically
  // Configuration is in android/app/google-services.json and ios/GoogleService-Info.plist
  console.log('Firebase initialized via React Native Firebase');
  console.log('Using Firestore database: "(default)"');
  return { db, auth: authInstance };
};

// Export initialized instances
export const getFirebaseInstances = () => {
  return { db, auth: authInstance };
};

// Firestore collection paths
export const COLLECTIONS = {
  GROUPS: `/artifacts/${APP_ID}/public/data/groups`,
  USERS: `/artifacts/${APP_ID}/public/data/users`,
  TRANSIENT_MESSAGES: '/transient/messages',
  TRANSIENT_DM: '/transient/dm',
  TRANSIENT_VOICE: '/transient/voice_sessions',
  JOIN_REQUESTS: `/artifacts/${APP_ID}/public/data/join_requests`,
  INVITES: `/artifacts/${APP_ID}/public/data/invites`,
} as const;

// TTL values (milliseconds)
export const TTL = {
  MESSAGE: 10_000, // 10 seconds
  VOICE_SESSION: 60_000, // 60 seconds
  DEFAULT: 10_000,
} as const;

