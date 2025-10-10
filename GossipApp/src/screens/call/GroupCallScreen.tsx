import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { callService, GroupCall, CallParticipant } from '../../services/CallService';
import { authService } from '../../services/AuthService';
import { User } from '../../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const GroupCallScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { callId } = route.params as { callId: string };
  
  const [call, setCall] = useState<GroupCall | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const initializeCall = async () => {
    try {
      const [callData, userData] = await Promise.all([
        callService.getCurrentCall(),
        authService.getCurrentUser(),
      ]);

      if (!callData || callData.id !== callId) {
        Alert.alert('Error', 'Call not found');
        navigation.goBack();
        return;
      }

      setCall(callData);
      setUser(userData);
      setParticipants(callData.participants);
      setIsVideoEnabled(callData.callType === 'video');

      // Join the call
      await callService.joinCall(callId);

      // Start duration timer
      startDurationTimer();

      // Listen for call updates (in a real app, this would be through WebSocket or similar)
      const updateInterval = setInterval(() => {
        const currentCall = callService.getCurrentCall();
        if (currentCall) {
          setCall(currentCall);
          setParticipants(currentCall.participants);
        }
      }, 1000);

      return () => clearInterval(updateInterval);
    } catch (error) {
      console.error('Error initializing call:', error);
      Alert.alert('Error', 'Failed to join call');
      navigation.goBack();
    }
  };

  const startDurationTimer = () => {
    const startTime = Date.now();
    durationInterval.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      await callService.endCall();
      navigation.goBack();
    } catch (error) {
      console.error('Error ending call:', error);
      Alert.alert('Error', 'Failed to end call');
    }
  };

  const handleToggleMute = async () => {
    try {
      const newMuteState = await callService.toggleMute();
      setIsMuted(newMuteState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      const newVideoState = await callService.toggleVideo();
      setIsVideoEnabled(newVideoState);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const handleLeaveCall = async () => {
    try {
      await callService.leaveCall();
      navigation.goBack();
    } catch (error) {
      console.error('Error leaving call:', error);
      Alert.alert('Error', 'Failed to leave call');
    }
  };

  const renderParticipant = ({ item: participant }: { item: CallParticipant }) => {
    const isCurrentUser = participant.userId === user?.id;
    const isVideoCall = call?.callType === 'video';

    return (
      <View style={[
        styles.participantCard,
        isVideoCall && styles.videoParticipantCard,
        !participant.isConnected && styles.disconnectedParticipant
      ]}>
        {isVideoCall && participant.isVideoEnabled ? (
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>Video Stream</Text>
          </View>
        ) : (
          <View style={styles.avatarContainer}>
            {participant.avatar ? (
              <Text style={styles.avatarText}>
                {participant.username.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Icon name="user" size={32} color="#6B7280" />
            )}
          </View>
        )}
        
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {participant.username}
            {isCurrentUser && ' (You)'}
          </Text>
          <View style={styles.participantStatus}>
            {participant.isConnected ? (
              <>
                {participant.isMuted && <Icon name="mic-off" size={12} color="#EF4444" />}
                {isVideoCall && !participant.isVideoEnabled && (
                  <Icon name="video-off" size={12} color="#6B7280" />
                )}
                <Text style={styles.statusText}>
                  {participant.isConnected ? 'Connected' : 'Connecting...'}
                </Text>
              </>
            ) : (
              <Text style={[styles.statusText, styles.disconnectedText]}>
                Disconnected
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Connecting to call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.groupName}>{call.groupName}</Text>
          <Text style={styles.callType}>
            {call.callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>
        <View style={styles.durationContainer}>
          <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
        </View>
      </View>

      {/* Participants Grid */}
      <View style={styles.participantsContainer}>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.userId}
          numColumns={2}
          contentContainerStyle={styles.participantsGrid}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.mutedButton]}
            onPress={handleToggleMute}
          >
            <Icon
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color={isMuted ? "#FFFFFF" : "#1F2937"}
            />
          </TouchableOpacity>

          {call.callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.mutedButton]}
              onPress={handleToggleVideo}
            >
              <Icon
                name={isVideoEnabled ? "video" : "video-off"}
                size={24}
                color={!isVideoEnabled ? "#FFFFFF" : "#1F2937"}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.leaveButton]}
            onPress={handleLeaveCall}
          >
            <Icon name="phone-off" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endButton]}
            onPress={handleEndCall}
          >
            <Icon name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  callType: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  durationContainer: {
    backgroundColor: '#4B5563',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  participantsGrid: {
    paddingBottom: 20,
  },
  participantCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  videoParticipantCard: {
    aspectRatio: 1,
    maxHeight: 200,
  },
  disconnectedParticipant: {
    opacity: 0.5,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#4B5563',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantInfo: {
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
  },
  disconnectedText: {
    color: '#EF4444',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#374151',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedButton: {
    backgroundColor: '#EF4444',
  },
  leaveButton: {
    backgroundColor: '#F59E0B',
  },
  endButton: {
    backgroundColor: '#EF4444',
  },
});
