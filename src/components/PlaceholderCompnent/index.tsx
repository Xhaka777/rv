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
import {MainContainer} from '../MainContainer';
import {PrimaryButton, PrimaryButtonProps} from '../PrimaryButton';
import {Colors, Metrix, Utills} from '../../config';
import {CustomText, FadeContainer} from '..';

type PlaceholderComponentProps = PrimaryButtonProps & {
  heading?: string;
  subHeading?: string;
  image: ImageProps['source'];
  imageStyle?: ImageProps['style'];
  bottomBtnText?: string;
  onBottombtnPress?: () => void;
};

export const PlaceholderComponent: React.FC<PlaceholderComponentProps> = ({
  heading,
  subHeading,
  image,
  title,
  onPress,
  imageStyle,
  bottomBtnText,
  onBottombtnPress,
}) => {
  return (
    <FadeContainer>
      <MainContainer>
        <View style={styles.container}>
          <Image
            source={image}
            style={[styles.placeholderStyle, imageStyle]}
            resizeMode="contain"
          />
          <CustomText.LargeBoldText
            customStyle={[
              styles.textStyle,
              {
                marginTop: Metrix.VerticalSize(50),
                color: Utills.selectedThemeColors().PrimaryTextColor,
              },
            ]}>
            {heading}
          </CustomText.LargeBoldText>
          <CustomText.RegularText
            isSecondaryColor
            customStyle={[
              styles.textStyle,
              {
                lineHeight: Metrix.VerticalSize(20),
                marginTop: Metrix.VerticalSize(5),
              },
            ]}>
            {subHeading}
          </CustomText.RegularText>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
          }}>
          <PrimaryButton onPress={onPress} title={title} />
          <TouchableOpacity activeOpacity={0.7} onPress={onBottombtnPress}>
            {bottomBtnText && (
              <CustomText.MediumText
                customStyle={{
                  textAlign: 'center',
                  color: Utills.selectedThemeColors().PrimaryTextColor,
                  marginTop: Metrix.VerticalSize(20),
                }}>
                {bottomBtnText}
              </CustomText.MediumText>
            )}
          </TouchableOpacity>
        </View>
      </MainContainer>
    </FadeContainer>
  );
};

interface PlaceholderComponentStyles {
  textStyle: TextStyle;
  container: ViewStyle;
  placeholderStyle: ImageStyle;
}
const styles = StyleSheet.create<PlaceholderComponentStyles>({
  textStyle: {textAlign: 'center'},
  container: {
    flex: 1,
    alignItems: 'center',
    // borderWidth: 1,
    // borderColor: '#ffffff',
    justifyContent: 'flex-end',
  },
  placeholderStyle: {width: '80%', height: Metrix.VerticalSize(158)},
});
