/**
 * Authentication Service
 * Anonymous authentication with Firebase
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { generateAnonId } from '../../utils/anonId';
import { saveUserProfile, getUserProfile } from '../../utils/storage';
import { LocalUserState } from '../../types';

/**
 * Sign in anonymously with Firebase
 * Returns the anonymous user
 */
export const signInAnonymously = async (): Promise<FirebaseAuthTypes.User> => {
  const userCredential = await auth().signInAnonymously();
  return userCredential.user;
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  return auth().currentUser;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  await auth().signOut();
};

/**
 * Initialize or get existing user profile
 */
export const initializeUserProfile = async (): Promise<LocalUserState> => {
  // Check if profile exists locally
  let profile = await getUserProfile();
  
  if (profile) {
    return profile;
  }

  // Sign in anonymously if not authenticated
  let firebaseUser = getCurrentUser();
  if (!firebaseUser) {
    firebaseUser = await signInAnonymously();
  }

  // Create new anonymous profile
  const anonId = generateAnonId();
  
  profile = {
    anonId,
    avatar: '', // Will be set in profile setup
    displayName: undefined,
    createdAt: Date.now(),
    hasCompletedSetup: false,
    lastActive: Date.now(),
  };

  await saveUserProfile(profile);
  return profile;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChanged = (
  callback: (user: FirebaseAuthTypes.User | null) => void
): (() => void) => {
  return auth().onAuthStateChanged(callback);
};

