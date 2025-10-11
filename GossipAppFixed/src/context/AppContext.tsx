import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Group, GroupMember, MemberRole, MemberStatus } from '../utils/GroupStorage';

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

  // Load user and groups from storage on app start
  useEffect(() => {
    loadUserData();
  }, []);

  // Save groups to storage whenever they change
  useEffect(() => {
    if (initialized) {
      saveGroupsToStorage();
    }
  }, [groups]);

  const loadUserData = async () => {
    try {
      console.log('🔍 DEBUG: Starting loadUserData...');
      
      // Load current user from Firestore
      console.log('🔥 DEBUG: Connecting to Firestore...');
      const currentUserDoc = await firestore().collection('app_storage').doc('current_user').get();
      console.log('📄 DEBUG: Firestore connection successful');
      
      if (currentUserDoc.exists) {
        console.log('👤 DEBUG: User document found');
        const parsedUser = currentUserDoc.data() as User;
        setUser(parsedUser);
        
        // Load groups for this user
        console.log('👥 DEBUG: Loading groups for user:', parsedUser.uid);
        const groupsSnapshot = await firestore()
          .collection('app_storage')
          .doc('groups')
          .collection(parsedUser.uid)
          .get();
        
        const parsedGroups: Group[] = [];
        groupsSnapshot.forEach(doc => {
          parsedGroups.push(doc.data() as Group);
        });
        console.log('📊 DEBUG: Loaded', parsedGroups.length, 'groups');
        setGroups(parsedGroups);
      } else {
        console.log('ℹ️ DEBUG: No user document found (first time user)');
      }
      
      console.log('✅ DEBUG: App initialization complete');
      setInitialized(true);
    } catch (error) {
      console.error('❌ DEBUG: Error loading user data:', error);
      console.error('❌ DEBUG: Error details:', JSON.stringify(error, null, 2));
      setInitialized(true);
    }
  };

  const saveGroupsToStorage = async () => {
    if (!user) return;
    try {
      // Save each group to Firestore
      const batch = firestore().batch();
      groups.forEach(group => {
        const docRef = firestore()
          .collection('app_storage')
          .doc('groups')
          .collection(user.uid)
          .doc(group.id);
        batch.set(docRef, group);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error saving groups to storage:', error);
    }
  };

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
      loadUserData,
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
