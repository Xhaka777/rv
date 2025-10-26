export const VoiceActions = {
    SET_VOICE_ENABLED: 'SET_VOICE_ENABLED',
    setVoiceEnabled: (enabled: boolean) => ({
      type: 'SET_VOICE_ENABLED',
      payload: enabled,
    }),
  };
  