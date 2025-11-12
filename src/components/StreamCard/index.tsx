import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Alert, Platform, Animated, Easing, Dimensions } from 'react-native';
import { Trash2, Download, Expand, ChevronDown, Mic, CheckCircle, Pause, Plus } from 'lucide-react-native';
import { CustomText } from '../';
import { Images, Metrix, Utills, NavigationService, RouteNames } from '../../config';
import { PasscodeInput, verifyStoredPasscode, getPasscodeFromStorage } from '../PasscodeInput/PasscodeInput';
import { FeedbackModal } from '../FeedbackModal/index';
import moment from 'moment';
import RNFS from 'react-native-fs';
import { createThumbnail } from 'react-native-create-thumbnail';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import ContactImageDB from '../../config/utills/ContactImageDB';
import { useFocusEffect } from '@react-navigation/native';
import { HomeAPIS } from '../../services/home'; // Add this import
import { reverseGeocode, isCoordinateString, extractCoordinates } from '../../config/utills/geocoding'
import Sound from 'react-native-sound'
import Svg, { Rect } from 'react-native-svg';
import Video from 'react-native-video';
import { VideoProcessingOverlayService } from '../../utils/videoOverlay';
import { VideoMergerService } from '../../services/videoMerger';
import { ActivityIndicator } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StreamCardProps {
    incident: {
        id: string;
        type: 'audio' | 'video';
        streetName?: string;
        triggerType: string;
        dateTime: string;
        thumbnailUrl?: string;
        recipients: Array<{
            id: string;
            name: string;
            avatar?: string;
        }>;
        location: {
            latitude: number;
            longitude: number;
        };
        agoraAudioLink?: string;
        recordingType?: string;
    };
    onDelete: (id: string, isPasscodeCorrect: boolean) => void;
    onDownload: () => void;
}

const StreamCardComponent: React.FC<StreamCardProps> = ({ incident, onDelete, onDownload }) => {
    const [isRecipientsExpanded, setIsRecipientsExpanded] = useState(false);
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);
    const [hasLocalVideo, setHasLocalVideo] = useState(false);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // New video player states
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [showVideoControls, setShowVideoControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [localVideoFiles, setLocalVideoFiles] = useState<any[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    const videoRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [sound, setSound] = useState<Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLevels, setAudioLevels] = useState<number[]>(
        new Array(50).fill(0).map(() => Math.random() * 0.8 + 0.2) // Generate 50 random bars
    );
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const [hasLocalAudio, setHasLocalAudio] = useState(false);
    const [localAudioFiles, setLocalAudioFiles] = useState<any[]>([]);
    const [localAudioThumbnail, setLocalAudioThumbnail] = useState<string | null>(null);

    const [isDownloading, setIsDownloading] = useState(false);

    // States for contacts data (like TrustedContacts)
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Enhanced recipients with contact images
    const [enhancedRecipients, setEnhancedRecipients] = useState(incident.recipients);

    const [resolvedStreetName, setResolvedStreetName] = useState<string | null>(null);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);

    // Add these after your state declarations, before useEffect hooks
    const shouldShowExpandButton = useMemo(() => incident.recipients.length > 4, [incident.recipients.length]);
    const visibleRecipients = useMemo(() =>
        isRecipientsExpanded ? enhancedRecipients : enhancedRecipients.slice(0, 4),
        [isRecipientsExpanded, enhancedRecipients]
    );
    const additionalCount = useMemo(() => incident.recipients.length - 4, [incident.recipients.length]);
    const displayStreetName = useMemo(() =>
        resolvedStreetName || incident.streetName || `Incident #${incident.id}`,
        [resolvedStreetName, incident.streetName, incident.id]
    );
    const formattedDate = useMemo(() =>
        moment(incident.dateTime).format('DD.MM.YYYY - HH:mm:ss'),
        [incident.dateTime]
    );
    const wait = (timeout: any) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    };

    const onRefresh = () => {
        setRefreshing(true);
        wait(1000).then(() => {
            getContacts();
            setRefreshing(false);
        });
    };

    useEffect(() => {
        const getMediaFiles = async () => {
            try {
                console.log('=== UNIFIED MEDIA FILES DEBUG ===');
                console.log('Incident ID:', incident.id);
                console.log('Agora Audio Link:', incident.agoraAudioLink);

                const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);

                // Look for MP4 files
                const videoFiles = files.filter(file =>
                    file.name.endsWith(`-${incident.id}-VIDEO.mp4`)
                );

                const audioFiles = files.filter(file =>
                    file.name.endsWith(`-${incident.id}-AUDIO.mp4`)
                );

                console.log('Video files found:', videoFiles.length);
                console.log('Audio MP4 files found:', audioFiles.length);

                // Handle video files
                if (videoFiles.length > 0) {
                    setHasLocalVideo(true);
                    setLocalVideoFiles(videoFiles);

                    const thumbnailVideoPath = videoFiles[1]?.path || videoFiles[0]?.path;
                    createThumbnail({
                        url: thumbnailVideoPath,
                        timeStamp: 10000,
                    })
                        .then(response => {
                            setLocalThumbnail(response?.path);
                        })
                        .catch(error => {
                            console.error('Error creating video thumbnail:', error);
                        });
                } else {
                    setHasLocalVideo(false);
                }

                // Handle audio MP4 files
                if (audioFiles.length > 0) {
                    setHasLocalAudio(true);
                    setLocalAudioFiles(audioFiles);

                    const audioPath = audioFiles[0].path;
                    let finalPath = audioPath;
                    if (Platform.OS === 'ios' && !finalPath.startsWith('file://')) {
                        finalPath = `file://${finalPath}`;
                    }

                    setAudioUri(finalPath);
                    console.log('✅ Local audio MP4 ready for Video component:', finalPath);

                } else {
                    setHasLocalAudio(false);

                    // Handle remote audio links ONLY if no local audio
                    if (incident.agoraAudioLink) {
                        console.log('✅ Using remote audio link:', incident.agoraAudioLink);
                        setAudioUri(incident.agoraAudioLink);
                    } else {
                        setAudioUri(null);
                    }
                }

            } catch (error) {
                console.error('Error fetching media files:', error);
            }
        };

        getMediaFiles();
    }, [incident.id, incident.type, incident.agoraAudioLink]);

    const showControlsTemporarily = () => {
        setShowVideoControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowVideoControls(false);
        }, 3000);
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const handleVideoPress = () => {
        if (!isVideoPlaying) {
            setIsVideoPlaying(true);
            setIsPaused(false);
            showControlsTemporarily();
        } else {
            setIsPaused(!isPaused);
            showControlsTemporarily();
        }
    };

    const handleFullscreenToggle = () => {
        const newFullscreenState = !isFullscreen;

        if (newFullscreenState) {
            // Going into modal fullscreen - pause the current video
            setIsPaused(true);
        }

        setIsFullscreen(newFullscreenState);
    };

    const handleVideoLoad = (data: any) => {
        console.log('Video load data:', data);
        if (data.duration > 0) {
            setVideoDuration(data.duration);
            setIsVideoLoaded(true);
        } else if (incident.type === 'audio') {
            // For audio files without duration, set a default or estimate
            console.log('Audio file loaded but no duration detected');
            setVideoDuration(60); // Default 60 seconds, adjust as needed
            setIsVideoLoaded(true);
        }
    };

    const handleVideoProgress = (data: any) => {
        setCurrentTime(data.currentTime);
    }

    const handleVideoEnd = () => {
        setIsPaused(true);
        setCurrentTime(0);
        setIsVideoPlaying(false);
        setIsPlaying(false); // This will stop the waveform animation
    };

    // Inside your StreamCard component
    const handleFeedbackSubmit = async (feedbackText: string) => {
        try {
            console.log('Submitting feedback for incident:', incident.id);

            // Create the body object
            const body = {
                incident_id: incident.id,
                feedback_text: feedbackText
            };

            // Call your existing sendFeedback function with the body
            const response = await HomeAPIS.sendFeedback(body);

            console.log('Feedback submitted successfully:', response);

        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        }
    };

    const resolveStreetName = useCallback(async () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {

            try {
                const streetName = incident.streetName;

                // Check if the street name looks like coordinates
                if (streetName && isCoordinateString(streetName)) {
                    setIsResolvingAddress(true);

                    // Try to extract coordinates from the string
                    const coords = extractCoordinates(streetName);

                    if (coords) {
                        console.log('Extracted coordinates:', coords);
                        const address = await reverseGeocode(coords.lat, coords.lng);
                        setResolvedStreetName(address);
                    } else {
                        // Fallback: use incident location if available
                        if (incident.location && incident.location.latitude && incident.location.longitude) {
                            const address = await reverseGeocode(
                                incident.location.latitude,
                                incident.location.longitude
                            );
                            setResolvedStreetName(address);
                        } else {
                            setResolvedStreetName('Unknown Location');
                        }
                    }

                    setIsResolvingAddress(false);
                } else {
                    // Street name is already good, use as is
                    setResolvedStreetName(streetName || `Incident #${incident.id}`);
                }
            } catch (error) {
                console.error('Error resolving street name:', error);
                setResolvedStreetName(incident.streetName || `Incident #${incident.id}`);
                setIsResolvingAddress(false);
            }
        }, 300);
    }, [incident.streetName, incident.location, incident.id]);

    // NEW EFFECT: Resolve street name when component mounts or incident changes
    useEffect(() => {
        resolveStreetName();
    }, [incident.streetName, incident.location]);

    // Load contact images (same logic as TrustedContacts)
    const getContacts = async () => {
        try {
            if (incident.recipients.length === 0) return;

            // Get all recipient IDs
            const contactIds = incident.recipients.map(recipient => recipient.id.toString());

            // Get all images from database in one call
            const contactImages = await ContactImageDB.getMultipleContactImages(contactIds);

            // Process each recipient (same logic as TrustedContacts)
            const enhanced = incident.recipients.map((recipient) => {
                const contactId = recipient.id.toString();
                const dbImage = contactImages[contactId];

                return {
                    ...recipient,
                    // Priority: Database image -> API avatar -> null
                    avatar: dbImage || recipient.avatar,
                    abbreviate: recipient.name.charAt(0)?.toUpperCase(), // Add abbreviate like TrustedContacts
                };
            });

            setEnhancedRecipients(enhanced);
        } catch (err) {
            console.log('Error getting contact images:', err);
        }
    };

    // Load contact images when component mounts or when recipients change
    useEffect(() => {
        getContacts();
    }, [incident.recipients]);

    useEffect(() => {
        if (!isFullscreen && isVideoPlaying) {
            // When exiting fullscreen, ensure the StreamCard video is paused
            setIsPaused(true);
        }
    }, [isFullscreen]);

    useFocusEffect(
        useCallback(() => {
            // Reset video state when returning to this screen
            setIsVideoPlaying(false);
            setIsPaused(true);
            setCurrentTime(0);
            setIsFullscreen(false);
        }, [])
    );


    const handleFullscreenPress = async () => {
        // For any local media OR any audio (including remote), use video player in fullscreen
        if (hasLocalVideo || hasLocalAudio || (incident.type === 'audio' && audioUri)) {
            setIsVideoPlaying(true);
            setIsFullscreen(true);
            setIsPaused(false);
            setCurrentTime(0);

            if (videoRef.current) {
                videoRef.current.seek(0);
            }

            console.log('Opening fullscreen player for incident:', incident.id);
            return;
        }

        // Fallback - shouldn't reach here
        handleAudioPlayPause();
    };

    const handleViewDetails = () => {
        if (incident.type === 'audio') {
            // For audio, just play/pause - don't navigate to details
            handleAudioPlayPause();
            return;
        }

        NavigationService.navigate(RouteNames.HomeRoutes.FootageDetails, {
            id: incident.id,
        });
    };

    const saveVideoToCameraRoll = async (localFilePath: string) => {
        if (!localFilePath) {
            Alert.alert('Error', 'No file path provided.');
            return;
        }

        try {
            const fileExists = await RNFS.exists(localFilePath);
            if (!fileExists) {
                console.error('[Save Video] File does not exist at path:', localFilePath);
                Alert.alert('Error', 'Video file not found.');
                return;
            }

            console.log('[Save Video] Processing video with ROVE overlay...');

            // Show processing indicator
            Alert.alert(
                'Processing Video',
                'Adding ROVE timestamp overlay to video. This may take a moment...',
                [{ text: 'OK' }]
            );

            // Process video with timestamp overlay using react-native-video-processing
            const processedVideoPath = await VideoProcessingOverlayService.processVideoForSaving(
                localFilePath,
                {
                    id: incident.id,
                    dateTime: incident.dateTime,
                    createdAt: incident.dateTime,
                    streetName: incident.streetName,
                    triggerType: incident.triggerType
                }
            );

            let uri = processedVideoPath;
            if (Platform.OS === 'ios') {
                uri = processedVideoPath.startsWith('file://') ? processedVideoPath : `file://${processedVideoPath}`;
            }

            console.log('[Save Video] Attempting to save processed URI:', uri);

            const savedUri = await CameraRoll.save(uri, {
                type: 'video'
            });

            console.log('[Save Video] Successfully saved processed video. URI:', savedUri);

            // Clean up the temporary processed file (only if different from original)
            if (processedVideoPath !== localFilePath) {
                await VideoProcessingOverlayService.cleanupTempFile(processedVideoPath);
            }

            Alert.alert(
                '✅ Success!',
                'ROVE security video with timestamp saved to your Photos!'
            );

        } catch (error) {
            console.error('[Save Video] Detailed error:', error);

            if (error.message?.includes('Permission') || error.message?.includes('authorization')) {
                Alert.alert(
                    'Permission Required',
                    'Please go to Settings > Privacy & Security > Photos and allow "Add Photos Only" or "Full Access" for this app.'
                );
            } else {
                // Fallback: save original video if overlay processing fails
                try {
                    let uri = localFilePath;
                    if (Platform.OS === 'ios') {
                        uri = localFilePath.startsWith('file://') ? localFilePath : `file://${localFilePath}`;
                    }

                    await CameraRoll.save(uri, { type: 'video' });
                    Alert.alert(
                        'Saved (Original)',
                        'Could not add overlay, but original video was saved to Photos.'
                    );
                } catch (fallbackError) {
                    Alert.alert('Error', `Could not save the video: ${error.message}`);
                }
            }
        }
    };

    const handleDownloadPressWithMerge = async () => {
        try {
            console.log('[Download] Starting download for incident:', incident.id);
            setIsDownloading(true);

            const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
            const mediaFiles = files.filter(file =>
                file.name.includes(`-${incident.id}-VIDEO.mp4`)
            );

            console.log('[Download] Found media files:', mediaFiles.length);

            if (mediaFiles.length === 0) {
                Alert.alert('Error', 'No local media found to download.');
                return;
            }

            // Check if VideoMergerService is available (iOS only)
            if (!VideoMergerService.isAvailable()) {
                Alert.alert('Not Supported', 'Video merging is only available on iOS');
                return;
            }

            // CASE 1: Single video file - add timestamp overlay only
            if (mediaFiles.length === 1) {
                console.log('[Download] Single video - adding timestamp overlay only');

                const singleVideoPath = mediaFiles[0].path;
                const timestampOutputPath = `${RNFS.DocumentDirectoryPath}/timestamp_single_${incident.id}_${Date.now()}.mp4`;

                try {
                    // Add timestamp overlay to single video
                    await VideoMergerService.addTimestampOverlay(
                        singleVideoPath,
                        timestampOutputPath,
                        incident.dateTime,
                        incident.id
                    );

                    // Save to camera roll
                    await CameraRoll.save(timestampOutputPath, { type: 'video' });

                    // Cleanup temporary file
                    await RNFS.unlink(timestampOutputPath).catch(() => { });

                    Alert.alert(
                        '✅ Success!',
                        'ROVE security video with timestamp saved to your Photos!',
                        [{ text: 'OK' }]
                    );
                } catch (error) {
                    console.error('[Download] Single video processing failed:', error);
                    // Alert.alert('Error', 'Failed to process video');
                }
                return;
            }

            // CASE 2: Multiple videos - merge with black screen transition and timestamp
            if (mediaFiles.length >= 2) {
                console.log('[Download] Multiple videos found - merging with black screen transition...');

                try {
                    // Sort by size - larger file is usually back camera
                    const sortedFiles = mediaFiles.sort((a, b) => b.size - a.size);
                    const backCamPath = sortedFiles[0].path;  // Larger file (back cam)
                    const frontCamPath = sortedFiles[1].path; // Smaller file (front cam)

                    console.log('📹 Front cam (selfie - plays first):', frontCamPath);
                    console.log('📹 Back cam (main - plays after transition):', backCamPath);

                    // Use the single method that does everything: merge + transition + timestamp
                    const success = await VideoMergerService.mergeAndSaveToGallery(
                        incident.id,
                        {
                            id: incident.id,
                            dateTime: incident.dateTime,
                            createdAt: incident.dateTime,
                            streetName: incident.streetName || `Incident #${incident.id}`,
                            triggerType: incident.triggerType || 'Unknown'
                        }
                    );

                    if (success) {
                        Alert.alert(
                            '✅ Success!',
                            'Merged ROVE security video with black screen transition and timestamp saved to your Photos!',
                            [{ text: 'OK' }]
                        );
                    } else {
                        throw new Error('Merge operation returned false');
                    }
                } catch (error) {
                    console.error('[Download] Merge failed:', error);
                    // Alert.alert('Error', 'Failed to merge videos');
                }
                return;
            }

        } catch (error) {
            console.error('[Download] Error during download:', error);
            Alert.alert('Error', 'Could not download video');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeletePress = async () => {
        const storedPasscode = await getPasscodeFromStorage();
        if (!storedPasscode) {
            Alert.alert(
                'No Passcode Set',
                'Please set up a passcode in settings first to delete files securely.'
            );
            return;
        }
        setShowPasscodeModal(true);
    };

    const handlePasscodeComplete = async (enteredPasscode: string) => {
        try {
            console.log('Entered passcode:', enteredPasscode);

            const storedPasscode = await getPasscodeFromStorage();
            console.log('Stored passcode:', storedPasscode);

            const isValid = await verifyStoredPasscode(enteredPasscode);
            console.log('Passcode verification result:', isValid);

            setShowPasscodeModal(false);

            if (isValid) {
                console.log('Passcode correct - deleting file');
                onDelete(incident.id, true);
                setSuccessMessage('File was deleted');
                setTimeout(() => {
                    setShowSuccessModal(false);
                }, 3000);
            } else {
                console.log('Passcode incorrect - local delete only');
                setSuccessMessage('Local file was deleted');
                setShowSuccessModal(true);

                setTimeout(() => {
                    setShowSuccessModal(false);
                    onDelete(incident.id, false);
                }, 3000);
            }
        } catch (error) {
            console.error('Error verifying passcode:', error);
            setShowPasscodeModal(false);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    };

    const animatedValues = useRef(
        new Array(50).fill(0).map(() => new Animated.Value(0.2))
    ).current;

    const generateRandomWaveform = () => {
        return new Array(20).fill(0).map(() => Math.random() * 0.8 + 0.2);
    };

    const animateWaveform = (levels: number[]) => {
        const animations = levels.map((level, index) =>
            Animated.timing(animatedValues[index], {
                toValue: level,
                duration: 150,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            })
        );

        Animated.stagger(20, animations).start();
    };

    const startWaveformAnimation = useCallback(() => {
        if (!isPlaying) return;

        const animate = () => {
            // Check if still playing before continuing
            if (!isPlaying) {
                console.log('Stopping waveform animation - not playing');
                return;
            }

            const newLevels = generateRandomWaveform();
            setAudioLevels(newLevels);
            animateWaveform(newLevels);

            // Use requestAnimationFrame instead of setTimeout for better performance
            if (isPlaying) {
                setTimeout(() => {
                    if (isPlaying) { // Double check before next animation
                        animate();
                    }
                }, 200);
            }
        };
        animate();
    }, [isPlaying]);

    const handleAudioPlayPause = async () => {
        try {
            console.log('Audio URI:', audioUri);
            console.log('Has Local Audio:', hasLocalAudio);
            console.log('Current isPlaying state:', isPlaying);
            console.log('Current isVideoPlaying state:', isVideoPlaying);

            if (!audioUri) {
                Alert.alert('Audio Not Found', 'No audio file available for this incident');
                return;
            }

            // If video player is already active
            if (isVideoPlaying) {
                if (isPaused) {
                    // Resume video playback
                    setIsPaused(false);
                    setIsPlaying(true);
                    startWaveformAnimation();
                } else {
                    // Pause video playback
                    setIsPaused(true);
                    setIsPlaying(false);
                    // Stop waveform animation by setting isPlaying to false
                }
                return;
            }

            // Start fresh video playback for audio
            console.log('Starting fresh audio playback via video player');
            setIsVideoPlaying(true);
            setIsPaused(false);
            setIsPlaying(true);
            setCurrentTime(0);

            if (videoRef.current) {
                videoRef.current.seek(0);
            }

            // Start waveform animation
            startWaveformAnimation();

        } catch (error) {
            console.error('Audio playback error:', error);
            Alert.alert('Error', 'Could not play audio file');
        }
    };


    useEffect(() => {
        return () => {
            if (sound) {
                sound.release();
            }
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            // Stop waveform animation on unmount
            setIsPlaying(false);
        };
    }, [sound]);

    const WaveformVisualizer = ({ audioLevels, isPlaying, position, duration }) => {
        const animationValue = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            if (isPlaying) {
                // Start pulsing animation
                const pulseAnimation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(animationValue, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: false,
                        }),
                        Animated.timing(animationValue, {
                            toValue: 0,
                            duration: 500,
                            useNativeDriver: false,
                        }),
                    ])
                );
                pulseAnimation.start();

                return () => {
                    pulseAnimation.stop(); // Stop animation on cleanup
                };
            } else {
                animationValue.setValue(0);
                // Make sure any running animations are stopped
                animationValue.stopAnimation();
            }
        }, [isPlaying, animationValue]);

        const renderWaveform = () => {
            const barWidth = 3;
            const barSpacing = 1;
            const maxHeight = 80; // Reduced from 80 to leave more vertical centering room
            const centerY = 50;
            const svgWidth = 320;

            // Use the actual audioLevels length instead of calculating totalBars
            const totalBars = audioLevels.length;
            const totalWaveformWidth = totalBars * (barWidth + barSpacing) - barSpacing;

            // Center the entire waveform horizontally
            const startX = (svgWidth - totalWaveformWidth) / 2;

            const progress = duration > 0 ? position / duration : 0;
            const currentBarIndex = Math.floor(progress * totalBars);

            return audioLevels.map((level, index) => {
                const barHeight = Math.max(4, level * maxHeight);
                const x = startX + index * (barWidth + barSpacing);
                const y = centerY - barHeight / 2; // Center each bar vertically

                // Bars before current position are slightly dimmed
                const opacity = index <= currentBarIndex ? 1 : 0.6;

                // Add slight variation to make it look more dynamic
                const heightVariation = isPlaying ? Math.sin(Date.now() * 0.01 + index * 0.5) * 0.1 + 1 : 1;
                const adjustedHeight = barHeight * heightVariation;
                const adjustedY = centerY - adjustedHeight / 2; // Re-center after height adjustment

                return (
                    <Rect
                        key={index}
                        x={x}
                        y={adjustedY}
                        width={barWidth}
                        height={adjustedHeight}
                        fill="#FFFFFF"
                        opacity={opacity}
                        rx={1}
                    />
                );
            });
        };

        return (
            <View style={styles.waveformVisualizerContainer}>
                <Animated.View
                    style={[
                        styles.waveformContainer,
                        {
                            shadowOpacity: animationValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.6],
                            }),
                        },
                    ]}
                >
                    <Svg width="100%" height="100%" viewBox="0 0 320 100">
                        {renderWaveform()}
                    </Svg>
                </Animated.View>
            </View>
        );
    };

    const renderVideoPlayer = () => {
        if (!isVideoPlaying) return null;

        // Determine which files to use
        const mediaFiles = hasLocalVideo ? localVideoFiles : localAudioFiles;
        const currentMediaPath = mediaFiles[currentVideoIndex]?.path || audioUri;

        if (!currentMediaPath) return null;

        const isAudioFile = !hasLocalVideo && (hasLocalAudio || incident.type === 'audio');

        console.log('Video player - isAudioFile:', isAudioFile);
        console.log('Video player - currentMediaPath:', currentMediaPath);

        // Different props for audio vs video files
        const videoProps = {
            ref: videoRef,
            source: { uri: currentMediaPath },
            style: styles.videoPlayer,
            paused: isPaused,
            volume: 1.0,
            muted: false,
            rate: 1.0,
            onLoad: handleVideoLoad,
            onProgress: handleVideoProgress,
            onEnd: handleVideoEnd,
            onError: (error) => {
                console.error('Media playback error:', error);
                Alert.alert('Error', 'Could not play media');
                setIsVideoPlaying(false);
            }
        };

        // Audio-specific props
        if (isAudioFile) {
            return (
                <View style={[styles.videoPlayerContainer, isFullscreen && styles.fullscreenVideoContainer]}>
                    <Video
                        {...videoProps}
                        resizeMode="stretch"              // Better for audio
                        ignoreSilentSwitch="ignore"       // Keep sound on silent mode
                        playInBackground={true}           // Allow background audio
                        playWhenInactive={true}           // Keep playing when app inactive
                        audioOnly={true}                  // Tell RN Video this is audio only
                        poster={undefined}                // No poster for audio
                        posterResizeMode="contain"
                    />

                    {/* Show waveform overlay for audio files */}
                    {!showVideoControls && (
                        <View style={styles.audioOverlay}>
                            <WaveformVisualizer
                                audioLevels={audioLevels}
                                isPlaying={!isPaused}
                                position={currentTime}
                                duration={videoDuration}
                            />
                        </View>
                    )}

                    {/* Audio Controls Overlay */}
                    {showVideoControls && (
                        <View style={styles.videoControlsOverlay}>
                            <TouchableOpacity
                                style={styles.videoControlButton}
                                onPress={handleVideoPress}
                            >
                                <Image
                                    source={isPaused ? Images.PlayBtn : Images.PauseBtn}
                                    style={styles.videoControlIcon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>

                            {isVideoLoaded && videoDuration > 0 && (
                                <View style={styles.videoProgressContainer}>
                                    <Text style={styles.timeText}>
                                        {formatTime(currentTime)} / {formatTime(videoDuration)}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    { width: `${(currentTime / videoDuration) * 100}%` }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.videoTapArea}
                        onPress={showControlsTemporarily}
                    />
                </View>
            );
        }

        // Video-specific props (your existing code)
        return (
            <View style={[styles.videoPlayerContainer, isFullscreen && styles.fullscreenVideoContainer]}>
                <Video
                    {...videoProps}
                    resizeMode="contain"              // Good for video
                    ignoreSilentSwitch="obey"         // Respect silent mode for video
                    playInBackground={false}          // Don't play video in background
                    playWhenInactive={false}          // Pause video when app inactive
                />

                {/* Video Controls Overlay */}
                {showVideoControls && (
                    <View style={styles.videoControlsOverlay}>
                        <TouchableOpacity
                            style={styles.videoControlButton}
                            onPress={handleVideoPress}
                        >
                            <Image
                                source={isPaused ? Images.PlayBtn : Images.PauseBtn}
                                style={styles.videoControlIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        {isVideoLoaded && videoDuration > 0 && (
                            <View style={styles.videoProgressContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                                </Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${(currentTime / videoDuration) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    style={styles.videoTapArea}
                    onPress={showControlsTemporarily}
                />
            </View>
        );
    };

    const renderMediaContent = () => {
        // 1. Active video/audio player (highest priority)
        if (isVideoPlaying && (hasLocalVideo || hasLocalAudio)) {
            return renderVideoPlayer();
        }

        // 2. Local video with thumbnail
        if (hasLocalVideo && localThumbnail) {
            return (
                <TouchableOpacity style={styles.videoContainer} onPress={handleVideoPress}>
                    <Image
                        source={{ uri: localThumbnail }}
                        style={[styles.image, styles.videoFillContainer]}
                    />
                    <Image
                        source={Images.PlayBtn}
                        resizeMode="contain"
                        style={styles.playButton}
                    />
                </TouchableOpacity>
            );
        }

        // 3. Server video thumbnail
        if (incident.type === 'video' && incident.thumbnailUrl) {
            return (
                <TouchableOpacity style={styles.videoContainer} onPress={handleViewDetails}>
                    <Image
                        source={{ uri: incident.thumbnailUrl }}
                        style={styles.image}
                        defaultSource={Images.Audio}
                    />
                    <Image
                        source={Images.PlayBtn}
                        resizeMode="contain"
                        style={styles.playButton}
                    />
                </TouchableOpacity>
            );
        }

        // 4. Local audio MP4 files - STATIC preview with NO auto-animation
        if (hasLocalAudio && audioUri && audioUri.includes('.mp4')) {
            return (
                <TouchableOpacity style={styles.audioContainer} onPress={handleAudioPlayPause}>
                    <View style={styles.audioWaveformMainContainer}>
                        <WaveformVisualizer
                            audioLevels={audioLevels}
                            isPlaying={false} // ALWAYS FALSE for preview
                            position={0}
                            duration={0}
                        />
                        <View style={styles.audioPlayButtonCentered}>
                            <Image
                                source={Images.PlayBtn}
                                resizeMode="contain"
                                style={styles.audioPlayIconCentered}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // 5. Fallback: Static waveform for remote audio
        return (
            <View style={styles.audioWaveformMainContainer}>
                <WaveformVisualizer
                    audioLevels={audioLevels}
                    isPlaying={false} // ALWAYS FALSE for preview
                    position={0}
                    duration={0}
                />
                <TouchableOpacity
                    style={styles.audioPlayButtonCentered}
                    onPress={handleAudioPlayPause}
                    activeOpacity={0.7}
                >
                    <Image
                        source={Images.PlayBtn}
                        resizeMode="contain"
                        style={styles.audioPlayIconCentered}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    const renderSuccessModal = () => (
        <Modal
            visible={showSuccessModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSuccessModal(false)}
        >
            <View style={styles.successModalOverlay}>
                <View style={styles.successModalContent}>
                    <Image
                        source={Images.Checked}
                        resizeMode="contain"
                        style={{
                            width: Metrix.HorizontalSize(35),
                            height: Metrix.VerticalSize(35),
                            marginBottom: Metrix.VerticalSize(10),
                        }}
                    />
                    <CustomText.ExtraLargeBoldText customStyle={styles.successText}>
                        Success!
                    </CustomText.ExtraLargeBoldText>
                    <CustomText.LargeSemiBoldText customStyle={styles.successText}>
                        {successMessage}
                    </CustomText.LargeSemiBoldText>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.card} pointerEvents="box-none">
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <CustomText.LargeSemiBoldText customStyle={styles.streetName}>
                        {displayStreetName}
                    </CustomText.LargeSemiBoldText>
                    <CustomText.RegularText customStyle={styles.triggerType}>
                        {incident.triggerType}
                    </CustomText.RegularText>
                </View>
                <TouchableOpacity
                    style={styles.feedbackButton}
                    onPress={() => setShowFeedbackModal(true)}
                >
                    <CustomText.SmallText customStyle={styles.feedbackButtonText}>
                        Give feedback
                    </CustomText.SmallText>
                </TouchableOpacity>
            </View>

            <View style={styles.imageContainer}>
                {renderMediaContent()}
                {!isVideoPlaying && (
                    <>
                        <View style={styles.imageOverlay}>
                            <CustomText.SmallText customStyle={styles.dateTime}>
                                {formattedDate}
                            </CustomText.SmallText>
                        </View>
                        <View style={styles.imageActions}>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDeletePress}
                            >
                                <Image
                                    source={Images.RedDelete}
                                    resizeMode="contain"
                                    style={{
                                        width: Metrix.HorizontalSize(22),
                                        height: Metrix.VerticalSize(22),
                                    }}
                                />
                            </TouchableOpacity>
                            <View style={styles.rightActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={async () => handleDownloadPressWithMerge()}
                                >
                                    <Image
                                        source={Images.Download}
                                        resizeMode="contain"
                                        style={{
                                            width: Metrix.HorizontalSize(22),
                                            height: Metrix.VerticalSize(22),
                                        }}
                                    />
                                </TouchableOpacity>

                                {hasLocalVideo && (
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleFullscreenPress}
                                    >
                                        <Image
                                            source={Images.Fullscreen}
                                            resizeMode="contain"
                                            style={{
                                                width: Metrix.HorizontalSize(22),
                                                height: Metrix.VerticalSize(22),
                                            }}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Recipients Section - EXACT same logic as TrustedContacts */}
            {enhancedRecipients.length > 0 && (
                <View style={styles.recipientsSection}>
                    <CustomText.MediumText customStyle={styles.recipientsTitle}>
                        Recipients
                    </CustomText.MediumText>
                    <View style={styles.recipientsContainer}>
                        <View style={styles.recipientsList}>
                            {visibleRecipients.map((recipient) => (
                                <View key={recipient.id} style={styles.recipientItem}>
                                    {/* EXACT same logic as TrustedContacts */}
                                    {recipient.avatar ? (
                                        <Image
                                            source={{ uri: recipient.avatar }}
                                            style={styles.recipientAvatar}
                                        />
                                    ) : (
                                        <View style={[styles.recipientAvatar, styles.defaultAvatar]}>
                                            <CustomText.SmallText customStyle={styles.avatarText}>
                                                {recipient?.abbreviate?.toUpperCase()}
                                            </CustomText.SmallText>
                                        </View>
                                    )}
                                </View>
                            ))}
                            {shouldShowExpandButton && !isRecipientsExpanded && additionalCount > 0 && (
                                <View style={styles.moreIndicator}>
                                    <CustomText.SmallText customStyle={styles.moreText}>
                                        +{additionalCount} more
                                    </CustomText.SmallText>
                                </View>
                            )}
                        </View>
                        {shouldShowExpandButton && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setIsRecipientsExpanded(!isRecipientsExpanded)}
                            >
                                <ChevronDown
                                    size={26}
                                    color="#ffffff"
                                    style={[
                                        styles.chevron,
                                        isRecipientsExpanded && styles.chevronRotated
                                    ]}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <View style={{ width: '100%', height: 1, backgroundColor: '#5f626b' }} />

            {/* Passcode Input Modal */}
            <Modal
                visible={showPasscodeModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowPasscodeModal(false)}
            >
                <PasscodeInput
                    title="Enter passcode to delete"
                    onPasscodeComplete={handlePasscodeComplete}
                    onBack={() => setShowPasscodeModal(false)}
                    isVerificationMode={true}
                />
            </Modal>

            {/* Success Modal */}
            {renderSuccessModal()}

            {/* Feedback Modal */}
            <FeedbackModal
                visible={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                incidentId={incident.id}
                onSubmit={handleFeedbackSubmit}
            />

            {isFullscreen && isVideoPlaying && (
                <Modal
                    visible={isFullscreen}
                    animationType="fade"
                    presentationStyle="fullScreen"
                    supportedOrientations={['portrait', 'landscape']}
                    onRequestClose={() => setIsFullscreen(false)}
                >
                    <View style={styles.fullscreenModalContainer}>
                        {renderVideoPlayer()}
                        <TouchableOpacity
                            style={styles.closeFullscreenButton}
                            onPress={() => {
                                setIsFullscreen(false);
                                setIsPaused(true); // Ensure video is paused when closing
                            }}
                        >
                            <Text style={styles.closeButtonText}>x</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            )}
            {/* Download Loading Modal */}
            {isDownloading && (
                <View style={styles.downloadLoader}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            )}
        </View>
    );
};

export const StreamCard = memo(StreamCardComponent);

const styles = StyleSheet.create({
    card: {
        backgroundColor: Utills.selectedThemeColors().Base,
        borderRadius: Metrix.HorizontalSize(16),
        marginBottom: Metrix.VerticalSize(24),
        // borderWidth: 1,
        // borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: Metrix.VerticalSize(16),
    },
    headerInfo: {
        flex: 1,
        // backgroundColor: '#ff44'
    },
    streetName: {
        fontSize: Metrix.customFontSize(15),
        fontWeight: '600',
        color: Utills.selectedThemeColors().PrimaryTextColor,
        // marginBottom: Metrix.VerticalSize(4),
    },
    triggerType: {
        fontSize: Metrix.customFontSize(14),
        color: Utills.selectedThemeColors().SecondaryTextColor,
    },
    feedbackButton: {
        backgroundColor: '#5f626b',
        paddingHorizontal: Metrix.HorizontalSize(16),
        paddingVertical: Metrix.VerticalSize(8),
        borderRadius: Metrix.HorizontalSize(4),
        marginLeft: Metrix.HorizontalSize(16),
    },
    feedbackButtonText: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: Metrix.customFontSize(14),
        fontWeight: '500',
    },
    imageContainer: {
        position: 'relative',
        marginBottom: Metrix.VerticalSize(10),
        borderRadius: Metrix.HorizontalSize(12),
        overflow: 'hidden',
        height: Metrix.VerticalSize(200),
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333333',
    },
    videoContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoFillContainer: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    playButton: {
        width: Metrix.HorizontalSize(60),
        height: Metrix.HorizontalSize(60),
        position: 'absolute',
        zIndex: 10,
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    },
    audioContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',

    },
    audioIconContainer: {
        width: Metrix.HorizontalSize(80),
        height: Metrix.VerticalSize(80),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(12),
    },
    audioLabel: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: Metrix.customFontSize(16),
        fontWeight: '500',
    },
    imageOverlay: {
        position: 'absolute',
        top: Metrix.VerticalSize(16),
        left: Metrix.HorizontalSize(16),
        backgroundColor: '#232323',
        paddingHorizontal: Metrix.HorizontalSize(12),
        paddingVertical: Metrix.VerticalSize(6),
        borderRadius: Metrix.HorizontalSize(6),
    },
    dateTime: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: Metrix.customFontSize(14),
        fontWeight: '500',
    },
    imageActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: Metrix.HorizontalSize(10),
    },
    deleteButton: {
        width: Metrix.HorizontalSize(40),
        height: Metrix.VerticalSize(40),
        borderRadius: Metrix.HorizontalSize(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightActions: {
        flexDirection: 'row',
        gap: Metrix.HorizontalSize(12),
    },
    actionButton: {
        width: Metrix.HorizontalSize(40),
        height: Metrix.VerticalSize(40),
        borderRadius: Metrix.HorizontalSize(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    recipientsSection: {
        paddingBottom: Metrix.VerticalSize(20),
    },
    recipientsTitle: {
        fontSize: Metrix.customFontSize(17),
        fontWeight: '600',
        color: Utills.selectedThemeColors().PrimaryTextColor,
        marginBottom: Metrix.VerticalSize(12),
    },
    recipientsContainer: {
        backgroundColor: '#5f626b',
        borderRadius: Metrix.HorizontalSize(5),
        padding: Metrix.HorizontalSize(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    recipientsList: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recipientItem: {
        marginRight: Metrix.HorizontalSize(12),
    },
    recipientAvatar: {
        width: Metrix.HorizontalSize(40),
        height: Metrix.VerticalSize(40),
        borderRadius: Metrix.HorizontalSize(20),
        backgroundColor: '#555555',
    },
    defaultAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    },
    avatarText: {
        color: Utills.selectedThemeColors().Base,
        fontSize: Metrix.customFontSize(20),
        fontWeight: '600',
    },
    moreIndicator: {
        paddingHorizontal: Metrix.HorizontalSize(2),
        paddingVertical: Metrix.VerticalSize(8),
        // backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: Metrix.HorizontalSize(20),
    },
    moreText: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: Metrix.customFontSize(14),
        fontWeight: '500',
    },
    expandButton: {
        padding: Metrix.HorizontalSize(8),
    },
    chevron: {
        transform: [{ rotate: '0deg' }],
    },
    chevronRotated: {
        transform: [{ rotate: '180deg' }],
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalContent: {
        backgroundColor: '#61636c',
        borderRadius: Metrix.HorizontalSize(16),
        padding: Metrix.HorizontalSize(40),
        alignItems: 'center',
        marginHorizontal: Metrix.HorizontalSize(40),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    successIcon: {
        marginBottom: Metrix.VerticalSize(20),
    },
    successText: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: Metrix.customFontSize(18),
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: Metrix.VerticalSize(24),
    },
    streetNameContainer: {
        flexDirection: 'column',
    },
    resolvingText: {
        fontSize: 10,
        color: '#888',
        fontStyle: 'italic',
        marginTop: 2,
    },
    audioWaveformMainContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformVisualizerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    waveformContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#6B7280', // Gray background as requested
        borderRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowRadius: 10,
        elevation: 10,
    },
    audioPlayButtonCentered: {
        position: 'absolute',
        width: Metrix.HorizontalSize(60),
        height: Metrix.VerticalSize(60),
        borderRadius: Metrix.HorizontalSize(30),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        // Center the button
        top: '50%',
        left: '50%',
        marginTop: -Metrix.VerticalSize(30),
        marginLeft: -Metrix.HorizontalSize(30),
    },
    audioPlayIconCentered: {
        width: Metrix.HorizontalSize(30),
        height: Metrix.VerticalSize(30),
        tintColor: '#ffffff',
    },
    // Video Player Styles
    videoPlayerContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000',
    },
    fullscreenVideoContainer: {
        width: screenWidth,
        height: screenHeight,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1000,
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    videoControlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoControlButton: {
        width: Metrix.HorizontalSize(60),
        height: Metrix.VerticalSize(60),
        borderRadius: Metrix.HorizontalSize(30),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(20),
    },
    videoControlIcon: {
        width: Metrix.HorizontalSize(30),
        height: Metrix.VerticalSize(30),
        tintColor: '#FFFFFF',
    },
    fullscreenButton: {
        position: 'absolute',
        top: Metrix.VerticalSize(20),
        right: Metrix.HorizontalSize(20),
        width: Metrix.HorizontalSize(40),
        height: Metrix.VerticalSize(40),
        borderRadius: Metrix.HorizontalSize(20),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoProgressContainer: {
        position: 'absolute',
        bottom: Metrix.VerticalSize(20),
        left: Metrix.HorizontalSize(20),
        right: Metrix.HorizontalSize(20),
        alignItems: 'center',
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: Metrix.customFontSize(12),
        marginBottom: Metrix.VerticalSize(8),
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: Metrix.VerticalSize(4),
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: Metrix.HorizontalSize(2),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    videoIndicatorContainer: {
        position: 'absolute',
        top: Metrix.VerticalSize(20),
        left: Metrix.HorizontalSize(20),
        flexDirection: 'row',
        gap: Metrix.HorizontalSize(8),
    },
    videoIndicator: {
        width: Metrix.HorizontalSize(8),
        height: Metrix.VerticalSize(8),
        borderRadius: Metrix.HorizontalSize(4),
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    activeVideoIndicator: {
        backgroundColor: '#FFFFFF',
    },
    videoTapArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    audioOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    fullscreenModalContainer: {
        flex: 1,
        backgroundColor: '#000',
        position: 'relative',
    },
    closeFullscreenButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: Metrix.HorizontalSize(40),
        height: Metrix.VerticalSize(40),
        borderRadius: Metrix.HorizontalSize(20),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: Metrix.customFontSize(20),
        fontWeight: 'bold',
    },
    downloadLoader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Metrix.HorizontalSize(16),
        zIndex: 100,
    },
});
