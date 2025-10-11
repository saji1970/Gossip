/**
 * Profile Setup Screen
 * First-time registration with avatar, gender, and notification settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { AVATAR_OPTIONS, getRandomAvatar, getAvatarById, getAvatarsByCategory } from '../utils/avatars';
import { saveUserProfile, getUserProfile, saveSettings } from '../utils/storage';
import { LocalUserState, AppSettings } from '../types';

interface ProfileSetupScreenProps {
  onComplete: (profile: LocalUserState) => void;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ onComplete }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(getRandomAvatar());
  const [displayName, setDisplayName] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  const handleComplete = async () => {
    const profile = await getUserProfile();
    if (!profile) {
      console.error('No profile found');
      return;
    }

    const updatedProfile: LocalUserState = {
      ...profile,
      avatar: selectedAvatar,
      displayName: displayName.trim() || undefined,
      status: status.trim() || undefined,
      gender: gender || undefined,
      hasCompletedSetup: true,
      lastActive: Date.now(),
    };

    // Save notification settings
    const settings: AppSettings = {
      saveMessagesLocally: true,
      notificationsEnabled,
    };
    await saveSettings(settings);

    await saveUserProfile(updatedProfile);
    onComplete(updatedProfile);
  };

  const [selectedCategory, setSelectedCategory] = useState<'person' | 'animal' | 'character'>('person');
  const currentAvatars = getAvatarsByCategory(selectedCategory);
  const selectedAvatarData = getAvatarById(selectedAvatar);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔐 Welcome to GossipIn</Text>
        <Text style={styles.subtitle}>Create your anonymous profile</Text>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
          
          {/* Category Selection */}
          <View style={styles.categoryTabs}>
            <TouchableOpacity
              style={[styles.categoryTab, selectedCategory === 'person' && styles.categoryTabActive]}
              onPress={() => setSelectedCategory('person')}
            >
              <Text style={[styles.categoryTabText, selectedCategory === 'person' && styles.categoryTabTextActive]}>
                👥 People
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryTab, selectedCategory === 'animal' && styles.categoryTabActive]}
              onPress={() => setSelectedCategory('animal')}
            >
              <Text style={[styles.categoryTabText, selectedCategory === 'animal' && styles.categoryTabTextActive]}>
                🐾 Animals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryTab, selectedCategory === 'character' && styles.categoryTabActive]}
              onPress={() => setSelectedCategory('character')}
            >
              <Text style={[styles.categoryTabText, selectedCategory === 'character' && styles.categoryTabTextActive]}>
                🎭 Characters
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Avatar Display */}
          <View style={styles.selectedAvatarContainer}>
            <Text style={styles.selectedAvatar}>{selectedAvatarData?.emoji}</Text>
            <Text style={styles.selectedAvatarName}>{selectedAvatarData?.name}</Text>
          </View>

          {/* Avatar Grid */}
          <View style={styles.avatarGrid}>
            {currentAvatars.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar.id && styles.avatarOptionSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
              >
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                <Text style={styles.avatarLabel}>{avatar.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a pseudonym or leave blank
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Ghost123"
            placeholderTextColor="#666"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={20}
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Set your current status or mood
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Feeling curious today!"
            placeholderTextColor="#666"
            value={status}
            onChangeText={setStatus}
            maxLength={100}
            multiline
          />
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gender (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            This helps others understand your identity
          </Text>
          <View style={styles.genderOptions}>
            <TouchableOpacity
              style={[styles.genderOption, gender === 'male' && styles.genderOptionSelected]}
              onPress={() => setGender('male')}
            >
              <Text style={styles.genderEmoji}>👨</Text>
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderOption, gender === 'female' && styles.genderOptionSelected]}
              onPress={() => setGender('female')}
            >
              <Text style={styles.genderEmoji}>👩</Text>
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>
                Female
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderOption, gender === 'other' && styles.genderOptionSelected]}
              onPress={() => setGender('other')}
            >
              <Text style={styles.genderEmoji}>🧑</Text>
              <Text style={[styles.genderText, gender === 'other' && styles.genderTextSelected]}>
                Other
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderOption, gender === 'prefer-not-to-say' && styles.genderOptionSelected]}
              onPress={() => setGender('prefer-not-to-say')}
            >
              <Text style={styles.genderEmoji}>❓</Text>
              <Text style={[styles.genderText, gender === 'prefer-not-to-say' && styles.genderTextSelected]}>
                Prefer not to say
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Get notified about new messages and group updates
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#555', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>🔒 Privacy by Design</Text>
          <Text style={styles.privacyText}>
            • Your identity is completely anonymous{'\n'}
            • No phone number or email stored{'\n'}
            • Messages auto-delete after 10 seconds{'\n'}
            • Chat history stored locally only{'\n'}
            • Gender information is optional and private
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => {/* Navigate back or cancel */}}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleComplete}>
            <Text style={styles.buttonText}>Save Profile</Text>
          </TouchableOpacity>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  
  // Category tabs
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#4CAF50',
  },
  categoryTabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Selected avatar
  selectedAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedAvatar: {
    fontSize: 80,
    marginBottom: 8,
  },
  selectedAvatarName: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  
  // Avatar grid
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  avatarOption: {
    width: 70,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 8,
  },
  avatarOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a1e',
  },
  avatarEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  avatarLabel: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
  },
  
  // Input
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  
  // Gender options
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a1e',
  },
  genderEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  genderText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  
  // Settings
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
  
  // Privacy box
  privacyBox: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 30,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#555',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileSetupScreen;

