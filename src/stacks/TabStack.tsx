import { Alert, Image, StyleSheet, View, AppState, Linking } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Settings, TrustedContacts, LiveStream, SafeZone, Premium, HeadsUp, SafeWord, SafeWordTraining, PasscodeSettings, HowToUse, Footages, BodyCam, HeadsUpSettings, SiriSetupScreen } from '../screens';
import { Images, Metrix, NavigationService, Utills } from '../config';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import notifee from '@notifee/react-native';
import { CustomModal, CustomText, PrimaryButton } from '../components';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/reducers';
import { HomeActions } from '../redux/actions';
import { Environments } from '../services/config';
import VoiceDetectionUI from '../components/VoiceDetectionUI';
import { useFocusEffect, useNavigationState } from '@react-navigation/native';
import BackgroundService from 'react-native-background-actions';
import FakeLockScreen from '../components/FakeLockScreen';
import { isThreatWithinRadius } from '../utils/distanceHelpers';
import { HomeAPIS } from '../services/home';
import { store } from '../redux/Store';
import { NativeModules, NativeEventEmitter } from 'react-native';

//Import the new AudioSessionService with interruption handling
import {
  audioSessionService,
  AudioStreamDataEvent,
  SpeechRecognizedEvent,
  MicrophoneInterruptionEvent,
  MicrophoneStatusChangedEvent,
  MicrophoneDebugLogEvent,
  AudioInterruptionEvent,
  SiriInterruptionEvent,
  HeySiriDetectedEvent
} from '../utils/AudioSessionService';

const { SiriEventEmitter } = NativeModules;

const Tab = createBottomTabNavigator();

type TabStackType = {
  name: string;
  component: React.FC;
  active: any;
  inActive: any;
  mode?: 'AUDIO' | 'VIDEO';
}[];

const tabsData: TabStackType = [
  {
    name: 'HeadsUp',
    component: HeadsUp,
    active: Images.HeadsUp,
    inActive: Images.HeadsUp,
    mode: 'AUDIO',
  },
  {
    name: 'LiveStream',
    component: LiveStream,
    active: Images.HomeActive,
    inActive: Images.HomeActive,
    mode: 'VIDEO',
  },
  {
    name: 'Premium',
    component: Premium,
    active: Images.Premium,
    inActive: Images.Premium,
    mode: 'AUDIO',
  },
  {
    name: 'Settings',
    component: Settings,
    active: Images.SettingsActive,
    inActive: Images.SettingsActive,
    mode: 'AUDIO',
  },
];

export const TabStack: React.FC = () => {

  const dispatch = useDispatch();
  const selectedModel = useSelector((state: RootState) => state.home.selectedModel);
  const userDetails = useSelector((state: RootState) => state.home.userDetails);
  const sw = useSelector((state: RootState) => state.home.safeWord?.isSafeWord);
  const sz = useSelector((state: RootState) => state.home.isSafeZone);
  const safeWord = useSelector((state: RootState) => state.home.safeWord?.safeWord);
  const isAudioStreamStopped = useSelector((state: RootState) => state.home.streamStopped);
  const showFakeLockScreen = useSelector((state: RootState) => state.home.showFakeLockScreen);

  //  EXACT SAME STATE AS OLD APPROACH
  const averageHeartRate = 75; // Example average heart rate
  const [isVisible, setIsVisible] = useState(false);
  const [isSafeWord, setIsSafeWord] = useState(sw);
  const [isSafeZone, setIsSafeZone] = useState(sz);
  const [currentModel, setCurrentModel] = useState(selectedModel);

  const gender = userDetails?.user?.gender && userDetails.user.gender.length > 0
    ? userDetails.user.gender
    : 'male';

  // 🔥 EXACT SAME AUDIO NAME STRING AS OLD APPROACH
  const audioNameString =
    userDetails?.user?.first_name +
    userDetails?.user?.last_name +
    '-' +
    gender +
    '-' +
    safeWord;

  // 🔥 EXACT SAME WEBSOCKET REF AS OLD APPROACH
  const ws = useRef<WebSocket | null>(null);

  // UI states
  const navigationState = useNavigationState(state => state);
  const currentTabName = navigationState?.routes?.[navigationState.index]?.name || 'LiveStream';
  const cameraMode = useSelector((state: RootState) => state.home.cameraMode || 'AUDIO');
  const threatAlertMode = useSelector((state: RootState) => state.home.threatAlertMode);
  const headsUpRadius = useSelector((state: RootState) => state.home.headsUpRadius || 3);
  const userLocation = useSelector((state: RootState) => state.home.userLocation);
  const [hasThreatsInRadius, setHasThreatsInRadius] = useState(false);

  const isOnLiveStreamTab = currentTabName === 'LiveStream';
  const isVideoMode = cameraMode === 'VIDEO';

  // Voice UI states
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [voiceUIState, setVoiceUIState] = useState<'listening' | 'processing' | 'detected'>('listening');
  const [audioLevel, setAudioLevel] = useState(0.5);

  // 🔥 EXACT SAME WEBSOCKET STATES AS OLD APPROACH
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<boolean>(false);

  // 🔥 NEW: Enhanced interruption states
  const [isAudioServicesSuspended, setIsAudioServicesSuspended] = useState(false);
  const [lastInterruptionType, setLastInterruptionType] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Armed timer
  const [armingTimerId, setArmingTimerId] = useState<NodeJS.Timeout | null>(null);
  const activeTimer = useSelector((state: RootState) => state.home.activeTimer || '30m');

  //Siri Detection...
  const [showSiriBlockedModal, setShowSiriBlockedModal] = useState(false);


  console.log('inside the tabstack with enhanced interruption handling')

  const timerToMilliseconds = (timer: string): number => {
    const minutes = parseInt(timer.replace('m', ''));
    return minutes * 60 * 1000;
  };

  const startArmingTimer = useCallback(() => {
    if (armingTimerId) {
      clearTimeout(armingTimerId);
    }

    const duration = timerToMilliseconds(activeTimer);
    const timerId = setTimeout(() => {
      console.log('🕒 Arming timer expired - automatically disarming');
      dispatch(HomeActions.setShowFakeLockScreen(false));
      onDisplayNotification(
        'Bodycam Timer Expired',
        `Your ${activeTimer} protection period has ended`
      );
      setArmingTimerId(null);
    }, duration);
    setArmingTimerId(timerId);
  }, [activeTimer, armingTimerId, dispatch]);

  useEffect(() => {
    console.log('🗣️ Setting up Hey Siri detection listener...');

    const heySiriListener = audioSessionService.addListener('HeySiriDetected', (event: HeySiriDetectedEvent) => {
      console.log('🚨 HEY SIRI DETECTED WHILE APP HAS MIC!', event);
      console.log('📱 App currently has microphone, blocking Siri activation');

      // Show the modal to inform user
      setShowSiriBlockedModal(true);

      // Optional: Show notification as well
      onDisplayNotification(
        'Siri Blocked',
        'Cannot use Siri while Rove is active. Press and hold power button to use Siri.'
      );
    });

    return () => {
      console.log('🧹 Cleaning up Hey Siri detection listener');
      heySiriListener.remove();
    };
  }, []);

  useEffect(() => {
    if (SiriEventEmitter) {
      const siriEmitter = new NativeEventEmitter(SiriEventEmitter);
      const sub = siriEmitter.addListener('RoveArmCommand', (data) => {
        console.log('🚀 Siri command received in JS:', data);
        handleArmCommand(data.source || 'siri');
      });
      return () => sub.remove();
    }
  }, []);

  useEffect(() => {
    if (showFakeLockScreen) {
      startArmingTimer();
    } else {
      if (armingTimerId) {
        console.log('🛑 Clearing arming timer (manual disarm)');
        clearTimeout(armingTimerId);
        setArmingTimerId(null);
      }
    }
  }, [showFakeLockScreen]);

  useEffect(() => {
    return () => {
      if (armingTimerId) {
        clearTimeout(armingTimerId);
      }
    }
  }, [armingTimerId]);

  // Deep linking
  useEffect(() => {
    console.log('🔗 Setting up deep link listener...');

    const linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 Deep link received:', event.url);
      if (event.url === 'rove://arm') {
        handleArmCommand('deeplink');
      }
    });

    Linking.getInitialURL().then(url => {
      if (url === 'rove://arm') {
        setTimeout(() => handleArmCommand('deeplink-initial'), 1000);
      }
    });

    return () => {
      linkingSubscription?.remove();
    };
  }, [dispatch]);

  const handleArmCommand = async (source: string) => {
    console.log(`🚨 ARM COMMAND from ${source}!`);
    // Alert.alert('ARM COMMAND', `Received from ${source}`);

    // Set flag to arm when LiveStream loads
    dispatch(HomeActions.setShouldArmOnLivestream(true));

    // Navigate to LiveStream
    NavigationService.navigate('LiveStream');
  };

  // 🔥 ENHANCED: Cleanup effect with enhanced audio session service
  useEffect(() => {
    if (isAudioStreamStopped) {
      console.log('🔴 Audio stream stopped - cleaning up enhanced audio services');
      stopAllAudioServices();
    }

    return () => {
      console.log('🧹 TabStack cleanup function called');
      if (ws.current) {
        console.log('🔴 Closing WebSocket connection');
        ws.current.close();
        ws.current = null;
      }
      console.log('🔴 Final cleanup - stopping all enhanced audio services');
      stopAllAudioServices();
    };
  }, []);

  // Helper function to stop all audio services
  const stopAllAudioServices = useCallback(async () => {
    try {
      await audioSessionService.stopAudioStreaming();
      await audioSessionService.stopRecording();
      await audioSessionService.stopSpeechRecognition();
      console.log('✅ All enhanced audio services stopped');
    } catch (error) {
      console.error('❌ Error stopping audio services:', error);
    }
  }, []);

  // 🔥 EXACT SAME MODEL UPDATE AS OLD APPROACH
  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  // 🔥 EXACT SAME THREAT DETECTION FUNCTIONS AS OLD APPROACH
  const threatDetected = () => {
    dispatch(HomeActions.setThreatDetected(true));
    onDisplayNotification(
      'A New Threat Detected',
      'Start your live stream now',
    );
  };

  const appTriggeredDetected = () => {
    dispatch(HomeActions.setAppTriggered(true));
    onDisplayNotification(
      'App Triggered Detection',
      'Starting your live stream now',
    );
  };

  // 🔥 EXACT SAME STATE EFFECTS AS OLD APPROACH
  useEffect(() => {
    console.log('🔄 isSafeWord changed from', isSafeWord, 'to', sw);
    setIsSafeWord(sw);
  }, [sw]);

  useEffect(() => {
    setIsSafeZone(sz);
  }, [sz]);

  // 🔥 EXACT SAME NOTIFICATION FUNCTION AS OLD APPROACH
  const onDisplayNotification = async (title: string, body: string) => {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });
    await notifee.displayNotification({
      title: title,
      body: body,
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
    });
  };

  console.log('safeWord', safeWord);

  // 🔥 EXACT SAME WEBSOCKET SETUP AS OLD APPROACH
  const setupWebSocket = useCallback(() => {
    console.log('🌐 Creating WebSocket connection to:', currentModel);
    console.log('🔗 Will send audioNameString:', audioNameString);

    const socket = new WebSocket(currentModel);

    socket.onopen = () => {
      console.log('✅ WebSocket connection opened successfully');
      console.log('📤 Sending audioNameString to server:', audioNameString);
      ws.current = socket;
      ws.current.send(audioNameString);
      console.log('✅ AudioNameString sent to server');
    };

    socket.onmessage = event => {
      console.log('📨 Message received from server:', event.data);
      try {
        const parsedData = JSON.parse(event.data);
        console.log('📊 Parsed server data:', parsedData);

        // 🔥 EXACT SAME APP TRIGGERED DETECTION AS OLD APPROACH
        if (parsedData.severity === 'APP triggered') {
          console.log('🚨 APP triggered detected - starting stream');
          appTriggeredDetected();
          return; // Exit early
        }

        // 🔥 EXACT SAME THREAT DETECTION LOGIC AS OLD APPROACH
        if (currentModel == Environments.Models.WHISPER_AND_SENTIMENT) {
          console.log('🧠 Using WHISPER_AND_SENTIMENT model');
          const isNegativeSentiment = parsedData?.sentiment == 'negative';
          const threatScore = parsedData?.threat_level > 0.7 ? true : false;
          console.log('📊 Sentiment analysis:', { isNegativeSentiment, threatScore });

          if (isNegativeSentiment && threatScore) {
            console.log('🚨 Threat detected via sentiment analysis');
            threatDetected();
          }
        } else {
          console.log('🧠 Using standard threat detection model');
          const isThreat = parsedData['threat detected'];
          console.log('🔍 Threat detection result:', isThreat);

          if (isThreat) {
            console.log(`🚨 ${isThreat} is a threatening word.`);
            threatDetected();
          } else {
            console.log('✅ No threat detected in this message');
          }
        }
      } catch (error) {
        console.error('❌ Error parsing server message:', error);
      }
    };

    socket.onerror = error => {
      console.error('❌ WebSocket error occurred:', error);
    };

    socket.onclose = (event) => {
      console.log('🔴 WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
    };
  }, [currentModel, audioNameString, isSafeZone]);

  // 🔥 EXACT SAME BACKGROUND TASK SETUP AS OLD APPROACH
  const options = {
    taskName: 'Background Audio',
    taskTitle: 'Background audio is running',
    taskDesc: 'Background audio is running to detect threats',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    }
  };

  const backgroundTask = async (taskDataArguments: any) => {
    const { delay } = taskDataArguments;

    await new Promise(async (resolve) => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        console.log('Background task running', i);

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          console.log('WebSocket is connected in background');
        }

        await BackgroundService.updateNotification({
          taskDesc: `Background task running: ${i}`,
        });

        await new Promise(resolve => setTimeout(resolve, delay || 1000));
      }
      resolve(undefined);
    });
  };

  // 🔥 NEW: Enhanced interruption handling functions
  const handleMicrophoneInterruption = useCallback((event: MicrophoneInterruptionEvent) => {
    console.log('🚨 MICROPHONE INTERRUPTION:', audioSessionService.getInterruptionTypeDescription(event.type));
    console.log('📋 Interruption details:', event);

    setLastInterruptionType(event.type);

    switch (event.type) {
      case 'began':
        setIsAudioServicesSuspended(true);
        onDisplayNotification(
          'Microphone Interrupted',
          'Another app is using the microphone'
        );
        break;

      case 'siri_began':
        setIsAudioServicesSuspended(true);
        console.log('🗣️ Siri detected - services will resume automatically after Siri finishes');
        break;

      case 'ended':
      case 'siri_ended':
        setIsAudioServicesSuspended(false);
        console.log('✅ Services resumed after interruption');
        break;

      case 'failed_resume':
        console.log('❌ Failed to resume - may need manual restart');
        Alert.alert(
          'Audio Service Issue',
          'Failed to resume audio services. Tap to restart.',
          [
            { text: 'Restart', onPress: () => restartAudioServices() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        break;
    }
  }, []);

  const handleDebugLog = useCallback((event: MicrophoneDebugLogEvent) => {
    const formattedLog = audioSessionService.formatDebugLog(event);
    console.log('🐛 DEBUG:', formattedLog);

    // Keep last 50 debug logs
    setDebugLogs(prev => [formattedLog, ...prev.slice(0, 49)]);

    // Check for specific patterns
    if (audioSessionService.detectSiriInterruption(event.message)) {
      console.log('🔍 Siri pattern detected in debug log');
    }

    if (audioSessionService.detectCallInterruption(event.message)) {
      console.log('📞 Call pattern detected in debug log');
    }
  }, []);

  const restartAudioServices = useCallback(async () => {
    console.log('🔄 Manually restarting audio services...');

    try {
      // Stop all services first
      await stopAllAudioServices();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Restart streaming if it should be active
      if (isSafeWord && !isSafeZone) {
        await audioSessionService.startAudioStreaming();
        await audioSessionService.startSpeechRecognition();
        console.log('✅ Audio services restarted successfully');
      }
    } catch (error) {
      console.error('❌ Failed to restart audio services:', error);
      Alert.alert('Error', 'Failed to restart audio services');
    }
  }, [isSafeWord, isSafeZone, stopAllAudioServices]);

  // 🔥 ENHANCED: Streaming function with enhanced audio session service
  const startStreaming = useCallback(async () => {
    console.log('🎯 setupWebSocket called with enhanced interruption handling');
    setupWebSocket();

    // 🔥 ENHANCED: Setup enhanced audio session service with interruption handling
    console.log('🎧 Setting up enhanced audio listeners...');

    // Setup enhanced audio streaming listeners
    audioSessionService.addListener('AudioStreamData', (data: AudioStreamDataEvent) => {
      console.log('Live audio is streaming from enhanced AudioSessionService========>>> 1');
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // Convert base64 to raw binary data like old approach
        try {
          const binaryData = atob(data.audioBuffer);
          ws.current.send(binaryData);
        } catch (error) {
          console.error('Error sending enhanced audio data:', error);
        }
      }
    });

    // 🔥 ENHANCED: Speech recognition listener for safe word detection with interruption awareness
    audioSessionService.addListener('SpeechRecognized', (data: SpeechRecognizedEvent) => {
      console.log('🗣️ ENHANCED SPEECH DETECTED:', data.text);
      console.log('🎯 Current safe word:', safeWord);
      console.log('🔍 Is speech final?', data.isFinal);
      console.log('🔍 Are services suspended?', isAudioServicesSuspended);

      // Skip processing if services are suspended
      if (isAudioServicesSuspended) {
        console.log('⚠️ Services suspended, skipping safe word detection');
        return;
      }

      if (data.text && safeWord) {
        const spokenText = data.text.toLowerCase();
        const targetSafeWord = safeWord.toLowerCase();

        console.log('🔍 Comparing:', {
          spoken: spokenText,
          target: targetSafeWord,
          includes: spokenText.includes(targetSafeWord)
        });

        // Check if the safe word is contained in the spoken text
        if (spokenText.includes(targetSafeWord)) {
          console.log('🚨 SAFE WORD DETECTED! Starting stream...');
          showVoiceDetectionUI(4000);
          NavigationService.navigate('LiveStream', {
            autoStartStream: true,
            triggerReason: 'safe_word',
            detectedWord: safeWord
          });
        } else {
          console.log('⚪ Safe word not detected in speech');
        }
      } else {
        console.log('⚠️ Missing data:', { hasText: !!data.text, hasSafeWord: !!safeWord });
      }
    });

    // 🔥 NEW: Enhanced interruption event listeners
    audioSessionService.addListener('microphoneInterruption', handleMicrophoneInterruption);

    audioSessionService.addListener('microphoneStatusChanged', (event: MicrophoneStatusChangedEvent) => {
      console.log('📊 MICROPHONE STATUS CHANGED:', {
        isActive: event.isActive,
        reason: event.reason,
        timestamp: event.timestamp
      });
    });

    audioSessionService.addListener('microphoneDebugLog', handleDebugLog);

    // 🔥 NEW: Legacy interruption event listeners for compatibility
    audioSessionService.addListener('SiriInterruptionBegan', (event: SiriInterruptionEvent) => {
      console.log('🗣️ LEGACY: Siri interruption began');
      setIsAudioServicesSuspended(true);
    });

    audioSessionService.addListener('SiriInterruptionEnded', (event: SiriInterruptionEvent) => {
      console.log('🟢 LEGACY: Siri interruption ended');
      setIsAudioServicesSuspended(false);
    });

    audioSessionService.addListener('AudioInterruptionBegan', (event: AudioInterruptionEvent) => {
      console.log('📱 LEGACY: General audio interruption began');
      setIsAudioServicesSuspended(true);
    });

    audioSessionService.addListener('AudioInterruptionEnded', (event: AudioInterruptionEvent) => {
      console.log('🟢 LEGACY: General audio interruption ended');
      setIsAudioServicesSuspended(false);
    });

    // Start enhanced audio streaming
    try {
      const streamResult = await audioSessionService.startAudioStreaming();
      if (streamResult.success) {
        console.log('✅ Enhanced audio streaming started');
      } else {
        console.error('❌ Failed to start enhanced audio streaming:', streamResult.message);
      }

      // 🔥 ENHANCED: Start speech recognition for safe word detection
      console.log('🗣️ Starting enhanced speech recognition for safe word detection...');
      const speechResult = await audioSessionService.startSpeechRecognition();
      if (speechResult.success) {
        console.log('✅ Enhanced speech recognition started');
      } else {
        console.error('❌ Failed to start enhanced speech recognition');
      }

    } catch (error) {
      console.error('❌ Failed to start enhanced audio services:', error);
    }

    // Store listener for cleanup
    audioStreamRef.current = true;

    // 🔥 EXACT SAME MESSAGE HANDLING AS OLD APPROACH
    ws.current.onmessage = event => {
      console.log('Message from server: Background', event.data);
      const parsedData = JSON.parse(event.data);
      const isThreat = parsedData['threat detected'];
      console.log('Message from server:Background===', parsedData);
      if (isThreat) {
        console.log(`${isThreat} is a threatening word.`);
        threatDetected();
      } else {
        console.log('No threat detected.');
      }
    };

    ws.current.onerror = error => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // 🔥 EXACT SAME BACKGROUND SERVICE LOGIC AS OLD APPROACH
    if (isSafeWord && !isSafeZone) {
      await BackgroundService.start(backgroundTask, options);
    } else {
      console.log('In BG');
      await BackgroundService.stop();
    }

    const isServiceActive = await BackgroundService.isRunning();
    if (isServiceActive) {
      console.log('Background service is active.');
      // onDisplayNotification('Rove', 'Rove is active');
    } else {
      console.log('Background service is not active.');
    }
  }, [currentModel, isSafeZone, handleMicrophoneInterruption, handleDebugLog, isAudioServicesSuspended]);

  // 🔥 EXACT SAME MAIN EFFECT AS OLD APPROACH
  useEffect(() => {
    console.log('📋 Main effect triggered with enhanced interruption handling conditions:', {
      isSafeWord,
      isSafeZone,
      currentModel,
      safeWord,
      audioNameString,
      isAudioServicesSuspended
    });

    if (isSafeWord && !isSafeZone) {
      console.log('✅ Conditions met - starting enhanced streaming...');
      startStreaming();
    } else {
      console.log('❌ Conditions not met - skipping enhanced streaming');
      console.log('  - isSafeWord:', isSafeWord);
      console.log('  - isSafeZone:', isSafeZone);
    }

    // Cleanup function for enhanced audio session service
    return () => {
      console.log('🧹 Cleaning up enhanced audio session listeners');
      audioSessionService.removeAllListeners();
    };
  }, [startStreaming, isSafeWord, isSafeZone]);

  // Voice detection UI
  const showVoiceDetectionUI = (duration: number = 3000) => {
    setShowVoiceUI(true);
    setVoiceUIState('detected');
    setTimeout(() => {
      setShowVoiceUI(false);
      setVoiceUIState('listening');
    }, duration);
  };

  // UI helper functions
  const getIconSize = (iconName: string) => {
    switch (iconName) {
      case 'LiveStream': return { width: 30, height: 30 };
      case 'HeadsUp': return { width: 30, height: 30 };
      case 'Premium': return { width: 30, height: 30 };
      case 'Settings': return { width: 24, height: 24 };
      default: return { width: 25, height: 25 };
    }
  };

  const renderTabIcon = ({ color, focused }: any, item: any) => {
    const iconSize = getIconSize(item?.name);
    const showAlert = item?.name === 'HeadsUp' && threatAlertMode && hasThreatsInRadius;

    // 🔥 NEW: Show interruption indicator
    const showInterruptionAlert = isAudioServicesSuspended && ['HeadsUp', 'LiveStream'].includes(item?.name);

    return (
      <View style={styles.tabIconContainer}>
        <Image
          source={focused ? item?.active : item?.inActive}
          resizeMode="contain"
          style={{
            tintColor: showInterruptionAlert ? '#FF8800' : color,
            width: Metrix.HorizontalSize(iconSize.width),
            height: Metrix.VerticalSize(iconSize.height),
          }}
        />
        {(showAlert || showInterruptionAlert) && (
          <View style={[styles.alertIndicator, { backgroundColor: showInterruptionAlert ? '#FF8800' : '#FF3B30' }]}>
            <CustomText.SmallText customStyle={styles.alertText}>
              {showInterruptionAlert ? '⏸' : '!'}
            </CustomText.SmallText>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <PaperProvider
        theme={{
          ...MD3LightTheme,
          colors: {
            ...MD3LightTheme.colors,
            surface: Utills.selectedThemeColors().Base,
          }
        }}
      >
        <Tab.Navigator
          initialRouteName='LiveStream'
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              position: isVideoMode ? 'absolute' : 'relative',
              bottom: isVideoMode ? 0 : undefined,
              left: 0,
              right: 0,
              backgroundColor: isVideoMode ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
              shadowOpacity: 0,
              borderTopWidth: 0,
              elevation: 0,
              height: 90,
              paddingBottom: 30,
              paddingTop: 10,
            },
            tabBarActiveTintColor: '#FFF',
            tabBarInactiveTintColor: '#FFF',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
              color: '#FFF'
            },
            tabBarIconStyle: {
              marginBottom: -4,
            },
          }}
        >
          {tabsData.map((item) => (
            <Tab.Screen
              key={item.name}
              name={item.name}
              component={item.component}
              options={{
                tabBarLabel: item.name,
                tabBarIcon: ({ color, focused }) => renderTabIcon({ color, focused }, item),
              }}
            />
          ))}
          <Tab.Screen name="TrustedContacts" component={TrustedContacts} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="SafeWord" component={SafeWord} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="SafeWordTraining" component={SafeWordTraining} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="PasscodeSettings" component={PasscodeSettings} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="HowToUse" component={HowToUse} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="Footages" component={Footages} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="BodyCam" component={BodyCam} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="HeadsUpSettings" component={HeadsUpSettings} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="SiriSetupScreen" component={SiriSetupScreen} options={{ tabBarButton: () => null }} />
        </Tab.Navigator>
      </PaperProvider>

      <CustomModal
        visible={isVisible}
        smallModal
        onClose={() => setIsVisible(false)}>
        <CustomText.MediumText customStyle={{ letterSpacing: 0.9 }}>
          Are you being threatened ?
        </CustomText.MediumText>
        <View style={styles.modalButtonContainer}>
          <PrimaryButton
            title="Yes"
            customStyles={{ borderRadius: 10 }}
            width={'45%'}
            onPress={() => {
              console.log('🚨 User confirmed threat - starting stream...');
              setIsVisible(false);
              onDisplayNotification('A New Threat Detected', 'Start your live stream now');
              NavigationService.navigate('LiveStream', { triggerFunction: true });
            }}
          />
          <PrimaryButton
            title="No"
            width={'45%'}
            customStyles={{ borderRadius: 10 }}
            onPress={() => {
              console.log('✅ User denied threat - closing modal');
              setIsVisible(false);
            }}
          />
        </View>
      </CustomModal>

      {/* NEW: Hey Siri blocked modal */}
      <CustomModal
        visible={showSiriBlockedModal}
        smallModal
        onClose={() => setShowSiriBlockedModal(false)}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <CustomText.MediumText customStyle={{ letterSpacing: 0.9, textAlign: 'center', marginBottom: 10 }}>
            Siri Cannot Be Used
          </CustomText.MediumText>
          <CustomText.SmallText customStyle={{ textAlign: 'center', marginBottom: 15, lineHeight: 20 }}>
            Siri voice activation won’t work while Rove is active. Hold the side button to use Siri
          </CustomText.SmallText>
        </View>
        <View style={[styles.modalButtonContainer, { justifyContent: 'center' }]}>
          <PrimaryButton
            title="Got It"
            customStyles={{ borderRadius: 10 }}
            width={'60%'}
            onPress={() => {
              console.log('✅ User acknowledged Siri blocking');
              setShowSiriBlockedModal(false);
            }}
          />
        </View>
      </CustomModal>

      <VoiceDetectionUI
        visible={showVoiceUI}
        isListening={voiceUIState === 'listening'}
        audioLevel={audioLevel}
        onAnimationComplete={() => {
          console.log('Voice UI animation completed');
          setShowVoiceUI(false);
        }}
      />

      {showFakeLockScreen && (
        <FakeLockScreen
          visible={showFakeLockScreen}
          onUnlock={() => {
            dispatch(HomeActions.setShowFakeLockScreen(false));
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  barStyle: {
    borderTopWidth: 0,
    height: Metrix.VerticalSize(110),
    paddingTop: Metrix.VerticalSize(15),
    paddingBottom: Metrix.VerticalSize(15),
    shadowColor: Utills.selectedThemeColors().PrimaryTextColor,
    shadowOffset: {
      width: Metrix.HorizontalSize(3),
      height: Metrix.VerticalSize(2),
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: Metrix.VerticalSize(20),
  },
  modalButtonContainer: {
    width: '75%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Metrix.VerticalSize(10),
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: Metrix.HorizontalSize(16),
    height: Metrix.VerticalSize(16),
    backgroundColor: '#FF3B30',
    borderRadius: Metrix.HorizontalSize(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    width: Metrix.HorizontalSize(10),
    height: Metrix.VerticalSize(10),
    tintColor: '#FFFFFF',
  },
  alertText: {
    color: '#FFFFFF',
    fontSize: Metrix.customFontSize(12),
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: Metrix.VerticalSize(12),
  },
});