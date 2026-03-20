import { it, describe, expect, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { resolve, extractCompoundEntities } from '../../src/modules/gossip/IntentResolver';

describe('IntentResolver - New Intents', () => {
  // ── casual_chat ──
  describe('casual_chat intent', () => {
    it('should detect "how are you"', () => {
      const result = resolve('how are you');
      expect(result.intent).toBe('casual_chat');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect "what up"', () => {
      const result = resolve('what up');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "thanks"', () => {
      const result = resolve('thanks');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "lol"', () => {
      const result = resolve('lol');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "hey gossip"', () => {
      const result = resolve('hey gossip');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "good morning"', () => {
      const result = resolve('good morning');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "bye"', () => {
      const result = resolve('bye');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "haha"', () => {
      const result = resolve('haha');
      expect(result.intent).toBe('casual_chat');
    });

    it('should detect "wassup"', () => {
      const result = resolve('wassup');
      expect(result.intent).toBe('casual_chat');
    });
  });

  // ── show_groups ──
  describe('show_groups intent', () => {
    it('should detect "my groups"', () => {
      const result = resolve('my groups');
      expect(result.intent).toBe('show_groups');
    });

    it('should detect "show groups"', () => {
      const result = resolve('show groups');
      // Could also match navigate, but show_groups should be there
      expect(['show_groups', 'navigate']).toContain(result.intent);
    });

    it('should detect "list groups"', () => {
      const result = resolve('list groups');
      expect(['show_groups', 'query_groups']).toContain(result.intent);
    });
  });

  // ── settings_change ──
  describe('settings_change intent', () => {
    it('should detect "change theme"', () => {
      const result = resolve('change theme');
      expect(result.intent).toBe('settings_change');
    });

    it('should detect "log out"', () => {
      const result = resolve('log out');
      expect(result.intent).toBe('settings_change');
    });

    it('should detect "dark mode"', () => {
      const result = resolve('dark mode');
      expect(result.intent).toBe('settings_change');
    });

    it('should detect "edit profile"', () => {
      const result = resolve('edit profile');
      expect(result.intent).toBe('settings_change');
    });

    it('should extract logout entity', () => {
      const result = resolve('log out');
      const entity = result.entities.find(e => e.value === 'logout');
      expect(entity).toBeDefined();
    });

    it('should extract theme entity', () => {
      const result = resolve('change theme');
      const entity = result.entities.find(e => e.value === 'theme');
      expect(entity).toBeDefined();
    });

    it('should extract profile entity', () => {
      const result = resolve('edit profile');
      const entity = result.entities.find(e => e.value === 'profile');
      expect(entity).toBeDefined();
    });
  });

  // ── add_member ──
  describe('add_member intent', () => {
    it('should detect "add member to group"', () => {
      const result = resolve('add member to group');
      expect(result.intent).toBe('add_member');
    });

    it('should detect "invite to group"', () => {
      const result = resolve('invite to group');
      expect(result.intent).toBe('add_member');
    });

    it('should detect "send invite"', () => {
      const result = resolve('send invite');
      expect(result.intent).toBe('add_member');
    });

    it('should extract email entity', () => {
      const result = resolve('add siddarth to group PillaiFamily his email is sid@gmail.com');
      const email = result.entities.find(e => e.type === 'email');
      expect(email).toBeDefined();
      expect(email?.value).toBe('sid@gmail.com');
    });
  });

  // ── Compound commands ──
  describe('compound command detection', () => {
    it('should extract person from "create group X and add Y"', () => {
      const extras = extractCompoundEntities(
        'create a private group PillaiFamily and add Siddarth his email is sid@gmail.com',
        'create_group',
      );
      const person = extras.find(e => e.type === 'person');
      expect(person).toBeDefined();
      expect(person?.value).toBe('siddarth');
    });

    it('should extract email from compound command', () => {
      const extras = extractCompoundEntities(
        'create group PillaiFamily and add Siddarth email sid@gmail.com',
        'create_group',
      );
      const email = extras.find(e => e.type === 'email');
      expect(email).toBeDefined();
      expect(email?.value).toBe('sid@gmail.com');
    });

    it('should extract privacy from compound command', () => {
      const extras = extractCompoundEntities(
        'create a private group PillaiFamily',
        'create_group',
      );
      const privacy = extras.find(e => e.type === 'privacy');
      expect(privacy).toBeDefined();
      expect(privacy?.value).toBe('private');
    });
  });

  // ── Existing intents still work ──
  describe('existing intents unchanged', () => {
    it('should still detect "chat with alice"', () => {
      const result = resolve('chat with alice');
      expect(result.intent).toBe('chat_with_person');
    });

    it('should still detect "create group"', () => {
      const result = resolve('create group');
      expect(result.intent).toBe('create_group');
    });

    it('should still detect "call"', () => {
      const result = resolve('call');
      expect(result.intent).toBe('call_group');
    });

    it('should still detect "help"', () => {
      const result = resolve('help');
      expect(result.intent).toBe('help');
    });

    it('should return unknown for gibberish', () => {
      const result = resolve('xyzzy plugh');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });
});
