import { useState, useEffect, useCallback } from 'react';
import * as TTSService from '../services/TTSService';
import * as LastReadService from '../services/LastReadService';

interface SpeakableMessage {
  senderName: string;
  content: string;
  isOwnMessage: boolean;
  type: 'text' | 'voice';
  timestamp: Date;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(TTSService.isSpeaking());
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const speakLatest = useCallback((messages: SpeakableMessage[]) => {
    const textMessages = messages.filter(m => m.type === 'text');
    if (textMessages.length === 0) return;

    const latest = textMessages[textMessages.length - 1];
    TTSService.speakMessage(latest.senderName, latest.content, latest.isOwnMessage);
  }, []);

  const speakUnread = useCallback(async (groupId: string, messages: SpeakableMessage[]) => {
    const unread = await LastReadService.getUnreadMessages(groupId, messages);
    const textUnread = unread.filter(m => m.type === 'text');

    if (textUnread.length === 0) {
      // Nothing unread — just read the latest
      speakLatest(messages);
      return;
    }

    TTSService.speakMessages(textUnread);
  }, [speakLatest]);

  const stop = useCallback(() => {
    TTSService.stop();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speakLatest, speakUnread, stop };
}
