/**
 * Sticker Types
 */

export interface Sticker {
  key: string;
  label: string;
  emoji: string;
}

export const STICKER_PACK: Sticker[] = [
  { key: 'wow', label: 'WOW', emoji: '🤯' },
  { key: 'really', label: 'Really?', emoji: '🤨' },
  { key: 'lol', label: 'LOL', emoji: '😂' },
  { key: 'fr', label: 'FR', emoji: '🫡' },
  { key: 'tbh', label: 'TBH', emoji: '😶' },
  { key: 'omg', label: 'OMG', emoji: '😱' },
];

