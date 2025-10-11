/**
 * Home Screen
 * Shows joined groups + discover public groups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Group, LocalUserState } from '../types';
import { getUserGroups, getPublicGroups } from '../modules/groups/groupService';
import { getAvatarById } from '../utils/avatars';

interface HomeScreenProps {
  profile: LocalUserState;
  onCreateGroup: () => void;
  onOpenGroup: (group: Group) => void;
  onSettings: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  onCreateGroup,
  onOpenGroup,
  onSettings,
}) => {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = async () => {
    try {
      const [userGroups, discoveredGroups] = await Promise.all([
        getUserGroups(profile.anonId),
        getPublicGroups(),
      ]);

      setMyGroups(userGroups);
      
      // Filter out groups user is already in
      const filtered = discoveredGroups.filter(
        (g) => !userGroups.some((ug) => ug.groupId === g.groupId)
      );
      setPublicGroups(filtered);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [profile.anonId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const renderGroupCard = (group: Group, isJoined: boolean) => (
    <TouchableOpacity
      key={group.groupId}
      style={styles.groupCard}
      onPress={() => onOpenGroup(group)}
    >
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{group.groupName}</Text>
        <Text style={styles.groupType}>
          {group.type === 'public' ? '🌐' : '🔒'}
        </Text>
      </View>
      <Text style={styles.groupMeta}>
        {group.memberAnonIds.length} member{group.memberAnonIds.length !== 1 ? 's' : ''}
      </Text>
      {isJoined && <Text style={styles.joinedBadge}>Joined</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔐 GossipIn</Text>
          <Text style={styles.headerSubtitle}>
            {getAvatarById(profile.avatar)?.emoji || '👤'} {profile.displayName || 'Anonymous'}
          </Text>
        </View>
        <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* My Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          {myGroups.length === 0 ? (
            <Text style={styles.emptyText}>
              No groups yet. Join or create one!
            </Text>
          ) : (
            myGroups.map((group) => renderGroupCard(group, true))
          )}
        </View>

        {/* Discover */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Public Groups</Text>
          {publicGroups.length === 0 ? (
            <Text style={styles.emptyText}>
              No public groups available
            </Text>
          ) : (
            publicGroups.map((group) => renderGroupCard(group, false))
          )}
        </View>
      </ScrollView>

      {/* Create Group Button */}
      <TouchableOpacity style={styles.fab} onPress={onCreateGroup}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  groupCard: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  groupType: {
    fontSize: 18,
  },
  groupMeta: {
    fontSize: 14,
    color: '#888',
  },
  joinedBadge: {
    marginTop: 8,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
