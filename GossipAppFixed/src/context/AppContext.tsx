import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Group, GroupMember, MemberRole, MemberStatus } from '../utils/GroupStorage';
import * as api from '../services/api';

interface User {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  deleteGroup: (groupId: string) => Promise<void>;
  getGroupById: (groupId: string) => Group | undefined;
  refreshGroups: () => void;
  updateMemberRole: (groupId: string, memberEmail: string, role: MemberRole) => void;
  approveMember: (groupId: string, memberEmail: string, approverEmail: string) => void;
  rejectMember: (groupId: string, memberEmail: string) => void;
  getPendingApprovals: (groupId: string) => GroupMember[];
  loadUserData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('Loading user data from backend...');

      // Check if we have a stored token and get current user
      const token = await api.getToken();
      if (!token) {
        console.log('No auth token found');
        setInitialized(true);
        return;
      }

      const result = await api.getMe();
      if (result.success && result.user) {
        console.log('User authenticated:', result.user.uid);
        setUser(result.user as User);

        // Load user's groups
        const loadedGroups = await api.getGroups();
        console.log('Loaded', loadedGroups.length, 'groups');
        setGroups(loadedGroups as Group[]);
      } else {
        console.log('Token invalid, clearing');
        await api.clearToken();
      }

      setInitialized(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      setInitialized(true);
    }
  };

  const addGroup = async (group: Group) => {
    // Optimistic update
    setGroups(prev => [group, ...prev]);

    // Persist to backend
    try {
      const created = await api.createGroup({
        name: group.name,
        description: group.description,
        privacy: group.privacy,
        termsAndConditions: group.termsAndConditions,
        requireApproval: group.requireApproval,
        members: group.members?.map(m => ({
          email: m.email,
          role: m.role,
          status: m.status,
        })) || [],
      });
      // Replace optimistic group with server response
      setGroups(prev =>
        prev.map(g => g.id === group.id ? (created as Group) : g)
      );
    } catch (error) {
      console.error('Error creating group on backend:', error);
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    // Optimistic update
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId ? { ...group, ...updates } : group
      )
    );

    // Persist to backend
    try {
      await api.updateGroup(groupId, updates);
    } catch (error) {
      console.error('Error updating group on backend:', error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    try {
      await api.deleteGroup(groupId);
    } catch (error) {
      console.error('Error deleting group on backend:', error);
    }
  };

  const getGroupById = (groupId: string): Group | undefined => {
    return groups.find(g => g.id === groupId);
  };

  const refreshGroups = async () => {
    try {
      const loadedGroups = await api.getGroups();
      setGroups(loadedGroups as Group[]);
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  };

  const updateMemberRole = async (groupId: string, memberEmail: string, role: MemberRole) => {
    setGroups(prev =>
      prev.map(group => {
        if (group.id === groupId) {
          const updatedMembers = group.members.map(m =>
            m.email === memberEmail ? { ...m, role } : m
          );
          return { ...group, members: updatedMembers };
        }
        return group;
      })
    );

    try {
      await api.updateMemberRole(groupId, memberEmail, role);
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const approveMember = async (groupId: string, memberEmail: string, approverEmail: string) => {
    setGroups(prev =>
      prev.map(group => {
        if (group.id === groupId) {
          const updatedMembers = group.members.map(m =>
            m.email === memberEmail
              ? { ...m, status: 'approved' as MemberStatus, approvedBy: approverEmail }
              : m
          );
          return { ...group, members: updatedMembers };
        }
        return group;
      })
    );

    try {
      await api.approveMember(groupId, memberEmail, approverEmail);
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const rejectMember = async (groupId: string, memberEmail: string) => {
    setGroups(prev =>
      prev.map(group => {
        if (group.id === groupId) {
          const updatedMembers = group.members.filter(m => m.email !== memberEmail);
          return { ...group, members: updatedMembers };
        }
        return group;
      })
    );

    try {
      await api.rejectMember(groupId, memberEmail);
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const getPendingApprovals = (groupId: string): GroupMember[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    return group.members.filter(m => m.status === 'pending');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        groups,
        addGroup,
        updateGroup,
        deleteGroup,
        getGroupById,
        refreshGroups,
        updateMemberRole,
        approveMember,
        rejectMember,
        getPendingApprovals,
        loadUserData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
