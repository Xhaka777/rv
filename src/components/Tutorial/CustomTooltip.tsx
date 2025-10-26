// src/components/Tutorial/CustomTooltip.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useCopilot } from 'react-native-copilot';
import { useDispatch, useSelector } from 'react-redux';
import { CustomText } from '../Text';
import { Images, Metrix, NavigationService, RouteNames, Utills } from '../../config';
import { HomeActions } from '../../redux/actions';
import { RootState } from '../../redux/reducers';
import { COPILOT_TUTORIAL_STEPS } from '../../config/tutorialSteps';

const { width: screenWidth } = Dimensions.get('window');

interface CustomTooltipProps {
  currentStep?: any;
  copilot?: any;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ currentStep, copilot }) => {
  const { isFirstStep, isLastStep, goToNext, stop } = useCopilot();
  const dispatch = useDispatch();
  
  const currentTutorialStep = useSelector((state: RootState) => state.home.currentTutorialStep);
  const tutorialCompleted = useSelector((state: RootState) => state.home.tutorialCompleted);
  
  // Get current step details from our config
  const stepDetails = COPILOT_TUTORIAL_STEPS[currentTutorialStep];
  
  const handleNext = () => {
    const stepName = currentStep?.name || stepDetails?.element;
    
    switch (stepName) {
      case 'settings-tab':
        // Navigate to Settings and continue tutorial
        NavigationService.navigate(RouteNames.HomeRoutes.Settings);
        dispatch(HomeActions.setTutorialStep(3));
        break;
        
      case 'responders-item':
        // Navigate to TrustedContacts
        NavigationService.navigate(RouteNames.HomeRoutes.TrustedContacts);
        dispatch(HomeActions.setTutorialStep(4));
        break;
        
      case 'add-contact-button':
        // User should add a contact, move to success message
        NavigationService.navigate(RouteNames.HomeRoutes.AddContacts);
        dispatch(HomeActions.setTutorialStep(5));
        break;
        
      case 'success-message':
        // Move to test stream button
        dispatch(HomeActions.setTutorialStep(6));
        break;
        
      case 'test-stream-button':
        // Navigate back to LiveStream for final step
        NavigationService.navigate(RouteNames.HomeRoutes.LiveStream);
        dispatch(HomeActions.setTutorialStep(7));
        break;
        
      case 'livestream-button':
        // Complete tutorial
        dispatch(HomeActions.setTutorialCompleted(true));
        dispatch(HomeActions.setTutorialActive(false));
        stop();
        break;
        
      default:
        // Default behavior - just go to next step
        dispatch(HomeActions.setTutorialStep(currentTutorialStep + 1));
        break;
    }
    
    // Always call goToNext to move copilot forward
    goToNext();
  };

  const handleSkip = () => {
    dispatch(HomeActions.setTutorialCompleted(true));
    dispatch(HomeActions.setTutorialActive(false));
    stop();
  };

  const handlePrevious = () => {
    if (currentTutorialStep > 1) {
      dispatch(HomeActions.setTutorialStep(currentTutorialStep - 1));
    }
  };

  // Calculate progress
  const progress = currentTutorialStep / Object.keys(COPILOT_TUTORIAL_STEPS).length;
  const progressWidth = progress * (screenWidth - 120); // Account for button width

  // Get button text based on step
  const getButtonText = () => {
    if (stepDetails?.action === 'complete' || isLastStep) {
      return 'Get Started';
    }
    if (stepDetails?.action === 'navigate') {
      return 'Guide Me';
    }
    return 'Next';
  };

  return (
    <View style={styles.container}>
      {/* Custom tooltip background */}
      <View style={styles.tooltipContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={Images.Premium}
              style={styles.premiumIcon}
              resizeMode="contain"
            />
            <CustomText.LargeSemiBoldText customStyle={styles.title}>
              {stepDetails?.title || 'Tutorial'}
            </CustomText.LargeSemiBoldText>
          </View>
          <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
            <Image
              source={Images.Cross}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Separator Line */}
        <View style={styles.separator} />

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <CustomText.RegularText customStyle={styles.description}>
            {stepDetails?.description || 'Follow the tutorial to learn how to use Rove.'}
          </CustomText.RegularText>
        </View>

        {/* Progress Bar and Navigation */}
        <View style={styles.bottomContainer}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth,
                  },
                ]}
              />
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {!isFirstStep && (
              <TouchableOpacity onPress={handlePrevious} style={styles.backButton}>
                <CustomText.RegularText customStyle={styles.backButtonText}>
                  Back
                </CustomText.RegularText>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <CustomText.MediumText customStyle={styles.nextText}>
                {getButtonText()}
              </CustomText.MediumText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tooltip pointer/arrow */}
      <View style={styles.tooltipArrow} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: Utills.selectedThemeColors().Base,
    borderRadius: Metrix.HorizontalSize(16),
    padding: Metrix.HorizontalSize(20),
    width: screenWidth - 40,
    maxWidth: Metrix.HorizontalSize(340),
    ...Metrix.createShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Metrix.VerticalSize(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
    tintColor: Utills.selectedThemeColors().TertiaryTextColor,
    marginRight: Metrix.HorizontalSize(8),
  },
  title: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: Metrix.HorizontalSize(4),
  },
  closeIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().SecondaryTextColor,
  },
  separator: {
    height: 1,
    backgroundColor: Utills.selectedThemeColors().TextInputBorderColor,
    marginBottom: Metrix.VerticalSize(20),
  },
  descriptionContainer: {
    marginBottom: Metrix.VerticalSize(24),
  },
  description: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomContainer: {
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: Metrix.VerticalSize(16),
  },
  progressBackground: {
    height: Metrix.VerticalSize(4),
    backgroundColor: Utills.selectedThemeColors().TextInputBorderColor,
    borderRadius: Metrix.HorizontalSize(2),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: Metrix.HorizontalSize(2),
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    paddingVertical: Metrix.VerticalSize(12),
    paddingHorizontal: Metrix.HorizontalSize(20),
  },
  backButtonText: {
    color: Utills.selectedThemeColors().SecondaryTextColor,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    paddingVertical: Metrix.VerticalSize(12),
    paddingHorizontal: Metrix.HorizontalSize(24),
    borderRadius: Metrix.HorizontalSize(8),
  },
  nextText: {
    color: Utills.selectedThemeColors().Base,
    fontWeight: '600',
    fontSize: Metrix.customFontSize(16),
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Utills.selectedThemeColors().Base,
    marginTop: -1,
  },
});