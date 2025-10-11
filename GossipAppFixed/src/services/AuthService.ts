/**
 * Authentication Service
 * Username/Password auth with Firebase
 * Maps Firebase UID to AnonId (UUID v4)
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { getFirebaseInstances, COLLECTIONS } from '../config/firebase';
import { UserProfile, AnonId } from '../types/models';
import { generateAnonId } from '../utils/anonId';
import LocalStorageService from './LocalStorageService';
import { getRandomAvatar } from '../constants/avatars';

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  status?: string;
}

class AuthService {
  private currentUser: UserProfile | null = null;

  /**
   * Initialize authentication
   * Sets up auth state listener
   */
  init(onAuthChange: (user: UserProfile | null) => void): () => void {
    return auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await this.loadOrCreateUserProfile(firebaseUser);
        this.currentUser = profile;
        onAuthChange(profile);
      } else {
        this.currentUser = null;
        onAuthChange(null);
      }
    });
  }

  /**
   * Register with username, email, and password
   */
  async register(data: RegistrationData): Promise<UserProfile> {
    // Create Firebase auth user with email/password
    const userCredential = await auth().createUserWithEmailAndPassword(data.email, data.password);
    
    // Generate anonId
    const anonId = generateAnonId();
    await LocalStorageService.saveUidAnonMapping(userCredential.user.uid, anonId);
    
    // Create user profile
    const profile: UserProfile = {
      anonId,
      avatar: getRandomAvatar(),
      displayName: data.username,
      phoneNumber: data.phoneNumber,
      status: data.status,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    
    // Save to local storage
    await LocalStorageService.saveUserProfile(profile);
    
    // Save to Firestore
    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(anonId)
        .set({
          anonId,
          avatar: profile.avatar,
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          status: profile.status,
          lastActive: Date.now(),
        }, { merge: true });
    } catch (error) {
      console.error('Failed to save user profile to Firestore:', error);
    }
    
    // Sign out after registration (user will need to login)
    await auth().signOut();
    
    return profile;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<UserProfile> {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const profile = await this.loadOrCreateUserProfile(userCredential.user);
    this.currentUser = profile;
    return profile;
  }

  /**
   * Sign in anonymously (legacy support)
   * Generates anonId from Firebase UID
   */
  async signInAnonymous(): Promise<UserProfile> {
    const userCredential = await auth().signInAnonymously();
    const profile = await this.loadOrCreateUserProfile(userCredential.user);
    this.currentUser = profile;
    return profile;
  }

  /**
   * Sign in with custom token
   * Used when user receives invite link with token
   */
  async signInWithToken(token: string): Promise<UserProfile> {
    const userCredential = await auth().signInWithCustomToken(token);
    const profile = await this.loadOrCreateUserProfile(userCredential.user);
    this.currentUser = profile;
    return profile;
  }

  /**
   * Load or create user profile
   * Maps Firebase UID to AnonId and creates profile
   */
  private async loadOrCreateUserProfile(firebaseUser: FirebaseAuthTypes.User): Promise<UserProfile> {
    // Check local storage first
    let anonId = await LocalStorageService.getAnonIdFromUid(firebaseUser.uid);
    
    if (!anonId) {
      // Generate new anonId
      anonId = generateAnonId();
      await LocalStorageService.saveUidAnonMapping(firebaseUser.uid, anonId);
    }

    // Check if profile exists locally
    let profile = await LocalStorageService.getUserProfile();
    
    if (!profile || profile.anonId !== anonId) {
      // Create new profile
      profile = {
        anonId,
        avatar: getRandomAvatar(),
        createdAt: Date.now(),
        lastActive: Date.now(),
      };
      
      // Save locally
      await LocalStorageService.saveUserProfile(profile);
      
      // Save minimal profile to Firestore for presence (optional)
      try {
        await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(anonId)
          .set({
            anonId,
            avatar: profile.avatar,
            displayName: profile.displayName || null,
            lastActive: Date.now(),
          }, { merge: true });
      } catch (error) {
        console.error('Failed to save user profile to Firestore:', error);
      }
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const updatedProfile: UserProfile = {
      ...this.currentUser,
      ...updates,
      lastActive: Date.now(),
    };

    // Save locally
    await LocalStorageService.saveUserProfile(updatedProfile);
    
    // Update Firestore
    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(updatedProfile.anonId)
        .set({
          anonId: updatedProfile.anonId,
          avatar: updatedProfile.avatar,
          displayName: updatedProfile.displayName || null,
          lastActive: Date.now(),
        }, { merge: true });
    } catch (error) {
      console.error('Failed to update user profile in Firestore:', error);
    }

    this.currentUser = updatedProfile;
    return updatedProfile;
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * Get current anonId
   */
  getCurrentAnonId(): AnonId | null {
    return this.currentUser?.anonId || null;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await auth().signOut();
    this.currentUser = null;
  }

  /**
   * Delete account and all local data
   */
  async deleteAccount(): Promise<void> {
    await LocalStorageService.wipeAllData();
    await this.signOut();
  }
}

export default new AuthService();
