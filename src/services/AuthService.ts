import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { encryptionService } from '../utils/encryption';
import { User } from '../types';
import { hashString } from '../utils/crypto';

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }): Promise<User> {
    try {
      // Generate encryption keys for the user
      const keyPair = await encryptionService.generateUserKeys();
      const hashedPassword = await encryptionService.hashPassword(userData.password);
      
      // Create user object
      const user: User = {
        id: this.generateUserId(),
        username: userData.username,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        publicKey: keyPair.publicKey,
        privateKeyEncrypted: await encryptionService.encryptUserData(
          keyPair.privateKey,
          userData.password
        ),
        createdAt: new Date(),
        lastSeen: new Date(),
        isVerified: false,
      };

      // Store user data securely
      await this.storeUserSecurely(user, hashedPassword);
      
      // Set current user
      this.currentUser = user;
      
      return user;
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const hashedPassword = await encryptionService.hashPassword(password);
      
      // Retrieve user data
      const user = await this.getUserSecurely(hashedPassword);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Set user's private key
      const privateKey = await encryptionService.decryptUserData(
        user.privateKeyEncrypted,
        password
      );
      await encryptionService.setUserPrivateKey(privateKey);

      // Update last seen
      user.lastSeen = new Date();
      await this.storeUserSecurely(user, hashedPassword);
      
      this.currentUser = user;
      
      return user;
    } catch (error) {
      throw new Error(`Login failed: ${error}`);
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear sensitive data
      await encryptionService.setUserPrivateKey('');
      this.currentUser = null;
      
      // Clear secure storage
      await Keychain.resetInternetCredentials('gossip_app_user');
      await AsyncStorage.removeItem('user_session');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      // Try to restore user from secure storage
      const credentials = await Keychain.getInternetCredentials('gossip_app_user');
      if (credentials && credentials.password) {
        // This would require the user to re-authenticate with biometrics
        // For now, we'll return null to force re-login
        return null;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const updatedUser = { ...this.currentUser, ...updates };
    
    // Store updated user data
    const hashedPassword = await this.getStoredPasswordHash();
    await this.storeUserSecurely(updatedUser, hashedPassword);
    
    this.currentUser = updatedUser;
    return updatedUser;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      // Verify old password
      const hashedOldPassword = await encryptionService.hashPassword(oldPassword);
      const storedHash = await this.getStoredPasswordHash();
      
      if (hashedOldPassword !== storedHash) {
        throw new Error('Invalid old password');
      }

      // Re-encrypt private key with new password
      const privateKey = await encryptionService.decryptUserData(
        this.currentUser.privateKeyEncrypted,
        oldPassword
      );
      
      const newHashedPassword = await encryptionService.hashPassword(newPassword);
      const newPrivateKeyEncrypted = await encryptionService.encryptUserData(
        privateKey,
        newPassword
      );

      // Update user with new encrypted private key
      const updatedUser = {
        ...this.currentUser,
        privateKeyEncrypted: newPrivateKeyEncrypted,
      };

      await this.storeUserSecurely(updatedUser, newHashedPassword);
      this.currentUser = updatedUser;
    } catch (error) {
      throw new Error(`Password change failed: ${error}`);
    }
  }

  private async storeUserSecurely(user: User, hashedPassword: string): Promise<void> {
    try {
      // Store user data in secure keychain
      await Keychain.setInternetCredentials(
        'gossip_app_user',
        user.email,
        JSON.stringify(user)
      );

      // Store password hash in async storage (less sensitive)
      await AsyncStorage.setItem('user_session', JSON.stringify({
        userId: user.id,
        email: user.email,
        passwordHash: hashedPassword,
        lastLogin: new Date().toISOString(),
      }));
    } catch (error) {
      throw new Error(`Failed to store user data: ${error}`);
    }
  }

  private async getUserSecurely(hashedPassword: string): Promise<User | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('gossip_app_user');
      if (credentials && credentials.password) {
        const user: User = JSON.parse(credentials.password);
        
        // Verify password hash
        const sessionData = await AsyncStorage.getItem('user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.passwordHash === hashedPassword) {
            return user;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting user securely:', error);
      return null;
    }
  }

  private async getStoredPasswordHash(): Promise<string> {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.passwordHash;
      }
      throw new Error('No stored password hash found');
    } catch (error) {
      throw new Error(`Failed to get stored password hash: ${error}`);
    }
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const authService = AuthService.getInstance();
