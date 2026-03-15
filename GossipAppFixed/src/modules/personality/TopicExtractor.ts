import { TopicResult } from './types';

const TOPIC_CLUSTERS: Record<string, RegExp[]> = {
  relationship_drama: [
    /cheat(ed|ing)?/i,
    /dating/i,
    /broke up/i,
    /breakup/i,
    /crush/i,
    /loyal(ty)?/i,
    /relationship/i,
    /boyfriend/i,
    /girlfriend/i,
    /ex\b/i,
    /love/i,
    /together/i,
    /hooking up/i,
  ],
  office_politics: [
    /boss/i,
    /meeting/i,
    /office/i,
    /\bwork\b/i,
    /\bjob\b/i,
    /coworker/i,
    /fired/i,
    /promoted/i,
    /salary/i,
    /manager/i,
    /company/i,
  ],
  social_plans: [
    /party/i,
    /weekend/i,
    /hangout/i,
    /dinner/i,
    /\bclub\b/i,
    /concert/i,
    /drinks/i,
    /invited/i,
    /going out/i,
    /birthday/i,
  ],
  gossip_tea: [
    /drama/i,
    /rumor/i,
    /heard that/i,
    /apparently/i,
    /secret/i,
    /\btea\b/i,
    /did you know/i,
    /can you believe/i,
    /talking behind/i,
    /spread(ing)?/i,
  ],
};

function extractNames(text: string): string[] {
  const namePattern = /\b[A-Z][a-z]{2,}\b/g;
  const matches = text.match(namePattern) || [];
  const commonWords = new Set([
    'The', 'This', 'That', 'What', 'When', 'Where', 'Why', 'How',
    'Yes', 'Not', 'But', 'And', 'Just', 'Like', 'Really', 'Hey',
    'Can', 'Did', 'Are', 'Was', 'Has', 'Have', 'Been', 'Will',
  ]);
  return matches.filter(m => !commonWords.has(m));
}

export function extractTopic(text: string): TopicResult {
  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, patterns] of Object.entries(TOPIC_CLUSTERS)) {
    const score = patterns.reduce(
      (count, pattern) => count + (pattern.test(text) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  const names = extractNames(text);
  let topic = bestCategory.replace(/_/g, ' ');
  if (names.length > 0) {
    topic += ` (${names.slice(0, 2).join(', ')})`;
  }

  return { topic, category: bestCategory };
}

export function getTopTopics(
  topics: Map<string, number>,
  limit: number = 3,
): [string, number][] {
  return Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
