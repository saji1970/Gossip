import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { anonymousAuthService } from '../services/AnonymousAuthService';
import { ephemeralGroupService } from '../services/EphemeralGroupService';
import { ephemeralMessageService } from '../services/EphemeralMessageService';
import { User, Group } from '../types';

/**
 * Ephemeral Gossip Network - Home Screen
 * 
 * Demonstrates the core features:
 * - Anonymous user profile (anonId, avatar, displayName)
 * - Secret group creation with rules
 * - Group joining with rule agreement
 * - Ephemeral messaging
 */
const EphemeralHomeScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [hasAgreedToRules, setHasAgreedToRules] = useState(false);

  useEffect(() => {
    loadUserData();
    loadGroups();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const userGroups = await ephemeralGroupService.getUserGroups();
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroupName.trim() || !newGroupRules.trim()) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const group = await ephemeralGroupService.createGroup({
        groupName: newGroupName.trim(),
        rules: newGroupRules.trim(),
      });

      setGroups([...groups, group]);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupRules('');
      
      Alert.alert('Success', `Group "${group.groupName}" created successfully!`);
    } catch (error) {
      Alert.alert('Error', `Failed to create group: ${error}`);
    }
  };

  const handleJoinGroup = async () => {
    try {
      if (!joinGroupId.trim()) {
        Alert.alert('Error', 'Please enter a group ID');
        return;
      }

      if (!hasAgreedToRules) {
        Alert.alert('Error', 'You must agree to the group rules to join');
        return;
      }

      const group = await ephemeralGroupService.joinGroup(joinGroupId.trim(), true);
      setGroups([...groups, group]);
      setShowJoinGroup(false);
      setJoinGroupId('');
      setHasAgreedToRules(false);
      
      Alert.alert('Success', `Joined group "${group.groupName}" successfully!`);
    } catch (error) {
      Alert.alert('Error', `Failed to join group: ${error}`);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const newDisplayName = await promptForDisplayName();
      if (newDisplayName !== null) {
        const updatedUser = await anonymousAuthService.updateProfile({
          displayName: newDisplayName.trim() || undefined,
        });
        setUser(updatedUser);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to update profile: ${error}`);
    }
  };

  const promptForDisplayName = (): Promise<string | null> => {
    return new Promise((resolve) => {
      Alert.prompt(
        'Update Display Name',
        'Enter a new display name (optional):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Update', onPress: (text) => resolve(text || '') },
        ],
        'plain-text',
        user?.displayName || ''
      );
    });
  };

  const renderGroupRules = (group: Group) => {
    return (
      <Modal visible={true} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Group Rules</Text>
            <Text style={styles.modalSubtitle}>{group.groupName}</Text>
            <ScrollView style={styles.rulesContainer}>
              <Text style={styles.rulesText}>{group.rules}</Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowJoinGroup(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.agreeButton]}
                onPress={() => {
                  setHasAgreedToRules(true);
                  setShowJoinGroup(false);
                }}
              >
                <Text style={styles.buttonText}>I Agree and Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading anonymous profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ephemeral Gossip Network</Text>
        <Text style={styles.subtitle}>Privacy by Design, Zero Data Logging</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Anonymous Profile</Text>
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>{user.avatar}</Text>
          <View style={styles.profileInfo}>
            <Text style={styles.anonId}>ID: {user.anonId}</Text>
            {user.displayName && (
              <Text style={styles.displayName}>{user.displayName}</Text>
            )}
            <Text style={styles.lastActive}>
              Last active: {user.lastActive.toLocaleString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile}>
          <Text style={styles.updateButtonText}>Update Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.groupsSection}>
        <Text style={styles.sectionTitle}>Secret Groups</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={() => setShowCreateGroup(true)}
          >
            <Text style={styles.buttonText}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={() => setShowJoinGroup(true)}
          >
            <Text style={styles.buttonText}>Join Group</Text>
          </TouchableOpacity>
        </View>

        {groups.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <Text style={styles.groupName}>{group.groupName}</Text>
            <Text style={styles.groupInfo}>
              Members: {group.memberIds.length} | Created: {group.createdAt.toLocaleDateString()}
            </Text>
            <Text style={styles.groupRules} numberOfLines={2}>
              Rules: {group.rules}
            </Text>
          </View>
        ))}
      </View>

      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Secret Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Group Name"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TextInput
              style={[styles.input, styles.rulesInput]}
              placeholder="Group Rules (Markdown/Text)"
              value={newGroupRules}
              onChangeText={setNewGroupRules}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCreateGroup(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.buttonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Group Modal */}
      <Modal visible={showJoinGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Secret Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Group ID"
              value={joinGroupId}
              onChangeText={setJoinGroupId}
            />
            <TouchableOpacity
              style={[styles.button, styles.joinButton]}
              onPress={() => setShowJoinGroup(false)}
            >
              <Text style={styles.buttonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  profileSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  profileCard: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    fontSize: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  anonId: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  lastActive: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  updateButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  groupsSection: {
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  groupCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  groupInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  groupRules: {
    fontSize: 12,
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  rulesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#666',
    flex: 1,
    marginRight: 10,
  },
  agreeButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 10,
  },
  rulesContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  rulesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default EphemeralHomeScreen;

