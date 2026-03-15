import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PersonalityTrait } from '../../modules/personality/types';
import { usePersonalityContext } from '../../context/PersonalityContext';
import { BorderRadius, Spacing } from '../../constants/theme';

const TRAIT_COLORS: Record<PersonalityTrait, string> = {
  sarcastic: '#F59E0B',
  dramatic: '#EC4899',
  curious: '#60A5FA',
  supportive: '#34D399',
  secretive: '#A78BFA',
  skeptical: '#FB923C',
};

interface PersonalityBadgeProps {
  speakerId: string;
}

const PersonalityBadge: React.FC<PersonalityBadgeProps> = ({ speakerId }) => {
  const { getProfile } = usePersonalityContext();
  const profile = getProfile(speakerId);

  if (!profile) return null;

  // Find top trait with score > 0.5
  let topTrait: PersonalityTrait | null = null;
  let topScore = 0.5;

  profile.personalityTraits.forEach((score, trait) => {
    if (score > topScore) {
      topScore = score;
      topTrait = trait;
    }
  });

  if (!topTrait) return null;

  const color = TRAIT_COLORS[topTrait];

  return (
    <View style={[styles.badge, { backgroundColor: color + '30', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{topTrait}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default PersonalityBadge;
