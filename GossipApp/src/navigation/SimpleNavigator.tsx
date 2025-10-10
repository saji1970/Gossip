import React, { useState } from 'react';
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

type Screen = 'Login' | 'Register' | 'MainTabs' | 'ChatList' | 'CreateGroup' | 'InviteMembers' | 'ChatRoom' | 'GroupSettings' | 'TermsAgreement' | 'GroupCall';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen, params?: any) => void;
  params?: any;
}

const SimpleNavigator: React.FC<NavigationProps> = ({ currentScreen, onNavigate, params }) => {
  const navigation = {
    navigate: (screen: Screen, params?: any) => onNavigate(screen, params),
  };

  const route = { params };

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

export default SimpleNavigator;
