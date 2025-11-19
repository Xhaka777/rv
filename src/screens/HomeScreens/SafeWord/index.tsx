import { StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeWordProps } from '../../propTypes';
import {
  BackHeader,
  CustomText,
  MainContainer,
  PrimaryButton,
  VolumeAnimatedIcon,
} from '../../../components';
import { Images, Metrix, Utills, NavigationService, RouteNames } from '../../../config';
import { Image } from 'react-native';
import { normalizeFont } from '../../../config/metrix';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from 'lodash';
import { getPasscodeFromStorage, verifyStoredPasscode } from '../../../config/utills/passcodeUtils'
import { useFocusEffect } from '@react-navigation/native';
import { X } from 'lucide-react-native';

export const SafeWord: React.FC<SafeWordProps> = ({ route }) => {
  const [hasPasscode, setHasPasscode] = useState(false);
  const [hasSafeWord, setHasSafeWord] = useState(false);
  const [safeWord, setSafeWord] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isCheckingPasscode, setIsCheckingPasscode] = useState(true);

  // Check if user just came back from setting up passcode or if this is an update
  const justSetPasscode = route?.params?.justSetPasscode || false;
  const isUpdate = route?.params?.isUpdate || false;

  useEffect(() => {
    checkInitialSetup();
  }, []);

  // Add focus listener to refresh data when returning from PasscodeSettings
  useEffect(() => {
    const unsubscribe = NavigationService.addListene?.('focus', () => {
      if (!justSetPasscode) {
        checkInitialSetup();
      }
    });

    return unsubscribe;
  }, [justSetPasscode]);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh safe word from storage when screen gains focus
      const refreshSafeWord = async () => {
        const latestSafeWord = await getSafeWordFromStorage();
        if (latestSafeWord) {
          setSafeWord(latestSafeWord);
          setHasSafeWord(true);
        }
      };

      refreshSafeWord();
    }, [])
  );

  const checkInitialSetup = async () => {
    setIsCheckingPasscode(true);
    try {
      const existingPasscode = await getPasscodeFromStorage();
      const existingSafeWord = await getSafeWordFromStorage();

      console.log('Passcode exists:', !!existingPasscode);
      console.log('Safe word exists:', !!existingSafeWord);

      // If no passcode exists, redirect to PasscodeSettings with return intent
      if (!existingPasscode) {
        console.log('No passcode found, redirecting to PasscodeSettings...');
        NavigationService.navigate(RouteNames.HomeRoutes.PasscodeSettings, {
          returnTo: 'SafeWord',
          purpose: 'setup' // Indicates this is for initial setup
        });
        return;
      }

      // Only set state if passcode exists
      setHasPasscode(true);
      setHasSafeWord(!!existingSafeWord);
      setSafeWord(existingSafeWord || '');

    } catch (error) {
      console.error('Error checking setup:', error);
      // On error, also redirect to PasscodeSettings to be safe
      NavigationService.navigate(RouteNames.HomeRoutes.PasscodeSettings, {
        returnTo: 'SafeWord',
        purpose: 'setup'
      });
      return;
    } finally {
      setIsCheckingPasscode(false);
    }
  };

  const getSafeWordFromStorage = async (): Promise<string | null> => {
    try {
      const safeWord = await AsyncStorage.getItem('SAFE_WORD_KEY');
      return safeWord;
    } catch (error) {
      console.error('Error getting safe word:', error);
      return null;
    }
  };

  const saveSafeWordToStorage = async (word: string): Promise<boolean> => {
    try {
      await AsyncStorage.setItem('SAFE_WORD_KEY', word);
      return true;
    } catch (error) {
      console.error('Error saving safe word:', error);
      return false;
    }
  };

  const handleUpdateSafeWord = async () => {
    // Navigate to safe word training for recording new safe word
    NavigationService.navigate('SafeWordTraining', {
      isUpdate: true,
      skipCalibration: true,
      isFirstTime: false,
    });
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Show loading state while checking passcode
  if (isCheckingPasscode) {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <CustomText.RegularText customStyle={styles.loadingText}>
              Loading...
            </CustomText.RegularText>
          </View>
        </View>
      </MainContainer>
    );
  }

  // If no passcode exists, this screen shouldn't render (user should be redirected)
  if (!hasPasscode) {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <CustomText.RegularText customStyle={styles.loadingText}>
              Setting up passcode...
            </CustomText.RegularText>
          </View>
        </View>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <View style={styles.container}>
        <View style={styles.cardContainer}>
          <View style={styles.titleContainer}>
            <View style={styles.titleLeftContent}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Safe Word
              </CustomText.RegularText>
            </View>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={() => NavigationService.navigate('Settings')}
            >
              <X
                size={24}
                color={Utills.selectedThemeColors().PrimaryTextColor}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.line} />

          <CustomText.MediumText customStyle={styles.textSubheading}>
            Voice profile trained and safe word set to:
          </CustomText.MediumText>

          {/* Display current safe word if it exists */}
          {hasSafeWord && (
            <View style={styles.currentSafeWordContainer}>

              {/* Safe Word Input Field - shows the actual safe word */}
              <View style={[styles.safeWordInputContainer]}>
                <TextInput
                  style={styles.safeWordTextInput}
                  value={safeWord}
                  editable={false} // Make it read-only
                  secureTextEntry={!isPasswordVisible}
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.eyeButtonAbsolute}
                  onPress={togglePasswordVisibility}
                >
                  <Image
                    source={isPasswordVisible ? Images.EyeAbleIcon : Images.EyeDisableIcon}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <CustomText.RegularText customStyle={styles.boldSubheading}>
            This phrase will activate Rove even if your phone is locked. Say it during an emergency to start livestreaming and alert your responders.
          </CustomText.RegularText>

          <View style={styles.proTipContainer}>
            <CustomText.RegularText customStyle={styles.proTipEmoji}>
              👉  <CustomText.RegularText customStyle={styles.proTipText}>
                <CustomText.RegularText customStyle={styles.proTipBold}>
                  Pro tip:
                </CustomText.RegularText>
                {' '}You can also try it in a safe setting to see how it responds.
              </CustomText.RegularText>
            </CustomText.RegularText>
          </View>

          {/* Button */}
          <PrimaryButton
            title="Update safe word"
            onPress={handleUpdateSafeWord}
            customStyles={styles.setPasscodeButton}
            customTextStyle={styles.buttonText}
          />
        </View>
      </View>
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Metrix.HorizontalSize(2),
    paddingTop: Metrix.VerticalSize(40),
    backgroundColor: 'transparent',
  },
  cardContainer: {
    backgroundColor: '#1d1d1d',
    borderRadius: Metrix.HorizontalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(10),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Add this line
    marginBottom: Metrix.VerticalSize(5),
  },
  titleLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exitButton: {
    padding: Metrix.HorizontalSize(8),
    borderRadius: Metrix.HorizontalSize(6),
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    marginRight: Metrix.HorizontalSize(5),
    tintColor: '#57b5fa',
  },
  line: {
    width: '100%',
    height: 2,
    backgroundColor: '#666',
    marginBottom: 14
  },
  textHeading: {
    fontSize: normalizeFont(18),
    letterSpacing: 0.7,
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  textSubheading: {
    fontSize: normalizeFont(16),
    letterSpacing: 0.7,
    fontWeight: '400',
    marginBottom: Metrix.VerticalSize(15),
    lineHeight: 20,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  currentSafeWordContainer: {
    // backgroundColor: '#2d2d2d',
    borderRadius: Metrix.HorizontalSize(12),
    // paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(15),
    marginBottom: Metrix.VerticalSize(20),
  },
  currentSafeWordLabel: {
    fontSize: normalizeFont(14),
    color: '#CCCCCC',
    marginBottom: Metrix.VerticalSize(10),
  },
  safeWordInputContainer: {
    position: 'relative',
    backgroundColor: '#303030',
    borderRadius: Metrix.HorizontalSize(12),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  safeWordTextInput: {
    paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(15),
    fontSize: normalizeFont(16),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    textAlign: 'center',
    textAlignVertical: 'center',
    letterSpacing: 2,
    includeFontPadding: false,
    lineHeight: normalizeFont(18) * 1.2,
    flexWrap: 'wrap',
    minHeight: Metrix.VerticalSize(50),
  },
  eyeButtonAbsolute: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    padding: Metrix.HorizontalSize(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
    tintColor: '#CCCCCC',
  },
  boldSubheading: {
    fontSize: normalizeFont(16),
    fontWeight: '400',
    marginBottom: Metrix.VerticalSize(15),
    lineHeight: 20,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  proTipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Metrix.VerticalSize(15),
  },
  proTipEmoji: {
    fontSize: normalizeFont(16),
    marginRight: Metrix.HorizontalSize(8),
    marginTop: Metrix.VerticalSize(2),
  },
  proTipText: {
    fontSize: normalizeFont(17),
    fontWeight: '400',
    lineHeight: 22,
    color: Utills.selectedThemeColors().PrimaryTextColor,
    flex: 1,
  },
  proTipBold: {
    fontWeight: '600',
    fontSize: normalizeFont(16),
  },
  setPasscodeButton: {
    marginTop: Metrix.VerticalSize(5),
    paddingHorizontal: Metrix.HorizontalSize(40),
    alignSelf: 'center',
    backgroundColor: '#6b6b6b',
    borderRadius: Metrix.HorizontalSize(8),
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: normalizeFont(16),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    textAlign: 'center',
  },
});