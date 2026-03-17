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
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import StarFieldBackground from '../components/futuristic/StarFieldBackground';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingMicOrb from '../components/futuristic/GlowingMicOrb';
import GlowingIconButton from '../components/futuristic/GlowingIconButton';
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

function formatRecordingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── Chat Tab Content ─────────────────────────────────────────────

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
        <View style={[chatStyles.avatar, { borderColor: color }]}>
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
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(71, 85, 105, 0.2)',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.8)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#F1F5F9', fontSize: 20, fontWeight: '700' },
  chatInfo: { flex: 1, marginRight: Spacing.sm },
  chatName: { fontSize: 17, fontWeight: '600', color: '#F1F5F9', marginBottom: 3 },
  chatLastMessage: { fontSize: 14, color: 'rgba(148, 163, 184, 0.6)' },
  chatRight: { alignItems: 'flex-end', minWidth: 40 },
  chatTime: { fontSize: 12, color: 'rgba(148, 163, 184, 0.5)', marginBottom: Spacing.sm },
  unreadBadge: {
    backgroundColor: '#818CF8', borderRadius: 12,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 24, fontWeight: '600', color: '#F1F5F9', marginBottom: Spacing.md },
  emptyText: { fontSize: 16, color: 'rgba(226, 232, 240, 0.6)', textAlign: 'center', lineHeight: 24 },
});

// ── Settings Tab Content ─────────────────────────────────────────

type SettingsSection = 'profile' | 'voice' | 'notifications' | 'appearance';

const SettingsTabContent: React.FC = () => {
  const { user, setUser } = useApp();
  const { mode, accent, setMode, setAccent, colors } = useTheme();
  const [expanded, setExpanded] = useState<Record<SettingsSection, boolean>>({
    profile: false, voice: false, notifications: false, appearance: false,
  });

  const toggle = useCallback((section: SettingsSection) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await api.logout(); setUser(null); },
      },
    ]);
  }, [setUser]);

  const accentOptions = Object.values(ACCENT_PRESETS);

  const renderSectionHeader = (
    section: SettingsSection, icon: string, title: string, subtitle: string, iconColor: string,
  ) => (
    <TouchableOpacity
      style={settingsStyles.sectionHeader}
      onPress={() => toggle(section)}
      activeOpacity={0.7}
    >
      <View style={settingsStyles.sectionHeaderLeft}>
        <View style={[settingsStyles.sectionIcon, { backgroundColor: `${iconColor}30` }]}>
          <Text style={settingsStyles.sectionIconText}>{icon}</Text>
        </View>
        <View>
          <Text style={settingsStyles.sectionTitle}>{title}</Text>
          <Text style={settingsStyles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={settingsStyles.chevron}>{expanded[section] ? '\u25B2' : '\u25BC'}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={settingsStyles.scrollView}
      contentContainerStyle={settingsStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={settingsStyles.card} intensity="low">
        {renderSectionHeader('profile', '\u{1F464}', 'Profile', user?.displayName || 'Not signed in', '#818CF8')}
        <ProfileSection expanded={expanded.profile} />
      </GlassCard>

      <GlassCard style={settingsStyles.card} intensity="low">
        {renderSectionHeader('voice', '\u{1F3A4}', 'Voice Training', 'Learn voice commands', '#34D399')}
        <VoiceTrainingSection expanded={expanded.voice} />
      </GlassCard>

      <GlassCard style={settingsStyles.card} intensity="low">
        {renderSectionHeader('notifications', '\u{1F514}', 'Notifications', 'Sound, vibration', '#FB923C')}
        <NotificationSection expanded={expanded.notifications} />
      </GlassCard>

      <GlassCard style={settingsStyles.card} intensity="low">
        {renderSectionHeader('appearance', '\u{1F3A8}', 'Appearance', 'Theme, colors', '#F472B6')}
        {expanded.appearance && (
          <View style={settingsStyles.appearanceContent}>
            <View style={settingsStyles.themeToggleRow}>
              <Text style={settingsStyles.themeLabel}>Dark Mode</Text>
              <Switch
                value={mode === 'dark'}
                onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                trackColor={{ false: 'rgba(71, 85, 105, 0.4)', true: colors.primary }}
                thumbColor="#FFFFFF"
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
      </GlassCard>

      <TouchableOpacity style={settingsStyles.logoutButton} onPress={handleLogout}>
        <Text style={settingsStyles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={settingsStyles.version}>v2.5.0 &bull; Gossip</Text>
    </ScrollView>
  );
};

const settingsStyles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  card: { marginBottom: 12, padding: 0 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  sectionIconText: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F1F5F9' },
  sectionSubtitle: { fontSize: 13, color: 'rgba(148, 163, 184, 0.6)', marginTop: 1 },
  chevron: { fontSize: 12, color: 'rgba(148, 163, 184, 0.4)', marginLeft: Spacing.sm },
  appearanceContent: { paddingHorizontal: 16, paddingBottom: 16 },
  themeToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12,
  },
  themeLabel: { fontSize: 16, color: '#F1F5F9' },
  accentLabel: {
    fontSize: 12, fontWeight: '600', color: 'rgba(148, 163, 184, 0.5)',
    textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12, marginBottom: 12,
  },
  accentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accentOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  accentSwatch: { width: 18, height: 18, borderRadius: 9, marginRight: 8 },
  accentName: { fontSize: 13, fontWeight: '600', color: 'rgba(226, 232, 240, 0.7)' },
  logoutButton: {
    marginHorizontal: 4, marginTop: 20, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)', alignItems: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#F87171' },
  version: {
    textAlign: 'center', fontSize: 12, color: 'rgba(148, 163, 184, 0.3)',
    marginTop: 16, marginBottom: 24, letterSpacing: 1,
  },
});

// ── Main Tabs Screen ──────────────────────────────────────────────

const MainTabsScreen: React.FC<MainTabsScreenProps> = ({ navigation, onRefresh }) => {
  const { groups, user } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('groups');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const { voiceState } = useVoice();

  // ── Volume Up recording state ──
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const { isRecording, recordingDurationMs, startRecording, stopRecording } = useAudioRecorder();

  // ── Volume button handlers ──
  const handleVolumeDownLongPress = useCallback(() => {
    // Toggle voice command overlay
    setOverlayVisible(prev => !prev);
  }, []);

  const handleVolumeUpLongPress = useCallback(async () => {
    if (!isVoiceRecording) {
      // First long press: start recording
      try {
        await startRecording();
        setIsVoiceRecording(true);
      } catch (err: any) {
        Alert.alert('Recording Error', err.message || 'Could not start recording');
      }
    } else {
      // Second long press: stop and send to first group
      try {
        const result = await stopRecording();
        setIsVoiceRecording(false);
        if (groups.length > 0) {
          const targetGroup = groups[0];
          await api.sendVoiceMessage(
            targetGroup.id,
            result.uri,
            result.durationMs,
            user?.displayName || 'You',
            undefined,
          );
          Alert.alert('Sent', `Voice message sent to ${targetGroup.name}`);
        } else {
          Alert.alert('No Group', 'Create a group first to send voice messages.');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Could not send recording');
        setIsVoiceRecording(false);
      }
    }
  }, [isVoiceRecording, startRecording, stopRecording, groups, user]);

  useVolumeButtons({
    onVolumeDownLongPress: handleVolumeDownLongPress,
    onVolumeUpLongPress: handleVolumeUpLongPress,
    enabled: true,
  });

  // ── Voice command handler ──
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
            const parsed = JSON.parse(payload);
            params = { groupName: parsed.name || '', privacy: parsed.privacy, requireApproval: parsed.requireApproval };
          } catch { params = { groupName: payload }; }
        }
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

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <ChatListScreen navigation={navigation} onRefresh={onRefresh} skinMode="smart-glasses" />

            {/* Center Orb */}
            <View style={styles.centerOrbArea}>
              <GlowingMicOrb
                state={orbState}
                size={140}
                onPress={() => setOverlayVisible(true)}
              />
              <Text style={styles.orbLabel}>Say a command...</Text>
            </View>
          </ScrollView>
        );
      case 'chat':
        return <ChatTabContent navigation={navigation} />;
      case 'settings':
        return <SettingsTabContent />;
      default:
        return null;
    }
  };

  const orbState = voiceState === 'listening'
    ? 'listening'
    : voiceState === 'processing'
      ? 'processing'
      : 'idle';

  return (
    <StarFieldBackground starCount={35} showRadialGlow={true}>
      <View style={styles.container}>
        {/* ── Header: Smart Glasses Voice Chat ── */}
        <View style={styles.topBar}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitleGlow}>Smart Glasses Voice Chat</Text>
            <View style={styles.headerActions}>
              <GlowingIconButton
                icon={'\u{1F399}'}
                onPress={() => setOverlayVisible(true)}
                size={40}
                glowColor="rgba(96, 165, 250, 0.35)"
              />
              <GlowingIconButton
                icon="+"
                onPress={handleCreateGroup}
                size={40}
                glowColor="rgba(96, 165, 250, 0.35)"
              />
            </View>
          </View>
        </View>

        {/* ── Recording banner (Vol Up active) ── */}
        {isVoiceRecording && (
          <View style={styles.recordingBanner}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingBannerText}>
              Recording {formatRecordingTime(recordingDurationMs)}
            </Text>
            <Text style={styles.recordingBannerHint}>Long press Vol Up to send</Text>
          </View>
        )}

        {/* ── Tab content ── */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* ── Bottom Dock ── */}
        <View style={styles.dockContainer}>
          {/* Horizon arc line */}
          <View style={styles.horizonArc} />

          <View style={styles.dock}>
            {tabList.map((id) => {
              const isActive = activeTab === id;
              const meta = tabMeta[id];
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.dockTab}
                  onPress={() => setActiveTab(id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dockIconWrapper, isActive && styles.dockIconWrapperActive]}>
                    <Text style={[styles.dockIcon, isActive && styles.dockIconActive]}>
                      {meta.icon}
                    </Text>
                  </View>
                  <Text style={[styles.dockLabel, isActive && styles.dockLabelActive]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Voice command overlay ── */}
        <VoiceCommandOverlay
          visible={overlayVisible}
          onDismiss={() => setOverlayVisible(false)}
          onCommand={handleVoiceCommand}
          context="chat_list"
        />
      </View>
    </StarFieldBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Header ──
  topBar: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(96, 165, 250, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGlow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#60A5FA',
    textShadowColor: 'rgba(96, 165, 250, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: 0.5,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // ── Recording banner ──
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248, 113, 113, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F87171',
  },
  recordingBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
    fontVariant: ['tabular-nums'],
  },
  recordingBannerHint: {
    fontSize: 12,
    color: 'rgba(248, 113, 113, 0.6)',
  },
  // ── Center Orb ──
  centerOrbArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  orbLabel: {
    fontSize: 14,
    color: 'rgba(148, 163, 184, 0.5)',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  // ── Content ──
  content: {
    flex: 1,
  },
  // ── Floating Glass Dock ──
  dockContainer: {
    alignItems: 'center',
  },
  horizonArc: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderRadius: 1,
    marginBottom: 4,
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.08)',
    paddingBottom: 28,
    paddingTop: 10,
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dockIconWrapper: {
    width: 56,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dockIconWrapperActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  dockIcon: {
    fontSize: 20,
    opacity: 0.35,
  },
  dockIconActive: {
    opacity: 1,
  },
  dockLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(148, 163, 184, 0.35)',
    letterSpacing: 0.3,
  },
  dockLabelActive: {
    color: '#60A5FA',
  },
});

export default MainTabsScreen;
