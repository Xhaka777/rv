const initialState = {
    isVoiceEnabled: true,
    currentScreen: null,
  };
  
  export const voiceReducer = (state = initialState, action: any) => {
    switch (action.type) {
      case 'SET_VOICE_ENABLED':
        return {
          ...state,
          isVoiceEnabled: action.payload,
        };
      default:
        return state;
    }
  };
  
  