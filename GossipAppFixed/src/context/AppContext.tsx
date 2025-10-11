import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, TABLES } from '../config/supabase';
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
    if (initialized && user) {
      saveGroupsToStorage();
    }
  }, [groups, initialized, user]);

  const loadUserData = async () => {
    try {
      console.log('🔍 DEBUG: Starting loadUserData...');
      
      // Get current authenticated user from Supabase
      console.log('🔥 DEBUG: Connecting to Supabase...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('📄 DEBUG: Supabase connection successful');

      if (authUser) {
        console.log('👤 DEBUG: User authenticated:', authUser.id);

        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from(TABLES.USERS)
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('❌ Error loading profile:', profileError);
          setInitialized(true);
          return;
        }

        if (profile) {
          const userData: User = {
            uid: authUser.id,
            email: profile.email,
            displayName: profile.display_name,
            username: profile.username,
          };
          setUser(userData);

          // Load user's groups
          console.log('👥 DEBUG: Loading groups for user:', userData.uid);
          const { data: groupsData, error: groupsError } = await supabase
            .from(TABLES.GROUPS)
            .select('*')
            .eq('user_id', userData.uid)
            .order('created_at', { ascending: false });

          if (groupsError) {
            console.error('❌ Error loading groups:', groupsError);
          } else {
            // Convert from database format to app format
            const loadedGroups: Group[] = (groupsData || []).map((g: any) => ({
              id: g.id,
              name: g.name,
              description: g.description,
              privacy: g.privacy,
              termsAndConditions: g.terms_and_conditions,
              requireApproval: g.require_approval,
              lastMessage: g.last_message || '',
              timestamp: g.updated_at || g.created_at,
              unreadCount: 0,
              members: g.members || [],
              createdBy: g.created_by,
              createdAt: g.created_at,
            }));
            console.log('📊 DEBUG: Loaded', loadedGroups.length, 'groups');
            setGroups(loadedGroups);
          }
        }
      } else {
        console.log('ℹ️ DEBUG: No authenticated user');
      }

      console.log('✅ DEBUG: App initialization complete');
      setInitialized(true);
    } catch (error) {
      console.error('❌ DEBUG: Error loading user data:', error);
      setInitialized(true);
    }
  };

  const saveGroupsToStorage = async () => {
    if (!user) return;
    
    try {
      // Save or update groups in Supabase
      for (const group of groups) {
        const dbGroup = {
          id: group.id,
          user_id: user.uid,
          name: group.name,
          description: group.description,
          privacy: group.privacy,
          terms_and_conditions: group.termsAndConditions,
          require_approval: group.requireApproval,
          last_message: group.lastMessage,
          members: group.members,
          created_by: group.createdBy,
          created_at: group.createdAt,
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from(TABLES.GROUPS)
          .upsert(dbGroup, { onConflict: 'id' });
      }
    } catch (error) {
      console.error('Error saving groups:', error);
    }
  };

  const addGroup = (group: Group) => {
    setGroups(prev => [group, ...prev]);
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId ? { ...group, ...updates } : group
      )
    );
  };

  const getGroupById = (groupId: string): Group | undefined => {
    return groups.find(g => g.id === groupId);
  };

  const refreshGroups = () => {
    loadUserData();
  };

  const updateMemberRole = (groupId: string, memberEmail: string, role: MemberRole) => {
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
  };

  const approveMember = (groupId: string, memberEmail: string, approverEmail: string) => {
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
  };

  const rejectMember = (groupId: string, memberEmail: string) => {
    setGroups(prev =>
      prev.map(group => {
        if (group.id === groupId) {
          const updatedMembers = group.members.filter(m => m.email !== memberEmail);
          return { ...group, members: updatedMembers };
        }
        return group;
      })
    );
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
