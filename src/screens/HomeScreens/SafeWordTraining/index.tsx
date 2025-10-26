import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, StatusBar, Alert, Dimensions, AppState } from 'react-native';
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VolumeManager } from 'react-native-volume-manager';
import { Images, Metrix, NavigationService, RouteNames, Utills } from '../../../config';
import { CustomText, MainContainer, PrimaryButton, VolumeAnimatedIcon } from '../../../components';
import { normalizeFont } from '../../../config/metrix';
import { SafeWordTrainingProps } from '../../propTypes';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import SystemSetting from 'react-native-system-setting';
import { useDispatch, useSelector } from 'react-redux';
import { HomeActions } from '../../../redux/actions';
import { RootState } from '../../../redux/reducers';
// import { AudioRecordingService } from '../../../services/audioRecording';

const { width, height } = Dimensions.get('window');

const CALIBRATION_SCRIPT = "Hello, this is a short test recording for voice verification. I'm speaking in a calm, steady voice so the system can capture a clear reference sample. This recording lasts about twenty seconds and includes brief pauses. After upload, it will be used for voice verification and to confirm the microphone and service are working properly.";

// Split script into words for tracking
const SCRIPT_WORDS = CALIBRATION_SCRIPT.toLowerCase().replace(/[.,!?]/g, '').split(' ');

interface WaveCircleProps {
  delay: number;
  size: number;
}

function WaveCircle({ delay, size }: WaveCircleProps) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      scale.value = 0.3;
      opacity.value = 0;

      setTimeout(() => {
        scale.value = withRepeat(
          withTiming(1, {
            duration: 2000,
            easing: Easing.out(Easing.quad),
          }),
          -1,
          false
        );

        opacity.value = withRepeat(
          withTiming(0, {
            duration: 2000,
            easing: Easing.out(Easing.quad),
          }),
          -1,
          false
        );
      }, delay);
    };

    startAnimation();
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      scale.value,
      [0.3, 0.6, 1],
      [0.8, 0.4, 0]
    );

    return {
      transform: [{ scale: scale.value }],
      opacity: opacityValue,
    };
  });

  return (
    <Animated.View
      style={[
        styles.waveCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle
      ]}
    />
  );
}

const SafeWordTraining: React.FC<SafeWordTrainingProps> = ({ route, navigation }) => {
  const { isUpdate = false, isFirstTime = false, skipCalibration = false } = route?.params || {};
  const dispatch = useDispatch();

  // Get user details for cloud recording
  const userDetails = useSelector((state: RootState) => state.home.userDetails);

  // Generate unique user ID for cloud recording
  const generateUserId = (): string => {
    if (userDetails?.user?.id) {
      return `user_${userDetails.user.id}`;
    }

    if (userDetails?.user?.email) {
      const cleanEmail = userDetails.user.email.replace(/[^a-zA-Z0-9]/g, '_');
      return `email_${cleanEmail}`;
    }

    if (userDetails?.user?.phone) {
      const cleanPhone = userDetails.user.phone.replace(/[^0-9]/g, '');
      return `phone_${cleanPhone}`;
    }

    if (userDetails?.user?.first_name && userDetails?.user?.last_name) {
      const name = `${userDetails.user.first_name}_${userDetails.user.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
      return `name_${name}_${Date.now()}`;
    }

    return `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get current safe word from Redux to preserve it
  const currentSafeWord = useSelector((state: RootState) => state.home.safeWord?.safeWord);

  // Determine initial screen based on parameters
  const getInitialScreen = () => {
    if (isFirstTime) {
      return 'setup'; // First time users start with setup
    } else if (isUpdate && skipCalibration) {
      return 'safeWordSetup'; // Existing users updating safe word skip to safe word setup
    } else {
      return 'setup'; // Default to setup
    }
  };

  // Screen state
  const [currentScreen, setCurrentScreen] = useState<'setup' | 'calibration' | 'recording' | 'success' | 'safeWordSetup' | 'safeWordRecording' | 'finalSuccess'>(getInitialScreen());

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [volume, setVolume] = useState(0);
  const [deviceVolume, setDeviceVolume] = useState(0.5);
  const [appState, setAppState] = useState(AppState.currentState);

  // Script tracking states
  const [spokenWords, setSpokenWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [completedWords, setCompletedWords] = useState<boolean[]>(new Array(SCRIPT_WORDS.length).fill(false));
  const [isScriptComplete, setIsScriptComplete] = useState(false);

  // Animation and UI states
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const iconScale = useSharedValue(1);

  // Safe word recording states
  const [recordedSafeWord, setRecordedSafeWord] = useState('');
  const [isSafeWordRecording, setIsSafeWordRecording] = useState(false);

  // NEW: Cloud recording state (no UI indicators, just internal tracking)
  // const [isCloudRecording, setIsCloudRecording] = useState(false);

  // Voice timeout ref
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Auto-progression timer refs
  const autoProgressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store the original safe word to restore later if needed
  const [originalSafeWord, setOriginalSafeWord] = useState<string | null>(null);

  const [pendingSafeWordText, setPendingSafeWordText] = useState('');
  const pendingSafeWordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: Function to handle cloud recording seamlessly
  // const triggerCloudRecording = async () => {
  //   console.log('Starting background cloud recording...');

  //   try {
  //     setIsCloudRecording(true);
  //     const userId = generateUserId();
  //     console.log('Generated user ID for recording:', userId);

  //     // Call the cloud recording service in the background
  //     const response = await AudioRecordingService.recordAndUpload(userId);
  //     console.log('Cloud recording completed successfully:', response);

  //     // Store calibration timestamp locally
  //     await AsyncStorage.setItem('voice_calibration_timestamp', new Date().toISOString());
  //     await AsyncStorage.setItem('voice_calibration_user_id', userId);

  //   } catch (error) {
  //     console.error('Cloud recording failed:', error);
  //     // Don't show error to user since this is background operation
  //     // Could optionally retry or store for later upload
  //   } finally {
  //     setIsCloudRecording(false);
  //   }
  // };

  // Helper function to save safe word to storage and Redux
  const saveSafeWordToStorage = async (word: string): Promise<boolean> => {
    try {
      console.log('Saving new safe word to storage:', word);
      await AsyncStorage.setItem('SAFE_WORD_KEY', word);

      // Verify it was saved
      const savedWord = await AsyncStorage.getItem('SAFE_WORD_KEY');
      console.log('Verification - saved word:', savedWord);

      // 🔑 RESTORE WebSocket with new safe word
      console.log('Updating Redux with new safe word and restoring WebSocket:', word);
      dispatch(HomeActions.setSafeWord({ isSafeWord: true, safeWord: word }));

      return true;
    } catch (error) {
      console.error('Error saving safe word:', error);
      return false;
    }
  };

  // Auto-progression effect for success screen
  useEffect(() => {
    if (currentScreen === 'success') {
      console.log('Success screen mounted, setting up auto-progression timer');

      // Clear any existing timer
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
      }

      // Set timer to automatically progress to safe word setup after 2 seconds
      autoProgressTimerRef.current = setTimeout(() => {
        console.log('Auto-progressing to safe word setup screen');
        setCurrentScreen('safeWordSetup');
      }, 2000);
    } else {
      // Clear timer if not on success screen
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
        autoProgressTimerRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
        autoProgressTimerRef.current = null;
      }
    };
  }, [currentScreen]);

  useEffect(() => {
    // Get initial system volume
    SystemSetting.getVolume().then(currentVolume => {
      setVolume(currentVolume);
    });

    // Subscribe to volume change events
    const listener = SystemSetting.addVolumeListener(({ value }) => {
      setVolume(value);
    });

    return () => {
      SystemSetting.removeVolumeListener(listener);
      // Clear any auto-progression timers
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
      }
    };
  }, []);

  // AppState monitoring
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changing from', appState, 'to', nextAppState);
      setAppState(nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App going to background - stopping voice recognition');
        if (isListening) {
          await stopListening();
        }
      } else if (nextAppState === 'active' && appState !== 'active') {
        console.log('App becoming active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isListening]);

  useEffect(() => {
    // Store the original safe word when component mounts
    console.log('Storing original safe word:', currentSafeWord);
    setOriginalSafeWord(currentSafeWord);

    // 🔑 PAUSE WebSocket audio streaming during training
    console.log('Pausing WebSocket audio streaming during safe word training');
    dispatch(HomeActions.setSafeWord({ isSafeWord: false, safeWord: currentSafeWord }));

    // Setup voice recognition only for recording screen and safe word recording
    if (currentScreen === 'recording' || currentScreen === 'safeWordRecording') {
      setupVoiceRecognition();
      getDeviceVolume();
    }

    return () => {
      // Clean up voice
      if (isListening) {
        Voice.stop().catch(console.error);
      }
      Voice.destroy().then(Voice.removeAllListeners);

      // Clear timers
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
      }

      console.log('SafeWordTraining component unmounting - safe word should already be updated');
    };
  }, [dispatch, currentScreen]);

  // Voice Recognition Setup with enhancements
  useEffect(() => {
    if (currentScreen !== 'recording' && currentScreen !== 'safeWordRecording') return;

    console.log('Setting up Voice Recognition...');

    const onSpeechStart = (e) => {
      console.log('Speech recognition started:', e);
      if (currentScreen === 'safeWordRecording') {
        setIsSafeWordRecording(true);
      } else {
        setIsListening(true);
      }
      setVoiceVolume(0);
      setIsSpeechDetected(false);
      lastSpeechTimeRef.current = Date.now();

      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
    };

    const onSpeechRecognized = (e) => {
      console.log('Speech recognized:', e);
      lastSpeechTimeRef.current = Date.now();
    };

    const onSpeechEnd = (e) => {
      console.log('Speech recognition ended:', e);

      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      if (currentScreen === 'safeWordRecording') {
        setIsSafeWordRecording(false);
      } else if (currentScreen === 'recording') {
        if (!isScriptComplete && appState === 'active') {
          console.log('Restarting voice recognition for continued script reading');
          setTimeout(() => {
            startListening();
          }, 500);
        } else {
          setIsListening(false);
        }
      }
    };

    const onSpeechResults = async (e) => {
      console.log('Speech results received:', e);
      lastSpeechTimeRef.current = Date.now();

      if (appState !== 'active') {
        console.log('App not active, ignoring speech results');
        return;
      }

      if (e.value && e.value.length > 0) {
        const recognizedText = e.value[0];
        console.log('Recognized text:', `"${recognizedText}"`);

        setRecognizedText(recognizedText);

        if (currentScreen === 'safeWordRecording') {
          processSafeWordRecording(recognizedText, false);
        } else if (currentScreen === 'recording') {
          processSpokenText(recognizedText);
        }

        if (currentScreen === 'recording') {
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
          }

          voiceTimeoutRef.current = setTimeout(() => {
            if (!isScriptComplete) {
              console.log('Continuing listening for script completion');
            }
          }, 1000);
        }
      }
    };

    const onSpeechPartialResults = (e) => {
      console.log('Partial results:', e.value);
      lastSpeechTimeRef.current = Date.now();

      if (e.value && e.value.length > 0) {
        const partialText = e.value[0];
        console.log('Partial text preview:', `"${partialText}"`);

        if (currentScreen === 'recording') {
          processSpokenText(partialText, true);
        } else if (currentScreen === 'safeWordRecording') {
          processSafeWordRecording(partialText, true);
        }

        if (partialText && partialText.trim().length > 0) {
          setIsSpeechDetected(true);
        }
      }
    };

    const onSpeechVolumeChanged = (e) => {
      if (e && typeof e.value === 'number' && isSpeechDetected) {
        const normalizedVolume = Math.max(0, Math.min(1, (e.value + 2) / 12));
        setVoiceVolume(normalizedVolume);
      }
    };

    const onSpeechError = (e) => {
      console.error('Speech error:', e);

      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      if (e.error?.message !== 'No speech input' && e.error?.code !== '7') {
        console.log('Showing error alert to user');
        Alert.alert('Voice Recognition Error', `Failed to recognize speech: ${e.error?.message || 'Unknown error'}. Please try again.`);
        if (currentScreen === 'safeWordRecording') {
          setIsSafeWordRecording(false);
        } else {
          setIsListening(false);
        }
      } else {
        console.log('No speech input detected - continuing to listen');
      }
    };

    // Attach event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;
    Voice.onSpeechError = onSpeechError;

    if (pendingSafeWordTimeoutRef.current) {
      clearTimeout(pendingSafeWordTimeoutRef.current);
      pendingSafeWordTimeoutRef.current = null;
    }

    return () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      Voice.stop().catch(() => { });
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
      });
    };

  }, [currentScreen, isScriptComplete, appState]);

  // MODIFIED: processSpokenText to trigger cloud recording when complete
  const processSpokenText = (spokenText: string, isPartial: boolean = false) => {
    const spokenWordsArray = spokenText.toLowerCase()
      .replace(/[.,!?]/g, '')
      .split(' ')
      .filter(word => word.length > 0);

    console.log('Processing spoken words:', spokenWordsArray);
    console.log('Target script words:', SCRIPT_WORDS);
    console.log('Current word index:', currentWordIndex);

    const newCompletedWords = [...completedWords];
    let newCurrentWordIndex = currentWordIndex;

    // SEQUENTIAL MATCHING: Only check words in order, starting from current position
    let spokenWordIndex = 0;

    while (spokenWordIndex < spokenWordsArray.length && newCurrentWordIndex < SCRIPT_WORDS.length) {
      const spokenWord = spokenWordsArray[spokenWordIndex];
      const expectedScriptWord = SCRIPT_WORDS[newCurrentWordIndex];

      console.log(`Checking: "${spokenWord}" vs expected "${expectedScriptWord}" at position ${newCurrentWordIndex}`);

      // Check if current spoken word matches the EXPECTED next script word
      const isMatch = spokenWord === expectedScriptWord ||
        spokenWord.includes(expectedScriptWord) ||
        expectedScriptWord.includes(spokenWord) ||
        // Handle common speech-to-text variations
        (spokenWord.length > 3 && expectedScriptWord.length > 3 &&
          spokenWord.substring(0, 3) === expectedScriptWord.substring(0, 3));

      if (isMatch) {
        console.log(`Sequential match found: "${spokenWord}" matches "${expectedScriptWord}" at index ${newCurrentWordIndex}`);
        newCompletedWords[newCurrentWordIndex] = true;
        newCurrentWordIndex++; // Move to next expected word
        spokenWordIndex++; // Move to next spoken word
      } else {
        // Check if we can find this spoken word in the next few expected words (lookahead of 3)
        let foundInLookahead = false;
        for (let lookahead = 1; lookahead <= 3 && (newCurrentWordIndex + lookahead) < SCRIPT_WORDS.length; lookahead++) {
          const lookaheadWord = SCRIPT_WORDS[newCurrentWordIndex + lookahead];

          const isLookaheadMatch = spokenWord === lookaheadWord ||
            spokenWord.includes(lookaheadWord) ||
            lookaheadWord.includes(spokenWord) ||
            (spokenWord.length > 3 && lookaheadWord.length > 3 &&
              spokenWord.substring(0, 3) === lookaheadWord.substring(0, 3));

          if (isLookaheadMatch) {
            console.log(`Found spoken word "${spokenWord}" at lookahead position ${newCurrentWordIndex + lookahead}, marking intervening words as complete`);

            // Mark all words up to and including the found word as complete
            for (let i = newCurrentWordIndex; i <= newCurrentWordIndex + lookahead; i++) {
              newCompletedWords[i] = true;
            }

            newCurrentWordIndex = newCurrentWordIndex + lookahead + 1;
            foundInLookahead = true;
            break;
          }
        }

        if (foundInLookahead) {
          spokenWordIndex++; // Move to next spoken word
        } else {
          // No match found, move to next spoken word but don't advance script position
          console.log(`No match for "${spokenWord}" at expected position ${newCurrentWordIndex}, trying next spoken word`);
          spokenWordIndex++;
        }
      }
    }

    setCompletedWords(newCompletedWords);
    setCurrentWordIndex(newCurrentWordIndex);

    updateSentenceVisibility(newCurrentWordIndex, newCompletedWords);

    // Check if script is complete - now based on sequential completion
    const completedCount = newCompletedWords.filter(Boolean).length;
    const completionPercentage = (completedCount / SCRIPT_WORDS.length) * 100;

    // Also check if we've reached near the end sequentially
    const sequentialProgress = (newCurrentWordIndex / SCRIPT_WORDS.length) * 100;

    console.log(`Progress: ${completedCount}/${SCRIPT_WORDS.length} words (${completionPercentage.toFixed(1)}%)`);
    console.log(`Sequential progress: ${newCurrentWordIndex}/${SCRIPT_WORDS.length} (${sequentialProgress.toFixed(1)}%)`);

    // Script is complete when we've reached the very end sequentially (98%+ to ensure completion)
    if (sequentialProgress >= 98 && !isScriptComplete) {
      console.log('Script reading completed!');
      setIsScriptComplete(true);

      // Mark any remaining words as complete for visual feedback
      const finalCompletedWords = new Array(SCRIPT_WORDS.length).fill(true);
      setCompletedWords(finalCompletedWords);

      // Stop listening after completion
      setTimeout(() => {
        stopListening();

        // NEW: Trigger cloud recording in background (no UI indication)
        // console.log('Triggering cloud recording...');
        // triggerCloudRecording();

        // Show success screen after a brief delay
        setTimeout(() => {
          setCurrentScreen('success');
        }, 1000);
      }, 500);
    }

    // Update spoken words for display
    if (!isPartial) {
      setSpokenWords(spokenWordsArray);
    }
  };

  // Safe word processing function
  const processSafeWordRecording = (spokenText: string, isPartial: boolean = false) => {
    console.log('Processing safe word:', spokenText, 'isPartial:', isPartial);

    // Store the current text
    setPendingSafeWordText(spokenText);

    // Clear any existing timeout
    if (pendingSafeWordTimeoutRef.current) {
      clearTimeout(pendingSafeWordTimeoutRef.current);
    }

    // If this is a partial result, wait for more input
    if (isPartial) {
      console.log('Partial result, waiting for complete speech...');
      // Set a longer timeout for partial results
      pendingSafeWordTimeoutRef.current = setTimeout(() => {
        processCompleteSafeWord(spokenText);
      }, 2000); // Wait 2 seconds for more input
      return;
    }

    // If this is a final result, wait a bit to ensure we have the complete word
    pendingSafeWordTimeoutRef.current = setTimeout(() => {
      processCompleteSafeWord(spokenText);
    }, 1500); // Wait 1.5 seconds to ensure completeness
  };

  // In src/screens/HomeScreens/SafeWordTraining/index.tsx
  const processCompleteSafeWord = (spokenText: string) => {
    console.log('Processing complete safe word:', spokenText);

    // Clear any pending timeout
    if (pendingSafeWordTimeoutRef.current) {
      clearTimeout(pendingSafeWordTimeoutRef.current);
      pendingSafeWordTimeoutRef.current = null;
    }

    // ✅ KEEP THE FULL SENTENCE - just clean it up
    const safeWordSentence = spokenText.toLowerCase()
      .replace(/[.,!?]/g, '') // Remove punctuation
      .trim() // Remove extra spaces
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space

    // Validate it's not empty and has reasonable length
    if (safeWordSentence.length === 0) {
      console.log('Empty safe word, ignoring...');
      return;
    }

    console.log('Full safe word sentence:', safeWordSentence);
    setRecordedSafeWord(safeWordSentence);

    // Stop recording and show completion
    setTimeout(() => {
      stopSafeWordListening();

      // Show success and save the safe word
      Alert.alert(
        'Safe Word Recorded',
        `Your safe word "${safeWordSentence}" has been recorded successfully.`,
        [
          {
            text: 'Continue',
            onPress: async () => {
              // Save the FULL SENTENCE to storage and Redux
              const saved = await saveSafeWordToStorage(safeWordSentence);

              if (saved) {
                console.log('Full sentence safe word saved:', safeWordSentence);
                setCurrentScreen('finalSuccess');

                // Auto-navigate after 3 seconds
                setTimeout(() => {
                  NavigationService.navigate(RouteNames.HomeRoutes.Settings)
                }, 3000);
              } else {
                Alert.alert('Error', 'Failed to save safe word. Please try again.');
              }
            }
          }
        ]
      );
    }, 500);
  };

  // ... [All other helper functions remain exactly the same] ...
  const getDeviceVolume = async () => {
    try {
      const volume = await VolumeManager.getVolume();
      const volumeValue = volume?.volume || volume || 0.5;
      setDeviceVolume(volumeValue);
    } catch (error) {
      console.log('Could not get volume, using default 50%');
      setDeviceVolume(0.5);
    }
  };

  const startListening = async () => {
    console.log('Starting voice recognition for script reading...');
    try {
      if (appState !== 'active') {
        console.log('App not active, skipping voice recognition start');
        return;
      }

      // Check if already listening
      if (isListening) {
        console.log('Already listening, stopping first...');
        await stopListening();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check voice recognition availability
      const isAvailable = await Voice.isAvailable();
      console.log('Voice recognition available:', isAvailable);

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        console.log('Stopping existing recognition first...');
        await Voice.stop();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      Voice.removeAllListeners();

      // Re-setup event listeners
      if (currentScreen === 'recording') {
        setupVoiceRecognition();
      }

      await Voice.start('en-US', {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: true,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1000,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
      });

      setIsListening(true);
      lastSpeechTimeRef.current = Date.now();

      console.log('Voice recognition started successfully for script reading');

    } catch (e) {
      console.error('Voice.start error:', e);
      setIsListening(false);
      Alert.alert('Voice Error', 'Could not start voice recognition. Please check microphone permissions.');
    }
  };

  const stopListening = async () => {
    console.log('Stopping voice recognition...');
    try {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }

      setIsListening(false);
      setVoiceVolume(0);
      setIsSpeechDetected(false);
      console.log('Voice recognition stopped');

    } catch (error) {
      console.error('Error stopping voice:', error);
      setIsListening(false);
    }
  };

  // Safe word listening functions
  const startSafeWordListening = async () => {
    console.log('Starting safe word recording...');
    try {
      if (appState !== 'active') {
        console.log('App not active, skipping safe word recording start');
        return;
      }

      if (isSafeWordRecording) {
        console.log('Already recording safe word, stopping first...');
        await stopSafeWordListening();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const isAvailable = await Voice.isAvailable();
      console.log('Voice recognition available:', isAvailable);

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        console.log('Stopping existing recognition first...');
        await Voice.stop();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      Voice.removeAllListeners();

      // Re-setup event listeners for safe word recording
      if (currentScreen === 'safeWordRecording') {
        setupVoiceRecognition();
      }

      await Voice.start('en-US', {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: true,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      });

      setIsSafeWordRecording(true);
      lastSpeechTimeRef.current = Date.now();

      console.log('Safe word recording started successfully');

    } catch (e) {
      console.error('Safe word Voice.start error:', e);
      setIsSafeWordRecording(false);
      Alert.alert('Voice Error', 'Could not start safe word recording. Please check microphone permissions.');
    }
  };

  const stopSafeWordListening = async () => {
    console.log('Stopping safe word recording...');
    try {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      // Clear pending safe word timeout
      if (pendingSafeWordTimeoutRef.current) {
        clearTimeout(pendingSafeWordTimeoutRef.current);
        pendingSafeWordTimeoutRef.current = null;
      }

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }

      setIsSafeWordRecording(false);
      setVoiceVolume(0);
      setIsSpeechDetected(false);
      setPendingSafeWordText(''); // Clear pending text
      console.log('Safe word recording stopped');

    } catch (error) {
      console.error('Error stopping safe word recording:', error);
      setIsSafeWordRecording(false);
    }
  };

  const setupVoiceRecognition = () => {
    // This function is now handled in the useEffect above
    console.log('Voice recognition setup called');
  };

  const handleCancel = () => {
    if (isListening) {
      stopListening();
    }
    if (autoProgressTimerRef.current) {
      clearTimeout(autoProgressTimerRef.current);
    }
    NavigationService.goBack();
  };

  const handleNext = () => {
    // For first time users, proceed to calibration
    // For updates, skip directly to safe word setup
    if (isUpdate && skipCalibration) {
      setCurrentScreen('safeWordSetup');
    } else {
      setCurrentScreen('calibration');
    }
  };

  const handleStartRecording = () => {
    setCurrentScreen('recording');
    iconScale.value = withTiming(0.9, { duration: 100 }, () => {
      iconScale.value = withTiming(1, { duration: 100 });
    });

    // Reset script tracking state
    setCompletedWords(new Array(SCRIPT_WORDS.length).fill(false));
    setCurrentWordIndex(0);
    setIsScriptComplete(false);
    setSpokenWords([]);

    // Start listening
    setTimeout(() => {
      startListening();
    }, 500);
  };

  const handleStopRecording = () => {
    stopListening();

    if (isScriptComplete) {
      console.log('Training completed successfully');
      NavigationService.goBack();
    } else {
      Alert.alert(
        'Incomplete Reading',
        'Please read the complete script to finish the calibration.',
        [
          {
            text: 'Continue Reading',
            onPress: () => startListening()
          },
          {
            text: 'Cancel',
            onPress: () => handleCancel()
          }
        ]
      );
    }
  };

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  const splitScriptIntoSentences = () => {
    // Split the script into sentences based on punctuation
    const sentences = CALIBRATION_SCRIPT.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Create sentence data with word indices
    let wordIndex = 0;
    const sentenceData = sentences.map(sentence => {
      const words = sentence.toLowerCase().replace(/[.,!?]/g, '').split(' ').filter(word => word.length > 0);
      const startWordIndex = wordIndex;
      const endWordIndex = wordIndex + words.length - 1;
      wordIndex += words.length;

      return {
        text: sentence.trim(),
        words: words,
        startWordIndex,
        endWordIndex,
        isComplete: false
      };
    });

    return sentenceData;
  };

  const [sentences] = useState(() => splitScriptIntoSentences());
  const [visibleSentences, setVisibleSentences] = useState([0, 1, 2]); // Show first 3 sentences initially

  const updateSentenceVisibility = (currentWordIdx, completedWordsArray) => {
    const updatedSentences = sentences.map(sentence => ({
      ...sentence,
      isComplete: currentWordIdx > sentence.endWordIndex
    }));

    // Find which sentences should be visible
    const currentSentenceIndex = sentences.findIndex(sentence =>
      currentWordIdx >= sentence.startWordIndex && currentWordIdx <= sentence.endWordIndex
    );

    if (currentSentenceIndex !== -1) {
      // Show current sentence + 1-2 future sentences
      const startVisible = Math.max(0, currentSentenceIndex);
      const endVisible = Math.min(sentences.length - 1, currentSentenceIndex + 2);

      const newVisibleSentences = [];
      for (let i = startVisible; i <= endVisible; i++) {
        newVisibleSentences.push(i);
      }

      setVisibleSentences(newVisibleSentences);
    }
  };

  // Updated render function for natural text flow
  const renderSentenceBasedScript = () => {
    return visibleSentences.map(sentenceIndex => {
      const sentence = sentences[sentenceIndex];
      if (!sentence) return null;

      // Determine if this sentence is completed, current, or future
      const currentSentenceIndex = sentences.findIndex(s =>
        currentWordIndex >= s.startWordIndex && currentWordIndex <= s.endWordIndex
      );

      let sentenceOpacity = 1;
      let sentenceColor = Utills.selectedThemeColors().PrimaryTextColor;

      if (sentenceIndex < currentSentenceIndex) {
        // Past sentence - fade out
        sentenceOpacity = 0.3;
        sentenceColor = '#57b5fa';
      } else if (sentenceIndex === currentSentenceIndex) {
        // Current sentence - highlight current word
        sentenceOpacity = 1;
      } else {
        // Future sentence
        sentenceOpacity = 0.8;
      }

      return (
        <View key={`sentence-${sentenceIndex}`} style={styles.sentenceContainer}>
          <Text style={[styles.sentenceText, { opacity: sentenceOpacity }]}>
            {sentenceIndex === currentSentenceIndex ? (
              // For current sentence, render word by word with highlighting
              sentence.words.map((word, wordIdx) => {
                const globalWordIndex = sentence.startWordIndex + wordIdx;
                const isCompleted = completedWords[globalWordIndex];
                const isCurrent = globalWordIndex === currentWordIndex;

                return (
                  <Text
                    key={`word-${globalWordIndex}`}
                    style={[
                      styles.sentenceWord,
                      isCompleted && styles.completedWord,
                      isCurrent && styles.currentWord,
                    ]}
                  >
                    {word}{wordIdx < sentence.words.length - 1 ? ' ' : ''}
                  </Text>
                );
              })
            ) : (
              // For past/future sentences, render as complete text
              <Text style={[styles.sentenceWord, { color: sentenceColor }]}>
                {sentence.text}
              </Text>
            )}
          </Text>
        </View>
      );
    });
  };

  // ... [ALL SCREEN COMPONENTS REMAIN EXACTLY THE SAME] ...

  // Setup Screen
  if (currentScreen === 'setup') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Set up Your Safe Word
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <View style={styles.setupContent}>
              <View style={styles.setupTextContainer}>
                <CustomText.MediumText customStyle={styles.textSubheading}>
                  Your Safe Word can be used to trigger your audio or video stream (when in bodycam mode).
                </CustomText.MediumText>

                <CustomText.MediumText customStyle={styles.textSubheading}>
                  To make sure Rove recognizes your voice and avoids false triggers, we need a short calibration.
                </CustomText.MediumText>

                <CustomText.MediumText customStyle={styles.textSubheading}>
                  Find a quiet place and hold the phone 20-30cms away from your face.
                </CustomText.MediumText>
              </View>

              <View style={styles.setupButtonContainer}>
                <PrimaryButton
                  title="Next"
                  onPress={handleNext}
                  customStyles={styles.nextButton}
                  customTextStyle={styles.buttonText}
                />
              </View>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Calibration Screen
  if (currentScreen === 'calibration') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Voice Calibration
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            {/* Icon Section */}
            <View style={styles.iconSection}>
              <TouchableOpacity
                style={[styles.microphoneButton, isListening && styles.microphoneButtonActive]}
                onPress={handleStartRecording}
                disabled={isProcessing}
              >
                <Image
                  source={Images.MicBtn}
                  style={[styles.microphoneIcon, isListening && styles.microphoneIconActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Text Section */}
            <View style={styles.textSection}>
              <CustomText.MediumText customStyle={styles.instructionText}>
                When you are ready to begin press the button above and read the displayed text in your normal voice.
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Recording Screen - ONLY visual change is during cloud recording (no UI indicators)
  if (currentScreen === 'recording') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Voice Calibration
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            {/* Icon Section */}
            <View style={styles.iconSection}>
              <View style={styles.waveContainer}>
                {isListening && (
                  <>
                    <WaveCircle delay={0} size={160} />
                    <WaveCircle delay={400} size={200} />
                    <WaveCircle delay={800} size={240} />
                    <WaveCircle delay={1200} size={280} />
                  </>
                )}

                <TouchableOpacity
                  style={styles.animatedMicrophoneContainer}
                  onPress={handleStopRecording}
                  activeOpacity={0.8}
                  disabled={isScriptComplete}
                >
                  <View style={[
                    styles.animatedMicrophoneButton,
                    isScriptComplete && styles.completedMicButton
                  ]}>
                    <Animated.View style={iconAnimatedStyle}>
                      <Image
                        source={Images.MicBtn}
                        style={styles.animatedMicrophoneIcon}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Text Section - Same as original */}
            <View style={styles.textSectionRecording}>
              <View style={styles.flowingTextContainer}>
                <View style={styles.flowingScriptContainer}>
                  {renderSentenceBasedScript()}
                </View>

                <LinearGradient
                  colors={[
                    'rgba(29, 29, 29, 0)',
                    'rgba(29, 29, 29, 0.6)',
                    'rgba(29, 29, 29, 0.4)',
                    'rgba(29, 29, 29, 0.7)',
                    'rgba(29, 29, 29, 0.9)',
                    'rgba(29, 29, 29, 1)',
                  ]}
                  locations={[0, 0.3, 0.5, 0.7, 0.85, 1]}
                  style={styles.bottomFadeGradient}
                  pointerEvents="none"
                />
              </View>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Success Screen
  if (currentScreen === 'success') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Voice Calibration
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <View style={styles.iconSection}>
              <Image
                source={Images.BlueChecked}
                style={styles.successIcon}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textSection}>
              <CustomText.MediumText customStyle={styles.instructionText}>
                Voice Calibration successful!
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Safe Word Setup Screen  
  if (currentScreen === 'safeWordSetup') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Record Your Safe Word
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <View style={styles.iconSection}>
              <TouchableOpacity
                style={[styles.microphoneButton, isSafeWordRecording && styles.microphoneButtonActive]}
                onPress={() => {
                  setCurrentScreen('safeWordRecording');
                  setTimeout(() => {
                    startSafeWordListening();
                  }, 500);
                }}
                disabled={isProcessing}
              >
                <Image
                  source={Images.MicBtn}
                  style={[styles.microphoneIcon, isSafeWordRecording && styles.microphoneIconActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.textSection}>
              <CustomText.MediumText customStyle={styles.instructionText}>
                Tap the button above to record your safe word. Tap again to stop.
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Safe Word Recording Screen
  if (currentScreen === 'safeWordRecording') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Record Your Safe Word
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <View style={styles.iconSection}>
              <View style={styles.waveContainer}>
                {isSafeWordRecording && (
                  <>
                    <WaveCircle delay={0} size={160} />
                    <WaveCircle delay={400} size={200} />
                    <WaveCircle delay={800} size={240} />
                    <WaveCircle delay={1200} size={280} />
                  </>
                )}

                <TouchableOpacity
                  style={styles.animatedMicrophoneContainer}
                  onPress={stopSafeWordListening}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.animatedMicrophoneButton,
                    recordedSafeWord && styles.completedMicButton
                  ]}>
                    <Animated.View style={iconAnimatedStyle}>
                      {recordedSafeWord ? (
                        <Text style={styles.checkmarkIcon}>✓</Text>
                      ) : (
                        <Image
                          source={Images.MicBtn}
                          style={styles.animatedMicrophoneIcon}
                          resizeMode="contain"
                        />
                      )}
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.textSection}>
              <CustomText.MediumText customStyle={styles.instructionText}>
                {recordedSafeWord ? `"${recordedSafeWord}"` : 'Say your safe word clearly'}
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  // Final Success Screen
  if (currentScreen === 'finalSuccess') {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Safe Word Training
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <View style={styles.iconSection}>
              <Image
                source={Images.BlueChecked}
                style={styles.successIcon}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textSection}>
              <CustomText.MediumText customStyle={styles.instructionText}>
                Safe Word Set!
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      </MainContainer>
    );
  }

  return null;
};

// Complete StyleSheet with all your existing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Metrix.HorizontalSize(2),
    paddingTop: Metrix.VerticalSize(40),
    backgroundColor: 'transparent',
  },
  cardContainer: {
    backgroundColor: '#1d1d1d',
    borderRadius: Metrix.HorizontalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(20),
    height: Metrix.VerticalSize(500),
    justifyContent: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(5),
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    marginRight: Metrix.HorizontalSize(5),
    marginLeft: -Metrix.HorizontalSize(5),
    tintColor: '#57b5fa',
  },
  line: {
    width: '100%',
    height: 2,
    backgroundColor: '#666',
  },
  textHeading: {
    fontSize: normalizeFont(18),
    letterSpacing: 0.7,
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },

  // Icon Section - Consistent across all screens
  iconSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Metrix.VerticalSize(20),
    borderRadius: Metrix.HorizontalSize(12),
  },

  // Text Section - Consistent across all screens
  textSection: {
    minHeight: Metrix.VerticalSize(120),
    marginBottom: Metrix.VerticalSize(90),
    justifyContent: 'space-between',
    paddingVertical: Metrix.VerticalSize(10),
    borderRadius: Metrix.HorizontalSize(12),
    paddingHorizontal: Metrix.HorizontalSize(15),
  },
  textSectionRecording: {
    height: Metrix.VerticalSize(180),
    justifyContent: 'flex-start',
    marginBottom: Metrix.VerticalSize(30),
    paddingVertical: Metrix.VerticalSize(5),
    paddingHorizontal: Metrix.HorizontalSize(5),
    overflow: 'hidden',
  },
  flowingTextContainer: {
    flex: 1,
    paddingBottom: Metrix.VerticalSize(15),
    paddingHorizontal: Metrix.HorizontalSize(5),
  },

  // Natural flowing text container
  flowingScriptContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    paddingTop: Metrix.VerticalSize(15),
    paddingBottom: Metrix.VerticalSize(15),
    lineHeight: 22,
  },

  // Individual words that flow naturally
  flowingScriptWord: {
    fontSize: normalizeFont(17),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    lineHeight: 22,
  },
  scriptContainerScrolling: {
    flex: 1,
    position: 'relative',
    borderRadius: Metrix.HorizontalSize(12),
    padding: Metrix.HorizontalSize(10),
    overflow: 'hidden',
  },
  scrollingScriptContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: Metrix.VerticalSize(10),
  },
  scriptLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Metrix.VerticalSize(4),
    minHeight: 20,
    opacity: 1,
  },
  scriptContainerFaded: {
    flex: 1,
    position: 'relative',
    borderRadius: Metrix.HorizontalSize(12),
    padding: Metrix.HorizontalSize(10),
    overflow: 'hidden',
  },

  // Line that's fading out at the top
  fadingTopLine: {
    opacity: 0.3,
  },

  // Line that's fading in at the bottom
  fadingBottomLine: {
    opacity: 0.6,
  },
  topFadeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Metrix.VerticalSize(25),
    pointerEvents: 'none',
    zIndex: 1,
  },
  bottomFadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Metrix.VerticalSize(40),
    pointerEvents: 'none',
    zIndex: 1,
  },

  // Center icon for setup screen
  centerIcon: {
    width: Metrix.HorizontalSize(120),
    height: Metrix.VerticalSize(120),
    tintColor: '#57b5fa',
  },

  // Success icon styling
  successIcon: {
    width: Metrix.HorizontalSize(100),
    height: Metrix.VerticalSize(100),
  },

  // Setup Screen Content
  setupContent: {
    paddingVertical: 0, // Remove all vertical padding
    // Remove flex: 1 and justifyContent to allow natural flow
  },

  setupTextContainer: {
    marginTop: Metrix.VerticalSize(15), // Small gap after title
    marginBottom: Metrix.VerticalSize(20), // Small gap before button
    // Remove flex: 1 and justifyContent: 'center'
  },

  setupButtonContainer: {
    marginTop: 0, // No additional top margin
    marginBottom: 0, // No bottom margin
    // Keep justifyContent: 'flex-end' removed
  },

  // Script highlighting styles
  scriptContainer: {
    borderRadius: Metrix.HorizontalSize(12),
    padding: Metrix.HorizontalSize(15),
    flex: 1,
  },
  highlightedScriptContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Metrix.VerticalSize(10),
    paddingBottom: Metrix.VerticalSize(10),
  },
  scriptWord: {
    fontSize: normalizeFont(17),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    lineHeight: 18,
  },
  sentenceContainer: {
    paddingHorizontal: Metrix.HorizontalSize(5),
  },

  sentenceText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },

  sentenceWord: {
    fontSize: normalizeFont(17),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    lineHeight: 22,
  },

  completedWord: {
    color: '#57b5fa',
  },

  currentWord: {
    backgroundColor: 'rgba(87, 181, 250, 0.2)',
    borderRadius: 3,
    paddingHorizontal: 2,
  },

  textSubheading: {
    fontSize: normalizeFont(17),
    letterSpacing: 0.7,
    fontWeight: '400',
    marginBottom: Metrix.VerticalSize(15),
    lineHeight: 20,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  instructionText: {
    fontSize: normalizeFont(18),
    letterSpacing: 0.7,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },

  // Microphone button styles
  microphoneButton: {
    width: 90,
    height: 90,
    borderRadius: 60,
    backgroundColor: '#57b5fa',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#57b5fa',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  microphoneButtonActive: {
    backgroundColor: '#57b5fa',
    shadowColor: '#57b5fa',
  },
  microphoneIcon: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
  microphoneIconActive: {
    tintColor: '#FFFFFF',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  nextButton: {
    paddingHorizontal: Metrix.HorizontalSize(40),
    alignSelf: 'center',
    backgroundColor: '#6b6b6b',
    borderRadius: Metrix.HorizontalSize(8),
    marginVertical: Metrix.VerticalSize(5),
  },

  // Wave animation styles
  waveCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(87, 181, 250, 0.3)',
    backgroundColor: 'rgba(87, 181, 250, 0.1)',
  },
  animatedMicrophoneContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  animatedMicrophoneButton: {
    width: 90,
    height: 90,
    borderRadius: 60,
    backgroundColor: '#57b5fa',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#57b5fa',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  completedMicButton: {
    backgroundColor: '#57b5fa',
    shadowColor: '#57b5fa',
  },
  checkmarkIcon: {
    fontSize: 50,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  animatedMicrophoneIcon: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
  waveContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 260,
    height: 200,
    alignSelf: 'center',
  },
});

export default SafeWordTraining;