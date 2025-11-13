import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CustomModal,
  CustomText,
  FadeInImage,
  MainContainer,
  PrimaryButton,
  RoundImageContainer,
  TextInputAlert,
} from '../../../components';
import { SettingsProps } from '../../propTypes';
import { useDispatch, useSelector } from 'react-redux';
import {
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import { t } from 'i18next';
import { RootState } from '../../../redux/reducers';
import { AuthActions, HomeActions } from '../../../redux/actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeAPIS } from '../../../services/home';
import { Environments } from '../../../services/config';
import { getPasscodeFromStorage } from '../../../config/utills/passcodeUtils';
import { useFocusEffect } from '@react-navigation/native';

export const Settings: React.FC<SettingsProps> = ({ }) => {
  const dispatch = useDispatch();
  const isSafeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.isSafeWord,
  );
  const safeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.safeWord,
  );
  const [isPrompt, setIsPrompt] = useState(false);
  const [word, setWord] = useState(safeWord);
  const [model, setModel] = useState('');
  const token = useSelector((state: RootState) => state.user.authorize);
  const userData = useSelector((state: RootState) => state.home.userDetails);
  const [reputationScore, setReputationScore] = useState<number | null>(null);
  const [isLoadingReputation, setIsLoadingReputation] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const selectedModel = useSelector(
    (state: RootState) => state.home.selectedModel,
  );

  const checCurrentModel = () => {
    if (selectedModel == Environments.Models.TRIGGER_WORD_WHISPER) {
      setModel('Trigger Word Whisper');
    } else if (selectedModel == Environments.Models.WHISPER_AND_SENTIMENT) {
      setModel('Whisper + Sentiment');
    } else {
      setModel('Vit');
    }
  };

  const getReputationScore = async () => {
    try {
      setIsLoadingReputation(true);
      const response = await HomeAPIS.getThreatReportReputation();

      console.log('response', response.data)

      if (response.data && response.data.reputation) {
        setReputationScore(response.data.reputation.reputation_score);
      }
    } catch (error) {
      console.error('Error fetching reputation score:', error);
      setReputationScore(0);
    } finally {
      setIsLoadingReputation(false);
    }
  }

  const getSafeWordFromStorage = async (): Promise<string | null> => {
    try {
      const safeWordData = await AsyncStorage.getItem('SAFE_WORD_KEY');
      return safeWordData;
    } catch (error) {
      console.error('Error getting safe word:', error);
      return null;
    }
  }

  const handleLogout = () => {
    setShowLogoutModal(true);
  }

  const performLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      dispatch(HomeActions.setUserDetails({}));
      dispatch(HomeActions.setUserLocation({}));
      dispatch(AuthActions.loginSuccess(false));
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Error during logout:', error);
      Utills.showToast('Error occurred during logout', null, 'error');
      setShowLogoutModal(false);
    }
  };

  const genderSelection = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          'Whisper + Sentiment',
          'Vit',
          'Trigger Word Whisper',
          'Cancel',
        ],
        destructiveButtonIndex: 3,
        cancelButtonIndex: 3,
        title: 'Select ML Model',
        userInterfaceStyle: 'dark',
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          dispatch(
            HomeActions.setSelectedModel(
              Environments.Models.WHISPER_AND_SENTIMENT,
            ),
          );
        } else if (buttonIndex === 1) {
          dispatch(HomeActions.setSelectedModel(Environments.Models.VIT));
        } else if (buttonIndex === 2) {
          dispatch(
            HomeActions.setSelectedModel(
              Environments.Models.TRIGGER_WORD_WHISPER,
            ),
          );
        } else {
          console.log('Cancelled');
        }
      },
    );

  const CardData = [
    {
      id: '1',
      image: Images.Responders,
      text: 'Responders',
      onPress: () => {
        NavigationService.navigate('TrustedContacts');
      }
    },
    {
      id: '2',
      image: Images.BodyCam,
      text: 'Bodycam/lanyard mode',
      styles: { width: '100%' },
      onPress: () => {
        NavigationService.navigate('BodyCam');
      },
      iconSize: 30
    },
    {
      id: '3',
      image: Images.SafeWord,
      text: 'Safe Word',
      onPress: async () => {
        // Check if passcode exists before navigating to SafeWord
        try {
          const existingSafeWord = await getSafeWordFromStorage();

          console.log('Safe word check:', existingSafeWord);
          console.log('Redux safe word:', safeWord);
          console.log('Redux isSafeWord:', isSafeWord);

          if (!existingSafeWord && !safeWord) {
            // No passcode exists, redirect to PasscodeSettings first
            NavigationService.navigate('SafeWordTraining', {
              isFirstTime: true,
            });
          } else {
            //Safe word exists, check if passcode exists before navigating to SafeWord screen
            const existingPasscode = await getPasscodeFromStorage();

            if (!existingPasscode) {
              //No passcode exists, redirect to PasscodeSettings first
              NavigationService.navigate('PasscodeSettings', {
                returnTo: 'SafeWord',
                purpose: 'setup',
              });
            } else {
              //Both passcode and safe word exists, go to SafeWord screen for updates
              NavigationService.navigate('SafeWord', {
                isUpdate: true,
              });
            }
          }
        } catch (error) {
          console.error('Error checking safe word setup:', error);
          // On error, redirect to PasscodeSettings to be safe
          NavigationService.navigate('SafeWordTraining', {
            isFirstTime: true,
          });
        }
      },
    },
    {
      id: '4',
      image: Images.HeadsUp,
      text: 'Heads Up Alers',
      styles: { width: '100%' },
      onPress: () => {
        NavigationService.navigate('HeadsUpSettings');
      },
      iconSize: 35
    },
    {
      id: '5',
      image: Images.Passkey,
      text: 'Passcode',
      styles: { width: '100%' },
      onPress: () => {
        NavigationService.navigate('PasscodeSettings');
      },
      iconSize: 35,
    },
    {
      id: '6',
      image: Images.HowToUse,
      text: 'How To use',
      styles: { width: '100%' },
      onPress: () => {
        NavigationService.navigate('HowToUse');
      },
    },
    {
      id: '7',
      image: Images.About,
      text: 'FAQs',
      onPress: () => {
        NavigationService.navigate(RouteNames.HomeRoutes.FAQ, {
          from: 'Help Center',
        });
      },
    },
    {
      id: '8',
      image: Images.PrivacyPilicy,
      text: 'Privacy Policy',
      onPress: () => {
        NavigationService.navigate(RouteNames.HomeRoutes.TermsAndPolicy, {
          from: 'Privacy Policy',
        });
      },
    },
    {
      id: '9',
      image: Images.TermsAndCond,
      text: 'Terms & Conditions',
      onPress: () => {
        NavigationService.navigate(RouteNames.HomeRoutes.TermsAndPolicy, {
          from: 'Terms & Conditions',
        });
      },
    },
    {
      id: '10',
      image: Images.Out,
      text: 'Log Out',
      onPress: handleLogout,
    },
  ];

  // useFocusEffect(
  //   React.useCallback(() => {
  //     dispatch(HomeActions.setCameraMode('AUDIO'));
  //   }, [dispatch])
  // );

  useEffect(() => {
    getUser();
    getReputationScore();
  }, []);

  useEffect(() => {
    checCurrentModel();
  }, [selectedModel]);

  const getUser = () => {
    HomeAPIS.getUserData()
      .then(res => {
        dispatch(
          HomeActions.setUserDetails({
            token: userData?.token,
            user: res?.data,
            isSocialLogin: userData?.isSocialLogin ? true : false,
          }),
        );
      })
      .catch(err => {
        console.log('Err User', err?.response?.data);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
      });
  };

  const handleConfirm = () => {
    dispatch(
      HomeActions.setSafeWord({
        isSafeWord: false,
        safeWord: word?.toLowerCase(),
      }),
    );
    setIsPrompt(false);
  };

  const renderSeetingsItem = ({ item }: any) => {
    if (item.condition !== undefined && !item.condition) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={item?.onPress}
        key={item?.id}
        style={styles.renderContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FadeInImage
            customImageContainerStyle={{
              width: Metrix.HorizontalSize(30), // same for all
              height: Metrix.VerticalSize(30),
              alignItems: 'center',
              justifyContent: 'center',
            }}
            imageStyles={{
              width: Metrix.HorizontalSize(item?.iconSize || 25),  // icon image
              height: Metrix.VerticalSize(item?.iconSize || 25),
              resizeMode: 'contain',
              tintColor: Utills.selectedThemeColors().PrimaryTextColor,
            }}
            source={item?.image}
          />

          <CustomText.RegularText customStyle={styles.itemText}>
            {item?.text}
          </CustomText.RegularText>
        </View>
        <View>
          <RoundImageContainer
            imageStyle={{
              tintColor: Utills.selectedThemeColors().PrimaryTextColor,
            }}
            circleWidth={22}
            source={Images.ArrowChevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Function to navigate to edit profile when avatar is pressed
  const handleAvatarPress = () => {
    NavigationService.navigate(RouteNames.HomeRoutes.EditProfileScreen);
  };

  return (
    <MainContainer
      customeStyle={{
        paddingVertical: 0,
        flex: 1,
      }}>
      <View style={styles.headerContainer}>
        <Image
          source={Images.Premium}
          style={styles.settingsIcon}
          resizeMode="contain"
        />
        <CustomText.LargeBoldText customStyle={styles.headerTitle}>
          {t('Settings')}
        </CustomText.LargeBoldText>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flex: 0.3 }}>
          <View style={styles.profileCard}>
            {/* Touchable Avatar Container */}
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.7}
              onPress={handleAvatarPress}>
              <RoundImageContainer
                circleWidth={80}
                source={
                  userData?.isSocialLogin
                    ? { uri: userData?.user?.image_url }
                    : userData?.isSocialLogin == false
                      ? { uri: userData?.user?.avatar }
                      : Images.UserPlaceholder
                }
              />
            </TouchableOpacity>

            <View style={styles.detailsContainer}>
              <CustomText.MediumText
                customStyle={{
                  color: Utills.selectedThemeColors().PrimaryTextColor,
                  fontWeight: '700',
                }}>
                {userData?.user?.first_name +
                  ' ' +
                  userData?.user?.last_name || userData?.user?.username}
              </CustomText.MediumText>

              <CustomText.SmallText customStyle={styles.reputationText}>
                {isLoadingReputation
                  ? 'Loading reputation...'
                  : `Trust score: ${reputationScore !== null ? reputationScore : '0'}`
                }
              </CustomText.SmallText>

              {/* Premium Badge */}
              <View style={styles.badgeContainer}>
                <CustomText.SmallText
                  customStyle={{ color: '#fff', fontWeight: '600' }}>
                  {userData?.user?.isPremium ? 'PREMIUM' : 'PREMIUM'}
                </CustomText.SmallText>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <FlatList
            data={CardData}
            renderItem={renderSeetingsItem}
            contentContainerStyle={styles.flatlistContentContainer}
            keyExtractor={item => item?.id}
          />
        </View>

        {/* Choose Model Section - Added from old code */}
        <View style={styles.modelSelectionContainer}>
          <CustomText.RegularText
            customStyle={styles.chooseModelText}>
            Choose Model
          </CustomText.RegularText>
          <CustomText.SmallText
            onPress={genderSelection}
            customStyle={styles.genderTxt}>
            {model}
          </CustomText.SmallText>
        </View>
      </View>

      <TextInputAlert
        heading={'Safe Word'}
        subHeading={'Please enter your custom safe word'}
        visible={isPrompt}
        setVisible={setIsPrompt}
        inputText={word}
        setInputText={setWord}
        handleConfirm={handleConfirm}
      />
      <CustomModal
        visible={showLogoutModal}
        smallModal
        onClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutModalContent}>
          <CustomText.MediumText customStyle={styles.logoutModalTitle}>
            Logout
          </CustomText.MediumText>
          <CustomText.RegularText customStyle={styles.logoutModalMessage}>
            Are you sure you want to logout?
          </CustomText.RegularText>

          <View style={styles.logoutModalButtons}>
            <PrimaryButton
              title='Cancel'
              customStyles={[styles.logoutButton, styles.cancelButton]}
              customTextStyle={styles.cancelButtonText}
              width={'45%'}
              onPress={() => setShowLogoutModal(false)}
            />
            <PrimaryButton
              title='Logout'
              width={'45%'}
              onPress={performLogout}
            />
          </View>
        </View>
      </CustomModal>
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Metrix.VerticalSize(20),
    marginHorizontal: Metrix.HorizontalSize(20),
    backgroundColor: Utills.selectedThemeColors().Base,
    borderRadius: Metrix.HorizontalSize(12),
    marginTop: Metrix.VerticalSize(20),
    marginBottom: Metrix.VerticalSize(10),
  },
  avatarContainer: {
    marginBottom: Metrix.VerticalSize(10),
  },
  detailsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailText: {
    marginBottom: Metrix.VerticalSize(8),
  },
  reputationText: {
    marginBottom: Metrix.VerticalSize(4),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontWeight: '500',
  },
  badgeContainer: {
    marginTop: Metrix.VerticalSize(4),
    backgroundColor: '#57b5fa',
    paddingHorizontal: Metrix.HorizontalSize(12),
    paddingVertical: Metrix.VerticalSize(4),
    borderRadius: Metrix.HorizontalSize(12),
  },
  flatlistContentContainer: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Utills.selectedThemeColors().Base,
    marginTop: Metrix.VerticalSize(50),
    borderRadius: Metrix.HorizontalSize(8),
    paddingBottom: Metrix.VerticalSize(20),
  },
  renderContainer: {
    borderBottomWidth: 1,
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    paddingVertical: Metrix.VerticalSize(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Metrix.VerticalSize(4),
    borderRadius: Metrix.HorizontalSize(8),
    width: '100%',
    backgroundColor: Utills.selectedThemeColors().Base,
  },
  itemText: {
    marginLeft: Metrix.HorizontalSize(10),
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Metrix.VerticalSize(10),
  },
  settingsIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginRight: Metrix.HorizontalSize(5),
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
  },
  logoutModalContent: {
    alignItems: 'center',
    paddingVertical: Metrix.VerticalSize(20),
    borderWidth: 0.2,
    borderColor: '#fff',
    borderRadius: 20,
    backgroundColor: '#60636c'
  },
  logoutModalTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
    marginBottom: Metrix.VerticalSize(10),
  },
  logoutModalMessage: {
    fontSize: Metrix.customFontSize(16),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    textAlign: 'center',
    marginBottom: Metrix.VerticalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(10),
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Metrix.HorizontalSize(10),
  },
  logoutButton: {
    borderRadius: Metrix.HorizontalSize(8),
    paddingVertical: Metrix.VerticalSize(12),
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
  cancelButtonText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  // New styles for Choose Model section
  modelSelectionContainer: {
    alignItems: 'center',
    paddingBottom: Metrix.VerticalSize(20),
  },
  chooseModelText: {
    alignSelf: 'center',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  genderTxt: {
    fontWeight: '600',
    alignSelf: 'center',
    color: Utills.selectedThemeColors().PrimaryTextColor,
    marginTop: Metrix.VerticalSize(5),
    textDecorationLine: 'underline', // Added to make it clear it's clickable
  },
});