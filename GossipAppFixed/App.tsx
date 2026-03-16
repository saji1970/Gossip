import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, StyleSheet } from 'react-native';
import SimpleNavigator from './src/navigation/SimpleNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { PersonalityProvider } from './src/context/PersonalityContext';
import * as TTSService from './src/services/TTSService';

type Screen = 'Login' | 'Register' | 'MainTabs' | 'ChatList' | 'CreateGroup' | 'InviteMembers' | 'ChatRoom' | 'GroupSettings' | 'TermsAgreement' | 'GroupCall';

const ThemedStatusBar = () => {
  const { mode, colors } = useTheme();
  return (
    <StatusBar
      barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={colors.background}
    />
  );
};

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('APP COMPONENT MOUNTED');
    try {
      console.log('Testing Firebase connection...');
      console.log('Testing Firestore storage...');
      TTSService.initialize();
    } catch (err) {
      console.error('App initialization error:', err);
      setError(`App init error: ${err}`);
    }
  }, []);

  const handleNavigate = (screen: Screen, params?: any) => {
    console.log('Navigating to:', screen, params);
    setCurrentScreen(screen);
    setScreenParams(params || null);
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <PersonalityProvider>
          <ThemedStatusBar />
          <SimpleNavigator
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            params={screenParams}
          />
        </PersonalityProvider>
      </AppProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default App;
