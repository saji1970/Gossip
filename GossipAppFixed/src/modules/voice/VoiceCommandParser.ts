// Parse voice text into structured commands

export type CommandType =
  | 'send_message'
  | 'create_group'
  | 'call_group'
  | 'navigate'
  | 'open_chat'
  | 'unknown';

export interface VoiceCommand {
  type: CommandType;
  payload: string;
  rawText: string;
  confidence: number;
}

interface CommandPattern {
  type: CommandType;
  patterns: RegExp[];
  extractPayload: (match: RegExpMatchArray) => string;
}

const commandPatterns: CommandPattern[] = [
  {
    type: 'send_message',
    patterns: [
      /^(?:send\s+message|say|tell\s+them|message)\s+(.+)$/i,
      /^(?:send|text)\s+(.+)$/i,
    ],
    extractPayload: (match) => match[1].trim(),
  },
  {
    type: 'create_group',
    patterns: [
      /^(?:create|new|make|start)\s+(?:a\s+)?group\s*(.*)$/i,
    ],
    extractPayload: (match) => match[1]?.trim() || '',
  },
  {
    type: 'call_group',
    patterns: [
      /^(?:call|start\s+call|voice\s+call|video\s+call)\s*(.*)$/i,
    ],
    extractPayload: (match) => match[1]?.trim() || '',
  },
  {
    type: 'navigate',
    patterns: [
      /^(?:go\s+to|open|show|switch\s+to)\s+(groups?|chats?|profile|settings|home)$/i,
    ],
    extractPayload: (match) => match[1].toLowerCase().replace(/s$/, ''),
  },
  {
    type: 'open_chat',
    patterns: [
      /^(?:open\s+chat\s+with|talk\s+to|chat\s+with|message)\s+(.+)$/i,
    ],
    extractPayload: (match) => match[1].trim(),
  },
];

export function parseCommand(text: string): VoiceCommand {
  const trimmed = text.trim();

  for (const cmd of commandPatterns) {
    for (const pattern of cmd.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          type: cmd.type,
          payload: cmd.extractPayload(match),
          rawText: trimmed,
          confidence: 0.9,
        };
      }
    }
  }

  return {
    type: 'unknown',
    payload: trimmed,
    rawText: trimmed,
    confidence: 0,
  };
}

export type ScreenContext = 'chat_list' | 'chat_room' | 'create_group' | 'settings' | 'auth' | 'global';

export function getSuggestions(context: ScreenContext): string[] {
  switch (context) {
    case 'chat_list':
      return [
        '"Create group [name]"',
        '"Open chat with [name]"',
        '"Go to settings"',
      ];
    case 'chat_room':
      return [
        '"Say [message]"',
        '"Call"',
        '"Go to chats"',
      ];
    case 'create_group':
      return [
        '"Create group [name]"',
        '"Go to chats"',
      ];
    case 'global':
      return [
        '"Create group"',
        '"Go to chats"',
        '"Open chat with [name]"',
      ];
    default:
      return ['"Say [message]"', '"Create group"'];
  }
}
