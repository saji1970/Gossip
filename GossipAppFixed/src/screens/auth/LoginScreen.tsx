import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import StarFieldBackground from '../../components/futuristic/StarFieldBackground';
import GlassCard from '../../components/futuristic/GlassCard';

interface LoginScreenProps {
  navigation?: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser } = useApp();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { backendAuth } = await import('../../services/BackendAuthService');
      const result = await backendAuth.signIn(usernameOrEmail.trim(), password);

      if (!result.success || !result.user) {
        setLoading(false);
        Alert.alert('Login Error', result.error || 'Login failed. Please try again.');
        return;
      }

      setUser(result.user);

      setLoading(false);
      Alert.alert('Success', `Welcome back, ${result.user.displayName}!`, [
        {
          text: 'OK',
          onPress: () => {
            if (navigation) {
              navigation.navigate('MainTabs', { user: result.user });
            }
          },
        },
      ]);
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.message || 'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);
    }
  };

  const handleRegister = () => {
    if (navigation) {
      navigation.navigate('Register');
    }
  };

  return (
    <StarFieldBackground starCount={30} showRadialGlow={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoGlow} />
            <Text style={styles.title}>Gossip</Text>
            <Text style={styles.subtitle}>Welcome Back</Text>
          </View>

          <GlassCard style={styles.formCard} intensity="medium">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username or Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username or email"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={usernameOrEmail}
                onChangeText={setUsernameOrEmail}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </GlassCard>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </StarFieldBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 90,
    paddingBottom: 50,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
    top: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#818CF8',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(226, 232, 240, 0.5)',
    fontWeight: '400',
    marginTop: 8,
    letterSpacing: 1,
  },
  formCard: {
    marginHorizontal: 24,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(226, 232, 240, 0.7)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  loginButton: {
    backgroundColor: 'rgba(129, 140, 248, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#818CF8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    marginHorizontal: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'rgba(148, 163, 184, 0.3)',
    fontSize: 14,
  },
  registerButton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
  },
  registerButtonText: {
    color: 'rgba(129, 140, 248, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { LoginScreen };
