import {Image, StyleSheet, TouchableOpacity} from 'react-native';
import React, {useEffect, useState} from 'react';
import {
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../config';
import {CustomText} from '..';
import moment from 'moment';
import RNFS from 'react-native-fs';
import {createThumbnail} from 'react-native-create-thumbnail';

type FootageGridProps = {
  item?: any;
};

export const FootageGrid: React.FC<FootageGridProps> = ({item}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Fetch video files once when the component is mounted
  useEffect(() => {
    const getVideoFiles = async () => {
      try {
        const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
        const videoFile = files.filter((file: any) =>
          file.name.endsWith(`${item?.id}-VIDEO.mp4`),
        );
        console.log('Item file', videoFile);

        if (
          videoFile?.length > 0 &&
          videoFile?.[0]?.path?.endsWith(`${item?.id}-VIDEO.mp4`)
        ) {
          console.log('In If');
          createThumbnail({
            url: videoFile?.[0].path,
            timeStamp: 10000,
          })
            .then(response => {
              setThumbnail(response?.path);
            })
            .catch(error => {
              console.error('Error creating thumbnail:', error);
            });
        }
      } catch (error) {
        console.error('Error fetching video files:', error);
      }
    };

    getVideoFiles();
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        NavigationService.navigate(RouteNames.HomeRoutes.FootageDetails, {
          id: item?.id,
        });
      }}
      key={item?.id}
      style={styles.gridCard}>
      {thumbnail ? (
        <>
          <Image
            source={Images.PlayBtn}
            resizeMode={'cover'}
            style={styles.playBtn}
          />
          <Image
            source={{uri: thumbnail}}
            resizeMode={'cover'}
            style={{width: '100%', height: '100%'}}
          />
        </>
      ) : (
        <Image
          source={Images.Audio}
          resizeMode="contain"
          style={{
            width: Metrix.HorizontalSize(55),
            height: Metrix.VerticalSize(55),
          }}
        />
      )}
      {/* {isOlderThan7Days && (
        <View style={styles.editBox}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert('Are you sure?', 'You want to delete this incident', [
                {text: 'Cancel', style: 'default'},
                {
                  text: 'Yes',
                  style: 'destructive',
                  //   onPress: () => deleteFootage(item?.id),
                },
              ]);
            }}>
            <RoundImageContainer
              resizeMode="contain"
              circleWidth={28}
              source={Images.Delete}
            />
          </TouchableOpacity>
        </View>
      )} */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: '33%',
    alignItems: 'center',
    justifyContent: 'center',
    height: Metrix.VerticalSize(100),
    backgroundColor: Utills.selectedThemeColors().Base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Utills.selectedThemeColors().SecondaryTextColor,
  },
  playBtn: {
    width: Metrix.HorizontalSize(50),
    height: Metrix.HorizontalSize(50),
    position: 'absolute',
    zIndex: 10,
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
});
