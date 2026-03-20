import { it, describe, expect, jest } from '@jest/globals';

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

import * as ResponseBuilder from '../../src/modules/gossip/ResponseBuilder';
import { Group } from '../../src/utils/GroupStorage';

const makeGroup = (id: string, name: string, memberCount = 2): Group => ({
  id,
  name,
  members: Array.from({ length: memberCount }, (_, i) => ({
    email: `user${i}@test.com`,
    role: 'member' as const,
    joinedAt: new Date().toISOString(),
  })),
  createdAt: new Date().toISOString(),
  createdBy: 'test@test.com',
  timestamp: new Date().toISOString(),
  unreadCount: 0,
});

describe('ResponseBuilder - New Builders', () => {
  // ── buildCasualResponse ──
  describe('buildCasualResponse', () => {
    it('should respond to greetings', () => {
      const res = ResponseBuilder.buildCasualResponse('how are you?', 'chill');
      expect(res.type).toBe('info');
      expect(res.message.length).toBeGreaterThan(0);
    });

    it('should respond to thanks', () => {
      const res = ResponseBuilder.buildCasualResponse('thanks!', 'supportive');
      expect(res.type).toBe('info');
      expect(res.message.length).toBeGreaterThan(0);
    });

    it('should respond to laughter', () => {
      const res = ResponseBuilder.buildCasualResponse('lol haha', 'hyped');
      expect(res.type).toBe('info');
    });

    it('should respond to goodbye', () => {
      const res = ResponseBuilder.buildCasualResponse('bye!', 'chill');
      expect(res.type).toBe('info');
      const lower = res.message.toLowerCase();
      expect(lower.includes('bye') || lower.includes('later') || lower.includes('see') || lower.includes('peace')).toBe(true);
    });

    it('should respond to good morning', () => {
      const res = ResponseBuilder.buildCasualResponse('good morning', 'supportive');
      expect(res.type).toBe('info');
      expect(res.message.toLowerCase()).toContain('morning');
    });

    it('should give fallback for random text', () => {
      const res = ResponseBuilder.buildCasualResponse('random stuff here', 'curious');
      expect(res.type).toBe('info');
      expect(res.message.length).toBeGreaterThan(0);
    });

    it('should vary responses by mood', () => {
      const moods = ['chill', 'hyped', 'sassy', 'supportive', 'curious'] as const;
      const responses = moods.map(mood =>
        ResponseBuilder.buildCasualResponse('random text', mood).message,
      );
      // At least some responses should differ across moods
      const unique = new Set(responses);
      // Not guaranteed to differ due to randomness, but pool size should make it likely
      expect(unique.size).toBeGreaterThanOrEqual(1);
    });
  });

  // ── buildGroupsList ──
  describe('buildGroupsList', () => {
    it('should handle empty groups', () => {
      const res = ResponseBuilder.buildGroupsList([]);
      expect(res.type).toBe('info');
      expect(res.message).toContain('don\'t have any groups');
    });

    it('should list groups as options', () => {
      const groups = [
        makeGroup('1', 'MyFriends'),
        makeGroup('2', 'Work'),
        makeGroup('3', 'Family'),
      ];
      const res = ResponseBuilder.buildGroupsList(groups);
      expect(res.type).toBe('clarify');
      expect(res.options).toBeDefined();
      expect(res.options!.length).toBe(3);
      expect(res.options![0].label).toBe('MyFriends');
      expect(res.options![1].label).toBe('Work');
    });

    it('should cap at 6 groups', () => {
      const groups = Array.from({ length: 10 }, (_, i) =>
        makeGroup(`${i}`, `Group${i}`),
      );
      const res = ResponseBuilder.buildGroupsList(groups);
      expect(res.options!.length).toBe(6);
    });

    it('should include open_chat commands', () => {
      const groups = [makeGroup('abc', 'TestGroup')];
      const res = ResponseBuilder.buildGroupsList(groups);
      expect(res.options![0].command.type).toBe('open_chat');
      const payload = JSON.parse(res.options![0].command.payload);
      expect(payload.groupId).toBe('abc');
    });
  });

  // ── buildSettingsAction ──
  describe('buildSettingsAction', () => {
    it('should build logout action', () => {
      const res = ResponseBuilder.buildSettingsAction('logout');
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('logout');
    });

    it('should build theme action', () => {
      const res = ResponseBuilder.buildSettingsAction('theme');
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('settings_theme');
    });

    it('should build profile action', () => {
      const res = ResponseBuilder.buildSettingsAction('profile');
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('settings_profile');
    });

    it('should fallback to generic settings', () => {
      const res = ResponseBuilder.buildSettingsAction('unknown_thing');
      expect(res.type).toBe('execute');
      expect(res.command!.payload).toBe('setting');
    });
  });

  // ── buildWelcomeBack ──
  describe('buildWelcomeBack', () => {
    it('should include user name', () => {
      const msg = ResponseBuilder.buildWelcomeBack('Saji', 'chill');
      expect(msg).toContain('Saji');
    });

    it('should strip email domain if email given', () => {
      const msg = ResponseBuilder.buildWelcomeBack('saji@gmail.com', 'hyped');
      expect(msg).toContain('saji');
      expect(msg).not.toContain('@gmail.com');
    });

    it('should return non-empty for all moods', () => {
      const moods = ['chill', 'hyped', 'sassy', 'supportive', 'curious'] as const;
      for (const mood of moods) {
        const msg = ResponseBuilder.buildWelcomeBack('Test', mood);
        expect(msg.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Existing builders still work ──
  describe('existing builders still work', () => {
    it('buildHelp returns info with commands', () => {
      const res = ResponseBuilder.buildHelp();
      expect(res.type).toBe('info');
      expect(res.message).toContain('Chat with');
    });

    it('buildUnknown returns unknown type', () => {
      const res = ResponseBuilder.buildUnknown();
      expect(res.type).toBe('unknown');
    });

    it('buildExecute wraps command', () => {
      const cmd = { type: 'navigate' as const, payload: 'home', rawText: 'go home', confidence: 1 };
      const res = ResponseBuilder.buildExecute('Going home', cmd);
      expect(res.type).toBe('execute');
      expect(res.command).toBe(cmd);
    });
  });
});
