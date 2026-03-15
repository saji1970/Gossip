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
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { usePersonalityContext } from '../context/PersonalityContext';
import SpeakerInsightCard from '../components/personality/SpeakerInsightCard';

interface GroupSettingsScreenProps {
  navigation?: any;
  route?: any;
}

const GroupSettingsScreen: React.FC<GroupSettingsScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById, updateMemberRole, getPendingApprovals, approveMember, rejectMember, updateGroup } = useApp();
  const { allProfiles } = usePersonalityContext();
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
      case 'admin': return Colors.danger;
      case 'approver': return Colors.warning;
      default: return Colors.textMuted;
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
        <Text style={{ color: Colors.textPrimary }}>Group not found</Text>
      </View>
    );
  }

  const approvedMembers = group.members.filter(m => m.status === 'approved');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.backTouchable}>
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
                [{ text: 'OK' }]
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
              <Text style={styles.addMemberButtonText}>Add Members Directly</Text>
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

        {/* Member Insights */}
        {allProfiles.filter(p => p.conversationCount > 0).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Member Insights</Text>
            {allProfiles
              .filter(p => p.conversationCount > 0)
              .map(profile => (
                <SpeakerInsightCard key={profile.id} profile={profile} />
              ))}
          </View>
        )}

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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 50,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backTouchable: {
    paddingVertical: Spacing.sm,
  },
  backButton: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
    padding: Spacing.xl,
  },
  groupAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  groupAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
  },
  groupName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  groupDescription: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  groupMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  privacyBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  privateBadge: {
    backgroundColor: Colors.surfaceLight,
  },
  privacyBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  termsBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  termsBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 72,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.white,
  },
  memberStatus: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  manageButton: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  manageButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  youBadgeText: {
    color: Colors.info,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    minHeight: 72,
  },
  pendingText: {
    fontSize: 14,
    color: Colors.warning,
    fontStyle: 'italic',
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  rejectButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 72,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  termsBox: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  termsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    color: Colors.danger,
    fontSize: 18,
    fontWeight: '600',
  },
  inviteCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    minHeight: 72,
  },
  inviteCodeIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  inviteCodeInfo: {
    flex: 1,
  },
  inviteCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  inviteCodeDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  inviteCodeCopy: {
    fontSize: 22,
  },
  addMemberButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  addMemberButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GroupSettingsScreen;
