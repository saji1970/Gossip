import { anonymousAuthService } from './AnonymousAuthService';
import { ephemeralMessageService } from './EphemeralMessageService';

/**
 * Ephemeral Media Service for Base64 Media Sharing
 * 
 * Core Principle: No persistent server storage
 * - Media converted to Base64 on client
 * - Transmitted as part of message payload via transient Firestore bus
 * - Deleted immediately after transit
 * - Large Base64 strings simulate media sharing without server logging
 */
export class EphemeralMediaService {
  private static instance: EphemeralMediaService;

  static getInstance(): EphemeralMediaService {
    if (!EphemeralMediaService.instance) {
      EphemeralMediaService.instance = new EphemeralMediaService();
    }
    return EphemeralMediaService.instance;
  }

  /**
   * Convert image to Base64 and send as ephemeral message
   */
  async sendImage(chatId: string, imageUri: string): Promise<void> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Convert image to Base64
      const base64Data = await this.convertImageToBase64(imageUri);
      
      // Send as ephemeral message
      await ephemeralMessageService.sendMessage(chatId, base64Data, 'photo');
    } catch (error) {
      throw new Error(`Failed to send image: ${error}`);
    }
  }

  /**
   * Convert video to Base64 and send as ephemeral message
   */
  async sendVideo(chatId: string, videoUri: string): Promise<void> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Convert video to Base64
      const base64Data = await this.convertVideoToBase64(videoUri);
      
      // Send as ephemeral message
      await ephemeralMessageService.sendMessage(chatId, base64Data, 'video');
    } catch (error) {
      throw new Error(`Failed to send video: ${error}`);
    }
  }

  /**
   * Convert Base64 data back to file URI for display
   */
  async convertBase64ToFile(base64Data: string, type: 'photo' | 'video'): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Create blob URL for display
      const blob = this.base64ToBlob(base64, type === 'photo' ? 'image/jpeg' : 'video/mp4');
      const fileUri = URL.createObjectURL(blob);
      
      return fileUri;
    } catch (error) {
      throw new Error(`Failed to convert Base64 to file: ${error}`);
    }
  }

  /**
   * Get file size from Base64 data
   */
  getBase64FileSize(base64Data: string): number {
    // Calculate approximate file size from Base64
    // Base64 encoding increases size by ~33%
    const base64Length = base64Data.length;
    const padding = (base64Data.match(/=/g) || []).length;
    return Math.floor((base64Length * 3) / 4) - padding;
  }

  /**
   * Compress Base64 image data
   */
  async compressBase64Image(base64Data: string, quality: number = 0.8): Promise<string> {
    try {
      // Create image element
      const img = new Image();
      img.src = base64Data;
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to compressed Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      });
    } catch (error) {
      throw new Error(`Failed to compress image: ${error}`);
    }
  }

  /**
   * Convert image to Base64
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // In React Native, you would use react-native-fs or similar
      // For web simulation, we'll use fetch
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to convert image to Base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to Base64: ${error}`);
    }
  }

  /**
   * Convert video to Base64
   */
  private async convertVideoToBase64(videoUri: string): Promise<string> {
    try {
      // In React Native, you would use react-native-fs or similar
      // For web simulation, we'll use fetch
      const response = await fetch(videoUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to convert video to Base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert video to Base64: ${error}`);
    }
  }

  /**
   * Convert Base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Validate Base64 data
   */
  isValidBase64(base64Data: string): boolean {
    try {
      // Check if it's a valid Base64 string
      const base64Regex = /^data:([A-Za-z0-9+/]+);base64,([A-Za-z0-9+/=]+)$/;
      return base64Regex.test(base64Data);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get media type from Base64 data
   */
  getMediaTypeFromBase64(base64Data: string): 'image' | 'video' | 'unknown' {
    if (base64Data.startsWith('data:image/')) {
      return 'image';
    } else if (base64Data.startsWith('data:video/')) {
      return 'video';
    }
    return 'unknown';
  }
}

export const ephemeralMediaService = EphemeralMediaService.getInstance();

