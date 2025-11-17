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
  onImagePress?: () => void; // New prop for image click handler
  btnText?: string;
  headingText?: string;
  subHeadingText?: string;
  customMainContainerStyle?: ViewStyle;
  uploadPhotoIcons?: boolean;
  onPressCheck?: () => void;
  onPressCancel?: () => void;
  showPlaceholder?: boolean; // New prop to control placeholder display
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  onTextPress,
  onImagePress,
  btnText,
  subHeadingText,
  headingText,
  source,
  customMainContainerStyle,
  uploadPhotoIcons,
  onPressCancel,
  onPressCheck,
  showPlaceholder = true,
}) => {
  // Check if there's a valid image source
  const hasValidImage = source && (
    (typeof source === 'object' && source.uri && source.uri.trim() !== '' && source.uri !== 'null') ||
    (typeof source === 'number')
  );

  console.log('ProfileHeader - hasValidImage:', hasValidImage, 'source:', source);

  return (
    <View style={customMainContainerStyle}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onImagePress || onTextPress}
        style={styles.imageContainer}
      >
        {hasValidImage ? (
          // Show actual user image with gray border
          <View style={styles.imageWithBorder}>
            <RoundImageContainer source={source} />
          </View>
        ) : (
          // Show no-image placeholder - ALWAYS show this when no valid image
          <View style={styles.noImageContainer}>
            <View style={styles.noImageCircle}>
              {/* User placeholder icon */}
              <View style={styles.userIconContainer}>
                <View style={styles.userIconPlaceholder}>
                  <CustomText.MediumText style={styles.userInitial}>
                    +
                  </CustomText.MediumText>
                </View>
              </View>
              
              <CustomText.SmallText style={styles.noImageText}>
                No Image
              </CustomText.SmallText>
              
              <CustomText.SmallText style={styles.tapToAddText}>
                Tap to add
              </CustomText.SmallText>
            </View>
            
            {/* Camera icon overlay */}
            <View style={styles.addPhotoOverlay}>
              <CustomText.MediumText style={styles.addPhotoText}>
                📷
              </CustomText.MediumText>
            </View>
          </View>
        )}
      </TouchableOpacity>

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
          style={styles.buttonContainer}>
          <CustomText.MediumText
            customStyle={[
              {
                fontSize: FontType.FontSmall,
                color: Utills.selectedThemeColors().TertiaryTextColor,
              },
              styles.textStyle,
            ]}>
            {btnText || (!hasValidImage ? 'Add Photo' : 'Change Photo')}
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
  imageContainer: ViewStyle;
  imageWithBorder: ViewStyle;
  placeholderContainer: ViewStyle;
  placeholderIcon: ImageStyle;
  placeholderText: TextStyle;
  cameraOverlay: ViewStyle;
  cameraIcon: ImageStyle;
  buttonContainer: ViewStyle;
  noImageContainer: ViewStyle;
  noImageCircle: ViewStyle;
  userIconContainer: ViewStyle;
  userIconPlaceholder: ViewStyle;
  userInitial: TextStyle;
  noImageText: TextStyle;
  tapToAddText: TextStyle;
  addPhotoOverlay: ViewStyle;
  addPhotoText: TextStyle;
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
    height: Metrix.VerticalSize(30),
    width: '30%',
    alignSelf: 'center',
  },
  imageContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  imageWithBorder: {
    borderRadius: Metrix.HorizontalSize(50), // Assuming circular image
    borderWidth: 2,
    borderColor: '#888888', // Gray border
    padding: 2, // Small padding between border and image
  },
  placeholderContainer: {
    width: Metrix.HorizontalSize(100),
    height: Metrix.VerticalSize(100),
    borderRadius: Metrix.HorizontalSize(50),
    backgroundColor: Utills.selectedThemeColors().WhiteOpacity('0.1'),
    borderWidth: 2,
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: Metrix.HorizontalSize(30),
    height: Metrix.VerticalSize(30),
    tintColor: Utills.selectedThemeColors().TertiaryTextColor,
    marginBottom: Metrix.VerticalSize(5),
  },
  placeholderText: {
    fontSize: FontType.FontExtraSmall,
    color: Utills.selectedThemeColors().TertiaryTextColor,
    textAlign: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Utills.selectedThemeColors().PrimaryColor,
    borderRadius: Metrix.HorizontalSize(15),
    padding: Metrix.HorizontalSize(8),
    borderWidth: 2,
    borderColor: Utills.selectedThemeColors().BackgroundColor,
  },
  cameraIcon: {
    width: Metrix.HorizontalSize(16),
    height: Metrix.VerticalSize(16),
    tintColor: Colors.white,
  },
  buttonContainer: {
    width: '40%',
    alignSelf: 'center',
  },
  // Enhanced no-image placeholder styles
  noImageContainer: {
    position: 'relative',
    width: Metrix.HorizontalSize(100),
    height: Metrix.VerticalSize(100),
  },
  noImageCircle: {
    width: Metrix.HorizontalSize(100),
    height: Metrix.VerticalSize(100),
    borderRadius: Metrix.HorizontalSize(50),
    backgroundColor: '#2A2A2A', // Dark gray background for visibility
    borderWidth: 2,
    borderColor: '#444444', // Lighter gray border for contrast
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconContainer: {
    marginBottom: Metrix.VerticalSize(8),
  },
  userIconPlaceholder: {
    width: Metrix.HorizontalSize(40),
    height: Metrix.VerticalSize(40),
    borderRadius: Metrix.HorizontalSize(20),
    backgroundColor: '#404040', // Medium gray for icon background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(5),
  },
  userInitial: {
    fontSize: Metrix.customFontSize(20),
    color: '#FFFFFF', // White text for visibility
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noImageText: {
    fontSize: FontType.FontExtraSmall,
    color: '#CCCCCC', // Light gray text
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: Metrix.VerticalSize(2),
  },
  tapToAddText: {
    fontSize: FontType.FontExtraSmall - 1,
    color: '#999999', // Medium gray text
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addPhotoOverlay: {
    position: 'absolute',
    bottom: Metrix.VerticalSize(5),
    right: Metrix.HorizontalSize(5),
    backgroundColor: '#FF6B35', // Orange/red background for visibility
    borderRadius: Metrix.HorizontalSize(15),
    padding: Metrix.HorizontalSize(8),
    borderWidth: 2,
    borderColor: '#000000', // Black border for contrast
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 8,
  },
  addPhotoText: {
    fontSize: Metrix.customFontSize(14),
    color: '#FFFFFF',
    textAlign: 'center',
  },
});