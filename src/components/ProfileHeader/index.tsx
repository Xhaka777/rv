import {
  Image,
  ImageStyle,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import React from 'react';
import {
  RoundImageContainer,
  RoundImageContainerProps,
} from '../RoundImageContainer';
import {Colors, FontType, Images, Metrix, Utills} from '../../config';
import {CustomText, FadeContainer} from '..';
import {TouchableOpacity} from 'react-native-gesture-handler';

type ProfileHeaderProps = RoundImageContainerProps & {
  onTextPress?: () => void;
  btnText?: string;
  headingText?: string;
  subHeadingText?: string;
  customMainContainerStyle?: ViewStyle;
  uploadPhotoIcons?: boolean;
  onPressCheck?: () => void;
  onPressCancel?: () => void;
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  onTextPress,
  btnText,
  subHeadingText,
  headingText,
  source,
  customMainContainerStyle,
  uploadPhotoIcons,
  onPressCancel,
  onPressCheck,
}) => {
  return (
    <View style={customMainContainerStyle}>
      <RoundImageContainer source={source || Images.UserPlaceholder} />
      <View
        style={{
          marginVertical: Metrix.VerticalSize(
            subHeadingText && subHeadingText ? 15 : 0,
          ),
        }}>
        <CustomText.LargeSemiBoldText
          customStyle={[
            {
              fontSize: FontType.FontRegular,
              color: Utills.selectedThemeColors().PrimaryTextColor,
            },
            styles.textStyle,
          ]}>
          {headingText}
        </CustomText.LargeSemiBoldText>
        <CustomText.SmallText customStyle={styles.textStyle}>
          {subHeadingText}
        </CustomText.SmallText>
      </View>
      {!uploadPhotoIcons ? (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={onTextPress}
          style={{
            // borderWidth: 1,
            // borderColor: 'red',
            width: '40%',
            alignSelf: 'center',
          }}>
          <CustomText.MediumText
            customStyle={[
              {
                fontSize: FontType.FontSmall,
                color: Utills.selectedThemeColors().TertiaryTextColor,
              },
              styles.textStyle,
            ]}>
            {btnText}
          </CustomText.MediumText>
        </TouchableOpacity>
      ) : (
        <FadeContainer>
          <View style={styles.iconsMainContainer}>
            <TouchableOpacity
              style={styles.iconBtnsStyle}
              onPress={onPressCheck}>
              <Image
                source={Images.CircleCheck}
                style={styles.iconBtnsImageStyle}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtnsStyle}
              onPress={onPressCancel}>
              <Image
                source={Images.CircleX}
                style={{
                  width: Metrix.HorizontalSize(20),
                  height: Metrix.VerticalSize(20),
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </FadeContainer>
      )}
    </View>
  );
};

interface ProfileHeaderStyles {
  textStyle: TextStyle;
  iconBtnsStyle: ViewStyle;
  iconBtnsImageStyle: ImageStyle;
  iconsMainContainer: ViewStyle;
}
const styles = StyleSheet.create<ProfileHeaderStyles>({
  textStyle: {
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 25,
  },
  iconBtnsImageStyle: {width: '100%', height: '100%'},
  iconBtnsStyle: {
    width: Metrix.HorizontalSize(25),
    height: Metrix.VerticalSize(25),
  },
  iconsMainContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    // borderWidth: 1,
    // borderColor: 'red',
    height: Metrix.VerticalSize(30),
    width: '30%',
    alignSelf: 'center',
  },
});
