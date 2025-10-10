import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { authService } from '../services/AuthService';
import { groupService } from '../services/GroupService';
import { messageService } from '../services/MessageService';
import InviteService from '../services/InviteService';
import { User } from '../types';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Main Screens
import { ChatHomeScreen } from '../screens/chat/ChatHomeScreen';
import { GroupsListScreen } from '../screens/groups/GroupsListScreen';
import { CreateGroupScreen as CreateGroupScreenNew } from '../screens/groups/CreateGroupScreen';
import { JoinGroupScreen } from '../screens/groups/JoinGroupScreen';
import { InviteMembersScreen } from '../screens/groups/InviteMembersScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { GroupCallScreen } from '../screens/call/GroupCallScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ApprovalRequestsScreen } from '../screens/approvals/ApprovalRequestsScreen';

// Legacy Screens (with full features)
import HomeScreen from '../screens/HomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EphemeralHomeScreen from '../screens/EphemeralHomeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

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
            case 'Chats':
              iconName = 'message-circle';
              break;
            case 'Groups':
              iconName = 'users';
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
        name="Chats" 
        component={ChatHomeScreen}
        options={{ tabBarBadge: undefined }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsListScreen}
        options={{ tabBarBadge: undefined }}
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

const AppStack: React.FC<{ user: User }> = ({ user }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs">
        {() => <MainTabs user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreenNew}
        options={{
          headerShown: true,
          title: 'Create Group',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          headerTintColor: '#1F2937',
        }}
      />
      <Stack.Screen 
        name="CreateGroupLegacy" 
        component={CreateGroupScreen}
        options={{
          headerShown: false,
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
        name="InviteMembers" 
        component={InviteMembersScreen}
        options={{
          headerShown: false,
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
      <Stack.Screen 
        name="GroupCall" 
        component={GroupCallScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="GroupChatLegacy" 
        component={GroupChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="EphemeralHome" 
        component={EphemeralHomeScreen}
        options={{
          headerShown: true,
          title: 'Ephemeral Chat',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          headerTintColor: '#1F2937',
        }}
      />
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  // Force show login screen for testing - disable all authentication logic
  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
};
