export default class Action {
  //Constants
  static EMPTY_STATE_SUCCESS = 'EMPTY_STATE_SUCCESS';
  static IS_DARK_MODE = 'IS_DARK_MODE';
  static USER_DETAILS = 'USER_DETAILS';
  static SAFE_WORD = 'SAFE_WORD';
  static USER_LOCATION = 'USER_LOCATION';
  static SELECTED_MODEL = 'SELECTED_MODEL';
  static IN_SAFE_ZONE = 'IN_SAFE_ZONE';
  static THREAT_DETECTED = 'THREAT_DETECTED';
  static APP_TRIGGERED = 'APP_TRIGGERED';
  static STREAM_STOPPED = 'STREAM_STOPPED';
  static HEADS_UP_FIRST_TIME = 'HEADS_UP_FIRST_TIME';
  static THREAT_ALERT_MODE = 'THREAT_ALERT_MODE';
  static SET_DRAMA_MODAL_SHOWN = 'SET_DRAMA_MODAL_SHOWN';
  static SET_LOGOUT_MODAL_SHOWN = 'SET_LOGOUT_MODAL_SHOWN';
  static SET_CAMERA_MODE = 'SET_CAMERA_MODE';
  static VOICE_RECOGNITION_RESET = 'VOICE_RECOGNITION_RESET';
  static SET_VOICE_TRAINING_ACTIVE = 'SET_VOICE_TRAINING_ACTIVE';
  static SET_PREFERENCE_STATE = 'SET_PREFERENCE_STATE';
  static SET_SHOW_FAKE_LOCKSCREEN = 'SET_SHOW_FAKE_LOCKSCREEN';
  static SET_HEADS_UP_RADIUS = 'SET_HEADS_UP_RADIUS';
  static SET_CURRENT_SCREEN = 'SET_CURRENT_SCREEN';
  static SET_ACTIVE_TIMER = 'SET_ACTIVE_TIMER';
  static SET_SHOW_COUNTDOWN_FROM_SIRI = 'SET_SHOW_COUNTDOWN_FROM_SIRI';
  static SET_SIRI_ARM_TRIGGER = 'SET_SIRI_ARM_TRIGGER';
  static SET_SHOULD_ARM_ON_LIVESTREAM = 'SET_SHOULD_ARM_ON_LIVESTREAM';
  //Tutorial constants
  static SET_TUTORIAL_COMPLETED = 'SET_TUTORIAL_COMPLETED';
  static SET_TUTORIAL_STEP = 'SET_TUTORIAL_STEP';
  static SET_TUTORIAL_ACTIVE = 'SET_TUTORIAL_ACTIVE';
  static SET_TUTORIAL_SCREEN = 'SET_TUTORIAL_SCREEN';
  static RESET_TUTORIAL = 'RESET_TUTORIAL';

  static SET_HIGHLIGHTED_ELEMENT = 'SET_HIGHLIGHTED_ELEMENT';

  //Actions
  static setDarkMode() {
    return {
      type: Action.IS_DARK_MODE,
    };
  }

  static setUserDetails(payload: any) {
    return {
      type: Action.USER_DETAILS,
      payload,
    };
  }

  static setSafeWord(payload: any) {
    return {
      type: Action.SAFE_WORD,
      payload,
    };
  }

  static setUserLocation(payload: any) {
    return {
      type: Action.USER_LOCATION,
      payload,
    };
  }

  static setSelectedModel(payload: any) {
    return {
      type: Action.SELECTED_MODEL,
      payload,
    };
  }

  static setInSafeZone(payload: any) {
    return {
      type: Action.IN_SAFE_ZONE,
      payload,
    };
  }
  static setThreatDetected(payload: boolean) {
    return {
      type: Action.THREAT_DETECTED,
      payload,
    };
  }

  static setAppTriggered(payload: boolean) {
    return {
      type: Action.APP_TRIGGERED,
      payload,
    };
  }

  static setStreamStopped(payload: boolean) {
    return {
      type: Action.STREAM_STOPPED,
      payload,
    };
  }

  static setHeadsUpFirstTime(payload: boolean) {
    return {
      type: Action.HEADS_UP_FIRST_TIME,
      payload,
    };
  }

  static setThreatAlertMode(payload: boolean) {
    return {
      type: Action.THREAT_ALERT_MODE,
      payload,
    };
  }

  static setDramaModalShown(payload: boolean) {
    return {
      type: Action.SET_DRAMA_MODAL_SHOWN,
      payload,
    }
  }

  static setLogoutModalShown(payload: boolean) {
    return {
      type: Action.SET_LOGOUT_MODAL_SHOWN,
      payload,
    };
  }

  static setCameraMode(payload: 'AUDIO' | 'VIDEO') {
    return {
      type: Action.SET_CAMERA_MODE,
      payload,
    };
  }

  static setVoiceRecognitionReset(payload: boolean) {
    return {
      type: Action.VOICE_RECOGNITION_RESET,
      payload,
    };
  }

  static setVoiceTrainingActive(payload: boolean) {
    return {
      type: Action.SET_VOICE_TRAINING_ACTIVE,
      payload,
    };
  }

  static setPreferenceState(payload: 'AS' | 'MIC') {
    return {
      type: Action.SET_PREFERENCE_STATE,
      payload,
    };
  }

  static setShowFakeLockScreen(payload: boolean) {
    return {
      type: Action.SET_SHOW_FAKE_LOCKSCREEN,
      payload,
    };
  }

  static setHeadsUpRadius(payload: number) {
    return {
      type: Action.SET_HEADS_UP_RADIUS,
      payload,
    };
  }

  static setCurrentScreen(payload: string) {
    return {
      type: Action.SET_CURRENT_SCREEN,
      payload,
    };
  }

  static setActiveTimer(payload: string) {
    return {
      type: Action.SET_ACTIVE_TIMER,
      payload,
    }
  }

  static setShowCountdownFromSiri(payload: boolean) {
    return {
      type: Action.SET_SHOW_COUNTDOWN_FROM_SIRI,
      payload,
    };
  }

  static setSiriArmTrigger(payload: boolean) {
    return {
      type: Action.SET_SIRI_ARM_TRIGGER,
      payload,
    };
  }

  static setShouldArmOnLivestream(payload: boolean) {
    return {
      type: Action.SET_SHOULD_ARM_ON_LIVESTREAM,
      payload,
    };
  }

  //Tutorial actions
  static setTutorialCompleted(payload: boolean) {
    return {
      type: Action.SET_TUTORIAL_COMPLETED,
      payload,
    }
  }

  static setTutorialStep(payload: number) {
    return {
      type: Action.SET_TUTORIAL_STEP,
      payload,
    }
  }

  static setTutorialActive(payload: boolean) {
    return { type: Action.SET_TUTORIAL_ACTIVE, payload };
  }

  static setTutorialScreen(payload: string) {
    return { type: Action.SET_TUTORIAL_SCREEN, payload };
  }

  static resetTutorial() {
    return { type: Action.RESET_TUTORIAL };
  }

  static setHighlightedElement(payload: string | null) {
    return { type: Action.SET_HIGHLIGHTED_ELEMENT, payload };
  }
}
