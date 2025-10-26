import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  I18nManager,
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import {LottieAnimatedComponent} from '../LottieAnimatedComponent';

export type FadeInImageProps = {
  source: ImageProps['source'];
  resizeMode?: ImageProps['resizeMode'];
  customImageContainerStyle?: ViewStyle;
  imageStyles?: ImageStyle;
  customPlaceholderStyle?: ViewStyle;
};

export const FadeInImage: React.FC<FadeInImageProps> = ({
  source,
  resizeMode = 'contain',
  customImageContainerStyle,
  imageStyles,
  customPlaceholderStyle,
}) => {
  const [isLoad, setIsLoad] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0))?.current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={customImageContainerStyle}>
      {/* {isLoad && (
        
        <LottieAnimatedComponent
          src={require('../../assets/animations/loadingImage.json')}
          customStyle={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            zIndex: 100,
            //   alignSelf: "center",
          }}
        />
      )} */}

      <Image
        source={source}
        style={[
          {
            // transform: [{scaleX: I18nManager.isRTL ? -1 : 1}],
            // opacity: fadeAnim,
            width: '100%', // Adjust the size as needed
            height: '100%',
          },
          imageStyles,
        ]}
        resizeMode={resizeMode}
        onLoadStart={() => setIsLoad(true)}
        onLoadEnd={() => setIsLoad(false)}
        // onLoad={() => setIsLoad(false)}
      />
    </View>
  );
};
