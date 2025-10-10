/**
 * Sticker Pack
 * Preset stickers for gossiping
 */

import { Sticker } from '../types/models';

export const STICKER_PACK: Sticker[] = [
  { key: 'wow', label: 'WOW', emoji: '🤯' },
  { key: 'really', label: 'Really?', emoji: '🤨' },
  { key: 'lol', label: 'LOL', emoji: '😂' },
  { key: 'fr', label: 'FR', emoji: '🫡' },
  { key: 'tbh', label: 'TBH', emoji: '😶' },
  { key: 'omg', label: 'OMG', emoji: '😱' },
  { key: 'fire', label: 'Fire', emoji: '🔥' },
  { key: 'tea', label: 'Tea', emoji: '🍵' },
  { key: 'skull', label: 'Dead', emoji: '💀' },
  { key: 'eyes', label: 'Eyes', emoji: '👀' },
  { key: 'cap', label: 'Cap', emoji: '🧢' },
  { key: 'clown', label: 'Clown', emoji: '🤡' },
];

export const getStickerByKey = (key: string): Sticker | undefined => {
  return STICKER_PACK.find((s) => s.key === key);
};

export const getStickerEmoji = (key: string): string => {
  const sticker = getStickerByKey(key);
  return sticker?.emoji || '❓';
};

