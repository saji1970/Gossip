/**
 * Invite Service
 * Handles sending and processing group invites by phone number
 */

import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../config/firebase';
import { AnonId } from '../types/models';
import AuthService from './AuthService';
import GroupService from './GroupService';
import MessageService from './MessageService';

export interface GroupInvite {
  inviteId: string;
  groupId: string;
  groupName: string;
  inviterAnonId: AnonId;
  inviterDisplayName?: string;
  phoneNumber: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: number;
  expiresAt: number;
}

class InviteService {
  /**
   * Send invite to join a group by phone number
   */
  async sendGroupInvite(
    groupId: string,
    phoneNumber: string
  ): Promise<GroupInvite> {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Get group details
    const group = await GroupService.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if current user is a member
    if (!GroupService.isMember(group, currentUser.anonId)) {
      throw new Error('You must be a member to invite others');
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Generate invite ID
    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create invite
    const invite: GroupInvite = {
      inviteId,
      groupId,
      groupName: group.groupName,
      inviterAnonId: currentUser.anonId,
      inviterDisplayName: currentUser.displayName,
      phoneNumber: normalizedPhone,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Save to Firestore
    await firestore()
      .collection(COLLECTIONS.INVITES || 'invites')
      .doc(inviteId)
      .set(invite);

    return invite;
  }

  /**
   * Get pending invites for current user by phone number
   */
  async getPendingInvites(): Promise<GroupInvite[]> {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser || !currentUser.phoneNumber) {
      return [];
    }

    const normalizedPhone = this.normalizePhoneNumber(currentUser.phoneNumber);
    const now = Date.now();

    const snapshot = await firestore()
      .collection(COLLECTIONS.INVITES || 'invites')
      .where('phoneNumber', '==', normalizedPhone)
      .where('status', '==', 'pending')
      .where('expiresAt', '>', now)
      .get();

    return snapshot.docs.map((doc) => doc.data() as GroupInvite);
  }

  /**
   * Accept a group invite
   */
  async acceptInvite(inviteId: string): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Get invite
    const inviteSnap = await firestore()
      .collection(COLLECTIONS.INVITES || 'invites')
      .doc(inviteId)
      .get();

    if (!inviteSnap.exists) {
      throw new Error('Invite not found');
    }

    const invite = inviteSnap.data() as GroupInvite;

    // Check if invite is valid
    if (invite.status !== 'pending') {
      throw new Error('Invite already processed');
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error('Invite has expired');
    }

    // Verify phone number matches
    if (currentUser.phoneNumber) {
      const normalizedPhone = this.normalizePhoneNumber(currentUser.phoneNumber);
      if (invite.phoneNumber !== normalizedPhone) {
        throw new Error('Invite phone number does not match your account');
      }
    }

    // Join the group
    await GroupService.joinGroup(invite.groupId);

    // Update invite status
    await firestore()
      .collection(COLLECTIONS.INVITES || 'invites')
      .doc(inviteId)
      .update({
        status: 'accepted',
      });

    // Send welcome message to group
    const group = await GroupService.getGroup(invite.groupId);
    if (group) {
      const welcomeMessage = `${currentUser.displayName || 'New member'} has joined the group!`;
      await MessageService.sendGroupMessage(invite.groupId, {
        messageType: 'text',
        content: welcomeMessage,
      });
    }
  }

  /**
   * Process pending invites on login
   * Automatically join groups if user has pending invites
   */
  async processPendingInvites(): Promise<void> {
    const pendingInvites = await this.getPendingInvites();

    for (const invite of pendingInvites) {
      try {
        await this.acceptInvite(invite.inviteId);
      } catch (error) {
        console.error('Failed to process invite:', error);
      }
    }
  }

  /**
   * Generate invite link for sharing
   */
  generateInviteLink(inviteId: string): string {
    // This should be your app's deep link scheme
    return `gossipin://invite/${inviteId}`;
  }

  /**
   * Normalize phone number for consistent storage
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    return phoneNumber.replace(/\D/g, '');
  }
}

export default new InviteService();

