/**
 * Settings Screen
 * Manage local data and app settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { LocalUserState, AppSettings } from '../types';
import {
  clearAllChatHistories,
  clearUserProfile,
  getSettings,
  saveSettings,
} from '../utils/storage';
import { signOut } from '../modules/auth/authService';
import { getAvatarById } from '../utils/avatars';

interface SettingsScreenProps {
  profile: LocalUserState;
  onBack: () => void;
  onReset: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onBack,
  onReset,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    saveMessagesLocally: true,
    notificationsEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await getSettings();
    setSettings(saved);
  };

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'This will delete all locally saved messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllChatHistories();
            Alert.alert('Success', 'Chat history cleared');
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will sign you out and delete all local data. You will need to set up a new profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllChatHistories();
            await clearUserProfile();
            await signOut();
            onReset();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <Text style={styles.avatar}>{getAvatarById(profile.avatar)?.emoji || '👤'}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.displayName || 'Anonymous'}
              </Text>
              <Text style={styles.profileId}>
                ID: {profile.anonId.substring(0, 16)}...
              </Text>
              {profile.gender && (
                <Text style={styles.profileGender}>
                  Gender: {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace('-', ' ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Save Messages Locally</Text>
              <Text style={styles.settingDescription}>
                Keep chat history on your device
              </Text>
            </View>
            <Switch
              value={settings.saveMessagesLocally}
              onValueChange={(v) => updateSetting('saveMessagesLocally', v)}
              trackColor={{ false: '#555', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable push notifications
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSetting('notificationsEnabled', v)}
              trackColor={{ false: '#555', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Privacy Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 Your privacy is protected:{'\n\n'}
              • Anonymous identity only{'\n'}
              • No phone number or email stored{'\n'}
              • Messages auto-delete after 10 seconds{'\n'}
              • No server-side chat history{'\n'}
              • Local data only on your device
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleClearHistory}>
            <Text style={styles.actionButtonText}>Clear Chat History</Text>
            <Text style={styles.actionButtonIcon}>🗑️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleResetApp}
          >
            <Text style={[styles.actionButtonText, styles.dangerText]}>
              Reset App
            </Text>
            <Text style={styles.actionButtonIcon}>⚠️</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GossipIn v1.0.0{'\n'}
            Ephemeral Gossip Network{'\n'}
            Privacy by Design
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
  },
  backText: {
    fontSize: 28,
    color: '#4CAF50',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 12,
  },
  avatar: {
    fontSize: 48,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  profileGender: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  dangerText: {
    color: '#ff5252',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SettingsScreen;

