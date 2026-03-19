import { Emotion, EmotionResult } from './types';

const SARCASM_PATTERNS = [
  /yeah right/i,
  /\btotally\b/i,
  /\bsure\b(?!\s+thing)/i,
  /of course/i,
  /\*[^*]+\*/,
  /obviously/i,
  /wow really/i,
  /no kidding/i,
  /what a surprise/i,
  /how shocking/i,
  /\bbffr\b/i,
  /\bnpc\b/i,
  /L \+ ratio/i,
  /\bsmh\b/i,
  /\big\b/i,
];

const EXCITEMENT_PATTERNS = [
  /!{2,}/,
  /\bomg\b/i,
  /amazing/i,
  /can't believe/i,
  /incredible/i,
  /awesome/i,
  /so excited/i,
  /let's go/i,
  /yesss+/i,
  /\bslay\b/i,
  /\bfire\b/i,
  /no cap.+fire/i,
  /\bgoat\b/i,
  /\bftw\b/i,
  /\brizz\b/i,
  /\bceo\s+of\b/i,
  /\bW\b/,
  /\bfrfr\b/i,
  /bussin/i,
];

const ANGER_PATTERNS = [
  /\bhate\b/i,
  /\bangry\b/i,
  /furious/i,
  /can't stand/i,
  /pissed/i,
  /sick of/i,
  /fed up/i,
  /annoying/i,
  /ridiculous/i,
  /\bidc\b/i,
  /not it/i,
  /\bpressed\b/i,
  /\btoxic\b/i,
  /\bL\b/,
];

const CURIOSITY_PATTERNS = [
  /\?{1,}/,
  /\bwhy\b/i,
  /\bhow\b/i,
  /what happened/i,
  /tell me/i,
  /what do you/i,
  /do you think/i,
  /I wonder/i,
  /\biykyk\b/i,
  /\boomf\b/i,
  /spill the tea/i,
  /\bpov\b/i,
  /\bfomo\b/i,
  /\blmk\b/i,
];

const AMUSEMENT_PATTERNS = [
  /\blol\b/i,
  /\blmao\b/i,
  /haha/i,
  /\bdead\b/i,
  /I can't/i,
  /dying/i,
  /hilarious/i,
  /funny/i,
  /\bbruh\b/i,
  /screaming/i,
  /crying/i,
  /\bbye+\b/i,
  /\bhelp\b/i,
  /\baf\b/i,
];

const SURPRISE_PATTERNS = [
  /no way/i,
  /what\?!/i,
  /seriously\?/i,
  /wait what/i,
  /are you kidding/i,
  /shut up/i,
  /you're joking/i,
  /for real/i,
  /\bshook\b/i,
  /no cap\?/i,
  /\btbh\b/i,
  /\bfr\b\??/i,
  /\bbtw\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function isAllCaps(text: string): boolean {
  const words = text.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  const capsWords = words.filter(w => w.length > 1 && w === w.toUpperCase());
  return capsWords.length >= 2;
}

export function detectEmotion(text: string): EmotionResult {
  const sarcasmCount = countMatches(text, SARCASM_PATTERNS);
  const excitementCount = countMatches(text, EXCITEMENT_PATTERNS);
  const angerCount = countMatches(text, ANGER_PATTERNS) + (isAllCaps(text) ? 2 : 0);
  const curiosityCount = countMatches(text, CURIOSITY_PATTERNS);
  const amusementCount = countMatches(text, AMUSEMENT_PATTERNS);
  const surpriseCount = countMatches(text, SURPRISE_PATTERNS);

  const scores: [Emotion, number][] = [
    ['sarcasm', sarcasmCount],
    ['excitement', excitementCount],
    ['anger', angerCount],
    ['curiosity', curiosityCount],
    ['amusement', amusementCount],
    ['surprise', surpriseCount],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  const [topEmotion, topScore] = scores[0];

  if (topScore === 0) {
    return { emotion: 'neutral', confidence: 0.5, sarcasm: false };
  }

  const maxPossible = Math.max(topScore, 3);
  const confidence = Math.min(0.4 + (topScore / maxPossible) * 0.6, 1.0);

  return {
    emotion: topEmotion,
    confidence,
    sarcasm: sarcasmCount >= 1,
  };
}
