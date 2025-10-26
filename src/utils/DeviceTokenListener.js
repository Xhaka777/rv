// DeviceTokenListener.js
import { NativeEventEmitter, NativeModules } from 'react-native';
const emitter = new NativeEventEmitter(NativeModules.AppRegistry); // bridge source doesn't matter much if you used sendDeviceEventWithName

const subscription = emitter.addListener('APNSDeviceToken', (e) => {
  console.log('APNs token:', e.token);
  // send token to your server
});

// remember to remove subscription on unmount
// subscription.remove();
