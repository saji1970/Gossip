import { it, describe, expect, beforeEach, jest } from '@jest/globals';

// Mock AsyncStorage
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

// Must import AFTER mocks
import { conversationHistory } from '../../src/modules/gossip/ConversationHistory';

describe('ConversationHistory', () => {
  beforeEach(() => {
    // Clear store and reset module
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    conversationHistory.clear();
  });

  it('should load without errors', async () => {
    // Force re-load by clearing internal state
    await conversationHistory.load();
    expect(conversationHistory.getAll()).toEqual([]);
  });

  it('should add a user message', () => {
    const entry = conversationHistory.addUserMessage('hello');
    expect(entry.role).toBe('user');
    expect(entry.text).toBe('hello');
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('should add a gossip message', () => {
    const entry = conversationHistory.addGossipMessage('hey there!');
    expect(entry.role).toBe('gossip');
    expect(entry.text).toBe('hey there!');
  });

  it('should add a gossip message with options', () => {
    const options = [
      { label: 'Option A', description: 'Desc A', command: { type: 'navigate' as const, payload: 'home', rawText: 'go home', confidence: 1 } },
    ];
    const entry = conversationHistory.addGossipMessage('pick one', options);
    expect(entry.options).toHaveLength(1);
    expect(entry.options![0].label).toBe('Option A');
  });

  it('should add a system message with action type', () => {
    const entry = conversationHistory.addSystemMessage('Done: open chat', 'open_chat');
    expect(entry.role).toBe('system');
    expect(entry.actionType).toBe('open_chat');
  });

  it('should return all messages in order', () => {
    conversationHistory.addUserMessage('first');
    conversationHistory.addGossipMessage('second');
    conversationHistory.addSystemMessage('third');
    const all = conversationHistory.getAll();
    expect(all).toHaveLength(3);
    expect(all[0].text).toBe('first');
    expect(all[1].text).toBe('second');
    expect(all[2].text).toBe('third');
  });

  it('should return recent messages', () => {
    conversationHistory.addUserMessage('a');
    conversationHistory.addUserMessage('b');
    conversationHistory.addUserMessage('c');
    const recent = conversationHistory.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].text).toBe('b');
    expect(recent[1].text).toBe('c');
  });

  it('should clear all messages', () => {
    conversationHistory.addUserMessage('test');
    expect(conversationHistory.getAll()).toHaveLength(1);
    conversationHistory.clear();
    expect(conversationHistory.getAll()).toHaveLength(0);
  });
});
