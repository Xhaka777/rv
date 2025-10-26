import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { CustomText } from '../index';
import { Metrix, Utills, Images, NavigationService } from '../../config';
import { normalizeFont } from '../../config/metrix';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

interface KeypadButton {
  number: string;
  letters?: string;
}

interface PasscodeInputProps {
  title: string;
  onPasscodeComplete: (passcode: string) => void;
  onBack?: () => void;
  expectedPasscode?: string;
  showError?: boolean;
  isConfirmation?: boolean;
  isVerificationMode?: boolean; // New prop to distinguish between setup and verification
}

const keypadData: KeypadButton[] = [
  { number: '1', letters: '' },
  { number: '2', letters: 'ABC' },
  { number: '3', letters: 'DEF' },
  { number: '4', letters: 'GHI' },
  { number: '5', letters: 'JKL' },
  { number: '6', letters: 'MNO' },
  { number: '7', letters: 'PQRS' },
  { number: '8', letters: 'TUV' },
  { number: '9', letters: 'WXYZ' },
];

// AsyncStorage functions for passcode management
const PASSCODE_KEY = 'userPasscode';

const savePasscodeToStorage = async (passcode: string) => {
  try {
    await AsyncStorage.setItem(PASSCODE_KEY, passcode);
    console.log('Passcode saved successfully');
  } catch (error) {
    console.error('Error saving passcode:', error);
  }
};

export const getPasscodeFromStorage = async (): Promise<string | null> => {
  try {
    const passcode = await AsyncStorage.getItem(PASSCODE_KEY);
    return passcode;
  } catch (error) {
    console.error('Error getting passcode:', error);
    return null;
  }
};

export const clearPasscodeFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(PASSCODE_KEY);
    console.log('Passcode cleared successfully');
  } catch (error) {
    console.error('Error clearing passcode:', error);
  }
};

export const verifyStoredPasscode = async (inputPasscode: string): Promise<boolean> => {
  try {
    const storedPasscode = await AsyncStorage.getItem(PASSCODE_KEY);
    console.log('Verifying passcode...');
    console.log('Input:', inputPasscode);
    console.log('Stored:', storedPasscode);
    console.log('Match:', storedPasscode === inputPasscode);
    return storedPasscode === inputPasscode;
  } catch (error) {
    console.error('Error verifying passcode:', error);
    return false;
  }
};

export const PasscodeInput: React.FC<PasscodeInputProps> = ({
  title,
  onPasscodeComplete,
  onBack,
  expectedPasscode,
  showError = false,
  isConfirmation = false,
  isVerificationMode = false, // New prop with default value
}) => {
  const [passcode, setPasscode] = useState('');
  const [isError, setIsError] = useState(false);

  // Calculate responsive dimensions with better constraints
  const maxButtonSize = 80;
  const minButtonSize = 60;
  const availableWidth = width - (Metrix.HorizontalSize(80));
  const calculatedButtonSize = Math.min(
    Math.max((availableWidth - 60) / 3, minButtonSize),
    maxButtonSize
  );
  const buttonSize = calculatedButtonSize;
  const buttonSpacing = Math.min((availableWidth - (buttonSize * 3)) / 4, 20);

  useEffect(() => {
    if (showError) {
      setIsError(true);
      setPasscode('');
      setTimeout(() => setIsError(false), 1000);
    }
  }, [showError]);

  // Clear passcode when title changes (for confirmation step)
  useEffect(() => {
    setPasscode('');
  }, [title]);

  const handleNumberPress = (number: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + number;
      setPasscode(newPasscode);

      // Haptic feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }

      // Auto-submit when 4 digits entered
      if (newPasscode.length === 4) {
        setTimeout(async () => {
          // Only save passcode to AsyncStorage if NOT in verification mode
          if (!isVerificationMode) {
            await savePasscodeToStorage(newPasscode);
          }

          // Call the original callback
          onPasscodeComplete(newPasscode);

          // Clear passcode immediately after submitting for next input
          setPasscode('');
        }, 100);
      }
    }
  };
  const handleDelete = () => {
    if (passcode.length > 0) {
      setPasscode(passcode.slice(0, -1));
    }
  };

  const renderPasscodeDots = () => {
    const dotSize = Math.min(width * 0.04, 16);
    const dotSpacing = width * 0.08;

    return (
      <View style={[styles.dotsContainer, { gap: dotSpacing }]}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.passcodeCircle,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
              },
              passcode.length > index && styles.passcodeCircleFilled,
              isError && styles.passcodeCircleError,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypadButton = ({ number, letters }: KeypadButton) => (
    <TouchableOpacity
      key={number}
      style={[
        styles.keypadButton,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
        }
      ]}
      onPress={() => handleNumberPress(number)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.buttonContainer,
        {
          borderRadius: buttonSize / 2,
        }
      ]}>
        <Text style={[
          styles.numberText,
          { fontSize: normalizeFont(buttonSize * 0.45) }
        ]}>
          {number}
        </Text>
        {letters && (
          <Text style={[
            styles.lettersText,
            { fontSize: normalizeFont(buttonSize * 0.125) }
          ]}>
            {letters}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Create rows for guaranteed 3x3 layout
  const renderKeypadRow = (startIndex: number) => (
    <View style={[styles.keypadRow, { gap: buttonSpacing }]}>
      {keypadData.slice(startIndex, startIndex + 3).map((item) => renderKeypadButton(item))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[
          Utills.selectedThemeColors().Base || '#000000',
          '#1a1a2e',
          '#16213e'
        ]}
        style={styles.background}
      />

      {/* Main Content */}
      <View style={styles.contentContainer}>

        <View style={styles.header}>
          <CustomText.LargeSemiBoldText customStyle={styles.title}>
            {title}
          </CustomText.LargeSemiBoldText>
        </View>

        {renderPasscodeDots()}

        <View style={styles.keypadContainer}>
          {/* Row 1: 1, 2, 3 */}
          {renderKeypadRow(0)}
          {/* Row 2: 4, 5, 6 */}
          {renderKeypadRow(3)}
          {/* Row 3: 7, 8, 9 */}
          {renderKeypadRow(6)}

          {/* Bottom row with 0 and delete */}
          <View style={[styles.bottomRow, { gap: buttonSpacing }]}>
            <View style={{ width: buttonSize, height: buttonSize }} />
            <TouchableOpacity
              style={[
                styles.keypadButton,
                {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                }
              ]}
              onPress={() => handleNumberPress('0')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.buttonContainer,
                {
                  borderRadius: buttonSize / 2,
                }
              ]}>
                <Text style={[
                  styles.numberText,
                  { fontSize: normalizeFont(buttonSize * 0.45) }
                ]}>
                  0
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                }
              ]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.deleteText,
                { fontSize: normalizeFont(buttonSize * 0.35) }
              ]}>
                ⌫
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Metrix.HorizontalSize(40),
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    marginBottom: Metrix.VerticalSize(60),
  },
  title: {
    fontSize: normalizeFont(24),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '300',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(80),
  },
  keypadContainer: {
    alignItems: 'center',
    gap: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButton: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
  },
  numberText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    textAlign: 'center',
    fontWeight: '200',
  },
  lettersText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: -4,
    fontWeight: '400',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontWeight: '300',
  },
  backButton: {
    position: 'absolute',
    top: Metrix.VerticalSize(60),
    left: Metrix.HorizontalSize(20),
    width: Metrix.HorizontalSize(40),
    height: Metrix.VerticalSize(40),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Metrix.HorizontalSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    transform: [{ rotate: '180deg' }],
  },
  passcodeCircle: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
  },
  passcodeCircleFilled: {
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    // Add iOS-style shadow
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  passcodeCircleError: {
    borderColor: '#ff4444',
    backgroundColor: 'transparent',
  },
});