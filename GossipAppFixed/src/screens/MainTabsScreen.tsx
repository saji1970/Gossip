import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Colors, BorderRadius, Spacing, ACCENT_PRESETS, AccentName } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Group } from '../utils/GroupStorage';
import { useVoice } from '../hooks/useVoice';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import ChatListScreen from './ChatListScreen';
import ProfileSection from './settings/ProfileSection';
import VoiceTrainingSection from './settings/VoiceTrainingSection';
import NotificationSection from './settings/NotificationSection';
import * as api from '../services/api';

interface MainTabsScreenProps {
  navigation?: any;
  onRefresh?: boolean;
}

type TabId = 'groups' | 'chat' | 'settings';

const tabMeta: Record<TabId, { label: string; icon: string }> = {
  groups: { label: 'Groups', icon: '\u{1F465}' },
  chat: { label: 'Chat', icon: '\u{1F4AC}' },
  settings: { label: 'Settings', icon: '\u2699\uFE0F' },
};

const tabList: TabId[] = ['groups', 'chat', 'settings'];

// ── Chat Tab Content (no header) ─────────────────────────────────

const ChatTabContent: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { groups } = useApp();

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

  const renderChatItem = ({ item }: { item: Group }) => {
    const color = avatarColors[item.name.length % avatarColors.length];
    return (
      <TouchableOpacity
        style={chatStyles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={[chatStyles.avatar, { backgroundColor: color }]}>
          <Text style={chatStyles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={chatStyles.chatInfo}>
          <Text style={chatStyles.chatName} numberOfLines={1}>{item.name}</Text>
          <Text style={chatStyles.chatLastMessage} numberOfLines={1}>
            {item.lastMessage || 'Tap to start chatting'}
          </Text>
        </View>
        <View style={chatStyles.chatRight}>
          <Text style={chatStyles.chatTime}>{formatTimestamp(item.timestamp)}</Text>
          {item.unreadCount > 0 && (
            <View style={chatStyles.unreadBadge}>
              <Text style={chatStyles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (groups.length === 0) {
    return (
      <View style={chatStyles.emptyContainer}>
        <Text style={chatStyles.emptyIcon}>{'\u{1F4AC}'}</Text>
        <Text style={chatStyles.emptyTitle}>No Chats Yet</Text>
        <Text style={chatStyles.emptyText}>
          Create a group first, then come here to chat
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={groups}
      renderItem={renderChatItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={chatStyles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const chatStyles = StyleSheet.create({
  listContainer: { paddingBottom: Spacing.lg },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg,
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  chatInfo: { flex: 1, marginRight: Spacing.sm },
  chatName: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  chatLastMessage: { fontSize: 15, color: Colors.textSecondary },
  chatRight: { alignItems: 'flex-end', minWidth: 40 },
  chatTime: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.sm },
  unreadBadge: {
    backgroundColor: Colors.unreadBadge, borderRadius: 12,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadBadgeText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyText: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 },
});

// ── Settings Tab Content ─────────────────────────────────────────

type SettingsSection = 'profile' | 'voice' | 'notifications' | 'appearance';

const SettingsTabContent: React.FC = () => {
  const { user, setUser } = useApp();
  const { mode, accent, setMode, setAccent, colors } = useTheme();
  const [expanded, setExpanded] = useState<Record<SettingsSection, boolean>>({
    profile: false,
    voice: false,
    notifications: false,
    appearance: false,
  });

  const toggle = useCallback((section: SettingsSection) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          setUser(null);
        },
      },
    ]);
  }, [setUser]);

  const accentOptions = Object.values(ACCENT_PRESETS);

  return (
    <ScrollView
      style={settingsStyles.scrollView}
      contentContainerStyle={settingsStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Section */}
      <TouchableOpacity
        style={settingsStyles.sectionHeader}
        onPress={() => toggle('profile')}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.sectionHeaderLeft}>
          <View style={[settingsStyles.sectionIcon, { backgroundColor: colors.primary }]}>
            <Text style={settingsStyles.sectionIconText}>{'\u{1F464}'}</Text>
          </View>
          <View>
            <Text style={settingsStyles.sectionTitle}>Profile</Text>
            <Text style={settingsStyles.sectionSubtitle}>
              {user?.displayName || 'Not signed in'}
            </Text>
          </View>
        </View>
        <Text style={settingsStyles.chevron}>{expanded.profile ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      <ProfileSection expanded={expanded.profile} />

      {/* Voice Training Section */}
      <TouchableOpacity
        style={settingsStyles.sectionHeader}
        onPress={() => toggle('voice')}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.sectionHeaderLeft}>
          <View style={[settingsStyles.sectionIcon, { backgroundColor: colors.accent }]}>
            <Text style={settingsStyles.sectionIconText}>{'\u{1F3A4}'}</Text>
          </View>
          <View>
            <Text style={settingsStyles.sectionTitle}>Voice Training</Text>
            <Text style={settingsStyles.sectionSubtitle}>Learn voice commands</Text>
          </View>
        </View>
        <Text style={settingsStyles.chevron}>{expanded.voice ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      <VoiceTrainingSection expanded={expanded.voice} />

      {/* Notifications Section */}
      <TouchableOpacity
        style={settingsStyles.sectionHeader}
        onPress={() => toggle('notifications')}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.sectionHeaderLeft}>
          <View style={[settingsStyles.sectionIcon, { backgroundColor: '#FB923C' }]}>
            <Text style={settingsStyles.sectionIconText}>{'\u{1F514}'}</Text>
          </View>
          <View>
            <Text style={settingsStyles.sectionTitle}>Notifications</Text>
            <Text style={settingsStyles.sectionSubtitle}>Sound, vibration</Text>
          </View>
        </View>
        <Text style={settingsStyles.chevron}>{expanded.notifications ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      <NotificationSection expanded={expanded.notifications} />

      {/* Appearance Section */}
      <TouchableOpacity
        style={settingsStyles.sectionHeader}
        onPress={() => toggle('appearance')}
        activeOpacity={0.7}
      >
        <View style={settingsStyles.sectionHeaderLeft}>
          <View style={[settingsStyles.sectionIcon, { backgroundColor: '#F472B6' }]}>
            <Text style={settingsStyles.sectionIconText}>{'\u{1F3A8}'}</Text>
          </View>
          <View>
            <Text style={settingsStyles.sectionTitle}>Appearance</Text>
            <Text style={settingsStyles.sectionSubtitle}>Theme, colors</Text>
          </View>
        </View>
        <Text style={settingsStyles.chevron}>{expanded.appearance ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      {expanded.appearance && (
        <View style={settingsStyles.appearanceContent}>
          <View style={settingsStyles.themeToggleRow}>
            <Text style={settingsStyles.themeLabel}>Dark Mode</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={(val) => setMode(val ? 'dark' : 'light')}
              trackColor={{ false: Colors.border, true: colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          <Text style={settingsStyles.accentLabel}>Accent Color</Text>
          <View style={settingsStyles.accentGrid}>
            {accentOptions.map((preset) => {
              const isActive = accent === preset.name;
              return (
                <TouchableOpacity
                  key={preset.name}
                  style={[
                    settingsStyles.accentOption,
                    isActive && { borderColor: preset.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setAccent(preset.name as AccentName)}
                  activeOpacity={0.7}
                >
                  <View style={[settingsStyles.accentSwatch, { backgroundColor: preset.primary }]} />
                  <Text style={[settingsStyles.accentName, isActive && { color: preset.primary }]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Log Out */}
      <TouchableOpacity style={settingsStyles.logoutButton} onPress={handleLogout}>
        <Text style={settingsStyles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={settingsStyles.version}>v2.4.0 &bull; Gossip</Text>
    </ScrollView>
  );
};

const settingsStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionIconText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  chevron: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  appearanceContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  themeLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  accentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  accentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accentSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: Spacing.sm,
  },
  accentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  logoutButton: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
});

// ── Main Tabs Screen ──────────────────────────────────────────────

const MainTabsScreen: React.FC<MainTabsScreenProps> = ({ navigation, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabId>('groups');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const { voiceState } = useVoice();

  const handleVoiceCommand = (type: string, payload: string) => {
    switch (type) {
      case 'navigate':
        if (payload === 'chat' || payload === 'group' || payload === 'home') {
          setActiveTab('groups');
        } else if (payload === 'setting') {
          setActiveTab('settings');
        }
        break;
      case 'create_group': {
        let params: any = undefined;
        if (payload) {
          try {
            // Try parsing as JSON (structured command with settings)
            const parsed = JSON.parse(payload);
            params = {
              groupName: parsed.name || '',
              privacy: parsed.privacy,
              requireApproval: parsed.requireApproval,
            };
          } catch {
            // Plain string — just the group name
            params = { groupName: payload };
          }
        }
        console.log('[MainTabs] create_group params:', JSON.stringify(params));
        navigation?.navigate('CreateGroup', params);
        break;
      }
      case 'open_chat':
        setActiveTab('chat');
        break;
      default:
        break;
    }
  };

  const handleCreateGroup = () => {
    navigation?.navigate('CreateGroup');
  };

  const title = tabMeta[activeTab].label;

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return <ChatListScreen navigation={navigation} onRefresh={onRefresh} />;
      case 'chat':
        return <ChatTabContent navigation={navigation} />;
      case 'settings':
        return <SettingsTabContent />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Common top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{title}</Text>
      </View>
      <View style={styles.accentLine} />

      {/* ── Common header row: title + mic + optional "+" ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setOverlayVisible(true)}>
            <Text style={styles.headerButtonIcon}>{'\u{1F399}'}</Text>
          </TouchableOpacity>
          {activeTab === 'groups' && (
            <TouchableOpacity style={styles.headerButton} onPress={handleCreateGroup}>
              <Text style={styles.headerButtonPlusIcon}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tab content ── */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={styles.tabBar}>
        {tabList.map((id) => {
          const isActive = activeTab === id;
          const meta = tabMeta[id];
          return (
            <TouchableOpacity
              key={id}
              style={styles.tab}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, isActive && styles.tabIconWrapperActive]}>
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {meta.icon}
                </Text>
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Voice command overlay ── */}
      <VoiceCommandOverlay
        visible={overlayVisible}
        onDismiss={() => setOverlayVisible(false)}
        onCommand={handleVoiceCommand}
        context="chat_list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Top bar ──
  topBar: {
    backgroundColor: Colors.headerBar,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  accentLine: {
    height: 2,
    backgroundColor: Colors.primaryDark,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  headerButtonPlusIcon: {
    fontSize: 28,
    color: Colors.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  // ── Content ──
  content: {
    flex: 1,
  },
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 28,
    paddingTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  tabIconWrapper: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconWrapperActive: {
    backgroundColor: Colors.tabActivePill,
  },
  tabIcon: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  tabIconActive: {
    color: Colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
  },
});

export default MainTabsScreen;
