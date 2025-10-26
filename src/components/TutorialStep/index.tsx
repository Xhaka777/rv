import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
// import { BlurView } from 'expo-blur';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  highlightTab?: 'home' | 'tutorials' | 'profile' | 'settings';
}

interface TutorialOverlayProps {
  visible: boolean;
  steps: TutorialStep[];
  onClose: () => void;
  onComplete: () => void;
  onHighlightTab?: (tab: string | null) => void;
  onStepChange?: (stepIndex: number) => void;
}

export default function TutorialOverlay({
  visible,
  steps,
  onClose,
  onComplete,
  onHighlightTab,
  onStepChange,
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    // Handle tab highlighting
    if (visible && steps[currentStep]?.highlightTab) {
      onHighlightTab?.(steps[currentStep].highlightTab!);
    } else if (!visible) {
      onHighlightTab?.(null);
    }
  }, [visible, currentStep, fadeAnim, onHighlightTab, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
      setCurrentStep(0);
    });
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setCurrentStep(0);
    });
  };

  if (!visible || steps.length === 0) return null;

  const currentStepData = steps[currentStep];

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.blurContainer}>
          <View style={styles.container}>
            {/* Spotlight effect for target element */}
            {currentStepData.targetPosition && (
              <View
                style={[
                  styles.spotlight,
                  {
                    left: currentStepData.targetPosition.x - 10,
                    top: currentStepData.targetPosition.y - 10,
                    width: currentStepData.targetPosition.width + 20,
                    height: currentStepData.targetPosition.height + 20,
                  },
                ]}
              />
            )}

            {/* Tutorial Card */}
            <View style={styles.tutorialCard}>
              <View style={styles.header}>
                <View style={styles.stepIndicator}>
                  <Text style={styles.stepText}>
                    {currentStep + 1} of {steps.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{currentStepData.title}</Text>
              <Text style={styles.description}>{currentStepData.description}</Text>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  style={[
                    styles.navButton,
                    styles.previousButton,
                    currentStep === 0 && styles.disabledButton,
                  ]}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft size={20} color={currentStep === 0 ? '#9CA3AF' : '#6B7280'} />
                  <Text
                    style={[
                      styles.navButtonText,
                      currentStep === 0 && styles.disabledText,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                  <Text style={styles.nextButtonText}>
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  </Text>
                  {currentStep < steps.length - 1 && (
                    <ChevronRight size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= currentStep && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  blurContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  tutorialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  previousButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    backgroundColor: '#3B82F6',
  },
});