import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {
  Colors,
  FontType,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import {AuthHeader, CustomInput, CustomText, Loader} from '../../../components';
import {Formik} from 'formik';
import Schema from '../../../formik';
import {LoginScreenProps} from '../../propTypes';
import {useDispatch, useSelector} from 'react-redux';
import {AuthActions, HomeActions} from '../../../redux/actions';
import {RootState} from '../../../redux/reducers';
import {t} from 'i18next';
import {AuthAPIS} from '../../../services/auth';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// FIXED: Import Apple Sign-In directly from the library
import appleAuth from '@invertase/react-native-apple-authentication';

export const LoginScreen: React.FC<LoginScreenProps> = ({}) => {
  const dispatch = useDispatch();
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const userDetails = useSelector((state: RootState) => state.home.userDetails);
  const isFirstTime = useSelector((state: RootState) => state.user.isFirstTime);

  let passwordRef = useRef<TextInput>(null!);

  console.log('isFirstTime', isFirstTime);

  useEffect(() => {
    getPermission();
    // DEBUG: Check Apple Sign-In availability
    checkAppleSignInSupport();
  }, []);

  const checkAppleSignInSupport = () => {
    console.log('🍎 Checking Apple Sign-In support...');
    console.log('Platform:', Platform.OS);
    console.log('Platform Version:', Platform.Version);
    
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS detected, checking Apple Auth availability...');
      console.log('Apple Auth object:', appleAuth);
      console.log('Apple Auth isSupported:', appleAuth.isSupported);
      console.log('Apple Auth Operation:', appleAuth.Operation);
      console.log('Apple Auth Scope:', appleAuth.Scope);
    } else {
      console.log('🍎 Not iOS, Apple Sign-In not supported');
    }
  };

  const getPermission = async () => {
    if (Platform.OS == 'ios') {
      getUserLocation();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getUserLocation();
        } else {
          Alert.alert(
            'Rove AI does not have access to your Location for showing you nearby services. To enable access, tap Settings and turn on Location',
            '',
            [
              {
                text: 'Cancel',
                style: 'default',
              },
              {
                text: 'Settings',
                style: 'default',
                onPress: () => {
                  Linking.openSettings();
                },
              },
            ],
          );
          console.log('not grantedddd');
        }
      } catch (err) {
        Alert.alert(
          'Rove AI does not have access to your Location for showing you nearby services. To enable access, tap Settings and turn on Location',
          '',
          [
            {
              text: 'Cancel',
              style: 'default',
            },
            {
              text: 'Settings',
              style: 'default',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ],
        );
        console.log('not granted', err);
      }
    }
  };

  const getUserLocation = () => {
    Platform.OS == 'ios' && Geolocation.requestAuthorization('whenInUse');
    Geolocation.getCurrentPosition(
      position => {
        dispatch(
          HomeActions.setUserLocation({
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
          }),
        );
        AsyncStorage.setItem(
          'userPosition',
          JSON.stringify({
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
          }),
        );
      },
      error => {
        // console.log('notppppppp=====granted', error);
      },
      {
        enableHighAccuracy: true,
        // timeout: 99000000,
        // timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const loginUser = (body: Object) => {
    setLoading(true);
    AuthAPIS.userLogin(body)
      .then(res => {
        console.log('Logging login ovject', res);
        getToken(body, res?.data?.data?.user);
      })
      .catch(err => {
        console.log('Err', err);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
        setLoading(false);
      });
  };

  const getToken = (body: Object, obj: any) => {
    AuthAPIS.getAccessToken(body)
      .then(res => {
        console.log('Res Token', res?.data);
        dispatch(
          HomeActions.setUserDetails({
            user: obj,
            token: res?.data?.access,
            isSocialLogin: false,
          }),
        ),
          setLoading(false);
        dispatch(AuthActions.loginSuccess(true));
      })
      .catch(err => {
        console.log('Err token', err);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
        setLoading(false);
      });
  };

  const handleGoogleLogin = () => {
    GoogleSignin.configure({
      // androidClientId: 'ADD_YOUR_ANDROID_CLIENT_ID_HERE',
      iosClientId:
        '295191056691-erq304na575h0t5lr0phicdo1ofendl8.apps.googleusercontent.com',
    });
    GoogleSignin.hasPlayServices()
      .then(hasPlayService => {
        if (hasPlayService) {
          GoogleSignin.signIn()
            .then(userInfo => {
              console.log('Google cred', JSON.stringify(userInfo));
              postGoogleCred(userInfo?.data?.idToken);
              // console.log('object', userInfo?.data?.idToken)
            })
            .catch(e => {
              console.log('ERROR IS: ' + JSON.stringify(e));
            });
        }
      })
      .catch(e => {
        console.log('ERROR IS: ' + JSON.stringify(e));
      });
  };

  const postGoogleCred = (token: any) => {
    setLoading(true);
    AuthAPIS.googleLogin({idToken: token})
      .then(res => {
        const userData = res?.data?.data;
        const firstLogin = !isFirstTime;

        dispatch(AuthActions.setFirstTime(true));
        dispatch(
          HomeActions.setUserDetails({
            user: userData,
            token: userData?.access_token,
            isSocialLogin: true,
          }),
        );
        setLoading(false);
        if (firstLogin) {
          NavigationService.navigate(RouteNames.AuthRoutes.Preferences);
        } else {
          dispatch(AuthActions.loginSuccess(true));
        }
      })
      .catch(err => {
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
        setLoading(false);
      });
  };

  // FIXED: Proper Apple Sign-In support check
  const isAppleSignInSupported = () => {
    console.log('🍎 isAppleSignInSupported called');
    const supported = Platform.OS === 'ios' && appleAuth.isSupported;
    console.log('🍎 Apple Sign-In supported:', supported);
    return supported;
  };

  // FIXED: Proper Apple Sign-In implementation
  const handleAppleLogin = async () => {
    console.log('🍎 Apple login button pressed');
    
    if (!isAppleSignInSupported()) {
      console.log('🍎 Apple Sign-In not supported');
      Utills.showToast('Apple Sign-In is only available on iOS 13 and later');
      return;
    }

    console.log('🍎 Starting Apple Sign-In process...');
    setLoading(true);
    
    try {
      console.log('🍎 Calling appleAuth.performRequest...');
      
      // Perform the Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      console.log('🍎 Apple Auth Response:', JSON.stringify(appleAuthRequestResponse, null, 2));

      // Check if the response is valid
      if (!appleAuthRequestResponse.identityToken) {
        console.log('🍎 No identity token received');
        setLoading(false);
        Utills.showToast('Apple Sign-In failed: No identity token received');
        return;
      }

      // Extract user data from Apple response
      const { identityToken, user, email, fullName } = appleAuthRequestResponse;
      
      console.log('🍎 Identity Token:', identityToken);
      console.log('🍎 User:', user);
      console.log('🍎 Email:', email);
      console.log('🍎 Full Name:', fullName);

      // Send to backend
      const appleAuthData = {
        identityToken: identityToken,
        user: user,
        email: email,
        fullName: {
          givenName: fullName?.givenName || '',
          familyName: fullName?.familyName || '',
        },
      };
      
      console.log('🍎 Sending to backend:', JSON.stringify(appleAuthData, null, 2));
      postAppleCred(appleAuthData);
      
    } catch (error: any) {
      console.log('🍎 Apple Sign-In Error:', error);
      console.log('🍎 Error message:', error.message);
      console.log('🍎 Error code:', error.code);
      
      setLoading(false);
      
      // Handle specific error codes
      if (error.code === appleAuth.Error.CANCELED) {
        console.log('🍎 User canceled Apple Sign-In');
        // Don't show error for user cancellation
        return;
      }
      
      Utills.showToast('Apple Sign-In failed: ' + error.message);
    }
  };

  const postAppleCred = (appleData: any) => {
    console.log('🍎 Posting Apple credentials to backend...');
    
    AuthAPIS.appleLogin(appleData)
      .then(res => {
        console.log('🍎 Backend response:', JSON.stringify(res?.data, null, 2));
        
        const userData = res?.data?.data;
        const firstLogin = !isFirstTime;

        dispatch(AuthActions.setFirstTime(true));
        dispatch(
          HomeActions.setUserDetails({
            user: userData,
            token: userData?.access_token,
            isSocialLogin: true,
          }),
        );
        setLoading(false);
        
        if (firstLogin) {
          NavigationService.navigate(RouteNames.AuthRoutes.Preferences);
        } else {
          dispatch(AuthActions.loginSuccess(true));
        }
      })
      .catch(err => {
        console.log('🍎 Backend error:', err);
        console.log('🍎 Backend error response:', err?.response?.data);
        
        Utills.showToast(err?.response?.data?.errors?.[0]?.message || 'Apple Sign-In backend error');
        setLoading(false);
      });
  };

  return (
    <Formik
      initialValues={{
        email: '',
        password: '',
      }}
      onSubmit={values => {
        if (values?.email?.length == 0) {
          Utills.showToast('Enter email');
        } else if (values?.password?.length == 0) {
          Utills.showToast('Enter password');
        } else {
          loginUser({email: values?.email, password: values?.password});
        }
      }}
      // validationSchema={Schema.LoginSchema}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        setFieldTouched,
        isValid,
        handleSubmit,
      }) => (
        <AuthHeader
          heading={t('Lets Sign In')}
          title={t('Login')}
          customStyles={{marginTop: Metrix.VerticalSize(20)}}
          isBtn
          onSecPress={() => handleGoogleLogin()}
          onApplePress={() => handleAppleLogin()}
          isbottomText={'SignUp'}
          onBottomTextPress={() =>
            NavigationService.navigate(RouteNames.AuthRoutes.RegisterScreen)
          }
          isSecondaryBtn
          isAppleBtn={isAppleSignInSupported()}
          onPress={() => handleSubmit()}>
          <CustomInput
            heading={t('Email')}
            placeholder={t('Enter email')}
            onChangeText={handleChange('email')}
            onBlur={() => setFieldTouched('email')}
            value={values?.email}
            error={errors?.email}
            touched={touched?.email}
            autoCapitalize="none"
            returnKeyType="next"
            keyboardType="email-address"
            onSubmitEditing={() => passwordRef.current.focus()}
          />
          <CustomInput
            heading={t('Password')}
            placeholder={t('Enter password')}
            value={values?.password}
            onChangeText={handleChange('password')}
            onBlur={() => setFieldTouched('password')}
            error={errors?.password}
            touched={touched?.password}
            secureTextEntry={hidePassword}
            hidepswdState={hidePassword}
            eye
            onEyePress={() => {
              if (values?.password) {
                setHidePassword(prev => !prev);
              }
            }}
            returnKeyType="done"
            inputRef={passwordRef}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              NavigationService.navigate(
                RouteNames.AuthRoutes.ForgotPasswordScreen,
              )
            }>
            <CustomText.RegularText
              customStyle={{
                fontSize: FontType.FontSmall,
                textAlign: 'right',
              }}>
              {t('Forgot password')}
            </CustomText.RegularText>
          </TouchableOpacity>
          <Loader isLoading={loading} />
        </AuthHeader>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({});