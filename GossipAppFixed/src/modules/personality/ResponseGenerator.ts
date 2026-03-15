import { ConversationAnalysis, FriendProfile, ReplySuggestion } from './types';

const SARCASM_REPLIES: ReplySuggestion[] = [
  { text: 'Of course he did', emoji: '🙄', tone: 'humorous' },
  { text: 'Classic', emoji: '😂', tone: 'humorous' },
  { text: 'I knew it', tone: 'humorous' },
  { text: 'Shocking', emoji: '😏', tone: 'humorous' },
  { text: 'Who could have seen that coming', tone: 'humorous' },
];

const EMOTIONAL_REPLIES: ReplySuggestion[] = [
  { text: "That's awful", tone: 'supportive' },
  { text: 'Are you okay?', tone: 'supportive' },
  { text: "I'm here for you", tone: 'supportive' },
  { text: "That's rough", tone: 'supportive' },
  { text: 'What happened?', tone: 'curious' },
];

const GOSSIP_REPLIES: ReplySuggestion[] = [
  { text: 'What happened?', emoji: '👀', tone: 'curious' },
  { text: 'Tell me everything', tone: 'curious' },
  { text: 'No way', emoji: '😱', tone: 'curious' },
  { text: 'Spill the tea', emoji: '🍵', tone: 'curious' },
  { text: 'Are you serious?', tone: 'curious' },
];

const QUESTION_REPLIES: ReplySuggestion[] = [
  { text: 'Yes', tone: 'direct' },
  { text: 'I think so', tone: 'direct' },
  { text: 'Not sure', tone: 'direct' },
  { text: 'Definitely', tone: 'direct' },
];

const GREETING_REPLIES: ReplySuggestion[] = [
  { text: 'Hey!', emoji: '👋', tone: 'warm' },
  { text: "What's up?", tone: 'warm' },
  { text: 'How are you?', tone: 'warm' },
];

const EXCITEMENT_REPLIES: ReplySuggestion[] = [
  { text: "That's amazing!", emoji: '🔥', tone: 'excited' },
  { text: 'No way!!', tone: 'excited' },
  { text: "Let's go!", tone: 'excited' },
  { text: 'So hyped', emoji: '🎉', tone: 'excited' },
];

const SURPRISE_REPLIES: ReplySuggestion[] = [
  { text: 'Wait what??', tone: 'surprised' },
  { text: 'Are you kidding?', tone: 'surprised' },
  { text: 'No way', emoji: '😳', tone: 'surprised' },
  { text: 'Seriously?!', tone: 'surprised' },
];

const NEUTRAL_REPLIES: ReplySuggestion[] = [
  { text: 'Interesting', tone: 'neutral' },
  { text: 'Got it', tone: 'neutral' },
  { text: 'Makes sense', tone: 'neutral' },
];

function pickRandom(arr: ReplySuggestion[], count: number): ReplySuggestion[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hi|hey|hello|sup|what'?s up|yo)\b/i.test(lower)) return 'greeting';
  if (/\?/.test(text)) return 'question';
  if (
    /heard|apparently|did you know|rumor|secret|tea|drama/i.test(lower)
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
