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
import { Colors, BorderRadius, Spacing } from '../constants/theme';

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
    if (user) {
      setUserProfile({
        name: user.displayName,
        email: user.email,
      });
    }
  }, [user, onRefresh]);

  const handleCreateGroup = () => {
    if (navigation) {
      navigation.navigate('CreateGroup');
    }
  };

  const handleChatPress = (group: Group) => {
    if (navigation) {
      navigation.navigate('ChatRoom', { group });
    }
  };

  const handleGroupSettings = (group: Group) => {
    if (navigation) {
      navigation.navigate('GroupSettings', { group });
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎙️</Text>
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptyText}>
        Say "create group" to get started
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );

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
              <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
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
        <Text style={styles.headerTitle}>Gossip</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingTop: 54,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 26,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  // List
  listContainer: {
    paddingVertical: Spacing.sm,
  },
  chatItem: {
    flexDirection: 'row',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    minHeight: 88,
  },
  chatAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    position: 'relative',
  },
  chatAvatarText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  privacyIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
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
    backgroundColor: Colors.warning,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  settingsButtonText: {
    fontSize: 22,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  chatName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    flex: 1,
  },
  memberCount: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
});

export default ChatListScreen;
