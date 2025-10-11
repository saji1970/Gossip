/**
 * Media Service
 * Handles media conversion to Base64 for ephemeral transmission
 * NO Firebase Storage - all media sent as Base64 strings
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

class MediaService {
  /**
   * Pick image from library
   * Returns Base64 encoded string
   */
  async pickImage(): Promise<string | null> {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Compress to reduce Base64 size
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) {
      return null;
    }

    // Return Base64 string with data URI prefix
    return `data:image/jpeg;base64,${result.assets[0].base64}`;
  }

  /**
   * Take photo with camera
   * Returns Base64 encoded string
   */
  async takePhoto(): Promise<string | null> {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission not granted');
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) {
      return null;
    }

    return `data:image/jpeg;base64,${result.assets[0].base64}`;
  }

  /**
   * Pick video from library
   * Returns Base64 encoded string
   * WARNING: Videos can be very large - use with caution
   */
  async pickVideo(): Promise<string | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.3, // Heavy compression for videos
    });

    if (result.canceled || !result.assets[0].uri) {
      return null;
    }

    // Convert video to Base64
    try {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Get MIME type
      const mimeType = 'video/mp4'; // Default to MP4
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to convert video to Base64:', error);
      return null;
    }
  }

  /**
   * Validate Base64 data URI
   */
  isValidDataUri(dataUri: string): boolean {
    return /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/.test(dataUri);
  }

  /**
   * Get MIME type from data URI
   */
  getMimeType(dataUri: string): string | null {
    const match = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    return match ? match[1] : null;
  }

  /**
   * Get media type from MIME type
   */
  getMediaType(dataUri: string): 'image' | 'video' | 'audio' | 'unknown' {
    const mimeType = this.getMimeType(dataUri);
    if (!mimeType) return 'unknown';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    
    return 'unknown';
  }

  /**
   * Estimate Base64 size in MB
   */
  estimateSize(base64String: string): number {
    // Remove data URI prefix
    const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
    
    // Base64 is ~4/3 the size of the original data
    const bytes = (base64Data.length * 3) / 4;
    const megabytes = bytes / (1024 * 1024);
    
    return Math.round(megabytes * 100) / 100;
  }

  /**
   * Check if media size is acceptable (< 5MB recommended)
   */
  isAcceptableSize(base64String: string, maxMB: number = 5): boolean {
    return this.estimateSize(base64String) <= maxMB;
  }

  /**
   * Compress image to target size
   * Reduces quality until size is acceptable
   */
  async compressImage(uri: string, maxMB: number = 2): Promise<string | null> {
    let quality = 0.8;
    let result: string | null = null;

    while (quality > 0.1) {
      const compressed = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality,
        base64: true,
      });

      if (compressed.canceled || !compressed.assets[0].base64) {
        return null;
      }

      result = `data:image/jpeg;base64,${compressed.assets[0].base64}`;

      if (this.isAcceptableSize(result, maxMB)) {
        return result;
      }

      quality -= 0.1;
    }

    return result;
  }
}

export default new MediaService();

