// Voice state machine: idle → listening → processing → result (or error)
// Mock implementation — ready for real STT integration later

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceResult {
  text: string;
  confidence: number;
  timestamp: number;
}

type StateChangeCallback = (state: VoiceState) => void;
type ResultCallback = (result: VoiceResult) => void;

class VoiceService {
  private state: VoiceState = 'idle';
  private stateListeners: StateChangeCallback[] = [];
  private resultListeners: ResultCallback[] = [];
  private listeningTimer: ReturnType<typeof setTimeout> | null = null;
  private processingTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): VoiceState {
    return this.state;
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    this.stateListeners.forEach(cb => cb(newState));
  }

  private emitResult(result: VoiceResult) {
    this.resultListeners.forEach(cb => cb(result));
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== cb);
    };
  }

  onResult(cb: ResultCallback): () => void {
    this.resultListeners.push(cb);
    return () => {
      this.resultListeners = this.resultListeners.filter(l => l !== cb);
    };
  }

  startListening() {
    if (this.state === 'listening' || this.state === 'processing') return;

    this.clearTimers();
    this.setState('listening');

    // Simulate 2s of listening then auto-stop
    this.listeningTimer = setTimeout(() => {
      this.stopListening();
    }, 2000);
  }

  stopListening() {
    if (this.state !== 'listening') return;

    this.clearTimers();
    this.setState('processing');

    // Simulate 0.5s processing delay then produce a mock result
    this.processingTimer = setTimeout(() => {
      const mockPhrases = [
        'Hello everyone',
        'How are you doing',
        'Let me check that',
        'Sounds good to me',
        'See you later',
      ];
      const text = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      this.emitResult({ text, confidence: 0.92, timestamp: Date.now() });
      this.setState('idle');
    }, 500);
  }

  cancelListening() {
    this.clearTimers();
    this.setState('idle');
  }

  /** Feed text through the voice pipeline — used by the text-fallback input */
  simulateInput(text: string) {
    if (!text.trim()) return;

    this.clearTimers();
    this.setState('processing');

    this.processingTimer = setTimeout(() => {
      this.emitResult({ text: text.trim(), confidence: 1.0, timestamp: Date.now() });
      this.setState('idle');
    }, 300);
  }

  private clearTimers() {
    if (this.listeningTimer) {
      clearTimeout(this.listeningTimer);
      this.listeningTimer = null;
    }
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  destroy() {
    this.clearTimers();
    this.stateListeners = [];
    this.resultListeners = [];
    this.state = 'idle';
  }
}

// Singleton
export const voiceService = new VoiceService();
export default VoiceService;
