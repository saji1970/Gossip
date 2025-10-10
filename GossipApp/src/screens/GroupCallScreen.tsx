import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { Group, GroupMember } from '../utils/GroupStorage';

interface GroupCallScreenProps {
  navigation?: any;
  route?: any;
}

const GroupCallScreen: React.FC<GroupCallScreenProps> = ({ navigation, route }) => {
  const group: Group | undefined = route?.params?.group;
  const callType: 'voice' | 'video' = route?.params?.callType || 'voice';
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (group) {
      const approvedMembers = group.members.filter(m => m.status === 'approved');
      setParticipants(approvedMembers);
    }

    // Start call timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [group]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('ChatRoom', { group });
          },
        },
      ]
    );
  };

  const renderParticipant = ({ item }: { item: GroupMember }) => (
    <View style={styles.participant}>
      <View style={styles.participantAvatar}>
        <Text style={styles.participantAvatarText}>{item.email[0].toUpperCase()}</Text>
      </View>
      <Text style={styles.participantName} numberOfLines={1}>
        {item.email.split('@')[0]}
      </Text>
      <View style={[styles.participantStatus, styles.participantActive]}>
        <Text style={styles.participantStatusText}>●</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.groupName}>{group?.name || 'Group Call'}</Text>
        <Text style={styles.callType}>
          {callType === 'voice' ? '📞 Voice Call' : '📹 Video Call'}
        </Text>
        <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Participants Grid */}
      <View style={styles.participantsContainer}>
        <Text style={styles.participantsTitle}>
          {participants.length} Participants
        </Text>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.email}
          numColumns={3}
          contentContainerStyle={styles.participantsGrid}
        />
      </View>

      {/* Call Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
              onPress={() => setIsVideoOff(!isVideoOff)}
            >
              <Text style={styles.controlIcon}>{isVideoOff ? '📷' : '📹'}</Text>
              <Text style={styles.controlLabel}>{isVideoOff ? 'Camera Off' : 'Camera On'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => Alert.alert('Speaker', 'Speaker mode toggled')}
          >
            <Text style={styles.controlIcon}>🔊</Text>
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => Alert.alert('More', 'Additional options')}
          >
            <Text style={styles.controlIcon}>⋯</Text>
            <Text style={styles.controlLabel}>More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <Text style={styles.endCallIcon}>📵</Text>
          <Text style={styles.endCallText}>End Call</Text>
        </TouchableOpacity>
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callInfoText}>
          🔐 End-to-end encrypted
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  callDuration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  participantsContainer: {
    flex: 1,
    padding: 20,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  participantsGrid: {
    paddingBottom: 20,
  },
  participant: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 24,
    maxWidth: '33.33%',
  },
  participantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  participantAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  participantName: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 4,
  },
  participantStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  participantActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  participantStatusText: {
    fontSize: 12,
    color: '#10B981',
  },
  controls: {
    padding: 20,
    backgroundColor: '#111827',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  controlButtonActive: {
    backgroundColor: '#374151',
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  controlLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  endCallIcon: {
    fontSize: 24,
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  callInfo: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  callInfoText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default GroupCallScreen;
