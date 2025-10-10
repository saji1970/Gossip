/**
 * Avatar System
 * Character-based avatars for anonymous users
 */

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  category: 'person' | 'animal' | 'character';
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // People avatars
  { id: 'man1', name: 'Man 1', emoji: '👨', category: 'person' },
  { id: 'man2', name: 'Man 2', emoji: '👨‍💼', category: 'person' },
  { id: 'man3', name: 'Man 3', emoji: '👨‍🎓', category: 'person' },
  { id: 'man4', name: 'Man 4', emoji: '👨‍🚀', category: 'person' },
  { id: 'woman1', name: 'Woman 1', emoji: '👩', category: 'person' },
  { id: 'woman2', name: 'Woman 2', emoji: '👩‍💼', category: 'person' },
  { id: 'woman3', name: 'Woman 3', emoji: '👩‍🎓', category: 'person' },
  { id: 'woman4', name: 'Woman 4', emoji: '👩‍🚀', category: 'person' },
  { id: 'person1', name: 'Person 1', emoji: '🧑', category: 'person' },
  { id: 'person2', name: 'Person 2', emoji: '🧑‍💼', category: 'person' },
  { id: 'person3', name: 'Person 3', emoji: '🧑‍🎓', category: 'person' },
  { id: 'person4', name: 'Person 4', emoji: '🧑‍🚀', category: 'person' },
  
  // Animal avatars
  { id: 'dog', name: 'Dog', emoji: '🐶', category: 'animal' },
  { id: 'cat', name: 'Cat', emoji: '🐱', category: 'animal' },
  { id: 'bear', name: 'Bear', emoji: '🐻', category: 'animal' },
  { id: 'panda', name: 'Panda', emoji: '🐼', category: 'animal' },
  { id: 'koala', name: 'Koala', emoji: '🐨', category: 'animal' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', category: 'animal' },
  { id: 'lion', name: 'Lion', emoji: '🦁', category: 'animal' },
  { id: 'fox', name: 'Fox', emoji: '🦊', category: 'animal' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', category: 'animal' },
  { id: 'mouse', name: 'Mouse', emoji: '🐭', category: 'animal' },
  { id: 'hamster', name: 'Hamster', emoji: '🐹', category: 'animal' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', category: 'animal' },
  
  // Character avatars
  { id: 'robot', name: 'Robot', emoji: '🤖', category: 'character' },
  { id: 'alien', name: 'Alien', emoji: '👽', category: 'character' },
  { id: 'ghost', name: 'Ghost', emoji: '👻', category: 'character' },
  { id: 'superhero', name: 'Superhero', emoji: '🦸', category: 'character' },
  { id: 'wizard', name: 'Wizard', emoji: '🧙', category: 'character' },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', category: 'character' },
  { id: 'pirate', name: 'Pirate', emoji: '🏴‍☠️', category: 'character' },
  { id: 'clown', name: 'Clown', emoji: '🤡', category: 'character' },
];

/**
 * Get a random avatar
 */
export const getRandomAvatar = (): string => {
  const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
  return randomAvatar.id;
};

/**
 * Get avatar by ID
 */
export const getAvatarById = (id: string): AvatarOption | undefined => {
  return AVATAR_OPTIONS.find(avatar => avatar.id === id);
};

/**
 * Get avatars by category
 */
export const getAvatarsByCategory = (category: 'person' | 'animal' | 'character'): AvatarOption[] => {
  return AVATAR_OPTIONS.filter(avatar => avatar.category === category);
};

