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
import StarFieldBackground from '../../components/futuristic/StarFieldBackground';
import GlassCard from '../../components/futuristic/GlassCard';

interface RegisterScreenProps {
  navigation?: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (username.includes('@') || username.includes(' ')) {
      Alert.alert('Error', 'Username cannot contain @ or spaces');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { backendAuth } = await import('../../services/BackendAuthService');
      const result = await backendAuth.signUp(email.trim(), password, name.trim(), username.trim().toLowerCase());

      if (!result.success || !result.user) {
        setLoading(false);
        Alert.alert('Registration Error', result.error || 'Registration failed. Please try again.');
        return;
      }

      setLoading(false);
      Alert.alert(
        'Success',
        `Welcome to Gossip, ${result.user.displayName}! You can now login.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation) {
                navigation.navigate('Login');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Error', errorMessage);
    }
  };

  const handleBackToLogin = () => {
    if (navigation) {
      navigation.navigate('Login');
    }
  };

  return (
    <StarFieldBackground starCount={25} showRadialGlow={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Gossip</Text>
            <Text style={styles.subtitle}>Create Account</Text>
          </View>

          <GlassCard style={styles.formCard} intensity="medium">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username (e.g., johndoe)"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>Use this to login instead of email</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password (min 6 characters)"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </GlassCard>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleBackToLogin}>
            <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
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
    paddingTop: 70,
    paddingBottom: 30,
  },
  title: {
    fontSize: 42,
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
    marginBottom: 16,
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
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.4)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  registerButton: {
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
  registerButtonText: {
    color: '#818CF8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  loginButton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
  },
  loginButtonText: {
    color: 'rgba(129, 140, 248, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export { RegisterScreen };
