import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { authService } from '../services/AuthService';
import { groupService } from '../services/GroupService';
import { messageService } from '../services/MessageService';
import { User } from '../types';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Main Screens
import { GroupsListScreen } from '../screens/groups/GroupsListScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';
import { JoinGroupScreen } from '../screens/groups/JoinGroupScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ApprovalRequestsScreen } from '../screens/approvals/ApprovalRequestsScreen';

import Icon from 'react-native-vector-icons/Feather';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

interface MainTabsProps {
  user: User;
}

const MainTabs: React.FC<MainTabsProps> = ({ user }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Groups':
              iconName = 'users';
              break;
            case 'Chats':
              iconName = 'message-circle';
              break;
            case 'Approvals':
              iconName = 'user-check';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
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
        name="Groups" 
        component={GroupsListScreen}
        options={{ tabBarBadge: undefined }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatScreen}
        initialParams={{ groupId: null }}
      />
      <Tab.Screen 
        name="Approvals" 
        component={ApprovalRequestsScreen}
        options={{ tabBarBadge: undefined }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={() => <MainTabs user={{} as User} />} />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{
          headerShown: true,
          title: 'Create Group',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          headerTintColor: '#1F2937',
        }}
      />
      <Stack.Screen 
        name="JoinGroup" 
        component={JoinGroupScreen}
        options={{
          headerShown: true,
          title: 'Join Group',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          headerTintColor: '#1F2937',
        }}
      />
      <Stack.Screen 
        name="ChatScreen" 
        component={ChatScreen}
        options={{
          headerShown: true,
          title: 'Chat',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          headerTintColor: '#1F2937',
        }}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Load data from storage
      await Promise.all([
        groupService.loadGroupsFromStorage(),
        messageService.loadMessagesFromStorage(),
      ]);

      // Check authentication status
      const authenticated = await authService.isAuthenticated();
      const currentUser = await authService.getCurrentUser();

      setIsAuthenticated(authenticated);
      setUser(currentUser);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // You could show a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated && user ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
