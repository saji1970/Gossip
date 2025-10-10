import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';

interface TermsAgreementScreenProps {
  navigation?: any;
  route?: any;
}

const TermsAgreementScreen: React.FC<TermsAgreementScreenProps> = ({ navigation, route }) => {
  const { user, updateGroup, getGroupById } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [agreed, setAgreed] = useState(false);

  const handleAgree = () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please check the box to agree to the terms');
      return;
    }

    if (group && user) {
      // Add user to group as pending (if approval required) or approved
      const memberStatus = group.requireApproval ? 'pending' : 'approved';
      const updatedMembers = [
        ...group.members,
        {
          email: user.email,
          role: 'member' as const,
          status: memberStatus as const,
          joinedAt: new Date().toISOString(),
        }
      ];

      updateGroup(group.id, { members: updatedMembers });

      const message = group.requireApproval
        ? 'Your request to join has been sent for approval'
        : 'You have successfully joined the group!';

      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('ChatList');
          },
        },
      ]);
    }
  };

  const handleDisagree = () => {
    Alert.alert(
      'Decline Terms',
      'You cannot join this group without agreeing to the terms and conditions.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('ChatList');
          },
        },
      ]
    );
  };

  if (!group || !group.termsAndConditions) {
    return (
      <View style={styles.container}>
        <Text>No terms to display</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Group Info */}
        <View style={styles.groupInfo}>
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>{group.name[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
        </View>

        {/* Terms Content */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>📜 Group Terms & Conditions</Text>
          <Text style={styles.termsText}>{group.termsAndConditions}</Text>
        </View>

        {/* Agreement Checkbox */}
        <TouchableOpacity
          style={styles.agreementContainer}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkboxIcon}>✓</Text>}
          </View>
          <Text style={styles.agreementText}>
            I have read and agree to the terms and conditions
          </Text>
        </TouchableOpacity>

        {/* Info Box */}
        {group.requireApproval && (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              After agreeing, your request will be sent to group admins for approval
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.agreeButton, !agreed && styles.disabledButton]}
          onPress={handleAgree}
          disabled={!agreed}
        >
          <Text style={styles.agreeButtonText}>
            {group.requireApproval ? 'Agree & Request to Join' : 'Agree & Join Group'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disagreeButton} onPress={handleDisagree}>
          <Text style={styles.disagreeButtonText}>Disagree & Cancel</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
  },
  groupInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  termsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  termsText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  agreementContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 12,
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
  agreementText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
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
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  agreeButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  agreeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disagreeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  disagreeButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TermsAgreementScreen;
