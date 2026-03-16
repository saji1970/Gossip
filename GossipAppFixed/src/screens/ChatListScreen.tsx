import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';

interface ChatListScreenProps {
  navigation?: any;
  onRefresh?: boolean;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const { groups } = useApp();

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

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    } catch {
      return '';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{'\u{1F465}'}</Text>
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptyText}>
        Create your first group to get started
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGroupCard = ({ item }: { item: Group }) => {
    const approvedMembers = item.members.filter(m => m.status === 'approved');
    const memberCount = approvedMembers.length || 1;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        {/* Group Icon */}
        <View style={styles.groupIconContainer}>
          <Text style={styles.groupIcon}>{'\u{1F465}'}</Text>
        </View>

        {/* Group Info */}
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.groupMembers}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.groupLastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        {/* Right side: time + unread badge */}
        <View style={styles.groupRight}>
          <Text style={styles.groupTimestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {groups.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  // ── Empty state ──
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
  // ── Group list ──
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  groupIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  groupIcon: {
    fontSize: 32,
    color: Colors.primary,
  },
  groupInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  groupMembers: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  groupLastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  groupRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 40,
  },
  groupTimestamp: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  unreadBadge: {
    backgroundColor: Colors.unreadBadge,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default ChatListScreen;
