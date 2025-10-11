type MemberRole = 'admin' | 'approver' | 'member';
type MemberStatus = 'pending' | 'approved' | 'rejected';
type GroupPrivacy = 'public' | 'private';

interface GroupMember {
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  approvedBy?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  termsAndConditions?: string;
  requireApproval: boolean;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
}

class GroupStorage {
  private groups: Group[] = [];

  addGroup(group: Omit<Group, 'id' | 'lastMessage' | 'timestamp' | 'unreadCount' | 'createdAt'>): Group {
    const newGroup: Group = {
      ...group,
      id: Date.now().toString(),
      lastMessage: 'Group created',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.groups.push(newGroup);
    return newGroup;
  }

  getGroups(): Group[] {
    return this.groups;
  }

  getGroupById(id: string): Group | undefined {
    return this.groups.find(g => g.id === id);
  }

  updateGroup(id: string, updates: Partial<Group>): void {
    const index = this.groups.findIndex(g => g.id === id);
    if (index !== -1) {
      this.groups[index] = { ...this.groups[index], ...updates };
    }
  }

  addMemberToGroup(groupId: string, memberEmail: string, status: MemberStatus = 'pending'): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group && !group.members.find(m => m.email === memberEmail)) {
      const newMember: GroupMember = {
        email: memberEmail,
        role: 'member',
        status: status,
        joinedAt: new Date().toISOString(),
      };
      group.members.push(newMember);
    }
  }

  updateMemberRole(groupId: string, memberEmail: string, role: MemberRole): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      const member = group.members.find(m => m.email === memberEmail);
      if (member) {
        member.role = role;
      }
    }
  }

  approveMember(groupId: string, memberEmail: string, approverEmail: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      const member = group.members.find(m => m.email === memberEmail);
      if (member) {
        member.status = 'approved';
        member.approvedBy = approverEmail;
      }
    }
  }

  rejectMember(groupId: string, memberEmail: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      const member = group.members.find(m => m.email === memberEmail);
      if (member) {
        member.status = 'rejected';
      }
    }
  }

  removeMemberFromGroup(groupId: string, memberEmail: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      group.members = group.members.filter(m => m.email !== memberEmail);
    }
  }

  deleteGroup(id: string): void {
    this.groups = this.groups.filter(g => g.id !== id);
  }

  getPendingApprovals(groupId: string): GroupMember[] {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return [];
    return group.members.filter(m => m.status === 'pending');
  }

  isAdmin(groupId: string, memberEmail: string): boolean {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;
    const member = group.members.find(m => m.email === memberEmail);
    return member?.role === 'admin';
  }

  isApprover(groupId: string, memberEmail: string): boolean {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;
    const member = group.members.find(m => m.email === memberEmail);
    return member?.role === 'admin' || member?.role === 'approver';
  }
}

export const groupStorage = new GroupStorage();
export type { Group, GroupMember, MemberRole, MemberStatus, GroupPrivacy };
