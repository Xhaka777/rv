import {
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
  checkMultiple,
} from 'react-native-permissions';
import {Platform, Linking, Alert} from 'react-native';
// import AppleHealthKit, {HealthKitPermissions} from 'react-native-health';

export enum PermissionResult {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
}

async function requestPermission(
  permission: any,
  permissionType: string,
): Promise<PermissionResult> {
  try {
    const result = await request(permission);
    if (result === RESULTS.GRANTED) {
      console.log(`${permissionType} permission granted`);
      return PermissionResult.GRANTED;
    } else if (result === RESULTS.DENIED) {
      console.log(`${permissionType} permission denied`);
      return PermissionResult.DENIED;
    } else if (result === RESULTS.BLOCKED) {
      console.log(`${permissionType} permission blocked`);

      // Ask the user if they want to open settings
      const openSettingsResult = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Permission Blocked',
          `Permission for ${permissionType} is blocked. Do you want to open settings to grant the permission?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  openSettings();
                } else if (Platform.OS === 'android') {
                  Linking.openSettings();
                }
                resolve(true);
              },
            },
          ],
          {cancelable: false},
        );
      });

      if (openSettingsResult) {
        return PermissionResult.BLOCKED;
      }
    }

    return PermissionResult.DENIED;
  } catch (error) {
    console.error(`Error requesting ${permissionType} permission:`, error);
    Alert.alert(
      'Permission Error',
      `An error occurred while requesting ${permissionType} permission. Please try again later.`,
      [
        {
          text: 'OK',
          style: 'default',
          onPress: () => {
            if (Platform.OS === 'ios') {
              openSettings();
            } else if (Platform.OS === 'android') {
              Linking.openSettings();
            }
          },
        },
      ],
      {cancelable: false},
    );
    return PermissionResult.DENIED;
  }
}

export async function requestMicrophonePermission(): Promise<PermissionResult> {
  return await requestPermission(
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.MICROPHONE
      : PERMISSIONS.ANDROID.RECORD_AUDIO,
    'Microphone',
  );
}

export async function requestCameraPermission(): Promise<PermissionResult> {
  return await requestPermission(
    Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
    'Camera',
  );
}

export async function requestSpeechRecognitionPermission(): Promise<PermissionResult> {
  return await requestPermission(
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.SPEECH_RECOGNITION
      : PERMISSIONS.ANDROID.RECORD_AUDIO,
    'SpeechRecognition',
  );
}

export async function checkMicrophoneAndSpeechPermissions(): Promise<
  PermissionResult[]
> {
  const permissions = [
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.MICROPHONE
      : PERMISSIONS.ANDROID.RECORD_AUDIO,
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.SPEECH_RECOGNITION
      : PERMISSIONS.ANDROID.RECORD_AUDIO,
  ];

  try {
    const results = await checkMultiple(permissions);
    const permissionResults: PermissionResult[] = [];

    for (const [index, permission] of permissions.entries()) {
      const permissionType = index === 0 ? 'Microphone' : 'SpeechRecognition';
      const result = results[permission];

      if (result === RESULTS.GRANTED) {
        console.log(`${permissionType} permission granted`);
        permissionResults.push(PermissionResult.GRANTED);
      } else if (result === RESULTS.DENIED) {
        console.log(`${permissionType} permission denied`);
        permissionResults.push(PermissionResult.DENIED);
      } else if (result === RESULTS.BLOCKED) {
        console.log(`${permissionType} permission blocked`);
        permissionResults.push(PermissionResult.BLOCKED);
        // Ask the user if they want to open settings
        const openSettingsResult = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Permission Blocked',
            `Permission for ${permissionType} is blocked. Do you want to open settings to grant the permission?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    openSettings();
                  } else if (Platform.OS === 'android') {
                    Linking.openSettings();
                  }
                  resolve(true);
                },
              },
            ],
            {cancelable: false},
          );
        });

        if (openSettingsResult) {
          return [PermissionResult.BLOCKED, PermissionResult.DENIED];
        }
      }
    }

    return permissionResults;
  } catch (error) {
    console.error('Error checking microphone and speech permissions:', error);
    Alert.alert(
      'Permission Error',
      `An error occurred while requesting Mic and Speech permission. Please try again later.`,
      [
        {
          text: 'OK',
          style: 'default',
          onPress: () => {
            if (Platform.OS === 'ios') {
              openSettings();
            } else if (Platform.OS === 'android') {
              Linking.openSettings();
            }
          },
        },
      ],
      {cancelable: false},
    );
    return [PermissionResult.DENIED, PermissionResult.DENIED];
  }
}

// export const HealthPermissions = {
//   permissions: {
//     read: [AppleHealthKit.Constants.Permissions.HeartRate],
//     write: [AppleHealthKit.Constants.Permissions.Steps],
//   },
// } as HealthKitPermissions;
