import { ConversationAnalysis, FriendProfile, ReplySuggestion } from './types';

const SARCASM_REPLIES: ReplySuggestion[] = [
  { text: 'Of course he did', emoji: '🙄', tone: 'humorous' },
  { text: 'Classic', emoji: '😂', tone: 'humorous' },
  { text: 'I knew it', tone: 'humorous' },
  { text: 'Shocking', emoji: '😏', tone: 'humorous' },
  { text: 'Who could have seen that coming', tone: 'humorous' },
  { text: 'BFFR', emoji: '💀', tone: 'humorous' },
  { text: 'NPC behavior fr', emoji: '🤖', tone: 'humorous' },
  { text: 'L + ratio', emoji: '📉', tone: 'humorous' },
  { text: 'SMH no cap', tone: 'humorous' },
];

const EMOTIONAL_REPLIES: ReplySuggestion[] = [
  { text: "That's awful", tone: 'supportive' },
  { text: 'Are you okay?', tone: 'supportive' },
  { text: "I'm here for you", tone: 'supportive' },
  { text: "That's rough", tone: 'supportive' },
  { text: 'What happened?', tone: 'curious' },
  { text: 'Sending W vibes', emoji: '🫂', tone: 'supportive' },
  { text: 'That ain\'t it fr', tone: 'supportive' },
  { text: 'IDC what anyone says you\'re valid', tone: 'supportive' },
  { text: 'LMK if you need anything frfr', tone: 'supportive' },
];

const GOSSIP_REPLIES: ReplySuggestion[] = [
  { text: 'What happened?', emoji: '👀', tone: 'curious' },
  { text: 'Tell me everything', tone: 'curious' },
  { text: 'No way', emoji: '😱', tone: 'curious' },
  { text: 'Spill the tea', emoji: '🍵', tone: 'curious' },
  { text: 'Are you serious?', tone: 'curious' },
  { text: 'No cap??', emoji: '😳', tone: 'curious' },
  { text: 'IYKYK', emoji: '👁️', tone: 'curious' },
  { text: 'OOMF said WHAT', emoji: '💀', tone: 'curious' },
  { text: 'Fr fr tell me more', tone: 'curious' },
  { text: 'POV: I need the full story', emoji: '🎬', tone: 'curious' },
];

const QUESTION_REPLIES: ReplySuggestion[] = [
  { text: 'Yes', tone: 'direct' },
  { text: 'I think so', tone: 'direct' },
  { text: 'Not sure', tone: 'direct' },
  { text: 'Definitely', tone: 'direct' },
  { text: 'FR', tone: 'direct' },
  { text: 'IDK tbh', tone: 'direct' },
  { text: 'No cap yes', tone: 'direct' },
  { text: 'IDC either way', tone: 'direct' },
];

const GREETING_REPLIES: ReplySuggestion[] = [
  { text: 'Hey!', emoji: '👋', tone: 'warm' },
  { text: "What's up?", tone: 'warm' },
  { text: 'How are you?', tone: 'warm' },
  { text: 'Yooo what\'s good', emoji: '🤙', tone: 'warm' },
  { text: 'Ayyy', emoji: '✌️', tone: 'warm' },
  { text: 'BRB just got here', tone: 'warm' },
];

const EXCITEMENT_REPLIES: ReplySuggestion[] = [
  { text: "That's amazing!", emoji: '🔥', tone: 'excited' },
  { text: 'No way!!', tone: 'excited' },
  { text: "Let's go!", tone: 'excited' },
  { text: 'So hyped', emoji: '🎉', tone: 'excited' },
  { text: 'W FTW', emoji: '🏆', tone: 'excited' },
  { text: 'GOAT behavior', emoji: '🐐', tone: 'excited' },
  { text: 'No cap that\'s fire', emoji: '🔥', tone: 'excited' },
  { text: 'She\'s the CEO of this', emoji: '👑', tone: 'excited' },
  { text: 'Slay frfr', tone: 'excited' },
];

const SURPRISE_REPLIES: ReplySuggestion[] = [
  { text: 'Wait what??', tone: 'surprised' },
  { text: 'Are you kidding?', tone: 'surprised' },
  { text: 'No way', emoji: '😳', tone: 'surprised' },
  { text: 'Seriously?!', tone: 'surprised' },
  { text: 'I\'m shook', emoji: '😱', tone: 'surprised' },
  { text: 'BFFR right now', emoji: '😭', tone: 'surprised' },
  { text: 'No cap?!', tone: 'surprised' },
  { text: 'Bruh WHAT', emoji: '💀', tone: 'surprised' },
];

const NEUTRAL_REPLIES: ReplySuggestion[] = [
  { text: 'Interesting', tone: 'neutral' },
  { text: 'Got it', tone: 'neutral' },
  { text: 'Makes sense', tone: 'neutral' },
  { text: 'Valid', tone: 'neutral' },
  { text: 'That tracks fr', tone: 'neutral' },
  { text: 'Bet', tone: 'neutral' },
  { text: 'TBH same', tone: 'neutral' },
  { text: 'FYI noted', tone: 'neutral' },
];

function pickRandom(arr: ReplySuggestion[], count: number): ReplySuggestion[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hi|hey|hello|sup|what'?s up|yo|ayy+|what'?s good)\b/i.test(lower)) return 'greeting';
  if (/\?/.test(text)) return 'question';
  if (
    /heard|apparently|did you know|rumor|secret|tea|drama|oomf|iykyk|no cap|spill|lowkey/i.test(lower)
  )
    return 'gossip';
  return 'statement';
}

export function generateSuggestions(
  analysis: ConversationAnalysis,
  _senderProfile?: FriendProfile,
): ReplySuggestion[] {
  const intent = analysis.intent || detectIntent(analysis.text);

  if (analysis.sarcasm) {
    return pickRandom(SARCASM_REPLIES, 3);
  }

  switch (analysis.emotion) {
    case 'anger':
      return pickRandom(EMOTIONAL_REPLIES, 3);
    case 'excitement':
      return pickRandom(EXCITEMENT_REPLIES, 3);
    case 'surprise':
      return pickRandom(SURPRISE_REPLIES, 3);
    case 'amusement':
      return pickRandom(SARCASM_REPLIES, 2).concat(pickRandom(EXCITEMENT_REPLIES, 1));
    default:
      break;
  }

  switch (intent) {
    case 'greeting':
      return pickRandom(GREETING_REPLIES, 3);
    case 'question':
      return pickRandom(QUESTION_REPLIES, 3);
    case 'gossip':
      return pickRandom(GOSSIP_REPLIES, 3);
    default:
      return pickRandom(NEUTRAL_REPLIES, 3);
  }
}
