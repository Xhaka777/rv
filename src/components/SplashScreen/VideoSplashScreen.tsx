import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import FastImage from 'react-native-fast-image';

const { width, height } = Dimensions.get('window');

interface VideoSplashScreenProps {
  onFinish: () => void;
  duration?: number;
  videoSource?: any;
  gifSource?: any;
  webmSource?: any;
  type?: 'video' | 'gif' | 'webm';
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({
  onFinish,
  duration = 4000,
  videoSource,
  gifSource,
  webmSource,
  type = 'video',
}) => {
  const [showContent, setShowContent] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('🎬 VideoSplashScreen is rendering with type:', type);

    // Auto-hide after duration
    const timer = setTimeout(() => {
      console.log('⏰ Splash screen timer finished, starting fade out');
      handleFinish();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleFinish = () => {
    console.log('✅ Splash screen finishing');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShowContent(false);
      onFinish();
    });
  };

  const handleVideoEnd = () => {
    console.log('🎥 Video/WebM ended, finishing splash');
    handleFinish();
  };

  if (!showContent) {
    return null;
  }

  const renderContent = () => {
    switch (type) {
      case 'video':
        return (
          <Video
            source={videoSource || require('../../assets/animations/splash.mp4')}
            style={styles.video}
            resizeMode="contain"
            repeat={false}
            onEnd={handleVideoEnd}
            onError={(error) => {
              console.error('❌ Video error:', error);
              handleFinish();
            }}
            onLoad={() => console.log('✅ Video loaded successfully')}
          />
        );

      case 'gif':
        return (
          <FastImage
            source={gifSource || require('../../assets/animations/splash.gif')}
            style={styles.gif}
            resizeMode={FastImage.resizeMode.contain}
            onError={() => {
              console.error('❌ GIF error');
              handleFinish();
            }}
            onLoad={() => console.log('✅ GIF loaded successfully')}
          />
        );

      case 'webm':
        return (
          <Video
            source={require('../../assets/animations/splash.webm')}
            style={styles.video}
            resizeMode="cover"
            onEnd={onFinish}
            repeat={false}
            muted
            fullscreen
            controls={false}
            paused={false}
            playInBackground={false}
            playWhenInactive={false}
          />
        );

      default:
        return (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Loading...</Text>
          </View>
        );
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden={true} />
      {renderContent()}

      {/* Debug overlay */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>
          Splash Screen Active ({type.toUpperCase()})
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  video: {
    width: width * 0.8,
    height: height * 0.8,
  },
  gif: {
    width: width * 0.8,
    height: height * 0.8,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
});

export default VideoSplashScreen;