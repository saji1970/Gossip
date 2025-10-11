import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { groupService } from '../../services/GroupService';
import { authService } from '../../services/AuthService';
import { ApprovalRequest, Group, User } from '../../types';

export const ApprovalRequestsScreen: React.FC = () => {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [groups, setGroups] = useState<Map<string, Group>>(new Map());
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requests, userGroups] = await Promise.all([
        groupService.getPendingApprovalRequests(),
        groupService.getUserGroups(),
      ]);

      setApprovalRequests(requests);

      // Create groups map for quick lookup
      const groupsMap = new Map<string, Group>();
      for (const group of userGroups) {
        groupsMap.set(group.id, group);
      }
      setGroups(groupsMap);

      // Load user data for requesters (in a real app, you'd have a user service)
      const usersMap = new Map<string, User>();
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        usersMap.set(currentUser.id, currentUser);
      }
      setUsers(usersMap);
    } catch (error) {
      console.error('Error loading approval requests:', error);
      Alert.alert('Error', 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string, vote: 'approve' | 'reject', comment?: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await groupService.approveMember(requestId, vote, comment);
      
      // Remove the request from the list
      setApprovalRequests(prev => prev.filter(req => req.id !== requestId));
      
      Alert.alert(
        'Success',
        `Request ${vote === 'approve' ? 'approved' : 'rejected'} successfully`
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatRequestTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getRequesterName = (requesterId: string) => {
    const user = users.get(requesterId);
    return user ? user.username : `User ${requesterId.slice(-6)}`;
  };

  const getVoteCounts = (request: ApprovalRequest) => {
    const approveVotes = request.approvers.filter(a => a.vote === 'approve').length;
    const rejectVotes = request.approvers.filter(a => a.vote === 'reject').length;
    return { approveVotes, rejectVotes };
  };

  const renderApprovalRequest = ({ item: request }: { item: ApprovalRequest }) => {
    const group = groups.get(request.groupId);
    const requesterName = getRequesterName(request.requesterId);
    const { approveVotes, rejectVotes } = getVoteCounts(request);
    const isProcessing = processingRequests.has(request.id);

    if (!group) return null;

    return (
      <Card style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.requesterName}>{requesterName}</Text>
            <Text style={styles.groupName}>wants to join "{group.name}"</Text>
          </View>
          <Text style={styles.requestTime}>
            {formatRequestTime(request.requestedAt)}
          </Text>
        </View>

        {request.message && (
          <View style={styles.requestMessage}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>
        )}

        <View style={styles.voteInfo}>
          <View style={styles.voteCount}>
            <Icon name="thumbs-up" size={16} color="#059669" />
            <Text style={styles.voteCountText}>{approveVotes} approve</Text>
          </View>
          <View style={styles.voteCount}>
            <Icon name="thumbs-down" size={16} color="#EF4444" />
            <Text style={styles.voteCountText}>{rejectVotes} reject</Text>
          </View>
          <Text style={styles.minApprovalsText}>
            Need {group.settings.minApprovals} approvals
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            title="Approve"
            onPress={() => handleApprove(request.id, 'approve')}
            variant="primary"
            size="small"
            loading={isProcessing}
            style={StyleSheet.flatten([styles.actionButton, styles.approveButton])}
          />
          <Button
            title="Reject"
            onPress={() => handleApprove(request.id, 'reject')}
            variant="danger"
            size="small"
            loading={isProcessing}
            style={StyleSheet.flatten([styles.actionButton, styles.rejectButton])}
          />
        </View>

        {request.approvers.length > 0 && (
          <View style={styles.votesList}>
            <Text style={styles.votesLabel}>Votes:</Text>
            {request.approvers.map((vote, index) => (
              <View key={index} style={styles.voteItem}>
                <Icon
                  name={vote.vote === 'approve' ? 'thumbs-up' : 'thumbs-down'}
                  size={14}
                  color={vote.vote === 'approve' ? '#059669' : '#EF4444'}
                />
                <Text style={styles.voteText}>
                  {getRequesterName(vote.userId)} {vote.vote}d
                </Text>
                {vote.comment && (
                  <Text style={styles.voteComment}>"{vote.comment}"</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="user-check" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Pending Requests</Text>
      <Text style={styles.emptyDescription}>
        All approval requests have been processed. You'll be notified when new requests come in.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading approval requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Approval Requests</Text>
        <Text style={styles.headerSubtitle}>
          {approvalRequests.length} pending request{approvalRequests.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={approvalRequests}
        renderItem={renderApprovalRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
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
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  requestCard: {
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  groupName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestMessage: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  voteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCountText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  minApprovalsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  votesList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  votesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voteText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  voteComment: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
