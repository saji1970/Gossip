/**
 * DM Channel ID Generation
 * Creates consistent channel IDs for 1:1 conversations
 */

import { AnonId, DMChannelId } from '../types';

/**
 * Generate a DM channel ID from two user anonIds
 * Always returns the same ID regardless of parameter order
 */
export const createDMChannelId = (anonIdA: AnonId, anonIdB: AnonId): DMChannelId => {
  const sorted = [anonIdA, anonIdB].sort();
  return `${sorted[0]}__${sorted[1]}`;
};

/**
 * Extract the two anonIds from a DM channel ID
 */
export const parseDMChannelId = (channelId: DMChannelId): [AnonId, AnonId] => {
  const parts = channelId.split('__');
  if (parts.length !== 2) {
    throw new Error('Invalid DM channel ID format');
  }
  return [parts[0], parts[1]];
};
