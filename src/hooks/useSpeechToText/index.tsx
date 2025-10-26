import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Voice, { 
  SpeechRecognizedEvent, 
  SpeechResultsEvent, 
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent
} from '@react-native-voice/voice';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Voice listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    // Check permissions on mount
    checkPermissions();
    
    // Cleanup function
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Voice event handlers
  const onSpeechStart = (e: SpeechStartEvent) => {
    console.log('Speech recognition started', e);
    setIsListening(true);
    setError(null);
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {
    console.log('Speech recognized', e);
  };

  const onSpeechEnd = (e: SpeechEndEvent) => {
    console.log('Speech recognition ended', e);
    setIsListening(false);
    setPartialText('');
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.log('Speech recognition error', e);
    setIsListening(false);
    setPartialText('');
    
    let errorMessage = 'Speech recognition error occurred';
    
    if (e.error) {
      switch (e.error.code) {
        case '7': // ERROR_NO_MATCH
          errorMessage = 'No speech was recognized. Please try again.';
          break;
        case '6': // ERROR_SPEECH_TIMEOUT
          errorMessage = 'Speech timeout. Please try speaking again.';
          break;
        case '5': // ERROR_CLIENT
          errorMessage = 'Speech recognition client error.';
          break;
        case '8': // ERROR_RECOGNIZER_BUSY
          errorMessage = 'Speech recognizer is busy. Please try again.';
          break;
        case '9': // ERROR_INSUFFICIENT_PERMISSIONS
          errorMessage = 'Microphone permission is required.';
          setHasPermission(false);
          break;
        default:
          errorMessage = e.error.message || 'Speech recognition error occurred';
      }
    }
    
    setError(errorMessage);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('Speech results', e);
    if (e.value && e.value.length > 0) {
      const finalText = e.value[0];
      setRecognizedText(finalText);
      setPartialText('');
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    console.log('Speech partial results', e);
    if (e.value && e.value.length > 0) {
      setPartialText(e.value[0]);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to use speech recognition.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          setError('Microphone permission denied');
        }
      } catch (err) {
        console.warn('Error requesting microphone permission:', err);
        setHasPermission(false);
        setError('Failed to request microphone permission');
      }
    } else {
      // For iOS, Voice library handles permissions internally
      // Check if Voice is available
      try {
        const isAvailable = await Voice.isAvailable();
        setHasPermission(isAvailable);
        if (!isAvailable) {
          setError('Speech recognition not available on this device');
        }
      } catch (err) {
        console.warn('Error checking Voice availability:', err);
        setHasPermission(false);
        setError('Speech recognition not available');
      }
    }
  };

  const startListening = async () => {
    if (!hasPermission) {
      await checkPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for speech recognition.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => checkPermissions() }
          ]
        );
        return;
      }
    }

    try {
      // Clear previous results
      setError(null);
      setRecognizedText('');
      setPartialText('');
      
      // Check if Voice is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Start listening
      await Voice.start('en-US');
      setIsListening(true);
    } catch (err) {
      console.error('Error starting voice recognition:', err);
      setError('Failed to start speech recognition. Please check your microphone permissions.');
      setIsListening(false);
      
      Alert.alert(
        'Error',
        'Failed to start speech recognition. Please check your microphone permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      setPartialText('');
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
      setIsListening(false);
      setPartialText('');
    }
  };

  const cancelListening = async () => {
    try {
      await Voice.cancel();
      setIsListening(false);
      setPartialText('');
      setRecognizedText('');
    } catch (err) {
      console.error('Error cancelling voice recognition:', err);
      setIsListening(false);
      setPartialText('');
    }
  };

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear recognized text after it's been used
  const clearRecognizedText = () => {
    setRecognizedText('');
  };

  const clearPartialText = () => {
    setPartialText('');
  };

  return {
    isListening,
    hasPermission,
    recognizedText,
    partialText, // Real-time partial results
    error,
    startListening,
    stopListening,
    cancelListening,
    clearRecognizedText,
    clearPartialText,
    checkPermissions, // Allow manual permission check
  };
}