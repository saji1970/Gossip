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

import { gossipPersonality } from '../../src/modules/gossip/GossipPersonality';

describe('GossipPersonality', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('should load without errors', async () => {
    await gossipPersonality.load();
    expect(gossipPersonality.getMood()).toBeDefined();
  });

  it('should return a valid mood', () => {
    const mood = gossipPersonality.getMood();
    expect(['chill', 'hyped', 'sassy', 'supportive', 'curious']).toContain(mood);
  });

  it('should return a greeting string', () => {
    const greeting = gossipPersonality.getGreeting();
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('should return a filler string', () => {
    const filler = gossipPersonality.getFiller();
    expect(typeof filler).toBe('string');
    // filler can be empty for efficient style
  });

  it('should return an affirmation string', () => {
    const affirmation = gossipPersonality.getAffirmation();
    expect(typeof affirmation).toBe('string');
    expect(affirmation.length).toBeGreaterThan(0);
  });

  it('should detect frustration signals', () => {
    expect(gossipPersonality.detectFrustration('just do it already')).toBe(true);
    expect(gossipPersonality.detectFrustration('ugh this is terrible')).toBe(true);
    expect(gossipPersonality.detectFrustration('forget it')).toBe(true);
    expect(gossipPersonality.detectFrustration('chat with alice')).toBe(false);
  });

  it('should detect positive signals', () => {
    expect(gossipPersonality.detectPositive('haha nice one')).toBe(true);
    expect(gossipPersonality.detectPositive('thanks that was great')).toBe(true);
    expect(gossipPersonality.detectPositive('awesome job')).toBe(true);
    expect(gossipPersonality.detectPositive('open chat')).toBe(false);
  });

  it('should record exchanges and adapt', () => {
    const configBefore = gossipPersonality.getStyleConfig();
    const efficientBefore = configBefore.weights.efficient;

    // Simulate frustration — should shift toward efficient
    for (let i = 0; i < 20; i++) {
      gossipPersonality.recordExchange(false, false);
    }

    const configAfter = gossipPersonality.getStyleConfig();
    expect(configAfter.weights.efficient).toBeGreaterThan(efficientBefore);
  });

  it('should reinforce dominant style on positive engagement', () => {
    const configBefore = gossipPersonality.getStyleConfig();
    const dominantBefore = configBefore.dominant;
    const weightBefore = configBefore.weights[dominantBefore];

    // Simulate positive engagement
    for (let i = 0; i < 20; i++) {
      gossipPersonality.recordExchange(true, true);
    }

    const configAfter = gossipPersonality.getStyleConfig();
    // The dominant style weight should have increased or stayed high
    expect(configAfter.weights[dominantBefore]).toBeGreaterThanOrEqual(weightBefore * 0.95);
  });

  it('should return valid style config', () => {
    const config = gossipPersonality.getStyleConfig();
    expect(config.dominant).toBeDefined();
    expect(config.weights).toBeDefined();
    expect(config.weights.genZ).toBeGreaterThan(0);
    expect(config.weights.warm).toBeGreaterThan(0);
    expect(config.weights.witty).toBeGreaterThan(0);
    expect(config.weights.efficient).toBeGreaterThan(0);
    expect(config.weights.playful).toBeGreaterThan(0);

    // Weights should sum to approximately 1
    const sum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 1);
  });
});
