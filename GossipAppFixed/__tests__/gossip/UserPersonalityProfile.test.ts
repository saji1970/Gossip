import { it, describe, expect, beforeEach, jest } from '@jest/globals';

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

import { userPersonalityProfile } from '../../src/modules/gossip/UserPersonalityProfile';

describe('UserPersonalityProfile', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('should load without errors', async () => {
    await userPersonalityProfile.load();
    const profile = userPersonalityProfile.getProfile();
    expect(profile).toBeDefined();
    expect(profile.totalInteractions).toBeGreaterThanOrEqual(0);
  });

  it('should analyze text input and update profile', () => {
    const before = userPersonalityProfile.getProfile();
    const beforeInteractions = before.totalInteractions;

    userPersonalityProfile.analyzeInput('Hey what is up my friend? How are you doing today?');

    const after = userPersonalityProfile.getProfile();
    expect(after.totalInteractions).toBe(beforeInteractions + 1);
  });

  it('should detect emoji usage', () => {
    // Run several times to build up EMA
    for (let i = 0; i < 20; i++) {
      userPersonalityProfile.analyzeInput('love this so much!! \u{1F60D}\u{1F525}\u{1F4AF}');
    }
    const profile = userPersonalityProfile.getProfile();
    expect(profile.emojiUsageRate).toBeGreaterThan(0);
  });

  it('should detect slang usage', () => {
    for (let i = 0; i < 20; i++) {
      userPersonalityProfile.analyzeInput('yo fr fr that is bussin no cap bruh');
    }
    const profile = userPersonalityProfile.getProfile();
    expect(profile.slangUsageRate).toBeGreaterThan(0);
  });

  it('should detect questions', () => {
    for (let i = 0; i < 20; i++) {
      userPersonalityProfile.analyzeInput('how are you doing today?');
    }
    const profile = userPersonalityProfile.getProfile();
    expect(profile.questionRate).toBeGreaterThan(0.3);
  });

  it('should record command usage', () => {
    userPersonalityProfile.recordCommandUsage('chat_with_person');
    userPersonalityProfile.recordCommandUsage('chat_with_person');
    userPersonalityProfile.recordCommandUsage('create_group');

    const profile = userPersonalityProfile.getProfile();
    expect(profile.frequentCommands['chat_with_person']).toBe(2);
    expect(profile.frequentCommands['create_group']).toBe(1);
  });

  it('should record contact interactions', () => {
    userPersonalityProfile.recordContactInteraction('Alice');
    userPersonalityProfile.recordContactInteraction('Alice');
    userPersonalityProfile.recordContactInteraction('Bob');

    const profile = userPersonalityProfile.getProfile();
    expect(profile.frequentContacts['alice']).toBe(2);
    expect(profile.frequentContacts['bob']).toBe(1);
  });

  it('should return a communication style', () => {
    const style = userPersonalityProfile.getCommunicationStyle();
    expect(['formal', 'casual', 'terse', 'verbose']).toContain(style);
  });

  it('should classify terse users correctly', () => {
    // Feed many short messages to shift EMA
    for (let i = 0; i < 50; i++) {
      userPersonalityProfile.analyzeInput('ok');
    }
    const style = userPersonalityProfile.getCommunicationStyle();
    expect(style).toBe('terse');
  });
});
