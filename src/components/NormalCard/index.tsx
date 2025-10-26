import {
  Image,
  ImageProps,
  ImageStyle,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import React from 'react';
import {Colors, FontType, Images, Metrix, Utills} from '../../config';
import {CustomText, FadeContainer} from '..';

type NormalCardComponentProps = {
  text?: string;
  // icon?:IconProps['source'];
  image: ImageProps['source'];
  icon: ImageProps['source'];
  imageStyle?: ImageProps['style'];
  onPress?: () => void;
};

export const NormalCardComponent: React.FC<NormalCardComponentProps> = ({
  text,
  image,
  icon,
  onPress,
}) => {
  return (
    // <MainContainer>
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.touchableOpacityStyle]}>
      <Image
        source={image}
        style={{
          width: Metrix.HorizontalSize(35),
          height: Metrix.VerticalSize(34),
        }}
        resizeMode="contain"
      />
      <CustomText.LargeBoldText customStyle={styles.textStyle}>
        {text}
      </CustomText.LargeBoldText>
      <Image
        source={icon}
        style={{
          width: Metrix.HorizontalSize(24),
          height: Metrix.VerticalSize(24),
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  textStyle: {
    width: '70%',
    fontSize: FontType.FontRegular,
  },
  container: {
    // flex: 1,
    // alignItems: 'center',
    justifyContent: 'flex-end',
  },
  touchableOpacityStyle: {
    alignItems: 'center',
    marginTop: Metrix.VerticalSize(10),
    borderRadius: Metrix.VerticalSize(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Metrix.HorizontalSize(10),
    backgroundColor: Utills.selectedThemeColors().Base,
    ...Metrix.createShadow,
  },
});
