import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FriendProfile, PersonalityTrait } from '../../modules/personality/types';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { getTopTopics } from '../../modules/personality/TopicExtractor';

const TRAIT_COLORS: Record<PersonalityTrait, string> = {
  sarcastic: '#F59E0B',
  dramatic: '#EC4899',
  curious: '#60A5FA',
  supportive: '#34D399',
  secretive: '#A78BFA',
  skeptical: '#FB923C',
};

const EMOTION_COLORS: Record<string, string> = {
  excitement: '#FB923C',
  sarcasm: '#F59E0B',
  anger: '#F87171',
  curiosity: '#60A5FA',
  surprise: '#EC4899',
  amusement: '#34D399',
  neutral: '#64748B',
};

interface SpeakerInsightCardProps {
  profile: FriendProfile;
}

const SpeakerInsightCard: React.FC<SpeakerInsightCardProps> = ({ profile }) => {
  // Get top 3 traits sorted by score
  const topTraits = Array.from(profile.personalityTraits.entries())
    .filter(([, score]) => score > 0.15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topTopics = getTopTopics(profile.topics, 3);

  // Get top emotions for the dot display
  const topEmotions = Array.from(profile.emotionDistribution.entries())
    .filter(([, pct]) => pct > 0.05)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <View style={styles.card}>
      {/* Avatar + Name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.msgCount}>
            {profile.conversationCount} message{profile.conversationCount !== 1 ? 's' : ''} analyzed
          </Text>
        </View>
      </View>

      {/* Trait Badges */}
      {topTraits.length > 0 && (
        <View style={styles.traitsRow}>
          {topTraits.map(([trait, score]) => {
            const color = TRAIT_COLORS[trait as PersonalityTrait] || Colors.textMuted;
            return (
              <View
                key={trait}
                style={[styles.traitBadge, { backgroundColor: color + '30', borderColor: color }]}
              >
                <Text style={[styles.traitText, { color }]}>{trait}</Text>
                <Text style={[styles.traitScore, { color }]}>
                  {Math.round(score * 100)}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Top Topics */}
      {topTopics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Top Topics</Text>
          {topTopics.map(([topic, count]) => (
            <View key={topic} style={styles.topicRow}>
              <Text style={styles.topicText}>{topic}</Text>
              <Text style={styles.topicCount}>{count}x</Text>
            </View>
          ))}
        </View>
      )}

      {/* Emotion Distribution */}
      {topEmotions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Emotions</Text>
          <View style={styles.emotionBar}>
            {topEmotions.map(([emotion, pct]) => {
              const color = EMOTION_COLORS[emotion] || Colors.textMuted;
              const width = Math.max(pct * 100, 8);
              return (
                <View
                  key={emotion}
                  style={[styles.emotionSegment, { backgroundColor: color, flex: width }]}
                />
              );
            })}
          </View>
          <View style={styles.emotionLabels}>
            {topEmotions.map(([emotion, pct]) => {
              const color = EMOTION_COLORS[emotion] || Colors.textMuted;
              return (
                <View key={emotion} style={styles.emotionLabel}>
                  <View style={[styles.emotionDot, { backgroundColor: color }]} />
                  <Text style={styles.emotionLabelText}>
                    {emotion} {Math.round(pct * 100)}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Speech Style */}
      {profile.speechStyle.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Style</Text>
          <Text style={styles.styleText}>
            {profile.speechStyle.map(s => s.replace(/_/g, ' ')).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  msgCount: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  traitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  traitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  traitScore: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },
  section: {
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  topicText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  topicCount: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  emotionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  emotionSegment: {
    borderRadius: 4,
  },
  emotionLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emotionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  emotionLabelText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  styleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default SpeakerInsightCard;
