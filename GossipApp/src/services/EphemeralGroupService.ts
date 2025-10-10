import AsyncStorage from '@react-native-async-storage/async-storage';
import { anonymousAuthService } from './AnonymousAuthService';
import { Group } from '../types';

/**
 * Ephemeral Group Service for Secret Chat Groups
 * 
 * Core Principle: Groups behave like secret chat groups
 * - Groups accessed via private ID/link
 * - Not generally discoverable without Group ID
 * - All communication is anonymous (via anonId)
 * - Mandatory rule agreement before joining
 */
export class EphemeralGroupService {
  private static instance: EphemeralGroupService;
  private groups: Map<string, Group> = new Map();
  private userGroupAgreements: Map<string, Set<string>> = new Map(); // userId -> Set<groupId>

  static getInstance(): EphemeralGroupService {
    if (!EphemeralGroupService.instance) {
      EphemeralGroupService.instance = new EphemeralGroupService();
    }
    return EphemeralGroupService.instance;
  }

  /**
   * Create a new secret group
   */
  async createGroup(groupData: {
    groupName: string;
    rules: string; // Markdown/Text of group rules
  }): Promise<Group> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group: Group = {
        id: this.generateGroupId(),
        groupName: groupData.groupName,
        creatorId: currentUser.anonId,
        rules: groupData.rules,
        memberIds: [currentUser.anonId], // Creator is automatically a member
        createdAt: new Date(),
        isActive: true,
      };

      // Store group
      this.groups.set(group.id, group);
      await this.saveGroupsToStorage();

      // Creator automatically agrees to rules
      await this.recordRuleAgreement(currentUser.anonId, group.id);

      return group;
    } catch (error) {
      throw new Error(`Failed to create group: ${error}`);
    }
  }

  /**
   * Join group with mandatory rule agreement
   */
  async joinGroup(groupId: string, hasAgreedToRules: boolean): Promise<Group> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isActive) {
        throw new Error('Group is not active');
      }

      // Check if user already agreed to rules
      if (!hasAgreedToRules) {
        throw new Error('You must agree to the group rules to join');
      }

      // Check if user is already a member
      if (group.memberIds.includes(currentUser.anonId)) {
        throw new Error('You are already a member of this group');
      }

      // Add user to group
      group.memberIds.push(currentUser.anonId);
      this.groups.set(groupId, group);
      await this.saveGroupsToStorage();

      // Record rule agreement
      await this.recordRuleAgreement(currentUser.anonId, groupId);

      return group;
    } catch (error) {
      throw new Error(`Failed to join group: ${error}`);
    }
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId: string): Promise<void> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Remove user from group
      group.memberIds = group.memberIds.filter(id => id !== currentUser.anonId);
      this.groups.set(groupId, group);
      await this.saveGroupsToStorage();

      // Remove rule agreement
      await this.removeRuleAgreement(currentUser.anonId, groupId);

      // If no members left, deactivate group
      if (group.memberIds.length === 0) {
        group.isActive = false;
        this.groups.set(groupId, group);
        await this.saveGroupsToStorage();
      }
    } catch (error) {
      throw new Error(`Failed to leave group: ${error}`);
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId: string): Promise<Group | null> {
    return this.groups.get(groupId) || null;
  }

  /**
   * Get user's groups
   */
  async getUserGroups(): Promise<Group[]> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        return [];
      }

      const userGroups = Array.from(this.groups.values()).filter(group =>
        group.memberIds.includes(currentUser.anonId) && group.isActive
      );

      return userGroups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  /**
   * Update group rules (requires re-agreement from all members)
   */
  async updateGroupRules(groupId: string, newRules: string): Promise<void> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is the creator
      if (group.creatorId !== currentUser.anonId) {
        throw new Error('Only the group creator can update rules');
      }

      // Update rules
      group.rules = newRules;
      this.groups.set(groupId, group);
      await this.saveGroupsToStorage();

      // Clear all existing rule agreements (members will need to re-agree)
      await this.clearAllRuleAgreements(groupId);
    } catch (error) {
      throw new Error(`Failed to update group rules: ${error}`);
    }
  }

  /**
   * Check if user has agreed to group rules
   */
  async hasUserAgreedToRules(userId: string, groupId: string): Promise<boolean> {
    const userAgreements = this.userGroupAgreements.get(userId);
    return userAgreements ? userAgreements.has(groupId) : false;
  }

  /**
   * Get group rules for display
   */
  async getGroupRules(groupId: string): Promise<string> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    return group.rules;
  }

  /**
   * Delete group (creator only)
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is the creator
      if (group.creatorId !== currentUser.anonId) {
        throw new Error('Only the group creator can delete the group');
      }

      // Delete group
      this.groups.delete(groupId);
      await this.saveGroupsToStorage();

      // Clear all rule agreements for this group
      await this.clearAllRuleAgreements(groupId);
    } catch (error) {
      throw new Error(`Failed to delete group: ${error}`);
    }
  }

  /**
   * Record rule agreement
   */
  private async recordRuleAgreement(userId: string, groupId: string): Promise<void> {
    if (!this.userGroupAgreements.has(userId)) {
      this.userGroupAgreements.set(userId, new Set());
    }
    
    this.userGroupAgreements.get(userId)!.add(groupId);
    await this.saveRuleAgreementsToStorage();
  }

  /**
   * Remove rule agreement
   */
  private async removeRuleAgreement(userId: string, groupId: string): Promise<void> {
    const userAgreements = this.userGroupAgreements.get(userId);
    if (userAgreements) {
      userAgreements.delete(groupId);
      await this.saveRuleAgreementsToStorage();
    }
  }

  /**
   * Clear all rule agreements for a group
   */
  private async clearAllRuleAgreements(groupId: string): Promise<void> {
    for (const [userId, agreements] of this.userGroupAgreements.entries()) {
      agreements.delete(groupId);
    }
    await this.saveRuleAgreementsToStorage();
  }

  /**
   * Save groups to storage
   */
  private async saveGroupsToStorage(): Promise<void> {
    try {
      const groupsArray = Array.from(this.groups.entries());
      await AsyncStorage.setItem('ephemeral_groups', JSON.stringify(groupsArray));
    } catch (error) {
      console.error('Error saving groups to storage:', error);
    }
  }

  /**
   * Save rule agreements to storage
   */
  private async saveRuleAgreementsToStorage(): Promise<void> {
    try {
      const agreementsArray = Array.from(this.userGroupAgreements.entries()).map(([userId, groupIds]) => [
        userId,
        Array.from(groupIds)
      ]);
      await AsyncStorage.setItem('rule_agreements', JSON.stringify(agreementsArray));
    } catch (error) {
      console.error('Error saving rule agreements to storage:', error);
    }
  }

  /**
   * Load groups from storage
   */
  async loadGroupsFromStorage(): Promise<void> {
    try {
      const groupsData = await AsyncStorage.getItem('ephemeral_groups');
      if (groupsData) {
        const groupsArray = JSON.parse(groupsData);
        this.groups = new Map(groupsArray.map(([id, group]: [string, any]) => [
          id,
          {
            ...group,
            createdAt: new Date(group.createdAt),
          }
        ]));
      }

      const agreementsData = await AsyncStorage.getItem('rule_agreements');
      if (agreementsData) {
        const agreementsArray = JSON.parse(agreementsData);
        this.userGroupAgreements = new Map(agreementsArray.map(([userId, groupIds]: [string, string[]]) => [
          userId,
          new Set(groupIds)
        ]));
      }
    } catch (error) {
      console.error('Error loading groups from storage:', error);
    }
  }

  /**
   * Generate group ID
   */
  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ephemeralGroupService = EphemeralGroupService.getInstance();

