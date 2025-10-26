import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_TOKEN_KEY = '@device_token';

export const saveDeviceToken = async (token) => {
  try {
    if (!token) return;
    await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
    console.log('✅ Device token saved:', token);
  } catch (err) {
    console.error('❌ Failed to save device token:', err);
  }
};

export const getDeviceToken = async () => {
  try {
    const token = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    if (token) console.log('📦 Retrieved device token:', token);
    return token;
  } catch (err) {
    console.error('❌ Failed to get device token:', err);
    return null;
  }
};
