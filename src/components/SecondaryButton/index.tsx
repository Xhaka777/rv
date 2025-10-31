import React, {FC, ReactNode} from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  View,
  ImageProps,
} from 'react-native';
import {Metrix, Colors, Fonts, Images, FontType, Utills} from '../../config';
import {CustomText, RoundImageContainer} from '..';
import {RoundImageContainerProps} from '../RoundImageContainer';
import utills from '../../config/utills';

type PrimaryButtonProps = TouchableOpacityProps &
  RoundImageContainerProps & {
    title: string;
    isLoading?: boolean;
    disabled?: boolean;
    width?: number | string;
    color?: string;
    textColor?: string;
    customStyles?: StyleProp<ViewStyle>;
    isIcon?: boolean;
    icon?: ImageProps['source'];
  };

export const SecondaryButton: FC<PrimaryButtonProps> = ({
  title,
  onPress,
  isLoading,
  disabled,
  width = '100%',
  color = Utills.selectedThemeColors().Base,
  textColor = utills.selectedThemeColors().PrimaryTextColor,
  customStyles,
  isIcon,
  source,
  circleWidth = 20, // Reduced from 27 to 20 for smaller icon
  ...rest
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.buttonContainer,
      {
        backgroundColor: disabled
          ? Utills.selectedThemeColors().TextInputPlaceholserColor
          : color,
        width: width,
      },
      customStyles,
    ]}
    disabled={disabled || isLoading}
    {...rest}>
    
    {isLoading ? (
      <ActivityIndicator color={textColor} />
    ) : (
      <View style={styles.contentContainer}>
        {isIcon && source && (
          <Image
            source={source}
            style={styles.iconStyle}
            resizeMode="contain"
          />
        )}
        <CustomText.MediumText
          customStyle={[
            styles.titleText,
            {
              color: textColor,
              marginLeft: isIcon ? Metrix.HorizontalSize(8) : 0, // Small gap between icon and text
            }
          ]}>
          {title}
        </CustomText.MediumText>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  buttonContainer: {
    height: Metrix.VerticalSize(50),
    justifyContent: 'center', // Center the entire content
    alignItems: 'center',
    borderRadius: Metrix.VerticalSize(10),
    marginVertical: Metrix.VerticalSize(10),
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    borderWidth: 2,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the icon and text together
  },
  iconStyle: {
    width: Metrix.HorizontalSize(16), // Smaller icon size
    height: Metrix.VerticalSize(16),  // Smaller icon size
  },
  titleText: {
    fontSize: FontType.FontMedium,
  },
});