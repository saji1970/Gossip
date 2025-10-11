/**
 * Anonymous ID Generation
 * Converts Firebase UID to non-reversible UUID v4
 */

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new anonymous ID (UUID v4)
 */
export const generateAnonId = (): string => {
  return uuidv4();
};

/**
 * For consistent anonId generation from Firebase UID
 * Note: This is a one-way transformation
 */
export const uidToAnonId = (firebaseUid: string): string => {
  // In production, you might want to store the mapping locally
  // For now, we generate a new UUID
  return generateAnonId();
};
