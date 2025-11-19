import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngineEx,
  RenderModeType,
  VideoSourceType,
  createAgoraRtcEngine,
  RtcSurfaceView,
  RecorderState,
  MediaRecorderContainerFormat,
  MediaRecorderStreamType,
} from 'react-native-agora';
import Config from '../../../config/agora.config';
import { askMediaAccess } from '../../../config/utills/permissions';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
  Text,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  FontType,
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import { LiveStreamProps } from '../../propTypes';
import { CustomText, ModeSelector, RoundImageContainer } from '../../../components';
import { deviceHeight, deviceWidth, normalizeFont } from '../../../config/metrix';
import { HomeAPIS } from '../../../services/home';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import RNFS from 'react-native-fs';
import { createThumbnail } from 'react-native-create-thumbnail';
import { HomeActions } from '../../../redux/actions';
import { useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import { Environments } from '../../../services/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProtectionScheduleModal } from '../../../components/ProtectionScheduleModal';
import { set } from 'lodash';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import LiveStreamContent from '../../../components/Livestream/LiveStreamContent';
import LiveStreamModeSelector from '../../../components/Livestream/LiveStreamModeSelector';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import CountdownArming from '../../../components/CountdownArming';
import { getDeviceToken } from '../../../utils/deviceTokenStorage';
import { VideoMergerService } from '../../../services/videoMerger';

const { width: screenWidth } = Dimensions.get('window');

export const LiveStream: React.FC<LiveStreamProps> = ({ }) => {
  const dispatch = useDispatch();
  const preferenceState = useSelector((state: RootState) => state.home.preferenceState || 'AS');
  const currentIsSafeWord = useSelector((state: RootState) => state?.home?.safeWord?.isSafeWord);
  const showCountdownFromSiri = useSelector((state: RootState) => state.home.showCountdownFromSiri);
  const siriArmTrigger = useSelector((state: RootState) => state.home.siriArmTrigger);
  const shouldArmOnLivestream = useSelector((state: RootState) => state.home.shouldArmOnLivestream);

  // NEW: Tutorial state selectors
  const tutorialCompleted = useSelector((state: RootState) => state.home.tutorialCompleted);
  const isFirstTime = useSelector((state: RootState) => state.user.isFirstTime);

  // NEW: Add state for trusted contacts
  const [trustedContacts, setTrustedContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [isThreatDetectionArmed, setIsThreatDetectionArmed] = useState(false);

  const [isEyeCam, setIsEyeCam] = useState(preferenceState === 'AS');
  const [isRespondersCam, setIsRespondersCam] = useState(true); // true = RespondersCam, false = LocalDownload
  const [isHelpMode, setIsHelpMode] = useState(false); // Track if help mode is active
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  type HelpModalConfig = { title: string; icon: string; content: React.ReactNode };
  const [helpModalContent, setHelpModalContent] = useState<HelpModalConfig | null>(null);

  const [localRecordingPaths, setLocalRecordingPaths] = useState<{
    primary?: string;
    secondary?: string;
  }>({});


  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const lastModeSwitch = useRef<number>(0);
  const secondCameraInitialized = useRef<boolean>(false);
  const hasInitializedOnce = useRef(false);
  const rtcInitRef = useRef(false);



  const isFocus = useIsFocused();
  const layout = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const userDetails = useSelector((state: RootState) => state.home.userDetails);
  const [engine, setEngine] = useState<IRtcEngineEx | undefined>(undefined);
  const [startPreview, setStartPreview] = useState(false);
  const [joinChannelSuccess, setJoinChannelSuccess] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [startSecondCamera, setStartSecondCamera] = useState(false);
  const [publishSecondCamera, setPublishSecondCamera] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [incident_id, setIncident_id] = useState('');
  const [state, setState] = useState({
    appId: Config.appId,
    enableVideo: true,
    channelId: Config.channelId,
    token: Config.token,
    uid: Config.uid,
    token2: Config.token,
    uid2: 99,
    storagePath: `${Platform.OS === 'android'
      ? RNFS.ExternalCachesDirectoryPath
      : RNFS.DocumentDirectoryPath
      }`,
    storagePath2: `${Platform.OS === 'android'
      ? RNFS.ExternalCachesDirectoryPath
      : RNFS.DocumentDirectoryPath
      }`,
    containerFormat: MediaRecorderContainerFormat.FormatMp4,
    streamType: MediaRecorderStreamType.StreamTypeBoth,
    streamType2: MediaRecorderStreamType.StreamTypeVideo,
    maxDurationMs: 120000,
    recorderInfoUpdateInterval: 1000,
    startRecording: false,
  });
  const [lastImage, setLastImage] = useState<any>({
    video: null,
    thumbnail: null,
  });

  const cameraMode = useSelector((state: RootState) => state.home.cameraMode || 'AUDIO');

  //Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  const [eyeEarState, setEyeEarState] = useState('EYE'); // 'EYE' or 'EAR'
  // const [preferenceState, setPreferenceState] = useState('A'); // 'A', 'AS', or 'MIC'
  const [modalVisible, setModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(''); // New toast message state
  const [showToast, setShowToast] = useState(false); // New toast visibility state

  // New state variables for header icons
  const [showAudioIcon, setShowAudioIcon] = useState(true); // Toggle between A and S
  const [showEyeIcon, setShowEyeIcon] = useState(true); // Toggle between ear and eye
  const [showProtectionSchedule, setShowProtectionSchedule] = useState(false);

  const route = useRoute();
  const testStreamContact = route?.params?.testStreamContact;
  const isTestStream = route?.params?.isTestStream;

  const [step, setStep] = useState(0);
  const [resource_id, setResource_id] = useState('');
  const [sid, setSid] = useState('');
  const [viewers, setViewers] = useState<any>([]);
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [hours, setHours] = useState(0);
  const [mode, setMode] = useState<'AUDIO' | 'VIDEO'>(cameraMode);
  const [selectedMode, setSelectedMode] = useState('AUDIO');
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [isFlashlight, setIsFlashlight] = useState(false);
  const [isCircle, setIsCircle] = useState(true);
  const [recorder, setRecorder] = useState<any | null>(null);
  const [recorder2, setRecorder2] = useState<any | null>(null);
  const [isModeText, setIsModeText] = useState(false);
  const [modeMsg, setModeMsg] = useState('');
  const [preferenceMsg, setPreferenceMsg] = useState('Monitoring for assault');
  const [pressedIndex, setPressedIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const sizeAnim = useRef(new Animated.Value(70)).current;
  const borderRadiusAnim = useRef(new Animated.Value(50)).current;

  const [showCountdown, setShowCountdown] = useState(false);
  const [showFakeLockScreen, setShowFakeLockScreen] = useState(false);

  //for localdownload video...
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  //timer selector for arming...
  const activeTimer = useSelector((state: RootState) => state.home.activeTimer || '30m');

  // Animation values for horizontal swiping
  const translateX = useSharedValue(0);
  const modeIndex = useSharedValue(0); // 0 for AUDIO, 1 for VIDEO

  //
  const responderUidMapRef = useRef({});

  const userCordinates = useSelector(
    (state: RootState) => state.home.userLocation,
  );
  const isSafeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.isSafeWord,
  );
  const safeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.safeWord,
  );
  const isThreatDetected = useSelector(
    (state: RootState) => state?.home?.threatDetected,
  );

  const isAppTriggered = useSelector(
    (state: RootState) => state?.home?.appTriggered,
  );



  // NEW: Function to fetch trusted contacts
  const fetchTrustedContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const response = await HomeAPIS.getTrustedContacts();
      console.log('Trusted Contacts Response:', response.data);
      setTrustedContacts(response.data || []);
    } catch (error) {
      console.error('Error fetching trusted contacts:', error);
      setTrustedContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // NEW: Check if user has trusted contacts
  const hasContacts = trustedContacts.length > 0;

  // NEW: Fetch contacts on component mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchTrustedContacts();
    }, [fetchTrustedContacts])
  );

  useFocusEffect(
    useCallback(() => {
      console.log("🎥 LiveStream Focused — showing video");

      // Prevent initialize logic from firing twice on first mount
      if (!hasInitializedOnce.current) {
        hasInitializedOnce.current = true;
      }

      if (engine) {
        // Simply unmute to resume view
        engine.muteLocalVideoStream(false);

        // Ensure secondary camera is initialized once
        if (!secondCameraInitialized.current) {
          startSecondCameraCapture();
        }
      }

      return () => {
        console.log("🚪 LiveStream Unfocused — hiding video");

        if (engine) {
          // DO NOT destroy preview, just hide it
          engine.muteLocalVideoStream(true);
        }
      };
    }, [engine])
  );

  const switchMode = (newMode: 'AUDIO' | 'VIDEO') => {
    const now = Date.now();

    // 🛑 Debounce fast swipes (under 700ms)
    if (now - lastModeSwitch.current < 700) {
      console.log('⛔ Prevent double mode switch (too fast)');
      return;
    }
    lastModeSwitch.current = now;

    console.log('LiveStream - switching to mode:', newMode);

    // ✅ Keep your existing state updates
    setMode(newMode);
    dispatch(HomeActions.setCameraMode(newMode));

    const newIndex = newMode === 'AUDIO' ? 0 : 1;
    modeIndex.value = withSpring(newIndex, {
      damping: 20,
      stiffness: 200,
    });

    // 🎥 NEW: only mute/unmute video instead of tearing cameras down
    if (engine) {
      if (newMode === 'AUDIO') {
        console.log('🎛 [switchMode] Muting local video for AUDIO mode');
        engine.muteLocalVideoStream(true);
      } else {
        console.log('🎛 [switchMode] Unmuting local video + ensuring secondary camera for VIDEO mode');
        engine.muteLocalVideoStream(false);
        // Ensure secondary/front camera is initialized once
        startSecondCameraCapture();
      }
    }

    // ✅ Keep your UI/UX logic
    if (newMode === 'AUDIO') {
      setEyeEarState('EAR');
      showToastNotification('Recipients will get: Audio Stream');
    } else {
      setEyeEarState('EYE');
      showToastNotification('Recipients will get: Video Stream');
    }
  };


  useEffect(() => {
    if (siriArmTrigger) {
      console.log('🎯 Siri arm trigger received - simulating button click');

      // Reset the trigger first
      dispatch(HomeActions.setSiriArmTrigger(false));

      // Simulate the button click logic
      if (!isThreatDetectionArmed) {
        console.log('⏱️ Starting countdown to arm via Siri...');
        setShowCountdown(true);
      }
    }
  }, [siriArmTrigger, isThreatDetectionArmed, dispatch]);

  useEffect(() => {
    if (shouldArmOnLivestream) {
      console.log('🎯 Should arm flag detected!');
      // Alert.alert('LIVESTREAM EFFECT', 'Starting countdown...');

      // Reset the flag
      dispatch(HomeActions.setShouldArmOnLivestream(false));

      // Start countdown
      setShowCountdown(true);
    }
  }, [shouldArmOnLivestream, dispatch]);

  useEffect(() => {
    //
    if (!showFakeLockScreen && isThreatDetectionArmed) {
      setIsThreatDetectionArmed(false);
    }
  }, [showFakeLockScreen, isThreatDetectionArmed]);

  // Add this useEffect in your LiveStream component
  useEffect(() => {
    const fromSafetyCheck = route?.params?.fromSafetyCheck;
    const incident_id = route?.params?.incident_id;

    if (fromSafetyCheck && incident_id) {
      console.log('📱 User opened stream from safety check notification');
      console.log('📱 Incident ID:', incident_id);

      // Show toast notification
      showToastNotification('Tap to speak to your responders - confirm your safety status');

      // Optionally auto-start stream if not already streaming
      if (!isStreaming) {
        console.log('💡 Stream not active - user needs to start manually');
        // You could auto-start here if desired:
        // setTimeout(() => startAndStopStream(), 2000);
      }
    }
  }, [route?.params, isStreaming]);

  // And add this useEffect to initialize the mode when component mounts:
  useEffect(() => {
    dispatch(HomeActions.setCameraMode(mode));
  }, [dispatch, mode]);

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldSwitch = Math.abs(event.translationX) > screenWidth * 0.2;

      if (shouldSwitch) {
        if (event.translationX > 0 && mode === 'VIDEO') {
          // Swipe right: VIDEO to AUDIO
          runOnJS(switchMode)('AUDIO');
        } else if (event.translationX < 0 && mode === 'AUDIO') {
          // Swipe left: AUDIO to VIDEO
          runOnJS(switchMode)('VIDEO');
        }
      }

      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
      });
    });

  const showToastNotification = (message: string | { firstLine: string; secondLine: string }) => {
    setToastMessage(message);
    setShowToast(true);

    const hideDelay = typeof message === 'object' && message.isComplex ? 4000 : 3000;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowToast(false);
      setToastMessage('');
    }, hideDelay);
  };

  // Add this after your existing useEffects in LiveStream component
  useEffect(() => {
    const autoStartStream = route?.params?.autoStartStream;
    const triggerReason = route?.params?.triggerReason;
    const detectedWord = route?.params?.detectedWord;

    if (autoStartStream && triggerReason === 'safe_word') {
      console.log('🚨 Auto-starting stream due to safe word detection:', detectedWord);

      // Show notification about safe word detection
      showToastNotification(`Safe word "${detectedWord}" detected - Starting emergency stream`);

      // Auto-start the stream after brief delay
      setTimeout(() => {
        startAndStopStream();
      }, 2000);
    }
  }, [route?.params]);

  useEffect(() => {
    console.log('🧪 Checking for test stream parameters...');
    console.log('testStreamContact:', testStreamContact);
    console.log('isTestStream:', isTestStream);

    if (isTestStream && testStreamContact) {
      console.log('🎬 Test stream detected, starting stream with contact:', testStreamContact.name);

      // Show a toast notification
      showToastNotification(`Starting test stream with ${testStreamContact.name}`);

      // Auto-start the stream after a short delay
      setTimeout(() => {
        startAndStopStream();
      }, 2000);
    }
  }, [isTestStream, testStreamContact]);

  useEffect(() => {
    // Preload the eye icon
    if (Images.EyeAbleIcon) {
      Image.prefetch(Image.resolveAssetSource(Images.EyeAbleIcon).uri);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // When screen loses focus, close the modal
      return () => {
        setModalVisible(false);
      };
    }, [])
  );

  // NEW: Enhanced toast notification
  // const leftHeaderOptions = [
  //   {
  //     id: '1',
  //     key: 'Preference Toggle',
  //     icon: getPreferenceIcon(),
  //     onPress: () => {
  //       console.log('⚙️ Preference toggle pressed, current state:', preferenceState);

  //       if (preferenceState === 'A') {
  //         setPreferenceState('AS');
  //         // Show toast for Safe Word Only (AS state)
  //         showToastNotification({
  //           firstLine: 'Stream activates via:',
  //           secondLine: 'Safe Word Only'
  //         });
  //         dispatch(
  //           HomeActions.setSelectedModel(
  //             Environments.Models.WHISPER_AND_SENTIMENT,
  //           ),
  //         );
  //         dispatch(
  //           HomeActions.setSafeWord({
  //             isSafeWord: true,
  //             safeWord: safeWord,
  //           }),
  //         );
  //       } else if (preferenceState === 'AS') {
  //         setPreferenceState('MIC');
  //         // Show toast for Manual activation only
  //         showToastNotification({
  //           firstLine: 'Stream activates via:',
  //           secondLine: 'Manual activation only'
  //         });
  //       } else {
  //         setPreferenceState('A');
  //         // Show toast for Auto Detection + Safe Word (A state)
  //         showToastNotification({
  //           firstLine: 'Stream activates via:',
  //           secondLine: 'Auto Detection + Safe Word'
  //         });
  //         dispatch(
  //           HomeActions.setSelectedModel(
  //             Environments.Models.TRIGGER_WORD_WHISPER,
  //           ),
  //         );
  //         dispatch(
  //           HomeActions.setSafeWord({
  //             isSafeWord: false,
  //             safeWord: safeWord,
  //           }),
  //         );
  //       }
  //     },
  //   },
  //   {
  //     id: '2',
  //     key: 'Protection Schedule',
  //     icon: Images.Schedule || Images.Bell,
  //     step: 2,
  //     disabled: preferenceState === 'MIC', // Add this line
  //     onPress: () => {
  //       // Only allow press if not in MIC state
  //       if (preferenceState !== 'MIC') {
  //         setModalVisible(true);
  //       }
  //     }
  //   }
  // ].filter(Boolean);



  const leftHeaderOptions = [
    {
      id: '1',
      key: 'EyeCam/NoMic Toggle',
      icon: isEyeCam ? (mode === 'VIDEO' ? Images.EyeCam : Images.Ear) : Images.NoMic,
      onPress: () => {
        if (isHelpMode) {
          // Show help modal for EyeCam
          setHelpModalContent(helpModalConfigs.eyeCam);
          setHelpModalVisible(true);
          return;
        }

        const newIsEyeCam = !isEyeCam;
        setIsEyeCam(newIsEyeCam);

        if (newIsEyeCam) {
          dispatch(HomeActions.setPreferenceState('AS'));

          dispatch(HomeActions.setSelectedModel(Environments.Models.WHISPER_AND_SENTIMENT));
          dispatch(HomeActions.setSafeWord({
            isSafeWord: true,  // TabStack checks this
            safeWord: safeWord,
          }));

          if (mode === 'VIDEO') {
            showToastNotification({
              isComplex: true,
              type: 'eyeCam',
              lines: [
                { text: 'Video Stream activates via', style: 'normal' },
                { text: 'Threat Detection or Safe Word', style: 'bold' },
                { text: '⚠️ NOTE! ⚠️', style: 'normal' },
                { text: 'Must be armed', style: 'normal' },
                { text: '👉', style: 'bold', showInlineIcon: true }
              ]
            });
          } else {
            showToastNotification({
              firstLine: 'Audio Stream activates via',
              secondLine: 'Threat Detection or Safe Word'
            });
          }
        }
        else {
          dispatch(HomeActions.setPreferenceState('MIC'));

          dispatch(HomeActions.setSafeWord({
            isSafeWord: false,
            safeWord: safeWord,
          }));

          showToastNotification({
            firstLine: 'Stream activates via:',
            secondLine: 'Manual activation only'
          });
        }
      },
    },
    {
      id: '2',
      key: 'Responders/Download Toggle',
      icon: isHelpMode ? Images.LocalDownload : (isRespondersCam ? Images.RespondersCam : Images.LocalDownload),
      onPress: () => {
        if (isHelpMode) {
          //  Always show localDownload content in help mode
          setHelpModalContent(helpModalConfigs.localDownload);
          setHelpModalVisible(true);
          return;
        }

        // Normal functionality
        console.log('🔄 RespondersCam/LocalDownload toggle pressed');
        setIsRespondersCam(prev => !prev);

        if (isRespondersCam) {
          showToastNotification({
            isComplex: true,
            type: 'localDownload',
            lines: [
              { text: 'Streams are saved: Locally', style: 'normal' },
              { text: '⚠️', style: 'warning' },
              { text: 'Warning', style: 'bold' },
              { text: 'Disables Responders', style: 'normal' }
            ]
          });
        } else {
          showToastNotification({
            isComplex: true,
            type: 'respondersCam',
            lines: [
              { text: 'Streams are saved:', style: 'normal' },
              { text: 'Cloud responders + locally', style: 'bold' },
              { text: '(default)', style: 'normal' }
            ]
          });
        }
      },
    },
    ...(mode === 'AUDIO' ? [{
      id: '3',
      key: 'Protection Schedule',
      icon: Images.Schedule || Images.Bell,
      step: 2,
      disabled: preferenceState === 'MIC', // Disabled when in MIC state
      onPress: () => {
        if (isHelpMode) {
          // Add help modal for Protection Schedule if needed
          // setHelpModalContent(helpModalConfigs.protectionSchedule);
          // setHelpModalVisible(true);
          return;
        }

        // Only allow press if not in MIC state
        if (preferenceState !== 'MIC') {
          setModalVisible(true);
        }
      }
    }] : [])
  ].filter(Boolean);

  useEffect(() => {
    setIsEyeCam(preferenceState === 'AS');
  }, [preferenceState]);

  useEffect(() => {
    // Only set initial preferenceState if it's not already set and we have existing safeWord state
    if (!preferenceState || preferenceState === 'AS') { // Default case
      const initialPreferenceState = currentIsSafeWord ? 'AS' : 'MIC';

      if (preferenceState !== initialPreferenceState) {
        dispatch(HomeActions.setPreferenceState(initialPreferenceState));
      }
    }
  }, []);

  // ✅ FIXED: Flashlight only shows in VIDEO mode
  const rightHeaderOptions = mode === 'VIDEO' ? [
    {
      id: '3',
      key: 'Flashlight',
      icon: isFlashlight ? Images.FlashOn : Images.FlashOff,
      step: 3,
      description: 'Enable or disable the flashlight',
      onPress: () => {
        setIsFlashlight(prev => !prev);
        engine?.setCameraTorchOn(!isFlashlight);
      },
    },
    {
      id: '4',
      key: 'Help',
      icon: null,
      isTextIcon: true,
      text: '?',
      step: 4,
      description: 'Help and information',
      onPress: () => {
        console.log('❓ Help button pressed, current state:', isHelpMode);
        setIsHelpMode(prev => {
          const newHelpMode = !prev;
          if (newHelpMode) {
            startPulsingAnimation();
            // showToastNotification('Help mode activated - tap any button for info');
          } else {
            stopPulsingAnimation();
            // showToastNotification('Help mode deactivated');
          }
          return newHelpMode;
        });
      },
    },
  ] : []; // Empty array when in AUDIO mode

  const startPulsingAnimation = () => {
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animationRef.current.start();
  };

  const stopPulsingAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop(); // stop the running loop
      animationRef.current = null; // clear ref
    }
    pulseAnim.setValue(1); // reset scale
  };

  const toggleShape = () => {
    if (isCircle) {
      Animated.parallel([
        Animated.timing(sizeAnim, {
          toValue: 30,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(borderRadiusAnim, {
          toValue: 7,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Animate from square to circle
      Animated.parallel([
        Animated.timing(sizeAnim, {
          toValue: 70,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(borderRadiusAnim, {
          toValue: 50,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    }

    setIsCircle(!isCircle);
  };

  const extractInitials = (text: string) => {
    const parts = text.split(' ');
    const firstLetters = parts.map(part => part.charAt(0));
    const result = firstLetters.join('');
    return result;
  };

  const fetchLastFootage = async () => {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      // Filter for video files only, e.g., `.mp4`

      const videoFiles = files.filter(file => file.name.endsWith('.mp4'));
      if (videoFiles.length === 0) {
        console.log('No video files found.');
        return;
      }
      // Sort files by modification time (mtime) in descending order
      const sortedFiles = videoFiles.sort(
        (a: any, b: any) =>
          new Date(b.mtime).getTime() - new Date(a.mtime).getTime(),
      );
      // Get the most recently modified video file
      const lastVideoFile = sortedFiles[1];
      const thumbnail = await createThumbnail({
        url: lastVideoFile.path,
      });
      console.log('lastVideoFile', lastVideoFile);

      if (lastVideoFile?.path?.endsWith('AUDIO.mp4')) {
        setLastImage({
          video: null,
          thumbnail: null,
        });
      } else {
        setLastImage({
          video: lastVideoFile,
          thumbnail: thumbnail.path,
        });
      }
    } catch (error) {
      console.error('Error fetching video or creating thumbnail:', error);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isStreaming) {
      interval = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds === 59) {
            setMinutes(prevMinutes => {
              if (prevMinutes === 59) {
                setHours(prevHours => prevHours + 1);
                return 0;
              }
              return prevMinutes + 1;
            });
            return 0;
          }
          return prevSeconds + 1;
        });
      }, 1000);
    } else if (!isStreaming && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isStreaming, seconds]);

  const formatTime = (unit: any) => (unit < 10 ? `0${unit}` : unit);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isThreatDetected) {
      startAndStopStream();
      // Reset the threat detection state
      dispatch(HomeActions.setThreatDetected(false));
    }
  }, [isThreatDetected]);

  useEffect(() => {
    if (isAppTriggered) {
      startAndStopStream();
      // Reset the state after handling
      dispatch(HomeActions.setAppTriggered(false));
    }
  }, [isAppTriggered]);

  useEffect(() => {
    fetchLastFootage();
  }, []);

  useEffect(() => {
    initRtcEngine();
  }, [isFocus]);

  // All your existing functions remain the same...
  const startRecordingAPI = async (token: any, incidentId: string) => {
    console.log('📹 [startRecordingAPI] Initiating cloud recording...');
    console.log('📹 [startRecordingAPI] isRespondersCam:', isRespondersCam);
    console.log('📹 [startRecordingAPI] Incident ID:', incidentId);
    console.log('📹 [startRecordingAPI] Channel name:', state.channelId);

    if (!isRespondersCam) {
      console.log('💾 [startRecordingAPI] LocalDownload mode - skipping cloud recording');
      return;
    }

    const body = {
      channel_name: state.channelId,
      recorder_uid: '316000',
      token: token,
      incident_id: incidentId,
    };

    console.log('📹 [startRecordingAPI] Recording request body:', JSON.stringify(body, null, 2));

    try {
      const res = await HomeAPIS.startRecording(body);
      console.log('✅ [startRecordingAPI] Cloud recording started successfully');
      console.log('📹 [startRecordingAPI] Full response:', JSON.stringify(res?.data, null, 2));
      console.log('📹 [startRecordingAPI] Resource ID:', res?.data?.startRecordingResponse?.resourceId);
      console.log('📹 [startRecordingAPI] SID:', res?.data?.startRecordingResponse?.sid);

      setResource_id(res?.data?.startRecordingResponse?.resourceId);
      setSid(res?.data?.startRecordingResponse?.sid);
      console.log('📹 [startRecordingAPI] Recording identifiers saved to state');
    } catch (err) {
      console.error('❌ [startRecordingAPI] Cloud recording failed:', err.response?.data || err.message);
      console.error('❌ [startRecordingAPI] Error status:', err.response?.status);
    }
  };

  const stopRecordingAPI = async () => {
    console.log('🛑 [stopRecordingAPI] Stopping cloud recording...');
    console.log('🛑 [stopRecordingAPI] isRespondersCam:', isRespondersCam);
    console.log('🛑 [stopRecordingAPI] Resource ID:', resource_id);
    console.log('🛑 [stopRecordingAPI] SID:', sid);
    console.log('🛑 [stopRecordingAPI] Incident ID:', incident_id);

    if (!isRespondersCam) {
      console.log('💾 [stopRecordingAPI] LocalDownload mode - skipping cloud recording stop');
      return;
    }

    if (!resource_id || !sid) {
      console.log('⚠️ [stopRecordingAPI] Missing recording identifiers - cannot stop recording');
      console.log('⚠️ [stopRecordingAPI] This may indicate recording never fully started');
      return;
    }

    const body = {
      channel_name: state.channelId,
      recorder_uid: '316000',
      resource_id: resource_id,
      sid: sid,
      incident_id: incident_id,
      recording_type: mode.toLowerCase(),
    };

    console.log('🛑 [stopRecordingAPI] Stop recording body:', JSON.stringify(body, null, 2));

    try {
      const res = await HomeAPIS.stopRecording(body);
      console.log('✅ [stopRecordingAPI] Cloud recording stopped successfully');
      console.log('🛑 [stopRecordingAPI] Full response:', JSON.stringify(res?.data, null, 2));

      // Log recording links
      if (res?.data?.incident_updated) {
        console.log('🎬 [stopRecordingAPI] Recording links generated:');
        console.log('🎬 [stopRecordingAPI] Video link:', res.data.incident_updated.agora_video_link);
        console.log('🎬 [stopRecordingAPI] Audio link:', res.data.incident_updated.agora_audio_link);
        console.log('🎬 [stopRecordingAPI] Recording type:', res.data.incident_updated.recording_type);
        console.log('🎬 [stopRecordingAPI] Live link:', res.data.incident_updated.live_link);
      } else {
        console.log('⚠️ [stopRecordingAPI] No incident_updated in response - links may not be available');
      }

      console.log('🛑 [stopRecordingAPI] Clearing incident ID from state');
      setIncident_id('');
    } catch (err) {
      console.error('❌ [stopRecordingAPI] Stop recording failed:', err.response?.data || err.message);
      console.error('❌ [stopRecordingAPI] Error status:', err.response?.status);
    }
  };

  const postMessage = async (token: any, incidentId: any) => {
    console.log('💬 [postMessage] Sending stream message to responders...');
    console.log('💬 [postMessage] Token available:', !!token);
    console.log('💬 [postMessage] Incident ID:', incidentId);
    console.log('💬 [postMessage] Mode:', mode);
    console.log('💬 [postMessage] isRespondersCam:', isRespondersCam);
    console.log('💬 [postMessage] isTestStream:', isTestStream);
    console.log('💬 [postMessage] User location:', userCordinates);

    try {
      if (!isRespondersCam) {
        console.log('💾 [DEBUG] LocalDownload mode - skipping responder messages');
        let array: any = [];

        if (!isStreaming) {
          setSeconds(0); setMinutes(0); setHours(0);
        }
        if (isFlashlight) {
          engine?.setCameraTorchOn(true);
        }

        console.log('💬 [DEBUG] Calling joinChannel for LocalDownload');
        joinChannel(token, incidentId);
        toggleShape();
        startRecordingAPI(token, incidentId);
        // setViewers(array);
        return;
      }

      if (isTestStream && testStreamContact) {
        console.log('🧪 [DEBUG] Test stream mode for contact:', testStreamContact.name);
        let array: any = [];

        // setViewers(array); 

        if (!isStreaming) {
          setSeconds(0); setMinutes(0); setHours(0);
        }
        if (isFlashlight) {
          engine?.setCameraTorchOn(true);
        }

        console.log('💬 [DEBUG] Calling joinChannel for test stream');
        joinChannel(token, incidentId);
        toggleShape();
        startRecordingAPI(token, incidentId);
        return;
      }

      // Normal API call to notify responders
      const messageBody = {
        stream_token: token,
        lat: userCordinates?.latitude,
        lng: userCordinates?.longitude,
        type: mode,
        incident_id: incidentId,
      };

      console.log('💬 [postMessage] Sending message to responders API');
      console.log('💬 [postMessage] Message body:', JSON.stringify(messageBody, null, 2));

      const res = await HomeAPIS.postMsg(messageBody);
      console.log('✅ [DEBUG] postMessage response:', JSON.stringify(res?.data, null, 2));

      const map = {};
      res?.data?.results?.forEach(item => {
        if (item?.uid && item?.name) {
          map[item.uid] = item.name;
        }
      });

      // Save map for onUserJoined
      responderUidMapRef.current = map;

      console.log('👥 Mapped Responder UIDs:', responderUidMapRef.current);

      startRecordingAPI(token, incidentId);

      let array: any = []; // ✅ CHANGE: Start with empty array
      if (!isStreaming) {
        setSeconds(0); setMinutes(0); setHours(0);
      }
      if (isFlashlight) {
        engine?.setCameraTorchOn(true);
      }

      console.log('💬 [DEBUG] Calling joinChannel');
      joinChannel(token, incidentId);
      toggleShape();

      // ✅ REMOVE THIS SECTION - don't populate viewers from API response
      // res?.data?.results?.map((item: any, index: number) => {
      //   array?.push({
      //     id: index?.toString(),
      //     name: item?.name,
      //     color: '#FFFFFF',
      //   });
      // });

      console.log('💬 [DEBUG] Viewers array:', JSON.stringify(array, null, 2));
      // setViewers(array);
    } catch (err) {
      console.error('❌ [postMessage] Message sending failed:', err.response?.data || err.message);
      console.error('❌ [postMessage] Error status:', err.response?.status);
    }
  };


  const postIncident = async (token: any) => {
    console.log('📝 [postIncident] Creating incident...');
    console.log('📝 [postIncident] isRespondersCam:', isRespondersCam);
    console.log('📝 [postIncident] Token available:', !!token);
    console.log('📝 [postIncident] User coordinates:', userCordinates);

    if (!isRespondersCam) {
      const localIncidentId = `local_${Date.now()}`;
      console.log('💾 [postIncident] LocalDownload mode - generating local incident ID:', localIncidentId);
      setIncident_id(localIncidentId);
      console.log('💾 [postIncident] Calling postMessage with local incident ID');
      postMessage(token, localIncidentId);
      return;
    }

    const deviceToken = await getDeviceToken();
    console.log('📱 [postIncident] Device token retrieved:', !!deviceToken);

    const body = {
      timestamp: new Date().toISOString(),
      location_latitude: userCordinates?.latitude?.toFixed(6),
      location_longitude: userCordinates?.longitude?.toFixed(6),
      user: userDetails?.user?.id,
      device_token: deviceToken,
    };

    console.log('📝 [postIncident] Incident body:', JSON.stringify(body, null, 2));

    try {
      const res = await HomeAPIS.postIncidents(body);
      console.log('✅ [postIncident] Incident created successfully');
      console.log('📝 [postIncident] Incident ID:', res?.data?.id);
      console.log('📝 [postIncident] Response data:', JSON.stringify(res?.data, null, 2));

      setIncident_id(res?.data?.id);
      console.log('📝 [postIncident] Incident ID saved to state');
      console.log('📝 [postIncident] Calling postMessage with incident ID:', res?.data?.id);
      postMessage(token, res?.data?.id);
    } catch (err) {
      console.error('❌ [postIncident] Incident creation failed:', err.response?.data || err.message);
      console.error('❌ [postIncident] Error status:', err.response?.status);
    }
  };

  const AgoraToken = async () => {
    console.log('🎟️ [AgoraToken] Starting token generation...');
    console.log('🎟️ [AgoraToken] Channel ID:', state.channelId);
    console.log('🎟️ [AgoraToken] UID:', state.uid);

    const body = {
      uid: '0',
      channel_name: state.channelId,
      role: 'publisher',
    };

    console.log('🎟️ [AgoraToken] Request body:', JSON.stringify(body, null, 2));

    try {
      const res = await HomeAPIS.getAgoraToken(body);
      console.log('✅ [AgoraToken] API Response received');
      console.log('✅ [AgoraToken] Token length:', res?.data?.token?.length);
      console.log('✅ [AgoraToken] Token preview:', res?.data?.token?.substring(0, 30) + '...');

      setState({
        ...state,
        token: res?.data?.token,
        token2: res?.data?.token,
      });

      console.log('🎟️ [AgoraToken] State updated with token');
      console.log('🎟️ [AgoraToken] Proceeding to postIncident with token');
      postIncident(res?.data?.token);
    } catch (err) {
      console.error('❌ [AgoraToken] Token generation failed:', err.response?.data || err.message);
      console.error('❌ [AgoraToken] Error status:', err.response?.status);
    }
  };


  const initRtcEngine = async () => {
    const { appId } = state;
    if (!appId) {
      console.error('appId is invalid');
      return;
    }

    if (rtcInitRef.current) {
      console.log("⚠️ Agora already initialized — skipping");
      return;
    }

    rtcInitRef.current = true;

    const agoraEngine = createAgoraRtcEngine() as IRtcEngineEx;
    agoraEngine.initialize({
      appId,
      logConfig: { filePath: Config.logFilePath },
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    agoraEngine.registerEventHandler({
      onJoinChannelSuccess: () => setJoinChannelSuccess(true),
      onUserJoined: uid => {
        console.log('Real viewer joined with UID:', uid);

        setRemoteUsers(prev => [...prev, uid]);

        const name = responderUidMapRef.current[uid] || `Responder ${uid}`;

        setViewers(prev => [
          ...prev,
          {
            id: uid.toString(),
            name,
            color: '#FFFFFF'
          }
        ]);
      },
      onUserOffline: uid =>
        setRemoteUsers(prevUsers => prevUsers.filter(user => user !== uid)),
    });

    await askMediaAccess([
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
    ]);

    const recorderInstanceBack = agoraEngine?.createMediaRecorder({
      channelId: state.channelId,
      uid: state.uid,
    });

    const recorderInstanceFront = agoraEngine?.createMediaRecorder({
      channelId: state.channelId,
      uid: state.uid2,
    });
    recorderInstanceBack?.setMediaRecorderObserver({
      onRecorderInfoUpdated: (channelId, uid, info) => {
        // console.log('Recorder Info Updated', channelId, uid, info);
      },
      onRecorderStateChanged: (channelId, uid, recorderState, error) => {
        console.log('Recorder State Changed', recorderState, error);
        if (
          recorderState === RecorderState.RecorderStateError ||
          recorderState === RecorderState.RecorderStateStop
        ) {
          console.log('Stopping in create media recorder initializer');
          stopRecording();
        }
      },
    });
    recorderInstanceFront?.setMediaRecorderObserver({
      onRecorderInfoUpdated: (channelId, uid, info) => {
        // console.log('Recorder Info Updated Front', channelId, uid, info);
      },
      onRecorderStateChanged: (channelId, uid, recorderState, error) => {
        console.log('Recorder State Changed Front', recorderState, error);
        if (
          recorderState === RecorderState.RecorderStateError ||
          recorderState === RecorderState.RecorderStateStop
        ) {
          console.log('Stopping in create media recorder initializer Front');
          stopRecording2();
        }
      },
    });
    setRecorder(recorderInstanceBack);
    setRecorder2(recorderInstanceFront);
    agoraEngine.enableVideo();
    agoraEngine.startPreview();
    agoraEngine?.setCameraZoomFactor(0.5);
    setStartPreview(true);
    agoraEngine?.enableMultiCamera(true, { cameraDirection: 0 });
    agoraEngine?.startCameraCapture(
      VideoSourceType.VideoSourceCameraSecondary,
      {
        cameraDirection: 0,
      },
    );
    agoraEngine?.startPreview(VideoSourceType.VideoSourceCameraSecondary);
    setStartSecondCamera(true);
    agoraEngine.switchCamera();

    // Mark as initialized so we don't recreate on every mode swipe
    secondCameraInitialized.current = true;

    setEngine(agoraEngine);
  };


  const joinChannel = (agora_token: string, incidentId: any) => {
    const { channelId, token, uid } = state;

    console.log('🔗 [joinChannel] Attempting to join Agora channel...');
    console.log('🔗 [joinChannel] Channel ID:', channelId);
    console.log('🔗 [joinChannel] UID:', uid);
    console.log('🔗 [joinChannel] Token preview:', agora_token?.substring(0, 30) + '...');
    console.log('🔗 [joinChannel] Incident ID:', incidentId);
    console.log('🔗 [joinChannel] Engine available:', !!engine);

    if (!channelId || uid < 0) {
      console.error('❌ [joinChannel] Invalid parameters - channelId:', channelId, 'uid:', uid);
      return;
    }

    console.log('🔗 [joinChannel] Calling engine.joinChannel with broadcaster role');
    engine?.joinChannel(agora_token, channelId, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });

    console.log('✅ [joinChannel] Channel join request sent');
    setIsStreaming(true);
    console.log('🎬 [joinChannel] isStreaming state set to true');

    if (startSecondCamera && mode === 'VIDEO') {
      console.log('📹 [joinChannel] Secondary camera available - starting dual camera setup');
      publishSecondCameraToStream(agora_token, incidentId);
    } else {
      console.log('📹 [joinChannel] Single camera mode or audio mode - skipping secondary camera');
    }

    console.log('🎥 [joinChannel] Starting primary recording');
    startRecording(incidentId);
  };

  const test = async () => {
    setStartSecondCamera(false);
    setStartPreview(false);
    setIsStreaming(false);
  };

  const leaveChannel = async () => {
    console.log('🚪 [leaveChannel] Leaving Agora channel...');
    console.log('🚪 [leaveChannel] Current streaming state:', isStreaming);
    console.log('🚪 [leaveChannel] Primary UID:', state.uid);
    console.log('🚪 [leaveChannel] Secondary UID:', state.uid2);

    try {
      const { channelId, uid2, uid } = state;
      setIsStreaming(false);
      setIsFlashlight(false);
      setViewers([]); // ✅ ADD: Clear viewers when leaving
      engine?.setCameraTorchOn(false);

      console.log('🚪 [leaveChannel] Leaving primary channel');
      engine?.leaveChannelEx({ channelId, localUid: uid });

      console.log('🚪 [leaveChannel] Leaving secondary channel');
      engine?.leaveChannelEx({ channelId, localUid: uid2 });

      console.log('🔄 [leaveChannel] Calling test() to reset camera states');
      await test();

      // Small delay before restart
      console.log('⏱️ [leaveChannel] Waiting 100ms before camera restart');
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('📹 [leaveChannel] Restarting camera preview');
      engine?.enableVideo();
      engine?.startPreview();
      setStartPreview(true);

      console.log('📹 [leaveChannel] Re-enabling multi-camera setup');
      engine?.enableMultiCamera(true, { cameraDirection: 1 });
      engine?.startCameraCapture(VideoSourceType.VideoSourceCameraSecondary, {
        cameraDirection: 1,
      });
      engine?.startPreview(VideoSourceType.VideoSourceCameraSecondary);
      setStartSecondCamera(true);

      console.log('✅ [leaveChannel] Channel leave process completed');
    } catch (error) {
      console.error('❌ [leaveChannel] Error during channel leave:', error);
      // Fallback: just ensure states are correct
      console.log('🔧 [leaveChannel] Applying fallback state reset');
      setIsStreaming(false);
      setStartPreview(false);
      setStartSecondCamera(false);
    }
  };

  const startSecondCameraCapture = async () => {
    // 🛡 Prevent re-initializing the secondary camera over and over
    if (secondCameraInitialized.current) {
      console.log('🔄 Secondary camera already initialized - skipping recreation');
      return;
    }

    console.log('📹 [startSecondCameraCapture] Initializing secondary/front camera');

    // Keep your original behavior
    engine?.switchCamera();
    engine?.enableMultiCamera(true, { cameraDirection: 0 });
    engine?.startCameraCapture(VideoSourceType.VideoSourceCameraSecondary, {
      cameraDirection: 0,
    });
    engine?.startPreview(VideoSourceType.VideoSourceCameraSecondary);
    setStartSecondCamera(true);
    engine?.switchCamera();

    secondCameraInitialized.current = true;
  };


  const publishSecondCameraToStream = (agora_token: string, incidentId: any) => {
    console.log('📹 [publishSecondCamera] Setting up secondary camera stream...');
    console.log('📹 [publishSecondCamera] Mode:', mode);
    console.log('📹 [publishSecondCamera] Incident ID:', incidentId);

    if (mode === 'AUDIO') {
      console.log('🎵 [publishSecondCamera] Audio mode - skipping secondary camera');
      return;
    }

    const { channelId, token2, uid2 } = state;

    console.log('📹 [publishSecondCamera] Channel ID:', channelId);
    console.log('📹 [publishSecondCamera] Secondary UID:', uid2);

    if (!channelId || uid2 <= 0) {
      console.error('❌ [publishSecondCamera] Invalid channel parameters');
      return;
    }

    const joinOptions = {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      autoSubscribeAudio: false,
      autoSubscribeVideo: false,
      publishMicrophoneTrack: true,
      publishCameraTrack: false,
      publishSecondaryCameraTrack: true,
    };

    console.log('📹 [publishSecondCamera] Join options:', JSON.stringify(joinOptions, null, 2));
    console.log('📹 [publishSecondCamera] Joining channel with secondary camera...');

    engine?.joinChannelEx(
      agora_token,
      { channelId, localUid: uid2 },
      joinOptions
    );

    setPublishSecondCamera(true);
    setIsStreaming(true);
    console.log('✅ [publishSecondCamera] Secondary camera stream initiated');
    console.log('🎥 [publishSecondCamera] Starting secondary recording');
    startRecording2(incidentId);
  };

  const stopSecondCameraCapture = () => {
    engine?.stopCameraCapture(VideoSourceType.VideoSourceCameraSecondary);
    setStartSecondCamera(false);
  };

  const unpublishSecondCamera = () => {
    const { channelId, uid2 } = state;
    engine?.leaveChannelEx({ channelId, localUid: uid2 });
    setPublishSecondCamera(false);
    // setIsStreaming(false);
    setStartSecondCamera(false);
  };

  const releaseRtcEngine = () => {
    engine?.unregisterEventHandler({
      onJoinChannelSuccess: () => setJoinChannelSuccess(false),
    });
    engine?.release();
  };

  const adjustZoom = (zoom: number) => {
    if (engine) {
      setZoomLevel(zoom);
      engine?.setCameraZoomFactor(zoom);
    }
  };

  const requestPhotoLibraryPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to storage to save your recordings.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOS handles this automatically
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const saveRecordingToGallery = async (filePath: string, isVideo: boolean = true): Promise<boolean> => {
    try {
      console.log('📱 Saving recording to gallery:', filePath);

      // Check if file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        console.error('❌ File does not exist:', filePath);
        return false;
      }

      // Request permissions
      const hasPermission = await requestPhotoLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant photo library access to save recordings.');
        return false;
      }

      // Save to camera roll
      const result = await CameraRoll.save(filePath, {
        type: isVideo ? 'video' : 'auto',
        album: 'ROVE Recordings' // This will create a custom album
      });

      if (result) {
        console.log('✅ Recording saved to gallery successfully');
        showToastNotification('Recording saved to gallery');
        return true;
      } else {
        throw new Error('Failed to save to gallery');
      }
    } catch (error) {
      console.error('❌ Error saving recording to gallery:', error);
      Alert.alert('Save Error', 'Failed to save recording to gallery');
      return false;
    }
  };

  const startAndStopStream = async () => {
    console.log('🎬 [DEBUG] startAndStopStream called');
    console.log('🎬 [DEBUG] isStreaming:', isStreaming);
    console.log('🎬 [DEBUG] hasContacts:', hasContacts);
    console.log('🎬 [DEBUG] isTestStream:', isTestStream);
    console.log('🎬 [DEBUG] isRespondersCam:', isRespondersCam);
    // Check if user has trusted contacts before allowing streaming (skip for test streams)
    if (!isTestStream && !hasContacts && !contactsLoading) {
      console.log('❌ [DEBUG] No contacts, aborting stream');
      showToastNotification('Add a responder on the Settings to enable livestream');
      return;
    }

    if (isStreaming) {
      console.log('🛑 [DEBUG] Stopping stream...');
      console.log('isStreaming inside!', isStreaming);

      // Stop streaming first
      leaveChannel();
      toggleShape();
      stopRecordingAPI();
      stopRecording();
      stopRecording2();

      // FIXED: Only save locally when LocalDownload is active (isRespondersCam = false)
      if (!isRespondersCam) {
        await handleLocalSave();
      } else {
        // When RespondersCam is active, just clear the paths without saving
        console.log('🌤️ RespondersCam mode - recordings sent to cloud, not saving locally');
        setLocalRecordingPaths({});
      }

      fetchLastFootage();
      dispatch(HomeActions.setThreatDetected(false));
      dispatch(HomeActions.setVoiceRecognitionReset(true));

      // Show completion message for test streams
      if (isTestStream && testStreamContact) {
        showToastNotification(`Test stream with ${testStreamContact.name} completed`);
      }
    } else {
      console.log('▶️ [DEBUG] Starting stream - calling AgoraToken()');
      // Starting stream
      if (isTestStream && testStreamContact) {
        showToastNotification(`Test streaming to ${testStreamContact.name}...`);
      }
      AgoraToken();
    }
  };

  const startRecording = useCallback(
    (incidentId: any) => {
      let uid = Math.floor(10 + Math.random() * 90);
      console.log('🎥 [startRecording] Starting primary recording...');
      console.log('🎥 [startRecording] Generated UID:', uid);
      console.log('🎥 [startRecording] Incident ID:', incidentId);
      console.log('🎥 [startRecording] Mode:', mode);
      console.log('🎥 [startRecording] Storage path:', state.storagePath);

      // Create file path
      const filePath = `${state.storagePath}/${uid}-${incidentId}-${mode}.mp4`;
      console.log('📁 [startRecording] Recording file path:', filePath);

      // Store the path for later use
      setLocalRecordingPaths(prev => ({
        ...prev,
        primary: filePath
      }));

      const streamType = mode === 'AUDIO'
        ? MediaRecorderStreamType.StreamTypeAudio
        : MediaRecorderStreamType.StreamTypeBoth;

      console.log('🎬 [startRecording] Stream type:', streamType === MediaRecorderStreamType.StreamTypeAudio ? 'AUDIO' : 'BOTH');

      const recordingConfig = {
        storagePath: filePath,
        containerFormat: state.containerFormat,
        streamType: streamType,
        maxDurationMs: state.maxDurationMs,
        recorderInfoUpdateInterval: state.recorderInfoUpdateInterval,
      };

      console.log('🎥 [startRecording] Recording config:', JSON.stringify(recordingConfig, null, 2));
      console.log('🎥 [startRecording] Recorder available:', !!recorder);

      recorder?.startRecording(recordingConfig);
      setState(prev => ({ ...prev, startRecording: true }));

      console.log('✅ [startRecording] Primary recording started');
    },
    [recorder, state, mode],
  );

  const startRecording2 = useCallback(
    (incidentId: any) => {
      let uid = Math.floor(10 + Math.random() * 90);
      console.log('🎥 [startRecording2] Starting secondary recording...');
      console.log('🎥 [startRecording2] Generated UID:', uid);
      console.log('🎥 [startRecording2] Incident ID:', incidentId);
      console.log('🎥 [startRecording2] Mode:', mode);
      console.log('🎥 [startRecording2] Storage path:', state.storagePath2);

      // Create file path
      const filePath = `${state.storagePath2}/${uid}-${incidentId}-${mode}.mp4`;
      console.log('📁 [startRecording2] Recording file path:', filePath);

      // Store the path for later use
      setLocalRecordingPaths(prev => ({
        ...prev,
        secondary: filePath
      }));

      const streamType2 = mode === 'AUDIO'
        ? MediaRecorderStreamType.StreamTypeAudio
        : MediaRecorderStreamType.StreamTypeVideo;

      console.log('🎬 [startRecording2] Stream type:', streamType2 === MediaRecorderStreamType.StreamTypeAudio ? 'AUDIO' : 'VIDEO');

      const recordingConfig = {
        storagePath: filePath,
        containerFormat: state.containerFormat,
        streamType: streamType2,
        maxDurationMs: state.maxDurationMs,
        recorderInfoUpdateInterval: state.recorderInfoUpdateInterval,
      };

      console.log('🎥 [startRecording2] Recording config:', JSON.stringify(recordingConfig, null, 2));
      console.log('🎥 [startRecording2] Recorder2 available:', !!recorder2);

      recorder2?.startRecording(recordingConfig);
      setState(prev => ({ ...prev, startRecording: true }));

      console.log('✅ [startRecording2] Secondary recording started');
    },
    [recorder2, state, mode],
  );

  const handleLocalSave = async () => {
    if (!isRespondersCam) {
      console.log('🔄 LocalDownload mode active - processing and saving recordings locally');

      try {
        const savedFiles: string[] = [];

        if (localRecordingPaths.primary && localRecordingPaths.secondary && mode === 'VIDEO') {
          console.log('📹 Two video files found - merging with black screen transition...');

          setIsProcessingVideo(true);

          // Create incident data for overlay processing
          const incidentData = {
            id: incident_id || `local_${Date.now()}`,
            dateTime: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            streetName: `Live Stream ${new Date().toLocaleDateString()}`,
            triggerType: 'Manual Live Stream'
          };

          try {
            // Direct call to VideoMergerService with the actual file paths
            const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
            const videoFiles = files.filter(file =>
              file.name.includes(incidentData.id) &&
              file.name.includes('VIDEO') &&
              file.name.endsWith('.mp4')
            );

            if (videoFiles.length >= 2) {
              // Use the existing mergeAndSaveToGallery method
              const success = await VideoMergerService.mergeAndSaveToGallery(
                incidentData.id,
                incidentData
              );

              if (success) {
                showToastNotification('Merged ROVE security video saved to Photos!');
                Alert.alert(
                  'Success!',
                  'ROVE video has been saved to your Photos!',
                  [{ text: 'OK' }]
                );
                savedFiles.push('merged');

                // ✅ IMPORTANT: Return early to prevent individual file saves
                setLocalRecordingPaths({});
                return;
              } else {
                throw new Error('Merge operation failed');
              }
            } else {
              console.log('❌ Not enough video files found for merging');
              await saveFallbackRecordings(savedFiles);
            }
          } catch (mergeError) {
            console.error('❌ Video merge failed:', mergeError);
            await saveFallbackRecordings(savedFiles);
          }
        } else if (localRecordingPaths.primary) {
          // Single video file - add timestamp overlay only
          console.log('📹 Single video file - adding timestamp overlay...');

          setIsProcessingVideo(true);

          try {
            // Create incident data for overlay processing
            const incidentData = {
              id: incident_id || `local_${Date.now()}`,
              dateTime: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              streetName: `Live Stream ${new Date().toLocaleDateString()}`,
              triggerType: 'Manual Live Stream'
            };

            // Use VideoMergerService for single file with timestamp
            const timestampOutputPath = `${RNFS.DocumentDirectoryPath}/timestamp_livestream_${Date.now()}.mp4`;

            const result = await VideoMergerService.addTimestampOverlay(
              localRecordingPaths.primary,
              timestampOutputPath,
              incidentData.dateTime,
              incidentData.id
            );

            if (result.success) {
              // Save to camera roll
              await CameraRoll.save(timestampOutputPath, { type: 'video' });

              // Cleanup temporary file
              await RNFS.unlink(timestampOutputPath).catch(() => { });

              showToastNotification('ROVE security video with timestamp saved to Photos!');
              savedFiles.push('single with timestamp');
            } else {
              throw new Error('Timestamp overlay failed');
            }
          } catch (overlayError) {
            console.error('❌ Timestamp overlay failed:', overlayError);
            // Fallback: save original video
            const saved = await saveRecordingToGallery(
              localRecordingPaths.primary,
              mode === 'VIDEO'
            );
            if (saved) {
              savedFiles.push('primary (original)');
            }
          }
        }

        // Clear the paths
        setLocalRecordingPaths({});

      } catch (error) {
        console.error('❌ Error in handleLocalSave:', error);
      } finally {
        setIsProcessingVideo(false);
      }
    }
  };

  const saveFallbackRecordings = async (savedFiles: string[]) => {
    // Save primary recording if it exists
    if (localRecordingPaths.primary) {
      const saved = await saveRecordingToGallery(
        localRecordingPaths.primary,
        mode === 'VIDEO'
      );
      if (saved) {
        savedFiles.push('primary (fallback)');
      }
    }

    // Save secondary recording if it exists (front camera)
    if (localRecordingPaths.secondary && mode === 'VIDEO') {
      const saved = await saveRecordingToGallery(
        localRecordingPaths.secondary,
        true
      );
      if (saved) {
        savedFiles.push('secondary (fallback)');
      }
    }

    if (savedFiles.length > 0) {
      showToastNotification(`${savedFiles.length} recording(s) saved to gallery (original files)`);
    }
  };

  const prepareFilesForMerging = async () => {
    if (!localRecordingPaths.primary || !localRecordingPaths.secondary) {
      return false;
    }

    try {
      // Validate both files exist
      const primaryExists = await VideoMergerService.validateVideoFile(localRecordingPaths.primary);
      const secondaryExists = await VideoMergerService.validateVideoFile(localRecordingPaths.secondary);

      return primaryExists && secondaryExists;
    } catch (error) {
      console.error('Error validating video files:', error);
      return false;
    }
  };

  /**
   * Step 3-3: Stop Recording
   */
  const stopRecording = useCallback(() => {
    console.log('Running Stop Recording');
    recorder?.stopRecording();
    setState(prev => ({ ...prev, startRecording: false }));
  }, [recorder]);

  const stopRecording2 = useCallback(() => {
    console.log('Running Stop Recording Front');
    recorder2?.stopRecording();
    setState(prev => ({ ...prev, startRecording: false }));
  }, [recorder2]);

  // Add this before your component's return statement
  const helpModalConfigs = {
    localDownload: {
      title: "Private or Shared Recording",
      icon: Images.RespondersCam, // Use your actual icon
      isImageIcon: true, // Flag to identify as image icon
      content: (
        <View>
          <CustomText.RegularText customStyle={styles.helpModalText}>
            Sometimes you may want to record a situation just for yourself. Here,
            you can choose whether to stream to{' '}
            <CustomText.RegularText customStyle={styles.highlightedText}>
              Responders
            </CustomText.RegularText>
            {' '}or only save the recording{' '}
            <CustomText.RegularText customStyle={styles.highlightedText}>
              locally
            </CustomText.RegularText>
            .
          </CustomText.RegularText>
        </View>
      )
    },
    eyeCam: {
      title: "Video trigger mode",
      icon: Images.NoMic, // Use your actual icon
      isImageIcon: true, // Flag to identify as image icon
      content: (
        <View>
          <CustomText.RegularText customStyle={styles.helpModalText}>
            Here you can chose whether to trigger your{' '}
            <CustomText.RegularText customStyle={styles.highlightedText}>
              video stream
            </CustomText.RegularText>
            {' '}via:
          </CustomText.RegularText>
          <View style={styles.optionsList}>
            <View style={styles.optionItem}>
              <View style={styles.optionRow}>
                <Image
                  source={Images.NoMic}
                  style={styles.optionIcon}
                  resizeMode='contain'
                />
                <CustomText.RegularText customStyle={styles.optionText}>
                  Manual only (default)
                </CustomText.RegularText>
              </View>
            </View>
            <View style={styles.optionItem}>
              <View style={styles.optionRow}>
                <Image
                  source={Images.EyeCam}
                  style={styles.optionIcon}
                  resizeMode='contain'
                />
                <CustomText.RegularText customStyle={styles.optionText}>
                  Automatically+safe word (must be armed)
                </CustomText.RegularText>
              </View>
            </View>
          </View>
        </View>
      )
    },
    respondersCam: {
      title: "Arming bodycam (lanyard)",
      icon: Images.PremiumArm, // Use your actual icon
      isImageIcon: true, // Flag to identify as image icon
      content: (
        <View>
          <CustomText.RegularText customStyle={styles.helpModalText}>
            To auto-launch a video stream when you are under threat, Rove needs to be armed.
            Set it by:
          </CustomText.RegularText>
          <View style={styles.optionsList}>
            <View style={styles.optionItem}>
              <View style={styles.optionRow}>
                {/* <View style={styles.bulletPoint} /> */}
                <CustomText.RegularText customStyle={styles.optionText}>
                  • Tapping the Arm button
                </CustomText.RegularText>
              </View>
            </View>
            <View style={styles.optionItem}>
              <View style={styles.optionRow}>
                {/* <View style={styles.bulletPoint} /> */}
                <CustomText.RegularText customStyle={styles.optionText}>
                  • Your Siri arming sentence (e.g. "Siri, arm Body Cam" + Face ID)
                </CustomText.RegularText>
              </View>
            </View>
          </View>
          <CustomText.RegularText customStyle={styles.helpModalText}>
            Once armed, your screen goes dark, but Rove is ready to launch a stream{' '}
            <CustomText.RegularText customStyle={styles.highlightedText}>
              instantly
            </CustomText.RegularText>
            .
          </CustomText.RegularText>

          <CustomText.RegularText customStyle={styles.helpModalText}>
            ⚠️ If you switch apps, only audio protection will remain active.
          </CustomText.RegularText>

          {/* NEW: Add the Siri image container */}
          <View style={styles.siriImageContainer}>
            <Image source={Images.BodyCamPerson} style={styles.siriImage} resizeMode="cover" />
            <View style={styles.siriOverlay}>
              <CustomText.RegularText customStyle={styles.siriText}>
                Hey Siri, arm Body Cam...
              </CustomText.RegularText>
            </View>
          </View>
        </View>
      )
    },
  };

  const renderUsers = () => (
    <View style={{ flex: 1, backgroundColor: Utills.selectedThemeColors().Base, marginBottom: Metrix.VerticalSize(0) }}>
      {startPreview && (
        <RtcSurfaceView
          style={{ flex: 1, width: '100%' }}
          canvas={{
            uid: 0,
            sourceType: VideoSourceType.VideoSourceCameraPrimary,
            renderMode: RenderModeType.RenderModeHidden,
          }}
        />
      )}

      {startSecondCamera ? (
        <>
          {/* Wrapper container for both camera and live indicator */}
          <View style={styles.frontCamWrapper}>
            {/* Camera preview with fixed height */}
            <View style={styles.frontCamPreview}>
              <RtcSurfaceView
                style={{ width: '100%', height: '100%' }}
                canvas={{
                  uid: 0,
                  sourceType: VideoSourceType.VideoSourceCameraSecondary,
                  renderMode: RenderModeType.RenderModeHidden,
                }}
              />
            </View>

            {/* Live indicator positioned below camera but in same container */}
            {isStreaming && (
              <View style={styles.liveBgContainer}>
                <View style={styles.liveContainer}>
                  <View style={styles.liveCircle}></View>
                  <CustomText.RegularText customStyle={{ fontWeight: '700' }}>
                    Live
                  </CustomText.RegularText>
                </View>
                <View style={styles.countContainer}>
                  <Image
                    source={Images.EyeAbleIcon}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                  <CustomText.RegularText>{viewers?.length}</CustomText.RegularText>
                </View>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.frontCamWrapper}>
          <View style={styles.frontCamPreview}></View>
        </View>
      )}
    </View>
  );

  const renderViewers = () => {
    return (
      <View style={styles.viewerContainer}>
        {viewers?.map((item: any) => {
          return (
            <View key={item?.id} style={styles.viewersContainer}>
              <View
                key={item?.id}
                style={[
                  styles.circularContact,
                  { backgroundColor: item?.color },
                ]}>
                <CustomText.RegularText customStyle={styles.userInitialText}>
                  {extractInitials(item?.name)}
                </CustomText.RegularText>
              </View>
              <CustomText.RegularText customStyle={styles.userNameText}>
                {item?.name}
                <CustomText.RegularText
                  customStyle={[
                    styles.userNameText,
                    { fontWeight: '500', fontSize: normalizeFont(13) },
                  ]}>
                  {' joined'}
                </CustomText.RegularText>
              </CustomText.RegularText>
            </View>
          );
        })}
      </View>
    );
  };

  const renderZoomControls = () => (
    <View style={[
      styles.zoomControls,
      {
        bottom: mode === 'VIDEO'
          ? (isStreaming ? '29%' : '31%') // Higher position in VIDEO mode to account for transparent tabs
          : (isStreaming ? '19%' : '24%') // Lower position in AUDIO mode with relative tab bar
      }
    ]}>
      {[0.5, 2, 3].map((zoom, index) => (
        <TouchableOpacity
          key={index?.toString()}
          onPress={() => adjustZoom(zoom)}
          style={[
            styles.zoomButton,
            zoom === zoomLevel && styles.activeZoomButton
          ]}>
          <CustomText.RegularText
            customStyle={[
              styles.zoomText,
              {
                color: zoom === zoomLevel
                  ? Utills.selectedThemeColors().Yellow
                  : Utills.selectedThemeColors().PrimaryTextColor,
                fontWeight: zoom === zoomLevel ? '700' : '500',
              }
            ]}>
            {zoom === 0.5 ? '0.5×' : `${zoom}×`}
          </CustomText.RegularText>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden={true} />
      <SafeAreaView style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={panGesture}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerContainer}>
                {/* LEFT SIDE ICONS */}
                <View style={styles.topLeftContainer}>
                  {leftHeaderOptions?.map((item: any) => {
                    const isDisabled = item.disabled; // Check if item is disabled

                    const circleSize = item?.id === '3' ? 25 : 27; // 1px bigger for preference toggle

                    return (
                      <TouchableOpacity
                        key={item?.id}
                        activeOpacity={isDisabled ? 1 : 0.7} // No press feedback when disabled
                        onPress={isDisabled ? undefined : item?.onPress} // Disable onPress when disabled
                      >
                        <RoundImageContainer
                          imageStyle={{
                            tintColor: Utills.selectedThemeColors().PrimaryTextColor,
                            // tintColor: isDisabled
                            //   ? Utills.selectedThemeColors().SecondaryTextColor // Gray color when disabled
                            //   : Utills.selectedThemeColors().PrimaryTextColor, // Normal white when enabled
                            alignSelf: 'center',
                            resizeMode: 'contain',
                          }}
                          backgroundColor="transparent"
                          borderWidth={0}
                          borderColor='transparent'
                          circleWidth={circleSize}
                          styles={{
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: 1,
                            backgroundColor: 'transparent',
                          }}
                          source={item?.icon}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* CENTER TIMER - Always centered */}
                <View style={styles.timerCenterContainer}>
                  <Text
                    style={[
                      styles.timerText,
                      {
                        backgroundColor: isStreaming ? '#FF3B30' : 'transparent',
                      },
                    ]}>
                    {isStreaming
                      ? `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`
                      : '00:00:00'}
                  </Text>
                </View>

                {/* RIGHT SIDE ICONS - Only show in video mode */}
                <View style={styles.topRightContainer}>
                  {rightHeaderOptions?.map((item: any) => {
                    if (item.isTextIcon) {
                      return (
                        <Animated.View
                          key={item?.id}
                          style={[
                            { transform: [{ scale: item.key === 'Help' && isHelpMode ? pulseAnim : 1 }] }
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={item?.onPress}
                            style={[
                              styles.textIconButton,
                              isHelpMode && item.key === 'Help' && styles.helpModeButton
                            ]}
                          >
                            <Text style={styles.textIconStyle}>
                              {item.text}
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={item?.id}
                        activeOpacity={0.7}
                        onPress={item?.onPress}>
                        <RoundImageContainer
                          imageStyle={{
                            tintColor: Utills.selectedThemeColors().PrimaryTextColor,
                          }}
                          backgroundColor="transparent"
                          circleWidth={26}
                          borderWidth={1.4}
                          styles={{ padding: 2 }}
                          borderColor="white"
                          source={item?.icon}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {isModeText && (
                <Animated.View style={[styles.fadeContainer, { opacity }]}>
                  <CustomText.SmallText
                    customStyle={{ color: '#FDD128', textAlign: 'center' }}>
                    {preferenceMsg}
                  </CustomText.SmallText>
                </Animated.View>
              )}

              {showToast && (
                <View style={[
                  styles.toastContainer,
                  typeof toastMessage === 'object' && toastMessage.isComplex && styles.complexToastContainer
                ]}>
                  {typeof toastMessage === 'string' ? (
                    <CustomText.RegularText customStyle={styles.toastText}>
                      {toastMessage}
                    </CustomText.RegularText>
                  ) : typeof toastMessage === 'object' && toastMessage.firstLine ? (
                    <View style={styles.multiLineToastContainer}>
                      <CustomText.RegularText customStyle={styles.toastTextNormal}>
                        {toastMessage.firstLine}
                      </CustomText.RegularText>
                      <CustomText.RegularText customStyle={styles.toastTextBold}>
                        {toastMessage.secondLine}
                      </CustomText.RegularText>
                    </View>
                  ) : typeof toastMessage === 'object' && toastMessage.isComplex ? (
                    <View style={styles.complexToastContent}>
                      {toastMessage.lines.map((line, index) => (
                        <View key={index} style={styles.toastLineContainer}>
                          {line.showInlineIcon ? (
                            <View style={styles.inlineIconContainer}>
                              <CustomText.RegularText
                                customStyle={[
                                  styles.complexToastText,
                                  line.style === 'bold' && styles.complexToastTextLarge, // Changed from complexToastTextBold
                                  line.style === 'warning' && styles.complexToastTextWarning,
                                  styles.inlineTextWithIcon
                                ]}
                              >
                                {line.text}
                              </CustomText.RegularText>
                              <Image
                                source={Images.PremiumArm}
                                style={styles.inlineArmIcon}
                                resizeMode="contain"
                              />
                            </View>

                          ) : (
                            <CustomText.RegularText
                              customStyle={[
                                styles.complexToastText,
                                line.style === 'bold' && styles.complexToastTextBold,
                                line.style === 'warning' && styles.complexToastTextWarning,
                              ]}
                            >
                              {line.text}
                            </CustomText.RegularText>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}

              <View style={{ flex: 1 }}>
                <LiveStreamContent
                  mode={mode}
                  modeIndex={modeIndex}
                  translateX={translateX}
                  renderUsers={renderUsers}
                  renderViewers={renderViewers}
                  isStreaming={isStreaming}
                  zoomControls={renderZoomControls()}
                />

                {!isStreaming && (
                  <View style={[
                    styles.modeSelectorContainer,
                    { bottom: mode === 'VIDEO' ? '20.8%' : '15%' }
                  ]}>
                    <LiveStreamModeSelector
                      currentMode={mode}
                      onModeChange={switchMode}
                      translateX={translateX}
                      modeIndex={modeIndex}
                    />
                  </View>
                )}
              </View>

              <View style={[styles.bottomContainer,
              { bottom: mode === 'VIDEO' ? '6.9%' : '0%' }
              ]}>
                {/* LEFT SIDE - Play/Footage Button (moved from right) */}
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    // borderColor: Utills.selectedThemeColors().SecondaryTextColor,
                    borderRadius: Metrix.HorizontalSize(7),
                    marginBottom: Metrix.VerticalSize(20)
                  }}
                  onPress={() => {
                    NavigationService.navigate('Footages');
                  }}>
                  {lastImage && (
                    <Image
                      source={Images.PlayBtn}
                      resizeMode={'cover'}
                      style={styles.playBtn}
                    />
                  )}

                  {lastImage ? (
                    <Image
                      source={{ uri: lastImage?.thumbnail }}
                      style={styles.footageImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={Images.Audio}
                      style={styles.footageImg}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>

                {/* CENTER - Record/Livestream Button */}
                <View>
                  <TouchableOpacity
                    onPress={startAndStopStream}
                    style={styles.liveStreamButton}>
                    <Animated.View
                      style={[
                        styles.innerLiveStreamButton,
                        {
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: sizeAnim,
                          height: sizeAnim,
                          borderRadius: borderRadiusAnim,
                          borderColor: isCircle
                            ? Utills.selectedThemeColors().Base
                            : Utills.selectedThemeColors().Transparent,
                        },
                      ]}></Animated.View>
                  </TouchableOpacity>
                  <CustomText.RegularText customStyle={styles.livestreamText}>
                    {isStreaming ? 'STREAMING' : 'LIVESTREAM'}
                  </CustomText.RegularText>
                </View>
                <TouchableOpacity
                  style={styles.premiumArmButton}
                  onPress={() => {
                    if (isHelpMode) {
                      // Show help modal when in help mode
                      setHelpModalContent(helpModalConfigs.respondersCam);
                      setHelpModalVisible(true);
                      return;
                    }

                    // Check if already armed
                    if (isThreatDetectionArmed) {
                      // Disarm immediately - NO Face ID needed
                      setIsThreatDetectionArmed(false);
                      dispatch(HomeActions.setShowFakeLockScreen(false));
                      showToastNotification('Threat Detection Inactive');
                      console.log('✅ Disarmed (no auth required)');
                      return;
                    }

                    // Arming from UI - NO Face ID, just countdown
                    console.log('⏱️ Starting countdown to arm...');
                    setShowCountdown(true);

                    // Countdown will handle the actual arming via onComplete callback
                  }}
                >
                  <Image
                    source={Images.PremiumArm}
                    style={[
                      styles.premiumArmImage,
                      {
                        tintColor: isThreatDetectionArmed
                          ? Utills.selectedThemeColors().PrimaryTextColor // White when armed
                          : 'rgba(255, 255, 255, 0.3)', // Grey/transparent when inactive
                        opacity: isThreatDetectionArmed ? 1.0 : 0.9, // Additional opacity control
                      }
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>
        </GestureHandlerRootView>
        {modalVisible && (
          <ProtectionScheduleModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
          />
        )}
        {helpModalVisible && helpModalContent && (
          <View style={styles.helpModalOverlay}>
            <View style={styles.helpModalContainer}>
              {/* Close button */}
              <TouchableOpacity
                style={styles.helpModalCloseButton}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={styles.helpModalCloseText}>✕</Text>
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.helpModalHeader}>
                {helpModalContent.isImageIcon ? (
                  <Image
                    source={helpModalContent.icon}
                    style={styles.helpModalHeaderImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.helpModalHeaderIcon}>{helpModalContent.icon}</Text>
                )}
                <CustomText.MediumText customStyle={styles.helpModalTitle}>
                  {helpModalContent.title}
                </CustomText.MediumText>
              </View>
              {/* Divider */}
              <View style={styles.helpModalDivider} />

              {/* Content */}
              <View style={styles.helpModalContentContainer}>
                {helpModalContent.content}
              </View>
            </View>
          </View>
        )}
        {showCountdown && (
          <CountdownArming
            visible={showCountdown}
            onComplete={() => {
              // Dispatch fake lock screen first
              dispatch(HomeActions.setShowFakeLockScreen(true));

              // Then update states
              setShowCountdown(false);
              setIsThreatDetectionArmed(true);

              showToastNotification(`Threat Detection Armed for ${activeTimer}`);
            }}
            onCancel={() => {
              setShowCountdown(false);
              showToastNotification('Threat Detection Cancelled');
            }}
            initialCount={3}
          />
        )}
        {isProcessingVideo && (
          <View style={styles.processingVideoLoader}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    zIndex: 99,
    top: '0%',
    width: '100%',
    backgroundColor: '#00000080',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Metrix.HorizontalSize(10),
    paddingVertical: Metrix.HorizontalSize(10),
    // paddingTop: Metrix.HorizontalSize(45),
    justifyContent: 'space-between',
    minHeight: Metrix.VerticalSize(60),
  },

  // Update your topLeftContainer style:
  topLeftContainer: {
    flexDirection: 'row',
    width: '30%',
    justifyContent: 'flex-start',
    alignItems: 'center', // This centers all items vertically
    gap: Metrix.HorizontalSize(8),
    // backgroundColor: '#ff4444'
  },
  timerCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topRightContainer: {
    flexDirection: 'row',
    width: '30%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    // backgroundColor: '#ff44'
  },
  textIconButton: {
    width: 32,
    height: 32,
    borderRadius: 100,
    borderWidth: 1.4,
    borderColor: 'white',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Metrix.HorizontalSize(8), // Add some spacing between icons
  },

  textIconStyle: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  timerText: {
    // fontSize: normalizeFont(19),
    fontSize: 22,
    paddingHorizontal: Metrix.HorizontalSize(8),
    paddingVertical: Metrix.VerticalSize(2),
    borderRadius: Metrix.HorizontalSize(3),
    lineHeight: 30,
    overflow: 'hidden',
    textAlign: 'center',

    // iOS Camera Timer Font Properties
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto', // SF Pro on iOS, Roboto on Android
    fontWeight: '100', // Semi-bold weight like iOS camera
    fontVariant: ['tabular-nums'], // Monospaced numbers for consistent spacing
    // letterSpacing: 1, // Slight letter spacing for clarity

    color: '#FFFFFF',
  },

  frontCamWrapper: {
    position: 'absolute',
    top: '19%',
    left: '4%',
    width: '30%',
    borderRadius: Metrix.HorizontalSize(5),
    backgroundColor: 'black',
    overflow: 'visible',
  },

  frontCamPreview: {
    height: Metrix.VerticalSize(150),
    width: '100%',
    borderRadius: Metrix.HorizontalSize(5),
    backgroundColor: 'black',
    overflow: 'hidden',
  },

  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    zIndex: 99,
    // bottom: '12%',
    paddingHorizontal: Metrix.HorizontalSize(20),
    // marginBottom: Metrix.VerticalSize(60)
  },

  blankView: {
    width: Metrix.HorizontalSize(60),
    height: Metrix.VerticalSize(60),
    borderRadius: Metrix.HorizontalSize(100),
  },

  livestreamText: {
    paddingVertical: Metrix.VerticalSize(10),
    fontWeight: '700',
    marginLeft: Metrix.HorizontalSize(8)
  },
  premiumArmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Metrix.VerticalSize(20),
    width: Metrix.HorizontalSize(50),
    height: Metrix.VerticalSize(50),
    backgroundColor: 'transparent'
  },
  premiumArmImage: {
    width: Metrix.HorizontalSize(45),
    height: Metrix.VerticalSize(45),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor
  },
  footageImg: {
    width: Metrix.HorizontalSize(50),
    height: Metrix.VerticalSize(50),
    borderRadius: Metrix.HorizontalSize(5),
    marginLeft: -2,
  },

  circularContact: {
    width: Metrix.VerticalSize(32),
    height: Metrix.VerticalSize(32),
    borderRadius: Metrix.HorizontalSize(100),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
  },

  liveStreamButton: {
    marginTop: Metrix.VerticalSize(10),
    alignSelf: 'center',
    width: Metrix.HorizontalSize(72),
    height: Metrix.HorizontalSize(72),
    borderRadius: Metrix.VerticalSize(100),
    backgroundColor: Utills.selectedThemeColors().Transparent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    // marginLeft: Metrix.HorizontalSize(4)
  },

  innerLiveStreamButton: {
    width: Metrix.HorizontalSize(65),
    height: Metrix.HorizontalSize(65),
    borderRadius: Metrix.VerticalSize(100),
    // borderWidth: 2.5,
    // borderColor: Utills.selectedThemeColors().Base,
    backgroundColor: Utills.selectedThemeColors().Red,
    // marginLeft: Metrix.HorizontalSize(5)
  },

  zoomControls: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '30%',
    alignItems: 'center',
    borderRadius: Metrix.HorizontalSize(100),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    // paddingHorizontal: Metrix.HorizontalSize(8),
    paddingVertical: Metrix.VerticalSize(1),
  },

  zoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: Metrix.HorizontalSize(100),
    width: Metrix.HorizontalSize(26),
    height: Metrix.HorizontalSize(26),
    padding: Metrix.HorizontalSize(5),
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeZoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: Metrix.HorizontalSize(100),
    width: Metrix.HorizontalSize(36),
    height: Metrix.HorizontalSize(36),
    padding: Metrix.HorizontalSize(1),
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: Metrix.VerticalSize(2),
    // marginBottom: Metrix.VerticalSize(2)
  },

  zoomText: {
    color: 'white',
    fontSize: 12,
  },

  viewerContainer: {
    top: '50%',
    left: '4%',
    position: 'absolute',
    zIndex: 99,
    paddingVertical: Metrix.HorizontalSize(10),
    justifyContent: 'center',
    width: '100%',
  },

  liveBgContainer: {
    position: 'absolute',
    bottom: -Metrix.VerticalSize(40),
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Utills.selectedThemeColors().Base,
    padding: Metrix.HorizontalSize(2),
    borderRadius: Metrix.HorizontalSize(5),
    borderTopWidth: 0,
    marginTop: Metrix.VerticalSize(6)
  },

  liveContainer: {
    width: '50%',
    height: Metrix.VerticalSize(30),
    backgroundColor: '#FF0005',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderRadius: Metrix.HorizontalSize(2),
    flexDirection: 'row',
  },

  liveCircle: {
    width: Metrix.HorizontalSize(5),
    height: Metrix.HorizontalSize(5),
    borderRadius: Metrix.HorizontalSize(100),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
  },

  countContainer: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  eyeIcon: {
    width: Metrix.HorizontalSize(18),
    height: Metrix.VerticalSize(18),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },

  viewersContainer: {
    marginTop: Metrix.VerticalSize(5),
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
  },

  userInitialText: {
    fontWeight: '600',
    color: Utills.selectedThemeColors().Base,
    fontSize: normalizeFont(13),
  },

  userNameText: {
    fontWeight: '700',
    color: Utills.selectedThemeColors().PrimaryTextColor,
    left: Metrix.HorizontalSize(8),
    fontSize: normalizeFont(14),
  },

  playBtn: {
    width: Metrix.HorizontalSize(30),
    height: Metrix.HorizontalSize(30),
    position: 'absolute',
    zIndex: 10,
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },

  fadeContainer: {
    position: 'absolute',
    top: Metrix.VerticalSize(82),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },

  toastContainer: {
    position: 'absolute',
    top: Metrix.VerticalSize(80),
    left: 40,
    right: 40,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(8),
    borderRadius: Metrix.HorizontalSize(8),
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },

  toastText: {
    color: '#000000',
    fontSize: Metrix.customFontSize(14),
    fontWeight: '600',
    textAlign: 'center',
  },

  multiLineToastContainer: {
    alignItems: 'center',
  },

  toastTextNormal: {
    color: '#000000',
    fontSize: Metrix.customFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
  },

  toastTextBold: {
    color: '#000000',
    fontSize: Metrix.customFontSize(14),
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  complexToastContainer: {
    paddingVertical: Metrix.VerticalSize(10),
    minHeight: Metrix.VerticalSize(80),
  },

  complexToastContent: {
    alignItems: 'center',
  },

  complexToastText: {
    color: '#000000',
    fontSize: Metrix.customFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },

  complexToastTextBold: {
    fontWeight: '600',
    marginBottom: 4,
  },

  complexToastTextWarning: {
    fontSize: Metrix.customFontSize(16),
    marginVertical: 2,
  },

  toastIconContainer: {
    marginTop: Metrix.VerticalSize(2),
    alignItems: 'center',
  },

  toastArmIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: '#000000',
  },

  toastLineContainer: {
    width: '100%',
    alignItems: 'center',
  },

  inlineIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineTextWithIcon: {
    marginRight: Metrix.HorizontalSize(3),
  },

  complexToastTextLarge: {
    fontSize: Metrix.customFontSize(20), // Increased from 14
    fontWeight: '600',
    marginRight: Metrix.HorizontalSize(3),
  },

  inlineArmIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    tintColor: '#787878ff',
    marginBottom: Metrix.VerticalSize(4),
  },


  modeSelectorContainer: {
    position: 'absolute',
    // bottom: '24%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  // Add these to your StyleSheet
  helpModeButton: {
    borderColor: '#fff', // Yellow border when in help mode
    borderWidth: 2,
  },

  helpModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  helpModalContainer: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    maxWidth: '100%',
    minWidth: '80%',
    position: 'relative',
  },

  helpModalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 5,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },

  helpModalCloseText: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    // backgroundColor: '#ff44'
  },
  helpModalHeaderIcon: {
    fontSize: 26,
    marginLeft: -3
    // marginRight: 6,
  },
  helpModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginLeft: -6
  },

  helpModalDivider: {
    height: 1,
    backgroundColor: '#48484A',
    marginBottom: 10,
  },

  helpModalContentContainer: {
    paddingRight: 10,
  },

  helpModalText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
    marginBottom: 10,
  },

  highlightedText: {
    color: '#57b5fa',
    fontWeight: '600',
  },
  siriImageContainer: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: Metrix.VerticalSize(15),
    // marginBottom: Metrix.VerticalSize(10),
    alignItems: 'center',
  },
  siriImage: {
    width: '100%',
    height: Metrix.VerticalSize(140), // Slightly smaller than BodyCam screen for modal
  },
  siriOverlay: {
    position: 'absolute',
    bottom: Metrix.VerticalSize(50),
    right: Metrix.HorizontalSize(5),
    paddingVertical: Metrix.VerticalSize(6),
    paddingHorizontal: Metrix.HorizontalSize(12),
    // backgroundColor: 'transparent', // Add background for better text visibility
  },
  siriText: {
    color: '#FFFFFF',
    fontSize: Metrix.customFontSize(13), // Slightly smaller for modal
    fontStyle: 'italic',
    fontWeight: '600'
  },
  optionsList: {
    marginTop: 10,
    marginBottom: 15,
  },

  optionItem: {
    marginBottom: 8,
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '500',
  },
  helpModalHeaderImage: {
    width: 38,
    height: 35,
    marginRight: 12,
    marginLeft: -4,
    tintColor: '#FFFFFF', // Make the icon white to match the text
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    marginTop: 7, // Align with text baseline
  },

  optionIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
    tintColor: '#FFFFFF', // Make icons white to match text
  },

  // Update the existing optionText style to remove the bullet point
  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 18,
    flex: 1, // Allow text to wrap if needed
  },
  processingVideoLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Make sure it appears above everything
  },
});