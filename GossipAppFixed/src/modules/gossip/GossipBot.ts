import { parseCommand, VoiceCommand } from '../voice/VoiceCommandParser';
import {
  GossipContext,
  GossipResponse,
  GossipIntent,
  ExtractedEntity,
  EntityType,
  BackendIntentResult,
  PendingAction,
  PendingClarification,
  ActionExecuteResult,
} from './types';
import { learningStore } from './LearningStore';
import { conversationState } from './ConversationState';
import { conversationHistory } from './ConversationHistory';
import { userPersonalityProfile } from './UserPersonalityProfile';
import { gossipPersonality } from './GossipPersonality';
import { findMember, findGroup } from './ContextBuilder';
import * as IntentResolver from './IntentResolver';
import * as ResponseBuilder from './ResponseBuilder';
import * as api from '../../services/api';

/** Intents that should be executed via backend action engine. */
const ACTIONABLE_INTENTS = new Set<string>([
  'create_group',
  'add_member',
]);

class GossipBot {
  private initialized = false;
  private pendingAction: PendingAction | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await learningStore.load();
    await conversationHistory.load();
    await userPersonalityProfile.load();
    await gossipPersonality.load();
    this.initialized = true;
    console.log('[GossipBot] Initialized with action engine');
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

    // 0. If there's a pending action needing confirmation, check for yes/no
    if (this.pendingAction) {
      const response = await this.handlePendingAction(trimmed, context);
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 1. If there's a pending follow-up (clarification options), handle it
    const pending = conversationState.getPending();
    if (pending && pending.options.length > 0) {
      const response = await this.handleFollowUp(trimmed, context);
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 2. Try backend command/execute (single-shot: classify + execute)
    const backendActionResult = await this.tryBackendCommandExecute(trimmed, context);
    if (backendActionResult) {
      const response = this.handleActionResult(backendActionResult, trimmed);
      userPersonalityProfile.recordCommandUsage(backendActionResult.intent as GossipIntent);
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 3. Try backend NLP classification only (4s timeout)
    const backendResult = await this.tryBackendNLP(trimmed, context);
    if (backendResult) {
      const intent = backendResult.intent as GossipIntent;
      const entities: ExtractedEntity[] = backendResult.entities.map(e => ({
        type: e.type as ExtractedEntity['type'],
        value: e.value,
      }));
      userPersonalityProfile.recordCommandUsage(intent);
      const response = this.resolveIntent(trimmed, intent, entities, context);
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 4. Try existing regex parser as fast path
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

    // 5. Try fuzzy intent resolver (with compound entity detection)
    const intentResult = IntentResolver.resolve(trimmed);
    if (intentResult.confidence >= 0.7) {
      // Merge compound entities (e.g. "create group X and add Y")
      const compoundEntities = IntentResolver.extractCompoundEntities(trimmed, intentResult.intent);
      const allEntities = [...intentResult.entities, ...compoundEntities];

      // If actionable and we have enough data, try direct execution
      if (ACTIONABLE_INTENTS.has(intentResult.intent)) {
        const actionResponse = await this.tryLocalActionExecution(
          trimmed, intentResult.intent, allEntities, context,
        );
        if (actionResponse) {
          this.recordExchangeFromResponse(actionResponse, !isFrustrated, isPositive);
          return actionResponse;
        }
      }

      userPersonalityProfile.recordCommandUsage(intentResult.intent);
      const response = this.resolveIntent(
        trimmed,
        intentResult.intent,
        allEntities,
        context,
      );
      this.recordExchangeFromResponse(response, !isFrustrated, isPositive);
      return response;
    }

    // 6. Casual chat fallback
    const casualResponse = ResponseBuilder.buildCasualResponse(
      trimmed,
      gossipPersonality.getMood(),
    );
    this.recordExchangeFromResponse(casualResponse, !isFrustrated, isPositive);
    return casualResponse;
  }

  /**
   * Handle a yes/no response to a pending action confirmation.
   */
  private async handlePendingAction(
    text: string,
    context: GossipContext,
  ): Promise<GossipResponse> {
    const action = this.pendingAction!;
    const lower = text.toLowerCase().trim();
    const isYes = /^(yes|yeah|yep|yup|sure|ok|okay|do it|go ahead|confirm|send it|absolutely|please)$/i.test(lower);
    const isNo = /^(no|nope|nah|cancel|nevermind|never mind|forget it|stop)$/i.test(lower);

    if (isNo) {
      this.pendingAction = null;
      return { type: 'info', message: 'No problem, cancelled!' };
    }

    if (isYes) {
      this.pendingAction = null;

      // Execute the confirmed action via backend
      try {
        const groups = context.groups.map(g => ({
          name: g.name,
          members: g.members.map(m => ({ email: m.email })),
        }));

        const result = await Promise.race([
          api.executeCommand(
            '', groups, context.currentScreen, true,
            action.intent,
            action.entities.map(e => ({ type: e.type, value: e.value })),
          ),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 6000)),
        ]);

        if (result && result.success) {
          return ResponseBuilder.buildActionResult(result as ActionExecuteResult);
        }

        if (result && !result.success) {
          return { type: 'info', message: result.message || 'Something went wrong.' };
        }
      } catch (err) {
        console.log('[GossipBot] Confirmed action failed:', err);
      }

      // Fallback: execute locally via old flow
      return this.resolveIntent(
        action.description,
        action.intent,
        action.entities,
        context,
      );
    }

    // Not a clear yes/no — re-prompt
    return {
      type: 'clarify',
      message: `Just to confirm — ${action.description} Yes or no?`,
      options: [
        { label: 'Yes', description: 'Confirm', command: { type: 'confirm_action', payload: 'yes', rawText: 'yes', confidence: 1 } },
        { label: 'No', description: 'Cancel', command: { type: 'confirm_action', payload: 'no', rawText: 'no', confidence: 1 } },
      ],
    };
  }

  /**
   * Try the backend /command/execute endpoint (classify + execute in one shot).
   * Returns null if backend is unavailable or intent is non-actionable.
   */
  private async tryBackendCommandExecute(
    text: string,
    context: GossipContext,
  ): Promise<ActionExecuteResult | null> {
    try {
      const groups = context.groups.map(g => ({
        name: g.name,
        members: g.members.map(m => ({ email: m.email })),
      }));

      const result = await Promise.race([
        api.executeCommand(text, groups, context.currentScreen),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
      ]);

      if (!result) {
        console.log('[GossipBot] Backend command/execute timed out');
        return null;
      }

      // Only use this for actionable intents that were actually executed
      if (!ACTIONABLE_INTENTS.has(result.intent)) {
        return null;
      }

      if (result.confidence < 0.6) {
        return null;
      }

      console.log(`[GossipBot] Backend execute: ${result.intent} (${result.confidence}) via ${result.tier} — ${result.success ? 'OK' : 'FAIL'}`);
      return result as ActionExecuteResult;
    } catch (err) {
      console.log('[GossipBot] Backend command/execute unavailable:', err);
      return null;
    }
  }

  /**
   * Handle an ActionExecuteResult — convert to GossipResponse.
   * Sets up pending action if confirmation is needed.
   */
  private handleActionResult(
    result: ActionExecuteResult,
    rawText: string,
  ): GossipResponse {
    // If the backend needs more info, set up a follow-up
    if (result.needsInfo) {
      const backendEntities: ExtractedEntity[] = result.entities.map(e => ({
        type: e.type as ExtractedEntity['type'],
        value: e.value,
      }));
      const missing: EntityType[] = result.needsInfo ? [result.needsInfo as EntityType] : [];
      conversationState.setPending(rawText, result.intent as GossipIntent, [], backendEntities, missing);
      return { type: 'clarify', message: result.message, options: [] };
    }

    // If confirmation is required, store pending action
    if (result.confirmationRequired) {
      this.pendingAction = {
        intent: result.intent as GossipIntent,
        entities: result.entities.map(e => ({
          type: e.type as ExtractedEntity['type'],
          value: e.value,
        })),
        params: result.data,
        description: result.message,
        createdAt: Date.now(),
      };
      return ResponseBuilder.buildConfirmation(result.message);
    }

    // Action completed — show result with next action suggestions
    return ResponseBuilder.buildActionResult(result);
  }

  /**
   * Try executing an action locally via API calls when backend /command/execute
   * isn't available but we have enough entities.
   */
  private async tryLocalActionExecution(
    rawText: string,
    intent: GossipIntent,
    entities: ExtractedEntity[],
    context: GossipContext,
  ): Promise<GossipResponse | null> {
    if (intent === 'create_group') {
      const groupEntity = entities.find(e => e.type === 'group');
      if (!groupEntity) return null;

      const privacy = entities.find(e => e.type === 'privacy')?.value || 'private';
      const approval = entities.find(e => e.type === 'approval')?.value === 'true';
      const email = entities.find(e => e.type === 'email')?.value;
      const person = entities.find(e => e.type === 'person')?.value;

      const members: Array<{ email: string; role?: string; status?: string }> = [];
      if (email) {
        members.push({ email, role: 'member', status: 'pending' });
      }

      try {
        const group = await api.createGroup({
          name: groupEntity.value,
          privacy,
          requireApproval: approval,
          members,
        });

        let message = `Group "${group.name}" created!`;

        // If member was added inline, offer to send invite
        if (email) {
          const label = person || email;
          message += ` ${label} added.`;

          try {
            const inviteResult = await api.inviteMember(group.id, email, person);
            if (inviteResult.emailSent) {
              message += ' Invite email sent!';
            }
          } catch {
            // Invite failed, member still added
          }
        }

        // Build next action options
        const options: import('./types').GossipOption[] = [
          {
            label: 'Add members',
            description: `Add members to ${group.name}`,
            command: {
              type: 'navigate',
              payload: JSON.stringify({ screen: 'InviteMembers', groupId: group.id, groupName: group.name }),
              rawText: 'add members',
              confidence: 1,
            },
          },
          {
            label: `Open ${group.name}`,
            description: `Go to ${group.name}`,
            command: {
              type: 'open_chat',
              payload: JSON.stringify({ groupId: group.id }),
              rawText: `open ${group.name}`,
              confidence: 1,
            },
          },
        ];

        return {
          type: 'clarify',
          message,
          options,
        };
      } catch (err: any) {
        return {
          type: 'info',
          message: err?.message || 'Failed to create group.',
        };
      }
    }

    if (intent === 'add_member') {
      const email = entities.find(e => e.type === 'email')?.value;
      const person = entities.find(e => e.type === 'person')?.value;
      const groupEntity = entities.find(e => e.type === 'group');

      if (!email || !groupEntity) return null;

      // Find matching group
      const matches = findGroup(groupEntity.value, context.groups);
      if (matches.length === 0) {
        return { type: 'info', message: `Couldn't find a group called "${groupEntity.value}".` };
      }

      const group = matches[0].group;
      const label = person || email;

      // Set up confirmation
      this.pendingAction = {
        intent: 'add_member',
        entities,
        params: { groupId: group.id, groupName: group.name, email, person },
        description: `Add ${label} to ${group.name} and send an invite?`,
        createdAt: Date.now(),
      };

      return ResponseBuilder.buildConfirmation(
        `Add ${label} to ${group.name} and send an invite?`,
      );
    }

    return null;
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
          conversationState.setPending(cmd.rawText, 'create_group', [], [], ['group']);
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
          conversationState.setPending(cmd.rawText, 'call_group', resp.options || [], [], ['group']);
          return resp;
        }
        return null;
      }

      case 'send_message': {
        if (context.currentScreen !== 'ChatRoom' && context.groups.length > 0) {
          const msgContent = cmd.payload;
          const entities: ExtractedEntity[] = msgContent
            ? [{ type: 'message', value: msgContent }]
            : [];
          const resp = ResponseBuilder.buildSendMessageAmbiguity(
            msgContent,
            context.groups,
          );
          conversationState.setPending(cmd.rawText, 'send_message', resp.options || [], entities, ['group']);
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
          conversationState.setPending(rawText, 'create_group', [], entities, ['group']);
          return resp;
        }

        // Build payload with all extracted properties
        const privacy = entities.find(e => e.type === 'privacy')?.value;
        const approval = entities.find(e => e.type === 'approval')?.value;
        const payloadObj: Record<string, any> = { name: groupEntity.value };
        if (privacy) payloadObj.privacy = privacy;
        if (approval) payloadObj.requireApproval = approval === 'true';

        return ResponseBuilder.buildExecute(
          `Creating group "${groupEntity.value}"`,
          {
            type: 'create_group',
            payload: JSON.stringify(payloadObj),
            rawText,
            confidence: 1,
          },
        );
      }

      case 'add_member': {
        const email = entities.find(e => e.type === 'email')?.value;
        const person = entities.find(e => e.type === 'person')?.value;
        const groupEntity = entities.find(e => e.type === 'group');

        if (!email) {
          const missing = this.getMissingEntities('add_member', entities, context);
          conversationState.setPending(rawText, 'add_member', [], entities, missing);
          return {
            type: 'clarify',
            message: `What's ${person || 'their'} email address?`,
            options: [],
          };
        }

        if (!groupEntity) {
          // Ask which group
          if (context.groups.length === 0) {
            return { type: 'info', message: "You don't have any groups yet." };
          }
          const options = context.groups.slice(0, 4).map(g => ({
            label: g.name,
            description: `Add to ${g.name}`,
            command: {
              type: 'navigate' as const,
              payload: JSON.stringify({ screen: 'InviteMembers', groupId: g.id, email, person }),
              rawText: `add ${person || email} to ${g.name}`,
              confidence: 1,
            },
          }));
          conversationState.setPending(rawText, 'add_member', options, entities, ['group']);
          return { type: 'clarify', message: 'Which group?', options };
        }

        // We have everything — set up confirmation
        const label = person || email;
        this.pendingAction = {
          intent: 'add_member',
          entities,
          params: { groupName: groupEntity.value, email, person },
          description: `Add ${label} to ${groupEntity.value} and send an invite?`,
          createdAt: Date.now(),
        };
        return ResponseBuilder.buildConfirmation(
          `Add ${label} to ${groupEntity.value} and send an invite?`,
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
        conversationState.setPending(rawText, 'call_group', resp.options || [], entities, ['group']);
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
        const sendResp = ResponseBuilder.buildSendMessageAmbiguity(msg, context.groups);
        conversationState.setPending(rawText, 'send_message', sendResp.options || [], entities, ['group']);
        return sendResp;
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

      case 'record_voice': {
        const groupEntity = entities.find(e => e.type === 'group');

        // If already in a ChatRoom, record in current group
        if (context.currentScreen === 'ChatRoom' && context.currentGroup) {
          return ResponseBuilder.buildExecute(
            `Starting voice recording in ${context.currentGroup.name}`,
            {
              type: 'record_voice',
              payload: JSON.stringify({ groupId: context.currentGroup.id, groupName: context.currentGroup.name }),
              rawText,
              confidence: 1,
            },
          );
        }

        // Find matching group from entities
        if (groupEntity) {
          const matches = findGroup(groupEntity.value, context.groups);
          if (matches.length > 0) {
            const g = matches[0].group;
            return ResponseBuilder.buildExecute(
              `Recording voice message for ${g.name}`,
              {
                type: 'record_voice',
                payload: JSON.stringify({ groupId: g.id, groupName: g.name }),
                rawText,
                confidence: 1,
              },
            );
          }
          return { type: 'info', message: `Couldn't find a group called "${groupEntity.value}".` };
        }

        // No group specified — ask
        if (context.groups.length === 0) {
          return { type: 'info', message: "You don't have any groups yet." };
        }
        const recordOptions = context.groups.slice(0, 4).map(g => ({
          label: g.name,
          description: `Record voice message for ${g.name}`,
          command: {
            type: 'record_voice' as const,
            payload: JSON.stringify({ groupId: g.id, groupName: g.name }),
            rawText: `record voice message for ${g.name}`,
            confidence: 1,
          },
        }));
        conversationState.setPending(rawText, 'record_voice', recordOptions, entities, ['group']);
        return { type: 'clarify', message: 'Which group should I record a voice message for?', options: recordOptions };
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
      [{ type: 'person', value: name }],
      ['group'],
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
          payload: JSON.stringify({ name }),
          rawText: `create group ${name}`,
          confidence: 1,
        },
      );
    }

    // Special case: pending add_member with no options (waiting for email)
    if (pending.intent === 'add_member' && pending.options.length === 0) {
      const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) {
        // Merge the email entity and check if we have everything
        conversationState.mergeEntities([{ type: 'email', value: emailMatch[0] }]);
        const updatedPending = conversationState.getPending()!;
        return this.resolveIntentOrAskMore(
          updatedPending.originalText,
          updatedPending.intent,
          updatedPending.entities,
          context,
        );
      }
      return {
        type: 'clarify',
        message: "I need an email address. What's their email?",
        options: [],
      };
    }

    // Try matching against presented options (pill taps + typed labels)
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
        message: `${option.label} — got it!`,
        command: option.command,
      };
    }

    // Escape hatch: if user's text is a high-confidence new intent, reset and process fresh
    const freshIntent = IntentResolver.resolve(text);
    if (freshIntent.confidence >= 0.8 && freshIntent.intent !== 'casual_chat' && freshIntent.intent !== 'unknown') {
      conversationState.reset();
      return this.processInput(text, context);
    }

    // Fallback: try to extract the missing entity from the follow-up text
    const mergeResult = this.tryEntityMerge(text, pending, context);
    if (mergeResult) {
      return mergeResult;
    }

    return {
      type: 'clarify',
      message: `Hmm didn't catch which one. Pick an option or say it again?`,
      options: pending.options,
    };
  }

  /**
   * Try to extract a missing entity from follow-up text and merge it
   * into the pending clarification. Returns a response if successful.
   */
  private tryEntityMerge(
    text: string,
    pending: PendingClarification,
    context: GossipContext,
  ): GossipResponse | null {
    const missing = pending.missingEntities;
    const newEntities: ExtractedEntity[] = [];

    // Strip prepositions: "in poker group" → "poker group"
    const stripped = text
      .replace(/^(in|to|for|from|at|on|into|the)\s+/i, '')
      .replace(/\s+(group|chat|one)$/i, '')
      .trim();

    // Try to resolve each missing entity type
    if (missing.includes('group')) {
      // Try against known groups
      const matches = findGroup(stripped, context.groups);
      if (matches.length > 0) {
        newEntities.push({ type: 'group', value: matches[0].group.name });
      } else {
        // Also try the raw text
        const rawMatches = findGroup(text.trim(), context.groups);
        if (rawMatches.length > 0) {
          newEntities.push({ type: 'group', value: rawMatches[0].group.name });
        }
      }
    }

    if (missing.includes('email')) {
      const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) {
        newEntities.push({ type: 'email', value: emailMatch[0] });
      }
    }

    if (missing.includes('person')) {
      // Treat the stripped text as a person name
      const name = stripped || text.trim();
      if (name && name.length > 0 && !/^[\d\s]+$/.test(name)) {
        newEntities.push({ type: 'person', value: name });
      }
    }

    if (missing.includes('message')) {
      newEntities.push({ type: 'message', value: text.trim() });
    }

    if (newEntities.length === 0) return null;

    // Merge and check if we're complete
    conversationState.mergeEntities(newEntities);
    const updatedPending = conversationState.getPending();
    if (!updatedPending) return null;

    return this.resolveIntentOrAskMore(
      updatedPending.originalText,
      updatedPending.intent,
      updatedPending.entities,
      context,
    );
  }

  /**
   * Check if all required entities are present. If yes, resolve the intent.
   * If no, set up a new pending asking for the next missing piece.
   */
  private resolveIntentOrAskMore(
    originalText: string,
    intent: GossipIntent,
    entities: ExtractedEntity[],
    context: GossipContext,
  ): GossipResponse {
    const missing = this.getMissingEntities(intent, entities, context);

    if (missing.length === 0) {
      // All entities present — execute
      conversationState.reset();
      return this.resolveIntent(originalText, intent, entities, context);
    }

    // Still need more — ask for the next missing entity
    const nextMissing = missing[0];
    const prompts: Record<string, { message: string; options: import('./types').GossipOption[] }> = {
      group: {
        message: 'Which group?',
        options: context.groups.slice(0, 4).map(g => ({
          label: g.name,
          description: `Select ${g.name}`,
          command: {
            type: 'open_chat' as const,
            payload: JSON.stringify({ groupId: g.id }),
            rawText: g.name,
            confidence: 1,
          },
        })),
      },
      email: {
        message: `What's ${entities.find(e => e.type === 'person')?.value || 'their'} email address?`,
        options: [],
      },
      person: {
        message: 'Who would you like to add?',
        options: [],
      },
      message: {
        message: 'What message would you like to send?',
        options: [],
      },
    };

    const prompt = prompts[nextMissing] || { message: `What's the ${nextMissing}?`, options: [] };
    conversationState.setPending(originalText, intent, prompt.options, entities, missing);
    return { type: 'clarify', message: prompt.message, options: prompt.options };
  }

  /**
   * Determine which entity types are still needed for a given intent.
   */
  private getMissingEntities(
    intent: GossipIntent,
    entities: ExtractedEntity[],
    context: GossipContext,
  ): EntityType[] {
    const has = (type: EntityType) => entities.some(e => e.type === type);
    const missing: EntityType[] = [];
    const inChatRoom = context.currentScreen === 'ChatRoom' && !!context.currentGroup;

    switch (intent) {
      case 'send_message':
        if (!has('message')) missing.push('message');
        if (!has('group') && !inChatRoom) missing.push('group');
        break;
      case 'add_member':
        if (!has('email')) missing.push('email');
        if (!has('group') && !inChatRoom) missing.push('group');
        break;
      case 'call_group':
        if (!has('group') && !inChatRoom) missing.push('group');
        break;
      case 'record_voice':
        if (!has('group') && !inChatRoom) missing.push('group');
        break;
      case 'chat_with_person':
      case 'private_chat':
        if (!has('person')) missing.push('person');
        break;
      case 'create_group':
        if (!has('group')) missing.push('group');
        break;
      case 'query_groups':
        if (!has('person')) missing.push('person');
        break;
      case 'query_members':
        if (!has('group')) missing.push('group');
        break;
    }

    return missing;
  }

  /**
   * Try backend NLP classification with a 4-second timeout.
   * Returns null if backend is unavailable, slow, or low confidence.
   */
  private async tryBackendNLP(
    text: string,
    context: GossipContext,
  ): Promise<BackendIntentResult | null> {
    try {
      const groups = context.groups.map(g => ({
        name: g.name,
        members: g.members.map(m => ({ email: m.email })),
      }));

      const result = await Promise.race([
        api.classifyIntent(text, groups, context.currentScreen),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);

      if (!result) {
        console.log('[GossipBot] Backend NLP timed out');
        return null;
      }

      if (result.confidence < 0.6) {
        console.log(`[GossipBot] Backend NLP low confidence: ${result.intent} (${result.confidence})`);
        return null;
      }

      console.log(`[GossipBot] Backend NLP: ${result.intent} (${result.confidence}) via ${result.tier} in ${result.latency_ms}ms`);
      return result;
    } catch (err) {
      console.log('[GossipBot] Backend NLP unavailable:', err);
      return null;
    }
  }

  reset(): void {
    conversationState.reset();
    this.pendingAction = null;
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
      case 'record_voice': return `Recording voice message`;
      default: return `Executing command`;
    }
  }
}

export const gossipBot = new GossipBot();
