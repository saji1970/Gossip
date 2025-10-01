import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './AuthService';
import { encryptionService } from '../utils/encryption';
import { generateGroupCode, generateInviteCode } from '../utils/crypto';
import { Group, GroupMember, GroupSettings, ApprovalRequest, User } from '../types';

export class GroupService {
  private static instance: GroupService;
  private groups: Map<string, Group> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();

  static getInstance(): GroupService {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService();
    }
    return GroupService.instance;
  }

  async createGroup(groupData: {
    name: string;
    description?: string;
    codeType: 'sis' | 'bro';
    settings: Partial<GroupSettings>;
  }): Promise<Group> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate group code
      const code = generateGroupCode(groupData.codeType);
      
      // Generate group encryption key
      const groupEncryptionKey = await encryptionService.generateGroupKey();
      
      // Default group settings
      const settings: GroupSettings = {
        approvalRequired: true,
        minApprovals: 2,
        maxMembers: 50,
        allowInvites: true,
        messageRetention: 30,
        allowFileSharing: true,
        allowScreenshots: false,
        autoDeleteMessages: false,
        autoDeleteAfter: 24,
        ...groupData.settings,
      };

      // Create group
      const group: Group = {
        id: this.generateGroupId(),
        name: groupData.name,
        description: groupData.description,
        code,
        codeType: groupData.codeType,
        createdBy: currentUser.id,
        createdAt: new Date(),
        members: [
          {
            userId: currentUser.id,
            role: 'admin',
            joinedAt: new Date(),
            approvedBy: [],
            status: 'approved',
            lastActive: new Date(),
          }
        ],
        settings,
        encryptionKey: groupEncryptionKey,
        isActive: true,
      };

      // Store group
      this.groups.set(group.id, group);
      await this.saveGroupsToStorage();

      return group;
    } catch (error) {
      throw new Error(`Failed to create group: ${error}`);
    }
  }

  async joinGroupWithCode(code: string, message?: string): Promise<ApprovalRequest> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Find group by code
      const group = await this.findGroupByCode(code);
      if (!group) {
        throw new Error('Invalid group code');
      }

      // Check if user is already a member
      const existingMember = group.members.find(m => m.userId === currentUser.id);
      if (existingMember) {
        throw new Error('You are already a member of this group');
      }

      // Check if group is full
      if (group.members.length >= group.settings.maxMembers) {
        throw new Error('Group is full');
      }

      // Create approval request
      const approvalRequest: ApprovalRequest = {
        id: this.generateApprovalId(),
        groupId: group.id,
        requesterId: currentUser.id,
        requestedAt: new Date(),
        approvers: [],
        status: 'pending',
        message,
      };

      // Store approval request
      this.approvalRequests.set(approvalRequest.id, approvalRequest);
      await this.saveApprovalRequestsToStorage();

      return approvalRequest;
    } catch (error) {
      throw new Error(`Failed to join group: ${error}`);
    }
  }

  async approveMember(approvalRequestId: string, vote: 'approve' | 'reject', comment?: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const approvalRequest = this.approvalRequests.get(approvalRequestId);
      if (!approvalRequest) {
        throw new Error('Approval request not found');
      }

      const group = this.groups.get(approvalRequest.groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if current user can approve (must be admin or moderator)
      const currentMember = group.members.find(m => m.userId === currentUser.id);
      if (!currentMember || !['admin', 'moderator'].includes(currentMember.role)) {
        throw new Error('You do not have permission to approve members');
      }

      // Check if user already voted
      const existingVote = approvalRequest.approvers.find(a => a.userId === currentUser.id);
      if (existingVote) {
        throw new Error('You have already voted on this request');
      }

      // Add vote
      approvalRequest.approvers.push({
        userId: currentUser.id,
        vote,
        timestamp: new Date(),
        comment,
      });

      // Check if approval threshold is met
      const approveVotes = approvalRequest.approvers.filter(a => a.vote === 'approve').length;
      const rejectVotes = approvalRequest.approvers.filter(a => a.vote === 'reject').length;
      
      if (approveVotes >= group.settings.minApprovals) {
        // Approve the request
        await this.addMemberToGroup(group.id, approvalRequest.requesterId);
        approvalRequest.status = 'approved';
        approvalRequest.completedAt = new Date();
      } else if (rejectVotes > 0) {
        // Reject if any reject votes and not enough approvals
        approvalRequest.status = 'rejected';
        approvalRequest.completedAt = new Date();
      }

      // Save changes
      this.approvalRequests.set(approvalRequestId, approvalRequest);
      await this.saveApprovalRequestsToStorage();
      await this.saveGroupsToStorage();
    } catch (error) {
      throw new Error(`Failed to approve member: ${error}`);
    }
  }

  async addMemberToGroup(groupId: string, userId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const newMember: GroupMember = {
      userId,
      role: 'member',
      joinedAt: new Date(),
      approvedBy: [], // Will be populated by approval system
      status: 'approved',
      lastActive: new Date(),
    };

    group.members.push(newMember);
    this.groups.set(groupId, group);
  }

  async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    group.members = group.members.filter(m => m.userId !== userId);
    this.groups.set(groupId, group);
    await this.saveGroupsToStorage();
  }

  async getGroupById(groupId: string): Promise<Group | null> {
    return this.groups.get(groupId) || null;
  }

  async getUserGroups(): Promise<Group[]> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        return [];
      }

      const userGroups = Array.from(this.groups.values()).filter(group =>
        group.members.some(member => member.userId === currentUser.id && member.status === 'approved')
      );

      return userGroups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  async getPendingApprovalRequests(): Promise<ApprovalRequest[]> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        return [];
      }

      const userGroups = await this.getUserGroups();
      const adminGroupIds = userGroups
        .filter(group => {
          const member = group.members.find(m => m.userId === currentUser.id);
          return member && ['admin', 'moderator'].includes(member.role);
        })
        .map(group => group.id);

      const pendingRequests = Array.from(this.approvalRequests.values()).filter(request =>
        adminGroupIds.includes(request.groupId) && request.status === 'pending'
      );

      return pendingRequests;
    } catch (error) {
      console.error('Error getting pending approval requests:', error);
      return [];
    }
  }

  async updateGroupSettings(groupId: string, settings: Partial<GroupSettings>): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const member = group.members.find(m => m.userId === currentUser.id);
    if (!member || member.role !== 'admin') {
      throw new Error('Only group admins can update settings');
    }

    group.settings = { ...group.settings, ...settings };
    this.groups.set(groupId, group);
    await this.saveGroupsToStorage();
  }

  async deleteGroup(groupId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const member = group.members.find(m => m.userId === currentUser.id);
    if (!member || member.role !== 'admin') {
      throw new Error('Only group admins can delete groups');
    }

    this.groups.delete(groupId);
    await this.saveGroupsToStorage();
  }

  private async findGroupByCode(code: string): Promise<Group | null> {
    const groups = Array.from(this.groups.values());
    return groups.find(group => group.code === code) || null;
  }

  private async saveGroupsToStorage(): Promise<void> {
    try {
      const groupsArray = Array.from(this.groups.entries());
      await AsyncStorage.setItem('groups', JSON.stringify(groupsArray));
    } catch (error) {
      console.error('Error saving groups to storage:', error);
    }
  }

  private async saveApprovalRequestsToStorage(): Promise<void> {
    try {
      const requestsArray = Array.from(this.approvalRequests.entries());
      await AsyncStorage.setItem('approval_requests', JSON.stringify(requestsArray));
    } catch (error) {
      console.error('Error saving approval requests to storage:', error);
    }
  }

  async loadGroupsFromStorage(): Promise<void> {
    try {
      const groupsData = await AsyncStorage.getItem('groups');
      if (groupsData) {
        const groupsArray = JSON.parse(groupsData);
        this.groups = new Map(groupsArray);
      }

      const requestsData = await AsyncStorage.getItem('approval_requests');
      if (requestsData) {
        const requestsArray = JSON.parse(requestsData);
        this.approvalRequests = new Map(requestsArray);
      }
    } catch (error) {
      console.error('Error loading groups from storage:', error);
    }
  }

  private generateGroupId(): string {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateApprovalId(): string {
    return 'approval_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const groupService = GroupService.getInstance();
