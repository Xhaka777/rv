import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import React, { act, useCallback, useEffect, useRef, useState } from 'react';
import { HeadsUpProps } from '../../propTypes';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import { Images, Metrix, Utills, NavigationService, RouteNames } from '../../../config';
import {
  CustomModal,
  CustomText,
  MainContainer,
  Loader,
} from '../../../components';
import Geolocation from 'react-native-geolocation-service';
import FirstBottomSheet from '../../../components/BottomSheet/FirstBottomSheet';
import SecondBottomSheet from '../../../components/BottomSheet/SecondBottomSheet';
import ThreatDetailsBottomSheet from '../../../components/BottomSheet/ThreadDetails';
import BottomSheet from '@gorhom/bottom-sheet';
import { HomeActions } from '../../../redux/actions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { HomeAPIS } from '../../../services/home';
import { GOOGLE_API_KEY } from '../../../services/config';
import { normalizeFont } from '../../../config/metrix';
import { Camera, Check, Clock, Ellipsis, X } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import CameraScreen from '../../../components/CameraScreen';
import Slider from '@react-native-community/slider';
import { isThreatWithinRadius } from '../../../utils/distanceHelpers';
import { debounce } from 'lodash';
import NetInfo from '@react-native-community/netinfo';
import FriendsBottomSheet from '../../../components/BottomSheet/FriendsBottomSheet';

const { width, height } = Dimensions.get('window');

interface ThreatDetails {
  id: string;
  realId?: string;
  icon: any;
  label: string;
  streetName: string;
  image?: string;
  photo_urls?: string[]; // Add this field
  timestamp: string;
  description?: string;
  latitude: number;
  longitude: number;
  user: string;
  created_at?: string;
  ai_classification?: string;
  ai_confidence?: number;
  classification_details?: string;
  is_automated?: boolean;
}

export const HeadsUp: React.FC<HeadsUpProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();

  const mapRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const isFocus = useIsFocused();
  const userData = useSelector((state: RootState) => state.home.userDetails);
  const userCoordinates = useSelector(
    (state: RootState) => state.home.userLocation,
  );

  // HeadsUp states
  const dramaModalShown = useSelector((state: RootState) => state.home.dramaModalShown);
  const [showDramaModal, setShowDramaModal] = useState(!dramaModalShown);
  const [tempThreatData, setTempThreatData] = useState<{ id: number, icon: any, label: string, message: string } | null>(null);
  const [activeSheet, setActiveSheet] = useState<'none' | 'first' | 'second' | 'camera' | 'third'>('none');
  const [showReportingMarker, setShowReportingMarker] = useState(false);
  const [captureThreatPhoto, setCapturedThreatPhoto] = useState<string | null>(null);
  const [showCameraScreen, setShowCameraScreen] = useState(false);


  const [isDraggingThreat, setIsDraggingThreat] = useState(false);
  const [draggedThreatLocation, setDraggedThreatLocation] = useState(null);
  const [showLocationConfirmation, setShowLocationConfirmation] = useState(false);
  const draggedThreatRef = useRef<{ latitude: number, longitude: number } | null>(null);


  const firstBottomSheetRef = useRef<BottomSheet>(null);
  const secondBottomSheetRef = useRef<BottomSheet>(null);
  const thirdBottomSheetRef = useRef<BottomSheet>(null);

  const cameraBottomSheetRef = useRef<BottomSheet>(null);

  const [firstBottomSheetSnapIndex, setFirstBottomSheetSnapIndex] = useState(0);
  const [isSafeZoneCreationMode, setIsSafeZoneCreationMode] = useState(false);

  // SafeZone states
  const [isThreatDetailsOpen, setIsThreatDetailsOpen] = useState(false);
  const [showSetSafeZonePopup, setShowSetSafeZonePopup] = useState(false);
  const [showHeadsUpPopup, setShowHeadsUpPopup] = useState(false);
  const [pendingMarkerLocation, setPendingMarkerLocation] = useState<any>(null);
  const [showConfirmationSheet, setShowConfirmationSheet] = useState(false);
  const [showRadarPopup, setShowRadarPopup] = useState(false);

  const [draggedSafeZone, setDraggedSafeZone] = useState<any>(null);
  const [tempLocation, setTempLocation] = useState<any>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [draggedSafeZoneId, setDraggedSafeZoneId] = useState<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizingSafeZoneId, setResizingSafeZoneId] = useState<number | null>(null);
  const [initialRadius, setInitialRadius] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [inSZ, setInSZ] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<any>('');
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [searchedLocationCoords, setSearchedLocationCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [forceResetSearch, setForceResetSearch] = useState(0); // Add this new state

  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [timeFilterValue, setTimeFilterValue] = useState(24); // Default to 24 hours
  const [filteredThreats, setFilteredThreats] = useState<any[]>([]);
  const [hasCustomTimeFilter, setHasCustomTimeFilter] = useState(false);

  // Threat details bottom sheet state
  const [selectedThreatDetails, setSelectedThreatDetails] = useState<ThreatDetails | null>(null);
  const threatDetailsBottomSheetRef = useRef<BottomSheet>(null);

  const threatAlertMode = useSelector(
    (state: RootState) => state.home.threatAlertMode,
  );

  const headsUpRadius = useSelector((state: RootState) => state.home.headsUpRadius || 3);
  //
  const [threatsWithinRadius, setThreatsWithinRadius] = useState<any[]>([]);
  //Friends Bottomsheet
  const [showFriendsSheet, setShowFriendsSheet] = useState(false);
  const friendsBottomSheetRef = useRef<BottomSheet>(null);

  // Get reported threat from navigation params
  const reportedThreat = route?.params?.reportedThreat;
  const showThreatDetails = route?.params?.showThreatDetails;

  //
  const [showMapButtonsDropdown, setShowMapButtonsDropdown] = useState(false);
  const [isSpookyActive, setIsSpookyActive] = useState(true);

  const [currentLocation, setCurrentLocation] = useState({
    latitude: userCoordinates?.latitude || 37.78825,
    longitude: userCoordinates?.longitude || -122.4324,
  });
  const [mapType, setMapType] = useState<any>('standard');

  const mainMapButtons = [
    {
      id: 'addFriend',
      image: Images.AddFriend,
      onPress: () => {
        console.log('Add friend button pressed');
        setShowFriendsSheet(true);
        setTimeout(() => {
          friendsBottomSheetRef.current?.expand();
        }, 100);
      },
    },
    {
      id: 'ellipsis',
      isEllipsis: true,
      onPress: () => {
        setShowMapButtonsDropdown(!showMapButtonsDropdown);
      }
    }
  ]

  const dropdownButtons = [
    {
      id: '1',
      image: Images.Layers,
      onPress: () => {
        setMapType(mapType === 'standard' ? 'satellite' : 'standard');
        setShowMapButtonsDropdown(false);
      },
    },
    {
      id: '2',
      image: Images.House,
      onPress: () => {
        console.log('SafeZone button pressed - showing popup');
        setShowSetSafeZonePopup(true);
        setIsSafeZoneCreationMode(true);
        setShowMapButtonsDropdown(false);

        if (activeSheet === 'first') {
          firstBottomSheetRef.current?.close();
          setActiveSheet('none');
        }
      },
    },
    {
      id: '5',
      image: Images.Clock,
      onPress: () => {
        console.log('Time filter button pressed');
        if (hasCustomTimeFilter) {
          setHasCustomTimeFilter(false);
          setTimeFilterValue(24);
          setShowTimeFilter(false);
        } else {
          setShowTimeFilter(!showTimeFilter);
        }
        setShowMapButtonsDropdown(false);
      },
    },
    {
      id: '4',
      image: threatAlertMode ? Images.OnAlert : Images.OffAlert,
      onPress: () => {
        console.log('Alert button pressed - showing heads up popup');
        const hasThreats = threats.length > 0;
        if (!threatAlertMode && !hasThreats) {
          Alert.alert(
            'No Threats Found',
            'There are currently no threats on the map to alert about.',
            [{ text: 'OK' }]
          );
          setShowMapButtonsDropdown(false);
          return;
        }

        setShowHeadsUpPopup(true);
        setTimeout(() => {
          setShowHeadsUpPopup(false);
        }, 3000);

        dispatch(HomeActions.setThreatAlertMode(!threatAlertMode));
        setShowMapButtonsDropdown(false);
      },
    },
  ];

  const locationButton = [
    {
      id: '4',
      image: Images.MainLocation,
      onPress: () => {
        getCurrentLocation();
      },
    },
  ];

  const spookyButton = [
    {
      id: '1',
      image: isSpookyActive ? Images.Spooky : Images.Signal,
      onPress: () => {
        setIsSpookyActive(!isSpookyActive); // Toggle between true/false
        console.log('Spooky button pressed, now showing:', !isSpookyActive ? 'Spooky' : 'Signal');
      },
    },
  ];

  const getDefaultFilterTime = (threat: any): number => {
    if (threat.threat_type === 'mass_event' || threat.report_type === 'mass_event') {
      return 2;
    }
    return 0.67;
  }

  const filterThreatsByTime = useCallback((allThreats: any[], hours: number, isUserSliding: boolean = false) => {
    const now = new Date();

    return allThreats.filter(threat => {
      if (!threat.timestamp) return true; // Show threats without timestamp

      const threatTime = new Date(threat.timestamp);
      const threatAgeHours = (now.getTime() - threatTime.getTime()) / (1000 * 60 * 60);

      if (isUserSliding) {
        // When user is actively using the slider, respect their selection
        return threatAgeHours <= hours;
      } else {
        // Default behavior: use different time limits based on threat type
        const defaultTimeLimit = getDefaultFilterTime(threat);
        return threatAgeHours <= defaultTimeLimit;
      }
    });
  }, []);

  const debouncedMapAnimation = useCallback(
    debounce((region: any) => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
    }, 300),
    []
  );

  const filterThreatsByRadius = useCallback((allThreats: any[], userLocation: any, radius: number) => {
    if (!userLocation?.latitude || !userLocation?.longitude) {
      return [];
    }

    return allThreats.filter(threat => {
      if (!threat.latitude || !threat.longitude) return false;

      return isThreatWithinRadius(
        userLocation.latitude,
        userLocation.longitude,
        threat.latitude,
        threat.longitude,
        radius
      );
    });
  }, []);

  const createPinchGesture = (safeZone: any) => {
    return Gesture.Pinch()
      .onBegin(() => {
        setIsResizing(true);
        setResizingSafeZoneId(safeZone.id);
        setInitialRadius(safeZone.radius);
        console.log('Started resizing safe zone:', safeZone.id, 'Initial radius:', safeZone.radius);
      })
      .onUpdate((event) => {
        if (isResizing && resizingSafeZoneId === safeZone.id) {
          const newRadius = Math.max(10, Math.min(500, initialRadius * event.scale));
          setSafeZones(prevZones =>
            prevZones.map(zone =>
              zone.id === safeZone.id
                ? { ...zone, radius: newRadius }
                : zone
            )
          );
        }
      })
      .onEnd(() => {
        if (isResizing && resizingSafeZoneId === safeZone.id) {
          const currentZone = safeZones.find(z => z.id === safeZone.id);
          if (currentZone) {
            updateSafeZoneRadius(safeZone.id, currentZone.radius);
          }
        }
        setIsResizing(false);
        setResizingSafeZoneId(null);
        setInitialRadius(0);
      })
      .runOnJS(true);
  };

  function calculateDistance(lat1: any, lon1: any, lat2: any, lon2: any) {
    const R = 6371e3;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Function to get threat icon by type
  const getThreatIcon = (reportType: string) => {
    const iconMap: { [key: string]: any } = {
      'harassment': Images.Harasment,
      'followed': Images.Followed,
      'fight': Images.Fight,
      'stabbing': Images.Stabing,
      'shooting': Images.Shooter,
      'mass_event': Images.Danger,
      'automated_alert': Images.HomeActive,
    };
    return iconMap[reportType] || Images.Incident;
  };

  // Function to get street name from coordinates
  const getStreetName = async (latitude: number, longitude: number): Promise<string> => {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const handleTimeFilterChange = useCallback((value: number) => {
    setTimeFilterValue(value);
    setHasCustomTimeFilter(true); // Mark that user has set a custom filter
  }, []);

  // Function to handle threat marker tap
  const handleThreatMarkerPress = async (threat: any) => {
    const streetName = await getStreetName(threat.latitude, threat.longitude);
    const realThreatId = threat.realId || threat.id;

    const threatDetails: ThreatDetails = {
      id: realThreatId,
      realId: threat.realId,
      icon: threat.icon || getThreatIcon(threat.threat_type || 'General'),
      label: threat.threat_type || 'General Threat',
      streetName: streetName,
      image: threat.image,
      photo_urls: threat.photo_urls || [], // Include all photos
      timestamp: threat.timestamp,
      created_at: threat.created_at,
      description: threat.description,
      latitude: threat.latitude,
      longitude: threat.longitude,
      user: threat.user,
      is_automated: threat.is_automated || false,
    };

    setSelectedThreatDetails(threatDetails);
    setIsThreatDetailsOpen(true);
    setTimeout(() => {
      threatDetailsBottomSheetRef.current?.expand();
    }, 100);
  };

  // Function to close threat details bottom sheet
  const closeThreatDetails = () => {
    threatDetailsBottomSheetRef.current?.close();
    setSelectedThreatDetails(null);
    setIsThreatDetailsOpen(false);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (showTimeFilter || hasCustomTimeFilter) {
      // User is actively using the time filter OR has set a custom filter
      const timeFiltered = filterThreatsByTime(threats, timeFilterValue, true);
      const radiusFiltered = filterThreatsByRadius(timeFiltered, currentLocation, headsUpRadius);
      setFilteredThreats(radiusFiltered);
      setThreatsWithinRadius(radiusFiltered);
    } else {
      // Default filtering (40 min for regular, 2 hours for danger)
      const timeFiltered = filterThreatsByTime(threats, 0, false);
      const radiusFiltered = filterThreatsByRadius(timeFiltered, currentLocation, headsUpRadius);
      setFilteredThreats(radiusFiltered);
      setThreatsWithinRadius(radiusFiltered);
    }
  }, [threats, timeFilterValue, showTimeFilter, hasCustomTimeFilter, filterThreatsByTime, filterThreatsByRadius, currentLocation, headsUpRadius]);

  useEffect(() => {
    getCurrentLocation();
  }, [isFocus]);

  // useFocusEffect(
  //   React.useCallback(() => {
  //     dispatch(HomeActions.setCameraMode('AUDIO'));
  //   }, [dispatch])
  // );

  // Add this useEffect near the top of the component
  // useFocusEffect(
  //   React.useCallback(() => {
  //     dispatch(HomeActions.setCurrentScreen('HeadsUp'));
  //     return () => {
  //       dispatch(HomeActions.setCurrentScreen('TabStack'));
  //     };
  //   }, [dispatch])
  // );

  useEffect(() => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      getZones();
      loadThreats();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (userCoordinates?.latitude && userCoordinates?.longitude && safeZones.length >= 0) {
      checkSafeZoneStatus(safeZones);
    }
  }, [safeZones, userCoordinates]);

  useEffect(() => {
    if (threatAlertMode && threats.length === 0) {
      dispatch(HomeActions.setThreatAlertMode(false));
    }
  }, [threats, threatAlertMode, dispatch]);

  useEffect(() => {
    if (isFocus && !showDramaModal && !isSafeZoneCreationMode) { // Added !isSafeZoneCreationMode
      const timer = setTimeout(() => {
        if (activeSheet === 'none') {
          setActiveSheet('first');
          firstBottomSheetRef.current?.snapToIndex(0);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFocus, showDramaModal, activeSheet, isSafeZoneCreationMode]);

  useEffect(() => {
    if (dramaModalShown) {
      setShowDramaModal(false);
    }
  }, [dramaModalShown]);

  // Handle reported threat from navigation params
  useEffect(() => {
    if (reportedThreat) {
      console.log('Received reported threat:', reportedThreat);
      checkAndRemoveConflictingSafeZones(reportedThreat.latitude, reportedThreat.longitude);

      // Ensure the reported threat has the user ID
      const threatWithUserId = {
        ...reportedThreat,
        user: reportedThreat.user || userData?.user?.id,
        created_at: reportedThreat.created_at || reportedThreat.timestamp,
      };

      setThreats(prevThreats => {
        const existingThreat = prevThreats.find(t => t.id === threatWithUserId.id);
        if (!existingThreat) {
          console.log('Adding new threat to HeadsUp map');
          return [...prevThreats, threatWithUserId];
        }
        return prevThreats;
      });

      if (mapRef.current && threatWithUserId.latitude && threatWithUserId.longitude) {
        setTimeout(() => {
          mapRef.current.animateToRegion({
            latitude: threatWithUserId.latitude,
            longitude: threatWithUserId.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }, 500);
      }

      createThreadZone(
        threatWithUserId.latitude,
        threatWithUserId.longitude,
        threatWithUserId.description || `${threatWithUserId.threat_type} reported`,
        threatWithUserId.description,
        threatWithUserId.image
      );
    }
  }, [reportedThreat, showThreatDetails, userData?.user?.id]);

  const startFlow = useCallback(() => {
    setShowDramaModal(false);
    dispatch(HomeActions.setDramaModalShown(true));
    setTimeout(() => {
      setActiveSheet('first');
      // firstBottomSheetRef.current?.expand();
      firstBottomSheetRef.current?.snapToIndex(0);
    }, 300);
  }, [dispatch]);

  const handleTempThreatSelection = useCallback((threatData: { id: number, icon: any, label: string, message: string }) => {
    setTempThreatData(threatData);
    console.log('🎯 INITIAL THREAT SETUP - Setting to current location:', currentLocation);

    setDraggedThreatLocation(currentLocation);
    setShowReportingMarker(true);
    moveToSecondSheet();
  }, [currentLocation]);

  const moveToSecondSheet = useCallback(() => {
    firstBottomSheetRef.current?.close();
    setTimeout(() => {
      console.log('🎬 MOVING TO SECOND SHEET');
      console.log('📱 Setting activeSheet to "second"');
      setActiveSheet('second');
      secondBottomSheetRef.current?.expand();

      // Check the state after a moment
      setTimeout(() => {
        console.log('🔍 STATE CHECK after moveToSecondSheet:', {
          activeSheet: 'should be second',
          showReportingMarker,
          tempThreatData: !!tempThreatData,
          draggedThreatLocation
        });
      }, 500);
    }, 300);
  }, [showReportingMarker, tempThreatData, draggedThreatLocation]);

  const moveToThirdSheet = useCallback(() => {
    setShowReportingMarker(true);
    setShowLocationConfirmation(true);
    secondBottomSheetRef.current?.close();
    setTimeout(() => {
      setShowCameraScreen(true); // Show camera screen instead of bottom sheet
      setActiveSheet('camera');
    }, 300);
  }, [draggedThreatLocation]);

  const moveFromCameraToThird = useCallback((photoUri: string) => {
    setCapturedThreatPhoto(photoUri);
    setShowCameraScreen(false);

    // Navigate to new screen instead of opening bottom sheet
    NavigationService.navigate(RouteNames.HomeRoutes.ThreatReportScreen, {
      onComplete: confirmThreatLocation,
      selectedThreat: tempThreatData,
      shouldAutoFocus: true,
      capturedPhoto: photoUri,
    });

    setActiveSheet('none'); // Reset active sheet
  }, [confirmThreatLocation, tempThreatData]);

  const moveFromCameraToThirdWithoutPhoto = useCallback(() => {
    console.log('Moving from camera to third screen without photo');
    setShowCameraScreen(false);

    // Navigate to new screen instead of opening bottom sheet
    NavigationService.navigate(RouteNames.HomeRoutes.ThreatReportScreen, {
      onComplete: confirmThreatLocation,
      selectedThreat: tempThreatData,
      shouldAutoFocus: true,
      capturedPhoto: null,
    });

    setActiveSheet('none'); // Reset active sheet
  }, [confirmThreatLocation, tempThreatData]);

  const handleThreatDragStart = useCallback(() => {
    setIsDraggingThreat(true);
  }, []);

  const handleThreatDragEnd = useCallback((event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    // 🔍 DEBUG: Log the dragged coordinates
    console.log('🚚 THREAT DRAGGED - Final coordinates:', {
      latitude,
      longitude,
      currentLocation: currentLocation,
      difference: {
        latDiff: Math.abs(latitude - currentLocation.latitude),
        lngDiff: Math.abs(longitude - currentLocation.longitude)
      }
    });

    setDraggedThreatLocation({ latitude, longitude });
    setIsDraggingThreat(false);
  }, [currentLocation]);

  const closeCameraSheet = useCallback(() => {
    setShowCameraScreen(false); // Hide camera screen
    setActiveSheet('none');
    setTempThreatData(null);
    setShowReportingMarker(false);
    setIsDraggingThreat(false);
    setDraggedThreatLocation(null);
    setCapturedThreatPhoto(null);
  }, []);


  const closeAllSheets = useCallback(() => {
    firstBottomSheetRef.current?.close();
    secondBottomSheetRef.current?.close();
    cameraBottomSheetRef.current?.close();
    // Remove thirdBottomSheetRef.current?.close(); since it's no longer a bottom sheet
    setActiveSheet('none');
    setTempThreatData(null);
    setShowReportingMarker(false);
    setIsDraggingThreat(false);
    setDraggedThreatLocation(null);
    setCapturedThreatPhoto(null);
  }, []);

  const closeFriendsSheet = useCallback(() => {
    friendsBottomSheetRef.current?.close();
    setShowFriendsSheet(false);
  }, []);

  const confirmThreatLocation = useCallback((additionalDetails?: string, image?: string) => {
    const finalCoords = draggedThreatRef.current || draggedThreatLocation || currentLocation;

    console.log("🚀 FINAL THREAT COORDINATES:", finalCoords);
    console.log("📝 RECEIVED DESCRIPTION:", additionalDetails); // Add this log

    if (!tempThreatData) {
      console.warn("⚠ No threat type selected.");
      return;
    }

    const now = new Date().toISOString();

    // Use the provided description if available, otherwise use fallback
    const threatDescription = additionalDetails && additionalDetails.trim()
      ? additionalDetails.trim()
      : `${tempThreatData.label} reported`;

    const newThreat = {
      id: Date.now(), // temporary client-side ID
      latitude: finalCoords.latitude,
      longitude: finalCoords.longitude,
      timestamp: now,
      created_at: now,
      description: threatDescription, // ← Use the properly determined description
      threat_type: tempThreatData.label,
      report_type: tempThreatData.label.toLowerCase(),
      image,
      icon: tempThreatData.icon,
      user: userData?.user?.id,
    };

    console.log("📦 Creating Threat Object →", newThreat);

    // Add instantly to UI
    setThreats(prev => [...prev, newThreat]);

    // Send to backend with the correct description
    createThreadZone(
      finalCoords.latitude,
      finalCoords.longitude,
      threatDescription, // ← Use the actual description here
      threatDescription, // ← And here too
      newThreat.image,
      newThreat.id
    );

    // Reset UI and close sheets
    closeAllSheets();

    // Center map on new threat
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.animateToRegion({
          latitude: finalCoords.latitude,
          longitude: finalCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }, 500);
    }
  }, [
    draggedThreatLocation,
    tempThreatData,
    userData?.user?.id,
    currentLocation,
    closeAllSheets
  ]);

  const handleSheetChange = useCallback((index: number, sheetType: 'first' | 'second' | 'camera' | 'third') => {
    if (index === -1) {
      if (activeSheet === sheetType) {
        // Don't change activeSheet during SafeZone creation mode
        if (!isSafeZoneCreationMode) {
          setActiveSheet('none');
        }

        if (sheetType === 'first') {
          setTempThreatData(null);
          setShowReportingMarker(false);
          setFirstBottomSheetSnapIndex(0);
        }
      }
    } else if (sheetType === 'first') {
      setFirstBottomSheetSnapIndex(index);
      console.log(`First bottom sheet at snap point: ${index === 0 ? 'collapsed' : 'expanded'}`);
    }
  }, [activeSheet, isSafeZoneCreationMode]);


  const getZones = async (retryCount = 0, maxRetries = 3) => {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'Retry', onPress: () => getZones() }, { text: 'Cancel' }]
      );
      return;
    }

    setLoading(true);

    try {
      const res = await HomeAPIS.getSafeZones();

      // Success handling - your existing logic
      let array: any = [];
      const currentTime = Date.now();

      res?.data?.map((item: any) => {
        const createdTime = new Date(item.created_at || item.timestamp).getTime();
        const isRecent = currentTime - createdTime < 10000;

        array?.push({
          id: item?.id,
          name: item?.name || 'safezone',
          address: item?.address,
          image: Images.Target,
          location: {
            latitude: parseFloat(item?.latitude),
            longitude: parseFloat(item?.longitude),
          },
          radius: parseInt(item?.radius),
          type: isRecent ? 'new' : 'existing',
          is_active: item?.is_active,
          zone_type: item?.zone_type,
        });
      });

      const isInSafeZone = array.find((zone: any) => {
        const distance = calculateDistance(
          userCoordinates?.latitude,
          userCoordinates?.longitude,
          zone.location.latitude,
          zone.location.longitude,
        );
        return distance <= zone.radius;
      });

      if (isInSafeZone) {
        setInSZ(true);
        dispatch(HomeActions.setInSafeZone(true));
      } else {
        setInSZ(false);
        dispatch(HomeActions.setInSafeZone(false));
      }

      setSafeZones(array);
      setLoading(false);

      // Reset retry count on success
      if (retryCount > 0) {
        console.log('✅ Safe zones loaded successfully after retry');
      }

    } catch (err) {
      console.log('❌ Error fetching safe zones:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        code: err?.code,
        config: err?.config?.url,
        attempt: retryCount + 1
      });

      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

        // Don't set loading to false here, keep it loading during retry
        setTimeout(() => {
          getZones(retryCount + 1, maxRetries);
        }, delay);
      } else {
        setLoading(false);

        // Show different messages based on error type
        let errorMessage = 'Failed to load safe zones after multiple attempts. Please check your connection.';

        if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('timeout')) {
          errorMessage = 'Network timeout after multiple attempts. Please check your internet connection and try again.';
        } else if (err?.response?.status >= 500) {
          errorMessage = 'Server error after multiple attempts. Please try again later.';
        } else if (err?.response?.status === 401 || err?.response?.status === 403) {
          errorMessage = 'Authentication error. Please log in again.';
        }

        Alert.alert(
          'Load Error',
          errorMessage,
          [
            { text: 'Retry', onPress: () => getZones(0, maxRetries) }, // Reset retry count
            { text: 'Cancel' }
          ]
        );
      }
    }
  };

  const loadThreats = async (retryCount = 0, maxRetries = 3) => {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'Retry', onPress: () => loadThreats() }, { text: 'Cancel' }]
      );
      return;
    }

    try {
      const response = await HomeAPIS.getThreatReports();

      // Your existing logic - unchanged
      if (!response?.data?.results) return;

      console.log("📍 API Threat Results Loaded:", response.data.results.length);

      const normalizedThreats = response.data.results.map((item: any) => ({
        id: item.id,
        realId: item.id,
        latitude: item.latitude ? parseFloat(item.latitude) : null,
        longitude: item.longitude ? parseFloat(item.longitude) : null,
        timestamp: item.created_at,
        created_at: item.created_at,
        description: item.description || "Threat reported",
        threat_type: item.report_type,
        image: item.photo_urls?.length > 0 ? item.photo_urls[0] : null,
        photo_urls: item.photo_urls || [],
        icon: getThreatIcon(item.report_type),
        confirm_votes: item.confirm_votes,
        deny_votes: item.deny_votes,
        user_vote: item.user_vote,
        user: item.user,
        is_automated: item.report_type === "automated_alert"
      }));

      setThreats(prev => {
        // Remove any temporary item that was replaced
        const withoutConflictingTemp = prev.filter(
          t => !normalizedThreats.some(newT => newT.id === t.id)
        );

        // Merge backend results with kept temp items
        return [...withoutConflictingTemp, ...normalizedThreats];
      });

      console.log("✅ Threat state updated after sync.");

      // Reset retry count on success
      if (retryCount > 0) {
        console.log('✅ Threats loaded successfully after retry');
      }

    } catch (error) {
      console.log('❌ Error loading threat reports:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        code: error?.code,
        config: error?.config?.url,
        attempt: retryCount + 1
      });

      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retrying threats in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

        setTimeout(() => {
          loadThreats(retryCount + 1, maxRetries);
        }, delay);
      } else {
        // Show different messages based on error type
        let errorMessage = 'Failed to load threats after multiple attempts. Please check your connection.';

        if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('timeout')) {
          errorMessage = 'Network timeout after multiple attempts. Please check your internet connection and try again.';
        } else if (error?.response?.status >= 500) {
          errorMessage = 'Server error after multiple attempts. Please try again later.';
        } else if (error?.response?.status === 401 || error?.response?.status === 403) {
          errorMessage = 'Authentication error. Please log in again.';
        }

        Alert.alert(
          'Load Error',
          errorMessage,
          [
            { text: 'Retry', onPress: () => loadThreats(0, maxRetries) }, // Reset retry count
            { text: 'Cancel' }
          ]
        );
      }
    }
  };

  const createThreadZone = async (
    latitude: number,
    longitude: number,
    address: string,
    additionalDetails?: string,
    image?: string,
    tempId?: number
  ) => {
    try {
      const threatTypeMap: { [key: string]: string } = {
        'Harassment': 'harassment',
        'Followed': 'followed',
        'Fight': 'fight',
        'Stabbing': 'stabbing',
        'Shooting': 'shooting',
        'Mass event': 'mass_event',
      };

      // 1. Create threat without photo first
      const threatData = {
        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        description: additionalDetails || address,
        report_type: threatTypeMap[tempThreatData?.label] || 'harassment',
        user_id: userData?.user?.id,
        timestamp: new Date().toISOString(),
        // No photo field - create threat without image first
      };

      console.log('Saving threat report to backend (without photo):', threatData);
      const response = await HomeAPIS.sendThreatReports(threatData);
      console.log('Threat report saved to backend successfully:', response.data);

      // 2. If there's a photo, add it immediately after threat creation
      if (image && response.data?.id) {
        try {
          console.log('Adding photo to newly created threat:', response.data.id);
          const photoResponse = await HomeAPIS.addPhotosToThreatReport(response.data.id, [image]);
          console.log('Photo added successfully to threat:', photoResponse.data);
        } catch (photoError) {
          console.error('Error adding photo to threat:', photoError);
          // Don't fail the entire process if photo upload fails
          Alert.alert(
            'Threat Created',
            'Threat was created successfully, but the photo could not be uploaded. You can add photos later from the threat details.',
            [{ text: 'OK' }]
          );
        }
      }

      // 3. Update threat with real ID from backend response
      if (response.data?.id && tempId) {
        console.log('🔄 Updating threat with real ID:', response.data.id);
        setThreats(prevThreats =>
          prevThreats.map(threat =>
            threat.id === tempId
              ? {
                ...threat,
                id: response.data.id, // Update with real UUID
                realId: response.data.id, // Store as backup
              }
              : threat
          )
        );
      }

      // // 4. Reload threats to get the complete data including any photos
      // setTimeout(() => {
      //   loadThreats();
      // }, 1000);

    } catch (error) {
      console.error('Error creating threat report:', error);
      Alert.alert('Error', 'Failed to save threat report. Please try again.');
    }
  };

  const checkAndRemoveConflictingSafeZones = async (threatLat: number, threatLng: number) => {
    const conflictingZones: any[] = [];
    const CONFLICT_DISTANCE = 50;

    console.log(`Checking for safe zones within ${CONFLICT_DISTANCE}m of threat at (${threatLat}, ${threatLng})`);

    safeZones.forEach((zone: any) => {
      const distance = calculateDistance(
        threatLat,
        threatLng,
        zone.location.latitude,
        zone.location.longitude
      );

      if (distance <= CONFLICT_DISTANCE) {
        console.log(`Found conflicting safe zone at distance: ${distance.toFixed(1)}m`);
        conflictingZones.push(zone);
      }
    });

    if (conflictingZones.length > 0) {
      console.log(`Removing ${conflictingZones.length} conflicting safe zone(s)`);
      Alert.alert(
        'Safe Zone Replaced',
        `A safe zone within 50 meters of the reported threat has been removed for community safety.`,
        [{ text: 'OK' }]
      );

      const deletePromises = conflictingZones.map(async (zone) => {
        try {
          await HomeAPIS.deleteSafeZone(zone.id);
          return zone.id;
        } catch (error) {
          console.error('Error deleting conflicting safe zone:', error);
          return null;
        }
      });

      const deletedZoneIds = await Promise.all(deletePromises);
      const successfullyDeleted = deletedZoneIds.filter(id => id !== null);

      setSafeZones(prevZones => {
        const remainingZones = prevZones.filter(zone =>
          !successfullyDeleted.includes(zone.id)
        );
        setTimeout(() => {
          checkSafeZoneStatus(remainingZones);
        }, 100);
        return remainingZones;
      });

      setTimeout(() => {
        setInSZ(false);
        dispatch(HomeActions.setInSafeZone(false));
      }, 200);
    }
  };

  const createSafeZone = useCallback((lat: any, lng: any, address: any, radius: number = 20) => {
    // Prevent multiple rapid calls
    if (loading) {
      console.log('Already creating safe zone, ignoring duplicate call');
      return;
    }

    setLoading(true);

    const body = {
      name: 'safezone',
      latitude: lat?.toFixed(6),
      longitude: lng?.toFixed(6),
      radius: radius,
      address: address,
      is_active: true,
      zone_type: 'home',
      user: userData?.user?.id,
    };

    HomeAPIS.createSafeZones(body)
      .then(res => {
        console.log('Safe zone created successfully');
        setTimeout(() => {
          getZones();
          setLoading(false);
        }, 1000);
      })
      .catch(err => {
        console.log('Error creating safe zone:', err?.response?.data);
        setLoading(false);
      });
  }, [loading, userData?.user?.id]);

  const updateSafeZoneRadius = async (safeZoneId: number, newRadius: number) => {
    try {
      const clampedRadius = Math.max(10, Math.min(500, Math.round(newRadius)));
      const currentZone = safeZones.find(zone => zone.id === safeZoneId);
      if (!currentZone) {
        throw new Error('Safe zone not found');
      }

      setSafeZones(prevZones =>
        prevZones.map(zone =>
          zone.id === safeZoneId
            ? { ...zone, radius: clampedRadius }
            : zone
        )
      );
    } catch (error) {
      console.error('❌ Error updating safe zone radius:', error);
      Alert.alert(
        'Update Failed',
        'Failed to update safe zone size. Please try again.',
        [{ text: 'OK' }]
      );
      getZones();
    }
  };

  const handleDeleteThreat = useCallback(async (threatId: string) => {
    try {
      console.log('Deleting threat:', threatId);

      // Call your delete API here
      // await HomeAPIS.deleteThreatReport(threatId);

      // Remove from local state
      setThreats(prevThreats => prevThreats.filter(threat => threat.id.toString() !== threatId));
      setFilteredThreats(prevFiltered => prevFiltered.filter(threat => threat.id.toString() !== threatId));

      console.log('Threat deleted successfully');
    } catch (error) {
      console.error('Error deleting threat:', error);
      Alert.alert('Error', 'Failed to delete threat report. Please try again.');
    }
  }, []);

  const deleteZone = (id: any) => {
    console.log('DeleteZone called with ID:', id);
    setLoading(true);
    HomeAPIS.deleteSafeZone(id)
      .then(res => {
        const updatedZones = safeZones.filter(zone => zone.id !== id);
        setSafeZones(updatedZones);
        setInSZ(false);
        dispatch(HomeActions.setInSafeZone(false));
        setTimeout(() => {
          checkSafeZoneStatus(updatedZones);
        }, 1000);
        setLoading(false);
      })
      .catch(err => {
        console.log('Delete error:', err?.response?.data);
        Alert.alert('Error', 'Failed to delete safe zone. Please try again.');
        setLoading(false);
      });
  };

  const checkSafeZoneStatus = (zones = safeZones) => {
    if (!userCoordinates?.latitude || !userCoordinates?.longitude) {
      setInSZ(false);
      dispatch(HomeActions.setInSafeZone(false));
      return;
    }

    const isInSafeZone = zones.find((zone: any) => {
      const distance = calculateDistance(
        userCoordinates?.latitude,
        userCoordinates?.longitude,
        zone.location.latitude,
        zone.location.longitude,
      );
      return distance <= zone.radius;
    });

    if (isInSafeZone) {
      console.log('User is in a safe zone:', isInSafeZone.name || 'Unnamed zone');
      setInSZ(true);
      dispatch(HomeActions.setInSafeZone(true));
    } else {
      console.log('User is NOT in any safe zone');
      setInSZ(false);
      dispatch(HomeActions.setInSafeZone(false));
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'HeadsUp needs access to your location to mark threats',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handlePlaceSelection = useCallback((data: any, details: any) => {
    if (!details?.geometry?.location) {
      console.error('No location details available');
      return;
    }

    const newLocation = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };

    // Just close and update - no complex logic
    setModalVisible(false);
    setSearchedLocation(details.formatted_address);
    setSearchedLocationCoords(newLocation);

    // Animate to new location
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            ...newLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      }
    }, 500);
  }, []);

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          const newLocation = {
            latitude: latitude,
            longitude: longitude,
          };

          setCurrentLocation(newLocation);
          dispatch(HomeActions.setUserLocation({ latitude, longitude }));
          setSearchedLocation(''); // Clear search text
          setSearchedLocationCoords(null); // ✅ Clear searched coordinates
          setForceResetSearch(prev => prev + 1); // Force reset here too
          setIsLocationReady(true);

          // Use debounced animation
          debouncedMapAnimation({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        },
        error => {
          console.error('Location error:', error);
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please check your location settings.',
          );
          setIsLocationReady(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    }
  };

  const handleMapPress = useCallback((event) => {
    if (showTimeFilter) {
      setShowTimeFilter(false);
      return;
    }

    // Close dropdown if open
    if (showMapButtonsDropdown) {
      setShowMapButtonsDropdown(false);
      return;
    }

    // Only allow placement when selecting a threat type
    if (activeSheet === 'second' && showReportingMarker && tempThreatData) {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      console.log("📍 Map tapped. New Threat Coordinates:", { latitude, longitude });

      const newCoords = { latitude, longitude };
      setDraggedThreatLocation(newCoords);
      draggedThreatRef.current = newCoords;
    }
  }, [
    activeSheet,
    showReportingMarker,
    tempThreatData,
    showTimeFilter,
    showMapButtonsDropdown  // Add this dependency
  ]);

  const handleConfirmSafeZone = async () => {
    if (pendingMarkerLocation) {
      const address = await getStreetName(pendingMarkerLocation.latitude, pendingMarkerLocation.longitude);
      createSafeZone(pendingMarkerLocation.latitude, pendingMarkerLocation.longitude, address, 30);
      setPendingMarkerLocation(null);
      setShowConfirmationSheet(false);
      setIsSafeZoneCreationMode(false); // EXIT SafeZone creation mode

      // Restore FirstBottomSheet
      setActiveSheet('first');
      setTimeout(() => {
        firstBottomSheetRef.current?.snapToIndex(0);
      }, 500);
    }
  };

  const handleCancelSafeZone = () => {
    setPendingMarkerLocation(null);
    setShowConfirmationSheet(false);
    setIsSafeZoneCreationMode(false); // EXIT SafeZone creation mode

    // Restore FirstBottomSheet
    setActiveSheet('first');
    setTimeout(() => {
      firstBottomSheetRef.current?.snapToIndex(0);
    }, 300);
  };

  const deleteAlert = (item: any) => {
    console.log('DeleteAlert called with item:', item);
    Alert.alert(
      'Delete Safe Zone!',
      `Are you sure you want to delete this safe zone?`,
      [
        {
          text: 'YES',
          onPress: () => {
            console.log('Deleting zone with ID:', item?.id);
            deleteZone(item?.id);
          },
        },
        {
          text: 'No',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  const formatTimeLabel = (hours: number): string => {
    if (hours < 24) {
      return `${hours}h`;
    } else if (hours < 24 * 7) {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    } else if (hours < 24 * 30) {
      const weeks = Math.floor(hours / (24 * 7));
      return `${weeks}w`;
    } else {
      const months = Math.floor(hours / (24 * 30));
      return `${months}m`;
    }
  };

  const handleThreatImageAdded = useCallback((threatId: string, response: any) => {
    console.log('🔄 Updating threat with new images:', threatId, response);

    // Update the threats state with new image data
    setThreats(prevThreats =>
      prevThreats.map(threat => {
        if (threat.id === threatId || threat.realId === threatId) {
          return {
            ...threat,
            // FIXED: Keep the original image, only update photo_urls with all photos
            photo_urls: response.threat_report?.photo_urls || [], // All photos from backend
            // Don't change the main 'image' field if it already exists (preserves original)
            ...(threat.image ? {} : { image: response.threat_report?.photo_urls?.[0] })
          };
        }
        return threat;
      })
    );

    // Also update filteredThreats
    setFilteredThreats(prevFiltered =>
      prevFiltered.map(threat => {
        if (threat.id === threatId || threat.realId === threatId) {
          return {
            ...threat,
            photo_urls: response.threat_report?.photo_urls || [],
            ...(threat.image ? {} : { image: response.threat_report?.photo_urls?.[0] })
          };
        }
        return threat;
      })
    );

    // Update selectedThreatDetails if it's the same threat
    if (selectedThreatDetails && (selectedThreatDetails.id === threatId || selectedThreatDetails.realId === threatId)) {
      setSelectedThreatDetails(prev => prev ? {
        ...prev,
        photo_urls: response.threat_report?.photo_urls || [],
        // Keep the original image if it exists
        ...(prev.image ? {} : { image: response.threat_report?.photo_urls?.[0] })
      } : null);
    }
  }, [selectedThreatDetails]);

  const renderSuggestionRows = (rowData: any) => {
    const title = rowData?.structured_formatting?.main_text;
    const address = rowData?.structured_formatting?.secondary_text;
    return (
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <Image
          resizeMode="contain"
          source={Images.Marker}
          style={styles.locMarker}
        />
        <View style={{ left: Metrix.HorizontalSize(10) }}>
          <CustomText.RegularText
            customStyle={{ color: Utills.selectedThemeColors().Base }}>
            {title}
          </CustomText.RegularText>
          <CustomText.SmallText isSecondaryColor>
            {address}
          </CustomText.SmallText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Container from SafeZone */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          onPress={() => {
            setModalVisible(true);
            inputRef?.current?.focus();
          }}
          activeOpacity={0.9}
          style={styles.searchbar}>
          <Image
            resizeMode={'contain'}
            source={Images.Search}
            style={styles.searchIcon}
          />
          <CustomText.RegularText
            numberOfLines={1}
            customStyle={{
              left: Metrix.HorizontalSize(10),
              width: '80%',
              color:
                searchedLocation?.length > 0
                  ? Utills.selectedThemeColors().Base
                  : Utills.selectedThemeColors().SecondaryTextColor,
            }}>
            {searchedLocation?.length > 0 ? searchedLocation : 'Search here'}
          </CustomText.RegularText>
          <TouchableOpacity onPress={() => {
            setModalVisible(false);
            setSearchedLocation('');
            setSearchedLocationCoords(null);
            setTimeout(() => {
              getCurrentLocation();
            }, 300);
          }}>
            <Image
              resizeMode={'contain'}
              source={Images.Cross}
              style={[
                styles.searchIcon,
                { tintColor: Utills.selectedThemeColors().Base, left: 20 },
              ]}
            />
          </TouchableOpacity>

        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          ref={mapRef}
          zoomEnabled={true}
          showsUserLocation={true}
          scrollEnabled={true}
          onPress={handleMapPress}
          region={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          mapType={mapType}
          onRegionChangeComplete={loc => { }}
        >
          {/* Current location marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current position">
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>

          {/* Searched location marker */}
          {searchedLocationCoords && (
            <Marker
              coordinate={searchedLocationCoords}
              title={searchedLocation}
            />
          )}

          {/* Pending SafeZone marker */}
          {pendingMarkerLocation && (
            <Marker
              coordinate={pendingMarkerLocation}
              title="New Safe Zone">
              <View style={styles.pendingMarker}>
                <Image
                  source={Images.SafeZoneWhite}
                  resizeMode="contain"
                  style={styles.pendingMarkerIcon}
                />
              </View>
            </Marker>
          )}

          {/* Safe Zone Markers with Circles */}
          {safeZones?.map((item: any, index: number) => {
            const isNewSafeZone = item.type === 'new';
            const isBeingDragged = draggedSafeZoneId === item.id;
            const isBeingResized = resizingSafeZoneId === item.id;
            const pinchGesture = createPinchGesture(item);

            return (
              <React.Fragment key={`safezone-${item.id}-${index}`}>
                {/* Resizable Circle with Pinch Gesture */}
                <GestureDetector gesture={pinchGesture}>
                  <Circle
                    center={item?.location}
                    radius={item?.radius}
                    strokeWidth={isBeingDragged ? 3 : isBeingResized ? 4 : 0}
                    strokeColor={
                      isBeingDragged
                        ? "rgba(255, 193, 7, 1)"
                        : isBeingResized
                          ? "rgba(46, 204, 113, 1)"
                          : "transparent"
                    }
                    fillColor={
                      isBeingDragged
                        ? "rgba(134,200,252,0.8)"
                        : isBeingResized
                          ? "rgba(46, 204, 113, 0.3)"
                          : "rgba(134,200,252,0.7)"
                    }
                    onPress={() => {
                      if (!isDragging && !isResizing) {
                        deleteAlert(item);
                      }
                    }}
                  />
                </GestureDetector>

                {/* Draggable SafeZone Marker */}
                <Marker
                  coordinate={item?.location}
                  anchor={{ x: 0.5, y: 0.5 }}
                  draggable={!isResizing}
                  onPress={() => {
                    if (!isDragging && !isResizing) {
                      deleteAlert(item);
                    }
                  }}
                  onDragStart={() => {
                    if (!isResizing) {
                      setIsDragging(true);
                      setDraggedSafeZoneId(item.id);
                      console.log('Started dragging safe zone:', item.id);
                    }
                  }}
                  onDragEnd={async (event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    setSafeZones(prevZones =>
                      prevZones.map(zone =>
                        zone.id === item.id
                          ? { ...zone, location: { latitude, longitude } }
                          : zone
                      )
                    );
                    setIsDragging(false);
                    setDraggedSafeZoneId(null);
                  }}
                >
                  <View style={[
                    styles.centeredSafeZoneMarker,
                    isNewSafeZone && styles.newSafeZoneMarker,
                  ]}>
                    <Image
                      source={Images.SafeZoneWhite}
                      resizeMode="contain"
                      style={styles.safeZoneIcon}
                    />
                  </View>
                </Marker>

                {/* Radius Indicator - Show during resize */}
                {isBeingResized && (
                  <View style={[
                    styles.radiusIndicator,
                    {
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: [{ translateX: -50 }, { translateY: -30 }],
                      zIndex: 1000,
                    }
                  ]}>
                    <CustomText.SmallText customStyle={styles.radiusText}>
                      {Math.round(item.radius)}m
                    </CustomText.SmallText>
                  </View>
                )}
              </React.Fragment>
            );
          })}

          {/* Threat Markers */}
          {filteredThreats.map((threat: any, index: number) => (
            <Marker
              key={`threat-${threat.id}-${index}`}
              coordinate={{
                latitude: threat.latitude,
                longitude: threat.longitude,
              }}
              title="Threat Location"
              description={`Reported: ${formatTimestamp(threat.timestamp)}`}
              onPress={() => handleThreatMarkerPress(threat)}>
              <View style={styles.threatMarker}>
                <Image
                  source={threat.icon || getThreatIcon(threat.threat_type)}
                  style={styles.threatIcon}
                  resizeMode="contain"
                />
              </View>
            </Marker>
          ))}

          {/* Draggable threat marker - shown when user confirms reporting */}
          {showReportingMarker && draggedThreatLocation && tempThreatData && (
            <Marker
              coordinate={draggedThreatLocation}
              title="Drag to position threat"
              description="Drag this marker to the exact threat location"
              draggable={true}
              onDragStart={handleThreatDragStart}
              onDragEnd={handleThreatDragEnd}>
              <View style={[
                styles.threatMarkerContainer,
                isDraggingThreat && styles.draggingThreatMarker
              ]}>
                <Image
                  source={tempThreatData.icon}
                  resizeMode="contain"
                  style={styles.threatMarkerIcon}
                />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Map controls */}
        {!isSafeZoneCreationMode &&
          !showTimeFilter && (
            (activeSheet === 'none') ||
            (activeSheet === 'first' && firstBottomSheetSnapIndex === 0 && !showSetSafeZonePopup && !showConfirmationSheet)
          ) && !isThreatDetailsOpen && (
            <View style={styles.mapControls}>
              {/* Main buttons (Add Friend + Ellipsis) */}
              {mainMapButtons.map((button: any) => (
                <TouchableOpacity
                  key={button.id}
                  onPress={button.onPress}
                  activeOpacity={0.7}
                  style={styles.mapControlButton}>
                  {button.isEllipsis ? (
                    <Ellipsis
                      size={22}
                      color={Utills.selectedThemeColors().Base}
                    />
                  ) : (
                    <Image
                      source={button.image}
                      resizeMode="contain"
                      style={styles.controlIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {/* Dropdown buttons */}
              {showMapButtonsDropdown && (
                <View style={styles.dropdownContainer}>
                  {dropdownButtons.map((button: any) => (
                    <TouchableOpacity
                      key={button.id}
                      onPress={button.onPress}
                      activeOpacity={0.7}
                      style={[
                        styles.mapControlButton,
                        button.id === '4' && threatAlertMode && styles.alertButtonActive
                      ]}>
                      <Image
                        source={button.image}
                        resizeMode="contain"
                        style={[
                          styles.controlIcon,
                          button.id === '4' && threatAlertMode && { tintColor: '#000' }
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

        {!isThreatDetailsOpen && (
          <View style={styles.locationButtonContainer}>
            {locationButton?.map((item: any) => {
              return (
                <TouchableOpacity
                  key={item?.id}
                  onPress={item?.onPress}
                  activeOpacity={0.7}
                  style={styles.locationButton}>
                  <Image
                    source={Images.MainLocation}
                    resizeMode="contain"
                    style={styles.locationButtonIcon}
                  />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {!isThreatDetailsOpen && (
          <View style={styles.spookyButtonContainer}>
            {spookyButton?.map((item: any) => {
              return (
                <TouchableOpacity
                  key={item?.id}
                  onPress={item?.onPress}
                  activeOpacity={0.7}
                  style={styles.spookyButton}>
                  <Image
                    source={item.image}
                    resizeMode="contain"
                    style={styles.spookyButtonIcon}
                  />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

      </View>

      {/* Popups */}
      {showSetSafeZonePopup && (
        <View style={styles.popupContainer}>
          <View style={styles.popup}>
            <CustomText.RegularText customStyle={styles.popupText}>
              Set No-Protection Zone
            </CustomText.RegularText>
          </View>
        </View>
      )}

      {showHeadsUpPopup && (
        <View style={styles.popupContainer}>
          <View style={styles.headsUpPopup}>
            <Image
              source={Images.HeadsUp}
              style={styles.headsUpIcon}
              resizeMode="contain"
            />
            <CustomText.RegularText customStyle={styles.popupText}>
              Heads Up alert: ON
            </CustomText.RegularText>
          </View>
        </View>
      )}

      {showRadarPopup && (
        <View>

        </View>
      )}

      {showTimeFilter && (
        <View style={styles.timeFilterContainer}>
          <View style={styles.timeFilterBar}>
            <View style={styles.horizontalFilterContent}>

              <Image
                source={Images.Clock}
                resizeMode="contain"
                style={{ width: 22, height: 22, tintColor: 'rgba(136, 136, 136, 0.95)' }}
              />

              {/* Slider */}
              <Slider
                style={styles.horizontalTimeSlider}
                minimumValue={1}
                maximumValue={24 * 30} // 30 days
                value={timeFilterValue}
                onValueChange={handleTimeFilterChange}
                step={1}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E0E0E0"
                thumbStyle={styles.sliderThumb}
              />

              {/* Time Label */}
              <CustomText.MediumText customStyle={styles.horizontalTimeLabel}>
                {formatTimeLabel(timeFilterValue)}
              </CustomText.MediumText>
            </View>
          </View>
        </View>
      )}



      {/* Bottom notification - only show if actually in a safe zone and no threats nearby */}
      {inSZ && safeZones.length > 0 && (
        <View style={styles.bottomBanner}>
          <CustomText.SmallText customStyle={styles.bannerText}>
            You are in a safe zone, audio transmission paused.
          </CustomText.SmallText>
        </View>
      )}

      {/* Cut the Drama Modal */}
      <CustomModal
        visible={showDramaModal}
        smallModal
        onClose={() => setShowDramaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.firstTimeModalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.titleRow}>
                <Image
                  source={Images.Premium}
                  style={{ width: 34, height: 28 }}
                />
                <CustomText.LargeBoldText customStyle={styles.modalTitle}>
                  Cut the drama
                </CustomText.LargeBoldText>
              </View>
              <View style={styles.separator} />
              <View style={styles.descriptionContainer}>
                <CustomText.RegularText customStyle={styles.modalDescription}>
                  We're not here to fuel paranoia or keep you scrolling into the night.
                </CustomText.RegularText>
                <CustomText.RegularText customStyle={[styles.modalDescription, styles.descriptionSpacing]}>
                  But if it's real and it helps keep someone safe, let the community know!
                </CustomText.RegularText>
              </View>
              <TouchableOpacity
                style={styles.gotchaButton}
                onPress={startFlow}
                activeOpacity={0.8}
              >
                <CustomText.MediumText customStyle={styles.gotchaButtonText}>
                  Gotcha!
                </CustomText.MediumText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>

      {/* SafeZone Confirmation Sheet */}
      {showConfirmationSheet && (
        <View style={styles.confirmationSheet}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSafeZone}
              >
                <X size={24} color='#666' />
                <CustomText.RegularText customStyle={[styles.buttonText, { color: '#666' }]}>
                  Cancel
                </CustomText.RegularText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmSafeZone}
              >
                <Check size={24} color='#fff' />
                <CustomText.RegularText customStyle={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Confirm
                </CustomText.RegularText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}


      {/* Google Places Search Modal */}
      {modalVisible && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchModalContent}>
            <GooglePlacesAutocomplete
              key={forceResetSearch}
              ref={inputRef}
              placeholder={'Search here'}
              keyboardShouldPersistTaps="always"
              minLength={3}
              listViewDisplayed={false}
              fetchDetails={true}
              enablePoweredByContainer={false}
              onPress={(data, details = null) => {
                handlePlaceSelection(data, details);
              }}
              predefinedPlaces={[]}
              keepResultsAfterBlur={false}
              enableHighAccuracyLocation={true}
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
              }}
              textInputProps={{
                placeholderTextColor: Utills.selectedThemeColors().SecondaryTextColor,
              }}
              renderRow={renderSuggestionRows}
              renderRightButton={() => (
                <TouchableOpacity
                  onPress={() => {
                    // Clear the input text
                    if (inputRef.current) {
                      inputRef.current.setAddressText('');
                    }
                    // Close the modal
                    setModalVisible(false);
                    setSearchedLocation('');
                    setSearchedLocationCoords(null);
                  }}
                  style={styles.searchCloseButton}
                  activeOpacity={0.7}
                >
                  <Image
                    source={Images.Cross}
                    style={styles.searchCloseIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              styles={{
                textInput: {
                  fontSize: 16,
                  paddingHorizontal: Metrix.HorizontalSize(20),
                  paddingRight: Metrix.HorizontalSize(50), // Make space for close button
                  borderWidth: 1,
                  borderColor: Utills.selectedThemeColors().TextInputBorderColor,
                  borderRadius: Metrix.HorizontalSize(10),
                  backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
                  color: Utills.selectedThemeColors().Base,
                },
                separator: {
                  backgroundColor: Utills.selectedThemeColors().TextInputBorderColor,
                },
              }}
            />
          </View>
        </View>
      )}

      {/* First Bottom Sheet */}
      <View style={styles.bottomSheetContainer}>
        <FirstBottomSheet
          ref={firstBottomSheetRef}
          onYes={moveToSecondSheet}
          onNo={closeAllSheets}
          onThreatSelect={handleTempThreatSelection}
          onChange={(index) => handleSheetChange(index, 'first')}
        />
      </View>

      {/* Second Bottom Sheet */}
      <View style={styles.bottomSheetContainer}>
        <SecondBottomSheet
          ref={secondBottomSheetRef}
          onYes={moveToThirdSheet}
          onNo={closeAllSheets}
          onChange={(index) => handleSheetChange(index, 'second')}
        />
      </View>

      <View style={styles.bottomSheetContainer}>
        {/* Camera Screen - Full Screen Component */}
        {showCameraScreen && (
          <CameraScreen
            visible={showCameraScreen}
            onPhotoApproved={moveFromCameraToThird}
            onSkip={moveFromCameraToThirdWithoutPhoto}
            onClose={closeCameraSheet}
          />
        )}
      </View>

      {/* Threat Details Bottom Sheet */}
      <View style={styles.bottomSheetContainer}>
        <ThreatDetailsBottomSheet
          ref={threatDetailsBottomSheetRef}
          threatDetails={selectedThreatDetails}
          onClose={closeThreatDetails}
          onChange={(index) => {
            if (index === -1) {
              setSelectedThreatDetails(null);
              setIsThreatDetailsOpen(false);
            } else if (index >= 0) {
              setIsThreatDetailsOpen(true);
            }
          }}
          onDelete={handleDeleteThreat}
          currentUserId={userData?.user?.id}
          userCoordinates={userCoordinates}
          // 
          onImageAdded={handleThreatImageAdded}
        />
      </View>

      <View style={styles.bottomSheetContainer}>
        <FriendsBottomSheet
          ref={friendsBottomSheetRef}
          onChange={(index) => {
            if (index === -1) {
              setShowFriendsSheet(false);
            }
          }}
          onClose={closeFriendsSheet}
        />
      </View>

      <Loader isLoading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    top: '15%',
    right: '5%',
    zIndex: 100,
    // backgroundColor: '#ff4444'
  },
  mapControlButton: {
    width: Metrix.HorizontalSize(40),
    height: Metrix.VerticalSize(40),
    marginBottom: Metrix.VerticalSize(10),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  controlIcon: {
    width: Metrix.HorizontalSize(22),
    height: Metrix.VerticalSize(22),
    tintColor: Utills.selectedThemeColors().Base,
  },
  dropdownContainer: {
    // backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(8),
    paddingVertical: Metrix.VerticalSize(5),
    shadowColor: '#000000',
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  alertButtonActive: {
    backgroundColor: '#FFE6E6',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  currentLocationMarker: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    borderRadius: Metrix.HorizontalSize(10),
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: Metrix.HorizontalSize(8),
    height: Metrix.VerticalSize(8),
    borderRadius: Metrix.HorizontalSize(4),
    backgroundColor: '#007AFF',
  },
  locationButtonContainer: {
    position: 'absolute',
    zIndex: 100,
    bottom: '12%',
    right: '5%',
  },
  locationButton: {
    width: Metrix.HorizontalSize(45),
    height: Metrix.VerticalSize(45),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(22.5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  locationButtonIcon: {
    width: Metrix.HorizontalSize(55),
    height: Metrix.VerticalSize(55)
  },
  spookyButtonContainer: {
    position: 'absolute',
    zIndex: 100,
    bottom: '11.5%',
    left: '5%', // This positions it on the left side
  },
  spookyButton: {
    width: Metrix.HorizontalSize(47),
    height: Metrix.VerticalSize(47),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(22.5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  spookyButtonIcon: {
    width: Metrix.HorizontalSize(30),
    height: Metrix.VerticalSize(30)
  },
  // Search bar styles
  searchContainer: {
    position: 'absolute',
    zIndex: 10,
    width: '100%',
    paddingTop: '11%',
  },
  searchbar: {
    height: Metrix.VerticalSize(40),
    marginVertical: Metrix.VerticalSize(10),
    paddingHorizontal: Metrix.VerticalSize(10),
    width: '92%',
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: Metrix.HorizontalSize(10),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    shadowColor: '#000000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 20,
  },
  searchIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().Base,
  },
  locMarker: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
  },
  // SafeZone marker styles
  centeredSafeZoneMarker: {
    width: Metrix.HorizontalSize(36),
    height: Metrix.VerticalSize(36),
    borderRadius: Metrix.HorizontalSize(18),
    backgroundColor: 'rgba(134,200,252,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSafeZoneMarker: {
    backgroundColor: 'rgba(145, 255, 0, 0.95)',
    borderColor: '#4682B4',
    borderWidth: 3,
  },
  safeZoneIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: '#FFFFFF',
  },
  radiusIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: Metrix.HorizontalSize(12),
    paddingVertical: Metrix.VerticalSize(6),
    borderRadius: Metrix.HorizontalSize(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: normalizeFont(12),
    textAlign: 'center',
  },
  pendingMarker: {
    width: Metrix.HorizontalSize(32),
    height: Metrix.VerticalSize(32),
    borderRadius: Metrix.VerticalSize(100),
    backgroundColor: 'rgba(124, 200, 252, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  pendingMarkerIcon: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
    tintColor: '#FFFFFF',
  },
  // Threat marker styles
  threatMarker: {
    width: Metrix.HorizontalSize(35),
    height: Metrix.VerticalSize(35),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Utills.selectedThemeColors().Red,
    borderRadius: Metrix.HorizontalSize(18),
    borderWidth: 2,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
  threatIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
  threatMarkerContainer: {
    width: Metrix.HorizontalSize(40),
    height: Metrix.VerticalSize(40),
    borderRadius: Metrix.HorizontalSize(20),
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  threatMarkerIcon: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
    tintColor: '#FFFFFF',
  },
  draggingThreatMarker: {
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
    transform: [{ scale: 1.1 }],
  },
  // Bottom banner
  bottomBanner: {
    position: 'absolute',
    zIndex: 100,
    bottom: '5%',
    width: '90%',
    alignSelf: 'center',
    height: Metrix.VerticalSize(45),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    textAlign: 'center',
    color: Utills.selectedThemeColors().Danger,
    fontWeight: '600',
    fontSize: normalizeFont(13)
  },
  // Popup styles
  popupContainer: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    right: '5%',
    zIndex: 200,
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(12),
    borderRadius: Metrix.HorizontalSize(8),
    shadowColor: '#666',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.55,
    shadowRadius: 5,
    elevation: 10,
  },
  headsUpPopup: {
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(12),
    borderRadius: Metrix.HorizontalSize(8),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  headsUpIcon: {
    width: Metrix.HorizontalSize(25),
    height: Metrix.VerticalSize(25),
    marginRight: Metrix.HorizontalSize(8),
    tintColor: '#000',
  },
  popupText: {
    color: Utills.selectedThemeColors().Base,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  firstTimeModalContainer: {
    backgroundColor: '#515151',
    borderRadius: 20,
    width: width * 0.85,
    maxWidth: 400,
    padding: 25,
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: '#CCCCCC',
    marginBottom: 20,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 25,
  },
  modalDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 22,
  },
  descriptionSpacing: {
    marginTop: 15,
  },
  gotchaButton: {
    backgroundColor: '#898989',
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 15,
    minWidth: 120,
    alignSelf: 'center',
  },
  gotchaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Confirmation sheet styles
  confirmationSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 300,
  },
  sheetContent: {
    borderTopLeftRadius: Metrix.HorizontalSize(20),
    borderTopRightRadius: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(20),
  },
  sheetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: Metrix.HorizontalSize(30),
    paddingVertical: Metrix.VerticalSize(10),
    borderRadius: Metrix.HorizontalSize(10),
    shadowColor: '#666',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.55,
    shadowRadius: 5,
    elevation: 10,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ade80',
    paddingHorizontal: Metrix.HorizontalSize(30),
    paddingVertical: Metrix.VerticalSize(10),
    borderRadius: Metrix.HorizontalSize(10),
  },
  buttonText: {
    color: Utills.selectedThemeColors().Base,
    fontWeight: '600',
    fontSize: normalizeFont(15),
    marginLeft: Metrix.HorizontalSize(5)
  },
  timeFilterContainer: {
    position: 'absolute',
    top: '30%',
    left: '5%',
    right: '20%',
    zIndex: 250,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    zIndex: 1000,
    paddingTop: '15%', // Add some top padding for status bar
  },
  searchModalContent: {
    flex: 1,
    paddingHorizontal: Metrix.HorizontalSize(20),
  },
  searchCloseButton: {
    position: 'absolute',
    right: Metrix.HorizontalSize(15),
    top: '50%',
    transform: [{ translateY: -10 }],
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  searchCloseIcon: {
    width: Metrix.HorizontalSize(16),
    height: Metrix.VerticalSize(16),
    tintColor: Utills.selectedThemeColors().Base,
  },
  timeFilterBar: {
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(16),
    // paddingVertical: Metrix.VerticalSize(2),
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
  },
  horizontalFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Metrix.VerticalSize(4),
  },
  clockIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: '#ff44',
    marginRight: Metrix.HorizontalSize(12),
    // backgroundColor: '#000'
  },
  horizontalTimeSlider: {
    flex: 1,
    height: Metrix.VerticalSize(30),
    marginHorizontal: Metrix.HorizontalSize(12),
  },
  horizontalTimeLabel: {
    color: Utills.selectedThemeColors().Base,
    fontSize: normalizeFont(16),
    fontWeight: '600',
    minWidth: Metrix.HorizontalSize(40),
    textAlign: 'center',
    marginLeft: Metrix.HorizontalSize(8),
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
  },
});