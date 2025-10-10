import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Group, GroupMember, MemberRole, MemberStatus } from '../utils/GroupStorage';

interface User {
  uid: string;
  email: string;
  displayName: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  getGroupById: (groupId: string) => Group | undefined;
  refreshGroups: () => void;
  updateMemberRole: (groupId: string, memberEmail: string, role: MemberRole) => void;
  approveMember: (groupId: string, memberEmail: string, approverEmail: string) => void;
  rejectMember: (groupId: string, memberEmail: string) => void;
  getPendingApprovals: (groupId: string) => GroupMember[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  const addGroup = (group: Group) => {
    setGroups(prev => [...prev, group]);
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, ...updates } : g
    ));
  };

  const getGroupById = (groupId: string): Group | undefined => {
    return groups.find(g => g.id === groupId);
  };

  const refreshGroups = () => {
    setGroups([...groups]);
  };

  const updateMemberRole = (groupId: string, memberEmail: string, role: MemberRole) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => 
            m.email === memberEmail ? { ...m, role } : m
          )
        };
      }
      return g;
    }));
  };

  const approveMember = (groupId: string, memberEmail: string, approverEmail: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => 
            m.email === memberEmail ? { ...m, status: 'approved' as MemberStatus, approvedBy: approverEmail } : m
          )
        };
      }
      return g;
    }));
  };

  const rejectMember = (groupId: string, memberEmail: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => 
            m.email === memberEmail ? { ...m, status: 'rejected' as MemberStatus } : m
          )
        };
      }
      return g;
    }));
  };

  const getPendingApprovals = (groupId: string): GroupMember[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    return group.members.filter(m => m.status === 'pending');
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      groups,
      addGroup,
      updateGroup,
      getGroupById,
      refreshGroups,
      updateMemberRole,
      approveMember,
      rejectMember,
      getPendingApprovals,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
