import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  AppState,
} from 'react-native';
import {
  CustomText,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import { Images, Metrix, Utills, NavigationService } from '../../../config';

export const SiriSetupScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [appState, setAppState] = useState(AppState.currentState);

  // Monitor app state to detect when user returns from Shortcuts app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', appState, '->', nextAppState);
      
      // User came back to the app from background
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // They likely just added the shortcut, show success screen
        console.log('User returned to app - assuming shortcut was added');
        setCurrentStep(3);
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Step 1: Introduction Screen
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerContainer}>
        <Image
          source={Images.Premium}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <CustomText.LargeBoldText customStyle={styles.headerTitle}>
          Set up Siri
        </CustomText.LargeBoldText>
      </View>

      <CustomText.RegularText customStyle={styles.description}>
        Add a Siri Shortcut so you can arm the bodycam with a single phrase from the lock screen.
      </CustomText.RegularText>

      <View style={styles.imageContainer}>
        <Image
          source={Images.BodyCamPerson}
          style={styles.demoImage}
          resizeMode="cover"
        />
        <View style={styles.siriOverlay}>
          <CustomText.RegularText customStyle={styles.siriText}>
            Hey Siri, arm Bodycam
          </CustomText.RegularText>
        </View>
      </View>

      <View style={styles.tipsContainer}>
        <CustomText.MediumText customStyle={styles.tipsTitle}>
          Quick tip:
        </CustomText.MediumText>
        
        <View style={styles.tipRow}>
          <CustomText.RegularText customStyle={styles.bulletPoint}>
            •
          </CustomText.RegularText>
          <CustomText.RegularText customStyle={styles.tipText}>
            Listen for Siri 'on'
          </CustomText.RegularText>
        </View>

        <View style={styles.tipRow}>
          <CustomText.RegularText customStyle={styles.bulletPoint}>
            •
          </CustomText.RegularText>
          <CustomText.RegularText customStyle={styles.tipText}>
            Allow Siri when locked 'on'
          </CustomText.RegularText>
        </View>
      </View>

      <PrimaryButton
        title="Add 'arm bodycam' to Siri"
        onPress={handleAddShortcut}
        customStyles={styles.primaryButton}
      />
    </View>
  );

  // Step 3: Success Screen
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successHeader}>
        <CustomText.LargeBoldText customStyle={styles.successTitle}>
          Success!
        </CustomText.LargeBoldText>
        <CustomText.RegularText customStyle={styles.successEmoji}>
          👍
        </CustomText.RegularText>
      </View>

      <CustomText.RegularText customStyle={styles.successDescription}>
        You can now arm your bodycam by saying:
      </CustomText.RegularText>

      <View style={styles.siriPhraseContainer}>
        <CustomText.LargeBoldText customStyle={styles.siriPhrase}>
          "Hey Siri, arm Bodycam"
        </CustomText.LargeBoldText>
      </View>

      <CustomText.RegularText customStyle={styles.successDescription}>
        If you're threatened, Rove goes live{' '}
        <CustomText.RegularText customStyle={styles.instantText}>
          instantly.
        </CustomText.RegularText>
      </CustomText.RegularText>

      <CustomText.RegularText customStyle={styles.armingInfo}>
        Arming lasts for 30 minutes{'\n'}(adjustable in settings)
      </CustomText.RegularText>

      <PrimaryButton
        title="Done"
        onPress={() => {
          NavigationService.goBack();
        }}
        customStyles={styles.doneButton}
      />
    </View>
  );

  // Handle adding shortcut
  const handleAddShortcut = async () => {
    try {
      console.log('🎯 Opening shortcut URL...');
      
      const shortcutURL = 'https://www.icloud.com/shortcuts/0de1e5cc227d4713a4a9c0afe2bea4b5';
      
      const canOpen = await Linking.canOpenURL(shortcutURL);
      
      if (canOpen) {
        console.log('✅ Opening iOS Shortcuts app...');
        await Linking.openURL(shortcutURL);
        
        // Note: The shortcut won't run immediately!
        // It only runs when user says "Hey Siri, arm bodycam"
        // The success screen will show when user returns to the app (handled by AppState listener)
        
      } else {
        Alert.alert(
          'Error',
          'Could not open shortcut. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error opening shortcut:', error);
      Alert.alert('Error', 'Failed to open Siri setup');
    }
  };

  return (
    <MainContainer customeStyle={styles.container}>
      {currentStep === 1 && renderStep1()}
      {currentStep === 3 && renderStep3()}
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Metrix.HorizontalSize(20),
  },
  stepContainer: {
    flex: 1,
    paddingTop: Metrix.VerticalSize(40),
  },
  
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(20),
  },
  headerIcon: {
    width: Metrix.HorizontalSize(32),
    height: Metrix.VerticalSize(32),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginRight: Metrix.HorizontalSize(10),
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(24),
    fontWeight: 'bold',
  },
  
  description: {
    fontSize: Metrix.customFontSize(16),
    lineHeight: 24,
    marginBottom: Metrix.VerticalSize(30),
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: Metrix.VerticalSize(200),
    marginBottom: Metrix.VerticalSize(30),
    borderRadius: Metrix.HorizontalSize(12),
    overflow: 'hidden',
  },
  demoImage: {
    width: '100%',
    height: '100%',
  },
  siriOverlay: {
    position: 'absolute',
    bottom: Metrix.VerticalSize(20),
    right: Metrix.HorizontalSize(20),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Metrix.HorizontalSize(16),
    paddingVertical: Metrix.VerticalSize(8),
    borderRadius: Metrix.HorizontalSize(20),
  },
  siriText: {
    color: '#FFFFFF',
    fontSize: Metrix.customFontSize(14),
    fontStyle: 'italic',
  },
  
  tipsContainer: {
    marginBottom: Metrix.VerticalSize(40),
  },
  tipsTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
    marginBottom: Metrix.VerticalSize(12),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Metrix.VerticalSize(8),
  },
  bulletPoint: {
    fontSize: Metrix.customFontSize(16),
    marginRight: Metrix.HorizontalSize(8),
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  tipText: {
    fontSize: Metrix.customFontSize(16),
    flex: 1,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  
  primaryButton: {
    borderRadius: Metrix.HorizontalSize(12),
    marginTop: 'auto',
    marginBottom: Metrix.VerticalSize(40),
  },
  
  // Success Screen
  successHeader: {
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(30),
  },
  successTitle: {
    fontSize: Metrix.customFontSize(32),
    fontWeight: 'bold',
    marginBottom: Metrix.VerticalSize(10),
  },
  successEmoji: {
    fontSize: Metrix.customFontSize(48),
  },
  successDescription: {
    fontSize: Metrix.customFontSize(16),
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Metrix.VerticalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
  },
  siriPhraseContainer: {
    backgroundColor: 'rgba(87, 181, 250, 0.1)',
    borderRadius: Metrix.HorizontalSize(12),
    paddingVertical: Metrix.VerticalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
    marginBottom: Metrix.VerticalSize(30),
    alignItems: 'center',
  },
  siriPhrase: {
    fontSize: Metrix.customFontSize(20),
    color: '#57b5fa',
    textAlign: 'center',
  },
  instantText: {
    color: '#57b5fa',
    fontWeight: '600',
  },
  armingInfo: {
    fontSize: Metrix.customFontSize(16),
    textAlign: 'center',
    color: Utills.selectedThemeColors().SecondaryTextColor,
    marginBottom: Metrix.VerticalSize(40),
  },
  doneButton: {
    borderRadius: Metrix.HorizontalSize(12),
    marginTop: 'auto',
    marginBottom: Metrix.VerticalSize(40),
  },
});