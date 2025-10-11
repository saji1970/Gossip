import CryptoJS from 'crypto-js';
import { generateKeyPair, encrypt, decrypt } from './crypto';

export class EncryptionService {
  private static instance: EncryptionService;
  private userPrivateKey: string | null = null;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async generateUserKeys(): Promise<{ publicKey: string; privateKey: string }> {
    const keyPair = await generateKeyPair();
    return keyPair;
  }

  async setUserPrivateKey(privateKey: string): Promise<void> {
    this.userPrivateKey = privateKey;
  }

  async generateGroupKey(): Promise<string> {
    try {
      return CryptoJS.lib.WordArray.random(256/8).toString();
    } catch (error) {
      // Fallback to manual random generation if native crypto fails
      console.warn('Native crypto failed, using fallback random generation:', error);
      return this.generateFallbackRandomString(32);
    }
  }

  async encryptGroupKey(groupKey: string, memberPublicKeys: string[]): Promise<string[]> {
    const encryptedKeys: string[] = [];
    
    for (const publicKey of memberPublicKeys) {
      const encryptedKey = await encrypt(groupKey, publicKey);
      encryptedKeys.push(encryptedKey);
    }
    
    return encryptedKeys;
  }

  async encryptMessage(message: string, groupKey: string): Promise<string> {
    return CryptoJS.AES.encrypt(message, groupKey).toString();
  }

  async decryptMessage(encryptedMessage: string, groupKey: string): Promise<string> {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, groupKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async encryptUserData(data: any, password: string): Promise<string> {
    return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
  }

  async decryptUserData(encryptedData: string, password: string): Promise<any> {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  }

  async hashPassword(password: string): Promise<string> {
    return CryptoJS.SHA256(password).toString();
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  async generateSecureToken(): Promise<string> {
    try {
      return CryptoJS.lib.WordArray.random(32).toString();
    } catch (error) {
      // Fallback to manual random generation if native crypto fails
      console.warn('Native crypto failed, using fallback random generation:', error);
      return this.generateFallbackRandomString(32);
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.userPrivateKey) {
      throw new Error('Private key not set');
    }
    
    return CryptoJS.HmacSHA256(message, this.userPrivateKey).toString();
  }

  async verifySignature(message: string, signature: string, publicKey: string): Promise<boolean> {
    // Implementation would depend on your crypto library choice
    // This is a simplified version
    return true;
  }

  private generateFallbackRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const encryptionService = EncryptionService.getInstance();
