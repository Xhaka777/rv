import React from 'react';
import {View, StyleSheet} from 'react-native';
import Video from 'react-native-video';
import {useRoute} from '@react-navigation/native';
import {BackHeader, MainContainer} from '../../../components';
import {Metrix} from '../../../config';

export const Videos: React.FC<any> = () => {
  const route = useRoute<any>();
  const videos = route?.params?.videos;

  console.log('videos', videos)

  return (
    <MainContainer customeStyle={{paddingVertical: 0, paddingHorizontal: 0}}>
      <BackHeader
        customeStyle={{padding: Metrix.VerticalSize(10)}}
        heading="Video Stream"
      />
      {/* Video Player */}
      {videos && (
        <View style={{flex: 1}}>
          <View style={styles.backVideoContainer}>
            <Video
              source={{uri: videos?.[1]?.path}}
              style={{width: '100%', height: '100%'}}
              controls
              resizeMode="cover"
            />
          </View>
          <View style={styles.frontVideoContainer}>
            <Video
              source={{uri: videos?.[0]?.path}}
              style={{width: '100%', height: '100%'}}
              controls
              resizeMode="cover"
            />
          </View>
        </View>
      )}
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  backVideoContainer: {
    flex: 1,
    borderRadius: Metrix.HorizontalSize(10),
    overflow: 'hidden',
  },
  frontVideoContainer: {
    height: Metrix.VerticalSize(150),
    borderRadius: Metrix.HorizontalSize(10),
    width: '30%',
    position: 'absolute',
    zIndex: 100,
    top: '2%',
    left: '4%',
    overflow: 'hidden',
  },
});
