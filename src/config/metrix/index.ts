import {Dimensions, Platform, PixelRatio} from 'react-native';
import {
  widthPercentageToDP as wp2dp,
  heightPercentageToDP as hp2dp,
} from 'react-native-responsive-screen';
import {Colors} from '..';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const devHeight: number = 640; //Phone height during development
const devWidth: number = 360; //width

export const deviceHeight: number = Dimensions.get('window').height; //Device height
export const deviceWidth: number = Dimensions.get('window').width; //device width
export const deviceScale: number = Dimensions.get('window').scale;
export const defaultWindowMultiplier: number = 0.5;
export const defaultNavBarHeight: number = 65;

const {width, height}: {width: number; height: number} =
  Dimensions.get('window');
const [shortDimension, longDimension]: [number, number] =
  width < height ? [width, height] : [height, width];

//Default guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth: number = 350;
const guidelineBaseHeight: number = 680;

export const scalef = (size: number): number =>
  (shortDimension / guidelineBaseWidth) * size;
export const verticalScale = (size: number): number =>
  (longDimension / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor: number = 0.5): number =>
  size + (scalef(size) - size) * factor;
export const moderateVerticalScale = (
  size: number,
  factor: number = 0.5,
): number => size + (verticalScale(size) - size) * factor;

//gain
export const RNHeight: number = deviceHeight / devHeight;
export const RNWidth: number = deviceWidth / devWidth;

// based on iphone 5s's scale
export const scale: number = SCREEN_WIDTH / 320;

export const normalizeFont = (size: number): number => {
  // For Normalizing the font size for all type of screens, Including iPad, iPhone, Tablet, Android
  const newSize: number = moderateScale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
};

// Use this function to normalize image size
export const normalizeWithScale = (size: number): number => {
  // For Normalizing the Icon size for different screens
  return moderateScale(size, 0.4);
};

export const VerticalSize = (size: number): number => {
  // For Normalizing the Height for different screens
  // return moderateScale(size, 0.25);
  return hp2dp(`${(size / 760) * 100}%`);
};

export const HorizontalSize = (size: number): number => {
  // For Normalizing the Width for different screens
  // return moderateScale(size, 0.25)
  return wp2dp(`${(size / 360) * 100}%`);
  // return RNWidth * size;
};

export const createShadow = {
  shadowColor: Platform.OS == 'android' ? '#FFFFFF' : '#FFFFFF',
  shadowOffset: {
    width: HorizontalSize(1),
    height: VerticalSize(1),
  },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: VerticalSize(20),
};

export default {
  Radius: VerticalSize(10),
  LightRadius: VerticalSize(6),
  ActiveOpacity: 0.5,
  customFontSize: normalizeFont,
  customImageSize: normalizeWithScale,
  // FontExtraSmall: normalize(12),
  // FontSmall: normalize(14),
  // FontRegular: normalize(16),
  // FontMedium: normalize(18),
  // FontLarge: normalize(26),
  // FontExtraLarge: normalize(30),
  VerticalSize,
  HorizontalSize,
  createShadow,
};
