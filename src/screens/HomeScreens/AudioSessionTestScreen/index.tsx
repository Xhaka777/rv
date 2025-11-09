import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch
} from 'react-native';
import {
  audioSessionService,
  AudioStreamDataEvent,
  SpeechRecognizedEvent,
  MicrophoneInterruptionEvent,
  MicrophoneStatusChangedEvent,
  MicrophoneDebugLogEvent,
  AudioInterruptionEvent,
  SiriInterruptionEvent
} from '../../../utils/AudioSessionService';

interface LogEntry {
  id: string;
  type: 'status' | 'interruption' | 'route' | 'debug' | 'speech' | 'stream';
  message: string;
  timestamp: Date;
  details?: string;
  severity?: 'low' | 'medium' | 'high';
}

const AudioSessionTestScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeechRecognizing, setIsSpeechRecognizing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAudioServicesSuspended, setIsAudioServicesSuspended] = useState(false);
  const [lastInterruptionType, setLastInterruptionType] = useState<string>('');
  const [autoRestart, setAutoRestart] = useState(true);

  // Add log entry
  const addLog = useCallback((
    type: LogEntry['type'], 
    message: string, 
    details?: string, 
    severity: LogEntry['severity'] = 'low'
  ) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      details,
      severity
    };

    setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
  }, []);

  // Setup event listeners
  useEffect(() => {
    console.log('🎧 Setting up enhanced AudioSessionManager listeners...');

    // 🔥 NEW: Enhanced microphone interruption listener
    audioSessionService.addListener('microphoneInterruption', (event: MicrophoneInterruptionEvent) => {
      const description = audioSessionService.getInterruptionTypeDescription(event.type);
      setLastInterruptionType(event.type);
      
      let severity: LogEntry['severity'] = 'medium';
      if (event.type.includes('siri')) severity = 'high';
      if (event.type.includes('failed')) severity = 'high';
      
      addLog('interruption', description, event.reason, severity);
      
      // Update suspended state
      if (['began', 'siri_began', 'system_began'].includes(event.type)) {
        setIsAudioServicesSuspended(true);
      } else if (['ended', 'siri_ended', 'system_ended'].includes(event.type)) {
        setIsAudioServicesSuspended(false);
      }
      
      // Show alert for important interruptions
      if (['began', 'siri_began'].includes(event.type)) {
        Alert.alert(
          'Audio Interrupted',
          `${description}\nReason: ${event.reason}`,
          [
            { text: 'OK', style: 'default' },
            { text: 'Force Resume', onPress: () => handleForceResume() }
          ]
        );
      }
    });

    // 🔥 NEW: Enhanced microphone status listener
    audioSessionService.addListener('microphoneStatusChanged', (event: MicrophoneStatusChangedEvent) => {
      const message = `Microphone ${event.isActive ? 'activated' : 'deactivated'}`;
      addLog('status', message, event.reason);
      
      // Update local states based on reason
      if (event.reason.includes('recording')) {
        setIsRecording(event.isActive);
      } else if (event.reason.includes('streaming')) {
        setIsStreaming(event.isActive);
      } else if (event.reason.includes('speech')) {
        setIsSpeechRecognizing(event.isActive);
      }
    });

    // 🔥 NEW: Enhanced debug log listener
    audioSessionService.addListener('microphoneDebugLog', (event: MicrophoneDebugLogEvent) => {
      let severity: LogEntry['severity'] = 'low';
      
      // Categorize debug messages
      if (audioSessionService.detectSiriInterruption(event.message)) {
        severity = 'high';
      } else if (audioSessionService.detectCallInterruption(event.message)) {
        severity = 'medium';
      } else if (event.message.toLowerCase().includes('error') || event.message.toLowerCase().includes('failed')) {
        severity = 'medium';
      }
      
      addLog('debug', event.message, undefined, severity);
    });

    // Audio route changes
    audioSessionService.addListener('audioRouteChanged', (event) => {
      let message = '';
      
      switch (event.reason) {
        case 'new_device_available':
          message = '🎧 New audio device connected';
          break;
        case 'device_disconnected':
          message = '🎧 Audio device disconnected';
          break;
        case 'category_changed':
          message = '🎧 Audio category changed';
          break;
        default:
          message = '🎧 Audio route changed';
          break;
      }
      
      addLog('route', message, event.reason);
    });

    // Speech recognition events
    audioSessionService.addListener('SpeechRecognized', (event: SpeechRecognizedEvent) => {
      const message = event.isFinal ? `🗣️ FINAL: "${event.text}"` : `🗣️ Partial: "${event.text}"`;
      addLog('speech', message, `Final: ${event.isFinal}`, event.isFinal ? 'medium' : 'low');
    });

    // Audio stream data (only log occasionally to avoid spam)
    let streamLogCounter = 0;
    audioSessionService.addListener('AudioStreamData', (event: AudioStreamDataEvent) => {
      streamLogCounter++;
      if (streamLogCounter % 50 === 0) { // Log every 50th stream event
        addLog('stream', '🎵 Audio streaming active', `Sample Rate: ${event.sampleRate}, Channels: ${event.channels}`, 'low');
      }
    });

    // Legacy interruption listeners for compatibility
    audioSessionService.addListener('SiriInterruptionBegan', (event: SiriInterruptionEvent) => {
      addLog('interruption', '🗣️ LEGACY: Siri interruption began', 'Legacy event compatibility', 'medium');
    });

    audioSessionService.addListener('SiriInterruptionEnded', (event: SiriInterruptionEvent) => {
      addLog('interruption', '🟢 LEGACY: Siri interruption ended', 'Legacy event compatibility', 'medium');
    });

    audioSessionService.addListener('AudioInterruptionBegan', (event: AudioInterruptionEvent) => {
      addLog('interruption', '📱 LEGACY: General audio interruption began', 'Legacy event compatibility', 'medium');
    });

    audioSessionService.addListener('AudioInterruptionEnded', (event: AudioInterruptionEvent) => {
      addLog('interruption', '🟢 LEGACY: General audio interruption ended', 'Legacy event compatibility', 'medium');
    });

    // Get initial audio session state
    const getInitialState = async () => {
      try {
        const state = await audioSessionService.getAudioSessionState();
        if (state) {
          setIsRecording(state.isRecording);
          setIsStreaming(state.isStreamingAudio);
          setIsSpeechRecognizing(state.isSpeechRecognitionActive);
          setIsAudioServicesSuspended(state.isSuspended);
          
          addLog('status', '🔧 Initial audio session state loaded', 
            `Recording: ${state.isRecording}, Streaming: ${state.isStreamingAudio}, Speech: ${state.isSpeechRecognitionActive}`
          );
        }
      } catch (error) {
        console.error('Failed to get initial state:', error);
        addLog('debug', '❌ Failed to get initial audio session state', `Error: ${error}`, 'medium');
      }
    };

    getInitialState();

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 Cleaning up AudioSessionManager listeners...');
      audioSessionService.removeAllListeners();
    };
  }, [addLog]);

  // Auto-restart logic
  useEffect(() => {
    if (autoRestart && isAudioServicesSuspended && lastInterruptionType.includes('siri_ended')) {
      console.log('🔄 Auto-restarting services after Siri...');
      setTimeout(() => {
        handleStartAllServices();
      }, 1000);
    }
  }, [isAudioServicesSuspended, lastInterruptionType, autoRestart]);

  // Start recording
  const handleStartRecording = async () => {
    setLoading(true);
    try {
      const fileName = `test_recording_${Date.now()}.wav`;
      const result = await audioSessionService.startRecording(fileName);
      if (result.success) {
        addLog('status', '🎙️ Recording started successfully', `File: ${result.fileName}`, 'medium');
      } else {
        Alert.alert('Error', 'Failed to start recording');
        addLog('debug', '❌ Failed to start recording', 'Check permissions', 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while starting recording.');
      console.error('Start recording error:', error);
      addLog('debug', '❌ Recording start error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Stop recording
  const handleStopRecording = async () => {
    setLoading(true);
    try {
      const result = await audioSessionService.stopRecording();
      if (result.success) {
        addLog('status', '🛑 Recording stopped successfully', `File: ${result.filePath}`, 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while stopping recording.');
      console.error('Stop recording error:', error);
      addLog('debug', '❌ Recording stop error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Start audio streaming
  const handleStartStreaming = async () => {
    setLoading(true);
    try {
      const result = await audioSessionService.startAudioStreaming();
      if (result.success) {
        addLog('status', '🎵 Audio streaming started', result.message, 'medium');
      } else {
        Alert.alert('Error', 'Failed to start audio streaming');
        addLog('debug', '❌ Failed to start streaming', result.message, 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while starting streaming.');
      addLog('debug', '❌ Streaming start error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Stop audio streaming
  const handleStopStreaming = async () => {
    setLoading(true);
    try {
      const result = await audioSessionService.stopAudioStreaming();
      if (result.success) {
        addLog('status', '🔴 Audio streaming stopped', result.message, 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while stopping streaming.');
      addLog('debug', '❌ Streaming stop error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Start speech recognition
  const handleStartSpeechRecognition = async () => {
    setLoading(true);
    try {
      const result = await audioSessionService.startSpeechRecognition();
      if (result.success) {
        addLog('status', '🗣️ Speech recognition started', `Streaming: ${result.isStreaming}`, 'medium');
      } else {
        Alert.alert('Error', 'Failed to start speech recognition');
        addLog('debug', '❌ Failed to start speech recognition', 'Check permissions', 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while starting speech recognition.');
      addLog('debug', '❌ Speech recognition start error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Stop speech recognition
  const handleStopSpeechRecognition = async () => {
    setLoading(true);
    try {
      const result = await audioSessionService.stopSpeechRecognition();
      if (result.success) {
        addLog('status', '🔴 Speech recognition stopped', 'Successfully stopped', 'medium');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while stopping speech recognition.');
      addLog('debug', '❌ Speech recognition stop error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Force resume after interruption
  const handleForceResume = async () => {
    setLoading(true);
    try {
      await audioSessionService.resumeAfterSiri();
      addLog('status', '🔄 Force resume attempted', 'Manual intervention', 'medium');
    } catch (error) {
      Alert.alert('Error', 'Failed to force resume services.');
      addLog('debug', '❌ Force resume error', `${error}`, 'medium');
    }
    setLoading(false);
  };

  // Start all services
  const handleStartAllServices = async () => {
    addLog('status', '🚀 Starting all services...', 'Bulk operation', 'medium');
    await handleStartStreaming();
    await handleStartSpeechRecognition();
  };

  // Stop all services
  const handleStopAllServices = async () => {
    addLog('status', '🛑 Stopping all services...', 'Bulk operation', 'medium');
    await handleStopRecording();
    await handleStopStreaming();
    await handleStopSpeechRecognition();
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    addLog('status', '🧹 Logs cleared', 'Manual action');
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString();
  };

  // Get log color
  const getLogColor = (type: LogEntry['type'], severity: LogEntry['severity'] = 'low'): string => {
    switch (type) {
      case 'interruption': 
        return severity === 'high' ? '#ff4444' : '#ff8800';
      case 'route': return '#ff8800';
      case 'status': return '#00aa00';
      case 'speech': return '#0066cc';
      case 'stream': return '#8800ff';
      case 'debug': 
        return severity === 'medium' ? '#ff8800' : '#666666';
      default: return '#666666';
    }
  };

  // Get log icon
  const getLogIcon = (type: LogEntry['type']): string => {
    switch (type) {
      case 'interruption': return '🚨';
      case 'route': return '🎧';
      case 'status': return '📱';
      case 'speech': return '🗣️';
      case 'stream': return '🎵';
      case 'debug': return '🐛';
      default: return '📝';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced AudioSession Test</Text>
        <Text style={styles.subtitle}>
          Status: {isAudioServicesSuspended ? '⏸️ SUSPENDED' : '🟢 ACTIVE'} | 
          Rec: {isRecording ? '🔴' : '⚪'} | 
          Stream: {isStreaming ? '🎵' : '⚪'} | 
          Speech: {isSpeechRecognizing ? '🗣️' : '⚪'}
        </Text>
        <View style={styles.autoRestartContainer}>
          <Text style={styles.autoRestartLabel}>Auto-restart after Siri:</Text>
          <Switch
            value={autoRestart}
            onValueChange={setAutoRestart}
          />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.streamButton]}
            onPress={isStreaming ? handleStopStreaming : handleStartStreaming}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {isStreaming ? 'Stop Stream' : 'Start Stream'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.speechButton]}
            onPress={isSpeechRecognizing ? handleStopSpeechRecognition : handleStartSpeechRecognition}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {isSpeechRecognizing ? 'Stop Speech' : 'Start Speech'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resumeButton]}
            onPress={handleForceResume}
            disabled={loading || !isAudioServicesSuspended}
          >
            <Text style={styles.buttonText}>
              Force Resume
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.bulkButton]}
            onPress={handleStartAllServices}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Start All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.bulkButton]}
            onPress={handleStopAllServices}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Stop All
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instructions}>
          1. Start services and try "Hey Siri" 🗣️{'\n'}
          2. Switch to another app that uses mic 📱{'\n'}
          3. Watch detailed interruption logs below 📋
        </Text>
      </View>

      {/* Event logs */}
      <View style={styles.logsContainer}>
        <View style={styles.logsHeader}>
          <Text style={styles.logsTitle}>Enhanced Event Logs ({logs.length}/100)</Text>
          <TouchableOpacity onPress={handleClearLogs} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.logsScroll}>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>
              No events yet. Start services and try "Hey Siri" or switch to another app that uses the microphone!
            </Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={[
                styles.logItem, 
                { 
                  borderLeftColor: getLogColor(log.type, log.severity),
                  backgroundColor: log.severity === 'high' ? '#fff8f8' : 
                                   log.severity === 'medium' ? '#fffaf8' : '#f8f9fa'
                }
              ]}>
                <View style={styles.logHeader}>
                  <Text style={styles.logIcon}>{getLogIcon(log.type)}</Text>
                  <Text style={[styles.logType, { color: getLogColor(log.type, log.severity) }]}>
                    {log.type.toUpperCase()}
                    {log.severity !== 'low' && ` (${log.severity.toUpperCase()})`}
                  </Text>
                  <Text style={styles.logTimestamp}>
                    {formatTimestamp(log.timestamp)}
                  </Text>
                </View>
                <Text style={[
                  styles.logMessage,
                  { fontWeight: log.severity === 'high' ? 'bold' : 'normal' }
                ]}>
                  {log.message}
                </Text>
                {log.details && (
                  <Text style={styles.logDetails}>{log.details}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  autoRestartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  autoRestartLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  controls: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flex: 0.48,
  },
  recordButton: {
    backgroundColor: '#FF3B30',
  },
  streamButton: {
    backgroundColor: '#007AFF',
  },
  speechButton: {
    backgroundColor: '#34C759',
  },
  resumeButton: {
    backgroundColor: '#FF8800',
  },
  bulkButton: {
    backgroundColor: '#666666',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  logsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  logsScroll: {
    flex: 1,
  },
  noLogsText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    marginTop: 40,
    lineHeight: 20,
  },
  logItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  logType: {
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#666666',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
});

export default AudioSessionTestScreen;