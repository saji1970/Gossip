import { GossipIntent, IntentResult, ExtractedEntity } from './types';
import { learningStore } from './LearningStore';

// ── Keyword clusters per intent ──

interface IntentCluster {
  intent: GossipIntent;
  clusters: string[][];
}

const intentClusters: IntentCluster[] = [
  {
    intent: 'private_chat',
    clusters: [
      ['private', 'chat'],
      ['dm'],
      ['direct', 'message'],
      ['privately'],
      ['slide', 'dms'],
    ],
  },
  {
    intent: 'chat_with_person',
    clusters: [
      ['chat', 'with'],
      ['talk', 'to'],
      ['talk', 'with'],
      ['speak', 'to'],
      ['speak', 'with'],
      ['message'],
      ['text'],
      ['contact'],
      ['reach'],
      ['connect', 'with'],
      ['hit', 'up'],
    ],
  },
  {
    intent: 'create_group',
    clusters: [
      ['create', 'group'],
      ['new', 'group'],
      ['make', 'group'],
      ['start', 'group'],
    ],
  },
  {
    intent: 'call_group',
    clusters: [
      ['call'],
      ['voice', 'call'],
      ['video', 'call'],
      ['start', 'call'],
      ['make', 'call'],
      ['hop', 'on'],
      ['link', 'up'],
    ],
  },
  {
    intent: 'send_message',
    clusters: [
      ['send', 'message'],
      ['send'],
      ['drop'],
      ['yeet'],
    ],
  },
  {
    intent: 'query_groups',
    clusters: [
      ['what', 'groups'],
      ['which', 'groups'],
      ['groups', 'is'],
      ['list', 'groups'],
    ],
  },
  {
    intent: 'query_members',
    clusters: [
      ['who', 'in'],
      ['members', 'of'],
      ['who', 'is', 'in'],
      ['list', 'members'],
    ],
  },
  {
    intent: 'navigate',
    clusters: [
      ['go', 'to'],
      ['open'],
      ['show'],
      ['switch', 'to'],
      ['take', 'me', 'to'],
      ['navigate', 'to'],
    ],
  },
  {
    intent: 'help',
    clusters: [
      ['help'],
      ['what', 'can', 'you', 'do'],
      ['commands'],
    ],
  },
  {
    intent: 'casual_chat',
    clusters: [
      ['how', 'are', 'you'],
      ['what', 'up'],
      ['thanks'],
      ['lol'],
      ['hey', 'gossip'],
      ['good', 'morning'],
      ['good', 'night'],
      ['bye'],
      ['haha'],
      ['wassup'],
      ['sup'],
      ['what\'s', 'good'],
    ],
  },
  {
    intent: 'show_groups',
    clusters: [
      ['my', 'groups'],
      ['show', 'groups'],
      ['list', 'groups'],
      ['all', 'groups'],
    ],
  },
  {
    intent: 'settings_change',
    clusters: [
      ['change', 'name'],
      ['change', 'theme'],
      ['log', 'out'],
      ['dark', 'mode'],
      ['edit', 'profile'],
      ['light', 'mode'],
      ['logout'],
    ],
  },
];

/** Score how well a cluster of keywords matches the input text. */
function scoreCluster(words: string[], cluster: string[]): number {
  let matched = 0;
  for (const keyword of cluster) {
    if (words.includes(keyword)) {
      matched++;
    }
  }
  if (matched === 0) return 0;
  return matched / cluster.length;
}

/** Extract entities from text based on detected intent. */
function extractEntities(text: string, intent: GossipIntent): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = text.toLowerCase();

  // Person name: after "with", "to", "up", "dm", "message", "contact", "reach"
  const personMatch = lower.match(
    /(?:with|to|up|dm|message|text|chat|contact|reach)\s+([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*)?)(?:\s+(?:in|from|on|privately|private)|\s*$)/i,
  );
  if (personMatch && (
    intent === 'chat_with_person' ||
    intent === 'private_chat' ||
    intent === 'query_groups'
  )) {
    entities.push({ type: 'person', value: personMatch[1].trim() });
  }

  // Group name: after "group", "in the", "called", "named"
  const groupMatch = lower.match(
    /(?:group|in the|called|named)\s+([a-z][a-z0-9 ]*?)(?:\s|$)/i,
  );
  if (groupMatch && (
    intent === 'create_group' ||
    intent === 'call_group' ||
    intent === 'query_members'
  )) {
    entities.push({ type: 'group', value: groupMatch[1].trim() });
  }

  // Message content: after "send", "drop", "yeet", "say"
  const msgMatch = lower.match(
    /(?:send|drop|yeet|say|tell them)\s+(.+)$/i,
  );
  if (msgMatch && intent === 'send_message') {
    entities.push({ type: 'message', value: msgMatch[1].trim() });
  }

  // Screen name: after "go to", "open", "show"
  const screenMatch = lower.match(
    /(?:go to|open|show|switch to)\s+(groups?|chats?|settings?|home|profile)/i,
  );
  if (screenMatch && intent === 'navigate') {
    entities.push({ type: 'screen', value: screenMatch[1].toLowerCase().replace(/s$/, '') });
  }

  // Settings action extraction
  if (intent === 'settings_change') {
    if (/log\s*out|logout|sign\s*out/i.test(lower)) {
      entities.push({ type: 'screen', value: 'logout' });
    } else if (/theme|dark\s*mode|light\s*mode/i.test(lower)) {
      entities.push({ type: 'screen', value: 'theme' });
    } else if (/name|profile/i.test(lower)) {
      entities.push({ type: 'screen', value: 'profile' });
    }
  }

  return entities;
}

/** Resolve the intent from text using keyword clusters + learned mappings. */
export function resolve(text: string): IntentResult {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // 1. Check learned mappings first (highest priority)
  const learned = learningStore.findMatch(lower);
  if (learned) {
    return {
      intent: learned.intent,
      entities: learned.entities,
      confidence: 0.95,
      ambiguities: [],
    };
  }

  // 2. Score each intent by best-matching cluster
  const scores: { intent: GossipIntent; score: number }[] = [];
  for (const ic of intentClusters) {
    let bestScore = 0;
    for (const cluster of ic.clusters) {
      const s = scoreCluster(words, cluster);
      if (s > bestScore) bestScore = s;
    }
    if (bestScore > 0) {
      scores.push({ intent: ic.intent, score: bestScore });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      intent: 'unknown',
      entities: [],
      confidence: 0,
      ambiguities: [],
    };
  }

  const best = scores[0];
  const entities = extractEntities(text, best.intent);

  // Collect competing intents (within 0.2 of best)
  const ambiguities = scores
    .filter(s => s.intent !== best.intent && best.score - s.score < 0.2)
    .map(s => s.intent);

  return {
    intent: best.intent,
    entities,
    confidence: best.score,
    ambiguities,
  };
}
