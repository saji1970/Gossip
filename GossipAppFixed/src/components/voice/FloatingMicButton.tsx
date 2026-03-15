import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import VoiceButton from './VoiceButton';
import VoiceCommandOverlay from './VoiceCommandOverlay';
import { useVoice } from '../../hooks/useVoice';
import { ScreenContext } from '../../modules/voice/VoiceCommandParser';

interface FloatingMicButtonProps {
  onNavigate: (screen: string, params?: any) => void;
  context?: ScreenContext;
}

const FloatingMicButton: React.FC<FloatingMicButtonProps> = ({
  onNavigate,
  context = 'global',
}) => {
  const { voiceState } = useVoice();
  const [overlayVisible, setOverlayVisible] = useState(false);

  const handlePress = () => {
    setOverlayVisible(true);
  };

  const handleCommand = (type: string, payload: string) => {
    switch (type) {
      case 'navigate':
        if (payload === 'chat' || payload === 'group' || payload === 'home') {
          onNavigate('ChatList');
        } else if (payload === 'setting') {
          // No dedicated settings screen in current nav
          onNavigate('ChatList');
        }
        break;
      case 'create_group':
        onNavigate('CreateGroup', payload ? { groupName: payload } : undefined);
        break;
      case 'open_chat':
        // In a real implementation, look up group by name
        onNavigate('ChatList');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <View style={styles.container}>
        <VoiceButton
          voiceState={overlayVisible ? voiceState : 'idle'}
          onPress={handlePress}
          size="small"
        />
      </View>

      <VoiceCommandOverlay
        visible={overlayVisible}
        onDismiss={() => setOverlayVisible(false)}
        onCommand={handleCommand}
        context={context}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    zIndex: 100,
  },
});

export default FloatingMicButton;
