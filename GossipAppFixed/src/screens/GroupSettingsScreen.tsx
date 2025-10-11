import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { Group, GroupMember } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';

interface GroupSettingsScreenProps {
  navigation?: any;
  route?: any;
}

const GroupSettingsScreen: React.FC<GroupSettingsScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById, updateMemberRole, getPendingApprovals, approveMember, rejectMember, updateGroup } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [pendingApprovals, setPendingApprovals] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (groupId) {
      const currentGroup = getGroupById(groupId);
      if (currentGroup) {
        setGroup(currentGroup);
        setPendingApprovals(getPendingApprovals(groupId));
      }
    }
  }, [groupId]);

  const isAdmin = group?.members.find(m => m.email === user?.email)?.role === 'admin';

  const handleMakeApprover = (member: GroupMember) => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only admins can assign approvers');
      return;
    }

    Alert.alert(
      'Make Approver',
      `Make ${member.email} an approver? They will be able to approve new members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Approver',
          onPress: () => {
            if (group) {
              updateMemberRole(group.id, member.email, 'approver');
              Alert.alert('Success', `${member.email} is now an approver`);
              // Refresh group data
              const updatedGroup = getGroupById(group.id);
              if (updatedGroup) setGroup(updatedGroup);
            }
          },
        },
      ]
    );
  };

  const handleMakeAdmin = (member: GroupMember) => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only admins can assign other admins');
      return;
    }

    Alert.alert(
      'Make Admin',
      `Make ${member.email} an admin? They will have full control over the group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Admin',
          onPress: () => {
            if (group) {
              updateMemberRole(group.id, member.email, 'admin');
              Alert.alert('Success', `${member.email} is now an admin`);
              const updatedGroup = getGroupById(group.id);
              if (updatedGroup) setGroup(updatedGroup);
            }
          },
        },
      ]
    );
  };

  const handleMakeMember = (member: GroupMember) => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only admins can change roles');
      return;
    }

    Alert.alert(
      'Change Role',
      `Change ${member.email} back to regular member?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: () => {
            if (group) {
              updateMemberRole(group.id, member.email, 'member');
              Alert.alert('Success', `${member.email} is now a regular member`);
              const updatedGroup = getGroupById(group.id);
              if (updatedGroup) setGroup(updatedGroup);
            }
          },
        },
      ]
    );
  };

  const handleApproveMember = (member: GroupMember) => {
    if (group && user) {
      approveMember(group.id, member.email, user.email);
      Alert.alert('Success', `${member.email} has been approved`);
      const updatedGroup = getGroupById(group.id);
      if (updatedGroup) {
        setGroup(updatedGroup);
        setPendingApprovals(getPendingApprovals(group.id));
      }
    }
  };

  const handleRejectMember = (member: GroupMember) => {
    Alert.alert(
      'Reject Member',
      `Reject ${member.email}'s request to join?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            if (group) {
              rejectMember(group.id, member.email);
              Alert.alert('Rejected', `${member.email} has been rejected`);
              const updatedGroup = getGroupById(group.id);
              if (updatedGroup) {
                setGroup(updatedGroup);
                setPendingApprovals(getPendingApprovals(group.id));
              }
            }
          },
        },
      ]
    );
  };

  const handleToggleApproval = () => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only admins can change group settings');
      return;
    }

    if (group) {
      const newValue = !group.requireApproval;
      updateGroup(group.id, { requireApproval: newValue });
      setGroup({ ...group, requireApproval: newValue });
      Alert.alert(
        'Settings Updated',
        `Member approval is now ${newValue ? 'required' : 'not required'}`
      );
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return '#EF4444';
      case 'approver': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const renderMember = ({ item }: { item: GroupMember }) => {
    const isCurrentUser = item.email === user?.email;
    const canModify = isAdmin && !isCurrentUser;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{item.email[0].toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <View style={styles.memberMeta}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
              <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
            </View>
            <Text style={styles.memberStatus}>• {item.status}</Text>
          </View>
        </View>
        {canModify && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Manage Member',
                `Choose an action for ${item.email}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Make Admin', onPress: () => handleMakeAdmin(item) },
                  { text: 'Make Approver', onPress: () => handleMakeApprover(item) },
                  { text: 'Make Member', onPress: () => handleMakeMember(item) },
                ]
              );
            }}
            style={styles.manageButton}
          >
            <Text style={styles.manageButtonText}>Manage</Text>
          </TouchableOpacity>
        )}
        {isCurrentUser && (
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>You</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPendingMember = ({ item }: { item: GroupMember }) => (
    <View style={styles.pendingItem}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{item.email[0].toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberEmail}>{item.email}</Text>
        <Text style={styles.pendingText}>Waiting for approval</Text>
      </View>
      <View style={styles.approvalButtons}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveMember(item)}
        >
          <Text style={styles.approveButtonText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectMember(item)}
        >
          <Text style={styles.rejectButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Group not found</Text>
      </View>
    );
  }

  const approvedMembers = group.members.filter(m => m.status === 'approved');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView>
        {/* Group Info */}
        <View style={styles.section}>
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>{group.name[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          <View style={styles.groupMeta}>
            <View style={[styles.privacyBadge, group.privacy === 'private' && styles.privateBadge]}>
              <Text style={styles.privacyBadgeText}>
                {group.privacy === 'private' ? '🔒 Private' : '🌐 Public'}
              </Text>
            </View>
            {group.termsAndConditions && (
              <View style={styles.termsBadge}>
                <Text style={styles.termsBadgeText}>📜 Has Terms</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Approvals ({pendingApprovals.length})
            </Text>
            <FlatList
              data={pendingApprovals}
              renderItem={renderPendingMember}
              keyExtractor={(item) => item.email}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Invite Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Members</Text>
          <TouchableOpacity
            style={styles.inviteCodeButton}
            onPress={() => {
              const inviteCode = `GOSSIP-${group.id.slice(-6).toUpperCase()}`;
              Alert.alert(
                'Invite Code',
                `Share this code to invite members:\n\n${inviteCode}\n\nGroup: ${group.name}\nType: ${group.privacy === 'private' ? 'Private' : 'Public'}`,
                [
                  { text: 'OK' }
                ]
              );
            }}
          >
            <Text style={styles.inviteCodeIcon}>🔗</Text>
            <View style={styles.inviteCodeInfo}>
              <Text style={styles.inviteCodeTitle}>Share Invite Code</Text>
              <Text style={styles.inviteCodeDescription}>
                GOSSIP-{group.id.slice(-6).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.inviteCodeCopy}>📋</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={() => navigation.navigate('InviteMembers', { group })}
            >
              <Text style={styles.addMemberButtonText}>➕ Add Members Directly</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Group Settings (Admin Only) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Settings</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleToggleApproval}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Require Member Approval</Text>
                <Text style={styles.settingDescription}>
                  New members need approval from admins/approvers
                </Text>
              </View>
              <View style={[styles.toggle, group.requireApproval && styles.toggleActive]}>
                <View style={[styles.toggleThumb, group.requireApproval && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {group.termsAndConditions && (
              <View style={styles.termsBox}>
                <Text style={styles.termsTitle}>📜 Terms & Conditions</Text>
                <Text style={styles.termsText}>{group.termsAndConditions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members ({approvedMembers.length})
          </Text>
          <FlatList
            data={approvedMembers}
            renderItem={renderMember}
            keyExtractor={(item) => item.email}
            scrollEnabled={false}
          />
        </View>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => {
                Alert.alert(
                  'Delete Group',
                  'Are you sure you want to delete this group? This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        // Delete functionality
                        Alert.alert('Coming Soon', 'Group deletion will be implemented');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.dangerButtonText}>Delete Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 20,
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  groupAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  groupMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  privacyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  privateBadge: {
    backgroundColor: '#FEF3C7',
  },
  privacyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  termsBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  termsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
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
  },
  memberEmail: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  manageButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  youBadgeText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#6366F1',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  termsBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  inviteCodeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  inviteCodeInfo: {
    flex: 1,
  },
  inviteCodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 4,
  },
  inviteCodeDescription: {
    fontSize: 14,
    color: '#6366F1',
    fontFamily: 'monospace',
  },
  inviteCodeCopy: {
    fontSize: 20,
  },
  addMemberButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addMemberButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupSettingsScreen;
