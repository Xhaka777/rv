import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, StatusBar, SafeAreaView, Animated, Dimensions } from 'react-native';
import { X, Check, Zap } from 'lucide-react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { Images, Metrix, Utills } from '../../config';
import { CustomText } from '..';

const { height: screenHeight } = Dimensions.get('window');

interface CameraScreenProps {
  onPhotoApproved: (photoUri: string) => void;
  onClose: () => void;
  onSkip: () => void;
  visible: boolean;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ onPhotoApproved, onClose, onSkip, visible }) => {
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.back;
  const isFocused = useIsFocused();

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  const [cameraPosition, setCameraPosition] = useState('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto' | undefined>('off');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [currentMode, setCurrentMode] = useState('PHOTO');
  const [showApprovalSheet, setShowApprovalSheet] = useState(false);
  const [zoom, setZoom] = useState(0); // 0 for 0.5x, 1 for 1x
  const [isCapturing, setIsCapturing] = useState(false); // Add this state

  // Animation values for capture button (same as LiveStream)
  const sizeAnim = useRef(new Animated.Value(70)).current;
  const borderRadiusAnim = useRef(new Animated.Value(50)).current;
  const [isCircle, setIsCircle] = useState(true);

  useEffect(() => {
    if (visible) {
      // Slide up animation when showing
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset position when hidden
      slideAnim.setValue(screenHeight);
    }
  }, [visible, slideAnim]);

  const slideDownAndClose = useCallback((callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      callback();
    });
  }, [slideAnim]);

  // Request camera permissions on mount
  useEffect(() => {
    if (visible) {
      const requestPermissions = async () => {
        try {
          const cameraPermission = await Camera.requestCameraPermission();
          const microphonePermission = await Camera.requestMicrophonePermission();

          if (cameraPermission !== 'authorized' || microphonePermission !== 'authorized') {
            Alert.alert('Permission denied', 'Camera and microphone permissions are required');
          }
        } catch (error) {
          console.error('Error requesting permissions:', error);
        }
      };

      requestPermissions();
    }
  }, [visible]);

  // FIXED: Safer toggleShape function with error handling
  const toggleShape = useCallback(() => {
    try {
      if (isCircle) {
        Animated.parallel([
          Animated.timing(sizeAnim, {
            toValue: 30,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(borderRadiusAnim, {
            toValue: 7,
            duration: 600,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        // Animate from square to circle
        Animated.parallel([
          Animated.timing(sizeAnim, {
            toValue: 70,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(borderRadiusAnim, {
            toValue: 50,
            duration: 600,
            useNativeDriver: false,
          }),
        ]).start();
      }

      setIsCircle(!isCircle);
    } catch (error) {
      console.error('Error in toggleShape:', error);
      // Don't throw error, just log it
    }
  }, [isCircle, sizeAnim, borderRadiusAnim]);

  const toggleFlash = () => {
    console.log('Flash toggled from:', flash);
    setFlash(flash === 'off' ? 'on' : 'off');
  };

  // FIXED: Enhanced handleCapturePress with better error handling
  const handleCapturePress = useCallback(async () => {
    // Prevent multiple captures
    if (isCapturing) {
      console.log('Already capturing, ignoring press');
      return;
    }

    try {
      setIsCapturing(true);
      console.log('🔄 Starting photo capture...');
      
      if (!camera.current) {
        throw new Error('Camera reference is not available');
      }

      if (!device) {
        throw new Error('Camera device is not available');
      }

      // FIXED: Separate animation from photo capture
      console.log('🎬 Starting button animation...');
      toggleShape();

      console.log('📸 Taking photo with camera...');
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: flash === 'on' ? 'on' : 'off', // Ensure valid flash value
        enableShutterSound: false, // Optional: disable shutter sound
      });

      console.log('✅ Photo captured successfully:', photo.path);
      setCapturedPhoto(photo);
      setShowApprovalSheet(true);

    } catch (error) {
      console.error('❌ Error in handleCapturePress:', error);
      
      // More specific error messages
      let errorMessage = 'Something went wrong while taking the photo';
      
      if (error.message) {
        if (error.message.includes('Camera is not ready')) {
          errorMessage = 'Camera is not ready. Please wait a moment and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Camera permission is required to take photos.';
        } else if (error.message.includes('device')) {
          errorMessage = 'Camera device is not available. Please check your camera.';
        }
      }
      
      Alert.alert('Capture failed', errorMessage);
    } finally {
      setIsCapturing(false);
    }
  }, [camera, flash, toggleShape, device, isCapturing]);

  const handleTryAgain = () => {
    setCapturedPhoto(null);
    setShowApprovalSheet(false);
    setIsCircle(true); // Reset button state
  };

  const handleApprove = () => {
    if (capturedPhoto) {
      onPhotoApproved(`file://${capturedPhoto.path}`);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleSkipPress = () => {
    onSkip();
  }

  const handleClosePress = () => {
    slideDownAndClose(() => {
      onClose();
    });
  };

  const modes = ['PHOTO'];

  if (!visible) {
    return null;
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <Text style={styles.errorText}>No camera device available</Text>
        <TouchableOpacity style={styles.closeButtonCenter} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showApprovalSheet && capturedPhoto) {
    return (
      <Animated.View style={[styles.approvalContainer, { transform: [{ translateY: slideAnim }] }]}>
        <StatusBar hidden={true} />
        <SafeAreaView style={styles.approvalSafeArea}>
          <View style={styles.approvalHeader}>
            <View style={styles.approvalHeaderContent}>
              <Text style={styles.approvalTitle}>Preview</Text>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipPress}
              >
                <Text style={styles.skipText}>Skip →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: `file://${capturedPhoto.path}` }} style={styles.photoPreview} />
          </View>

          <View style={styles.approvalButtonsContainer}>
            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={handleTryAgain}
            >
              <X size={24} color='#666' />
              <Text style={styles.tryAgainButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={handleApprove}
            >
              <Check size={24} color='#fff' />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraContainer}>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={visible && isFocused && !showApprovalSheet} // FIXED: Don't keep camera active during approval
            photo={true}
            video={false} // FIXED: Set to false since we're only taking photos
            audio={false} // FIXED: Set to false since we don't need audio for photos
            zoom={zoom === 0 ? 0.5 : 1}
            torch={flash === 'on' ? 'on' : 'off'}
          />
          
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={toggleFlash}
            >
              <Image
                source={flash === 'on' ? Images.FlashOn : Images.FlashOff}
                style={styles.flashIcon}
              />
            </TouchableOpacity>

            <Text style={styles.approvalTitle}>Add photo</Text>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipPress}
            >
              <Text style={styles.skipText}>Skip →</Text>
            </TouchableOpacity>
          </View>

          {/* Zoom Controls - Positioned above capture button */}
          <View style={styles.zoomContainer}>
            <TouchableOpacity
              style={[
                styles.zoomButton,
                zoom === 0 && styles.activeZoomButton
              ]}
              onPress={() => handleZoomChange(0)}
            >
              <Text style={[
                styles.zoomText,
                zoom === 0 && styles.zoomTextActive
              ]}>0.5×</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.zoomButton,
                zoom === 1 && styles.activeZoomButton
              ]}
              onPress={() => handleZoomChange(1)}
            >
              <Text style={[
                styles.zoomText,
                zoom === 1 && styles.zoomTextActive
              ]}>1×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modeText}>
            PHOTO
          </Text>

          {/* Bottom Controls - LiveStream Style */}
          <View style={styles.bottomControls}>
            {/* Capture Button - Same as LiveStream */}
            <TouchableOpacity
              onPress={handleCapturePress}
              style={[
                styles.liveStreamButton,
                isCapturing && styles.capturingButton // Optional: visual feedback during capture
              ]}
              disabled={isCapturing} // Prevent multiple presses
            >
              <Animated.View
                style={[
                  styles.innerLiveStreamButton,
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: sizeAnim,
                    height: sizeAnim,
                    borderRadius: borderRadiusAnim,
                    borderColor: isCircle
                      ? Utills.selectedThemeColors().Base
                      : Utills.selectedThemeColors().Transparent,
                  },
                ]}
              >
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    zIndex: 9999,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  closeButtonCenter: {
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  flashButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fff',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
    marginLeft: 50,
  },
  skipButton: {
    backgroundColor: '#6b6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  zoomContainer: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '20%',
    alignItems: 'center',
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 2,
  },
  zoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 100,
    width: 27,
    height: 27,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeZoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 100,
    width: 40,
    height: 39,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  zoomTextActive: {
    color: '#FDD128',
    fontWeight: '700',
  },
  modeText: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginLeft: Metrix.HorizontalSize(8)
  },
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  liveStreamButton: {
    marginTop: Metrix.VerticalSize(10),
    alignSelf: 'center',
    width: Metrix.HorizontalSize(72),
    height: Metrix.HorizontalSize(72),
    borderRadius: Metrix.VerticalSize(100),
    backgroundColor: Utills.selectedThemeColors().Transparent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginLeft: Metrix.HorizontalSize(8)
  },
  capturingButton: {
    opacity: 0.7, // Visual feedback during capture
  },
  innerLiveStreamButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturingText: {
    fontSize: 24,
  },
  // Approval Sheet Styles
  approvalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  approvalSafeArea: {
    flex: 1,
  },
  approvalHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  approvalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFD700',
    flex: 1,
    textAlign: 'center',
    marginLeft: 60,
  },
  photoPreviewContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
  },
  approvalButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 16,
  },
  tryAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#4ade80',
    gap: 8,
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CameraScreen;