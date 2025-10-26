import React, {FC, useState, Ref} from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Image,
  TouchableOpacity,
  TextInputProps,
  ImageProps,
  ViewStyle,
  I18nManager,
  ImageSourcePropType,
  ImageStyle,
} from 'react-native';
import {CustomText} from '..';
import {Colors, Fonts, Metrix, Images, FontType, Utills} from '../../config';
import {useThemeHook} from '../../hooks';

type CustomInputProps = TextInputProps & {
  customStyle?: TextInputProps['style'];
  onEyePress?: () => void;
  hidepswdState?: boolean;
  eye?: boolean;
  onBtnPress?: () => void;
  iconStyle?: ImageProps['style'];
  error?: string;
  touched?: boolean;
  inputRef?: Ref<TextInput>;
  heading?: string;
  eyeImg?: ImageSourcePropType;
  customIconStyle?: ImageStyle;
  mainContainer?: ViewStyle;
};

export const CustomInput: FC<CustomInputProps> = ({
  customStyle,
  onEyePress,
  hidepswdState,
  eye,
  onBtnPress,
  iconStyle = {},
  error,
  touched,
  inputRef,
  heading,
  eyeImg = Images.EyeAbleIcon,
  customIconStyle,
  mainContainer,
  ...rest
}) => {
  //   const [isFocused, setIsFocused] = useState(false);
  // const {Colors} = useThemeHook();

  return (
    <View
      style={{
        marginTop: Metrix.VerticalSize(5),
      }}>
      {heading && (
        <CustomText.RegularText
          customStyle={{
            fontSize: Metrix.customFontSize(15),
          }}>
          {heading || ''}
        </CustomText.RegularText>
      )}
      <View style={[styles.textContainer, mainContainer]}>
        <TextInput
          // onFocus={() => setIsFocused(true)}
          // onBlur={() => setIsFocused(false)}
          selectionColor={Utills.selectedThemeColors().PrimaryTextColor}
          style={[styles.textInput, customStyle]}
          placeholderTextColor={
            Utills.selectedThemeColors().TextInputPlaceholserColor
          }
          ref={inputRef}
          {...rest}
        />
        {eye && (
          <TouchableOpacity
            activeOpacity={0.6}
            style={styles.eyeStyle}
            onPress={onEyePress}>
            {hidepswdState ? (
              <Image
                source={Images.EyeDisableIcon}
                style={{
                  width: '45%',
                  height: '45%',
                  tintColor: Utills.selectedThemeColors().SecondaryTextColor,
                }}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={eyeImg}
                style={{
                  width: '45%',
                  height: '45%',
                  ...customIconStyle,
                }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        )}
      </View>
      {touched && error && (
        <CustomText.SmallText
          customStyle={{
            color: Utills.selectedThemeColors().ErrorTextColor,
            marginBottom: Metrix.VerticalSize(15),
            marginLeft: Metrix.HorizontalSize(10),
          }}>
          {error}
        </CustomText.SmallText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    borderWidth: 2,
    borderRadius: Metrix.VerticalSize(10),
    height: Metrix.VerticalSize(48),
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Metrix.VerticalSize(10),
    backgroundColor: Utills.selectedThemeColors().Base,
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    alignItems: 'center',
    overflow: 'hidden',
  },
  textInput: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(16),
    paddingLeft: Metrix.HorizontalSize(20),
    fontFamily: Fonts['Regular'],
    height: '100%',
    width: '85%',
    letterSpacing: 0.5,
    // textAlign: I18nManager.forceRTL ? "left" : "right",
    // borderWidth: 1,
    // backgroundColor: Utills.selectedThemeColors().TextInputBaseColor,
  },
  eyeStyle: {
    width: '15%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Utills.selectedThemeColors().Base,
  },
});
