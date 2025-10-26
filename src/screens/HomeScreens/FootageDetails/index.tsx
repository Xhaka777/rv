import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {FootageDetailsProps} from '../../propTypes';
import {
  BackHeader,
  CustomText,
  Loader,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import {useRoute} from '@react-navigation/native';
import {
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSelector} from 'react-redux';
import {RootState} from '../../../redux/reducers';
import {HomeAPIS} from '../../../services/home';
import moment from 'moment';
import RNFS from 'react-native-fs';
import {createThumbnail} from 'react-native-create-thumbnail';

export const FootageDetails: React.FC<FootageDetailsProps> = ({}) => {
  const route = useRoute<any>();
  const {id} = route?.params;
  const mapRef = useRef<any>(null);
  const userCoordinates = useSelector(
    (state: RootState) => state.home.userLocation,
  );
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>([]);
  const [stream, setStream] = useState<any>([]);
  const [thumbnail, setThumbnail] = useState('');
  const isOlderThan7Days = moment().diff(moment(data?.createdAt), 'days') >= 7;

  const getVideoFiles = async (incidentNumber: any) => {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const audioFiles = files.filter(file =>
        file.name.endsWith(`-${incidentNumber}-AUDIO.mp4`),
      );
      const videoFiles = files.filter(file =>
        file.name.endsWith(`-${incidentNumber}-VIDEO.mp4`),
      );
      if (videoFiles) {
        setStream(videoFiles);
        generateThumbnail(videoFiles?.[1]?.path);
      } else {
        setStream(audioFiles);
      }
    } catch (error) {
      console.error('Error fetching video files:', error);
    }
  };

  const generateThumbnail = async (path: any) => {
    try {
      const response = await createThumbnail({
        url: path,
        timeStamp: 10000,
      });
      setThumbnail(response.path);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  };

  const getDetails = () => {
    setLoading(true);
    HomeAPIS.getIncidentDetail(id)
      .then(res => {
        console.log('Res details', res?.data);
        const item = res?.data;
        const data = {
          audio: item?.audio_file,
          description: item?.description,
          id: item?.id,
          lat: item?.location_latitude,
          lng: item?.location_longitude,
          status: item?.status,
          createdAt: item?.timestamp,
          user: item?.user,
        };
        setData(data);
        getVideoFiles(item?.id);
        setLoading(false);
      })
      .catch(err => {
        console.log('Err', err?.response?.data);
        setLoading(false);
      });
  };

  const deleteFootage = (id: any) => {
    setLoading(true);
    HomeAPIS.deleteIncident(id)
      .then(res => {
        setLoading(false);
        NavigationService.goBack();
      })
      .catch(err => {
        console.log('Err', err?.response?.data);
        setLoading(false);
      });
  };

  useEffect(() => {
    getDetails();
  }, []);

  return (
    <MainContainer customeStyle={{paddingHorizontal: 0}} isFlatList>
      <BackHeader
        customeStyle={{paddingHorizontal: Metrix.VerticalSize(15)}}
        heading={'Incident Details'}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainContainer}>
        {stream?.length > 0 && (
          <View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                NavigationService.navigate(RouteNames.HomeRoutes.Videos, {
                  videos: stream,
                });
              }}
              style={styles.videoContainer}>
              <Image
                source={Images.PlayBtn}
                resizeMode={'cover'}
                style={styles.playBtn}
              />
              {thumbnail && (
                <Image
                  source={{uri: thumbnail}}
                  resizeMode={'cover'}
                  style={{width: '100%', height: '100%'}}
                />
              )}
            </TouchableOpacity>
          </View>
        )}
        <View style={{paddingHorizontal: Metrix.VerticalSize(15)}}>
          <View style={{marginTop: Metrix.VerticalSize(10)}}>
            <CustomText.MediumText customStyle={styles.details}>
              Incident # {data?.id}
            </CustomText.MediumText>
          </View>
          <View>
            {/* <CustomText.MediumText customStyle={styles.heading}>
              Reported On :
            </CustomText.MediumText> */}
            <CustomText.MediumText customStyle={styles.details}>
              {moment(data?.createdAt).format('DD MMMM, YYYY, h:mm A')}
            </CustomText.MediumText>
          </View>
          <View>
            <View style={styles.mapView}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                ref={mapRef}
                zoomEnabled={true}
                showsUserLocation={true}
                scrollEnabled={true}
                region={{
                  latitude: data.lat,
                  longitude: data.lng,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                onRegionChangeComplete={loc => {}}>
                <Marker
                  coordinate={{
                    latitude: data.lat,
                    longitude: data.lng,
                  }}
                />
              </MapView>
            </View>
          </View>
          {isOlderThan7Days && (
            <PrimaryButton
              color={Utills.selectedThemeColors().Danger}
              title={'Delete Incident'}
              textColor={Utills.selectedThemeColors().PrimaryTextColor}
              onPress={() => deleteFootage(id)}
            />
          )}
        </View>
      </ScrollView>
      <Loader isLoading={loading} />
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    paddingBottom: Metrix.VerticalSize(30),
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapView: {
    width: '100%',
    height: Metrix.VerticalSize(180),
    marginVertical: Metrix.VerticalSize(20),
    borderRadius: Metrix.HorizontalSize(5),
    overflow: 'hidden',
  },
  heading: {textDecorationLine: 'underline'},
  details: {lineHeight: 50},
  videoContainer: {
    width: '100%',
    height: Metrix.VerticalSize(400),
    borderRadius: Metrix.HorizontalSize(5),
    marginTop: Metrix.VerticalSize(5),
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBtn: {
    width: Metrix.HorizontalSize(70),
    height: Metrix.HorizontalSize(70),
    position: 'absolute',
    zIndex: 10,
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
});
