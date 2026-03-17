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
import { Colors, Spacing } from '../constants/theme';
import GlassCard from '../components/futuristic/GlassCard';
import VoiceActivityRing from '../components/futuristic/VoiceActivityRing';

interface ChatListScreenProps {
  navigation?: any;
  onRefresh?: boolean;
  skinMode?: 'default' | 'smart-glasses';
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation, skinMode = 'default' }) => {
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

  const avatarColors = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];

  // ── Empty state ──
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyOrbGlow} />
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

  // ── Smart Glasses skin ──
  if (skinMode === 'smart-glasses') {
    const renderSGGroupItem = ({ item }: { item: Group }) => {
      const approvedMembers = item.members.filter(m => m.status === 'approved');
      const memberCount = approvedMembers.length || 1;

      return (
        <TouchableOpacity
          onPress={() => handleChatPress(item)}
          activeOpacity={0.7}
          style={sg.groupItem}
        >
          {/* Silhouette avatar */}
          <View style={sg.avatarCircle}>
            <Text style={sg.avatarEmoji}>{'\u{1F465}'}</Text>
          </View>

          {/* Group info */}
          <View style={sg.groupItemInfo}>
            <Text style={sg.groupItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={sg.groupItemMeta} numberOfLines={1}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
            <Text style={sg.groupItemLastMsg} numberOfLines={1}>
              {item.lastMessage || '[Voice message]'}
            </Text>
          </View>

          {/* Right side: time + mic ring */}
          <View style={sg.groupItemRight}>
            <Text style={sg.groupItemTime}>{formatTimestamp(item.timestamp)}</Text>
            <View style={sg.micRingBtn}>
              <VoiceActivityRing isActive={false} size={32} color="#60A5FA" barCount={8} />
            </View>
          </View>
        </TouchableOpacity>
      );
    };

    if (groups.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={sg.container}>
        <GlassCard style={sg.outerCard} intensity="low">
          <Text style={sg.sectionTitle}>Groups</Text>
          <FlatList
            data={groups}
            renderItem={renderSGGroupItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={sg.separator} />}
          />
        </GlassCard>
      </View>
    );
  }

  // ── Default skin ──
  const renderGroupCard = ({ item }: { item: Group }) => {
    const approvedMembers = item.members.filter(m => m.status === 'approved');
    const memberCount = approvedMembers.length || 1;
    const accentColor = avatarColors[item.name.length % avatarColors.length];

    return (
      <TouchableOpacity
        onPress={() => handleChatPress(item)}
        activeOpacity={0.8}
        style={styles.cardTouchable}
      >
        <GlassCard style={styles.groupCard}>
          <View style={[styles.accentGlowLine, { backgroundColor: accentColor }]} />
          <View style={styles.cardRow}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: accentColor }]} />
              <View style={[styles.avatar, { borderColor: accentColor }]}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.groupMembers}>
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.groupLastMessage} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </Text>
            </View>
            <View style={styles.groupRight}>
              <Text style={styles.groupTimestamp}>{formatTimestamp(item.timestamp)}</Text>
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>
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

// ── Smart Glasses styles ──
const sg = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  outerCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(148, 163, 184, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  groupItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  groupItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  groupItemMeta: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.6)',
    marginBottom: 1,
  },
  groupItemLastMsg: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.4)',
  },
  groupItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  groupItemTime: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.5)',
  },
  micRingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.15)',
    marginHorizontal: 16,
  },
});

// ── Default styles ──
const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  emptyOrbGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.xl },
  emptyTitle: {
    fontSize: 26, fontWeight: '600', color: '#F1F5F9',
    marginBottom: Spacing.md, letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 16, color: 'rgba(226, 232, 240, 0.6)',
    textAlign: 'center', marginBottom: Spacing.xxxl, lineHeight: 24,
  },
  createButton: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)', borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl, borderRadius: 16,
  },
  createButtonText: { color: '#818CF8', fontSize: 18, fontWeight: '600' },
  listContainer: {
    paddingHorizontal: 16, paddingTop: Spacing.sm, paddingBottom: Spacing.lg,
  },
  cardTouchable: { marginBottom: 12 },
  groupCard: { padding: 0, overflow: 'hidden' },
  accentGlowLine: {
    height: 2, opacity: 0.5, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatarGlow: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    opacity: 0.15, top: 0, left: 0,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(30, 41, 59, 0.8)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#F1F5F9', fontSize: 22, fontWeight: '700' },
  groupInfo: { flex: 1, marginRight: Spacing.sm },
  groupName: { fontSize: 17, fontWeight: '600', color: '#F1F5F9', marginBottom: 2 },
  groupMembers: { fontSize: 13, color: 'rgba(148, 163, 184, 0.7)', marginBottom: 2 },
  groupLastMessage: { fontSize: 14, color: 'rgba(148, 163, 184, 0.5)' },
  groupRight: { alignItems: 'flex-end', justifyContent: 'flex-start', minWidth: 40 },
  groupTimestamp: { fontSize: 13, color: 'rgba(148, 163, 184, 0.5)', marginBottom: Spacing.sm },
  unreadBadge: {
    borderRadius: 12, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
});

export default ChatListScreen;
