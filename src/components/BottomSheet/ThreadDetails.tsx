import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Dimensions, Share } from 'react-native'; import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
// import { GOOGLE_API_KEY } from '../../services/config';
import Geocoder from 'react-native-geocoding';
import { HomeAPIS } from '../../services/home';
import ImagePicker from 'react-native-image-crop-picker';
import { Camera, Plus, Share as ShareIcon, Trash2, X } from 'lucide-react-native';
import base64 from 'base-64';


const { width: screenWidth } = Dimensions.get('window');

// Geocoder.init(GOOGLE_API_KEY);

interface ImageItem {
  id: string;
  uri: string;
}

interface ThreatDetails {
  id: string;
  icon: any;
  label: string;
  streetName: string;
  image?: string;
  timestamp: string;
  description?: string;
  latitude: number;
  longitude: number;
  user: string;
  created_at?: string;
  // 
  ai_classification?: string;
  ai_confidence?: number;
  classification_details?: string;
  is_automated?: boolean;
}

interface ThreatDetailsBottomSheetProps {
  threatDetails: ThreatDetails | null;
  onClose: () => void;
  onChange: (index: number) => void;
  onConfirm?: (threatId: string) => void;
  onDeny?: (threatId: string) => void;
  onImageAdded?: (threatId: string, newImageUrl: string) => void;
  isOwnThreat?: boolean;
  onDelete?: (threatId: string) => void;
  userCoordinates?: { latitude: number; longitude: number };
  currentUserId?: string; // Add current user ID prop
}

type ConfirmationStatus = 'unconfirmed' | 'confirmed' | 'denied' | 'loading';

const SECRET_KEY = 'xhaka';

const encryptCoordinatesBase64 = (lat, lng) => {
  const data = `${lat}&${lng}`;
  const obfuscated = SECRET_KEY + data + SECRET_KEY.split('').reverse().join('');

  return base64.encode(obfuscated)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding for shorter URLs
};


const ThreatDetailsBottomSheet = forwardRef<BottomSheet, ThreatDetailsBottomSheetProps>(
  ({
    threatDetails,
    onClose,
    onChange,
    onConfirm,
    onDeny,
    onImageAdded,
    onDelete,
    isOwnThreat = false,
    userCoordinates,
    currentUserId
  }, ref) => {
    const snapPoints = useMemo(() => ['65%'], []);
    const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus>('unconfirmed');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [modalOpenTime, setModalOpenTime] = useState<Date | null>(null);

    console.log('threatDetails', threatDetails);
    console.log('currentUserId', currentUserId);
    console.log('threat user ID', threatDetails?.user);

    const getThreatTypeName = (label: string) => {
      const threatTypes = {
        'harassment': 'Harassment',
        'followed': 'Being Followed',
        'fight': 'Fight',
        'stabbing': 'Stabbing',
        'shooting': 'Shooting',
        'mass_event': 'Major Event',
        'automated_alert': 'Stream Alert',
        'general': 'General Threat'
      };

      return threatTypes[label] || label.charAt(0).toUpperCase() + label.slice(1);
    };

    // Check if threat belongs to current user
    const isUserOwnThreat = useCallback(() => {
      if (!threatDetails || !currentUserId) return false;
      return threatDetails.user === currentUserId;
    }, [threatDetails, currentUserId]);

    // Calculate time since threat creation (using created_at if available, fallback to timestamp)
    const calculateTimeSinceCreation = useCallback(() => {
      if (!threatDetails) return Infinity;

      const creationTime = threatDetails.created_at || threatDetails.timestamp;
      if (!creationTime) return Infinity;

      const now = new Date();
      const threatTime = new Date(creationTime);
      const timeDiff = now.getTime() - threatTime.getTime();

      return timeDiff; // Returns milliseconds since creation
    }, [threatDetails]);

    // Check if within 5 minute window
    const isWithin5Minutes = useCallback(() => {
      const timeSinceCreation = calculateTimeSinceCreation();
      const fiveMinutesInMs = 5 * 60 * 1000;
      return timeSinceCreation <= fiveMinutesInMs;
    }, [calculateTimeSinceCreation]);

    // Calculate remaining time for deletion
    const calculateTimeRemaining = useCallback(() => {
      const timeSinceCreation = calculateTimeSinceCreation();
      const fiveMinutesInMs = 5 * 60 * 1000;

      return Math.max(0, fiveMinutesInMs - timeSinceCreation);
    }, [calculateTimeSinceCreation]);

    useEffect(() => {
      if (!threatDetails) {
        setShowDeleteButton(false);
        setModalOpenTime(null);
        setTimeRemaining(0);
        return;
      }

      const isOwnThreat = isUserOwnThreat();
      const withinTimeLimit = isWithin5Minutes();

      console.log('Delete button check:', {
        isOwnThreat,
        withinTimeLimit,
        timeSinceCreation: calculateTimeSinceCreation(),
        threatUser: threatDetails.user,
        currentUser: currentUserId
      });

      if (isOwnThreat && withinTimeLimit) {
        setModalOpenTime(new Date());
        setShowDeleteButton(true);
        setTimeRemaining(calculateTimeRemaining());

        // Update countdown every second
        const interval = setInterval(() => {
          const remaining = calculateTimeRemaining();
          setTimeRemaining(remaining);

          if (remaining <= 0) {
            setShowDeleteButton(false);
            clearInterval(interval);
          }
        }, 1000);

        return () => clearInterval(interval);
      } else {
        setShowDeleteButton(false);
        setTimeRemaining(0);
      }
    }, [threatDetails, isUserOwnThreat, isWithin5Minutes, calculateTimeRemaining]);

    const handleDelete = () => {
      if (!threatDetails) return;

      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);

      Alert.alert(
        'Delete Threat Report',
        `Are you sure you want to delete this threat report?\n\nDelete option expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Call your delete API here if you have one
                await HomeAPIS.deleteThreatReport(threatDetails.id);

                onDelete?.(threatDetails.id);
                onClose();

                Alert.alert(
                  'Deleted',
                  'Threat report has been deleted successfully.',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Error deleting threat report:', error);
                Alert.alert('Error', 'Failed to delete threat report. Please try again.');
              }
            }
          },
        ]
      );
    };

    const handleShare = async () => {
      if (!threatDetails) return;

      try {
        const threatTypeName = getThreatTypeName(threatDetails.label);

        // Format date and time
        const date = new Date(threatDetails.timestamp);
        const dateOptions: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        };

        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        const formattedDate = date.toLocaleDateString('en-GB', dateOptions);
        const formattedTime = date.toLocaleTimeString('en-GB', timeOptions);

        // Get timezone abbreviation with fallback
        let tzAbbr = 'UTC';
        try {
          const tzString = date.toLocaleTimeString('en-US', { timeZoneName: 'short' });
          const parts = tzString.split(' ');
          tzAbbr = parts[parts.length - 1] || 'UTC';
        } catch (e) {
          console.error('Error getting timezone:', e);
        }

        // Generate encrypted URL with specific threat coordinates
        const encrypted = encryptCoordinatesBase64(
          threatDetails.latitude,
          threatDetails.longitude
        );
        console.log('threatDetails.latitude', threatDetails.latitude)
        console.log('threatDetails.longitude', threatDetails.longitude)
        console.log('encrypted', encrypted)

        const threatUrl = `https://map.rovesafe.com/${encrypted}`;

        // Format the share message with Unicode bold text
        const shareMessage = `${threatTypeName} 𝗔𝗹𝗲𝗿𝘁\n` +
          `${formattedDate}, ${formattedTime} (${tzAbbr})\n` +
          `𝗪𝗵𝗲𝗿𝗲: View this threat - ${threatUrl}\n` +
          `𝗪𝗵𝗮𝘁: ${threatDetails.description || `${threatTypeName} reported in the area.`}\n` +
          `𝗔𝗱𝘃𝗶𝗰𝗲: Avoid the area if possible. Stay aware, follow local guidance, and check the map for updates.\n` +
          `𝗦𝘁𝗮𝘁𝘂𝘀: Community report - not yet verified.`;

        // Share with the encrypted URL
        const result = await Share.share(
          {
            message: shareMessage,
          },
          {
            dialogTitle: `${threatTypeName} Alert`,
          }
        );

        // Handle the result
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log(`Shared via: ${result.activityType}`);
          } else {
            console.log('Shared successfully');
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('Share modal was dismissed');
        }

      } catch (error) {
        console.error('Error sharing threat report:', error);
        Alert.alert('Error', 'Unable to share threat report. Please try again.');
      }
    };

    const fetchUserVoteStatus = useCallback(async (threatId: string) => {
      try {
        setIsLoadingVoteStatus(true);

        if (threatDetails?.is_automated) {
          setConfirmationStatus('confirmed'); // Always confirmed for automated
          setIsLoadingVoteStatus(false);
          return;
        }

        const response = await HomeAPIS.getThreatReports();

        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          const threatReport = response.data.results.find((report: any) => report.id === threatId);

          if (threatReport) {
            if (threatReport.user_vote === null) {
              setConfirmationStatus('unconfirmed');
            } else if (threatReport.user_vote === 'confirm') {
              setConfirmationStatus('confirmed');
            } else if (threatReport.user_vote === 'deny') {
              setConfirmationStatus('denied');
            } else {
              setConfirmationStatus('unconfirmed');
            }
          } else {
            setConfirmationStatus('unconfirmed');
          }
        }
      } catch (error) {
        console.error('Error fetching user vote status:', error);
        setConfirmationStatus('unconfirmed');
      } finally {
        setIsLoadingVoteStatus(false);
      }
    }, [threatDetails]);

    useEffect(() => {
      if (!threatDetails) return;

      setConfirmationStatus('unconfirmed');
      fetchUserVoteStatus(threatDetails.id);

      if (threatDetails.image) {
        setImages([{
          id: 'original',
          uri: threatDetails.image
        }]);
      } else {
        setImages([]);
      }

    }, [threatDetails, fetchUserVoteStatus]);

    const formatTimestamp = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleAddImage = () => {
      if (!threatDetails) return;

      // Directly open the image picker without showing an alert
      selectImageFromLibrary();
    };

    // Keep your existing selectImageFromLibrary function as is
    const selectImageFromLibrary = () => {
      ImagePicker.openPicker({
        cropping: false, // No cropping - keep original aspect ratio
        mediaType: 'photo',
        compressImageQuality: 0.8,
        maxWidth: 1920, // Reasonable max width
        maxHeight: 1920, // Reasonable max height
        includeBase64: false,
        includeExif: false,
      }).then(image => {
        if (image && image.path) {
          const newImage: ImageItem = {
            id: Date.now().toString(),
            uri: image.path,
          };

          if (images.length === 0) {
            setImages([newImage]);
          } else {
            setImages(prevImages => [...prevImages, newImage]);
          }

          uploadAdditionalImage(image.path);
        }
      }).catch(error => {
        if (error.code !== 'E_PICKER_CANCELLED') {
          Alert.alert('Error', 'Failed to pick image');
        }
      });
    };

    const removeImage = (imageId: string) => {
      if (imageId === 'original') {
        Alert.alert(
          'Cannot Remove',
          'Cannot remove the original threat image',
          [{ text: 'OK' }]
        );
        return;
      }

      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    };

    const uploadAdditionalImage = async (imageUri: string) => {
      if (!threatDetails) return;

      try {
        setIsUploadingImage(true);

        const formData = new FormData();
        formData.append('photo', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `additional_image_${Date.now()}.jpg`,
        } as any);

        Alert.alert(
          'Success',
          'Additional image has been added to the threat report.',
          [{ text: 'OK' }]
        );

      } catch (error) {
        console.error('Error uploading additional image:', error);

        setImages(prevImages => prevImages.filter(img => img.uri !== imageUri));

        Alert.alert(
          'Error',
          'Failed to upload additional image. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsUploadingImage(false);
      }
    };

    const renderImageLayout = () => {
      // Always show add photo card alongside existing images
      const showAddPhotoCard = true;

      if (images.length === 0) {
        return (
          <View style={styles.singleImageContainer}>
            <TouchableOpacity style={styles.addPhotoCard} onPress={handleAddImage}>
              <View style={styles.addPhotoIcon}>
                <Camera size={20} color='#fff' />
              </View>
              <Text style={styles.addPhotoText}>Add a photo</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (images.length === 1) {
        return (
          <View style={styles.twoImagesContainer}>
            <View style={styles.mainImageContainer}>
              <Image source={{ uri: images[0].uri }} style={styles.mainImage} />
              {images[0].id !== 'original' && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(images[0].id)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sideImageContainer}>
              <TouchableOpacity style={styles.addPhotoCard} onPress={handleAddImage}>
                <View style={styles.addPhotoIcon}>
                  <Camera size={20} color='#fff' />
                </View>
                <Text style={styles.addPhotoTextSmall}>Add a photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (images.length === 2) {
        return (
          <View style={styles.multipleImagesContainer}>
            <View style={styles.mainImageContainer}>
              <Image source={{ uri: images[0].uri }} style={styles.mainImage} />
              {images[0].id !== 'original' && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(images[0].id)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sideImagesContainer}>
              <View style={styles.sideImageWrapper}>
                <Image source={{ uri: images[1].uri }} style={styles.sideImage} />
                {images[1].id !== 'original' && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(images[1].id)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.addPhotoCardSmall} onPress={handleAddImage}>
                <View style={styles.addPhotoIconSmall}>
                  <Camera size={20} color='#fff' />
                </View>
                <Text style={styles.addPhotoTextTiny}>Add photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      // For 3+ images, show main image, one side image, and add photo card
      const mainImage = images[0];
      const sideImage = images[1];
      const remainingCount = images.length - 2;

      return (
        <View style={styles.multipleImagesContainer}>
          <View style={styles.mainImageContainer}>
            <Image source={{ uri: mainImage.uri }} style={styles.mainImage} />
            {mainImage.id !== 'original' && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(mainImage.id)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sideImagesContainer}>
            <View style={styles.sideImageWrapper}>
              <Image source={{ uri: sideImage.uri }} style={styles.sideImage} />
              {sideImage.id !== 'original' && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(sideImage.id)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              )}
              {remainingCount > 0 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{remainingCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.addPhotoCardSmall} onPress={handleAddImage}>
              <View style={styles.addPhotoIconSmall}>
                <Camera size={20} color='#fff' />
              </View>
              <Text style={styles.addPhotoTextTiny}>Add photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };
    const handleConfirm = async () => {
      if (!threatDetails) return;

      // Prevent users from voting on their own threats
      if (isUserOwnThreat()) {
        Alert.alert(
          'Cannot Vote',
          'You cannot vote on your own threat report.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        setConfirmationStatus('loading');

        // Prepare complete vote data as expected by API
        const voteData = {
          location: `${threatDetails.latitude}, ${threatDetails.longitude}`,
          latitude: threatDetails.latitude.toString(),
          longitude: threatDetails.longitude.toString(),
          description: threatDetails.description || `${threatDetails.label} reported`,
          report_type: threatDetails.label.toLowerCase(),
          vote: "confirm",
          // Optional AI fields
          ai_classification: threatDetails.ai_classification || "",
          ai_confidence: threatDetails.ai_confidence || 0,
          classification_details: threatDetails.classification_details || ""
        };

        console.log('Sending complete vote data:', JSON.stringify(voteData, null, 2));
        console.log('Threat ID:', threatDetails.id);

        const response = await HomeAPIS.voteThreatReport(threatDetails.id, voteData);

        console.log('Vote confirmed successfully:', response);

        setConfirmationStatus('confirmed');
        onConfirm?.(threatDetails.id);

        Alert.alert(
          'Vote Submitted',
          'Thank you for confirming this threat report.',
          [{ text: 'OK' }]
        );

      } catch (error) {
        console.error('Error confirming threat:', error);
        if (error.response) {
          console.error('Error status:', error.response.status);
          console.error('Error data:', error.response.data);
        }
        setConfirmationStatus('unconfirmed');
        Alert.alert('Error', 'Failed to submit your vote. Please try again.');
      }
    };

    const handleDeny = async () => {
      if (!threatDetails) return;

      // Prevent users from voting on their own threats
      if (isUserOwnThreat()) {
        Alert.alert(
          'Cannot Vote',
          'You cannot vote on your own threat report.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        setConfirmationStatus('loading');

        // Prepare complete vote data as expected by API
        const voteData = {
          location: `${threatDetails.latitude}, ${threatDetails.longitude}`,
          latitude: threatDetails.latitude.toString(),
          longitude: threatDetails.longitude.toString(),
          description: threatDetails.description || `${threatDetails.label} reported`,
          report_type: threatDetails.label.toLowerCase(),
          vote: "deny",
          // Optional AI fields
          ai_classification: threatDetails.ai_classification || "",
          ai_confidence: threatDetails.ai_confidence || 0,
          classification_details: threatDetails.classification_details || ""
        };

        console.log('Sending complete deny vote data:', JSON.stringify(voteData, null, 2));

        const response = await HomeAPIS.voteThreatReport(threatDetails.id, voteData);

        setConfirmationStatus('denied');
        onDeny?.(threatDetails.id);

        Alert.alert(
          'Vote Submitted',
          'Thank you for your feedback on this threat report.',
          [{ text: 'OK' }]
        );

      } catch (error) {
        console.error('Error denying threat:', error);
        if (error.response) {
          console.error('Error status:', error.response.status);
          console.error('Error data:', error.response.data);
        }
        setConfirmationStatus('unconfirmed');
        Alert.alert('Error', 'Failed to submit your vote. Please try again.');
      }
    };


    const getStatusLabel = () => {
      if (isLoadingVoteStatus) {
        return { text: 'Loading...', style: styles.loadingLabel }
      }

      switch (confirmationStatus) {
        case 'confirmed':
          return { text: 'Confirmed', style: styles.confirmedLabel };
        case 'denied':
          return { text: 'Denied', style: styles.deniedLabel };
        case 'loading':
          return { text: 'Voting...', style: styles.loadingLabel };
        default:
          return { text: 'Unconfirmed', style: styles.unconfirmedLabel };
      }
    };

    if (!threatDetails) return null;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        onChange={onChange}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Icon and threat label on same line, positioned left */}
              <View style={styles.threatInfoRow}>
                <View style={styles.threatIconContainer}>
                  <Image
                    source={threatDetails.icon}
                    style={styles.threatIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.threatTypeName}>
                  {getThreatTypeName(threatDetails.label)}
                </Text>
              </View>

              {/* DateTime in separate view below, also positioned left */}
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  {formatTimestamp(threatDetails.timestamp)}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {showDeleteButton && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Trash2 size={18} color='#FF3B30' />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                disabled={isUploadingImage}
              >
                <ShareIcon size={20} color='#333' />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={20} color='#333' />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statusActionRow}>
            <View style={styles.statusLabelContainer}>
              <View style={[styles.statusLabel, getStatusLabel().style]}>
                <Text style={styles.statusLabelText}>{getStatusLabel().text}</Text>
              </View>
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  confirmationStatus === 'confirmed' && styles.activeConfirmButton
                ]}
                onPress={handleConfirm}
                disabled={
                  threatDetails?.is_automated ||
                  confirmationStatus === 'denied' ||
                  confirmationStatus === 'loading' ||
                  isLoadingVoteStatus
                }              >
                <Text style={[
                  styles.confirmButtonEmoji,
                  (confirmationStatus === 'confirmed' || confirmationStatus === 'loading') && styles.activeButtonEmoji
                ]}>
                  ✅
                </Text>
                <Text style={[
                  styles.confirmButtonText,
                  (confirmationStatus === 'confirmed' || confirmationStatus === 'loading') && styles.activeButtonText
                ]}>
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.denyButton,
                  confirmationStatus === 'denied' && styles.activeDenyButton
                ]}
                onPress={handleDeny}
                disabled={
                  threatDetails?.is_automated ||
                  confirmationStatus === 'confirmed' ||
                  confirmationStatus === 'denied' ||
                  confirmationStatus === 'loading' ||
                  isLoadingVoteStatus
                }              >
                <Text style={[
                  styles.denyButtonEmoji,
                  (confirmationStatus === 'denied' || confirmationStatus === 'loading') && styles.activeButtonEmoji
                ]}>
                  ❌
                </Text>
                <Text style={[
                  styles.denyButtonText,
                  (confirmationStatus === 'denied' || confirmationStatus === 'loading') && styles.activeButtonText
                ]}>
                  Deny
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* NEW: Status and Action row below header */}

          <View style={styles.contentContainer}>
            {images.length > 0 && (
              <View style={styles.imageGallery}>
                {renderImageLayout()}
              </View>
            )}

            {threatDetails.description && (
              <Text style={styles.descriptionText}>
                {threatDetails.description}
              </Text>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );

  }
);

ThreatDetailsBottomSheet.displayName = 'ThreatDetailsBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // paddingTop: 5,
    paddingBottom: 15,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  threatInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Change this back to center
  },
  leftSection: {
    alignItems: 'flex-start',
    backgroundColor: '#ff44'
  },
  threatIconAndTimeContainer: {
    alignItems: 'flex-start',
    marginBottom: 4, // Small gap between icon and datetime
  },
  threatTextContainer: {
    flex: 1,
    justifyContent: 'center',
    // marginLeft: 8, // Close to the icon section
  },
  threatTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 5,
    marginBottom: 10,
  },
  actionHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  streetName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  threatInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Small gap before datetime
  },
  threatIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 25,
    backgroundColor: '#FF3B30', // Red background like HeadsUp threats
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF', // White border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginBottom: 8,
  },
  threatIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF', // Changed to white
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    width: 35,
    height: 35,
    borderRadius: 22,
    backgroundColor: '#FFFFFF', // Changed to white
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 22,
    backgroundColor: '#FFFFFF', // Changed to white
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addImageButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderWidth: 2,
    borderColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButtonText: {
    color: '#34C759',
    fontSize: 24,
    fontWeight: '600',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // NEW: Status and Action row styles
  statusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusLabelContainer: {
    alignItems: 'flex-start',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  addPhotoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    // borderWidth: 2,
    // borderColor: 'rgba(255, 255, 255, 0.3)',
    // borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  addPhotoCardSmall: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    // borderWidth: 1.5,
    // borderColor: 'rgba(255, 255, 255, 0.3)',
    // borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  addPhotoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addPhotoIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addPhotoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  addPhotoTextSmall: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  addPhotoTextTiny: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  imageGallery: {
    height: 200,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  singleImageContainer: {
    flex: 1,
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover'
  },
  twoImagesContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  mainImageContainer: {
    flex: 2,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover'
  },
  sideImageContainer: {
    flex: 1,
  },
  sideImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  sideImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover'
  },
  multipleImagesContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  sideImagesContainer: {
    flex: 1,
    gap: 8,
  },
  multipleSideImage: {
    width: '100%',
    height: '48%',
    borderRadius: 10,
    resizeMode: 'cover'
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  noImageText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontStyle: 'italic',
  },
  statusLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  unconfirmedLabel: {
    backgroundColor: '#00d5fa',
  },
  confirmedLabel: {
    backgroundColor: '#34C759',
  },
  deniedLabel: {
    backgroundColor: '#FF3B30',
  },
  loadingLabel: {
    backgroundColor: '#FF9500',
  },
  statusLabelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  dateTimeContainer: {
    alignSelf: 'flex-start', // Ensures it starts from the left
  },
  dateTimeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  descriptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 25,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 20,
    justifyContent: 'center',
  },
  confirmButton: {
    borderWidth: 0,
  },
  activeConfirmButton: {
  },
  denyButton: {
    borderWidth: 0,
  },
  activeDenyButton: {
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonEmoji: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.5,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  confirmButtonEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  denyButtonEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  denyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeButtonEmoji: {
    // Emoji color stays the same when active
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  handleIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 40,
    height: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  line: {
    width: '100%',
    height: 2,
    backgroundColor: '#666',
    marginBottom: 14
  },
});

export default ThreatDetailsBottomSheet;