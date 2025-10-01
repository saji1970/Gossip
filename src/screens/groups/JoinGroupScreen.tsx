import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { groupService } from '../../services/GroupService';

export const JoinGroupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!code.trim()) {
      newErrors.code = 'Group code is required';
    } else if (!/^(SIS|BRO)-[A-Z0-9]{6}$/.test(code.toUpperCase())) {
      newErrors.code = 'Invalid group code format (e.g., SIS-ABC123 or BRO-XYZ789)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleJoinGroup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const approvalRequest = await groupService.joinGroupWithCode(
        code.toUpperCase().trim(),
        message.trim() || undefined
      );

      Alert.alert(
        'Join Request Sent',
        'Your request to join the group has been sent. You will be notified when it is approved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleScanCode = () => {
    // This would integrate with a QR code scanner
    Alert.alert('QR Scanner', 'QR code scanning feature would be implemented here');
  };

  const updateCode = (value: string) => {
    setCode(value.toUpperCase());
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Icon name="users" size={48} color="#6366F1" />
            <Text style={styles.title}>Join a Group</Text>
            <Text style={styles.subtitle}>
              Enter the group code to request joining a secure gossip group
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Input
              label="Group Code"
              placeholder="SIS-ABC123 or BRO-XYZ789"
              value={code}
              onChangeText={updateCode}
              autoCapitalize="characters"
              leftIcon="hash"
              error={errors.code}
            />

            <Input
              label="Message (Optional)"
              placeholder="Tell them why you want to join..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              leftIcon="message-square"
            />

            <Button
              title="Request to Join"
              onPress={handleJoinGroup}
              loading={loading}
              style={styles.joinButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Scan QR Code"
              onPress={handleScanCode}
              variant="outline"
              leftIcon="camera"
            />
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="info" size={20} color="#3B82F6" />
              <Text style={styles.infoTitle}>How it works</Text>
            </View>
            <Text style={styles.infoText}>
              1. Enter the group code provided by a group member{'\n'}
              2. Your request will be sent to group admins{'\n'}
              3. You'll be notified when your request is approved{'\n'}
              4. Once approved, you can start gossiping securely!
            </Text>
          </Card>

          <Card style={styles.securityCard}>
            <View style={styles.securityHeader}>
              <Icon name="shield" size={20} color="#059669" />
              <Text style={styles.securityTitle}>Security Features</Text>
            </View>
            <View style={styles.securityFeatures}>
              <View style={styles.securityFeature}>
                <Icon name="lock" size={16} color="#059669" />
                <Text style={styles.securityFeatureText}>End-to-end encryption</Text>
              </View>
              <View style={styles.securityFeature}>
                <Icon name="eye-off" size={16} color="#059669" />
                <Text style={styles.securityFeatureText}>Screenshot protection</Text>
              </View>
              <View style={styles.securityFeature}>
                <Icon name="clock" size={16} color="#059669" />
                <Text style={styles.securityFeatureText}>Auto-delete messages</Text>
              </View>
              <View style={styles.securityFeature}>
                <Icon name="user-check" size={16} color="#059669" />
                <Text style={styles.securityFeatureText}>Member approval required</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    marginBottom: 20,
  },
  joinButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  securityCard: {
    marginBottom: 40,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  securityFeatures: {
    gap: 8,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityFeatureText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
  },
});
