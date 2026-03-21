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
  Animated,
  Easing,
} from 'react-native';
import { Colors, BorderRadius, Spacing, ACCENT_PRESETS, AccentName } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Group } from '../utils/GroupStorage';
import { useVoice } from '../hooks/useVoice';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { useGossipBot } from '../hooks/useGossipBot';
import { conversationHistory } from '../modules/gossip/ConversationHistory';
import { gossipPersonality } from '../modules/gossip/GossipPersonality';
import * as ResponseBuilder from '../modules/gossip/ResponseBuilder';
import { ConversationEntry, GossipOption } from '../modules/gossip/types';
import Tts from 'react-native-tts';
import StarFieldBackground from '../components/futuristic/StarFieldBackground';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingMicOrb from '../components/futuristic/GlowingMicOrb';
import GlowingIconButton from '../components/futuristic/GlowingIconButton';
import VoiceWaveform from '../components/futuristic/VoiceWaveform';
import VoiceTestPanel from '../components/voice/VoiceTestPanel';
import ProfileSection from './settings/ProfileSection';
import VoiceTrainingSection from './settings/VoiceTrainingSection';
import NotificationSection from './settings/NotificationSection';
import * as api from '../services/api';

interface MainTabsScreenProps {
  navigation?: any;
  onRefresh?: boolean;
}

// ── Typing Indicator (animated bouncing dots) ────────────────────

const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
          Animated.delay(400 - delay),
        ]),
      );
    animateDot(dot1, 0).start();
    animateDot(dot2, 140).start();
    animateDot(dot3, 280).start();
  }, []);

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubbleWrapper}>
        <View style={typingStyles.accentBar} />
        <View style={typingStyles.bubble}>
          <Text style={typingStyles.label}>Gossip</Text>
          <View style={typingStyles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[typingStyles.dot, { transform: [{ translateY: dot }] }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  bubbleWrapper: { flexDirection: 'row', maxWidth: '50%' },
  accentBar: {
    width: 3, borderTopLeftRadius: 3, borderBottomLeftRadius: 3,
    backgroundColor: '#818CF8',
  },
  bubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: {
    fontSize: 11, fontWeight: '700', color: '#818CF8',
    marginBottom: 6, letterSpacing: 0.5,
  },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 14 },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(129, 140, 248, 0.5)',
  },
});

// ── Animated Group Pill ──────────────────────────────────────────

const GroupPillItem: React.FC<{
  group: Group;
  color: string;
  onPress: (g: Group) => void;
}> = ({ group, color, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.groupPill}
        onPress={() => onPress(group)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[
          styles.groupPillAvatar,
          { borderColor: color, shadowColor: color, shadowRadius: 6, shadowOpacity: 0.4, elevation: 4 },
        ]}>
          <Text style={styles.groupPillAvatarText}>
            {group.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.groupPillName} numberOfLines={1}>
          {group.name}
        </Text>
        {group.unreadCount > 0 && (
          <View style={styles.groupPillBadge}>
            <Text style={styles.groupPillBadgeText}>{group.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

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
  const { processInput, backendAvailable } = useGossipBot();
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [textInput, setTextInput] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [voiceTestVisible, setVoiceTestVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastProcessedResult = useRef<string | null>(null);
  const hasWelcomed = useRef(false);

  // Animated header glow
  const headerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, { toValue: 1, duration: 2200, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(headerGlow, { toValue: 0, duration: 2200, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ]),
    ).start();
  }, []);

  // Animated input focus glow
  const inputGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(inputGlow, {
      toValue: inputFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [inputFocused]);

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

    const userEntry = conversationHistory.addUserMessage(trimmed);
    setMessages(prev => [...prev, userEntry]);
    setIsProcessing(true);

    const response = await processInput(trimmed, 'MainTabs');
    setIsProcessing(false);

    const gossipEntry = conversationHistory.addGossipMessage(
      response.message,
      response.options,
    );
    setMessages(prev => [...prev, gossipEntry]);

    try { Tts.speak(response.message); } catch {}

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
    const userEntry = conversationHistory.addUserMessage(option.label);
    setMessages(prev => [...prev, userEntry]);
    setIsProcessing(true);

    const response = await processInput(option.label, 'MainTabs');
    setIsProcessing(false);
    const gossipEntry = conversationHistory.addGossipMessage(response.message, response.options);
    setMessages(prev => [...prev, gossipEntry]);

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
      case 'navigate': {
        if (payload === 'logout') {
          Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => { await api.logout(); setUser(null); } },
          ]);
        } else if (payload === 'settings_theme' || payload === 'settings_profile' || payload === 'setting') {
          setSettingsVisible(true);
        } else if (payload === 'chat' || payload === 'group' || payload === 'home') {
          // Already home
        } else {
          try {
            const parsed = JSON.parse(payload);
            if (parsed.screen === 'InviteMembers' && parsed.groupId) {
              const targetGroup = groups.find(g => g.id === parsed.groupId);
              if (targetGroup) {
                navigation?.navigate('InviteMembers', { group: targetGroup });
              }
            }
          } catch {}
        }
        break;
      }
      case 'create_group': {
        let params: any = undefined;
        if (payload) {
          try {
            const parsed = JSON.parse(payload);
            params = {
              groupName: parsed.name || '',
              privacy: parsed.privacy,
              requireApproval: parsed.requireApproval,
            };
          } catch {
            params = { groupName: payload };
          }
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
      case 'record_voice': {
        try {
          const parsed = JSON.parse(payload);
          if (parsed.groupId) {
            const targetGroup = groups.find(g => g.id === parsed.groupId);
            if (targetGroup) {
              navigation?.navigate('ChatRoom', { group: targetGroup, startVoiceRecord: true });
            }
          }
        } catch {}
        break;
      }
      case 'confirm_action':
        handleUserInput(payload);
        break;
    }
  };

  const handleOrbPress = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  const handleVolumeUpRecord = useCallback(() => {
    handleUserInput('record voice message');
  }, [handleUserInput]);

  useVolumeButtons({
    onVolumeDownLongPress: handleOrbPress,
    onVolumeUpLongPress: handleVolumeUpRecord,
    enabled: true,
  });

  const handleGroupPillPress = (group: Group) => {
    navigation?.navigate('ChatRoom', { group });
  };

  const orbState = voiceState === 'listening'
    ? 'listening'
    : voiceState === 'processing'
      ? 'processing'
      : 'idle';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  // ── Render a conversation bubble ──
  const renderMessage = ({ item }: { item: ConversationEntry }) => {
    if (item.role === 'system') {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemPill}>
            <Text style={styles.systemIcon}>{'\u2713'}</Text>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>{item.text}</Text>
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      );
    }

    // Gossip bubble with two-tone accent bar
    return (
      <View style={styles.gossipRow}>
        <View style={styles.gossipBubbleWrapper}>
          <View style={styles.accentBarGradient}>
            <View style={styles.accentBarTop} />
            <View style={styles.accentBarBottom} />
          </View>
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
            <Text style={styles.timestampGossip}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const avatarColors = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];

  const headerTextShadowRadius = headerGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 22],
  });

  const inputBorderColor = inputGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(148, 163, 184, 0.12)', 'rgba(129, 140, 248, 0.5)'],
  });

  const inputShadowOpacity = inputGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <StarFieldBackground starCount={35} showRadialGlow={true}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Animated.Text style={[styles.headerTitle, { textShadowRadius: headerTextShadowRadius }]}>
              Gossip
            </Animated.Text>
            {backendAvailable && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <GlowingIconButton
              icon={'\uD83E\uDDEA'}
              onPress={() => setVoiceTestVisible(true)}
              size={40}
              glowColor="rgba(129, 140, 248, 0.2)"
            />
            <GlowingIconButton
              icon={'\u2699\uFE0F'}
              onPress={() => setSettingsVisible(true)}
              size={40}
              glowColor="rgba(148, 163, 184, 0.2)"
            />
          </View>
        </View>

        {/* ── Group Pills ── */}
        {groups.length > 0 && (
          <GlassCard style={styles.groupPillsGlass} intensity="low" noBorder>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupPillsContent}
            >
              {groups.slice(0, 10).map((g) => {
                const color = avatarColors[g.name.length % avatarColors.length];
                return (
                  <GroupPillItem
                    key={g.id}
                    group={g}
                    color={color}
                    onPress={handleGroupPillPress}
                  />
                );
              })}
            </ScrollView>
          </GlassCard>
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
          ListFooterComponent={isProcessing ? <TypingIndicator /> : null}
        />

        {/* ── Mic Orb + Waveform ── */}
        <View style={styles.orbArea}>
          {voiceState === 'listening' && (
            <View style={styles.orbWaveform}>
              <VoiceWaveform isActive={true} barCount={40} color="#818CF8" height={24} />
            </View>
          )}
          <GlowingMicOrb
            state={orbState}
            size={100}
            onPress={handleOrbPress}
          />
          <Text style={styles.orbLabel}>
            {voiceState === 'listening' ? 'Listening...' : 'Tap to command'}
          </Text>
        </View>

        {/* ── Text Input Fallback ── */}
        <Animated.View style={[
          styles.inputBar,
          {
            shadowColor: '#818CF8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: inputShadowOpacity,
            shadowRadius: 12,
          },
        ]}>
          <GlassCard style={styles.inputGlass} intensity="low" noBorder>
            <View style={styles.inputRow}>
              <Animated.View style={[styles.textInputWrapper, { borderColor: inputBorderColor }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Tell Gossip what to do..."
                  placeholderTextColor="rgba(148, 163, 184, 0.4)"
                  value={textInput}
                  onChangeText={setTextInput}
                  onSubmitEditing={handleTextSubmit}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  returnKeyType="send"
                />
              </Animated.View>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !textInput.trim() && styles.sendBtnDisabled,
                ]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.sendBtnText}>{'\u2192'}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Voice Test Panel ── */}
        <VoiceTestPanel
          visible={voiceTestVisible}
          onClose={() => setVoiceTestVisible(false)}
        />

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  aiBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // ── Group Pills ──
  groupPillsGlass: {
    marginHorizontal: 0,
    borderRadius: 0,
    padding: 0,
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
    shadowOffset: { width: 0, height: 0 },
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
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  userBubbleText: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 21,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(224, 231, 255, 0.35)',
    marginTop: 4,
    textAlign: 'right',
  },
  gossipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  gossipBubbleWrapper: {
    flexDirection: 'row',
    maxWidth: '85%',
  },
  accentBarGradient: {
    width: 3,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    overflow: 'hidden',
  },
  accentBarTop: {
    flex: 1,
    backgroundColor: '#818CF8',
  },
  accentBarBottom: {
    flex: 1,
    backgroundColor: '#34D399',
  },
  gossipBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
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
  timestampGossip: {
    fontSize: 10,
    color: 'rgba(226, 232, 240, 0.3)',
    marginTop: 4,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
  },
  systemIcon: {
    fontSize: 12,
    color: '#34D399',
  },
  systemText: {
    fontSize: 12,
    color: 'rgba(52, 211, 153, 0.7)',
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
  orbWaveform: {
    position: 'absolute',
    bottom: 38,
    zIndex: -1,
  },
  orbLabel: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.5)',
    marginTop: -8,
    letterSpacing: 0.3,
  },
  // ── Input Bar ──
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
  },
  inputGlass: {
    padding: 6,
    borderRadius: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInputWrapper: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 16,
    color: '#F1F5F9',
    fontSize: 15,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#818CF8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(129, 140, 248, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default MainTabsScreen;
