import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

export interface DeviceTokenData {
  token: string;
  platform: 'ios';
  timestamp: string;
  userId?: string;
}

export interface NotificationPermissionStatus {
  hasPermission: boolean;
  status: string;
  canRequest: boolean;
}

export class APNsService {
  private static readonly DEVICE_TOKEN_KEY = 'apns_device_token';
  private static readonly TOKEN_TIMESTAMP_KEY = 'apns_token_timestamp';
  private static tokenRefreshListener: any = null;
  
  /**
   * Initialize pure APNs service (iOS only)
   */
  static async initialize(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      console.log('⚠️ APNs is iOS only. Skipping initialization on Android.');
      return null;
    }

    try {
      console.log('🍎 Initializing pure APNs service...');
      
      // Request permissions first
      const permissionStatus = await this.requestPermissions();
      if (!permissionStatus.hasPermission) {
        console.warn('⚠️ APNs permissions not granted');
        return null;
      }
      
      // Setup token listeners
      this.setupTokenListeners();
      
      // Request device token
      PushNotificationIOS.requestPermissions();
      
      // Get existing token if available
      const cachedToken = await this.getCachedToken();
      if (cachedToken && await this.isTokenValid(cachedToken)) {
        console.log('✅ Using cached APNs token');
        return cachedToken;
      }
      
      console.log('✅ APNs service initialized successfully');
      return null; // Token will come via listener
      
    } catch (error) {
      console.error('❌ Failed to initialize APNs service:', error);
      return null;
    }
  }
  
  /**
   * Request APNs permissions
   */
  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    if (Platform.OS !== 'ios') {
      return {
        hasPermission: false,
        status: 'unsupported_platform',
        canRequest: false
      };
    }

    try {
      console.log('📱 Requesting APNs permissions...');
      
      // Request permissions with specific options
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true
      });
      
      const hasPermission = permissions.alert || permissions.badge || permissions.sound;
      
      console.log('📱 APNs permission result:', permissions, 'hasPermission:', hasPermission);
      
      return {
        hasPermission,
        status: hasPermission ? 'authorized' : 'denied',
        canRequest: !hasPermission // Can request again if denied
      };
      
    } catch (error) {
      console.error('❌ Error requesting APNs permissions:', error);
      return {
        hasPermission: false,
        status: 'error',
        canRequest: false
      };
    }
  }
  
  /**
   * Setup APNs token listeners
   */
  private static setupTokenListeners(): void {
    console.log('🔄 Setting up APNs token listeners...');
    
    // Listen for device token registration
    PushNotificationIOS.addEventListener('register', async (token: string) => {
      console.log('🍎 APNs device token received:', token.substring(0, 20) + '...');
      await this.saveTokenLocally(token);
      
      // Notify callback if exists
      if (this.tokenRefreshListener) {
        this.tokenRefreshListener(token);
      }
    });
    
    // Listen for registration failures
    PushNotificationIOS.addEventListener('registrationError', (error) => {
      console.error('❌ APNs registration failed:', error);
    });
    
    // Listen for incoming notifications
    PushNotificationIOS.addEventListener('notification', (notification) => {
      console.log('🔔 APNs notification received:', notification);
      
      // Handle notification based on app state
      if (notification.foreground) {
        // App is in foreground - show local notification
        this.displayLocalNotification({
          title: notification.alert?.title || 'New Notification',
          body: notification.alert?.body || notification.alert || 'You have a new message',
          data: notification.userInfo
        });
      }
      
      // Complete the notification handling
      notification.finish(PushNotificationIOS.FetchResult.NewData);
    });
  }
  
  /**
   * Get current device token
   */
  static async getDeviceToken(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    try {
      // Check cached token first
      const cachedToken = await this.getCachedToken();
      if (cachedToken && await this.isTokenValid(cachedToken)) {
        return cachedToken;
      }
      
      // Request fresh token
      console.log('🍎 Requesting fresh APNs token...');
      PushNotificationIOS.requestPermissions();
      
      // Token will come via listener, return cached for now
      return cachedToken;
      
    } catch (error) {
      console.error('❌ Error getting APNs token:', error);
      return null;
    }
  }
  
  /**
   * Set up token refresh callback
   */
  static setTokenRefreshListener(callback: (token: string) => void): () => void {
    this.tokenRefreshListener = callback;
    
    return () => {
      this.tokenRefreshListener = null;
    };
  }
  
  /**
   * Save device token locally
   */
  private static async saveTokenLocally(token: string): Promise<void> {
    try {
      const tokenData: DeviceTokenData = {
        token,
        platform: 'ios',
        timestamp: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.DEVICE_TOKEN_KEY, JSON.stringify(tokenData));
      await AsyncStorage.setItem(this.TOKEN_TIMESTAMP_KEY, new Date().toISOString());
      
      console.log('💾 APNs token saved locally');
    } catch (error) {
      console.error('❌ Failed to save APNs token locally:', error);
    }
  }
  
  /**
   * Get cached device token
   */
  private static async getCachedToken(): Promise<string | null> {
    try {
      const tokenDataStr = await AsyncStorage.getItem(this.DEVICE_TOKEN_KEY);
      if (tokenDataStr) {
        const tokenData: DeviceTokenData = JSON.parse(tokenDataStr);
        return tokenData.token;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get cached APNs token:', error);
      return null;
    }
  }
  
  /**
   * Check if cached token is still valid (less than 24 hours old)
   */
  private static async isTokenValid(token: string): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(this.TOKEN_TIMESTAMP_KEY);
      if (!timestampStr) return false;
      
      const tokenTimestamp = new Date(timestampStr);
      const now = new Date();
      const hoursDiff = (now.getTime() - tokenTimestamp.getTime()) / (1000 * 60 * 60);
      
      // Token is valid if less than 24 hours old
      return hoursDiff < 24;
    } catch (error) {
      console.error('❌ Error checking APNs token validity:', error);
      return false;
    }
  }
  
  /**
   * Get device token data for sending to backend
   */
  static async getTokenDataForBackend(): Promise<DeviceTokenData | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    try {
      const tokenDataStr = await AsyncStorage.getItem(this.DEVICE_TOKEN_KEY);
      if (tokenDataStr) {
        const tokenData: DeviceTokenData = JSON.parse(tokenDataStr);
        
        // Verify token is still valid
        if (await this.isTokenValid(tokenData.token)) {
          return tokenData;
        } else {
          // Token expired, request fresh one
          await this.getDeviceToken();
          // Return the expired one for now, fresh one will come via listener
          return tokenData;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting APNs token data for backend:', error);
      return null;
    }
  }
  
  /**
   * Display local notification
   */
  private static displayLocalNotification(notification: {
    title: string;
    body: string;
    data?: any;
  }): void {
    try {
      PushNotificationIOS.presentLocalNotification({
        alertTitle: notification.title,
        alertBody: notification.body,
        userInfo: notification.data || {}
      });
    } catch (error) {
      console.error('❌ Error displaying local notification:', error);
    }
  }
  
  /**
   * Get current permission status
   */
  static async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (Platform.OS !== 'ios') {
      return {
        hasPermission: false,
        status: 'unsupported_platform',
        canRequest: false
      };
    }

    try {
      const permissions = await PushNotificationIOS.checkPermissions();
      const hasPermission = permissions.alert || permissions.badge || permissions.sound;
      
      return {
        hasPermission,
        status: hasPermission ? 'authorized' : 'not_determined',
        canRequest: !hasPermission
      };
    } catch (error) {
      console.error('❌ Error getting APNs permission status:', error);
      return {
        hasPermission: false,
        status: 'error',
        canRequest: false
      };
    }
  }
  
  /**
   * Clear stored token data (for logout/testing)
   */
  static async clearTokenData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.DEVICE_TOKEN_KEY);
      await AsyncStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
      console.log('🗑️ APNs token data cleared');
    } catch (error) {
      console.error('❌ Error clearing APNs token data:', error);
    }
  }
  
  /**
   * Cleanup listeners (call on app unmount)
   */
  static cleanup(): void {
    try {
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
      PushNotificationIOS.removeEventListener('notification');
      this.tokenRefreshListener = null;
      console.log('🧹 APNs listeners cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up APNs listeners:', error);
    }
  }
  
  /**
   * Badge management
   */
  static setBadgeCount(count: number): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  }
  
  static getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return PushNotificationIOS.getApplicationIconBadgeNumber();
    }
    return Promise.resolve(0);
  }
  
  /**
   * Cancel all local notifications
   */
  static cancelAllLocalNotifications(): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.cancelAllLocalNotifications();
    }
  }
}