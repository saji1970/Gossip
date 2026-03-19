import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import SimpleNavigator from './src/navigation/SimpleNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { PersonalityProvider } from './src/context/PersonalityContext';
import * as TTSService from './src/services/TTSService';
import { gossipBot } from './src/modules/gossip/GossipBot';

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

// Inner component that lives inside AppProvider and can use useApp()
const AppNavigator = () => {
  const { user, initialized } = useApp();
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [screenParams, setScreenParams] = useState<any>(null);

  // Once AppContext finishes loading, pick the initial screen
  useEffect(() => {
    if (!initialized) return;
    if (currentScreen !== null) return; // already set

    if (user) {
      console.log('User session restored, going to MainTabs');
      setCurrentScreen('MainTabs');
    } else {
      console.log('No session, showing Login');
      setCurrentScreen('Login');
    }
  }, [initialized]);

  // When user logs out (user becomes null after being set), go to Login
  useEffect(() => {
    if (!initialized) return;
    if (currentScreen === null) return;

    if (!user && currentScreen !== 'Login' && currentScreen !== 'Register') {
      setCurrentScreen('Login');
      setScreenParams(null);
    }
  }, [user]);

  const handleNavigate = (screen: Screen, params?: any) => {
    console.log('Navigating to:', screen, params);
    setCurrentScreen(screen);
    setScreenParams(params || null);
  };

  // Show loading while AppContext checks for stored token
  if (!initialized || currentScreen === null) {
    return (
      <View style={loadStyles.container}>
        <Text style={loadStyles.title}>Gossip</Text>
        <ActivityIndicator size="large" color="#818CF8" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SimpleNavigator
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      params={screenParams}
    />
  );
};

const loadStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#818CF8',
    letterSpacing: 2,
  },
});

const App = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('APP COMPONENT MOUNTED');
    try {
      TTSService.initialize();
      gossipBot.initialize();
    } catch (err) {
      console.error('App initialization error:', err);
      setError(`App init error: ${err}`);
    }
  }, []);

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
          <AppNavigator />
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
