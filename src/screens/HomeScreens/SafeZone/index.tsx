import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
  ScrollView,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { SafeZoneProps } from '../../propTypes';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import { Images, Metrix, Utills } from '../../../config';
import { Image } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { CustomModal, CustomText, Loader } from '../../../components';
import Geolocation from 'react-native-geolocation-service';
import { HomeAPIS } from '../../../services/home';
import { HomeActions } from '../../../redux/actions';
import { GOOGLE_API_KEY } from '../../../services/config';
import ThreatDetailsBottomSheet from '../../../components/BottomSheet/ThreadDetails';
import BottomSheet from '@gorhom/bottom-sheet';
import { normalizeFont } from '../../../config/metrix';
import { Check, X } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

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
}

export const SafeZone: React.FC<SafeZoneProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();

  const mapRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const isFocus = useIsFocused();
  const userData = useSelector((state: RootState) => state.home.userDetails);
  const [isThreatDetailsOpen, setIsThreatDetailsOpen] = useState(false);
  const userCoordinates = useSelector(
    (state: RootState) => state.home.userLocation,
  );

  const [showSetSafeZonePopup, setShowSetSafeZonePopup] = useState(false);
  const [showHeadsUpPopup, setShowHeadsUpPopup] = useState(false);
  const [pendingMarkerLocation, setPendingMarkerLocation] = useState<any>(null);
  const [showConfirmationSheet, setShowConfirmationSheet] = useState(false);

  const [draggedSafeZone, setDraggedSafeZone] = useState<any>(null);
  const [tempLocation, setTempLocation] = useState<any>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [draggedSafeZoneId, setDraggedSafeZoneId] = useState<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizingSafeZoneId, setResizingSafeZoneId] = useState<number | null>(null);
  const [initialRadius, setInitialRadius] = useState<number>(0);

  // Get reported threat from navigation params (React Navigation v5 pattern)
  const reportedThreat = route?.params?.reportedThreat;
  const showThreatDetails = route?.params?.showThreatDetails;

  // ===== 1. IMPORT REDUX SELECTOR =====
  // Added this to access the threat alert mode state
  const threatAlertMode = useSelector(
    (state: RootState) => state.home.threatAlertMode,
  );

  const [loading, setLoading] = useState(false);
  const [inSZ, setInSZ] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<any>('');
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]); // State for threats
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [region, setRegion] = useState({
    latitude: userCoordinates?.latitude || 37.78825,
    longitude: userCoordinates?.longitude || -122.4324,
  });
  const [mapType, setMapType] = useState<any>('standard');

  // Threat details bottom sheet state
  const [selectedThreatDetails, setSelectedThreatDetails] = useState<ThreatDetails | null>(null);
  const threatDetailsBottomSheetRef = useRef<BottomSheet>(null);

  const buttons = [
    {
      id: '1',
      image: Images.Layers,
      onPress: () => {
        if (mapType == 'standard') {
          setMapType('satellite');
        } else {
          setMapType('standard');
        }
      },
    },
    {
      id: '2',
      image: Images.SafeZoneBlack, // Make sure this is the correct icon
      onPress: () => {
        console.log('SafeZone button pressed - showing popup'); // Debug log
        setShowSetSafeZonePopup(true);
      },
    },
    {
      id: '3',
      image: threatAlertMode ? Images.OnAlert : Images.OffAlert,
      onPress: () => {
        console.log('Alert button pressed - showing heads up popup'); // Debug log
        const hasThreats = threats.length > 0;
        if (!threatAlertMode && !hasThreats) {
          Alert.alert(
            'No Threats Found',
            'There are currently no threats on the map to alert about.',
            [{ text: 'OK' }]
          );
          return;
        }

        setShowHeadsUpPopup(true);
        setTimeout(() => {
          setShowHeadsUpPopup(false);
        }, 3000);

        dispatch(HomeActions.setThreatAlertMode(!threatAlertMode));
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

  const calculateTouchDistance = (touches: any) => {
    if (touches.length !== 2) return 0;

    const touch1 = touches[0];
    const touch2 = touches[1];

    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchedSafeZone = (coordinate: any) => {
    for (const safeZone of safeZones) {
      const distance = calculateDistance(
        coordinate.latitude,
        coordinate.longitude,
        safeZone.location.latitude,
        safeZone.location.longitude
      );

      if (distance <= safeZone.radius) {
        return safeZone;
      }
    }
    return null;
  };

  const createCirclePanGesture = (safeZone: any) => {
    return Gesture.Pan()
      .minPointers(2) // Require exactly 2 fingers
      .maxPointers(2)
      .onBegin((event) => {
        // Check if the touch started within this safe zone
        const coordinate = event.allTouches[0]; // Get first touch coordinate
        const touchedZone = getTouchedSafeZone({
          latitude: coordinate.y, // Note: these might need coordinate conversion
          longitude: coordinate.x
        });

        if (touchedZone && touchedZone.id === safeZone.id) {
          setIsResizing(true);
          setResizingSafeZoneId(safeZone.id);
          setInitialRadius(safeZone.radius);
          setResizeStartDistance(calculateTouchDistance(event.allTouches));
          console.log('Started resizing safe zone:', safeZone.id);
        }
      })
      .onUpdate((event) => {
        if (isResizing && resizingSafeZoneId === safeZone.id && event.allTouches.length === 2) {
          const currentDistance = calculateTouchDistance(event.allTouches);
          const scale = currentDistance / resizeStartDistance;
          const newRadius = Math.max(10, Math.min(500, initialRadius * scale));

          // Update the safe zone radius in real-time
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
        setResizeStartDistance(0);
      })
      .runOnJS(true);
  };

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

          // Update the safe zone radius in real-time
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
            // Update backend with new radius
            updateSafeZoneRadius(safeZone.id, currentZone.radius);
          }
        }

        setIsResizing(false);
        setResizingSafeZoneId(null);
        setInitialRadius(0);
      })
      .runOnJS(true);
  };

  const handleDragStart = (safeZone: any) => {
    setIsDragging(true);
    setDraggedSafeZone(safeZone);
    setTempLocation(safeZone.location);
    console.log('Started dragging safe zone:', safeZone.id);
  };

  // Add function to handle drag movement
  const handleDragMove = (event: any) => {
    if (isDragging && draggedSafeZone) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setTempLocation({ latitude, longitude });

      // Update the safe zone position in real time
      setSafeZones(prevZones =>
        prevZones.map(zone =>
          zone.id === draggedSafeZone.id
            ? { ...zone, location: { latitude, longitude } }
            : zone
        )
      );
    }
  };

  // Add function to handle drag end
  const handleDragEnd = async () => {
    if (isDragging && draggedSafeZone && tempLocation) {
      try {
        // Update backend with new location
        // const address = await getStreetName(tempLocation.latitude, tempLocation.longitude);
        // await updateSafeZoneLocation(draggedSafeZone.id, tempLocation.latitude, tempLocation.longitude, address);

        console.log('Safe zone moved successfully');
      } catch (error) {
        console.error('Error updating safe zone location:', error);
        // Revert to original position on error
        getZones();
      }
    }

    setIsDragging(false);
    setDraggedSafeZone(null);
    setTempLocation(null);
  };

  const handleMapPress = (event: any) => {
    if (showSetSafeZonePopup) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setPendingMarkerLocation({ latitude, longitude });
      setShowSetSafeZonePopup(false);
      setShowConfirmationSheet(true);
    }
  };

  const handleConfirmSafeZone = async () => {
    if (pendingMarkerLocation) {
      const address = await getStreetName(pendingMarkerLocation.latitude, pendingMarkerLocation.longitude);
      // Create with a default radius that can be adjusted
      createSafeZone(pendingMarkerLocation.latitude, pendingMarkerLocation.longitude, address, 30); // Default 30m radius
      setPendingMarkerLocation(null);
      setShowConfirmationSheet(false);
    }
  };

  const handleCancelSafeZone = () => {
    setPendingMarkerLocation(null);
    setShowConfirmationSheet(false);
  }

  // Function to get threat icon by type (same as original HeadsUp)
  const getThreatIcon = (reportType: string) => {
    const iconMap: { [key: string]: any } = {
      'harassment': Images.Harasment,
      'followed': Images.Followed,
      'fight': Images.Fight,
      'stabbing': Images.Stabing,
      'shooting': Images.Shooter,
      'mass_event': Images.Danger,
    };
    return iconMap[reportType] || Images.Incident;
  };

  // Function to get street name from coordinates
  const getStreetName = async (latitude: number, longitude: number): Promise<string> => {
    // You can implement reverse geocoding here using your existing Geocoder
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  // Function to handle threat marker tap (from original HeadsUp) - ONLY manual clicks
  const handleThreatMarkerPress = async (threat: any) => {
    const streetName = await getStreetName(threat.latitude, threat.longitude);

    const threatDetails: ThreatDetails = {
      id: threat.id.toString(),
      icon: threat.icon || getThreatIcon(threat.threat_type || 'General'),
      label: threat.threat_type || 'General Threat',
      streetName: streetName,
      image: threat.image,
      timestamp: threat.timestamp,
      description: threat.description,
      latitude: threat.latitude,
      longitude: threat.longitude,
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

  // Format timestamp (from original HeadsUp)
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // useFocusEffect(
  //   React.useCallback(() => {
  //     dispatch(HomeActions.setCameraMode('AUDIO'));
  //   }, [dispatch])
  // );

  useEffect(() => {
    getCurrentLocation();
  }, [isFocus]);

  useEffect(() => {
    if (region?.latitude && region?.longitude) {
      getZones();
      loadThreats(); // Load existing threats
    }
  }, [region]);

  // Additional useEffect to monitor safe zone status changes
  useEffect(() => {
    if (userCoordinates?.latitude && userCoordinates?.longitude && safeZones.length >= 0) {
      checkSafeZoneStatus(safeZones);
    }
  }, [safeZones, userCoordinates]);

  // ===== 4. AUTO-CLEANUP LOGIC =====
  // Added useEffect to automatically turn off alert mode if no threats exist
  useEffect(() => {
    if (threatAlertMode && threats.length === 0) {
      // If alert mode is on but no threats exist, turn it off
      dispatch(HomeActions.setThreatAlertMode(false));
    }
  }, [threats, threatAlertMode, dispatch]);

  // Handle reported threat from HeadsUp - React Navigation v5 pattern
  useEffect(() => {
    if (reportedThreat) {
      console.log('Received reported threat from HeadsUp:', reportedThreat);

      // FIRST: Check and remove conflicting safe zones before adding the threat
      checkAndRemoveConflictingSafeZones(reportedThreat.latitude, reportedThreat.longitude);

      // Add the reported threat to the threats array
      setThreats(prevThreats => {
        const existingThreat = prevThreats.find(t => t.id === reportedThreat.id);
        if (!existingThreat) {
          console.log('Adding new threat to SafeZone map');
          return [...prevThreats, reportedThreat];
        }
        return prevThreats;
      });

      // Animate to the reported threat location
      if (mapRef.current && reportedThreat.latitude && reportedThreat.longitude) {
        setTimeout(() => {
          mapRef.current.animateToRegion({
            latitude: reportedThreat.latitude,
            longitude: reportedThreat.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }, 500);
      }

      createThreadZone(
        reportedThreat.latitude,
        reportedThreat.longitude,
        reportedThreat.description || `${reportedThreat.threat_type} reported`,
        reportedThreat.description,
        reportedThreat.image
      );
    }
  }, [reportedThreat, showThreatDetails]);

  // Enhanced function to check and remove conflicting safe zones
  const checkAndRemoveConflictingSafeZones = async (threatLat: number, threatLng: number) => {
    const conflictingZones: any[] = [];
    const CONFLICT_DISTANCE = 50; // 50 meters threshold

    console.log(`Checking for safe zones within ${CONFLICT_DISTANCE}m of threat at (${threatLat}, ${threatLng})`);

    // Check each safe zone for proximity to the threat location
    safeZones.forEach((zone: any) => {
      const distance = calculateDistance(
        threatLat,
        threatLng,
        zone.location.latitude,
        zone.location.longitude
      );

      console.log(`Safe zone ${zone.id} distance: ${distance.toFixed(1)}m`);

      // Only remove if threat is within 50 meters of the safe zone center
      if (distance <= CONFLICT_DISTANCE) {
        console.log(`Found conflicting safe zone at distance: ${distance.toFixed(1)}m (threshold: ${CONFLICT_DISTANCE}m)`);
        conflictingZones.push(zone);
      } else {
        console.log(`Safe zone at ${distance.toFixed(1)}m is safe (beyond ${CONFLICT_DISTANCE}m threshold)`);
      }
    });

    // Remove conflicting safe zones
    if (conflictingZones.length > 0) {
      console.log(`Removing ${conflictingZones.length} conflicting safe zone(s) due to threat within 50m`);

      // Show alert to inform user
      Alert.alert(
        'Safe Zone Replaced',
        `A safe zone within 50 meters of the reported threat has been removed for community safety.`,
        [{ text: 'OK' }]
      );

      // Remove from backend first
      const deletePromises = conflictingZones.map(async (zone) => {
        try {
          await HomeAPIS.deleteSafeZone(zone.id);
          console.log(`Successfully deleted conflicting safe zone: ${zone.id} (was ${calculateDistance(threatLat, threatLng, zone.location.latitude, zone.location.longitude).toFixed(1)}m away)`);
          return zone.id;
        } catch (error) {
          console.error('Error deleting conflicting safe zone:', error);
          return null;
        }
      });

      // Wait for all deletions to complete
      const deletedZoneIds = await Promise.all(deletePromises);
      const successfullyDeleted = deletedZoneIds.filter(id => id !== null);

      // Update local state to remove conflicting zones (including their circles)
      setSafeZones(prevZones => {
        const remainingZones = prevZones.filter(zone =>
          !successfullyDeleted.includes(zone.id)
        );

        // Immediately check safe zone status with the updated zones
        setTimeout(() => {
          checkSafeZoneStatus(remainingZones);
        }, 100);

        return remainingZones;
      });

      // Force update the safe zone status immediately
      setTimeout(() => {
        setInSZ(false);
        dispatch(HomeActions.setInSafeZone(false));
      }, 200);

    } else {
      console.log('No safe zones found within 50m of the threat location');
    }
  };

  function calculateDistance(lat1: any, lon1: any, lat2: any, lon2: any) {
    const R = 6371e3; // Radius of Earth in meters
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  const getZones = () => {
    setLoading(true);
    HomeAPIS.getSafeZones()
      .then(async res => {
        let array: any = [];
        const currentTime = Date.now();

        res?.data?.map((item: any) => {
          const createdTime = new Date(item.created_at || item.timestamp).getTime();
          const isRecent = currentTime - createdTime < 10000; // 10 seconds ago

          array?.push({
            id: item?.id,
            name: item?.name || 'safezone', // Add name property
            address: item?.address, // Add address property  
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

        // Check safe zone status
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
      })
      .catch(err => {
        console.log('❌ Error fetching safe zones:', err?.response?.data);
        setLoading(false);

        // Show error to user if needed
        Alert.alert(
          'Load Error',
          'Failed to load safe zones. Please check your connection.',
          [{ text: 'Retry', onPress: () => getZones() }, { text: 'Cancel' }]
        );
      });
  };

  // Load threats from API (from original HeadsUp)
  const loadThreats = async () => {
    try {
      const response = await HomeAPIS.getThreatReports();

      const threatMarkers = response?.data?.results?.map((item: any) => ({
        id: item?.id, // This is now a UUID string
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude),
        timestamp: item?.created_at, // Use created_at from API
        description: item?.description || 'Threat Location',
        threat_type: item?.report_type, // Use report_type from API
        image: item?.photo_url, // Use photo_url from API
        icon: getThreatIcon(item?.report_type),
        // Additional fields from the API
        confirm_votes: item?.confirm_votes,
        deny_votes: item?.deny_votes,
        user_vote: item?.user_vote,
      }));

      setThreats(prevThreats => {
        // Merge with any reported threats, avoiding duplicates
        const existingIds = prevThreats.map(t => t.id);
        const newThreats = threatMarkers?.filter(t => !existingIds.includes(t.id)) || [];
        return [...prevThreats, ...newThreats];
      });
    } catch (error) {
      console.error('Error loading threat reports:', error);
    }
  };

  // Create thread zone function (for saving to backend)
  const createThreadZone = async (
    latitude: number,
    longitude: number,
    address: string,
    additionalDetails?: string,
    image?: string
  ) => {
    try {
      // Map threat type to match API expectations
      const threatTypeMap: { [key: string]: string } = {
        'Harassment': 'harassment',
        'Followed': 'followed',
        'Fight': 'fight',
        'Stabbing': 'stabbing',
        'Shooting': 'shooting',
        'Mass event': 'mass_event',
      };

      const body = {
        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        description: additionalDetails || address,
        report_type: threatTypeMap[reportedThreat?.threat_type] || 'harassment',
        user_id: userData?.user?.id,
        photo: image, // Include image if provided
      };

      console.log('Saving threat report to backend:', body);

      // Use the correct threat reports API
      await HomeAPIS.sendThreatReports(body);
      console.log('Threat report saved to backend successfully');

      // Reload threats after saving to get the server data
      setTimeout(() => {
        loadThreats();
      }, 1000);
    } catch (error) {
      console.error('Error creating threat report:', error);
      Alert.alert('Error', 'Failed to save threat report. Please try again.');
    }
  };

  const createSafeZone = (lat: any, lng: any, address: any, radius: number = 20) => {
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
        setSearchedLocation('');
        setTimeout(() => {
          getZones();
        }, 1000);
      })
      .catch(err => {
        console.log('Err', err?.response?.data);
        setLoading(false);
      });
  };

  const updateSafeZoneRadius = async (safeZoneId: number, newRadius: number) => {
    try {
      const clampedRadius = Math.max(10, Math.min(500, Math.round(newRadius)));

      // Get the current safe zone data to preserve existing properties
      const currentZone = safeZones.find(zone => zone.id === safeZoneId);
      if (!currentZone) {
        throw new Error('Safe zone not found');
      }

      const body = {
        name: currentZone.name || 'safezone',
        latitude: currentZone.location.latitude.toFixed(6),
        longitude: currentZone.location.longitude.toFixed(6),
        radius: clampedRadius.toString(), // API expects string
        address: currentZone.address || 'Updated location',
        is_active: true,
        zone_type: 'home',
        user: userData?.user?.id,
      };

      console.log('🔄 Updating safe zone radius with body:', body);

      // const response = await HomeAPIS.updateSafeZone(safeZoneId, body);
      // console.log(`✅ Safe zone ${safeZoneId} radius updated to ${clampedRadius}m:`, response);

      // Update local state with the final radius
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

      // Revert to original radius on error
      getZones();
    }
  };

  const updateSafeZoneLocation = async (safeZoneId: number, latitude: number, longitude: number, address: string) => {
    try {
      //
      console.log('safeZoneId', safeZoneId)
      const currentZone = safeZones.find(zone => zone.id === safeZoneId);
      if (!currentZone) {
        throw new Error('Safe zone not found');
      }

      const body = {
        name: currentZone.name || 'safezone',
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        radius: currentZone.radius.toString(),
        address: address,
        is_active: true,
        zone_type: 'home',
        user: userData?.user?.id,
      };

      // const response = await HomeAPIS.updateSafeZone(safeZoneId, body);
      // console.log(`✅ Safe zone ${safeZoneId} location updated successfully:`, response);
    } catch (error) {
      console.error('❌ Error updating safe zone location:', error);

      // Show user-friendly error message
      Alert.alert(
        'Update Failed',
        'Failed to update safe zone location. Please check your connection and try again.',
        [{ text: 'OK' }]
      );

      throw error;
    }
  };


  const deleteZone = (id: any) => {
    console.log('DeleteZone called with ID:', id);
    setLoading(true);
    HomeAPIS.deleteSafeZone(id)
      .then(res => {
        console.log('Delete API response:', res);

        // Remove from local state first
        const updatedZones = safeZones.filter(zone => zone.id !== id);
        setSafeZones(updatedZones);

        // Force safe zone status to false immediately after deletion
        setInSZ(false);
        dispatch(HomeActions.setInSafeZone(false));

        // Check safe zone status with updated zones after a delay
        // This prevents immediate re-creation if you're still in the same location
        setTimeout(() => {
          checkSafeZoneStatus(updatedZones);
        }, 1000); // 1 second delay

        setLoading(false);
      })
      .catch(err => {
        console.log('Delete error:', err?.response?.data);
        Alert.alert('Error', 'Failed to delete safe zone. Please try again.');
        setLoading(false);
      });
  };


  const checkSafeZoneStatus = (zones = safeZones) => {
    // Only check if we have valid user coordinates
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

    // DO NOT automatically create new safe zones here
    // Safe zones should only be created when user explicitly requests it
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          console.log('Position', position);

          setRegion({
            latitude: latitude,
            longitude: longitude,
          });

          dispatch(HomeActions.setUserLocation({ latitude, longitude }));
          setSearchedLocation('');
          setIsLocationReady(true);

          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              1000,
            );
          }
        },
        error => {
          console.error(error);
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

  if (!isLocationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <CustomText.RegularText>Loading location...</CustomText.RegularText>
      </View>
    );
  }

  const deleteAlert = (item: any) => {
    console.log('DeleteAlert called with item:', item); // Debug log
    Alert.alert(
      'Delete Safe Zone!',
      `Are you sure you want to delete this safe zone?`,
      [
        {
          text: 'YES',
          onPress: () => {
            console.log('Deleting zone with ID:', item?.id); // Debug log
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
    <View style={{ flex: 1 }}>
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
          <TouchableOpacity onPress={getCurrentLocation}>
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

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        ref={mapRef}
        zoomEnabled={!isDragging} // Disable zoom while dragging
        showsUserLocation={true}
        scrollEnabled={!isDragging} // Disable scroll while dragging
        pitchEnabled={!isDragging}
        rotateEnabled={!isDragging}
        onPress={handleMapPress}
        region={{
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType={mapType}>


        {searchedLocation && (
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            title={searchedLocation}></Marker>
        )}

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
                        ? "rgba(46, 204, 113, 1)" // Green for resizing
                        : "transparent"
                  }
                  fillColor={
                    isBeingDragged
                      ? "rgba(134,200,252,0.8)"
                      : isBeingResized
                        ? "rgba(46, 204, 113, 0.3)" // Green tint when resizing
                        : "rgba(134,200,252,0.7)"
                  }
                  onPress={() => {
                    if (!isDragging && !isResizing) {
                      deleteAlert(item);
                    }
                  }}
                />
              </GestureDetector>

              {/* Draggable Marker */}
              <Marker
                coordinate={item?.location}
                anchor={{ x: 0.5, y: 0.5 }}
                draggable={!isResizing} // Disable dragging while resizing
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

                  // Update local state immediately for better UX
                  setSafeZones(prevZones =>
                    prevZones.map(zone =>
                      zone.id === item.id
                        ? { ...zone, location: { latitude, longitude } }
                        : zone
                    )
                  );

                  try {
                    // Get street address from coordinates
                    // const address = await getStreetName(latitude, longitude);

                    console.log('item.id', item.id)
                    // Call the API to update the backend
                    // await updateSafeZoneLocation(item.id, latitude, longitude, address);

                    // console.log('✅ Safe zone moved successfully to:', latitude.toFixed(6), longitude.toFixed(6));

                    // Show success feedback to user
                    // Optionally show a brief success message

                  } catch (error) {
                    console.error('❌ Error updating safe zone location:', error);

                    // Revert to original position on error by refreshing from server
                    getZones();
                  }

                  // Reset drag state
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

        {/* Threat Markers - Transferred from HeadsUp */}
        {threats.map((threat: any, index: number) => (
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
      </MapView>

      {showSetSafeZonePopup && (
        <View style={styles.popupContainer}>
          <View style={styles.popup}>
            <CustomText.RegularText customStyle={styles.popupText}>
              Set Safe Zone
            </CustomText.RegularText>
          </View>
        </View>
      )}

      {/* Heads Up Alert Popup */}
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

      {!isThreatDetailsOpen && (
        <View style={styles.mapTypeContainer}>
          {buttons?.map((item: any) => {
            return (
              <TouchableOpacity
                key={item?.id}
                onPress={item?.onPress}
                activeOpacity={0.7}
                style={[
                  styles.mapTypeBox,
                  // Special styling for the threat alert button when active
                  item?.id === '6' && threatAlertMode && styles.alertButtonActive
                ]}>
                <Image
                  source={item?.image}
                  resizeMode="contain"
                  style={[
                    styles.butonIcons,
                    item?.id === '6' && threatAlertMode && { tintColor: '#000' }
                  ]}
                />
              </TouchableOpacity>
            );
          })}
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

      {/* Bottom notification - only show if actually in a safe zone and no threats nearby */}
      {inSZ && safeZones.length > 0 && (
        <View style={styles.bottomBanner}>
          <CustomText.SmallText customStyle={styles.bannerText}>
            You are in a safe zone, audio transmission paused.
          </CustomText.SmallText>
        </View>
      )}

      {/* Threat Details Bottom Sheet - Transferred from HeadsUp */}
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
      />

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

      <CustomModal
        safeAreaStyle={{
          backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
        }}
        modalContainer={{
          backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
          paddingTop: 0,
        }}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
        }}>
        <ScrollView keyboardShouldPersistTaps={'handled'}>
          <GooglePlacesAutocomplete
            ref={inputRef}
            placeholder={'Search here'}
            keyboardShouldPersistTaps="always"
            minLength={3}
            listViewDisplayed={true}
            fetchDetails={true}
            enablePoweredByContainer={false}
            onPress={(data, details = null) => {
              createSafeZone(
                details?.geometry?.location?.lat,
                details?.geometry?.location?.lng,
                details?.formatted_address,
              );
              setRegion({
                latitude: details?.geometry?.location?.lat,
                longitude: details?.geometry?.location?.lng,
              });
              setSearchedLocation(details?.formatted_address);
              setModalVisible(false);
            }}
            predefinedPlaces={[]}
            keepResultsAfterBlur={true}
            enableHighAccuracyLocation={true}
            query={{
              key: GOOGLE_API_KEY,
              language: 'en',
            }}
            textInputProps={{
              placeholderTextColor:
                Utills.selectedThemeColors().SecondaryTextColor,
            }}
            renderRow={renderSuggestionRows}
            styles={{
              textInput: {
                fontSize: 16,
                paddingHorizontal: Metrix.HorizontalSize(20),
                borderWidth: 1,
                borderColor: Utills.selectedThemeColors().TextInputBorderColor,
                borderRadius: Metrix.HorizontalSize(10),
                backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
                color: Utills.selectedThemeColors().Base,
              },
              separator: {
                backgroundColor:
                  Utills.selectedThemeColors().TextInputBorderColor,
              },
            }}
          />
        </ScrollView>
      </CustomModal>
      <Loader isLoading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapTypeBox: {
    width: Metrix.HorizontalSize(35),
    height: Metrix.VerticalSize(35),
    marginTop: Metrix.VerticalSize(10),
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    borderRadius: Metrix.HorizontalSize(5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 20,
  },
  mapTypeContainer: {
    position: 'absolute',
    zIndex: 100,
    top: '15%',
    right: '5%',
  },
  locationButtonContainer: {
    position: 'absolute',
    zIndex: 100,
    bottom: '5%',
    right: '5%'
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
    height: Metrix.VerticalSize(55),
  },
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
  // Threat counter - from original HeadsUp
  threatCounter: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Metrix.HorizontalSize(12),
    paddingVertical: Metrix.VerticalSize(6),
    borderRadius: Metrix.HorizontalSize(15),
    zIndex: 100,
  },
  counterText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontWeight: '600',
    fontSize: normalizeFont(12),
  },
  // Threat marker styles - from original HeadsUp
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
  locIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    right: Metrix.HorizontalSize(10),
  },
  locMarker: {
    width: Metrix.HorizontalSize(24),
    height: Metrix.VerticalSize(24),
  },
  butonIcons: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().Base,
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
  searchContainer: {
    position: 'absolute',
    zIndex: 10,
    width: '100%',
    paddingTop: '11%',
  },
  searchIcon: {
    width: Metrix.HorizontalSize(20),
    height: Metrix.VerticalSize(20),
    tintColor: Utills.selectedThemeColors().Base,
  },
  deleteContainer: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    borderRadius: Metrix.VerticalSize(100),
  },
  alertButtonActive: {
    // backgroundColor: '#FFE6E6', // Light red background
    // borderWidth: 2,
    // borderColor: '#FF3B30', // Red border
  },
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

  resizingMarker: {
    borderColor: 'rgba(46, 204, 113, 1)', // Green border
    borderWidth: 3,
    backgroundColor: 'rgba(46, 204, 113, 0.2)', // Light green background
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
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
  popupContainer: {
    position: 'absolute',
    top: '15%', // Just below the search bar
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
    // borderWidth: 1,
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
  confirmationSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 300,
  },
  sheetContent: {
    // backgroundColor: Utills.selectedThemeColors().Base,
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
  buttonIcon: {
    width: Metrix.HorizontalSize(18),
    height: Metrix.VerticalSize(18),
    marginRight: Metrix.HorizontalSize(8),
    tintColor: Utills.selectedThemeColors().Base,
  },
  buttonText: {
    color: Utills.selectedThemeColors().Base,
    fontWeight: '600',
    fontSize: normalizeFont(15),
    marginLeft: Metrix.HorizontalSize(5)
  },

  draggingMarker: {
    borderWidth: 3,
    // Remove transform and reduce shadow properties that can cause issues
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    // DO NOT USE: transform: [{ scale: 1.3 }] - this causes rendering issues with react-native-maps
  },

  dragInstructions: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    zIndex: 1000,
    alignItems: 'center',
  },

  dragCard: {
    backgroundColor: 'rgba(7, 11, 12, 0.95)', // Yellow background
    borderRadius: Metrix.HorizontalSize(12),
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  dragTitle: {
    color: '#000',
    fontWeight: '700',
    fontSize: normalizeFont(14),
    textAlign: 'center',
    marginBottom: Metrix.VerticalSize(4),
  },

  dragText: {
    color: '#333',
    fontSize: normalizeFont(12),
    textAlign: 'center',
    lineHeight: normalizeFont(16),
  },

});