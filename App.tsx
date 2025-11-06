import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { NativeEventEmitter, Platform, StyleSheet, View, NativeModules } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Metrix, NavigationService, Utills } from './src/config';
import { MainStack } from './src/stacks/MainStack';
import Toast, {
  BaseToast,
  ErrorToast,
  ToastProps,
} from 'react-native-toast-message';
import SplashScreen from 'react-native-splash-screen';
import './src/i18n';
import Bugsee from 'react-native-bugsee';
import { useSelector } from 'react-redux';
import { RootState } from './src/redux/reducers';
import { useNavigationState } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
// import { saveDeviceToken } from './src/utils/deviceTokenStorage';
// const { APNsTokenEmitter } = NativeModules;


function App(): JSX.Element {

  const cameraMode = useSelector((state: RootState) => state.home.cameraMode || 'AUDIO');
  const isVideoMode = cameraMode === 'VIDEO';

  console.log('isVideoMode on App.tsx: ->>>>>', isVideoMode);

  // useEffect(() => {
  //   if (APNsTokenEmitter) {
  //     const emitter = new NativeEventEmitter(APNsTokenEmitter);

  //     const sub = emitter.addListener('APNsDeviceToken', async (e) => {
  //       console.log('📲 APNs token from native:', e.token);
  //       await saveDeviceToken(e.token); // Save it right away
  //     });

  //     return () => sub.remove();
  //   }
  // }, []);

  const toastConfig = {
    info: (props: ToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: Utills.selectedThemeColors().BlackOpacity('0.7'),
          borderRadius: Metrix.HorizontalSize(10),
          width: '90%',
        }}
        text1Style={{
          fontSize: 14,
          fontWeight: '600',
        }}
        text2Style={{
          fontSize: 12,
        }}
        text1NumberOfLines={2}
      />
    ),
    success: (props: ToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: 'lightgreen',
          width: '80%',
          borderLeftWidth: 6,
        }}
        text1Style={{
          fontSize: 14,
          fontWeight: '600',
        }}
        text2Style={{
          fontSize: 12,
        }}
        text1NumberOfLines={2}
      />
    ),
    error: (props: ToastProps) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: Utills.selectedThemeColors().ErrorTextColor,
          width: '80%',
        }}
        text1Style={{
          fontSize: 13,
          fontWeight: '600',
        }}
        text2Style={{
          fontSize: 12,
        }}
      />
    ),
  };

  useEffect(() => {
    // Hide the native splash screen immediately
    SplashScreen.hide();

    // Launch Bugsee
    const launchBugsee = async () => {
      let appToken = '36c1101e-8278-4b0c-a65b-ec367335af31';
      await Bugsee.launch(appToken);
    };

    launchBugsee();
  }, []);

  return (
    <KeyboardProvider>
      <NavigationContainer
        ref={ref => NavigationService.setTopLevelNavigator(ref)}
        theme={{
          dark: true,
          colors: {
            background: Utills.selectedThemeColors().Base,
            primary: Utills.selectedThemeColors().Base,
            card: Utills.selectedThemeColors().Base,
            text: Utills.selectedThemeColors().Base,
            border: Utills.selectedThemeColors().Base,
            notification: Utills.selectedThemeColors().Base,
          },
        }}>
        <MainStack />
        <Toast config={toastConfig} />
      </NavigationContainer>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: {
    flex: 1,
    backgroundColor: Utills.selectedThemeColors().Base,
  },
});

export default App;