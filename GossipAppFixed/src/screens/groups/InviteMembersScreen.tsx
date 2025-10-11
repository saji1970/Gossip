/**
 * Invite Members Screen
 * Send invites to join a group by phone number
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import InviteService from '../../services/InviteService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

type InviteMembersRouteProp = RouteProp<{ params: { groupId: string; groupName: string } }, 'params'>;

export const InviteMembersScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<InviteMembersRouteProp>();
  const { groupId, groupName } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitesSent, setInvitesSent] = useState<string[]>([]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleSendInvite = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const invite = await InviteService.sendGroupInvite(groupId, phoneNumber);
      const inviteLink = InviteService.generateInviteLink(invite.inviteId);

      setInvitesSent([...invitesSent, phoneNumber]);
      setPhoneNumber('');

      Alert.alert(
        'Invite Sent!',
        `An invite has been sent to ${phoneNumber}. You can also share this link:\n\n${inviteLink}`,
        [
          {
            text: 'Send Another',
            style: 'default',
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Invite to {groupName}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.subtitle}>
            Enter a phone number to send an invite to join this group
          </Text>

          <View style={styles.inputContainer}>
            <Icon name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number (e.g., +1234567890)"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

          <Button
            title="Send Invite"
            onPress={handleSendInvite}
            loading={loading}
            style={styles.button}
          />
        </Card>

        {invitesSent.length > 0 && (
          <Card style={styles.sentCard}>
            <Text style={styles.sentTitle}>Invites Sent</Text>
            {invitesSent.map((phone, index) => (
              <View key={index} style={styles.sentItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.sentPhone}>{phone}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.infoBox}>
          <Icon name="info" size={20} color="#6366F1" />
          <Text style={styles.infoText}>
            When the recipient creates an account or logs in with this phone number, they will
            automatically be added to the group.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  card: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    marginTop: 8,
  },
  sentCard: {
    marginBottom: 20,
  },
  sentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sentPhone: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    marginLeft: 12,
    lineHeight: 20,
  },
});

