/**
 * Local Storage Service
 * Client-side persistence using AsyncStorage
 * NO PII - only anonymous data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, LocalMessage, ChatHistory, DirectChannel, AnonId } from '../types/models';

const STORAGE_KEYS = {
  USER_PROFILE: '@gossipin:user_profile',
  CHAT_HISTORY: '@gossipin:chat_history',
  DM_CHANNELS: '@gossipin:dm_channels',
  JOINED_GROUPS: '@gossipin:joined_groups',
  UID_TO_ANON_MAP: '@gossipin:uid_anon_map',
} as const;

class LocalStorageService {
  // ===== User Profile =====
  
  async saveUserProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserProfile(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  // ===== UID to AnonId Mapping (Local Only) =====
  
  async saveUidAnonMapping(uid: string, anonId: AnonId): Promise<void> {
    const mapping = await this.getUidAnonMapping();
    mapping[uid] = anonId;
    await AsyncStorage.setItem(STORAGE_KEYS.UID_TO_ANON_MAP, JSON.stringify(mapping));
  }

  async getUidAnonMapping(): Promise<Record<string, AnonId>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UID_TO_ANON_MAP);
    return data ? JSON.parse(data) : {};
  }

  async getAnonIdFromUid(uid: string): Promise<AnonId | null> {
    const mapping = await this.getUidAnonMapping();
    return mapping[uid] || null;
  }

  // ===== Chat History =====
  
  async saveChatHistory(targetId: string, messages: LocalMessage[]): Promise<void> {
    const history = await this.getAllChatHistories();
    history[targetId] = {
      targetId,
      messages,
      lastFetched: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  }

  async getChatHistory(targetId: string): Promise<ChatHistory | null> {
    const history = await this.getAllChatHistories();
    return history[targetId] || null;
  }

  async getAllChatHistories(): Promise<Record<string, ChatHistory>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return data ? JSON.parse(data) : {};
  }

  async addMessage(targetId: string, message: LocalMessage): Promise<void> {
    const history = await this.getChatHistory(targetId);
    const messages = history?.messages || [];
    messages.push(message);
    await this.saveChatHistory(targetId, messages);
  }

  async deleteChatHistory(targetId: string): Promise<void> {
    const history = await this.getAllChatHistories();
    delete history[targetId];
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  }

  async wipeAllChatHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  }

  // ===== DM Channels =====
  
  async saveDMChannel(channel: DirectChannel): Promise<void> {
    const channels = await this.getAllDMChannels();
    channels[channel.channelId] = channel;
    await AsyncStorage.setItem(STORAGE_KEYS.DM_CHANNELS, JSON.stringify(channels));
  }

  async getDMChannel(channelId: string): Promise<DirectChannel | null> {
    const channels = await this.getAllDMChannels();
    return channels[channelId] || null;
  }

  async getAllDMChannels(): Promise<Record<string, DirectChannel>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DM_CHANNELS);
    return data ? JSON.parse(data) : {};
  }

  async deleteDMChannel(channelId: string): Promise<void> {
    const channels = await this.getAllDMChannels();
    delete channels[channelId];
    await AsyncStorage.setItem(STORAGE_KEYS.DM_CHANNELS, JSON.stringify(channels));
  }

  // ===== Joined Groups =====
  
  async saveJoinedGroups(groupIds: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.JOINED_GROUPS, JSON.stringify(groupIds));
  }

  async getJoinedGroups(): Promise<string[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.JOINED_GROUPS);
    return data ? JSON.parse(data) : [];
  }

  async addJoinedGroup(groupId: string): Promise<void> {
    const groups = await this.getJoinedGroups();
    if (!groups.includes(groupId)) {
      groups.push(groupId);
      await this.saveJoinedGroups(groups);
    }
  }

  async removeJoinedGroup(groupId: string): Promise<void> {
    const groups = await this.getJoinedGroups();
    const filtered = groups.filter((id) => id !== groupId);
    await this.saveJoinedGroups(filtered);
  }

  // ===== Complete Wipe =====
  
  async wipeAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.CHAT_HISTORY,
      STORAGE_KEYS.DM_CHANNELS,
      STORAGE_KEYS.JOINED_GROUPS,
      // Note: We keep UID_TO_ANON_MAP to preserve identity consistency
    ]);
  }
}

export default new LocalStorageService();

