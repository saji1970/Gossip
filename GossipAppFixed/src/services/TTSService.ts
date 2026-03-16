import Tts from 'react-native-tts';

let initialized = false;
let speaking = false;

export function initialize(): void {
  if (initialized) return;
  initialized = true;

  Tts.setDefaultLanguage('en-US').catch(() => {});
  Tts.setDefaultRate(0.5).catch(() => {});
  Tts.setDefaultPitch(1.0).catch(() => {});

  Tts.addEventListener('tts-start', () => {
    speaking = true;
  });
  Tts.addEventListener('tts-finish', () => {
    speaking = false;
  });
  Tts.addEventListener('tts-cancel', () => {
    speaking = false;
  });
}

export function isSpeaking(): boolean {
  return speaking;
}

export function stop(): void {
  Tts.stop();
  speaking = false;
}

export function speakMessage(
  senderName: string,
  content: string,
  isOwnMessage: boolean,
): void {
  const attribution = isOwnMessage ? 'You said' : `${senderName} says`;
  const utterance = `${attribution}: ${content}`;
  Tts.speak(utterance);
}

export interface SpeakableMessage {
  senderName: string;
  content: string;
  isOwnMessage: boolean;
  type: 'text' | 'voice';
}

export function speakMessages(messages: SpeakableMessage[]): void {
  const textMessages = messages.filter(m => m.type === 'text');
  if (textMessages.length === 0) return;

  for (const msg of textMessages) {
    speakMessage(msg.senderName, msg.content, msg.isOwnMessage);
  }
}
