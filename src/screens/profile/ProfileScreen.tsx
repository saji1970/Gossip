import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { authService } from '../../services/AuthService';
import { User, SecuritySettings } from '../../types';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    biometricAuth: false,
    autoLock: true,
    autoLockTimeout: 5,
    screenshotProtection: true,
    notificationPrivacy: true,
    dataRetention: 30,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              // Navigation will be handled by the AppNavigator
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change feature would be implemented here with proper security measures.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Are you absolutely sure? This will delete all your groups, messages, and data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    // Implement account deletion
                    Alert.alert('Feature Coming Soon', 'Account deletion will be implemented with proper data wiping.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfileSection = () => (
    <Card style={styles.profileCard}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Icon name="user" size={32} color="#6B7280" />
        </View>
        <TouchableOpacity style={styles.editAvatarButton}>
          <Icon name="camera" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.username}>{user?.username || 'Unknown User'}</Text>
        <Text style={styles.email}>{user?.email || 'No email'}</Text>
        {user?.phoneNumber && (
          <Text style={styles.phone}>{user.phoneNumber}</Text>
        )}
      </View>

      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {formatJoinDate(user?.createdAt || new Date())}
          </Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
      </View>
    </Card>
  );

  const renderSecuritySection = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Security & Privacy</Text>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="shield" size={20} color="#059669" />
          <Text style={styles.settingLabel}>Biometric Authentication</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="lock" size={20} color="#3B82F6" />
          <Text style={styles.settingLabel}>Change Password</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="eye-off" size={20} color="#EF4444" />
          <Text style={styles.settingLabel}>Screenshot Protection</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="trash-2" size={20} color="#F59E0B" />
          <Text style={styles.settingLabel}>Auto-Delete Messages</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderDataSection = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Data & Storage</Text>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="download" size={20} color="#3B82F6" />
          <Text style={styles.settingLabel}>Export Data</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="database" size={20} color="#6B7280" />
          <Text style={styles.settingLabel}>Storage Usage</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.valueText}>0 MB</Text>
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Icon name="refresh-cw" size={20} color="#F59E0B" />
          <Text style={styles.settingLabel}>Clear Cache</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderDangerSection = () => (
    <Card style={[styles.sectionCard, styles.dangerCard]}>
      <Text style={styles.sectionTitle}>Danger Zone</Text>

      <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
        <View style={styles.settingInfo}>
          <Icon name="trash-2" size={20} color="#EF4444" />
          <Text style={[styles.settingLabel, styles.dangerText]}>Delete Account</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#EF4444" />
      </TouchableOpacity>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Icon name="settings" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderSecuritySection()}
        {renderDataSection()}
        {renderDangerSection()}

        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionCard: {
    marginBottom: 20,
  },
  dangerCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  logoutSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    borderColor: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
