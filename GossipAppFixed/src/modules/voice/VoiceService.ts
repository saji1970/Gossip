// Voice state machine: idle → listening → processing → result (or error)
// Uses @react-native-voice/voice for real STT

import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

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
  private initialized = false;

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

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    Voice.onSpeechStart = () => {
      this.setState('listening');
    };

    Voice.onSpeechEnd = () => {
      if (this.state === 'listening') {
        this.setState('processing');
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      if (text) {
        this.emitResult({ text, confidence: 0.95, timestamp: Date.now() });
      }
      this.setState('idle');
    };

    Voice.onSpeechPartialResults = (_e: SpeechResultsEvent) => {
      // Could show partial transcript — skip for now
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.warn('[VoiceService] STT error:', e.error);
      this.setState('error');
      // Auto-reset to idle after 1s
      setTimeout(() => {
        if (this.state === 'error') this.setState('idle');
      }, 1000);
    };
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

  async startListening() {
    if (this.state === 'listening' || this.state === 'processing') return;

    this.ensureInitialized();
    this.setState('listening');

    try {
      await Voice.start('en-US');
    } catch (err) {
      console.warn('[VoiceService] Failed to start:', err);
      this.setState('error');
      setTimeout(() => {
        if (this.state === 'error') this.setState('idle');
      }, 1000);
    }
  }

  async stopListening() {
    if (this.state !== 'listening') return;

    this.setState('processing');
    try {
      await Voice.stop();
    } catch (err) {
      console.warn('[VoiceService] Failed to stop:', err);
      this.setState('idle');
    }
  }

  async cancelListening() {
    try {
      await Voice.cancel();
    } catch {}
    this.setState('idle');
  }

  /** Feed text through the voice pipeline — used by the text-fallback input */
  simulateInput(text: string) {
    if (!text.trim()) return;

    this.setState('processing');

    setTimeout(() => {
      this.emitResult({ text: text.trim(), confidence: 1.0, timestamp: Date.now() });
      this.setState('idle');
    }, 200);
  }

  async destroy() {
    try {
      await Voice.destroy();
    } catch {}
    this.stateListeners = [];
    this.resultListeners = [];
    this.state = 'idle';
    this.initialized = false;
  }
}

// Singleton
export const voiceService = new VoiceService();
export default VoiceService;
