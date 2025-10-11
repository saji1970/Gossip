import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, StyleSheet, Alert } from 'react-native';
import SimpleNavigator from './src/navigation/SimpleNavigator';
import { AppProvider } from './src/context/AppContext';

type Screen = 'Login' | 'Register' | 'MainTabs' | 'ChatList' | 'CreateGroup' | 'InviteMembers' | 'ChatRoom' | 'GroupSettings' | 'TermsAgreement' | 'GroupCall';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('App starting...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 APP COMPONENT MOUNTED');
    setDebugInfo('App component mounted successfully');
    
    // Test Firebase connection
    try {
      console.log('🔥 Testing Firebase connection...');
      setDebugInfo('Testing Firebase connection...');
      
      // Test AsyncStorage replacement
      console.log('📱 Testing Firestore storage...');
      setDebugInfo('Testing Firestore storage...');
      
    } catch (err) {
      console.error('❌ App initialization error:', err);
      setError(`App init error: ${err}`);
      setDebugInfo(`Error: ${err}`);
    }
  }, []);

  const handleNavigate = (screen: Screen, params?: any) => {
    console.log('🧭 Navigating to:', screen, params);
    setCurrentScreen(screen);
    setScreenParams(params || null);
    setDebugInfo(`Navigated to: ${screen}`);
  };

  const handleError = (error: any) => {
    console.error('❌ App Error:', error);
    setError(error.toString());
    setDebugInfo(`Error: ${error}`);
  };

  // Show debug info if there's an error or in debug mode
  if (error) {
    return (
      <View style={styles.debugContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#FF0000" />
        <Text style={styles.debugTitle}>🚨 DEBUG INFO - APP ERROR</Text>
        <Text style={styles.debugText}>Error: {error}</Text>
        <Text style={styles.debugText}>Debug Info: {debugInfo}</Text>
        <Text style={styles.debugText}>Screen: {currentScreen}</Text>
        <Text style={styles.debugText}>Time: {new Date().toLocaleTimeString()}</Text>
        <Text style={styles.debugSubtext}>
          📋 Copy this debug info to help diagnose the issue
        </Text>
      </View>
    );
  }

  return (
    <AppProvider>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      {/* Show debug info overlay in debug builds */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugOverlayText}>
          🔍 DEBUG: {debugInfo}
        </Text>
      </View>
      <SimpleNavigator 
        currentScreen={currentScreen} 
        onNavigate={handleNavigate}
        params={screenParams}
      />
    </AppProvider>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  debugTitle: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  debugText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  debugSubtext: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 5,
    borderRadius: 5,
    zIndex: 1000,
  },
  debugOverlayText: {
    color: '#00FF00',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default App;