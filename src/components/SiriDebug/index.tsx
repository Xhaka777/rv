import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { CustomText, PrimaryButton } from '../../components';

const { AudioSessionManager } = NativeModules;
const audioEmitter = AudioSessionManager ? new NativeEventEmitter(AudioSessionManager) : null;

interface SiriDebugProps {
  visible?: boolean;
}

export const SiriDebugComponent: React.FC<SiriDebugProps> = ({ visible = true }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [isSiriActive, setIsSiriActive] = useState(false);
  const [audioSessionState, setAudioSessionState] = useState<any>(null);

  useEffect(() => {
    if (!audioEmitter) return;

    // Listen for Siri interruptions
    const siriBeganListener = audioEmitter.addListener('SiriInterruptionBegan', (data) => {
      console.log('🗣️ SIRI BEGAN (Debug):', data);
      setIsSiriActive(true);
      Alert.alert('Siri Interruption', 'Siri has taken the microphone');
    });

    const siriEndedListener = audioEmitter.addListener('SiriInterruptionEnded', (data) => {
      console.log('🗣️ SIRI ENDED (Debug):', data);
      setIsSiriActive(false);
      Alert.alert('Siri Ended', `Services resumed: ${data.resumedServices?.join(', ') || 'none'}`);
    });

    // Listen for general interruptions
    const interruptionBeganListener = audioEmitter.addListener('AudioInterruptionBegan', (data) => {
      console.log('📱 INTERRUPTION BEGAN (Debug):', data);
      Alert.alert('Audio Interrupted', `Reason: ${data.reason}`);
    });

    const interruptionEndedListener = audioEmitter.addListener('AudioInterruptionEnded', (data) => {
      console.log('📱 INTERRUPTION ENDED (Debug):', data);
      Alert.alert('Audio Resumed', `Can resume: ${data.canResume}`);
    });

    // Listen for microphone status
    const micStatusListener = audioEmitter.addListener('MicrophoneStatus', (data) => {
      console.log('🎤 MIC STATUS (Debug):', data.status);
    });

    return () => {
      siriBeganListener?.remove();
      siriEndedListener?.remove();
      interruptionBeganListener?.remove();
      interruptionEndedListener?.remove();
      micStatusListener?.remove();
    };
  }, []);

  const startRecording = async () => {
    try {
      const result = await AudioSessionManager.startRecording('debug-recording.m4a');
      console.log('✅ Recording started:', result);
      setIsRecording(true);
    } catch (error) {
      console.error('❌ Recording failed:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const result = await AudioSessionManager.stopRecording();
      console.log('✅ Recording stopped:', result);
      setIsRecording(false);
    } catch (error) {
      console.error('❌ Stop recording failed:', error);
    }
  };

  const startSpeechRecognition = async () => {
    try {
      const result = await AudioSessionManager.startSpeechRecognition();
      console.log('✅ Speech recognition started:', result);
      setIsSpeechActive(true);
    } catch (error) {
      console.error('❌ Speech recognition failed:', error);
      Alert.alert('Error', 'Failed to start speech recognition');
    }
  };

  const stopSpeechRecognition = async () => {
    try {
      const result = await AudioSessionManager.stopSpeechRecognition();
      console.log('✅ Speech recognition stopped:', result);
      setIsSpeechActive(false);
    } catch (error) {
      console.error('❌ Stop speech recognition failed:', error);
    }
  };

  const startAudioStreaming = async () => {
    try {
      const result = await AudioSessionManager.startContinuousAudioStreaming();
      console.log('✅ Audio streaming started:', result);
      setIsStreamingActive(true);
    } catch (error) {
      console.error('❌ Audio streaming failed:', error);
      Alert.alert('Error', 'Failed to start audio streaming');
    }
  };

  const stopAudioStreaming = async () => {
    try {
      const result = await AudioSessionManager.stopContinuousAudioStreaming();
      console.log('✅ Audio streaming stopped:', result);
      setIsStreamingActive(false);
    } catch (error) {
      console.error('❌ Stop audio streaming failed:', error);
    }
  };

  const pauseForSiri = async () => {
    try {
      const result = await AudioSessionManager.pauseRecordingForSiri();
      console.log('✅ Paused for Siri:', result);
      setIsSiriActive(true);
      Alert.alert('Debug', 'Manually paused for Siri');
    } catch (error) {
      console.error('❌ Pause for Siri failed:', error);
      Alert.alert('Error', 'Failed to pause for Siri');
    }
  };

  const resumeAfterSiri = async () => {
    try {
      const result = await AudioSessionManager.resumeRecordingAfterSiri();
      console.log('✅ Resumed after Siri:', result);
      setIsSiriActive(false);
      Alert.alert('Debug', 'Manually resumed after Siri');
    } catch (error) {
      console.error('❌ Resume after Siri failed:', error);
      Alert.alert('Error', 'Failed to resume after Siri');
    }
  };

  const getAudioSessionState = async () => {
    try {
      const state = await AudioSessionManager.getCurrentAudioSessionState();
      console.log('📊 Audio session state:', state);
      setAudioSessionState(state);
      Alert.alert('Audio Session State', JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('❌ Get state failed:', error);
    }
  };

  const testSiriScenario = () => {
    Alert.alert(
      'Test Siri Scenario',
      'This will simulate a Siri interruption. Start some audio services first, then activate this to test the interruption flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Siri',
          onPress: async () => {
            await pauseForSiri();
            // Auto-resume after 5 seconds
            setTimeout(() => {
              resumeAfterSiri();
            }, 5000);
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <CustomText.LargeBoldText customStyle={styles.title}>
        🎤 Siri Debug Panel
      </CustomText.LargeBoldText>

      <CustomText.MediumText customStyle={styles.subtitle}>
        Audio Services Status
      </CustomText.MediumText>

      <View style={styles.statusRow}>
        <CustomText.SmallText>Recording: {isRecording ? '🟢 Active' : '🔴 Inactive'}</CustomText.SmallText>
      </View>
      <View style={styles.statusRow}>
        <CustomText.SmallText>Speech Recognition: {isSpeechActive ? '🟢 Active' : '🔴 Inactive'}</CustomText.SmallText>
      </View>
      <View style={styles.statusRow}>
        <CustomText.SmallText>Audio Streaming: {isStreamingActive ? '🟢 Active' : '🔴 Inactive'}</CustomText.SmallText>
      </View>
      <View style={styles.statusRow}>
        <CustomText.SmallText>Siri Active: {isSiriActive ? '🗣️ YES' : '⚪ NO'}</CustomText.SmallText>
      </View>

      <CustomText.MediumText customStyle={styles.subtitle}>
        Audio Controls
      </CustomText.MediumText>

      <View style={styles.buttonRow}>
        <PrimaryButton
          title={isRecording ? "Stop Rec" : "Start Rec"}
          width={'45%'}
          onPress={isRecording ? stopRecording : startRecording}
          customStyles={{ backgroundColor: isRecording ? '#FF3B30' : '#007AFF' }}
        />
        <PrimaryButton
          title={isSpeechActive ? "Stop Speech" : "Start Speech"}
          width={'45%'}
          onPress={isSpeechActive ? stopSpeechRecognition : startSpeechRecognition}
          customStyles={{ backgroundColor: isSpeechActive ? '#FF3B30' : '#007AFF' }}
        />
      </View>

      <View style={styles.buttonRow}>
        <PrimaryButton
          title={isStreamingActive ? "Stop Stream" : "Start Stream"}
          width={'45%'}
          onPress={isStreamingActive ? stopAudioStreaming : startAudioStreaming}
          customStyles={{ backgroundColor: isStreamingActive ? '#FF3B30' : '#007AFF' }}
        />
        <PrimaryButton
          title="Get State"
          width={'45%'}
          onPress={getAudioSessionState}
          customStyles={{ backgroundColor: '#34C759' }}
        />
      </View>

      <CustomText.MediumText customStyle={styles.subtitle}>
        Siri Testing
      </CustomText.MediumText>

      <View style={styles.buttonRow}>
        <PrimaryButton
          title="Pause for Siri"
          width={'45%'}
          onPress={pauseForSiri}
          customStyles={{ backgroundColor: '#FF9500' }}
        />
        <PrimaryButton
          title="Resume after Siri"
          width={'45%'}
          onPress={resumeAfterSiri}
          customStyles={{ backgroundColor: '#30B0C7' }}
        />
      </View>

      <PrimaryButton
        title="🧪 Test Siri Scenario"
        width={'100%'}
        onPress={testSiriScenario}
        customStyles={{ backgroundColor: '#8E44AD', marginTop: 10 }}
      />

      <CustomText.SmallText customStyle={styles.instructions}>
        💡 Instructions:{'\n'}
        1. Start audio services{'\n'}
        2. Say "Hey Siri" to test real Siri{'\n'}
        3. Or use "Test Siri Scenario" for manual test{'\n'}
        4. Watch console logs for detailed info
      </CustomText.SmallText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    margin: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#007AFF',
    marginTop: 15,
    marginBottom: 10,
    fontWeight: '600',
  },
  statusRow: {
    marginVertical: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  instructions: {
    color: '#CCCCCC',
    marginTop: 15,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default SiriDebugComponent;