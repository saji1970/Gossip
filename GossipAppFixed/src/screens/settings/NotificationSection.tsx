import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import * as SettingsService from '../../services/SettingsService';
import * as NotificationService from '../../services/NotificationService';
import { useApp } from '../../context/AppContext';

interface NotificationSectionProps {
  expanded: boolean;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({ expanded }) => {
  const { user, groups } = useApp();
  const [enabled, setEnabled] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);

  useEffect(() => {
    if (expanded) {
      SettingsService.getNotificationSettings().then(settings => {
        setEnabled(settings.enabled);
        setSound(settings.sound);
        setVibration(settings.vibration);
      });
    }
  }, [expanded]);

  const handleEnabledChange = useCallback(async (val: boolean) => {
    setEnabled(val);
    await SettingsService.setNotificationSettings({ enabled: val });
    NotificationService.setEnabled(val);
    if (val && user && groups.length > 0) {
      NotificationService.startPolling(groups, user.email);
    } else if (!val) {
      NotificationService.stopPolling();
    }
  }, [user, groups]);

  const handleSoundChange = useCallback(async (val: boolean) => {
    setSound(val);
    await SettingsService.setNotificationSettings({ sound: val });
  }, []);

  const handleVibrationChange = useCallback(async (val: boolean) => {
    setVibration(val);
    await SettingsService.setNotificationSettings({ vibration: val });
  }, []);

  if (!expanded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={enabled}
          onValueChange={handleEnabledChange}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, !enabled && styles.disabled]}>Sound</Text>
        <Switch
          value={sound}
          onValueChange={handleSoundChange}
          disabled={!enabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, !enabled && styles.disabled]}>Vibration</Text>
        <Switch
          value={vibration}
          onValueChange={handleVibrationChange}
          disabled={!enabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  disabled: {
    color: Colors.textMuted,
  },
});

export default NotificationSection;
