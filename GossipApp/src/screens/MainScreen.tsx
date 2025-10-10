import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';

interface MainScreenProps {
  navigation?: any;
}

const MainScreen: React.FC<MainScreenProps> = ({ navigation }) => {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (navigation) {
              navigation.navigate('Login');
            }
          },
        },
      ]
    );
  };

  const handleFeature = (feature: string) => {
    Alert.alert('Feature', `${feature} functionality will be implemented next!`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎉 GossipIn</Text>
        <Text style={styles.subtitle}>Welcome to your secure messaging app</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <TouchableOpacity 
            style={styles.featureButton} 
            onPress={() => handleFeature('Chat')}
          >
            <Text style={styles.featureEmoji}>💬</Text>
            <Text style={styles.featureTitle}>Chat</Text>
            <Text style={styles.featureDescription}>Send secure messages</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureButton} 
            onPress={() => handleFeature('Groups')}
          >
            <Text style={styles.featureEmoji}>👥</Text>
            <Text style={styles.featureTitle}>Groups</Text>
            <Text style={styles.featureDescription}>Create and join groups</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureButton} 
            onPress={() => handleFeature('Voice Calls')}
          >
            <Text style={styles.featureEmoji}>📞</Text>
            <Text style={styles.featureTitle}>Voice Calls</Text>
            <Text style={styles.featureDescription}>Make secure voice calls</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureButton} 
            onPress={() => handleFeature('Settings')}
          >
            <Text style={styles.featureEmoji}>⚙️</Text>
            <Text style={styles.featureTitle}>Settings</Text>
            <Text style={styles.featureDescription}>App preferences</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>App Status</Text>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Authentication:</Text>
            <Text style={styles.statusValue}>✅ Working</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Navigation:</Text>
            <Text style={styles.statusValue}>✅ Working</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Standalone Build:</Text>
            <Text style={styles.statusValue}>✅ Working</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  featureButton: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statusValue: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
  },
});

export default MainScreen;
