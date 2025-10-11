/**
 * Local Storage Utilities
 * For client-side persistence only
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalUserState, LocalMessage } from '../types';

// Storage keys
const KEYS = {
  USER_PROFILE: '@gossipin:user_profile',
  CHAT_HISTORY: '@gossipin:chat_history', // Prefix for chat histories
  SETTINGS: '@gossipin:settings',
};

/**
 * User Profile Storage
 */
export const saveUserProfile = async (profile: LocalUserState): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<LocalUserState | null> => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
};

export const clearUserProfile = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.USER_PROFILE);
};

/**
 * Chat History Storage (per group/DM)
 */
export const saveChatHistory = async (chatId: string, messages: LocalMessage[]): Promise<void> => {
  const key = `${KEYS.CHAT_HISTORY}:${chatId}`;
  await AsyncStorage.setItem(key, JSON.stringify(messages));
};

export const getChatHistory = async (chatId: string): Promise<LocalMessage[]> => {
  const key = `${KEYS.CHAT_HISTORY}:${chatId}`;
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const clearChatHistory = async (chatId: string): Promise<void> => {
  const key = `${KEYS.CHAT_HISTORY}:${chatId}`;
  await AsyncStorage.removeItem(key);
};

export const clearAllChatHistories = async (): Promise<void> => {
  const keys = await AsyncStorage.getAllKeys();
  const chatKeys = keys.filter(key => key.startsWith(KEYS.CHAT_HISTORY));
  await AsyncStorage.multiRemove(chatKeys);
};

/**
 * Settings Storage
 */
export interface AppSettings {
  saveMessagesLocally: boolean;
  notificationsEnabled: boolean;
}

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = async (): Promise<AppSettings> => {
  const data = await AsyncStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : {
    saveMessagesLocally: true,
    notificationsEnabled: true,
  };
};

