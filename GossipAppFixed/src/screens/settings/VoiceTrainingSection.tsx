import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import VoiceCommandOverlay from '../../components/voice/VoiceCommandOverlay';
import { voiceTrainingStore } from '../../modules/gossip/VoiceTrainingStore';
import { GossipIntent } from '../../modules/gossip/types';

interface VoiceTrainingSectionProps {
  expanded: boolean;
}

interface TrainableCommand {
  intent: GossipIntent;
  label: string;
  defaultExample: string;
  icon: string;
}

const TRAINABLE_COMMANDS: TrainableCommand[] = [
  { intent: 'create_group', label: 'Create Group', defaultExample: 'Create group Study Buddies', icon: '+' },
  { intent: 'send_message', label: 'Send Message', defaultExample: 'Send hello everyone', icon: '>' },
  { intent: 'record_voice', label: 'Voice Message', defaultExample: 'Record voice message', icon: '\u{1F3A4}' },
  { intent: 'call_group', label: 'Call Group', defaultExample: 'Call Poker', icon: '\u{1F4DE}' },
  { intent: 'add_member', label: 'Add Member', defaultExample: 'Add John to Dev Team', icon: '\u{1F464}+' },
  { intent: 'navigate', label: 'Navigate', defaultExample: 'Go to settings', icon: '\u2192' },
  { intent: 'private_chat', label: 'Private Chat', defaultExample: 'DM John', icon: '\u{1F512}' },
  { intent: 'show_groups', label: 'Show Groups', defaultExample: 'Show my groups', icon: '\u2630' },
];

// ── Tutorial data (kept from original) ──

const TUTORIAL_STEPS: { instruction: string; expectedType: string; hint: string }[] = [
  { instruction: 'Try sending a message', expectedType: 'send_message', hint: 'Say "Say hello everyone"' },
  { instruction: 'Navigate to a screen', expectedType: 'navigate', hint: 'Say "Go to settings"' },
  { instruction: 'Create a group', expectedType: 'create_group', hint: 'Say "Create group My Team"' },
  { instruction: 'Read messages', expectedType: 'read_latest', hint: 'Say "Read the latest message"' },
  { instruction: 'Try a whisper', expectedType: 'whisper', hint: 'Say "Whisper to John hey there"' },
];

const VoiceTrainingSection: React.FC<VoiceTrainingSectionProps> = ({ expanded }) => {
  // Tutorial state
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stepResult, setStepResult] = useState<'success' | 'retry' | null>(null);

  // Training state
  const [trainingData, setTrainingData] = useState<Partial<Record<GossipIntent, string[]>>>({});
  const [activeTrainIntent, setActiveTrainIntent] = useState<GossipIntent | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // Load training data when expanded
  useEffect(() => {
    if (expanded) {
      loadTrainingData();
    }
  }, [expanded]);

  const loadTrainingData = useCallback(async () => {
    await voiceTrainingStore.load();
    const all = voiceTrainingStore.getAllTraining();
    const phrases: Partial<Record<GossipIntent, string[]>> = {};
    for (const [intent, entries] of Object.entries(all)) {
      if (entries && entries.length > 0) {
        phrases[intent as GossipIntent] = entries.map((e: any) => e.phrase);
      }
    }
    setTrainingData(phrases);
  }, []);

  // ── Tutorial handlers ──

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
    setActiveTrainIntent(null);
    setTutorialActive(true);
    setTutorialStep(0);
    setStepResult(null);
    setOverlayVisible(true);
  }, []);

  // ── Training handlers ──

  const handleTrainPress = useCallback((intent: GossipIntent) => {
    const current = trainingData[intent] || [];
    if (current.length >= 5) {
      Alert.alert('Limit Reached', 'You can have up to 5 custom phrases per command. Remove one first.');
      return;
    }
    setActiveTrainIntent(intent);
    setTutorialActive(false);
    setOverlayVisible(true);
  }, [trainingData]);

  // ── Overlay dismiss/command handlers ──

  const handleOverlayDismiss = useCallback(() => {
    setOverlayVisible(false);
  }, []);

  const handleTrainingOverlayCommand = useCallback(async (type: string, payload: string) => {
    if (tutorialActive) {
      handleTutorialCommand(type, payload);
      return;
    }

    if (!activeTrainIntent) {
      setOverlayVisible(false);
      return;
    }

    // Store the payload as the trained phrase for the active intent
    let phraseToStore = payload;
    try {
      // For JSON payloads, extract the meaningful part
      const parsed = JSON.parse(payload);
      if (parsed.name) phraseToStore = parsed.name;
      else if (parsed.message) phraseToStore = parsed.message;
    } catch {
      // Not JSON, use as-is
    }

    if (phraseToStore && phraseToStore.trim()) {
      await voiceTrainingStore.addPhrase(activeTrainIntent, phraseToStore.trim());
      await loadTrainingData();
    }

    setActiveTrainIntent(null);
    setOverlayVisible(false);
  }, [activeTrainIntent, tutorialActive, handleTutorialCommand, loadTrainingData]);

  const handleRemovePhrase = useCallback(async (intent: GossipIntent, phrase: string) => {
    await voiceTrainingStore.removePhrase(intent, phrase);
    await loadTrainingData();
  }, [loadTrainingData]);

  const handleResetIntent = useCallback(async (intent: GossipIntent) => {
    await voiceTrainingStore.clearIntent(intent);
    await loadTrainingData();
  }, [loadTrainingData]);

  const handleResetAll = useCallback(() => {
    Alert.alert(
      'Reset All Training',
      'Remove all custom voice phrases?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            await voiceTrainingStore.clearAll();
            await loadTrainingData();
          },
        },
      ],
    );
  }, [loadTrainingData]);

  const hasAnyTraining = Object.keys(trainingData).length > 0;

  if (!expanded) return null;

  return (
    <View style={styles.container}>
      {/* ── Guided Tutorial ── */}
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
              <TouchableOpacity style={styles.tryButton} onPress={() => setOverlayVisible(true)}>
                <Text style={styles.tryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.micButton} onPress={() => setOverlayVisible(true)}>
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

      {/* ── Custom Voice Training ── */}
      <Text style={styles.sectionLabel}>Train Your Commands</Text>
      <Text style={styles.sectionHint}>
        Teach Gossip your own phrases for each command. Up to 5 per command.
      </Text>

      {TRAINABLE_COMMANDS.map((cmd) => {
        const phrases = trainingData[cmd.intent] || [];
        return (
          <View key={cmd.intent} style={styles.commandCard}>
            {/* Command header row */}
            <View style={styles.commandRow}>
              <View style={styles.commandIconWrap}>
                <Text style={styles.commandIcon}>{cmd.icon}</Text>
              </View>
              <View style={styles.commandInfo}>
                <Text style={styles.commandLabel}>{cmd.label}</Text>
                <Text style={styles.commandExample}>e.g. "{cmd.defaultExample}"</Text>
              </View>
              <TouchableOpacity
                style={styles.trainButton}
                onPress={() => handleTrainPress(cmd.intent)}
                activeOpacity={0.7}
              >
                <Text style={styles.trainButtonIcon}>{'\u{1F3A4}'}</Text>
                <Text style={styles.trainButtonText}>Train</Text>
              </TouchableOpacity>
            </View>

            {/* Trained phrases */}
            {phrases.length > 0 && (
              <View style={styles.phrasesWrap}>
                {phrases.map((phrase, i) => (
                  <View key={i} style={styles.phraseChip}>
                    <Text style={styles.phraseChipText}>{phrase}</Text>
                    <TouchableOpacity
                      style={styles.phraseChipRemove}
                      onPress={() => handleRemovePhrase(cmd.intent, phrase)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.phraseChipRemoveText}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleResetIntent(cmd.intent)}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Reset All */}
      {hasAnyTraining && (
        <TouchableOpacity style={styles.resetAllButton} onPress={handleResetAll}>
          <Text style={styles.resetAllText}>Reset All Training</Text>
        </TouchableOpacity>
      )}

      {/* Voice Overlay */}
      <VoiceCommandOverlay
        visible={overlayVisible}
        onDismiss={handleOverlayDismiss}
        onCommand={handleTrainingOverlayCommand}
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
  // ── Tutorial (preserved from original) ──
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
  // ── Training Section ──
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  commandCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  commandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  commandIcon: {
    fontSize: 16,
    color: Colors.primary,
  },
  commandInfo: {
    flex: 1,
  },
  commandLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  commandExample: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    minHeight: 36,
  },
  trainButtonIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  trainButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  phrasesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  phraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  phraseChipText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
    marginRight: Spacing.sm,
  },
  phraseChipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseChipRemoveText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '700',
  },
  resetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  resetButtonText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '500',
  },
  resetAllButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    alignItems: 'center',
  },
  resetAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
  },
});

export default VoiceTrainingSection;
