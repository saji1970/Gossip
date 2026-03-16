import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface ProfileSectionProps {
  expanded: boolean;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ expanded }) => {
  const { user, updateProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);

  if (!expanded || !user) return null;

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();

  const handleSave = async () => {
    if (displayName.trim().length < 1) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (/[@\s]/.test(username.trim())) {
      Alert.alert('Error', 'Username cannot contain spaces or @');
      return;
    }

    setSaving(true);
    const result = await updateProfile(displayName.trim(), username.trim());
    setSaving(false);

    if (result.success) {
      Alert.alert('Success', 'Profile updated');
      setEditing(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setDisplayName(user.displayName || '');
    setUsername(user.username || '');
    setEditing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.infoColumn}>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <Text style={styles.displayName}>{user.displayName}</Text>
              {user.username ? (
                <Text style={styles.username}>@{user.username}</Text>
              ) : null}
              <Text style={styles.email}>{user.email}</Text>
            </>
          )}
        </View>
      </View>

      {editing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  infoColumn: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  username: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  editButton: {
    backgroundColor: Colors.surfaceLight,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

export default ProfileSection;
