import React, { FC, useState, Ref } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Image,
  TouchableOpacity,
  TextInputProps,
  ImageProps,
  ViewStyle,
} from 'react-native';
import { Mic } from 'lucide-react-native'; // Import Mic icon
import { Colors, Fonts, Metrix, Images, FontType, Utills } from '../../config';

type CustomSearchBarProps = TextInputProps & {
  customStyle?: TextInputProps['style'];
  isIcon?: boolean;
  iconImage?: ImageProps['source'];
  onBtnPress?: () => void;
  iconStyle?: ImageProps['style'];
  inputRef?: Ref<TextInput>;
  mainContainer?: ViewStyle;
  leftIcon?: any;
  showMicIcon?: boolean;
  onMicPress?: () => void;
  rightElement?: React.ReactNode;
};

export const CustomSearchBar: FC<CustomSearchBarProps> = ({
  customStyle,
  isIcon,
  iconImage,
  onBtnPress,
  iconStyle = {},
  inputRef,
  mainContainer,
  leftIcon = Images.Search,
  showMicIcon = false,
  onMicPress,
  rightElement,
  ...rest
}) => {
  return (
    <View style={[styles.textContainer, mainContainer]}>
      <Image
        source={leftIcon}
        style={[{
          width: 24,
          height: 24,
          tintColor: '#000',
          marginLeft: Metrix.HorizontalSize(10),
        }, iconStyle]}
        resizeMode="contain"
      />
      <TextInput
        selectionColor={Utills.selectedThemeColors().PrimaryTextColor}
        style={[styles.textInput, customStyle]}
        placeholderTextColor="#999"
        placeholder='Search'
        ref={inputRef}
        {...rest}
      />
      
      {/* Show mic icon if enabled */}
      {showMicIcon && (
        <TouchableOpacity onPress={onMicPress} style={styles.micButton}>
          <Mic size={20} color="#666" />
        </TouchableOpacity>
      )}

      {/* Right element (if provided, it will show after mic) */}
      {rightElement && rightElement}
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    borderRadius: Metrix.VerticalSize(10),
    height: Metrix.VerticalSize(40),
    width: '100%',
    flexDirection: 'row',
    marginVertical: Metrix.VerticalSize(10),
    backgroundColor: '#ffffff',
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    alignItems: 'center',
    overflow: 'hidden',
  },
  textInput: {
    color: Utills.selectedThemeColors().Base,
    fontSize: Metrix.customFontSize(14),
    padding: Metrix.VerticalSize(12),
    fontFamily: Fonts['Regular'],
    flex: 1,
  },
  micButton: {
    padding: Metrix.HorizontalSize(8),
    marginRight: Metrix.HorizontalSize(5),
    justifyContent: 'center',
    alignItems: 'center',
  },
});