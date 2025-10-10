/**
 * Group Service
 * Handles group creation, joining, and management
 * Updated for React Native Firebase
 */

import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../config/firebase';
import { Group, GroupType, AnonId, JoinRequest } from '../types/models';
import AuthService from './AuthService';
import LocalStorageService from './LocalStorageService';

class GroupService {
  /**
   * Create a new group
   */
  async createGroup(
    groupName: string,
    type: GroupType,
    rules: string,
    termsAndConditions: string,
    options?: { avatar?: string; moderators?: AnonId[] }
  ): Promise<Group> {
    const creatorAnonId = AuthService.getCurrentAnonId();

    if (!creatorAnonId) {
      throw new Error('Not authenticated');
    }

    // Generate group ID
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create group
    const group: Group = {
      groupId,
      groupName,
      type,
      creatorAnonId,
      rules,
      termsAndConditions,
      memberAnonIds: [creatorAnonId],
      moderators: options?.moderators || [creatorAnonId],
      avatar: options?.avatar || '👥',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Save to Firestore
    await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(groupId)
      .set(group);

    // Save to local joined groups
    await LocalStorageService.addJoinedGroup(groupId);

    return group;
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: string): Promise<Group | null> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(groupId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as Group;
  }

  /**
   * Get public groups
   */
  async getPublicGroups(limitCount: number = 50): Promise<Group[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.GROUPS)
      .where('type', '==', 'public')
      .orderBy('lastActivity', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => doc.data() as Group);
  }

  /**
   * Get user's joined groups
   */
  async getJoinedGroups(): Promise<Group[]> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      return [];
    }

    const snapshot = await firestore()
      .collection(COLLECTIONS.GROUPS)
      .where('memberAnonIds', 'array-contains', currentAnonId)
      .orderBy('lastActivity', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as Group);
  }

  /**
   * Join a public group
   */
  async joinGroup(groupId: string): Promise<void> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Get group
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type !== 'public') {
      throw new Error('Cannot join private group without approval');
    }

    // Check if already a member
    if (group.memberAnonIds.includes(currentAnonId)) {
      return;
    }

    // Add member
    await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(groupId)
      .update({
        memberAnonIds: firestore.FieldValue.arrayUnion(currentAnonId),
        lastActivity: Date.now(),
      });

    // Save to local joined groups
    await LocalStorageService.addJoinedGroup(groupId);
  }

  /**
   * Request to join a private group
   */
  async requestJoinPrivateGroup(groupId: string): Promise<JoinRequest> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Create join request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const joinRequest: JoinRequest = {
      requestId,
      groupId,
      requesterAnonId: currentAnonId,
      status: 'pending',
      requestedAt: Date.now(),
    };

    // Save to Firestore
    await firestore()
      .collection(COLLECTIONS.JOIN_REQUESTS)
      .doc(requestId)
      .set(joinRequest);

    return joinRequest;
  }

  /**
   * Approve join request (moderator/creator only)
   */
  async approveJoinRequest(requestId: string): Promise<void> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Get request
    const requestSnap = await firestore()
      .collection(COLLECTIONS.JOIN_REQUESTS)
      .doc(requestId)
      .get();

    if (!requestSnap.exists) {
      throw new Error('Request not found');
    }

    const request = requestSnap.data() as JoinRequest;

    // Get group and check permissions
    const group = await this.getGroup(request.groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!this.canModerate(group, currentAnonId)) {
      throw new Error('Not authorized to approve requests');
    }

    // Add member to group
    await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(request.groupId)
      .update({
        memberAnonIds: firestore.FieldValue.arrayUnion(request.requesterAnonId),
        lastActivity: Date.now(),
      });

    // Update request status
    await firestore()
      .collection(COLLECTIONS.JOIN_REQUESTS)
      .doc(requestId)
      .update({
        status: 'approved',
        reviewedBy: currentAnonId,
        reviewedAt: Date.now(),
      });
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<void> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Remove from group
    await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(groupId)
      .update({
        memberAnonIds: firestore.FieldValue.arrayRemove(currentAnonId),
        moderators: firestore.FieldValue.arrayRemove(currentAnonId),
        lastActivity: Date.now(),
      });

    // Remove from local joined groups
    await LocalStorageService.removeJoinedGroup(groupId);

    // Delete local chat history for this group
    await LocalStorageService.deleteChatHistory(groupId);
  }

  /**
   * Add moderator (creator only)
   */
  async addModerator(groupId: string, anonId: AnonId): Promise<void> {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Get group and check if current user is creator
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.creatorAnonId !== currentAnonId) {
      throw new Error('Only creator can add moderators');
    }

    // Add moderator
    await firestore()
      .collection(COLLECTIONS.GROUPS)
      .doc(groupId)
      .update({
        moderators: firestore.FieldValue.arrayUnion(anonId),
      });
  }

  /**
   * Check if user can moderate group
   */
  canModerate(group: Group, anonId: AnonId): boolean {
    return group.creatorAnonId === anonId || group.moderators.includes(anonId);
  }

  /**
   * Check if user is creator
   */
  isCreator(group: Group, anonId: AnonId): boolean {
    return group.creatorAnonId === anonId;
  }

  /**
   * Check if user is member
   */
  isMember(group: Group, anonId: AnonId): boolean {
    return group.memberAnonIds.includes(anonId);
  }
}

export default new GroupService();
