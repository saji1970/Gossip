import { Platform, PermissionsAndroid } from 'react-native';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

export type RecordingResult = {
  uri: string;
  durationMs: number;
};

class AudioService {
  private static instance: AudioService;
  private recorder: AudioRecorderPlayer;
  private isCurrentlyRecording = false;
  private isCurrentlyPlaying = false;
  private currentPlayingUri: string | null = null;
  private recordStartTime = 0;

  private constructor() {
    this.recorder = new AudioRecorderPlayer();
    this.recorder.setSubscriptionDuration(0.1); // 100ms updates
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Gossip needs microphone access to send voice messages.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    // iOS handles permissions via Info.plist
    return true;
  }

  async startRecording(
    onTick?: (elapsedMs: number) => void,
  ): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    // Stop any current playback
    if (this.isCurrentlyPlaying) {
      await this.stopPlayback();
    }

    // Stop any current recording
    if (this.isCurrentlyRecording) {
      await this.cancelRecording();
    }

    const path = Platform.select({
      android: `${Date.now()}.m4a`,
      ios: `${Date.now()}.m4a`,
      default: `${Date.now()}.m4a`,
    });

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.medium,
      AVNumberOfChannelsKeyIOS: 1,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
      OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
      AudioSamplingRateAndroid: 22050,
      AudioEncodingBitRateAndroid: 64000,
    };

    this.recordStartTime = Date.now();
    this.isCurrentlyRecording = true;

    if (onTick) {
      this.recorder.addRecordBackListener((e) => {
        onTick(e.currentPosition);
      });
    }

    await this.recorder.startRecorder(path, audioSet);
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.isCurrentlyRecording) {
      throw new Error('No recording in progress');
    }

    const uri = await this.recorder.stopRecorder();
    this.recorder.removeRecordBackListener();
    this.isCurrentlyRecording = false;

    const durationMs = Date.now() - this.recordStartTime;

    return { uri, durationMs };
  }

  async cancelRecording(): Promise<void> {
    if (!this.isCurrentlyRecording) return;

    try {
      await this.recorder.stopRecorder();
    } catch {
      // Ignore errors when cancelling
    }
    this.recorder.removeRecordBackListener();
    this.isCurrentlyRecording = false;
  }

  getIsRecording(): boolean {
    return this.isCurrentlyRecording;
  }

  // ── Playback ──────────────────────────────────────────────────

  async play(
    uri: string,
    onTick?: (currentMs: number, durationMs: number) => void,
    onComplete?: () => void,
  ): Promise<void> {
    // Stop any current playback first
    if (this.isCurrentlyPlaying) {
      await this.stopPlayback();
    }

    this.isCurrentlyPlaying = true;
    this.currentPlayingUri = uri;

    this.recorder.addPlayBackListener((e) => {
      if (onTick) {
        onTick(e.currentPosition, e.duration);
      }
      if (e.currentPosition >= e.duration - 100) {
        this.isCurrentlyPlaying = false;
        this.currentPlayingUri = null;
        this.recorder.removePlayBackListener();
        onComplete?.();
      }
    });

    await this.recorder.startPlayer(uri);
  }

  async pausePlayback(): Promise<void> {
    if (!this.isCurrentlyPlaying) return;
    await this.recorder.pausePlayer();
  }

  async resumePlayback(): Promise<void> {
    await this.recorder.resumePlayer();
  }

  async stopPlayback(): Promise<void> {
    if (!this.isCurrentlyPlaying) return;
    try {
      await this.recorder.stopPlayer();
    } catch {
      // Ignore
    }
    this.recorder.removePlayBackListener();
    this.isCurrentlyPlaying = false;
    this.currentPlayingUri = null;
  }

  getIsPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  getCurrentPlayingUri(): string | null {
    return this.currentPlayingUri;
  }
}

export const audioService = AudioService.getInstance();
export default AudioService;
