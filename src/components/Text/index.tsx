import React, {ReactNode} from 'react';
import {Text, StyleSheet, StyleProp, TextStyle, TextProps} from 'react-native';
import {Fonts, FontType, Utills} from '../../config';

type CustomTextProps = TextProps & {
  children: ReactNode;
  customStyle?: StyleProp<TextStyle>;
  isSecondaryColor?: boolean;
};

const ExtraLargeBoldText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.ExtraLargeBoldText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

const LargeBoldText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.LargeBoldText,
        {
          // textAlign: I18nManager.forceRTL ? "left" : "right",
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

const LargeSemiBoldText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.LargeSemiBoldText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

const MediumText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.MediumText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

const RegularText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.RegularText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};
const SmallText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.SmallText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};
const ExtraSmallText = ({
  children,
  customStyle,
  isSecondaryColor,
  ...rest
}: CustomTextProps) => {
  return (
    <Text
      style={[
        styles.ExtraSmallText,
        {
          color: isSecondaryColor
            ? Utills.selectedThemeColors().SecondaryTextColor
            : Utills.selectedThemeColors().PrimaryTextColor,
        },
        ,
        customStyle,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

export default {
  ExtraLargeBoldText,
  LargeBoldText,
  LargeSemiBoldText,
  MediumText,
  RegularText,
  SmallText,
  ExtraSmallText,
};

const styles = StyleSheet.create({
  ExtraLargeBoldText: {
    fontFamily: Fonts['Bold'],
    fontSize: FontType.FontExtraLarge,
    letterSpacing: 0.5,
  },
  LargeBoldText: {
    fontFamily: Fonts['Bold'],
    fontSize: FontType.FontLarge,
    letterSpacing: 0.5,
  },
  LargeSemiBoldText: {
    fontFamily: Fonts['Semi-Bold'],
    fontSize: FontType.FontLarge,
    letterSpacing: 0.5,
  },
  MediumText: {
    fontFamily: Fonts['Medium'],
    fontSize: FontType.FontMedium,
    letterSpacing: 0.5,
  },
  RegularText: {
    fontFamily: Fonts['Regular'],
    fontSize: FontType.FontRegular,
    letterSpacing: 0.5,
  },
  SmallText: {
    fontFamily: Fonts['Regular'],
    fontSize: FontType.FontSmall,
    letterSpacing: 0.5,
  },
  ExtraSmallText: {
    fontFamily: Fonts['Regular'],
    fontSize: FontType.FontExtraSmall,
    letterSpacing: 0.5,
  },
});
