import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
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
import { GroupSettings } from '../../types';

export const CreateGroupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    codeType: 'sis' as 'sis' | 'bro',
  });
  const [settings, setSettings] = useState<GroupSettings>({
    approvalRequired: true,
    minApprovals: 2,
    maxMembers: 50,
    allowInvites: true,
    messageRetention: 30,
    allowFileSharing: true,
    allowScreenshots: false,
    autoDeleteMessages: false,
    autoDeleteAfter: 24,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    }

    if (settings.minApprovals < 1 || settings.minApprovals > 10) {
      newErrors.minApprovals = 'Minimum approvals must be between 1 and 10';
    }

    if (settings.maxMembers < 2 || settings.maxMembers > 100) {
      newErrors.maxMembers = 'Maximum members must be between 2 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateGroup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const group = await groupService.createGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        codeType: formData.codeType,
        settings,
      });

      Alert.alert(
        'Group Created Successfully',
        `Your ${formData.codeType.toUpperCase()} group "${group.name}" has been created with code: ${group.code}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (key: keyof GroupSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear error when user changes the value
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const renderCodeTypeSelector = () => (
    <View style={styles.codeTypeContainer}>
      <Text style={styles.label}>Group Type</Text>
      <View style={styles.codeTypeOptions}>
        <TouchableOpacity
          style={[
            styles.codeTypeOption,
            formData.codeType === 'sis' && styles.codeTypeOptionActive,
          ]}
          onPress={() => setFormData(prev => ({ ...prev, codeType: 'sis' }))}
        >
          <Icon name="heart" size={24} color={formData.codeType === 'sis' ? '#EC4899' : '#9CA3AF'} />
          <Text style={[
            styles.codeTypeText,
            formData.codeType === 'sis' && styles.codeTypeTextActive,
          ]}>
            SIS CODE
          </Text>
          <Text style={styles.codeTypeDescription}>
            For close female friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.codeTypeOption,
            formData.codeType === 'bro' && styles.codeTypeOptionActive,
          ]}
          onPress={() => setFormData(prev => ({ ...prev, codeType: 'bro' }))}
        >
          <Icon name="users" size={24} color={formData.codeType === 'bro' ? '#3B82F6' : '#9CA3AF'} />
          <Text style={[
            styles.codeTypeText,
            formData.codeType === 'bro' && styles.codeTypeTextActive,
          ]}>
            BRO CODE
          </Text>
          <Text style={styles.codeTypeDescription}>
            For close male friends
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettings = () => (
    <Card style={styles.settingsCard}>
      <Text style={styles.sectionTitle}>Group Settings</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Require Approval</Text>
          <Text style={styles.settingDescription}>
            New members need approval to join
          </Text>
        </View>
        <Switch
          value={settings.approvalRequired}
          onValueChange={(value) => updateSettings('approvalRequired', value)}
          trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
          thumbColor={settings.approvalRequired ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      {settings.approvalRequired && (
        <Input
          label="Minimum Approvals Required"
          placeholder="2"
          value={settings.minApprovals.toString()}
          onChangeText={(value) => updateSettings('minApprovals', parseInt(value) || 2)}
          keyboardType="numeric"
          error={errors.minApprovals}
        />
      )}

      <Input
        label="Maximum Members"
        placeholder="50"
        value={settings.maxMembers.toString()}
        onChangeText={(value) => updateSettings('maxMembers', parseInt(value) || 50)}
        keyboardType="numeric"
        error={errors.maxMembers}
      />

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Allow File Sharing</Text>
          <Text style={styles.settingDescription}>
            Members can share images and files
          </Text>
        </View>
        <Switch
          value={settings.allowFileSharing}
          onValueChange={(value) => updateSettings('allowFileSharing', value)}
          trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
          thumbColor={settings.allowFileSharing ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Screenshot Protection</Text>
          <Text style={styles.settingDescription}>
            Block screenshots and screen recording
          </Text>
        </View>
        <Switch
          value={settings.allowScreenshots}
          onValueChange={(value) => updateSettings('allowScreenshots', !value)}
          trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
          thumbColor={!settings.allowScreenshots ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Auto-Delete Messages</Text>
          <Text style={styles.settingDescription}>
            Messages automatically delete after specified time
          </Text>
        </View>
        <Switch
          value={settings.autoDeleteMessages}
          onValueChange={(value) => updateSettings('autoDeleteMessages', value)}
          trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
          thumbColor={settings.autoDeleteMessages ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Input
              label="Group Name"
              placeholder="Enter group name"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              leftIcon="users"
              error={errors.name}
            />

            <Input
              label="Description (Optional)"
              placeholder="Enter group description"
              value={formData.description}
              onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
              multiline
              numberOfLines={3}
              leftIcon="message-square"
            />

            {renderCodeTypeSelector()}
          </Card>

          {renderSettings()}

          <Button
            title="Create Group"
            onPress={handleCreateGroup}
            loading={loading}
            style={styles.createButton}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  codeTypeContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  codeTypeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  codeTypeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  codeTypeOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F4FF',
  },
  codeTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 4,
  },
  codeTypeTextActive: {
    color: '#6366F1',
  },
  codeTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  settingsCard: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  createButton: {
    marginBottom: 40,
  },
});
