const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://your-app.up.railway.app'; // Replace with Railway URL after deploy

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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
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
