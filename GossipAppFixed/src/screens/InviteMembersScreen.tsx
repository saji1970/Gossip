import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Group, GroupMember } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';

interface InviteMembersScreenProps {
  navigation?: any;
  route?: any;
}

const InviteMembersScreen: React.FC<InviteMembersScreenProps> = ({ navigation, route }) => {
  const { user, updateGroup, getGroupById } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<GroupMember[]>(group?.members || []);

  useEffect(() => {
    if (groupId) {
      const currentGroup = getGroupById(groupId);
      if (currentGroup) {
        setGroup(currentGroup);
        setMembers(currentGroup.members);
      }
    }
  }, [groupId]);

  const handleAddMember = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (members.find(m => m.email === email.trim())) {
      Alert.alert('Error', 'This member is already in the group');
      return;
    }

    const isUserAdmin = group?.members.find(m => m.email === user?.email)?.role === 'admin';
    const requiresApproval = group?.requireApproval && !isUserAdmin;

    const newMember = email.trim();
    const newMemberObj = {
      email: newMember,
      role: 'member' as const,
      status: (isUserAdmin ? 'approved' : (requiresApproval ? 'pending' : 'approved')) as const,
      joinedAt: new Date().toISOString(),
      approvedBy: isUserAdmin ? user?.email : undefined,
    };

    const updatedMembers = [...members, newMemberObj];
    setMembers(updatedMembers);

    if (group) {
      updateGroup(group.id, { members: updatedMembers });
    }

    setEmail('');
    
    const message = isUserAdmin
      ? `${newMember} has been added and approved!`
      : requiresApproval
      ? `Invite sent to ${newMember}. Waiting for approval.`
      : `${newMember} has been invited and can join!`;
      
    Alert.alert('Success', message);
  };

  const handleRemoveMember = (memberEmail: string) => {
    const userEmail = user?.email || 'user@example.com';
    if (memberEmail === userEmail) {
      Alert.alert('Error', 'You cannot remove yourself from the group');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Remove ${memberEmail} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedMembers = members.filter(m => m.email !== memberEmail);
            setMembers(updatedMembers);
            if (group) {
              updateGroup(group.id, { members: updatedMembers });
            }
          },
        },
      ]
    );
  };

  const handleDone = () => {
    if (navigation) {
      navigation.navigate('ChatList', { refresh: Date.now() });
    }
  };

  const renderMember = ({ item }: { item: GroupMember }) => {
    const userEmail = user?.email || 'user@example.com';
    const isCurrentUser = item.email === userEmail;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{item.email[0].toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {isCurrentUser ? (
            <Text style={styles.youBadge}>You</Text>
          ) : (
            <TouchableOpacity onPress={() => handleRemoveMember(item.email)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Invite Members</Text>
          <Text style={styles.headerSubtitle}>{group?.name || 'Group'}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Add Member Section */}
      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Add New Member</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddMember}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members List */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>
          Members ({members.length})
        </Text>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item, index) => `${item.email}-${index}`}
          contentContainerStyle={styles.membersList}
        />
      </View>

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 2,
  },
  addSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    placeholderTextColor: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
  },
  membersList: {
    paddingTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberEmail: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  youBadge: {
    backgroundColor: '#EEF2FF',
    color: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  removeText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InviteMembersScreen;
