import { FlatList, Image, RefreshControl, StyleSheet, View, Alert, Platform, StatusBar } from 'react-native';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { FootagesProps } from '../../propTypes';
import {
  BackHeader,
  CustomText,
  FootageGrid,
  Loader,
  MainContainer,
} from '../../../components';
import { Images, Metrix, Utills } from '../../../config';
import { createShadow, normalizeFont } from '../../../config/metrix';
import { HomeAPIS } from '../../../services/home';
import { useFocusEffect } from '@react-navigation/native';
import { StreamCard } from '../../../components/StreamCard';
import DownloadBottomSheet from '../../../components/DownloadBottomSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import RNFS from 'react-native-fs';
import CameraRoll from '@react-native-camera-roll/camera-roll';
import { HomeActions } from '../../../redux/actions';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoProcessingOverlayService } from '../../../utils/videoOverlay';
import { LegendList } from '@legendapp/list';
import { RootState } from '../../../redux/reducers';

const formatCoordinates = (lat: number | null, lng: number | null): string => {
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return 'Unknown Location';
};

const getStreetName = (item: any): string => {
  if (item.streetName &&
    item.streetName.trim() !== '' &&
    !item.streetName.includes('null') &&
    !item.streetName.includes('undefined')) {
    return item.streetName;
  }

  if (item.lat !== null && item.lng !== null) {
    return formatCoordinates(item.lat, item.lng);
  }

  return `Incident #${item.id}`;
};

const processIncidentData = (incidentsData: any[], contactsData: any[]) => {
  const recipients = contactsData?.map((contact: any) => ({
    id: contact.id,
    name: contact.name,
    avatar: contact.avatar_url,
  })) || [];

  return incidentsData.map((item: any) => {
    const lat = item?.location ? parseFloat(item.location.split(', ')[0]) : null;
    const lng = item?.location ? parseFloat(item.location.split(', ')[1]) : null;

    const processedItem = {
      id: item?.id,
      createdAt: item?.created_at,
      lat,
      lng,
      triggerType: item?.threat_type || 'Automatic Detection',
      streetName: item?.address || item?.description,
      hasVideo: item?.has_video || false,
      thumbnailUrl: item?.thumbnail_url,
      agoraAudioLink: item?.agora_audio_link,
      recordingType: item?.recording_type,
      recipients,
      // Pre-compute the display street name to avoid doing it in render
      displayStreetName: getStreetName({
        streetName: item?.address || item?.description,
        lat,
        lng,
        id: item?.id
      })
    };

    return processedItem;
  }).reverse();
};

export const Footages: React.FC<FootagesProps> = ({ }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const currentCameraMode = useSelector((state: RootState) => state.home.cameraMode || 'AUDIO');

  useFocusEffect(
    React.useCallback(() => {
      dispatch(HomeActions.setCameraMode(currentCameraMode));
    }, [dispatch, currentCameraMode])
  );

  const wait = (timeout: any) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    wait(1000).then(() => {
      getIncidents(true);
      setRefreshing(false);
    });
  };

  const handleOpenDownloadSheet = useCallback((incident: any) => {
    setSelectedIncident(incident);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSharePress = useCallback(() => {
    // Implement sharing functionality here
    console.log('Share pressed for incident:', selectedIncident?.id);
    bottomSheetRef.current?.close();
  }, [selectedIncident?.id]);

  const saveVideoToGallery = async (incident: any) => {
    try {
      setIsDownloading(true);

      // Check if running on iOS (you can remove this check if you want Android support)
      if (Platform.OS !== 'ios') {
        Alert.alert('Not Supported', 'This feature is only available on iOS');
        setIsDownloading(false);
        return;
      }

      // Look for the local video file
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const videoFile = files.filter((file: any) =>
        file.name.endsWith(`${incident.id}-VIDEO.mp4`),
      );

      if (videoFile.length === 0) {
        Alert.alert('Video Not Found', 'No local video file found for this incident');
        setIsDownloading(false);
        return;
      }

      const videoPath = videoFile[0].path;
      console.log('Processing video with ROVE overlay from path:', videoPath);

      // Check if file exists
      const fileExists = await RNFS.exists(videoPath);
      if (!fileExists) {
        Alert.alert('File Not Found', 'The video file could not be found');
        setIsDownloading(false);
        return;
      }

      // Show processing message
      Alert.alert(
        'Processing Video',
        'Adding ROVE timestamp and branding to your video...',
        [{ text: 'OK' }]
      );

      // Process video with timestamp overlay using react-native-video-processing
      const processedVideoPath = await VideoProcessingOverlayService.processVideoForSaving(
        videoPath,
        {
          id: incident.id,
          dateTime: incident.createdAt,
          createdAt: incident.createdAt,
          streetName: incident.streetName || `Incident #${incident.id}`,
          triggerType: incident.triggerType || 'Unknown'
        }
      );

      // Save to camera roll
      await CameraRoll.save(processedVideoPath, { type: 'video' });

      // Clean up processed file if it's different from original
      if (processedVideoPath !== videoPath) {
        await VideoProcessingOverlayService.cleanupTempFile(processedVideoPath);
      }

      Alert.alert(
        '✅ Success!',
        'ROVE security video with timestamp has been saved to your Photos app',
        [{ text: 'OK' }]
      );

      console.log('Video with ROVE overlay saved to gallery successfully');

    } catch (error) {
      console.error('Error saving video to gallery:', error);

      // Fallback: try to save original video if overlay processing fails
      try {
        const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
        const videoFile = files.filter((file: any) =>
          file.name.endsWith(`${incident.id}-VIDEO.mp4`),
        );

        if (videoFile.length > 0) {
          await CameraRoll.save(videoFile[0].path, { type: 'video' });
          Alert.alert(
            'Saved (Original)',
            'Could not add ROVE overlay, but original video was saved to Photos.'
          );
        } else {
          throw new Error('No video file found');
        }
      } catch (fallbackError) {
        if (error.message?.includes('permission')) {
          Alert.alert(
            'Permission Required',
            'Please allow access to Photos in your device settings to save videos'
          );
        } else {
          Alert.alert('Error', 'Failed to save video. Please try again.');
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };
  const handleSaveLocallyPress = useCallback(async () => {
    bottomSheetRef.current?.close();

    if (!selectedIncident) {
      Alert.alert('Error', 'No incident selected');
      return;
    }

    await saveVideoToGallery(selectedIncident);
  }, [selectedIncident]);

  // Updated delete function that will be called only when passcode is correct
  const handleDeleteIncident = useCallback((incidentId: string, isPasscodeCorrect: boolean) => {
    console.log('Delete called with:', incidentId, 'Passcode correct:', isPasscodeCorrect);

    if (isPasscodeCorrect) {
      // Remove from local state immediately for better UX
      const newData = data.filter((item: any) => item.id !== incidentId);
      setData(newData);

      // Delete local file if it exists
      const localVideoPath = `${RNFS.DocumentDirectoryPath}/${incidentId}-VIDEO.mp4`;
      RNFS.exists(localVideoPath).then(exists => {
        if (exists) {
          RNFS.unlink(localVideoPath).catch(err => {
            console.error('Error deleting local file:', err);
          });
        }
      });

      // Delete on server
      HomeAPIS.deleteIncident(incidentId)
        .then(() => {
          console.log('Incident deleted successfully from server');
        })
        .catch(err => {
          console.log('Error deleting incident from server:', err?.response?.data);
          // Optionally restore the item if server deletion fails
          getIncidents(); // Refresh to restore state
        });
    } else {
      // For incorrect passcode, only remove from local state (no server call)
      const newData = data.filter((item: any) => item.id !== incidentId);
      setData(newData);

      // Also delete local file for security
      const localVideoPath = `${RNFS.DocumentDirectoryPath}/${incidentId}-VIDEO.mp4`;
      RNFS.exists(localVideoPath).then(exists => {
        if (exists) {
          RNFS.unlink(localVideoPath).catch(err => {
            console.error('Error deleting local file:', err);
          });
        }
      });

      console.log('Local file removed (passcode incorrect)');
    }
  }, [data]);

  const getIncidents = useCallback((refresh = false, pageNum = 1) => {
    if (refresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    Promise.all([
      HomeAPIS.getIncidents(pageNum, 20), // Add pagination params if your API supports it
      HomeAPIS.getTrustedContacts(),
    ])
      .then(([incidentsRes, contactsRes]) => {
        // Process data efficiently
        const processedData = processIncidentData(
          incidentsRes?.data || [],
          contactsRes?.data || []
        );

        if (refresh || pageNum === 1) {
          setData(processedData);
        } else {
          setData(prevData => [...prevData, ...processedData]);
        }

        // Check if there are more items (adjust based on your API response)
        setHasMore(processedData.length === 20);
        setPage(pageNum);

      })
      .catch(err => {
        console.log('Error fetching incidents:', err?.response?.data);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  const loadMoreIncidents = useCallback(() => {
    if (!loadingMore && hasMore) {
      getIncidents(false, page + 1);
    }
  }, [loadingMore, hasMore, page, getIncidents]);

  useFocusEffect(
    useCallback(() => {
      getIncidents(true);
    }, [getIncidents]),
  );

  const renderFootageItem = ({ item }: any) => {
    return <FootageGrid item={item} />;
  };

  const renderIncidentItem = useCallback(({ item }: any) => {
    return (
      <StreamCard
        incident={{
          id: item.id,
          type: item.hasVideo ? 'video' : 'audio',
          streetName: item.displayStreetName,
          triggerType: item.triggerType,
          dateTime: item.createdAt,
          thumbnailUrl: item.thumbnailUrl,
          recipients: item.recipients,
          location: {
            latitude: item.lat || 0,
            longitude: item.lng || 0,
          },
          agoraAudioLink: item.agoraAudioLink,
          recordingType: item.recordingType,
        }}
        onDelete={handleDeleteIncident}
        onDownload={() => handleOpenDownloadSheet(item)}
      />
    );
  }, [handleDeleteIncident, handleOpenDownloadSheet]);

  const keyExtractor = useCallback((item: any) => item?.id?.toString(), []);

  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <Loader isLoading={true} />
      </View>
    );
  }, [loadingMore]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Utills.selectedThemeColors().Base}
      />

      <MainContainer customeStyle={styles.mainContainer}>
        {/* Add standardized header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIcon}>
            <Image
              source={Images.Premium}
              style={styles.settingsIcon}
              resizeMode="contain"
            />
          </View>
          <CustomText.LargeBoldText customStyle={styles.headerTitle}>
            Shared streams
          </CustomText.LargeBoldText>
        </View>

        <LegendList
          data={data}
          renderItem={renderIncidentItem}
          keyExtractor={keyExtractor}
          recycleItems={true}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.flatlist}
          showsVerticalScrollIndicator={true}
          onEndReached={loadMoreIncidents}
          onEndReachedThreshold={0.1}
          getItemLayout={(data, index) => ({
            length: 350,
            offset: 350 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Utills.selectedThemeColors().PrimaryTextColor}
              colors={[Utills.selectedThemeColors().PrimaryTextColor]}
              enabled={true}
            />
          }
        />

        <Loader isLoading={loading || isDownloading} />

        <DownloadBottomSheet
          ref={bottomSheetRef}
          onSharePress={handleSharePress}
          onSaveLocallyPress={handleSaveLocallyPress}
        />
      </MainContainer>
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Utills.selectedThemeColors().Base,
  },
  flatlist: {
    alignSelf: 'center',
    paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(20), width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(15),
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(35),
    height: Metrix.VerticalSize(35),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginRight: 5
  },
  textHeading: {
    fontSize: normalizeFont(28),
    letterSpacing: 0.7,
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  mainContainer: {
    backgroundColor: Utills.selectedThemeColors().Base,
    paddingVertical: 0,
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(20),
    paddingTop: Metrix.VerticalSize(10),
  },
  headerIcon: {
    marginRight: Metrix.HorizontalSize(5),
  },
  settingsIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
  },
});