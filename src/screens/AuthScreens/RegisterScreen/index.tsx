import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useRef, useState } from 'react';
import {
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import {
  AuthHeader,
  CustomInput,
  CustomModal,
  CustomText,
  Loader,
} from '../../../components';
import { Formik } from 'formik';
import { RegisterScreenProps } from '../../propTypes';
import { useDispatch } from 'react-redux';
import { HomeActions } from '../../../redux/actions';
import { t } from 'i18next';
import { AuthAPIS } from '../../../services/auth/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhoneInput from 'react-native-phone-number-input';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Schema from '../../../formik';

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ }) => {
  const dispatch = useDispatch();
  const [hidePassword, setHidePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState(false);
  const [modalPostVisible, setModalPostVisible] = useState(false);
  const [phoneNo, setPhoneNo] = useState('');
  const phoneInput = useRef(null);

  let firstNameRef = useRef<TextInput>(null!);
  let lastNameref = useRef<TextInput>(null!);
  let emailref = useRef<TextInput>(null!);
  let passwordRef = useRef<TextInput>(null!);

  const handleOnClosePost = () => {
    setModalPostVisible(false);
  };

  const handlePhoneChange = (val: string) => {
    const callingCode = phoneInput.current?.getCallingCode(); // Get the calling code
    const sanitizedVal = val?.replace(/\s/g, ''); // Remove spaces

    const fullPhoneNumber = `+${callingCode}${sanitizedVal}`; // Concatenate country code with the sanitized number
    // Check if the number matches E.164 format
    const isValidE164 = /^\+[1-9]\d{1,14}$/.test(fullPhoneNumber);

    if (isValidE164) {
      setPhoneNo(fullPhoneNumber); // Update state with valid phone number
    }
  };

  const otpGenerate = (phone: any) => {
    const body = {
      phone_number: phone,
    };
    AuthAPIS.sendOtp(body)
      .then(res => {
        console.log('Res OTP', res?.data);
        setLoading(false);
        // NavigationService.navigate(RouteNames.AuthRoutes.OtpScreen, {
        //   phone: phone,
        // });
        NavigationService.navigate(RouteNames.AuthRoutes.OtpScreen, {
          phone: phone,
        });
      })
      .catch(err => {
        console.log('Err Otp', err.response?.data);
        setLoading(false);
      });
  };

  const registerUser = (body: Object) => {
    setLoading(true);
    AuthAPIS.userSignup(body)
      .then(res => {
        console.log('Res Signup', res?.data?.data);
        dispatch(
          HomeActions.setUserDetails({
            user: res?.data?.data?.user,
            token: res?.data?.meta?.session_token,
          }),
        );
        AsyncStorage.setItem(
          'userData',
          JSON.stringify({
            user: res?.data?.data?.user,
            token: res?.data?.meta?.session_token,
          }),
        );
        getToken(body, res?.data?.data?.user);
      })
      .catch(err => {
        console.log('Err', err);
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
          }),
        );
        setLoading(false);
        otpGenerate(phoneNo);
      })
      .catch(err => {
        console.log('Err', err);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
        setLoading(false);
      });
  };

  return (
    <Formik
      initialValues={{
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
      }}
      validationSchema={Schema.SignupSchema}
      onSubmit={values => {
        const body = {
          password: values?.password,
          email: values?.email,
          first_name: values?.firstName,
          last_name: values?.lastName,
          full_name: values?.firstName + ' ' + values?.lastName,
          phone_number: phoneNo,
        };
        console.log('SignupBody', body);

        if (phoneNo?.length === 0) {
          Utills.showToast('Please enter a valid phone number in E.164 format');
        } else if (check === false) {
          setModalPostVisible(true);
        } else {
          registerUser(body);
        }
      }}>
      {({
        values,
        errors,
        touched,
        handleChange,
        setFieldTouched,
        handleSubmit,
      }) => (
        <>
          <AuthHeader
            heading={t('Lets Sign Up')}
            title={t('Create my account')}
            isLogo={true}
            isBtn
            onPress={() => handleSubmit()}>
            {/* <ScrollView showsVerticalScrollIndicator={false}> */}
            <CustomInput
              heading={t('First Name')}
              placeholder={t('Enter your first name')}
              onChangeText={handleChange('firstName')}
              onBlur={() => setFieldTouched('firstName')}
              value={values?.firstName}
              error={errors?.firstName}
              touched={touched?.firstName}
              autoCapitalize="none"
              returnKeyType="next"
              keyboardType="default"
              onSubmitEditing={() => lastNameref.current.focus()}
              inputRef={firstNameRef}
            />
            <CustomInput
              heading={t('Last Name')}
              placeholder={t('Enter your last name')}
              onChangeText={handleChange('lastName')}
              onBlur={() => setFieldTouched('lastName')}
              value={values?.lastName}
              error={errors?.lastName}
              touched={touched?.lastName}
              autoCapitalize="none"
              returnKeyType="next"
              keyboardType="default"
              onSubmitEditing={() => emailref.current.focus()}
              inputRef={lastNameref}
            />
            <CustomInput
              heading={t('Email')}
              placeholder={t('Enter your email')}
              onChangeText={handleChange('email')}
              onBlur={() => setFieldTouched('email')}
              value={values?.email}
              error={errors?.email}
              touched={touched?.email}
              autoCapitalize="none"
              returnKeyType="next"
              keyboardType="email-address"
              inputRef={emailref}
            />

            <CustomText.RegularText
              customStyle={{
                // textAlign: I18nManager.forceRTL ? 'left' : 'right',
                marginBottom: Metrix.VerticalSize(10),
                marginLeft: Metrix.HorizontalSize(10),
                fontSize: Metrix.customFontSize(15),
              }}>
              {t('Phone Number')}
            </CustomText.RegularText>

            <PhoneInput
              ref={phoneInput}
              containerStyle={{
                borderRadius: Metrix.HorizontalSize(10),
                borderWidth: 2,
                borderColor: Utills.selectedThemeColors().TextInputBorderColor,
                backgroundColor: Utills.selectedThemeColors().Base,
                width: '100%',
              }}
              textInputProps={{
                selectionColor: Utills.selectedThemeColors().PrimaryTextColor, // Change cursor color here
              }}
              codeTextStyle={{
                color: Utills.selectedThemeColors().PrimaryTextColor,
              }}
              textContainerStyle={{
                backgroundColor: Utills.selectedThemeColors().Base,
                borderRadius: Metrix.HorizontalSize(10),
              }}
              textInputStyle={{
                color: Utills.selectedThemeColors().PrimaryTextColor,
              }}
              layout="first"
              defaultValue={phoneNo}
              withDarkTheme
              defaultCode="US"
              onChangeText={handlePhoneChange}
              onChangeCountry={() => setPhoneNo('')}
            />

            <CustomInput
              heading={t('Password')}
              placeholder={t('Enter your password')}
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
            <View style={styles.privacyContainer}>
              <Pressable
                onPress={() => setCheck(!check)}
                style={styles.checkBox}>
                {check && (
                  <MaterialIcon
                    name="check"
                    color={Utills.selectedThemeColors().PrimaryTextColor}
                    size={17}
                  />
                )}
              </Pressable>
              <TouchableOpacity
                onPress={() => {
                  setModalPostVisible(true);
                }}
                activeOpacity={0.7}
                style={{ width: '85%' }}>
                <CustomText.SmallText
                  customStyle={{
                    marginLeft: 5,
                    textAlign: 'center',
                  }}>
                  Do You agree to our Terms of Service and Privacy Policy?
                </CustomText.SmallText>
              </TouchableOpacity>
            </View>
            <Loader isLoading={loading} />
            {/* </ScrollView> */}
          </AuthHeader>

          <CustomModal onClose={handleOnClosePost} visible={modalPostVisible}>
            <View
              style={{
                alignItems: 'center',
                flex: 1,
              }}>
              <CustomText.ExtraLargeBoldText
                customStyle={{
                  textAlign: 'center',
                  textDecorationLine: 'underline',
                }}>
                Disclaimer
              </CustomText.ExtraLargeBoldText>
              <CustomText.RegularText
                isSecondaryColor
                customStyle={{ paddingVertical: Metrix.VerticalSize(10) }}>
                Last Updated: 19 September, 2024
              </CustomText.RegularText>
              <View style={{ flex: 1, paddingVertical: Metrix.VerticalSize(10) }}>
                <CustomText.RegularText customStyle={{ textAlign: 'center' }}>
                  Please read this disclaimer carefully before using Rove,
                  operated and owned by {'\n'}Rove AI (Inc) (“us, “we” or our”).
                  {'\n' + '\n'} While our solution aims to provide reliable
                  monitoring, occasional disruptions may occur due to factors
                  like poor reception or your device’s microphone being
                  obstructed, such as when it’s inside a bag or pocket. For
                  optimal protection, please ensure that your microphone remains
                  unobstructed, especially in environments where security is
                  critical. {'\n' + '\n'} By accessing or using the service, you
                  agree to be bound by these terms. If you do not agree, you may
                  not access the service. {'\n' + '\n'} Terms and conditions
                  provided by {'\n'} Rove AI (Inc)
                </CustomText.RegularText>
              </View>
              <Image
                source={Images.Logo}
                style={{
                  width: Metrix.HorizontalSize(120),
                  height: Metrix.VerticalSize(60),
                }}
                resizeMode="cover"
              />
            </View>
          </CustomModal>
        </>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Metrix.VerticalSize(10),
  },
  checkBox: {
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'white',
    width: Metrix.HorizontalSize(18),
    height: Metrix.VerticalSize(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    marginHorizontal: 3,
  },
});
