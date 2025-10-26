import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { PasscodeSettingsProps } from '../../propTypes';
import {
  BackHeader,
  CustomText,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import { PasscodeInput } from '../../../components';
import { CheckmarkModal } from '../../../components/CheckMarkModal'; // Import the new component
import { Images, Metrix, Utills, NavigationService, RouteNames } from '../../../config';
import { Image } from 'react-native';
import { normalizeFont } from '../../../config/metrix';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PasscodeSettings: React.FC<PasscodeSettingsProps> = ({ }) => {
  const [passcode, setPasscode] = useState('');
  const [isSettingPasscode, setIsSettingPasscode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // New state for success modal

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Animate confirm screen in from right
  useEffect(() => {
    if (isConfirming) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animation values when not confirming
      slideAnim.setValue(screenWidth);
      overlayOpacity.setValue(0);
    }
  }, [isConfirming]);

  const handlePasscodeComplete = (enteredPasscode: string) => {
    if (!isConfirming) {
      // First time entering passcode
      setPasscode(enteredPasscode);
      setIsConfirming(true);
    } else {
      // Confirming passcode
      if (enteredPasscode === passcode) {
        // Success - passcodes match
        console.log('✅ Passcode confirmed successfully');

        // Animate out confirm screen first
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: screenWidth,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Reset confirming state
          setIsConfirming(false);
          
          // Show success modal after animation completes
          setTimeout(() => {
            setShowSuccessModal(true);
          }, 100);
        });

      } else {
        // Error - passcodes don't match
        console.log('❌ Passcodes do not match');
        setShowError(true);

        // Animate out and reset after showing error
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: screenWidth,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            })
          ]).start(() => {
            setShowError(false);
            setIsConfirming(false);
            setPasscode('');
          });
        }, 1500);
      }
    }
  };

  const handleBackFromPasscode = () => {
    if (isConfirming) {
      // Animate out the confirm screen
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsConfirming(false);
        setPasscode('');
      });
    } else {
      setIsSettingPasscode(false);
      setPasscode('');
    }
  };

  // Handle success modal completion
  const handleSuccessModalComplete = () => {
    console.log('🎉 Success modal completed, navigating to Settings');
    setShowSuccessModal(false);
    
    // Navigate to Settings screen after modal disappears
    setTimeout(() => {
      NavigationService.navigate(RouteNames.HomeRoutes.Settings);
    }, 300);
  };

  if (!isSettingPasscode) {
    return (
      <MainContainer>
        <View style={styles.container}>
          <View style={styles.cardContainer}>
            <View style={styles.titleContainer}>
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <CustomText.RegularText customStyle={styles.textHeading}>
                Set Your Passcode
              </CustomText.RegularText>
            </View>
            <View style={styles.line} />

            <CustomText.RegularText customStyle={styles.textSubheading}>
              Your passcode controls how files are deleted and keeps your files safe even if you are forced to delete them under threat.
            </CustomText.RegularText>

            <CustomText.RegularText customStyle={styles.textSubheading}>
              Entering ANY incorrect passcode will <CustomText.RegularText customStyle={styles.highlightedText}>delete local files only</CustomText.RegularText>, while the cloud backup stays safe for your responders to access for up to 7 days.
            </CustomText.RegularText>

            <CustomText.RegularText customStyle={styles.boldSubheading}>
              If you want to truly delete a file:
            </CustomText.RegularText>

            <CustomText.RegularText customStyle={styles.textSubheading}>
              Enter your <CustomText.RegularText customStyle={styles.highlightedText}>correct passcode</CustomText.RegularText> to erase both local and cloud files. This way, you're always protected - even under pressure.
            </CustomText.RegularText>

            <PrimaryButton
              title="Set passcode"
              onPress={() => setIsSettingPasscode(true)}
              customStyles={styles.setPasscodeButton}
              customTextStyle={styles.buttonText}
            />
          </View>
        </View>

        {/* Success Modal */}
        <CheckmarkModal
          visible={showSuccessModal}
          title="Success!"
          subtitle="Your passcode has been set successfully"
          duration={2000}
          onComplete={handleSuccessModalComplete}
        />
      </MainContainer>
    );
  }

  return (
    <View style={styles.passcodeContainer}>
      {/* Initial Passcode Screen */}
      <PasscodeInput
        title="Enter your passcode"
        onPasscodeComplete={handlePasscodeComplete}
        onBack={handleBackFromPasscode}
        showError={false}
        isConfirmation={false}
      />

      {/* Confirm Passcode Screen - Animated Overlay */}
      {isConfirming && (
        <>
          {/* Semi-transparent overlay */}
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              }
            ]}
          />

          {/* Sliding confirm screen */}
          <Animated.View
            style={[
              styles.confirmContainer,
              {
                transform: [{ translateX: slideAnim }],
              }
            ]}
          >
            <PasscodeInput
              title="Confirm your passcode"
              onPasscodeComplete={handlePasscodeComplete}
              onBack={handleBackFromPasscode}
              showError={showError}
              isConfirmation={true}
            />
          </Animated.View>
        </>
      )}

      {/* Success Modal - Shows after passcode confirmation */}
      <CheckmarkModal
        visible={showSuccessModal}
        title="Passcode Set!"
        subtitle="Your passcode has been created successfully"
        duration={2000}
        onComplete={handleSuccessModalComplete}
      />
    </View>
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
    backgroundColor: '#333333',
    borderRadius: Metrix.HorizontalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(30),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(5),
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    marginRight: Metrix.HorizontalSize(5),
    tintColor: '#57b5fa',
  },
  textHeading: {
    fontSize: normalizeFont(18),
    letterSpacing: 0.7,
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  textSubheading: {
    fontSize: normalizeFont(15),
    letterSpacing: 0.7,
    fontWeight: '400',
    marginBottom: Metrix.VerticalSize(15),
    lineHeight: 20,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  boldSubheading: {
    fontSize: normalizeFont(15),
    letterSpacing: 0.7,
    fontWeight: '700',
    marginBottom: Metrix.VerticalSize(15),
    lineHeight: 20,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  highlightedText: {
    fontWeight: '600',
    color: Utills.selectedThemeColors().Blue,
  },
  setPasscodeButton: {
    marginTop: Metrix.VerticalSize(15),
    width: '50%',
    alignSelf: 'center',
    backgroundColor: '#60636c',
    borderRadius: Metrix.HorizontalSize(8),
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  line: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
    marginBottom: Metrix.VerticalSize(10)
  },

  // Animation styles
  passcodeContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  confirmContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
});