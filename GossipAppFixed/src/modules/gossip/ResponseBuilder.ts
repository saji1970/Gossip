import { GossipResponse, GossipOption, GossipMood, MemberSearchResult, GroupSearchResult } from './types';
import { VoiceCommand } from '../voice/VoiceCommandParser';
import { Group } from '../../utils/GroupStorage';
import { gossipPersonality } from './GossipPersonality';
import { userPersonalityProfile } from './UserPersonalityProfile';

// ── Personality-driven vocabulary helpers ──

function greeting(): string {
  return gossipPersonality.getGreeting();
}

function filler(): string {
  return gossipPersonality.getFiller();
}

function affirmation(): string {
  return gossipPersonality.getAffirmation();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Trim response if user communicates tersely. */
function trimForStyle(msg: string): string {
  const style = userPersonalityProfile.getCommunicationStyle();
  if (style === 'terse') {
    // Remove fillers and shorten
    return msg.replace(/\s+(fr|ngl|tbh|no cap|honestly|truly|obviously|naturally|lol|haha|btw|tho)\b/gi, '');
  }
  return msg;
}

// ── Response builders ──

export function buildChatAmbiguity(
  name: string,
  member: MemberSearchResult,
): GossipResponse {
  const groupNames = member.groups.map(g => g.name).join(', ');
  const message = trimForStyle(
    `${greeting()}! Want to chat with ${name}? They're in ${groupNames}. Private or group?`,
  );

  const options: GossipOption[] = [
    {
      label: 'Private chat',
      description: `DM ${name} directly`,
      command: {
        type: 'private_chat',
        payload: member.email,
        rawText: `private chat with ${name}`,
        confidence: 1,
      },
    },
    ...member.groups.map(g => ({
      label: g.name,
      description: `Chat in ${g.name}`,
      command: {
        type: 'open_chat' as const,
        payload: JSON.stringify({ groupId: g.id, personEmail: member.email }),
        rawText: `open chat in ${g.name}`,
        confidence: 1,
      },
    })),
  ];

  return { type: 'clarify', message, options };
}

export function buildSingleGroupChat(
  name: string,
  member: MemberSearchResult,
): GossipResponse {
  const g = member.groups[0];
  return {
    type: 'execute',
    message: trimForStyle(`${affirmation()}! Opening ${g.name} to chat with ${name}`),
    command: {
      type: 'open_chat',
      payload: JSON.stringify({ groupId: g.id, personEmail: member.email }),
      rawText: `open chat with ${name}`,
      confidence: 1,
    },
  };
}

export function buildMemberNotFound(name: string): GossipResponse {
  return {
    type: 'info',
    message: trimForStyle(`Couldn't find anyone named "${name}" in your groups.`),
  };
}

export function buildGroupAmbiguity(
  query: string,
  matches: GroupSearchResult[],
): GossipResponse {
  const message = trimForStyle(`Found a few groups matching "${query}". Which one?`);
  const options: GossipOption[] = matches.slice(0, 4).map(m => ({
    label: m.group.name,
    description: `${m.group.members.length} members`,
    command: {
      type: 'open_chat' as const,
      payload: JSON.stringify({ groupId: m.group.id }),
      rawText: `open ${m.group.name}`,
      confidence: 1,
    },
  }));

  return { type: 'clarify', message, options };
}

export function buildMissingGroupName(): GossipResponse {
  return {
    type: 'clarify',
    message: trimForStyle(`${affirmation()}! What would you like to call the group?`),
    options: [],
  };
}

export function buildCallAmbiguity(groups: Group[]): GossipResponse {
  const message = trimForStyle(`Which group would you like to call?`);
  const options: GossipOption[] = groups.slice(0, 4).map(g => ({
    label: g.name,
    description: `Call ${g.name}`,
    command: {
      type: 'call_group' as const,
      payload: g.id,
      rawText: `call ${g.name}`,
      confidence: 1,
    },
  }));

  return { type: 'clarify', message, options };
}

export function buildSendMessageAmbiguity(
  msg: string,
  groups: Group[],
): GossipResponse {
  const message = trimForStyle(`Where would you like to send "${msg}"?`);
  const options: GossipOption[] = groups.slice(0, 4).map(g => ({
    label: g.name,
    description: `Send to ${g.name}`,
    command: {
      type: 'send_message' as const,
      payload: JSON.stringify({ groupId: g.id, message: msg }),
      rawText: `send ${msg} in ${g.name}`,
      confidence: 1,
    },
  }));

  return { type: 'clarify', message, options };
}

export function buildGroupsInfoResponse(
  name: string,
  member: MemberSearchResult,
): GossipResponse {
  const groupNames = member.groups.map(g => g.name).join(', ');
  const count = member.groups.length;
  return {
    type: 'info',
    message: trimForStyle(`${name} is in: ${groupNames}. That's ${count} group${count > 1 ? 's' : ''}.`),
  };
}

export function buildMembersInfoResponse(
  groupName: string,
  memberEmails: string[],
): GossipResponse {
  const names = memberEmails.map(e => e.split('@')[0]).join(', ');
  return {
    type: 'info',
    message: trimForStyle(
      `${groupName} has: ${names}. That's ${memberEmails.length} member${memberEmails.length > 1 ? 's' : ''}.`,
    ),
  };
}

export function buildUnknown(): GossipResponse {
  return {
    type: 'unknown',
    message: trimForStyle(
      `I didn't catch that. Here's what I can help with:\n` +
      `- "Chat with [name]"\n` +
      `- "DM [name]"\n` +
      `- "Create a group"\n` +
      `- "Call [group]"\n` +
      `- "Send [message]"\n` +
      `- "What groups is [name] in?"`,
    ),
  };
}

export function buildMaxTurns(): GossipResponse {
  return {
    type: 'unknown',
    message: trimForStyle(`We've been going back and forth a bit. Try a fresh command!`),
  };
}

export function buildExecute(msg: string, command: VoiceCommand): GossipResponse {
  return {
    type: 'execute',
    message: trimForStyle(`${affirmation()}! ${msg}`),
    command,
  };
}

export function buildHelp(): GossipResponse {
  return {
    type: 'info',
    message: trimForStyle(
      `${greeting()}! Here's what I can do:\n` +
      `- "Chat with [name]" / "DM [name]"\n` +
      `- "Create group [name]"\n` +
      `- "Call" / "Hop on call"\n` +
      `- "Send [message]" / "Drop [message]"\n` +
      `- "What groups is [name] in?"\n` +
      `- "Who's in [group]?"\n` +
      `- "Go to [screen]"\n` +
      `- "Show my groups"\n` +
      `- Or just chat with me!`,
    ),
  };
}

// ── New builders for conversational AI ──

export function buildCasualResponse(text: string, mood: GossipMood): GossipResponse {
  const lower = text.toLowerCase();

  // Greeting responses
  if (/how are you|how('s| is) it going|what'?s up|wassup|sup/i.test(lower)) {
    const moodResponses: Record<GossipMood, string[]> = {
      chill: ['All good! What about you?', 'Doing well, how about you?', 'Pretty good!'],
      hyped: ['I\'m great! What are we doing today?', 'Feeling amazing, let\'s chat!', 'Ready to go! What\'s up?'],
      sassy: ['Better now that you\'re here!', 'Oh you know, doing great as always', 'Fabulous, thanks for asking!'],
      supportive: ['I\'m here for you! What do you need?', 'Doing great, and I\'m ready to help!', 'All good! How can I help you today?'],
      curious: ['What\'s on your mind?', 'Good! What can I help with?', 'Tell me everything, I\'m all ears!'],
    };
    return {
      type: 'info',
      message: trimForStyle(pick(moodResponses[mood])),
    };
  }

  // Thanks
  if (/thanks|thank you|thx|ty/i.test(lower)) {
    const responses = [
      'Anytime!', 'No problem!', 'Always got your back', `${affirmation()}!`,
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Laughter
  if (/lol|haha|lmao|rofl|dead/i.test(lower)) {
    const responses = [
      'Haha, glad you\'re having fun!', 'Ha! Right?', 'That\'s funny!',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Goodbye
  if (/bye|see ya|later|gotta go|peace out/i.test(lower)) {
    const responses = [
      'Catch you later!', 'See you! I\'ll be here', 'Bye! Don\'t be a stranger',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Good morning/night
  if (/good morning|morning/i.test(lower)) {
    return { type: 'info', message: trimForStyle(`Morning! Ready to start the day?`) };
  }
  if (/good night|gn|night/i.test(lower)) {
    return { type: 'info', message: 'Night! Sleep well, I\'ll be here when you get back' };
  }

  // Generic conversational fallback
  const fallbacks: Record<GossipMood, string[]> = {
    chill: ['Hmm, tell me more', 'I hear you', 'Interesting'],
    hyped: ['That\'s interesting! Tell me more!', 'Really? Tell me about it!', 'Let\'s talk about it!'],
    sassy: ['Oh? Do tell', 'Interesting...', 'Hmm, go on'],
    supportive: ['I\'m listening! Go on', 'That sounds cool, tell me more', 'I\'m here for you'],
    curious: ['What do you mean by that?', 'Tell me more!', 'Hmm, that\'s interesting...'],
  };
  return { type: 'info', message: pick(fallbacks[mood]) };
}

export function buildGroupsList(groups: Group[]): GossipResponse {
  if (groups.length === 0) {
    return {
      type: 'info',
      message: trimForStyle(`You don't have any groups yet. Say "create a group" to get started!`),
    };
  }

  const options: GossipOption[] = groups.slice(0, 6).map(g => ({
    label: g.name,
    description: `${g.members.length} member${g.members.length !== 1 ? 's' : ''}`,
    command: {
      type: 'open_chat' as const,
      payload: JSON.stringify({ groupId: g.id }),
      rawText: `open ${g.name}`,
      confidence: 1,
    },
  }));

  return {
    type: 'clarify',
    message: trimForStyle(`${greeting()}! Here are your groups. Tap one to open:`),
    options,
  };
}

export function buildSettingsAction(action: string): GossipResponse {
  switch (action) {
    case 'logout':
      return {
        type: 'execute',
        message: trimForStyle(`${affirmation()}! Logging you out...`),
        command: { type: 'navigate', payload: 'logout', rawText: 'log out', confidence: 1 },
      };
    case 'theme':
      return {
        type: 'execute',
        message: trimForStyle(`${affirmation()}! Opening theme settings...`),
        command: { type: 'navigate', payload: 'settings_theme', rawText: 'change theme', confidence: 1 },
      };
    case 'profile':
      return {
        type: 'execute',
        message: trimForStyle(`${affirmation()}! Opening profile settings...`),
        command: { type: 'navigate', payload: 'settings_profile', rawText: 'edit profile', confidence: 1 },
      };
    default:
      return {
        type: 'execute',
        message: trimForStyle(`${affirmation()}! Opening settings...`),
        command: { type: 'navigate', payload: 'setting', rawText: 'open settings', confidence: 1 },
      };
  }
}

export function buildWelcomeBack(userName: string, mood: GossipMood): string {
  const name = userName.split('@')[0];
  const welcomes: Record<GossipMood, string[]> = {
    chill: [`${greeting()} ${name}! How's it going?`, `Hey ${name}, what are we doing today?`],
    hyped: [`${greeting()} ${name}!! Let's go!`, `${name}! Great to see you!`],
    sassy: [`Oh look who decided to show up, ${name}!`, `${name}! Finally. I was getting bored.`],
    supportive: [`${greeting()} ${name}! I'm here to help!`, `Welcome back ${name}! What can I do for you?`],
    curious: [`${greeting()} ${name}! What's on your mind?`, `${name}! What's new?`],
  };
  return pick(welcomes[mood]);
}

// ── Follow-up resolution ──

export function resolveFollowUp(
  text: string,
  options: GossipOption[],
): number {
  const lower = text.toLowerCase().trim();

  // "private" → match option labeled "Private chat"
  for (let i = 0; i < options.length; i++) {
    if (options[i].label.toLowerCase().includes(lower)) return i;
  }

  // "the first one", "1", "first"
  const ordinals: Record<string, number> = {
    'first': 0, 'second': 1, 'third': 2, 'fourth': 3,
    '1': 0, '2': 1, '3': 2, '4': 3,
    'the first one': 0, 'the second one': 1, 'the third one': 2, 'the fourth one': 3,
  };
  if (lower in ordinals) {
    const idx = ordinals[lower];
    if (idx < options.length) return idx;
  }

  // "yes" / "yeah" → pick first option
  if (/^(yes|yeah|yep|yup|sure|ok|okay)$/i.test(lower)) {
    return options.length > 0 ? 0 : -1;
  }

  // Try matching by group or person name within options
  for (let i = 0; i < options.length; i++) {
    if (options[i].description.toLowerCase().includes(lower)) return i;
  }

  return -1;
}
