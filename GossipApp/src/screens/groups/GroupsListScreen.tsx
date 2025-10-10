import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { groupService } from '../../services/GroupService';
import { authService } from '../../services/AuthService';
import { Group, User } from '../../types';

export const GroupsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, userGroups] = await Promise.all([
        authService.getCurrentUser(),
        groupService.getUserGroups(),
      ]);
      
      setUser(userData);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup' as never);
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup' as never);
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('ChatScreen' as never, { groupId: group.id } as never);
  };

  const handleInviteMembers = (group: Group, event: any) => {
    event?.stopPropagation();
    navigation.navigate('InviteMembers' as never, { 
      groupId: group.id, 
      groupName: group.name 
    } as never);
  };

  const getGroupMemberCount = (group: Group) => {
    return group.members.filter(member => member.status === 'approved').length;
  };

  const getLastActivity = (group: Group) => {
    const activeMembers = group.members.filter(member => member.status === 'approved');
    if (activeMembers.length === 0) return 'No activity';
    
    // Filter out members with invalid lastActive dates and convert to timestamps
    const validLastActiveTimes = activeMembers
      .map(member => {
        if (!member.lastActive) return null;
        const date = member.lastActive instanceof Date ? member.lastActive : new Date(member.lastActive);
        return isNaN(date.getTime()) ? null : date.getTime();
      })
      .filter(time => time !== null);
    
    if (validLastActiveTimes.length === 0) return 'No recent activity';
    
    const lastActive = Math.max(...validLastActiveTimes);
    
    const now = Date.now();
    const diff = now - lastActive;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const renderGroupItem = ({ item: group }: { item: Group }) => {
    const memberCount = getGroupMemberCount(group);
    const lastActivity = getLastActivity(group);
    
    return (
      <Card
        style={styles.groupCard}
        onPress={() => handleGroupPress(group)}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupCode}>{group.code}</Text>
          </View>
          <Icon
            name={group.codeType === 'sis' ? 'heart' : 'users'}
            size={24}
            color={group.codeType === 'sis' ? '#EC4899' : '#3B82F6'}
          />
        </View>
        
        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        )}
        
        <View style={styles.groupStats}>
          <View style={styles.stat}>
            <Icon name="users" size={16} color="#6B7280" />
            <Text style={styles.statText}>{memberCount} members</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="clock" size={16} color="#6B7280" />
            <Text style={styles.statText}>{lastActivity}</Text>
          </View>
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={(e) => handleInviteMembers(group, e)}
          >
            <Icon name="user-plus" size={16} color="#6366F1" />
            <Text style={styles.inviteText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="message-circle" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptyDescription}>
        Create a new group or join an existing one to start gossiping securely
      </Text>
      <View style={styles.emptyActions}>
        <Button
          title="Create Group"
          onPress={handleCreateGroup}
          style={styles.emptyButton}
        />
        <Button
          title="Join Group"
          onPress={handleJoinGroup}
          variant="outline"
          style={styles.emptyButton}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Groups</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {user?.username || 'User'}!
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Icon name="user" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={handleCreateGroup}>
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  groupCard: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupCode: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  inviteText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    minWidth: 120,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
