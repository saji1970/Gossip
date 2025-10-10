import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import SimpleNavigator from './src/navigation/SimpleNavigator';
import { AppProvider } from './src/context/AppContext';

type Screen = 'Login' | 'Register' | 'MainTabs' | 'ChatList' | 'CreateGroup' | 'InviteMembers' | 'ChatRoom' | 'GroupSettings' | 'TermsAgreement' | 'GroupCall';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [screenParams, setScreenParams] = useState<any>(null);

  const handleNavigate = (screen: Screen, params?: any) => {
    console.log('Navigating to:', screen, params);
    setCurrentScreen(screen);
    setScreenParams(params || null);
  };

  return (
    <AppProvider>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <SimpleNavigator 
        currentScreen={currentScreen} 
        onNavigate={handleNavigate}
        params={screenParams}
      />
    </AppProvider>
  );
};

export default App;