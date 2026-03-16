import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import VoiceCommandOverlay from '../../components/voice/VoiceCommandOverlay';

interface VoiceTrainingSectionProps {
  expanded: boolean;
}

interface CommandInfo {
  name: string;
  example: string;
  type: string;
}

interface CommandCategory {
  title: string;
  commands: CommandInfo[];
}

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    title: 'Messaging',
    commands: [
      { name: 'Send Message', example: 'Say hello everyone', type: 'send_message' },
      { name: 'Send Text', example: 'Send I\'ll be there soon', type: 'send_message' },
      { name: 'Whisper', example: 'Whisper to John that it\'s a surprise', type: 'whisper' },
    ],
  },
  {
    title: 'Navigation',
    commands: [
      { name: 'Go to Groups', example: 'Go to groups', type: 'navigate' },
      { name: 'Go to Chat', example: 'Open chats', type: 'navigate' },
      { name: 'Go to Settings', example: 'Show settings', type: 'navigate' },
    ],
  },
  {
    title: 'Groups',
    commands: [
      { name: 'Create Group', example: 'Create group Study Buddies', type: 'create_group' },
      { name: 'New Private Group', example: 'New group called Secret Club', type: 'create_group' },
      { name: 'Open Chat', example: 'Open chat with Study Buddies', type: 'open_chat' },
      { name: 'Call Group', example: 'Call', type: 'call_group' },
    ],
  },
  {
    title: 'Chat Actions',
    commands: [
      { name: 'Read Latest', example: 'Read the latest message', type: 'read_latest' },
      { name: 'Catch Me Up', example: 'Catch me up', type: 'read_unread' },
      { name: 'What Did I Miss', example: 'What did I miss', type: 'read_unread' },
      { name: 'Private Chat', example: 'Private chat with Alice', type: 'private_chat' },
    ],
  },
];

const TUTORIAL_STEPS: { instruction: string; expectedType: string; hint: string }[] = [
  { instruction: 'Try sending a message', expectedType: 'send_message', hint: 'Say "Say hello everyone"' },
  { instruction: 'Navigate to a screen', expectedType: 'navigate', hint: 'Say "Go to settings"' },
  { instruction: 'Create a group', expectedType: 'create_group', hint: 'Say "Create group My Team"' },
  { instruction: 'Read messages', expectedType: 'read_latest', hint: 'Say "Read the latest message"' },
  { instruction: 'Try a whisper', expectedType: 'whisper', hint: 'Say "Whisper to John hey there"' },
];

const VoiceTrainingSection: React.FC<VoiceTrainingSectionProps> = ({ expanded }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stepResult, setStepResult] = useState<'success' | 'retry' | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const toggleCategory = useCallback((title: string) => {
    setExpandedCategories(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const handleTryCommand = useCallback(() => {
    setOverlayVisible(true);
  }, []);

  const handleTutorialCommand = useCallback((type: string, _payload: string) => {
    const expected = TUTORIAL_STEPS[tutorialStep]?.expectedType;
    if (type === expected) {
      setStepResult('success');
    } else {
      setStepResult('retry');
    }
    setOverlayVisible(false);
  }, [tutorialStep]);

  const handleNextStep = useCallback(() => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(s => s + 1);
      setStepResult(null);
    } else {
      setTutorialActive(false);
      setTutorialStep(0);
      setStepResult(null);
    }
  }, [tutorialStep]);

  const startTutorial = useCallback(() => {
    setTutorialActive(true);
    setTutorialStep(0);
    setStepResult(null);
  }, []);

  if (!expanded) return null;

  return (
    <View style={styles.container}>
      {/* Tutorial Mode */}
      {tutorialActive ? (
        <View style={styles.tutorialCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((tutorialStep + (stepResult === 'success' ? 1 : 0)) / TUTORIAL_STEPS.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.tutorialInstruction}>
            {TUTORIAL_STEPS[tutorialStep].instruction}
          </Text>
          <Text style={styles.tutorialHint}>
            {TUTORIAL_STEPS[tutorialStep].hint}
          </Text>

          {stepResult === 'success' ? (
            <View style={styles.resultRow}>
              <Text style={styles.successText}>Correct!</Text>
              <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                <Text style={styles.nextButtonText}>
                  {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Finish'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : stepResult === 'retry' ? (
            <View style={styles.resultRow}>
              <Text style={styles.retryText}>Not quite — try again</Text>
              <TouchableOpacity style={styles.tryButton} onPress={handleTryCommand}>
                <Text style={styles.tryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.micButton} onPress={handleTryCommand}>
              <Text style={styles.micButtonIcon}>{'\u{1F3A4}'}</Text>
              <Text style={styles.micButtonText}>Tap to Speak</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setTutorialActive(false)}>
            <Text style={styles.cancelTutorialText}>Exit Tutorial</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.startTutorialButton} onPress={startTutorial}>
          <Text style={styles.startTutorialIcon}>{'\u{1F393}'}</Text>
          <Text style={styles.startTutorialText}>Start Guided Tutorial</Text>
        </TouchableOpacity>
      )}

      {/* Reference List */}
      <Text style={styles.sectionLabel}>Command Reference</Text>
      {COMMAND_CATEGORIES.map((cat) => {
        const isExpanded = expandedCategories[cat.title] ?? false;
        return (
          <View key={cat.title} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat.title)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryTitle}>{cat.title}</Text>
              <Text style={styles.chevron}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.commandList}>
                {cat.commands.map((cmd, i) => (
                  <View key={i} style={styles.commandItem}>
                    <View style={styles.commandInfo}>
                      <Text style={styles.commandName}>{cmd.name}</Text>
                      <Text style={styles.commandExample}>"{cmd.example}"</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <VoiceCommandOverlay
        visible={overlayVisible}
        onDismiss={() => setOverlayVisible(false)}
        onCommand={tutorialActive ? handleTutorialCommand : (_t, _p) => setOverlayVisible(false)}
        context="settings"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  tutorialCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: Spacing.md,
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  tutorialInstruction: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  tutorialHint: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  tryButton: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  tryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  micButtonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  micButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  cancelTutorialText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  startTutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  startTutorialIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  startTutorialText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  commandList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  commandInfo: {
    flex: 1,
  },
  commandName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  commandExample: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default VoiceTrainingSection;
