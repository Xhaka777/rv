import {
  Image,
  StyleSheet,
  Text,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {
  AuthHeader,
  CustomModal,
  CustomText,
  Loader,
  MainContainer,
  PlaceholderComponent,
  PrimaryButton,
} from '../../../components';
import {
  Colors,
  FontType,
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import OTPInputView from '@twotalltotems/react-native-otp-input';
import {OtpScreenProps} from '../../propTypes';
import {useDispatch, useSelector} from 'react-redux';
import {AuthActions} from '../../../redux/actions';
import {t} from 'i18next';
import {AuthAPIS} from '../../../services/auth';
import {RootState} from '../../../redux/reducers';

export const OtpScreen: React.FC<OtpScreenProps> = ({route}) => {
  const params = route?.params?.phone;
  const dispatch = useDispatch();
  const userDetails = useSelector((state: RootState) => state.home.userDetails);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('User==>>', userDetails);

  const handleOtp = () => {
    const body = {
      phone_number: params,
      otp: code,
    };
    if (!code && !code.length) {
      Utills.showToast('Code is required');
    } else if (code.length < 4) {
      Utills.showToast('Please enter valid code.');
    } else {
      setLoading(true);
      AuthAPIS.verifyOtp(body)
        .then(res => {
          setLoading(false);
          console.log('Res OTP Verify', res?.data);
          dispatch(AuthActions.loginSuccess(true));
          // setModalPostVisible(true);
        })
        .catch(err => {
          console.log('Err', err.response?.data?.error);
          Utills.showToast(err.response?.data?.error);
          setLoading(false);
          // setModalPostVisible(true);
        });
    }
  };

  const resendOtp = () => {
    const body = {
      phone_number: params,
    };
    setLoading(true);
    AuthAPIS.resendOTP(body)
      .then(res => {
        setLoading(false);
        console.log('Res OTP Verify', res?.data);
        Utills.showToast('New OTP has been send again');
        // setModalPostVisible(true);
      })
      .catch(err => {
        console.log('Err', err.response?.data?.error);
        Utills.showToast(err.response?.data?.error);
        setLoading(false);
        // setModalPostVisible(true);
      });
  };

  return (
    <>
      <AuthHeader
        heading={t('Enter OTP code')}
        title={t('Continue')}
        customStyles={{marginTop: Metrix.VerticalSize(20)}}
        isBtn
        onPress={handleOtp}>
        <View style={styles.container}>
          <CustomText.RegularText
            isSecondaryColor
            customStyle={{textAlign: 'center'}}>
            {t(
              '4 digit code sent to your mobile. Please check and confirm the code to continue',
            )}
          </CustomText.RegularText>
          <OTPInputView
            style={{
              width: '100%',
              height: Metrix.VerticalSize(50),
              marginVertical: Metrix.VerticalSize(40),
            }}
            pinCount={4}
            code={code}
            onCodeChanged={code => setCode(code)}
            codeInputFieldStyle={styles.underlineStyleBase}
            codeInputHighlightStyle={styles.underlineStyleHighLighted}
            selectionColor={Utills.selectedThemeColors().PrimaryTextColor}
          />
          <View style={{flexDirection: 'row'}}>
            <CustomText.RegularText>
              {t('Didnt get OTP  ?')}
            </CustomText.RegularText>
            <TouchableOpacity activeOpacity={0.7} onPress={resendOtp}>
              <CustomText.RegularText
                customStyle={{
                  color: Utills.selectedThemeColors().SecondaryTextColor,
                  fontWeight: '700',
                }}>
                {t(' Resend now')}
              </CustomText.RegularText>
            </TouchableOpacity>
          </View>
        </View>
        <Loader isLoading={loading} />
      </AuthHeader>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    // height: '60%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    // borderWidth: 1,
  },
  textStyle: {
    textAlign: 'center',
    lineHeight: Metrix.VerticalSize(20),
  },
  underlineStyleBase: {
    width: Metrix.HorizontalSize(45),
    height: Metrix.VerticalSize(45),
    borderWidth: 1,
    // marginHorizontal: 3,
    borderBottomWidth: Metrix.HorizontalSize(2),
    // borderTopWidth: Metrix.HorizontalSize(2),
    borderRightWidth: Metrix.HorizontalSize(2),
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(8),
    fontSize: FontType.FontExtraLarge,
    color: Utills.selectedThemeColors().PrimaryTextColor,
    padding: 0,
  },
  underlineStyleHighLighted: {
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
});
