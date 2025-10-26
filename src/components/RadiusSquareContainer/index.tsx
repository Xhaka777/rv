import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  ImageProps,
  ImageStyle,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {Colors, Images, Metrix} from '../../config';
import {CustomText, LottieAnimatedComponent} from '..';
import Lottie from 'lottie-react-native';

export type RadiusSquareContainerProps = {
  imageSrc: ImageProps['source'];
  resizeMode?: ImageProps['resizeMode'];
  customImageContainerStyle?: ImageStyle;
  heading?: string;
  subHeading?: string;
};

export const RadiusSquareContainer: React.FC<RadiusSquareContainerProps> = ({
  imageSrc,
  resizeMode = 'stretch',
  customImageContainerStyle,
  heading,
  subHeading,
}) => {
  const [isLoad, setIsLoad] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <ImageBackground
      style={[styles.imageStyle, customImageContainerStyle]}
      source={imageSrc}
      resizeMode={resizeMode}
      onLoadStart={() => setIsLoad(true)}
      onLoadEnd={() => setIsLoad(false)}>
      {/* {isLoad && (
        
        <LottieAnimatedComponent src={require('../../assets/animations/loadingImage.json')} customStyle={
          {
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            zIndex: 100,
            //   alignSelf: "center",
          }
        }/>
      )} */}
     
      {subHeading && heading && (
        <View
          style={{
            // borderWidth: 2,
            // borderColor: 'red',
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: Metrix.VerticalSize(8),
          }}>
          <View style={{width: '80%'}}>
            <CustomText.LargeSemiBoldText
              customStyle={[styles.topTextStyle]}
              ellipsizeMode="tail"
              numberOfLines={1}>
              {heading}
            </CustomText.LargeSemiBoldText>

            <CustomText.RegularText
              customStyle={{
                fontSize: Metrix.customFontSize(13),
              }}
              ellipsizeMode="tail"
              numberOfLines={1}>
              {subHeading}
            </CustomText.RegularText>
          </View>
          <Image
            source={Images.PlayBtn}
            style={{
              width: Metrix.HorizontalSize(30),
              height: Metrix.VerticalSize(30),
            }}
            resizeMode={resizeMode}
          />
        </View>
      )}
    </ImageBackground>
  );
};

interface RadiusSquareContainerStyles {
  imageStyle: ImageStyle;
  topTextStyle: TextStyle;
}
const styles = StyleSheet.create<RadiusSquareContainerStyles>({
  imageStyle: {
    width: Metrix.HorizontalSize(60),
    height: Metrix.VerticalSize(60),
    // borderWidth: 1,
    // borderColor: 'red',
    borderRadius: Metrix.VerticalSize(10),
    overflow: 'hidden',
    // width: '100%',
    // height: '100%',
  },
  topTextStyle: {
    fontSize: Metrix.customFontSize(15),
    color: '#ffffff',
    marginBottom: Metrix.VerticalSize(2),
  },
});
