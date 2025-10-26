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
} from 'react-native';
import {Metrix, Colors, Fonts, Images, FontType, Utills} from '../../config';
import {CustomText} from '..';

export type PrimaryButtonProps = TouchableOpacityProps & {
  title: string;
  isLoading?: boolean;
  disabled?: boolean;
  width?: number | string;
  color?: string;
  textColor?: string;
  customStyles?: StyleProp<ViewStyle>;
  customTextStyle?: any;
};

export const PrimaryButton: FC<PrimaryButtonProps> = ({
  title,
  onPress,
  isLoading,
  disabled,
  width = '100%',
  color = Utills.selectedThemeColors().PrimaryTextColor,
  textColor = Utills.selectedThemeColors().Base,
  customStyles,
  customTextStyle,
  ...rest
}) => {
  return (
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
        <CustomText.MediumText
          customStyle={[
            {
              color: textColor,
              fontSize: FontType.FontMedium,
              fontWeight: '700',
            },
            customTextStyle,
          ]}>
          {title}
        </CustomText.MediumText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    height: Metrix.VerticalSize(45),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Metrix.VerticalSize(10),
    marginVertical: Metrix.VerticalSize(10),
    // backgroundColor: selectedTheme(Utills.currentThemeColors()).Primary,
    // ...Metrix.createShadow(),
  },
});
