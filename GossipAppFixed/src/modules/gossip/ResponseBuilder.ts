import { GossipResponse, GossipOption, GossipMood, MemberSearchResult, GroupSearchResult, NextAction, ActionExecuteResult } from './types';
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
    message: trimForStyle(`Opening ${g.name} to chat with ${name}`),
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
    message: 'What would you like to call the group?',
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
    message: trimForStyle(msg),
    command,
  };
}

export function buildHelp(): GossipResponse {
  return {
    type: 'info',
    message: trimForStyle(
      `Here's what I can do:\n` +
      `- "Create a private group [name]" — new group\n` +
      `- "Create group [name] and add [person] email [email]"\n` +
      `- "Add [name] to [group] email [email]" — invite member\n` +
      `- "Chat with [name]" — open a conversation\n` +
      `- "DM [name]" — private message\n` +
      `- "Call [group]" — start a call\n` +
      `- "Send [message] in [group]"\n` +
      `- "Who's in [group]?" — list members\n` +
      `- "Show my groups" — see all groups\n` +
      `- "Settings" / "Log out"`,
    ),
  };
}

export function buildAssistantHelp(): GossipResponse {
  return {
    type: 'info',
    message: 'What can I help you with? Try "send a message", "call a group", or "show my groups".',
  };
}

// ── New builders for conversational AI ──

export function buildCasualResponse(text: string, mood: GossipMood): GossipResponse {
  const lower = text.toLowerCase();

  // Greeting responses
  if (/how are you|how('s| is) it going|what'?s up|wassup|sup\b/i.test(lower)) {
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
  if (/thanks|thank you|thx|ty\b/i.test(lower)) {
    const responses = [
      'Anytime!', 'No problem!', 'Always got your back!', 'Happy to help!',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Laughter
  if (/lol|haha|hehe|lmao|rofl/i.test(lower)) {
    const responses = [
      'Haha, glad you\'re having fun!', 'Ha! Right?', 'That\'s funny!',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Goodbye
  if (/bye|see ya|later|gotta go|peace out|take care/i.test(lower)) {
    const responses = [
      'Catch you later!', 'See you! I\'ll be here.', 'Bye! Don\'t be a stranger.',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Good morning/night
  if (/good morning|^morning\b/i.test(lower)) {
    return { type: 'info', message: trimForStyle('Morning! Ready to start the day?') };
  }
  if (/good night|^gn\b|^night\b/i.test(lower)) {
    return { type: 'info', message: 'Night! Sleep well, I\'ll be here when you get back.' };
  }

  // Affirmation / acknowledgment
  if (/sounds good|that works|that's fine|no problem|no worries|got it|i see|makes sense|of course|alright then/i.test(lower)) {
    const responses = [
      'Great! Anything else I can help with?',
      'Sounds good! Let me know if you need anything.',
      'Perfect! I\'m here if you need me.',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Short single-word affirmatives
  if (/^(ok|okay|k|yeah|yep|yup|yes|sure|right|true|same|exactly|definitely|absolutely|cool|nice|great|perfect|awesome|sweet|fine|alright|wow|amazing|interesting)$/i.test(lower)) {
    const responses = [
      'What can I help you with?',
      'Need me to do anything?',
      'Ready for your next command.',
      'What would you like to do?',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Questions about the bot
  if (/who are you|what's your name|what are you/i.test(lower)) {
    return {
      type: 'info',
      message: 'I\'m Gossip, your chat assistant! I can help you message friends, create groups, make calls, and more. Just ask!',
    };
  }

  // Emotional states
  if (/i'm bored|i'm tired|bored|tired/i.test(lower)) {
    const responses = [
      'Want to check in on your groups? Say "show my groups".',
      'How about chatting with a friend? Just say "chat with [name]".',
      'I\'m here to keep you company! Want to do anything?',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Never mind / whatever
  if (/never mind|forget it|whatever|nah|nope/i.test(lower)) {
    const responses = [
      'No worries! I\'m here whenever you need me.',
      'All good! Just let me know.',
      'No problem! I\'ll be right here.',
    ];
    return { type: 'info', message: pick(responses) };
  }

  // Generic fallback — suggest available actions
  const fallbacks = [
    'What can I help you with? Try "send a message", "call a group", or "show my groups".',
    'I can send messages, make calls, create groups, and more. What do you need?',
    'Not sure what to do with that. Try "help" to see what I can do.',
    'I\'m your assistant! Tell me what you need — messages, calls, groups, or settings.',
  ];
  return { type: 'info', message: pick(fallbacks) };
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
    message: trimForStyle('Here are your groups. Tap one to open:'),
    options,
  };
}

export function buildSettingsAction(action: string): GossipResponse {
  switch (action) {
    case 'logout':
      return {
        type: 'execute',
        message: 'Logging you out...',
        command: { type: 'navigate', payload: 'logout', rawText: 'log out', confidence: 1 },
      };
    case 'theme':
      return {
        type: 'execute',
        message: 'Opening theme settings',
        command: { type: 'navigate', payload: 'settings_theme', rawText: 'change theme', confidence: 1 },
      };
    case 'profile':
      return {
        type: 'execute',
        message: 'Opening profile settings',
        command: { type: 'navigate', payload: 'settings_profile', rawText: 'edit profile', confidence: 1 },
      };
    default:
      return {
        type: 'execute',
        message: 'Opening settings',
        command: { type: 'navigate', payload: 'setting', rawText: 'open settings', confidence: 1 },
      };
  }
}

export function buildWelcomeBack(userName: string, mood: GossipMood): string {
  const name = userName.split('@')[0];
  const welcomes = [
    `Hey ${name}! What can I do for you?`,
    `Welcome back ${name}! How can I help?`,
    `Hi ${name}! Ready when you are.`,
  ];
  return pick(welcomes);
}

// ── Action result builders (Alexa-like post-action flow) ──

export function buildActionResult(result: ActionExecuteResult): GossipResponse {
  const options = nextActionsToOptions(result.nextActions);

  if (result.confirmationRequired) {
    return {
      type: 'clarify',
      message: trimForStyle(result.message),
      options: [
        {
          label: 'Yes',
          description: 'Confirm action',
          command: { type: 'confirm_action', payload: 'yes', rawText: 'yes', confidence: 1 },
        },
        {
          label: 'No',
          description: 'Cancel',
          command: { type: 'confirm_action', payload: 'no', rawText: 'no', confidence: 1 },
        },
      ],
    };
  }

  if (!result.success) {
    return { type: 'info', message: trimForStyle(result.message), options };
  }

  return {
    type: options.length > 0 ? 'clarify' : 'info',
    message: trimForStyle(result.message),
    options,
  };
}

export function buildConfirmation(description: string): GossipResponse {
  return {
    type: 'clarify',
    message: trimForStyle(description),
    options: [
      {
        label: 'Yes, do it',
        description: 'Confirm',
        command: { type: 'confirm_action', payload: 'yes', rawText: 'yes', confidence: 1 },
      },
      {
        label: 'No, cancel',
        description: 'Cancel',
        command: { type: 'confirm_action', payload: 'no', rawText: 'no', confidence: 1 },
      },
    ],
  };
}

export function buildNeedsInfo(field: string, prompt: string): GossipResponse {
  return {
    type: 'clarify',
    message: trimForStyle(prompt),
    options: [],
  };
}

function nextActionsToOptions(actions: NextAction[]): GossipOption[] {
  return actions.slice(0, 4).map(a => ({
    label: a.label,
    description: a.label,
    command: mapNextActionToCommand(a),
  }));
}

function mapNextActionToCommand(action: NextAction): VoiceCommand {
  switch (action.type) {
    case 'add_member':
      return {
        type: 'navigate',
        payload: JSON.stringify({ screen: 'InviteMembers', ...action.params }),
        rawText: action.label,
        confidence: 1,
      };
    case 'open_group':
      return {
        type: 'open_chat',
        payload: JSON.stringify({ groupId: action.params.groupId }),
        rawText: action.label,
        confidence: 1,
      };
    default:
      return {
        type: 'navigate',
        payload: action.type,
        rawText: action.label,
        confidence: 1,
      };
  }
}

// ── Follow-up resolution ──

export function resolveFollowUp(
  text: string,
  options: GossipOption[],
): number {
  const lower = text.toLowerCase().trim();

  // Strip common prepositions that precede a group/person name
  const stripped = lower
    .replace(/^(in|to|for|from|at|on|the|into)\s+/i, '')
    .replace(/\s+(group|chat|one)$/i, '')
    .trim();

  // Bidirectional substring: "Poker Group" includes "poker", and "in poker group" includes "poker group"
  for (let i = 0; i < options.length; i++) {
    const label = options[i].label.toLowerCase();
    if (label.includes(lower) || lower.includes(label)) return i;
    if (stripped && (label.includes(stripped) || stripped.includes(label))) return i;
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

  // Try matching by group or person name within descriptions (bidirectional)
  for (let i = 0; i < options.length; i++) {
    const desc = options[i].description.toLowerCase();
    if (desc.includes(lower) || lower.includes(desc)) return i;
    if (stripped && (desc.includes(stripped) || stripped.includes(desc))) return i;
  }

  // Word-level fuzzy: if any significant word (3+ chars) from user text appears in a label
  const userWords = stripped.split(/\s+/).filter(w => w.length >= 3);
  if (userWords.length > 0) {
    for (let i = 0; i < options.length; i++) {
      const label = options[i].label.toLowerCase();
      for (const word of userWords) {
        if (label.includes(word)) return i;
      }
    }
  }

  return -1;
}
