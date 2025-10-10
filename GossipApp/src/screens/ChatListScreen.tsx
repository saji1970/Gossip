import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';

interface ChatListScreenProps {
  navigation?: any;
  onRefresh?: boolean;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation, onRefresh }) => {
  const { user, groups } = useApp();
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: 'user@example.com',
  });

  useEffect(() => {
    // Load user info
    loadUserInfo();
  }, [user, onRefresh]);

  const loadUserInfo = async () => {
    try {
      const { firebaseAuth } = await import('../services/FirebaseAuthService');
      const currentUser = firebaseAuth.getCurrentUser();
      if (currentUser) {
        setUserProfile({
          name: currentUser.displayName,
          email: currentUser.email,
        });
      } else if (user) {
        setUserProfile({
          name: user.displayName,
          email: user.email,
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleCreateGroup = () => {
    if (navigation) {
      navigation.navigate('CreateGroup');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { firebaseAuth } = await import('../services/FirebaseAuthService');
              await firebaseAuth.signOut();
              if (navigation) {
                navigation.navigate('Login');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleChatPress = (group: Group) => {
    if (navigation) {
      navigation.navigate('ChatRoom', { group });
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptyText}>
        Create or join a group to start chatting with your friends
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>➕ Create Group</Text>
      </TouchableOpacity>
    </View>
  );

  const handleInviteMembers = (group: Group) => {
    if (navigation) {
      navigation.navigate('InviteMembers', { group });
    }
  };

  const handleGroupSettings = (group: Group) => {
    if (navigation) {
      navigation.navigate('GroupSettings', { group });
    }
  };

  const renderChatItem = ({ item }: { item: Group }) => {
    const approvedMembers = item.members.filter(m => m.status === 'approved');
    const pendingCount = item.members.filter(m => m.status === 'pending').length;
    const isAdmin = item.members.find(m => m.email === user?.email)?.role === 'admin';

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleGroupSettings(item)}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{item.name[0].toUpperCase()}</Text>
          {item.privacy === 'private' && (
            <View style={styles.privacyIndicator}>
              <Text style={styles.privacyIcon}>🔒</Text>
            </View>
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.chatNameContainer}>
              <Text style={styles.chatName}>{item.name}</Text>
              {isAdmin && pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => handleGroupSettings(item)}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>⚙️</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.chatFooter}>
            <Text style={styles.chatMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            <Text style={styles.memberCount}>
              {approvedMembers.length} member{approvedMembers.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🎉 GossipIn</Text>
          <Text style={styles.headerSubtitle}>Your Chats</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{userProfile.name[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
        </View>
      </View>

      {/* Chat List or Empty State */}
      {groups.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={groups}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Floating Action Button */}
      {groups.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateGroup}>
          <Text style={styles.fabIcon}>➕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  privacyIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyIcon: {
    fontSize: 12,
  },
  chatNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 4,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inviteButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});

export default ChatListScreen;
