import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  enabled: '@gossip_notif_enabled',
  sound: '@gossip_notif_sound',
  vibration: '@gossip_notif_vibration',
};

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

const DEFAULTS: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const [enabled, sound, vibration] = await Promise.all([
      AsyncStorage.getItem(KEYS.enabled),
      AsyncStorage.getItem(KEYS.sound),
      AsyncStorage.getItem(KEYS.vibration),
    ]);
    return {
      enabled: enabled !== null ? enabled === 'true' : DEFAULTS.enabled,
      sound: sound !== null ? sound === 'true' : DEFAULTS.sound,
      vibration: vibration !== null ? vibration === 'true' : DEFAULTS.vibration,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function setNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  try {
    const ops: Promise<void>[] = [];
    if (settings.enabled !== undefined) {
      ops.push(AsyncStorage.setItem(KEYS.enabled, String(settings.enabled)));
    }
    if (settings.sound !== undefined) {
      ops.push(AsyncStorage.setItem(KEYS.sound, String(settings.sound)));
    }
    if (settings.vibration !== undefined) {
      ops.push(AsyncStorage.setItem(KEYS.vibration, String(settings.vibration)));
    }
    await Promise.all(ops);
  } catch {
    // ignore
  }
}
