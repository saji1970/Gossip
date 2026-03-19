import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Switch,
  Modal,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { Colors, BorderRadius, Spacing, ACCENT_PRESETS, AccentName } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Group } from '../utils/GroupStorage';
import { useVoice } from '../hooks/useVoice';
import { useGossipBot } from '../hooks/useGossipBot';
import { conversationHistory } from '../modules/gossip/ConversationHistory';
import { gossipPersonality } from '../modules/gossip/GossipPersonality';
import * as ResponseBuilder from '../modules/gossip/ResponseBuilder';
import { ConversationEntry, GossipOption } from '../modules/gossip/types';
import Tts from 'react-native-tts';
import StarFieldBackground from '../components/futuristic/StarFieldBackground';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingMicOrb from '../components/futuristic/GlowingMicOrb';
import ProfileSection from './settings/ProfileSection';
import VoiceTrainingSection from './settings/VoiceTrainingSection';
import NotificationSection from './settings/NotificationSection';
import * as api from '../services/api';

interface MainTabsScreenProps {
  navigation?: any;
  onRefresh?: boolean;
}

// ── Settings Panel (reused from old SettingsTabContent) ──────────

type SettingsSection = 'profile' | 'voice' | 'notifications' | 'appearance';

const SettingsPanel: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
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
        onPress: async () => { await api.logout(); setUser(null); onClose(); },
      },
    ]);
  }, [setUser, onClose]);

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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={settingsStyles.overlay}>
        <View style={settingsStyles.panel}>
          <View style={settingsStyles.panelHeader}>
            <Text style={settingsStyles.panelTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={settingsStyles.closeBtn}>
              <Text style={settingsStyles.closeBtnText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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

            <Text style={settingsStyles.version}>v3.0.0 &bull; Gossip</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const settingsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    marginBottom: 8,
  },
  panelTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#94A3B8' },
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

// ── Main Conversational AI Home ─────────────────────────────────

const MainTabsScreen: React.FC<MainTabsScreenProps> = ({ navigation }) => {
  const { groups, user, setUser } = useApp();
  const { voiceState, startListening, stopListening, lastResult } = useVoice();
  const { processInput } = useGossipBot();
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [textInput, setTextInput] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastProcessedResult = useRef<string | null>(null);
  const hasWelcomed = useRef(false);

  // Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      await conversationHistory.load();
      const history = conversationHistory.getAll();
      if (history.length > 0) {
        setMessages(history);
      } else if (!hasWelcomed.current && user) {
        hasWelcomed.current = true;
        const welcomeText = ResponseBuilder.buildWelcomeBack(
          user.displayName || user.email,
          gossipPersonality.getMood(),
        );
        const entry = conversationHistory.addGossipMessage(welcomeText);
        setMessages([entry]);
      }
    };
    loadHistory();
  }, []);

  // Handle voice results
  useEffect(() => {
    if (lastResult && lastResult.text && lastResult.text !== lastProcessedResult.current) {
      lastProcessedResult.current = lastResult.text;
      handleUserInput(lastResult.text);
    }
  }, [lastResult]);

  const handleUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add user message
    const userEntry = conversationHistory.addUserMessage(trimmed);
    setMessages(prev => [...prev, userEntry]);

    // Process through GossipBot
    const response = await processInput(trimmed, 'MainTabs');

    // Add gossip response
    const gossipEntry = conversationHistory.addGossipMessage(
      response.message,
      response.options,
    );
    setMessages(prev => [...prev, gossipEntry]);

    // Speak response
    try { Tts.speak(response.message); } catch {}

    // Handle execute commands
    if (response.type === 'execute' && response.command) {
      const cmd = response.command;
      setTimeout(() => {
        handleCommand(cmd.type, cmd.payload);
        const actionEntry = conversationHistory.addSystemMessage(
          `Done: ${cmd.type.replace(/_/g, ' ')}`,
          cmd.type,
        );
        setMessages(prev => [...prev, actionEntry]);
      }, 800);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    Keyboard.dismiss();
    handleUserInput(textInput);
    setTextInput('');
  };

  const handleOptionTap = async (option: GossipOption) => {
    // Add user selection as a message
    const userEntry = conversationHistory.addUserMessage(option.label);
    setMessages(prev => [...prev, userEntry]);

    // Process the option through GossipBot
    const response = await processInput(option.label, 'MainTabs');
    const gossipEntry = conversationHistory.addGossipMessage(response.message, response.options);
    setMessages(prev => [...prev, gossipEntry]);

    // If it has a command, execute it
    const cmd = response.command || option.command;
    if (cmd) {
      setTimeout(() => {
        handleCommand(cmd.type, cmd.payload);
        const actionEntry = conversationHistory.addSystemMessage(
          `Done: ${cmd.type.replace(/_/g, ' ')}`,
          cmd.type,
        );
        setMessages(prev => [...prev, actionEntry]);
      }, 600);
    }
  };

  const handleCommand = (type: string, payload: string) => {
    switch (type) {
      case 'navigate':
        if (payload === 'logout') {
          Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => { await api.logout(); setUser(null); } },
          ]);
        } else if (payload === 'settings_theme' || payload === 'settings_profile' || payload === 'setting') {
          setSettingsVisible(true);
        } else if (payload === 'chat' || payload === 'group' || payload === 'home') {
          // Already home
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
      case 'open_chat': {
        try {
          const parsed = JSON.parse(payload);
          if (parsed.groupId) {
            const targetGroup = groups.find(g => g.id === parsed.groupId);
            if (targetGroup) {
              navigation?.navigate('ChatRoom', { group: targetGroup });
            }
          }
        } catch {}
        break;
      }
      case 'private_chat':
        // DM support — navigate to chat list for now
        break;
      case 'call_group': {
        if (payload) {
          const targetGroup = groups.find(g => g.id === payload);
          if (targetGroup) {
            navigation?.navigate('GroupCall', { group: targetGroup });
          }
        }
        break;
      }
    }
  };

  const handleOrbPress = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleGroupPillPress = (group: Group) => {
    navigation?.navigate('ChatRoom', { group });
  };

  const orbState = voiceState === 'listening'
    ? 'listening'
    : voiceState === 'processing'
      ? 'processing'
      : 'idle';

  // ── Render a conversation bubble ──
  const renderMessage = ({ item }: { item: ConversationEntry }) => {
    if (item.role === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemIcon}>{'\u2713'}</Text>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    // Gossip bubble
    return (
      <View style={styles.gossipRow}>
        <View style={styles.gossipBubble}>
          <Text style={styles.gossipLabel}>Gossip</Text>
          <Text style={styles.gossipBubbleText}>{item.text}</Text>
          {item.options && item.options.length > 0 && (
            <View style={styles.optionPills}>
              {item.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.optionPill}
                  onPress={() => handleOptionTap(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionPillText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const avatarColors = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];

  return (
    <StarFieldBackground starCount={35} showRadialGlow={true}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Gossip</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Group Pills ── */}
        {groups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.groupPillsContainer}
            contentContainerStyle={styles.groupPillsContent}
          >
            {groups.slice(0, 10).map((g) => {
              const color = avatarColors[g.name.length % avatarColors.length];
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.groupPill}
                  onPress={() => handleGroupPillPress(g)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.groupPillAvatar, { borderColor: color }]}>
                    <Text style={styles.groupPillAvatarText}>
                      {g.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.groupPillName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  {g.unreadCount > 0 && (
                    <View style={styles.groupPillBadge}>
                      <Text style={styles.groupPillBadgeText}>{g.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Conversation FlatList ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* ── Mic Orb ── */}
        <View style={styles.orbArea}>
          <GlowingMicOrb
            state={orbState}
            size={100}
            onPress={handleOrbPress}
          />
          <Text style={styles.orbLabel}>
            {voiceState === 'listening' ? 'Listening...' : 'Tap to talk'}
          </Text>
        </View>

        {/* ── Text Input Fallback ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="rgba(148, 163, 184, 0.4)"
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={handleTextSubmit}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !textInput.trim() && styles.sendBtnDisabled]}
            onPress={handleTextSubmit}
            disabled={!textInput.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>{'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Settings Panel ── */}
        <SettingsPanel
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
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
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 140, 248, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
    textShadowColor: 'rgba(129, 140, 248, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  settingsIcon: { fontSize: 20 },
  // ── Group Pills ──
  groupPillsContainer: {
    maxHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
  },
  groupPillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    alignItems: 'center',
  },
  groupPill: {
    alignItems: 'center',
    marginRight: 4,
    width: 60,
  },
  groupPillAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  groupPillAvatarText: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  groupPillName: {
    fontSize: 10, color: 'rgba(226, 232, 240, 0.6)',
    marginTop: 3, textAlign: 'center', width: 56,
  },
  groupPillBadge: {
    position: 'absolute', top: -2, right: 4,
    backgroundColor: '#818CF8', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  groupPillBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  // ── Chat List ──
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // ── Message Bubbles ──
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#312E81',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  userBubbleText: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 21,
  },
  gossipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  gossipBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  gossipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gossipBubbleText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 21,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  systemIcon: {
    fontSize: 12,
    color: '#34D399',
  },
  systemText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.5)',
    fontStyle: 'italic',
  },
  // ── Option Pills ──
  optionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  optionPill: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  optionPillText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Orb Area ──
  orbArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  orbLabel: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.5)',
    marginTop: -8,
    letterSpacing: 0.3,
  },
  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 21,
    paddingHorizontal: 16,
    color: '#F1F5F9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#818CF8',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(129, 140, 248, 0.3)',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default MainTabsScreen;
