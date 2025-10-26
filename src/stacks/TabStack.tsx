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
import { SiriShortcutsService } from '../services/siriShortcuts';

// Initialize AudioSessionManager with error handling
let AudioSessionManager;
let audioEmitter;

try {
  AudioSessionManager = NativeModules.AudioSessionManager;
  if (AudioSessionManager) {
    audioEmitter = new NativeEventEmitter(AudioSessionManager);
  }
} catch (error) {
  console.error('Failed to initialize AudioSessionManager:', error);
  AudioSessionManager = null;
  audioEmitter = null;
}

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

  // 🔥 EXACT SAME STATE AS OLD APPROACH
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

  // Armed timer
  const [armingTimerId, setArmingTimerId] = useState<NodeJS.Timeout | null>(null);
  const activeTimer = useSelector((state: RootState) => state.home.activeTimer || '30m');

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
    try {
      const authResult = await SiriShortcutsService.authenticateForArming();
      if (authResult.success) {
        console.log('✅ Face ID successful');
        NavigationService.navigate('LiveStream');
        setTimeout(() => {
          dispatch(HomeActions.setShowFakeLockScreen(true));
          startArmingTimer();
          onDisplayNotification(
            'Rove Armed via Siri',
            `Bodycam protection active for ${activeTimer}`
          );
        }, 500);
      } else {
        Alert.alert('Authentication Failed', 'Could not authenticate');
      }
    } catch (error) {
      console.error('❌ Arming failed:', error);
      Alert.alert('Error', 'Failed to arm Rove');
    }
  };

  // 🔥 EXACT SAME CLEANUP EFFECT AS OLD APPROACH
  useEffect(() => {
    if (isAudioStreamStopped) {
      console.log('🔴 Audio stream stopped - cleaning up Swift services');
      // 🔥 REPLACED: LiveAudioStream.stop() with Swift equivalent
      if (AudioSessionManager) {
        console.log('🔴 Stopping Swift audio streaming...');
        AudioSessionManager.stopContinuousAudioStreaming();
        console.log('🔴 Stopping Swift recording...');
        AudioSessionManager.stopRecording();
        console.log('🔴 Stopping Swift speech recognition...');
        AudioSessionManager.stopSpeechRecognition();
      }
    }
    return () => {
      console.log('🧹 TabStack cleanup function called');
      if (ws.current) {
        console.log('🔴 Closing WebSocket connection');
        ws.current.close();
        ws.current = null;
      }
      // 🔥 REPLACED: LiveAudioStream.stop() with Swift equivalent
      if (AudioSessionManager) {
        console.log('🔴 Final cleanup - stopping all Swift services');
        AudioSessionManager.stopContinuousAudioStreaming();
        AudioSessionManager.stopRecording();
        AudioSessionManager.stopSpeechRecognition();
      }
    };
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
    console.log('🔄 isSafeZone changed from', isSafeZone, 'to', sz);
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

  // 🔥 EXACT SAME BACKGROUND TASK SETUP AS OLD APPROACH BUT WITH SWIFT
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

  // 🔥 EXACT SAME STREAMING FUNCTION AS OLD APPROACH BUT WITH SWIFT
  const startStreaming = useCallback(async () => {
    console.log('🎯 setupWebSocket called');
    setupWebSocket();

    // 🔥 REPLACED: LiveAudioStream setup with Swift equivalent
    if (AudioSessionManager && audioEmitter) {
      console.log('🎧 Setting up Swift audio listeners...');

      // Setup Swift audio streaming like the old LiveAudioStream
      const audioStreamListener = audioEmitter.addListener('AudioStreamData', (data) => {
        console.log('Live audio is streaming from Swift========>>> 1');
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          // Convert base64 to raw binary data like old approach
          try {
            const binaryData = atob(data.audioBuffer);
            ws.current.send(binaryData);
          } catch (error) {
            console.error('Error sending Swift audio data:', error);
          }
        }
      });

      // 🔥 ADD: Speech recognition listener for safe word detection
      const speechListener = audioEmitter.addListener('SpeechRecognized', (data) => {
        console.log('🗣️ SPEECH DETECTED:', data.text);
        console.log('🎯 Current safe word:', safeWord);
        console.log('🔍 Is speech final?', data.isFinal);

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

      // Start Swift audio streaming
      try {
        await AudioSessionManager.startContinuousAudioStreaming();
        console.log('✅ Swift audio streaming started');

        // 🔥 ADD: Start speech recognition for safe word detection
        console.log('🗣️ Starting Swift speech recognition for safe word detection...');
        await AudioSessionManager.startSpeechRecognition();
        console.log('✅ Swift speech recognition started');

      } catch (error) {
        console.error('❌ Failed to start Swift services:', error);
      }

      // Store listener for cleanup
      audioStreamRef.current = true;
    } else {
      console.log('⚠️ AudioSessionManager or audioEmitter not available');
    }

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
      onDisplayNotification('Rove', 'Rove is active');
    } else {
      console.log('Background service is not active.');
    }
  }, [currentModel, isSafeZone]);

  // 🔥 EXACT SAME MAIN EFFECT AS OLD APPROACH
  useEffect(() => {
    console.log('📋 Main effect triggered with conditions:', {
      isSafeWord,
      isSafeZone,
      currentModel,
      safeWord,
      audioNameString
    });

    if (isSafeWord && !isSafeZone) {
      console.log('✅ Conditions met - starting streaming...');
      startStreaming();
    } else {
      console.log('❌ Conditions not met - skipping streaming');
      console.log('  - isSafeWord:', isSafeWord);
      console.log('  - isSafeZone:', isSafeZone);
    }
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

    return (
      <View style={styles.tabIconContainer}>
        <Image
          source={focused ? item?.active : item?.inActive}
          resizeMode="contain"
          style={{
            tintColor: color,
            width: Metrix.HorizontalSize(iconSize.width),
            height: Metrix.VerticalSize(iconSize.height),
          }}
        />
        {showAlert && (
          <View style={styles.alertIndicator}>
            <CustomText.SmallText customStyle={styles.alertText}>
              !
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