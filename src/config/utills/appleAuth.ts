// src/config/utills/appleAuth.ts
import { Platform } from 'react-native';
import {
  appleAuth,
  AppleRequestOperation,
  AppleRequestScope,
  AppleCredentialState,
} from '@invertase/react-native-apple-authentication';

export const isAppleSignInSupported = () => {
  return Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 13;
};

export const performAppleSignIn = async () => {
  try {
    // Start the sign-in request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: AppleRequestOperation.LOGIN,
      requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
    });

    // Get current authentication state for user
    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthRequestResponse.user,
    );

    // Use credentialState response to ensure the user is authenticated
    if (credentialState === AppleCredentialState.AUTHORIZED) {
      return {
        success: true,
        data: appleAuthRequestResponse,
      };
    } else {
      throw new Error('Apple Sign-In was not authorized');
    }
  } catch (error: any) {
    if (error.code === appleAuth.Error.CANCELED) {
      return {
        success: false,
        error: 'User canceled Apple Sign-In',
      };
    } else {
      return {
        success: false,
        error: error.message || 'Apple Sign-In failed',
      };
    }
  }
};