/**
 * Group Service
 * Manages groups with minimal metadata (no PII, no message history)
 */

import firestore from '@react-native-firebase/firestore';
import { Group, JoinRequest, GroupType, AnonId } from '../../types';
import { APP_ID, COLLECTIONS } from '../../config/firebase';

const db = firestore();

/**
 * Create a new group
 */
export const createGroup = async (
  creatorAnonId: AnonId,
  groupName: string,
  type: GroupType,
  rules: string,
  termsAndConditions: string
): Promise<string> => {
  const groupId = db.collection(COLLECTIONS.GROUPS).doc().id;

  const group: Group = {
    groupId,
    groupName,
    type,
    creatorAnonId,
    rules,
    termsAndConditions,
    memberAnonIds: [creatorAnonId], // Creator is first member
    moderators: [creatorAnonId], // Creator is first moderator
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  await db.collection(COLLECTIONS.GROUPS).doc(groupId).set(group);
  return groupId;
};

/**
 * Get a group by ID
 */
export const getGroup = async (groupId: string): Promise<Group | null> => {
  const doc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
  return doc.exists ? (doc.data() as Group) : null;
};

/**
 * Get all public groups (for discovery)
 */
export const getPublicGroups = async (): Promise<Group[]> => {
  const snapshot = await db
    .collection(COLLECTIONS.GROUPS)
    .where('type', '==', 'public')
    .orderBy('lastActivity', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => doc.data() as Group);
};

/**
 * Get groups where user is a member
 */
export const getUserGroups = async (anonId: AnonId): Promise<Group[]> => {
  const snapshot = await db
    .collection(COLLECTIONS.GROUPS)
    .where('memberAnonIds', 'array-contains', anonId)
    .orderBy('lastActivity', 'desc')
    .get();

  return snapshot.docs.map(doc => doc.data() as Group);
};

/**
 * Join a public group
 */
export const joinPublicGroup = async (groupId: string, anonId: AnonId): Promise<void> => {
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);
  await groupRef.update({
    memberAnonIds: firestore.FieldValue.arrayUnion(anonId),
    lastActivity: Date.now(),
  });
};

/**
 * Request to join a private group
 */
export const requestToJoinGroup = async (groupId: string, requesterAnonId: AnonId): Promise<string> => {
  const requestId = db.collection(COLLECTIONS.JOIN_REQUESTS).doc().id;

  const request: JoinRequest = {
    requestId,
    groupId,
    requesterAnonId,
    timestamp: Date.now(),
    status: 'pending',
  };

  await db.collection(COLLECTIONS.JOIN_REQUESTS).doc(requestId).set(request);
  return requestId;
};

/**
 * Approve a join request (moderator only)
 */
export const approveJoinRequest = async (
  requestId: string,
  groupId: string,
  requesterAnonId: AnonId
): Promise<void> => {
  // Update request status
  await db.collection(COLLECTIONS.JOIN_REQUESTS).doc(requestId).update({
    status: 'approved',
  });

  // Add user to group
  await db.collection(COLLECTIONS.GROUPS).doc(groupId).update({
    memberAnonIds: firestore.FieldValue.arrayUnion(requesterAnonId),
    lastActivity: Date.now(),
  });
};

/**
 * Leave a group
 */
export const leaveGroup = async (groupId: string, anonId: AnonId): Promise<void> => {
  await db.collection(COLLECTIONS.GROUPS).doc(groupId).update({
    memberAnonIds: firestore.FieldValue.arrayRemove(anonId),
    lastActivity: Date.now(),
  });
};

/**
 * Add a moderator (creator only)
 */
export const addModerator = async (groupId: string, anonId: AnonId): Promise<void> => {
  await db.collection(COLLECTIONS.GROUPS).doc(groupId).update({
    moderators: firestore.FieldValue.arrayUnion(anonId),
  });
};

/**
 * Check if user is a member of a group
 */
export const isGroupMember = (group: Group, anonId: AnonId): boolean => {
  return group.memberAnonIds.includes(anonId);
};

/**
 * Check if user is a moderator
 */
export const isModerator = (group: Group, anonId: AnonId): boolean => {
  return group.moderators.includes(anonId);
};

/**
 * Check if user is the creator
 */
export const isCreator = (group: Group, anonId: AnonId): boolean => {
  return group.creatorAnonId === anonId;
};

/**
 * Update last activity for a group
 */
export const updateGroupActivity = async (groupId: string): Promise<void> => {
  await db.collection(COLLECTIONS.GROUPS).doc(groupId).update({
    lastActivity: Date.now(),
  });
};

