import notifee, { AndroidImportance } from '@notifee/react-native';
import * as api from './api';
import * as LastReadService from './LastReadService';

const CHANNEL_ID = 'gossip-messages';
const POLL_INTERVAL_MS = 30000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastNotifiedTs: Map<string, number> = new Map();
let notificationsEnabled = true;
let glassesMode = false;

export function setGlassesMode(enabled: boolean): void {
  glassesMode = enabled;
}

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Gossip Messages',
    importance: AndroidImportance.HIGH,
  });
}

async function checkGroupForNewMessages(
  groupId: string,
  groupName: string,
  userEmail: string,
): Promise<void> {
  try {
    const messages = await api.getMessages(groupId, 5, 0);
    if (messages.length === 0) return;

    const lastRead = await LastReadService.getLastReadTimestamp(groupId);
    const lastNotified = lastNotifiedTs.get(groupId) || lastRead;

    const newMessages = messages.filter(msg => {
      const ts = new Date(msg.timestamp).getTime();
      return ts > lastNotified && msg.senderId !== userEmail && !msg.isOwnMessage;
    });

    if (newMessages.length === 0) return;

    // Show notification for the latest new message
    const latest = newMessages[newMessages.length - 1];
    let body: string;
    if (glassesMode) {
      // Short format for smart glasses
      const shortName = latest.senderName.split(' ')[0];
      body = latest.messageType === 'voice'
        ? `${shortName}: voice msg`
        : `${shortName}: ${latest.content.slice(0, 40)}`;
    } else {
      body = latest.messageType === 'voice'
        ? `${latest.senderName}: [Voice message]`
        : `${latest.senderName}: ${latest.content}`;
    }

    await notifee.displayNotification({
      title: groupName,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });

    // Update last-notified timestamp
    const latestTs = new Date(latest.timestamp).getTime();
    lastNotifiedTs.set(groupId, latestTs);
  } catch (e) {
    // Silently ignore — network may be down
  }
}

export function setEnabled(enabled: boolean): void {
  notificationsEnabled = enabled;
  if (!enabled) {
    stopPolling();
  }
}

export function startPolling(
  groups: Array<{ id: string; name: string }>,
  userEmail: string,
): void {
  stopPolling();

  if (!notificationsEnabled) return;

  ensureChannel().catch(() => {});

  pollTimer = setInterval(() => {
    for (const group of groups) {
      checkGroupForNewMessages(group.id, group.name, userEmail);
    }
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  lastNotifiedTs.clear();
}
