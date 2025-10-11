import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { anonymousAuthService } from '../services/AnonymousAuthService';
import { User } from '../types';

// Ephemeral Screens
import EphemeralHomeScreen from '../screens/EphemeralHomeScreen';

import Icon from 'react-native-vector-icons/Feather';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

interface EphemeralTabsProps {
  user: User;
}

const EphemeralTabs: React.FC<EphemeralTabsProps> = ({ user }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Groups':
              iconName = 'users';
              break;
            case 'Messages':
              iconName = 'message-circle';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={EphemeralHomeScreen}
        options={{ 
          title: 'Ephemeral Network',
          tabBarBadge: undefined 
        }}
      />
      <Tab.Screen 
        name="Groups" 
        component={EphemeralHomeScreen}
        options={{ 
          title: 'Secret Groups',
          tabBarBadge: undefined 
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={EphemeralHomeScreen}
        options={{ 
          title: 'Messages',
          tabBarBadge: undefined 
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={EphemeralHomeScreen}
        options={{ 
          title: 'Anonymous Profile'
        }}
      />
    </Tab.Navigator>
  );
};

const EphemeralStack: React.FC<{ user: User }> = ({ user }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="EphemeralTabs">
        {() => <EphemeralTabs user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export const EphemeralNavigator: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    initializeEphemeralApp();
  }, []);

  const initializeEphemeralApp = async () => {
    try {
      // Get current anonymous user
      const currentUser = await anonymousAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error initializing ephemeral app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // App.tsx handles the loading screen
  }

  if (!user) {
    return null; // App.tsx handles the initialization error
  }

  return (
    <NavigationContainer>
      <EphemeralStack user={user} />
    </NavigationContainer>
  );
};

