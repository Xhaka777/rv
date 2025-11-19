import Immutable, { ImmutableObject } from 'seamless-immutable';
import Action from '../actions/Home';

interface AppState {
  darkMode?: boolean;
  userDetails: any;
  safeWord?: any;
  userLocation: any;
  selectedModel: string;
  isFirstTime?: boolean;
  isSafeZone?: boolean;
  threatDetected: boolean;
  appTriggered: boolean;
  streamStopped?: any;
  threatAlertMode?: boolean;
  dramaModalShown?: boolean;
  currentScreen?: string;
  logoutModalShown?: boolean;
  cameraMode: 'AUDIO' | 'VIDEO';
  voiceRecognitionReset?: boolean;
  voiceTrainingActive?: boolean;
  preferenceState: 'AS' | 'MIC';
  showFakeLockScreen: boolean,
  headsUpRadius: number;
  activeTimer: string;
  showCountdownFromSiri: boolean,
  siriArmTrigger: boolean,
  shouldArmOnLivestream: boolean,
  isSafeWordTraining?: boolean;

  //
  headsUpfirstTime?: boolean;
  tutorialCompleted?: boolean;
  currentTutorialStep?: number;
  tutorialActive?: boolean;
  tutorialCurrentScreen?: string;

  highlitedElement?: string | null;
}

const initialState: ImmutableObject<AppState> = Immutable<AppState>({
  darkMode: false,
  userDetails: {},
  safeWord: {
    isSafeWord: true,
    safeWord: null,
  },
  userLocation: {},
  selectedModel: 'wss://threat-detection-917390125611.us-central1.run.app/ws/audio',
  isFirstTime: false,
  isSafeZone: false,
  threatDetected: false,
  appTriggered: false,
  streamStopped: false,
  threatAlertMode: false,
  dramaModalShown: false,
  currentScreen: 'TabStack',
  logoutModalShown: false,
  cameraMode: 'AUDIO',
  voiceRecognitionReset: false,
  voiceTrainingActive: false,
  preferenceState: 'AS',
  showFakeLockScreen: false,
  headsUpRadius: 3,
  activeTimer: '30m',
  showCountdownFromSiri: false,
  siriArmTrigger: false,
  shouldArmOnLivestream: false,
  isSafeWordTraining: false,

  //
  headsUpfirstTime: true,
  tutorialCompleted: false,
  currentTutorialStep: 1,
  tutorialActive: false,
  tutorialCurrentScreen: 'LiveStream',

  highlitedElement: null,
});

export default (state = initialState, action: { type: any; payload: any }) => {
  switch (action.type) {
    case Action.EMPTY_STATE_SUCCESS:
      return Immutable(initialState);

    case Action.IS_DARK_MODE:
      return Immutable(state).merge({
        darkMode: !state.darkMode,
      });

    case Action.USER_DETAILS: {
      return Immutable(state).merge({
        userDetails: action.payload,
      });
    }

    case Action.SAFE_WORD: {
      return Immutable(state).merge({
        safeWord: action.payload,
      });
    }

    case Action.USER_LOCATION: {
      return Immutable(state).merge({
        userLocation: action.payload,
      });
    }

    case Action.SELECTED_MODEL: {
      return Immutable(state).merge({
        selectedModel: action.payload,
      });
    }

    case Action.IN_SAFE_ZONE: {
      return Immutable(state).merge({
        isSafeZone: action.payload,
      });
    }

    case Action.THREAT_DETECTED: {
      return Immutable(state).merge({
        threatDetected: action.payload,
      });
    }

    case Action.APP_TRIGGERED: {
      return Immutable(state).merge({
        appTriggered: action.payload,
      });
    }

    case Action.SET_DRAMA_MODAL_SHOWN: {
      return Immutable(state).merge({
        dramaModalShown: action.payload,
      });
    }

    case Action.SET_CURRENT_SCREEN: {
      return Immutable(state).merge({
        currentScreen: action.payload,
      });
    }

    case Action.SET_LOGOUT_MODAL_SHOWN: {
      return Immutable(state).merge({
        logoutModalShown: action.payload,
      });
    }

    case Action.SET_CAMERA_MODE: {
      return Immutable(state).merge({
        cameraMode: action.payload,
      });
    }

    case Action.VOICE_RECOGNITION_RESET: {
      return Immutable(state).merge({
        voiceRecognitionReset: action.payload,
      });
    }

    case Action.SET_VOICE_TRAINING_ACTIVE: {
      return Immutable(state).merge({
        voiceTrainingActive: action.payload,
      });
    }

    case Action.SET_PREFERENCE_STATE: {
      return Immutable(state).merge({
        preferenceState: action.payload,
      });
    }

    case Action.STREAM_STOPPED: {
      return Immutable(state).merge({
        streamStopped: action.payload,
      });
    }

    case Action.THREAT_ALERT_MODE: {
      return Immutable(state).merge({
        threatAlertMode: action.payload,
      });
    }

    case Action.SET_SHOW_FAKE_LOCKSCREEN: {
      return Immutable(state).merge({
        showFakeLockScreen: action.payload,
      });
    }

    case Action.SET_HEADS_UP_RADIUS: {
      return Immutable(state).merge({
        headsUpRadius: action.payload,
      });
    }

    case Action.SET_ACTIVE_TIMER: {
      return Immutable(state).merge({
        activeTimer: action.payload,
      });
    }

    case Action.SET_SHOW_COUNTDOWN_FROM_SIRI: {
      return Immutable(state).merge({
        showCountdownFromSiri: action.payload,
      });
    }

    case Action.SET_SIRI_ARM_TRIGGER: {
      return Immutable(state).merge({
        siriArmTrigger: action.payload,
      });
    }

    case Action.SET_SHOULD_ARM_ON_LIVESTREAM: {
      return Immutable(state).merge({
        shouldArmOnLivestream: action.payload,
      });
    }

    case Action.SET_IS_SAFE_WORD_TRAINING: {
      return Immutable(state).merge({
        isSafeWordTraining: action.payload,
      });
    }

    //Tutorial reducer cases
    case Action.SET_TUTORIAL_COMPLETED: {
      return Immutable(state).merge({
        tutorialCompleted: action.payload,
        tutorialActive: !action.payload,
      });
    }

    case Action.HEADS_UP_FIRST_TIME: {
      return Immutable(state).merge({
        headsUpfirstTime: action.payload,
      });
    }

    case Action.SET_TUTORIAL_STEP: {
      return Immutable(state).merge({
        currentTutorialStep: action.payload,
      });
    }

    case Action.SET_TUTORIAL_ACTIVE:
      return Immutable(state).merge({
        tutorialActive: action.payload
      });

    case Action.SET_TUTORIAL_SCREEN:
      return Immutable(state).merge({
        tutorialCurrentScreen: action.payload,
      });

    case Action.RESET_TUTORIAL:
      return Immutable(state).merge({
        tutorialCompleted: false,
        currentTutorialStep: 1,
        tutorialActive: true,
        tutorialCurrentScreen: 'LiveStream',
      });

    case Action.SET_HIGHLIGHTED_ELEMENT:
      return Immutable(state).merge({
        highlitedElement: action.payload,
      })

    default:
      return state;
  }
};
