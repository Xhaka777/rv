export const BASE_URL: string = 'https://api.rovesafe.com/';
// export const BASE_URL: string = 'https://backend-api-458410.uc.r.appspot.com/';
// export const BASE_URL: string = 'https://rove-backend-api-752186260001.us-central1.run.app/';
export const BASE_PATH: string = 'api/';
export const SOCKET_URL: string = 'http://161.35.120.195:9001/';
export const V1_BASE_URL: string = '';
export const API_TIMEOUT: number = 500000;
export const LIMIT: number = 10;
export const GOOGLE_API_KEY: string = 'AIzaSyBcOBbH59pgJk_bmN6WavZCExwCGqCztaY';

export const AUDIO_RECORDING_CONFIG = {
  SERVICE_URL: 'https://record-audio-gcs-917390125611.us-central1.run.app',
  ENDPOINTS: {
    RECORD: '/record',
    STATUS: '/'
  },
  CONFIG: {
    BUCKET_NAME: 'voice-source-bucket',
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
    DURATION: 20, // Updated to 20 seconds as confirmed
    REQUIRED_DURATION: 20 // Minimum required duration
  }
};

export const Environments = {
  Models: {
    WHISPER_AND_SENTIMENT: 'wss://threat-detection-917390125611.us-central1.run.app/ws/audio',
    VIT: 'wss://threat-detection-917390125611.us-central1.run.app/ws/audio', 
    TRIGGER_WORD_WHISPER: 'wss://threat-detection-917390125611.us-central1.run.app/ws/audio',
  },
  AudioRecording: {
    VOICE_TRAINING: 'https://record-audio-gcs-917390125611.us-central1.run.app',
  }
};
