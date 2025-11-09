import { NativeEventEmitter, NativeModules } from 'react-native';

interface AudioSessionModule {
  // Recording methods
  startRecording(fileName: string): Promise<{ success: boolean; filePath: string; fileName: string; isStreaming: boolean }>;
  stopRecording(): Promise<{ success: boolean; filePath: string }>;
  pauseRecording(): Promise<boolean>;
  resumeRecording(): Promise<boolean>;
  
  // Playback methods
  startPlayback(filePath: string): Promise<{ success: boolean }>;
  stopPlayback(): Promise<{ success: boolean }>;
  
  // Audio streaming methods
  startContinuousAudioStreaming(): Promise<{ success: boolean; message: string }>;
  stopContinuousAudioStreaming(): Promise<{ success: boolean; message: string }>;
  
  // Speech recognition methods
  startSpeechRecognition(): Promise<{ success: boolean; isStreaming: boolean }>;
  stopSpeechRecognition(): Promise<{ success: boolean }>;
  
  // 🔥 NEW: Manual Siri handling methods
  pauseRecordingForSiri(): Promise<{ success: boolean; message: string; pausedServices: string[] }>;
  resumeRecordingAfterSiri(): Promise<{ success: boolean; message: string }>;
  
  // Utility methods
  getCurrentAudioSessionState(): Promise<{
    category: string;
    isActive: boolean;
    hasPermission: boolean;
    isRecording: boolean;
    isPaused: boolean;
    isSpeechRecognitionActive: boolean;
    isStreamingAudio: boolean;
    wasPausedForSiri: boolean;
    isSuspended: boolean;
  }>;
  requestMicPermission(): Promise<boolean>;
  getRecordingsList(): Promise<any[]>;
}

// Event interfaces
interface AudioInterruptionEvent {
  wasRecording: boolean;
  wasSpeechRecognitionActive: boolean;
  wasStreaming: boolean;
  reason: string;
}

interface AudioRouteChangedEvent {
  reason: number;
  possibleSiri: boolean;
  timestamp: number;
}

interface RecordingProgressEvent {
  currentTime: number;
  averagePower: number;
  peakPower: number;
  hasMicrophone: boolean;
  isSessionActive: boolean;
  isRecorderActive: boolean;
}

interface RecordingFinishedEvent {
  success: boolean;
  filePath?: string;
  duration?: number;
  error?: string;
}

interface PlaybackProgressEvent {
  currentTime: number;
  duration: number;
}

interface PlaybackFinishedEvent {
  success: boolean;
  duration?: number;
  error?: string;
}

interface MicrophoneStatusEvent {
  status: string;
  appState: string;
  isRecording: boolean;
  isSpeechRecognitionActive: boolean;
  hasPermission: boolean;
  isSessionActive: boolean;
  wasPausedForSiri: boolean;
  isSuspended: boolean;
  timestamp: number;
}

interface SpeechRecognizedEvent {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

interface AudioStreamDataEvent {
  audioBuffer: string; // Base64 encoded
  sampleRate: number;
  channels: number;
  timestamp: number;
  source?: string;
}

interface SiriInterruptionEvent {
  canResume?: boolean;
  resumedServices?: string[];
  reclaimedInBackground?: boolean;
  error?: string;
  reason?: string;
}

//  NEW: Microphone-specific interruption events (from MicrophoneManager)
interface MicrophoneStatusChangedEvent {
  isActive: boolean;
  reason: string;
  timestamp: number;
}

interface MicrophoneInterruptionEvent {
  type: 'began' | 'ended' | 'failed_resume' | 'ended_no_resume' | 'siri_began' | 'siri_ended' | 'system_began' | 'system_ended';
  reason: string;
  timestamp: number;
}

interface MicrophoneRouteChangedEvent {
  reason: 'new_device_available' | 'device_disconnected' | 'category_changed' | 'route_changed';
  timestamp: number;
}

interface MicrophoneDebugLogEvent {
  message: string;
  timestamp: number;
}

export interface HeySiriDetectedEvent {
  detected: boolean;
  message: string;
  timestamp: number;
}

export type AudioSessionEventType = 
  // Original events
  | 'AudioInterruptionBegan'
  | 'AudioInterruptionEnded'
  | 'AudioRouteChanged'
  | 'RecordingProgress'
  | 'RecordingFinished'
  | 'PlaybackProgress'
  | 'PlaybackFinished'
  | 'MicrophoneStatus'
  | 'SpeechRecognized'
  | 'AudioStreamData'
  | 'SiriInterruptionBegan'
  | 'SiriInterruptionEnded'
  //  NEW: Enhanced interruption events
  | 'microphoneStatusChanged'
  | 'microphoneInterruption'
  | 'audioRouteChanged'
  | 'microphoneDebugLog'
  | 'HeySiriDetected';

const { AudioSessionManager } = NativeModules as {
  AudioSessionManager: AudioSessionModule;
};

const audioEmitter = new NativeEventEmitter(AudioSessionManager);

export class AudioSessionService {
  private static instance: AudioSessionService;
  private listeners: Map<string, any[]> = new Map();

  private constructor() {}

  static getInstance(): AudioSessionService {
    if (!AudioSessionService.instance) {
      AudioSessionService.instance = new AudioSessionService();
    }
    return AudioSessionService.instance;
  }

  // Core audio functionality
  async startRecording(fileName: string): Promise<{ success: boolean; filePath: string; fileName: string; isStreaming: boolean }> {
    try {
      const result = await AudioSessionManager.startRecording(fileName);
      return result;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, filePath: '', fileName: '', isStreaming: false };
    }
  }

  async stopRecording(): Promise<{ success: boolean; filePath: string }> {
    try {
      const result = await AudioSessionManager.stopRecording();
      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, filePath: '' };
    }
  }

  async pauseRecording(): Promise<boolean> {
    try {
      const result = await AudioSessionManager.pauseRecording();
      return result;
    } catch (error) {
      console.error('Failed to pause recording:', error);
      return false;
    }
  }

  async resumeRecording(): Promise<boolean> {
    try {
      const result = await AudioSessionManager.resumeRecording();
      return result;
    } catch (error) {
      console.error('Failed to resume recording:', error);
      return false;
    }
  }

  // Audio streaming functionality
  async startAudioStreaming(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await AudioSessionManager.startContinuousAudioStreaming();
      return result;
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  async stopAudioStreaming(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await AudioSessionManager.stopContinuousAudioStreaming();
      return result;
    } catch (error) {
      console.error('Failed to stop audio streaming:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Speech recognition functionality
  async startSpeechRecognition(): Promise<{ success: boolean; isStreaming: boolean }> {
    try {
      const result = await AudioSessionManager.startSpeechRecognition();
      return result;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return { success: false, isStreaming: false };
    }
  }

  async stopSpeechRecognition(): Promise<{ success: boolean }> {
    try {
      const result = await AudioSessionManager.stopSpeechRecognition();
      return result;
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      return { success: false };
    }
  }

  // 🔥 NEW: Manual Siri handling functionality
  async pauseForSiri(): Promise<{ success: boolean; message: string; pausedServices: string[] }> {
    try {
      const result = await AudioSessionManager.pauseRecordingForSiri();
      return result;
    } catch (error) {
      console.error('Failed to pause for Siri:', error);
      return { success: false, message: `Error: ${error}`, pausedServices: [] };
    }
  }

  async resumeAfterSiri(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await AudioSessionManager.resumeRecordingAfterSiri();
      return result;
    } catch (error) {
      console.error('Failed to resume after Siri:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Utility methods
  async getAudioSessionState() {
    try {
      const state = await AudioSessionManager.getCurrentAudioSessionState();
      return state;
    } catch (error) {
      console.error('Failed to get audio session state:', error);
      return null;
    }
  }

  async requestMicPermission(): Promise<boolean> {
    try {
      const granted = await AudioSessionManager.requestMicPermission();
      return granted;
    } catch (error) {
      console.error('Failed to request mic permission:', error);
      return false;
    }
  }

  // Event listeners with enhanced interruption events
  addListener(
    eventType: 'AudioInterruptionBegan',
    listener: (event: AudioInterruptionEvent) => void
  ): void;
  addListener(
    eventType: 'AudioInterruptionEnded',
    listener: (event: AudioInterruptionEvent) => void
  ): void;
  addListener(
    eventType: 'AudioRouteChanged',
    listener: (event: AudioRouteChangedEvent) => void
  ): void;
  addListener(
    eventType: 'RecordingProgress',
    listener: (event: RecordingProgressEvent) => void
  ): void;
  addListener(
    eventType: 'RecordingFinished',
    listener: (event: RecordingFinishedEvent) => void
  ): void;
  addListener(
    eventType: 'PlaybackProgress',
    listener: (event: PlaybackProgressEvent) => void
  ): void;
  addListener(
    eventType: 'PlaybackFinished',
    listener: (event: PlaybackFinishedEvent) => void
  ): void;
  addListener(
    eventType: 'MicrophoneStatus',
    listener: (event: MicrophoneStatusEvent) => void
  ): void;
  addListener(
    eventType: 'SpeechRecognized',
    listener: (event: SpeechRecognizedEvent) => void
  ): void;
  addListener(
    eventType: 'AudioStreamData',
    listener: (event: AudioStreamDataEvent) => void
  ): void;
  // eslint-disable-next-line no-dupe-class-members
  addListener(
    eventType: 'SiriInterruptionBegan',
    listener: (event: SiriInterruptionEvent) => void
  ): void;
  addListener(
    eventType: 'SiriInterruptionEnded',
    listener: (event: SiriInterruptionEvent) => void
  ): void;
  //  NEW: Enhanced interruption event listeners
  addListener(
    eventType: 'microphoneStatusChanged',
    listener: (event: MicrophoneStatusChangedEvent) => void
  ): void;
  addListener(
    eventType: 'microphoneInterruption',
    listener: (event: MicrophoneInterruptionEvent) => void
  ): void;
  addListener(
    eventType: 'audioRouteChanged',
    listener: (event: MicrophoneRouteChangedEvent) => void
  ): void;
  addListener(
    eventType: 'microphoneDebugLog',
    listener: (event: MicrophoneDebugLogEvent) => void
  ): void;
  addListener(
    eventType: 'HeySiriDetected',
    listener: (event: HeySiriDetectedEvent) => void
  ): void;
  addListener(eventType: AudioSessionEventType, listener: (event: any) => void): void {
    const subscription = audioEmitter.addListener(eventType, listener);
    
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(subscription);
  }

  removeListener(eventType: AudioSessionEventType, listener?: (event: any) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      if (listener) {
        // Remove specific listener
        const index = eventListeners.findIndex(sub => sub.listener === listener);
        if (index !== -1) {
          eventListeners[index].remove();
          eventListeners.splice(index, 1);
        }
      } else {
        // Remove all listeners for this event type
        eventListeners.forEach(sub => sub.remove());
        this.listeners.delete(eventType);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.forEach((eventListeners) => {
      eventListeners.forEach(sub => sub.remove());
    });
    this.listeners.clear();
  }

  // 🔥 NEW: Enhanced interruption detection helpers
  detectSiriInterruption(debugLogMessage: string): boolean {
    const siriKeywords = [
      'siri',
      'silence hint',
      'secondary audio silenced',
      'built-in mic muted'
    ];
    
    const message = debugLogMessage.toLowerCase();
    return siriKeywords.some(keyword => message.includes(keyword));
  }

  detectCallInterruption(debugLogMessage: string): boolean {
    const callKeywords = [
      'phone call',
      'call interruption',
      'telephony',
      'cellular call'
    ];
    
    const message = debugLogMessage.toLowerCase();
    return callKeywords.some(keyword => message.includes(keyword));
  }

  // Helper method to format debug logs with timestamps
  formatDebugLog(event: MicrophoneDebugLogEvent): string {
    const timestamp = new Date(event.timestamp * 1000).toLocaleTimeString();
    return `[${timestamp}] ${event.message}`;
  }

  // Helper method to get human-readable interruption type
  getInterruptionTypeDescription(type: MicrophoneInterruptionEvent['type']): string {
    const descriptions: Record<MicrophoneInterruptionEvent['type'], string> = {
      'began': '🔴 MICROPHONE INTERRUPTED',
      'ended': '🟢 MICROPHONE RESUMED',
      'failed_resume': '❌ FAILED TO RESUME',
      'ended_no_resume': '⚠️ INTERRUPTION ENDED (NO RESUME)',
      'siri_began': '🗣️ SIRI DETECTED - MICROPHONE PAUSED',
      'siri_ended': '🟢 SIRI FINISHED - MICROPHONE AVAILABLE',
      'system_began': '📱 SYSTEM INTERRUPTION BEGAN',
      'system_ended': '🟢 SYSTEM INTERRUPTION ENDED'
    };
    
    return descriptions[type] || `❓ UNKNOWN: ${type}`;
  }
}

// Export singleton instance
export const audioSessionService = AudioSessionService.getInstance();

// Export types
export type {
  AudioInterruptionEvent,
  AudioRouteChangedEvent,
  RecordingProgressEvent,
  RecordingFinishedEvent,
  PlaybackProgressEvent,
  PlaybackFinishedEvent,
  MicrophoneStatusEvent,
  SpeechRecognizedEvent,
  AudioStreamDataEvent,
  SiriInterruptionEvent,
  MicrophoneStatusChangedEvent,
  MicrophoneInterruptionEvent,
  MicrophoneRouteChangedEvent,
  MicrophoneDebugLogEvent,
  AudioSessionEventType
};