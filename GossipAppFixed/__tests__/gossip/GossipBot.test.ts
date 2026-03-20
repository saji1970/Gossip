import { it, describe, expect, beforeAll, jest } from '@jest/globals';

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

import { gossipBot } from '../../src/modules/gossip/GossipBot';
import { GossipContext } from '../../src/modules/gossip/types';

const makeContext = (groups: any[] = []): GossipContext => ({
  user: { uid: '1', email: 'saji@test.com', displayName: 'Saji' },
  groups,
  currentScreen: 'MainTabs',
});

const makeGroup = (id: string, name: string) => ({
  id,
  name,
  members: [
    { email: 'saji@test.com', role: 'admin', joinedAt: new Date().toISOString() },
    { email: 'alice@test.com', role: 'member', joinedAt: new Date().toISOString() },
  ],
  createdAt: new Date().toISOString(),
  createdBy: 'saji@test.com',
  timestamp: new Date().toISOString(),
  unreadCount: 0,
});

describe('GossipBot - Integration', () => {
  beforeAll(async () => {
    await gossipBot.initialize();
  });

  // ── casual_chat intent ──
  describe('casual chat handling', () => {
    it('should respond conversationally to "how are you"', async () => {
      const res = await gossipBot.processInput('how are you', makeContext());
      expect(res.type).toBe('info');
      expect(res.message.length).toBeGreaterThan(0);
      // Should NOT be the old "I didn\'t catch that" help text
      expect(res.message).not.toContain('Here\'s what I can help with');
    });

    it('should respond to "thanks"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('thanks', makeContext());
      expect(res.type).toBe('info');
    });

    it('should respond to "lol"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('lol', makeContext());
      expect(res.type).toBe('info');
    });

    it('should respond to "good morning"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('good morning', makeContext());
      expect(res.type).toBe('info');
      expect(res.message.toLowerCase()).toContain('morning');
    });
  });

  // ── show_groups intent ──
  describe('show_groups handling', () => {
    it('should list groups when user says "my groups"', async () => {
      gossipBot.reset();
      const groups = [makeGroup('1', 'Friends'), makeGroup('2', 'Work')];
      const res = await gossipBot.processInput('my groups', makeContext(groups));
      expect(res.options).toBeDefined();
      expect(res.options!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty groups', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('my groups', makeContext([]));
      expect(res.message).toContain('don\'t have any groups');
    });
  });

  // ── settings_change intent ──
  describe('settings_change handling', () => {
    it('should handle "log out"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('log out', makeContext());
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('logout');
    });

    it('should handle "dark mode"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('dark mode', makeContext());
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('settings_theme');
    });

    it('should handle "edit profile"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('edit profile', makeContext());
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('settings_profile');
    });
  });

  // ── Unknown text now gets casual response, not help ──
  describe('unknown text handling', () => {
    it('should give casual response instead of generic help', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('i had pizza for lunch', makeContext());
      expect(res.type).toBe('info');
      // Should NOT be the old "I didn't catch that" with command list
      expect(res.message).not.toContain('Chat with [name]');
    });
  });

  // ── Existing functionality still works ──
  describe('existing commands still work', () => {
    it('should handle "chat with alice"', async () => {
      gossipBot.reset();
      const groups = [makeGroup('1', 'Friends')];
      const res = await gossipBot.processInput('chat with alice', makeContext(groups));
      // Should find alice in Friends group
      expect(['execute', 'clarify']).toContain(res.type);
    });

    it('should handle "create group"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('create group TestGroup', makeContext());
      expect(res.type).toBe('execute');
      expect(res.command!.type).toBe('create_group');
    });

    it('should handle "help"', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('help', makeContext());
      expect(res.type).toBe('info');
      expect(res.message).toContain('Chat with');
    });

    it('should handle empty input', async () => {
      gossipBot.reset();
      const res = await gossipBot.processInput('', makeContext());
      expect(res).toBeDefined();
    });
  });
});
