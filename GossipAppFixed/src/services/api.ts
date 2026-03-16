import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://gossip-production-179e.up.railway.app';

const TOKEN_KEY = 'gossip_auth_token';

// ── Token management ──────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ── Request helper ────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated: boolean = false,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Auth types ────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
  token?: string;
}

// ── Auth endpoints ────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  displayName: string,
  username: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, username }),
  });
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password }),
  });
}

export async function getMe(): Promise<{ success: boolean; user?: User }> {
  return request<{ success: boolean; user?: User }>('/auth/me', {}, true);
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function updateProfile(
  displayName?: string,
  username?: string,
): Promise<{ success: boolean; user?: User; error?: string }> {
  return request<{ success: boolean; user?: User; error?: string }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ displayName, username }),
  }, true);
}

// ── Group types ───────────────────────────────────────────────────

export interface GroupMember {
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  approvedBy?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  privacy: string;
  termsAndConditions?: string;
  requireApproval: boolean;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
}

// ── Group endpoints ───────────────────────────────────────────────

export async function getGroups(): Promise<Group[]> {
  const res = await request<{ groups: Group[] }>('/groups', {}, true);
  return res.groups;
}

export async function createGroup(data: {
  name: string;
  description?: string;
  privacy?: string;
  termsAndConditions?: string;
  requireApproval?: boolean;
  members?: Array<{ email: string; role?: string; status?: string }>;
}): Promise<Group> {
  const res = await request<{ group: Group }>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true);
  return res.group;
}

export async function updateGroup(
  groupId: string,
  updates: Record<string, any>,
): Promise<Group> {
  const res = await request<{ group: Group }>(`/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, true);
  return res.group;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await request(`/groups/${groupId}`, {
    method: 'DELETE',
  }, true);
}

export async function updateMemberRole(
  groupId: string,
  memberEmail: string,
  role: string,
): Promise<void> {
  await request(`/groups/${groupId}/member-role`, {
    method: 'PUT',
    body: JSON.stringify({ memberEmail, role }),
  }, true);
}

export async function approveMember(
  groupId: string,
  memberEmail: string,
  approverEmail: string,
): Promise<void> {
  await request(`/groups/${groupId}/approve-member`, {
    method: 'PUT',
    body: JSON.stringify({ memberEmail, approverEmail }),
  }, true);
}

export async function rejectMember(
  groupId: string,
  memberEmail: string,
): Promise<void> {
  await request(`/groups/${groupId}/reject-member`, {
    method: 'PUT',
    body: JSON.stringify({ memberEmail }),
  }, true);
}

// ── Message types ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  isOwnMessage: boolean;
  timestamp: string;
  messageType?: 'text' | 'voice';
  audioFilePath?: string;
  audioDurationMs?: number;
  whisperTo?: string;
}

// ── Message endpoints ─────────────────────────────────────────────

export async function getMessages(
  groupId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<ChatMessage[]> {
  const res = await request<{ messages: ChatMessage[] }>(
    `/groups/${groupId}/messages?limit=${limit}&offset=${offset}`,
    {},
    true,
  );
  return res.messages;
}

export async function sendMessage(
  groupId: string,
  senderName: string,
  content: string,
  isOwnMessage: boolean = true,
): Promise<ChatMessage> {
  const res = await request<{ message: ChatMessage }>('/messages', {
    method: 'POST',
    body: JSON.stringify({ groupId, senderName, content, isOwnMessage }),
  }, true);
  return res.message;
}

// ── Voice message endpoints ──────────────────────────────────────

export async function sendVoiceMessage(
  groupId: string,
  audioUri: string,
  durationMs: number,
  senderName: string,
  whisperTo?: string[],
): Promise<ChatMessage> {
  const token = await getToken();
  const form = new FormData();

  form.append('audio', {
    uri: audioUri,
    type: 'audio/mp4',
    name: 'voice_message.m4a',
  } as any);
  form.append('groupId', groupId);
  form.append('senderName', senderName);
  form.append('durationMs', durationMs.toString());
  if (whisperTo && whisperTo.length > 0) {
    form.append('whisperTo', JSON.stringify(whisperTo));
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/messages/voice`, {
    method: 'POST',
    body: form,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.message;
}

export function getAudioUrl(messageId: string): string {
  return `${API_BASE_URL}/audio/${messageId}`;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await request(`/messages/${messageId}`, {
    method: 'DELETE',
  }, true);
}

// ── AI endpoints (unchanged) ──────────────────────────────────────

interface AnalysisResponse {
  speaker: string;
  transcript: string;
  emotion: string;
  emotion_confidence: number;
  sarcasm: boolean;
  topic: string;
  topic_id: string | null;
  personality_traits: Record<string, number>;
  reply_suggestions: string[];
}

interface PersonalityResponse {
  id: string;
  name: string | null;
  conversation_count: number;
  trait_scores: Record<string, number>;
  top_topics: Record<string, number>;
  emotion_distribution: Record<string, number>;
  speech_styles: string[];
  badge_traits: string[];
}

interface TrendingTopic {
  topic_id: string;
  label: string;
  message_count: number;
  last_seen: number;
}

export async function analyzeMessage(
  text: string,
  groupId: string,
  senderId: string,
  senderName?: string,
): Promise<AnalysisResponse> {
  return request<AnalysisResponse>('/message/analyze', {
    method: 'POST',
    body: JSON.stringify({
      text,
      group_id: groupId,
      sender_id: senderId,
      sender_name: senderName,
    }),
  });
}

export async function processVoice(
  audioUri: string,
  groupId: string,
  senderId?: string,
  senderName?: string,
): Promise<AnalysisResponse> {
  const form = new FormData();

  form.append('audio', {
    uri: audioUri,
    type: 'audio/wav',
    name: 'recording.wav',
  } as any);
  form.append('group_id', groupId);
  if (senderId) form.append('sender_id', senderId);
  if (senderName) form.append('sender_name', senderName);

  const res = await fetch(`${API_BASE_URL}/voice/process`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getPersonality(
  userId: string,
): Promise<PersonalityResponse> {
  return request<PersonalityResponse>(`/personality/${userId}`);
}

export async function getTrendingTopics(
  limit: number = 10,
): Promise<TrendingTopic[]> {
  return request<TrendingTopic[]>(`/topics/trending?limit=${limit}`);
}

export async function getReplySuggestions(
  text: string,
  emotion: string,
  topic: string,
  speakerTraits: Record<string, number> = {},
  count: number = 5,
): Promise<string[]> {
  const res = await request<{ suggestions: string[] }>('/reply/suggestions', {
    method: 'POST',
    body: JSON.stringify({
      text,
      emotion,
      topic,
      speaker_traits: speakerTraits,
      count,
    }),
  });
  return res.suggestions;
}

export async function healthCheck(): Promise<boolean> {
  try {
    await request<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
}

export type {
  AnalysisResponse,
  PersonalityResponse,
  TrendingTopic,
};
