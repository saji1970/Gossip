import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@gossip_last_read_';

export async function getLastReadTimestamp(groupId: string): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(KEY_PREFIX + groupId);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setLastReadTimestamp(groupId: string, ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + groupId, ts.toString());
  } catch (e) {
    console.error('Failed to save last-read timestamp:', e);
  }
}

export interface TimestampedMessage {
  timestamp: Date | string;
  [key: string]: any;
}

export async function getUnreadMessages<T extends TimestampedMessage>(
  groupId: string,
  messages: T[],
): Promise<T[]> {
  const lastRead = await getLastReadTimestamp(groupId);
  if (lastRead === 0) return messages;

  return messages.filter(m => {
    const ts = m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime();
    return ts > lastRead;
  });
}
