import { GossipIntent, IntentResult, ExtractedEntity } from './types';
import { learningStore } from './LearningStore';

// ── Stop words that should not be captured as person/entity names ──

const STOP_WORDS = new Set([
  'me', 'you', 'him', 'her', 'them', 'us', 'it', 'that', 'this',
  'something', 'anything', 'everything', 'everyone', 'someone', 'nobody',
  'there', 'here', 'now', 'then', 'today', 'tomorrow',
  'the', 'a', 'an', 'my', 'your', 'our', 'their',
  'do', 'does', 'did', 'doing', 'done',
  'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had',
  'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'not', 'no', 'yes', 'so', 'too', 'also',
  'just', 'really', 'very', 'much', 'more', 'less',
  'about', 'like', 'know', 'think', 'want', 'need',
  'good', 'bad', 'great', 'fine', 'well', 'go', 'get',
]);

// ── Keyword clusters per intent ──
// NOTE: Single-word clusters are removed from command intents to prevent
// false positives. The regex parser (VoiceCommandParser) handles direct
// single-word commands like "call", "message", "dm", "help".

interface IntentCluster {
  intent: GossipIntent;
  clusters: string[][];
}

const intentClusters: IntentCluster[] = [
  {
    intent: 'private_chat',
    clusters: [
      ['private', 'chat'],
      ['direct', 'message'],
      ['slide', 'dms'],
      ['dm', 'with'],
      ['dm', 'to'],
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
      ['message', 'to'],
      ['text', 'to'],
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
      ['voice', 'call'],
      ['video', 'call'],
      ['start', 'call'],
      ['make', 'call'],
      ['call', 'group'],
      ['call', 'the'],
      ['hop', 'on', 'call'],
      ['link', 'up'],
    ],
  },
  {
    intent: 'send_message',
    clusters: [
      ['send', 'message'],
      ['send', 'to'],
      ['send', 'in'],
    ],
  },
  {
    intent: 'query_groups',
    clusters: [
      ['what', 'groups'],
      ['which', 'groups'],
      ['groups', 'in'],
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
      ['switch', 'to'],
      ['open', 'the'],
      ['take', 'me', 'to'],
      ['navigate', 'to'],
    ],
  },
  {
    intent: 'help',
    clusters: [
      ['help'],
      ['help', 'me'],
      ['need', 'help'],
      ['what', 'can', 'you', 'do'],
      ['how', 'does', 'this', 'work'],
    ],
  },
  {
    intent: 'casual_chat',
    clusters: [
      // Greetings
      ['how', 'are', 'you'],
      ['what', 'up'],
      ["what's", 'up'],
      ['hey', 'gossip'],
      ['good', 'morning'],
      ['good', 'night'],
      ['good', 'evening'],
      ['good', 'afternoon'],
      ["what's", 'good'],
      // Single-word greetings & reactions (safe — only trigger casual response)
      ['hi'],
      ['hello'],
      ['hey'],
      ['yo'],
      ['wassup'],
      ['sup'],
      ['bye'],
      ['thanks'],
      ['lol'],
      ['haha'],
      ['hehe'],
      ['wow'],
      ['hmm'],
      ['ok'],
      ['okay'],
      ['alright'],
      ['sure'],
      ['yeah'],
      ['yep'],
      ['yup'],
      ['nope'],
      ['nah'],
      ['cool'],
      ['nice'],
      ['great'],
      ['perfect'],
      ['awesome'],
      ['amazing'],
      ['sweet'],
      ['interesting'],
      ['true'],
      ['same'],
      ['exactly'],
      ['right'],
      ['definitely'],
      ['absolutely'],
      ['nothing'],
      ['maybe'],
      ['whatever'],
      // Multi-word casual
      ['thank', 'you'],
      ['sounds', 'good'],
      ['no', 'problem'],
      ['no', 'worries'],
      ['got', 'it'],
      ['i', 'see'],
      ['makes', 'sense'],
      ['of', 'course'],
      ['not', 'sure'],
      ['never', 'mind'],
      ['that', 'cool'],
      ['that', 'great'],
      ['that', 'works'],
      ['that', 'fine'],
      ['i', 'know'],
      ['tell', 'me', 'more'],
      ['good', 'one'],
      ['miss', 'you'],
      ['love', 'it'],
      ['who', 'are', 'you'],
      ["what's", 'your', 'name'],
      ["i'm", 'bored'],
      ["i'm", 'tired'],
      ["i'm", 'happy'],
      ['see', 'ya'],
      ['take', 'care'],
      ['peace', 'out'],
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
    intent: 'add_member',
    clusters: [
      ['add', 'member'],
      ['add', 'to', 'group'],
      ['invite', 'to'],
      ['invite', 'member'],
      ['add', 'them'],
      ['send', 'invite'],
      ['add', 'to', 'the'],
      ['invite', 'to', 'group'],
    ],
  },
  {
    intent: 'record_voice',
    clusters: [
      ['record', 'voice'],
      ['voice', 'message'],
      ['record', 'message'],
      ['send', 'voice'],
      ['voice', 'note'],
    ],
  },
  {
    intent: 'settings_change',
    clusters: [
      ['change', 'name'],
      ['change', 'theme'],
      ['log', 'out'],
      ['sign', 'out'],
      ['dark', 'mode'],
      ['edit', 'profile'],
      ['light', 'mode'],
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
  // For 1-2 word clusters, require ALL words to match to avoid false positives.
  // e.g. ['talk', 'to'] should NOT match "sounds good to me" (only "to" matches)
  if (cluster.length <= 2 && matched < cluster.length) return 0;
  return matched / cluster.length;
}

/** Normalize input words, expanding contractions for better cluster matching. */
function normalizeWords(text: string): string[] {
  const raw = text.split(/\s+/);
  const result = [...raw];
  for (const w of raw) {
    // Add base form without contraction suffix so "what's" also matches "what"
    const base = w.replace(/'s$|'t$|'m$|'re$|'ve$|'ll$|'d$/, '');
    if (base !== w && base.length > 0) {
      result.push(base);
    }
  }
  return result;
}

/** Extract entities from text based on detected intent. */
function extractEntities(text: string, intent: GossipIntent): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = text.toLowerCase();

  // Email address (globally useful)
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    entities.push({ type: 'email', value: emailMatch[0] });
  }

  // Person name: after "with", "to", "up", "dm", "message", "text", "chat", "contact", "reach", "add", "invite"
  const personMatch = lower.match(
    /(?:with|to|up|dm|message|text|chat|contact|reach|add|invite)\s+([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*)?)(?:\s+(?:in|from|on|privately|private|his|her|their|email|to|and|saying)|\s*$)/i,
  );
  if (personMatch && (
    intent === 'chat_with_person' ||
    intent === 'private_chat' ||
    intent === 'query_groups' ||
    intent === 'add_member'
  )) {
    const name = personMatch[1].trim();
    if (!STOP_WORDS.has(name.toLowerCase())) {
      entities.push({ type: 'person', value: name });
    }
  }

  // Group name: after "group", "in the", "called", "named"
  const groupMatch = lower.match(
    /(?:group|in the|called|named)\s+([a-z][a-z0-9 ]*?)(?:\s+(?:which|that|and|private|public|where|users|members|approval|saying)|\s*$)/i,
  );
  if (groupMatch && (
    intent === 'create_group' ||
    intent === 'call_group' ||
    intent === 'query_members' ||
    intent === 'add_member'
  )) {
    const name = groupMatch[1].trim();
    if (!STOP_WORDS.has(name.toLowerCase())) {
      entities.push({ type: 'group', value: name });
    }
  }

  // Privacy (for create_group)
  if (intent === 'create_group') {
    if (/\bprivate\b/i.test(lower)) {
      entities.push({ type: 'privacy', value: 'private' });
    } else if (/\bpublic\b/i.test(lower)) {
      entities.push({ type: 'privacy', value: 'public' });
    }
    // Approval required
    if (/approv|need.+approved|require.+approval/i.test(lower)) {
      entities.push({ type: 'approval', value: 'true' });
    }
  }

  // Message content: after "send", "drop", "say"
  const msgMatch = lower.match(
    /(?:send|drop|say|tell them)\s+(.+)$/i,
  );
  if (msgMatch && intent === 'send_message') {
    entities.push({ type: 'message', value: msgMatch[1].trim() });
  }

  // Screen name: after "go to", "open", "show", "switch to"
  const screenMatch = lower.match(
    /(?:go to|open|show|switch to)\s+(groups?|chats?|settings?|home|profile)/i,
  );
  if (screenMatch && intent === 'navigate') {
    entities.push({ type: 'screen', value: screenMatch[1].toLowerCase().replace(/s$/, '') });
  }

  // Record voice: extract target group from "for [group]" / "in [group]" / "to [group]"
  if (intent === 'record_voice') {
    const groupMatch2 = lower.match(
      /(?:for|in|to)\s+([a-z][a-z0-9 ]*?)(?:\s+(?:group|chat|saying|and)|\s*$)/i,
    );
    if (groupMatch2) {
      const name = groupMatch2[1].trim();
      if (!STOP_WORDS.has(name.toLowerCase())) {
        entities.push({ type: 'group', value: name });
      }
    }
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

/**
 * Detect if text contains a compound command (e.g. "create group X and add Y").
 * Returns secondary entities to merge into the primary result.
 */
export function extractCompoundEntities(text: string, primaryIntent: GossipIntent): ExtractedEntity[] {
  const lower = text.toLowerCase();
  const extra: ExtractedEntity[] = [];

  // "create group ... and add [person]" pattern
  if (primaryIntent === 'create_group') {
    const addMatch = lower.match(
      /\band\s+(?:add|invite)\s+([a-z][a-z0-9]*)(?:\s+(?:his|her|their|to|email|in|from)|\s*$)/i,
    );
    if (addMatch) {
      const name = addMatch[1].trim();
      if (!STOP_WORDS.has(name.toLowerCase())) {
        extra.push({ type: 'person', value: name });
      }
    }
    // Email anywhere in the text
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch && !extra.some(e => e.type === 'email')) {
      extra.push({ type: 'email', value: emailMatch[0] });
    }
    // Privacy
    if (/\bprivate\b/i.test(lower) && !extra.some(e => e.type === 'privacy')) {
      extra.push({ type: 'privacy', value: 'private' });
    } else if (/\bpublic\b/i.test(lower) && !extra.some(e => e.type === 'privacy')) {
      extra.push({ type: 'privacy', value: 'public' });
    }
    // Approval
    if (/approv|need.+approved|require.+approval/i.test(lower) && !extra.some(e => e.type === 'approval')) {
      extra.push({ type: 'approval', value: 'true' });
    }
  }

  return extra;
}

/** Resolve the intent from text using keyword clusters + learned mappings. */
export function resolve(text: string): IntentResult {
  const lower = text.toLowerCase().trim();
  const words = normalizeWords(lower);

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
