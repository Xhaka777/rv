// requestPermissions.js
import { Platform } from 'react-native';
import { requestNotifications } from 'react-native-permissions'; // optional helper

export async function requestPushPermissions() {
  if (Platform.OS !== 'ios') return;
  // either use react-native-permissions or native UNUserNotificationCenter in ObjC/Swift
  const { status } = await requestNotifications(['alert','badge','sound']);
  if (status === 'granted') {
    // call native to register for remote notifications (see native code below)
    // We'll implement a native method 'registerForRemoteNotifications' or just let native auto-register in didFinishLaunching
  }
}
