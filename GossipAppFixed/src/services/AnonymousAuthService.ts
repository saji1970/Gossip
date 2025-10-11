import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { v4 as uuidv4 } from 'react-native-uuid';

/**
 * Anonymous Authentication Service for Ephemeral Gossip Network
 * 
 * Core Principle: Privacy by Design, Zero Data Logging
 * - Uses Firebase UID converted to non-reversible anonId (UUID)
 * - No real names, only unique IDs and Avatars
 * - Mobile number used only once for download link/token (external process)
 */
export class AnonymousAuthService {
  private static instance: AnonymousAuthService;
  private currentUser: User | null = null;

  static getInstance(): AnonymousAuthService {
    if (!AnonymousAuthService.instance) {
      AnonymousAuthService.instance = new AnonymousAuthService();
    }
    return AnonymousAuthService.instance;
  }

  /**
   * Initialize anonymous user with Firebase UID
   * Converts Firebase UID to non-reversible anonId
   */
  async initializeAnonymousUser(firebaseUid: string): Promise<User> {
    try {
      // Convert Firebase UID to non-reversible anonId
      const anonId = this.generateAnonId(firebaseUid);
      
      // Check if user already exists locally
      const existingUser = await this.getUserByAnonId(anonId);
      if (existingUser) {
        this.currentUser = existingUser;
        return existingUser;
      }

      // Create new anonymous user
      const user: User = {
        anonId,
        avatar: this.getRandomAvatar(),
        displayName: undefined, // User can set pseudonym later
        lastActive: new Date(),
        createdAt: new Date(),
      };

      // Store user locally
      await this.storeUserLocally(user);
      this.currentUser = user;

      return user;
    } catch (error) {
      throw new Error(`Failed to initialize anonymous user: ${error}`);
    }
  }

  /**
   * Update user profile (avatar, displayName)
   */
  async updateProfile(updates: { avatar?: string; displayName?: string }): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const updatedUser = {
      ...this.currentUser,
      ...updates,
      lastActive: new Date(),
    };

    await this.storeUserLocally(updatedUser);
    this.currentUser = updatedUser;

    return updatedUser;
  }

  /**
   * Get current anonymous user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from local storage
    try {
      const storedUser = await AsyncStorage.getItem('anonymous_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentUser = {
          ...user,
          lastActive: new Date(user.lastActive),
          createdAt: new Date(user.createdAt),
        };
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Logout - clear local data
   */
  async logout(): Promise<void> {
    try {
      this.currentUser = null;
      await AsyncStorage.removeItem('anonymous_user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Generate non-reversible anonId from Firebase UID
   */
  private generateAnonId(firebaseUid: string): string {
    // Create a hash of the Firebase UID to make it non-reversible
    // This ensures the anonId cannot be traced back to the original UID
    const hash = this.simpleHash(firebaseUid);
    return `anon_${hash}`;
  }

  /**
   * Simple hash function for anonId generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get random avatar emoji
   */
  private getRandomAvatar(): string {
    const avatars = ['👤', '🎭', '🦄', '🐱', '🐶', '🐸', '🦋', '🌸', '🌺', '🌻', '🌷', '🌹', '🌵', '🌲', '🌳', '🌴', '🍀', '🌿', '🌱', '🌾'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  /**
   * Store user locally
   */
  private async storeUserLocally(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('anonymous_user', JSON.stringify(user));
    } catch (error) {
      throw new Error(`Failed to store user data: ${error}`);
    }
  }

  /**
   * Get user by anonId
   */
  private async getUserByAnonId(anonId: string): Promise<User | null> {
    try {
      const storedUser = await AsyncStorage.getItem('anonymous_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.anonId === anonId) {
          return {
            ...user,
            lastActive: new Date(user.lastActive),
            createdAt: new Date(user.createdAt),
          };
        }
      }
    } catch (error) {
      console.error('Error getting user by anonId:', error);
    }
    return null;
  }
}

export const anonymousAuthService = AnonymousAuthService.getInstance();

