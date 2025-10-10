import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Group } from '../utils/GroupStorage';

interface CreateGroupScreenProps {
  navigation?: any;
}

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation }) => {
  const { user, addGroup } = useApp();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    
    // Create and save the group
    setTimeout(() => {
      const userEmail = user?.email || 'user@example.com';
      const userName = user?.displayName || 'User';
      
      const newGroup: Group = {
        id: Date.now().toString(),
        name: groupName.trim(),
        description: groupDescription.trim(),
        privacy: privacy,
        termsAndConditions: termsAndConditions.trim() || undefined,
        requireApproval: requireApproval,
        members: [{
          email: userEmail,
          role: 'admin',
          status: 'approved',
          joinedAt: new Date().toISOString(),
        }],
        createdBy: userEmail,
        lastMessage: 'Group created',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      };

      addGroup(newGroup);

      setLoading(false);
      Alert.alert(
        'Success',
        `${privacy === 'private' ? 'Private' : 'Public'} group "${groupName}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation) {
                navigation.navigate('ChatList', { refresh: Date.now() });
              }
            },
          },
        ]
      );
    }, 500);
  };

  const handleCancel = () => {
    if (navigation) {
      navigation.navigate('ChatList');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>👥</Text>
            </View>
            <Text style={styles.avatarText}>Group Avatar</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this group about?"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Privacy Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Privacy</Text>
            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={[styles.privacyButton, privacy === 'public' && styles.privacyButtonActive]}
                onPress={() => setPrivacy('public')}
              >
                <Text style={[styles.privacyIcon, privacy === 'public' && styles.privacyIconActive]}>🌐</Text>
                <Text style={[styles.privacyText, privacy === 'public' && styles.privacyTextActive]}>
                  Public
                </Text>
                <Text style={styles.privacyDescription}>Anyone can join</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.privacyButton, privacy === 'private' && styles.privacyButtonActive]}
                onPress={() => setPrivacy('private')}
              >
                <Text style={[styles.privacyIcon, privacy === 'private' && styles.privacyIconActive]}>🔒</Text>
                <Text style={[styles.privacyText, privacy === 'private' && styles.privacyTextActive]}>
                  Private
                </Text>
                <Text style={styles.privacyDescription}>Invite only</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Terms & Conditions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add rules or terms for joining this group..."
              value={termsAndConditions}
              onChangeText={setTermsAndConditions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.helperText}>
              New members will see agree/disagree before joining
            </Text>
          </View>

          {/* Approval Requirement */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRequireApproval(!requireApproval)}
          >
            <View style={[styles.checkbox, requireApproval && styles.checkboxChecked]}>
              {requireApproval && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>Require approval for new members</Text>
              <Text style={styles.checkboxDescription}>
                Admins/approvers must approve before members can join
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              You'll be the admin and can add approvers after creating the group
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleCreateGroup}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Group'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#6366F1',
  },
  backButton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarIcon: {
    fontSize: 40,
  },
  avatarText: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  privacyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  privacyButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  privacyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  privacyIconActive: {
    transform: [{ scale: 1.1 }],
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  privacyTextActive: {
    color: '#6366F1',
  },
  privacyDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateGroupScreen;