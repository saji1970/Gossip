import { Group, User } from '../types';
import { authService } from './AuthService';
import { groupService } from './GroupService';

export interface CallParticipant {
  userId: string;
  username: string;
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  avatar?: string;
}

export interface GroupCall {
  id: string;
  groupId: string;
  groupName: string;
  callType: 'voice' | 'video';
  status: 'initiating' | 'ringing' | 'active' | 'ended';
  participants: CallParticipant[];
  startedAt: Date;
  endedAt?: Date;
  initiatorId: string;
}

export class CallService {
  private static instance: CallService;
  private currentCall: GroupCall | null = null;
  private participants: Map<string, CallParticipant> = new Map();

  static getInstance(): CallService {
    if (!CallService.instance) {
      CallService.instance = new CallService();
    }
    return CallService.instance;
  }

  async startGroupCall(groupId: string, callType: 'voice' | 'video'): Promise<GroupCall> {
    try {
      const currentUser = await authService.getCurrentUser();
      const group = await groupService.getGroupById(groupId);
      
      if (!currentUser || !group) {
        throw new Error('User or group not found');
      }

      // Check if user is a member of the group
      const member = group.members.find(m => m.userId === currentUser.id && m.status === 'approved');
      if (!member) {
        throw new Error('You are not a member of this group');
      }

      // Create call object
      const call: GroupCall = {
        id: this.generateCallId(),
        groupId,
        groupName: group.name,
        callType,
        status: 'initiating',
        participants: [],
        startedAt: new Date(),
        initiatorId: currentUser.id,
      };

      // Add initiator as first participant
      const initiatorParticipant: CallParticipant = {
        userId: currentUser.id,
        username: currentUser.username,
        isConnected: true,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        avatar: currentUser.avatar,
      };

      call.participants.push(initiatorParticipant);
      this.participants.set(currentUser.id, initiatorParticipant);
      this.currentCall = call;

      // In a real implementation, this would:
      // 1. Send push notifications to other group members
      // 2. Initialize WebRTC connections
      // 3. Set up audio/video streams
      // 4. Handle call state management

      return call;
    } catch (error) {
      throw new Error(`Failed to start group call: ${error}`);
    }
  }

  async joinCall(callId: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !this.currentCall || this.currentCall.id !== callId) {
        throw new Error('Call not found or user not authenticated');
      }

      // Add user as participant
      const participant: CallParticipant = {
        userId: currentUser.id,
        username: currentUser.username,
        isConnected: true,
        isMuted: false,
        isVideoEnabled: this.currentCall.callType === 'video',
        avatar: currentUser.avatar,
      };

      this.currentCall.participants.push(participant);
      this.participants.set(currentUser.id, participant);

      // Update call status
      if (this.currentCall.status === 'ringing') {
        this.currentCall.status = 'active';
      }
    } catch (error) {
      throw new Error(`Failed to join call: ${error}`);
    }
  }

  async leaveCall(): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !this.currentCall) return;

      // Remove participant
      const participantIndex = this.currentCall.participants.findIndex(p => p.userId === currentUser.id);
      if (participantIndex !== -1) {
        this.currentCall.participants.splice(participantIndex, 1);
      }

      this.participants.delete(currentUser.id);

      // If no participants left, end the call
      if (this.currentCall.participants.length === 0) {
        await this.endCall();
      }
    } catch (error) {
      throw new Error(`Failed to leave call: ${error}`);
    }
  }

  async endCall(): Promise<void> {
    try {
      if (!this.currentCall) return;

      this.currentCall.status = 'ended';
      this.currentCall.endedAt = new Date();

      // Clear call data
      this.currentCall = null;
      this.participants.clear();

      // In a real implementation, this would:
      // 1. Disconnect all WebRTC connections
      // 2. Stop all audio/video streams
      // 3. Send call end notifications
    } catch (error) {
      throw new Error(`Failed to end call: ${error}`);
    }
  }

  async toggleMute(): Promise<boolean> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !this.currentCall) return false;

      const participant = this.participants.get(currentUser.id);
      if (!participant) return false;

      participant.isMuted = !participant.isMuted;
      return participant.isMuted;
    } catch (error) {
      throw new Error(`Failed to toggle mute: ${error}`);
    }
  }

  async toggleVideo(): Promise<boolean> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !this.currentCall) return false;

      if (this.currentCall.callType !== 'video') return false;

      const participant = this.participants.get(currentUser.id);
      if (!participant) return false;

      participant.isVideoEnabled = !participant.isVideoEnabled;
      return participant.isVideoEnabled;
    } catch (error) {
      throw new Error(`Failed to toggle video: ${error}`);
    }
  }

  getCurrentCall(): GroupCall | null {
    return this.currentCall;
  }

  getParticipant(userId: string): CallParticipant | null {
    return this.participants.get(userId) || null;
  }

  async inviteToCall(userId: string): Promise<void> {
    try {
      // In a real implementation, this would send a push notification
      // to invite the user to join the current call
      console.log(`Inviting user ${userId} to call`);
    } catch (error) {
      throw new Error(`Failed to invite user: ${error}`);
    }
  }

  private generateCallId(): string {
    return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const callService = CallService.getInstance();
