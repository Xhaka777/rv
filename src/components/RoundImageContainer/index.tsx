import React, {FC} from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  ImageStyle,
  ImageProps,
} from 'react-native';
import {Colors, Images, Metrix, Utills} from '../../config';
import {FadeInImage, FadeInImageProps} from '../FadeInImage';

export type RoundImageContainerProps = FadeInImageProps & {
  circleWidth?: number;
  backgroundColor?: string;
  borderRadius?: number | null;
  borderColor?: string;
  borderWidth?: number;
  styles?: ViewStyle;
  customContainerStyle?: ViewStyle;
  customImageStyles?: ViewStyle;
  imageStyle?: ImageStyle;
  defaultSource?: any;
  isEdit?: boolean;
  PressPencil?: () => void;
};

export const RoundImageContainer: FC<RoundImageContainerProps> = ({
  source,
  circleWidth = 100,
  backgroundColor = Utills.selectedThemeColors().Base,
  borderRadius = 100,
  borderColor = Utills.selectedThemeColors().Base,
  borderWidth = StyleSheet.hairlineWidth,
  styles = {},
  customContainerStyle = {},
  customImageStyles,
  imageStyle,
  defaultSource,
  isEdit = false,
  PressPencil,
  resizeMode = 'contain',
}) => {
  return (
    <View
      style={[
        {alignItems: 'center', position: 'relative'},
        customContainerStyle,
      ]}>
      <View
        style={{
          width: Metrix.HorizontalSize(circleWidth),
          backgroundColor: backgroundColor,
          height: Metrix.HorizontalSize(circleWidth),
          borderRadius: borderRadius
            ? Metrix.HorizontalSize(borderRadius)
            : Metrix.HorizontalSize(circleWidth / 2),
          borderColor: borderColor,
          borderWidth: borderWidth,
          overflow: 'hidden',
          ...styles,
        }}>
        <FadeInImage
          source={source}
          resizeMode={resizeMode}
          customImageContainerStyle={{width: '100%', height: '100%'}}
          imageStyles={imageStyle}
        />
      </View>
    </View>
  );
};
