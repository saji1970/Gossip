import { parseCommand, VoiceCommand } from '../voice/VoiceCommandParser';
import {
  GossipContext,
  GossipResponse,
  GossipIntent,
  ExtractedEntity,
} from './types';
import { learningStore } from './LearningStore';
import { conversationState } from './ConversationState';
import { conversationHistory } from './ConversationHistory';
import { userPersonalityProfile } from './UserPersonalityProfile';
import { gossipPersonality } from './GossipPersonality';
import { findMember, findGroup } from './ContextBuilder';
import * as IntentResolver from './IntentResolver';
import * as ResponseBuilder from './ResponseBuilder';

class GossipBot {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await learningStore.load();
    await conversationHistory.load();
    await userPersonalityProfile.load();
    await gossipPersonality.load();
    this.initialized = true;
    console.log('[GossipBot] Initialized with personality modules');
  }

  /**
   * Main entry point. Process user input with full context awareness.
   */
  async processInput(
    text: string,
    context: GossipContext,
  ): Promise<GossipResponse> {
    const trimmed = text.trim();
    if (!trimmed) {
      return ResponseBuilder.buildCasualResponse('', gossipPersonality.getMood());
    }

    // Analyze every input for personality learning
    userPersonalityProfile.analyzeInput(trimmed);

    // Detect user sentiment for personality adaptation
    const isPositive = gossipPersonality.detectPositive(trimmed);
    const isFrustrated = gossipPersonality.detectFrustration(trimmed);

    // 1. If there's a pending follow-up, handle it
    const pending = conversationState.getPending();
    if (pending && pending.options.length > 0) {
      const response = await this.handleFollowUp(trimmed, context);
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 2. Try existing regex parser as fast path
    const regexCmd = parseCommand(trimmed);
    if (regexCmd.type !== 'unknown' && regexCmd.confidence >= 0.7) {
      const resolved = this.checkAndResolve(regexCmd, context);
      if (resolved) {
        this.recordExchangeFromResponse(resolved, !isFrustrated, isPositive);
        return resolved;
      }
      const response = ResponseBuilder.buildExecute(
        this.describeCommand(regexCmd),
        regexCmd,
      );
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 3. Try fuzzy intent resolver
    const intentResult = IntentResolver.resolve(trimmed);
    if (intentResult.confidence >= 0.5) {
      userPersonalityProfile.recordCommandUsage(intentResult.intent);
      const response = this.resolveIntent(
        trimmed,
        intentResult.intent,
        intentResult.entities,
        context,
      );
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 4. Casual chat fallback instead of generic "unknown"
    const casualResponse = ResponseBuilder.buildCasualResponse(
      trimmed,
      gossipPersonality.getMood(),
    );
    this.recordExchangeFromResponse(casualResponse, !isFrustrated, isPositive);
    return casualResponse;
  }

  /**
   * Record exchange metrics for personality adaptation.
   */
  private recordExchangeFromResponse(
    response: GossipResponse,
    userFollowedUp: boolean,
    wasPositive: boolean,
  ): void {
    gossipPersonality.recordExchange(userFollowedUp, wasPositive);
  }

  /**
   * Check if a regex-matched command needs disambiguation based on context.
   */
  private checkAndResolve(
    cmd: VoiceCommand,
    context: GossipContext,
  ): GossipResponse | null {
    switch (cmd.type) {
      case 'open_chat':
      case 'private_chat': {
        const personName = cmd.payload;
        if (!personName) return null;
        userPersonalityProfile.recordContactInteraction(personName);
        return this.resolveChatWithPerson(personName, cmd.type === 'private_chat', context);
      }

      case 'create_group': {
        if (!cmd.payload) {
          const resp = ResponseBuilder.buildMissingGroupName();
          conversationState.setPending(cmd.rawText, 'create_group', []);
          return resp;
        }
        return null;
      }

      case 'call_group': {
        if (context.currentScreen !== 'ChatRoom' && !cmd.payload) {
          if (context.groups.length === 0) {
            return {
              type: 'info',
              message: "You don't have any groups to call yet",
            };
          }
          const resp = ResponseBuilder.buildCallAmbiguity(context.groups);
          conversationState.setPending(cmd.rawText, 'call_group', resp.options || []);
          return resp;
        }
        return null;
      }

      case 'send_message': {
        if (context.currentScreen !== 'ChatRoom' && context.groups.length > 0) {
          const msgContent = cmd.payload;
          const resp = ResponseBuilder.buildSendMessageAmbiguity(
            msgContent,
            context.groups,
          );
          conversationState.setPending(cmd.rawText, 'send_message', resp.options || []);
          return resp;
        }
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Resolve a fuzzy intent with extracted entities against context.
   */
  private resolveIntent(
    rawText: string,
    intent: GossipIntent,
    entities: ExtractedEntity[],
    context: GossipContext,
  ): GossipResponse {
    switch (intent) {
      case 'chat_with_person':
      case 'private_chat': {
        const personEntity = entities.find(e => e.type === 'person');
        if (!personEntity) {
          return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());
        }
        userPersonalityProfile.recordContactInteraction(personEntity.value);
        return this.resolveChatWithPerson(
          personEntity.value,
          intent === 'private_chat',
          context,
        );
      }

      case 'create_group': {
        const groupEntity = entities.find(e => e.type === 'group');
        if (!groupEntity) {
          const resp = ResponseBuilder.buildMissingGroupName();
          conversationState.setPending(rawText, 'create_group', []);
          return resp;
        }
        return ResponseBuilder.buildExecute(
          `Creating group "${groupEntity.value}"`,
          {
            type: 'create_group',
            payload: groupEntity.value,
            rawText,
            confidence: 1,
          },
        );
      }

      case 'call_group': {
        if (context.currentScreen === 'ChatRoom' && context.currentGroup) {
          return ResponseBuilder.buildExecute(
            `Calling ${context.currentGroup.name}`,
            {
              type: 'call_group',
              payload: context.currentGroup.id,
              rawText,
              confidence: 1,
            },
          );
        }
        if (context.groups.length === 0) {
          return { type: 'info', message: "You don't have any groups to call yet" };
        }
        const resp = ResponseBuilder.buildCallAmbiguity(context.groups);
        conversationState.setPending(rawText, 'call_group', resp.options || []);
        return resp;
      }

      case 'send_message': {
        const msgEntity = entities.find(e => e.type === 'message');
        const msg = msgEntity?.value || rawText;
        if (context.currentScreen === 'ChatRoom') {
          return ResponseBuilder.buildExecute(
            `Sending message`,
            { type: 'send_message', payload: msg, rawText, confidence: 1 },
          );
        }
        if (context.groups.length === 0) {
          return { type: 'info', message: "You don't have any groups yet" };
        }
        const resp = ResponseBuilder.buildSendMessageAmbiguity(msg, context.groups);
        conversationState.setPending(rawText, 'send_message', resp.options || []);
        return resp;
      }

      case 'query_groups': {
        const personEntity = entities.find(e => e.type === 'person');
        if (!personEntity) {
          return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());
        }
        const members = findMember(personEntity.value, context.groups);
        if (members.length === 0) {
          return ResponseBuilder.buildMemberNotFound(personEntity.value);
        }
        return ResponseBuilder.buildGroupsInfoResponse(
          personEntity.value,
          members[0],
        );
      }

      case 'query_members': {
        const groupEntity = entities.find(e => e.type === 'group');
        if (!groupEntity) {
          return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());
        }
        const matches = findGroup(groupEntity.value, context.groups);
        if (matches.length === 0) {
          return {
            type: 'info',
            message: `Couldn't find a group named "${groupEntity.value}".`,
          };
        }
        const g = matches[0].group;
        return ResponseBuilder.buildMembersInfoResponse(
          g.name,
          g.members.map(m => m.email),
        );
      }

      case 'navigate': {
        const screenEntity = entities.find(e => e.type === 'screen');
        if (!screenEntity) return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());
        return ResponseBuilder.buildExecute(
          `Going to ${screenEntity.value}`,
          {
            type: 'navigate',
            payload: screenEntity.value,
            rawText,
            confidence: 1,
          },
        );
      }

      case 'casual_chat':
        return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());

      case 'show_groups':
        return ResponseBuilder.buildGroupsList(context.groups);

      case 'settings_change': {
        const actionEntity = entities.find(e => e.type === 'screen');
        return ResponseBuilder.buildSettingsAction(actionEntity?.value || 'settings');
      }

      case 'help':
        return ResponseBuilder.buildHelp();

      default:
        return ResponseBuilder.buildCasualResponse(rawText, gossipPersonality.getMood());
    }
  }

  /**
   * Resolve "chat with [person]" — handles single group, multi-group, not found.
   */
  private resolveChatWithPerson(
    name: string,
    isPrivate: boolean,
    context: GossipContext,
  ): GossipResponse {
    const members = findMember(name, context.groups);

    if (members.length === 0) {
      return ResponseBuilder.buildMemberNotFound(name);
    }

    const member = members[0];

    if (isPrivate) {
      return ResponseBuilder.buildExecute(
        `Opening DMs with ${member.displayName}`,
        {
          type: 'private_chat',
          payload: member.email,
          rawText: `private chat with ${name}`,
          confidence: 1,
        },
      );
    }

    if (member.groups.length === 1) {
      return ResponseBuilder.buildSingleGroupChat(name, member);
    }

    const resp = ResponseBuilder.buildChatAmbiguity(name, member);
    conversationState.setPending(
      `chat with ${name}`,
      'chat_with_person',
      resp.options || [],
    );
    return resp;
  }

  /**
   * Handle a follow-up answer to a pending clarification.
   */
  private async handleFollowUp(
    text: string,
    context: GossipContext,
  ): Promise<GossipResponse> {
    const pending = conversationState.getPending();
    if (!pending) {
      return this.processInput(text, context);
    }

    if (!conversationState.incrementTurn()) {
      conversationState.reset();
      return ResponseBuilder.buildMaxTurns();
    }

    // Special case: pending create_group with no options (waiting for group name)
    if (pending.intent === 'create_group' && pending.options.length === 0) {
      conversationState.reset();
      const name = text.trim();
      await learningStore.recordResolution(pending.originalText, 'create_group', [
        { type: 'group', value: name },
      ]);
      return ResponseBuilder.buildExecute(
        `Creating group "${name}"`,
        {
          type: 'create_group',
          payload: name,
          rawText: `create group ${name}`,
          confidence: 1,
        },
      );
    }

    const matchIdx = ResponseBuilder.resolveFollowUp(text, pending.options);
    if (matchIdx >= 0) {
      const option = pending.options[matchIdx];
      conversationState.reset();

      await learningStore.recordResolution(
        pending.originalText,
        pending.intent,
        [{ type: 'group', value: option.label }],
      );

      return {
        type: 'execute',
        message: `${option.label} — gotchu!`,
        command: option.command,
      };
    }

    return {
      type: 'clarify',
      message: `Hmm didn't catch which one. Pick an option or say it again?`,
      options: pending.options,
    };
  }

  reset(): void {
    conversationState.reset();
  }

  /** Generate a human-readable description for a command. */
  private describeCommand(cmd: VoiceCommand): string {
    switch (cmd.type) {
      case 'send_message': return `Sending message`;
      case 'create_group': return `Creating group`;
      case 'call_group': return `Starting call`;
      case 'navigate': return `Going to ${cmd.payload}`;
      case 'open_chat': return `Opening chat`;
      case 'private_chat': return `Opening DMs`;
      case 'whisper': return `Sending whisper`;
      case 'read_latest': return `Reading latest message`;
      case 'read_unread': return `Reading unread messages`;
      case 'select_suggestion': return `Selecting option ${cmd.payload}`;
      case 'summarize': return `Summarizing conversation`;
      case 'start_ambient': return `Starting ambient mode`;
      case 'stop_ambient': return `Stopping ambient mode`;
      default: return `Executing command`;
    }
  }
}

export const gossipBot = new GossipBot();
