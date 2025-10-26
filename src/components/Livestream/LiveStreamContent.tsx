import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { CustomText } from '../../../components';
import { Images, Metrix, Utills } from '../../config'

const { width: screenWidth } = Dimensions.get('window');

interface LiveStreamContentProps {
  mode: 'AUDIO' | 'VIDEO';
  modeIndex: SharedValue<number>;
  translateX: SharedValue<number>;
  renderUsers: () => React.ReactNode;
  renderViewers: () => React.ReactNode;
  isStreaming: boolean;
  zoomControls: React.ReactNode;
}

export default function LiveStreamContent({
  mode,
  modeIndex,
  translateX,
  renderUsers,
  renderViewers,
  isStreaming,
  zoomControls,
}: LiveStreamContentProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      modeIndex.value + translateX.value / screenWidth,
      [0, 1],
      [0, 1],
      'clamp'
    );

    return {
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 1],
            [0, -screenWidth]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.modesContainer, animatedStyle]}>
      {/* Audio Mode */}
      <View style={styles.modeContainer}>
        <View style={styles.audioContainer}>
          <Image
            source={Images.Audio}
            style={[
              styles.audioIcon,
              {
                tintColor: Utills.selectedThemeColors().PrimaryTextColor,
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Video Mode */}
      <View style={styles.modeContainer}>
        {renderUsers()}
        {isStreaming && renderViewers()}
        {zoomControls}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modesContainer: {
    flexDirection: 'row',
    width: screenWidth * 2,
    height: '100%',
  },
  modeContainer: {
    width: screenWidth,
    height: '100%',
  },
  audioContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: {
    width: Metrix.HorizontalSize(140),
    height: Metrix.VerticalSize(140),
  },
});