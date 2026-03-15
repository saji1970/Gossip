import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import ChatListScreen from '../screens/ChatListScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import InviteMembersScreen from '../screens/InviteMembersScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import TermsAgreementScreen from '../screens/TermsAgreementScreen';
import GroupCallScreen from '../screens/GroupCallScreen';
import FloatingMicButton from '../components/voice/FloatingMicButton';

type Screen = 'Login' | 'Register' | 'MainTabs' | 'ChatList' | 'CreateGroup' | 'InviteMembers' | 'ChatRoom' | 'GroupSettings' | 'TermsAgreement' | 'GroupCall';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen, params?: any) => void;
  params?: any;
}

// Screens where FloatingMicButton should be hidden
const HIDE_FAB_SCREENS: Screen[] = ['Login', 'Register', 'ChatRoom', 'GroupCall'];

const SimpleNavigator: React.FC<NavigationProps> = ({ currentScreen, onNavigate, params }) => {
  const navigation = {
    navigate: (screen: Screen, params?: any) => onNavigate(screen, params),
  };

  const route = { params };

  const showFab = !HIDE_FAB_SCREENS.includes(currentScreen);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return <LoginScreen navigation={navigation} />;
      case 'Register':
        return <RegisterScreen navigation={navigation} />;
      case 'MainTabs':
      case 'ChatList':
        return <ChatListScreen navigation={navigation} onRefresh={params?.refresh} />;
      case 'CreateGroup':
        return <CreateGroupScreen navigation={navigation} />;
      case 'InviteMembers':
        return <InviteMembersScreen navigation={navigation} route={route} />;
      case 'ChatRoom':
        return <ChatRoomScreen navigation={navigation} route={route} />;
      case 'GroupSettings':
        return <GroupSettingsScreen navigation={navigation} route={route} />;
      case 'TermsAgreement':
        return <TermsAgreementScreen navigation={navigation} route={route} />;
      case 'GroupCall':
        return <GroupCallScreen navigation={navigation} route={route} />;
      default:
        return <LoginScreen navigation={navigation} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      {showFab && (
        <FloatingMicButton
          onNavigate={(screen, navParams) => onNavigate(screen as Screen, navParams)}
          context={
            currentScreen === 'ChatList' || currentScreen === 'MainTabs' ? 'chat_list' :
            currentScreen === 'CreateGroup' ? 'create_group' :
            currentScreen === 'GroupSettings' ? 'settings' :
            'global'
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SimpleNavigator;
