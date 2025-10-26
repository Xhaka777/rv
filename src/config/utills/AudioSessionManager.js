// utils/AudioSessionManager.js
import { NativeModules, Platform } from 'react-native';

const { AudioSessionManager } = NativeModules;

class AudioSessionHelper {
  static async activateForRecording() {
    if (Platform.OS !== 'ios') {
      console.log('📱 Android: Audio session management not needed');
      return;
    }

    try {
      console.log('🎤 Activating iOS audio session for recording...');
      await AudioSessionManager.configureForRecording();
      await AudioSessionManager.setAudioSessionActive(true);
      console.log('✅ iOS audio session activated successfully');
    } catch (error) {
      console.error('❌ Failed to activate iOS audio session:', error);
      throw error;
    }
  }

  static async deactivate() {
    if (Platform.OS !== 'ios') {
      console.log('📱 Android: Audio session management not needed');
      return;
    }

    try {
      console.log('🔇 Deactivating iOS audio session...');
      await AudioSessionManager.releaseAudioSession();
      console.log('✅ iOS audio session deactivated - other apps can use microphone');
    } catch (error) {
      console.error('❌ Failed to deactivate iOS audio session:', error);
      throw error;
    }
  }

  static async setActive(active) {
    if (Platform.OS !== 'ios') {
      console.log('📱 Android: Audio session management not needed');
      return;
    }

    try {
      console.log(`🎤 Setting iOS audio session active: ${active}`);
      await AudioSessionManager.setAudioSessionActive(active);
      console.log(`✅ iOS audio session ${active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error(`❌ Failed to set iOS audio session active to ${active}:`, error);
      throw error;
    }
  }
}

export default AudioSessionHelper;