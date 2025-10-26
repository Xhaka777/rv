import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Text } from 'react-native';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface VoiceDetectionUIProps {
  visible: boolean;
  isListening: boolean;
  audioLevel?: number; // 0-1 for audio intensity
  onAnimationComplete?: () => void;
}

interface WaveCircleProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  isAnimating?: boolean;
}

const WaveCircle: React.FC<WaveCircleProps> = ({
  size = 200,
  primaryColor = '#00BFFF',
  secondaryColor = '#1E90FF',
  isAnimating = true,
}) => {
  const animationValue = useSharedValue(0);

  useEffect(() => {
    if (isAnimating) {
      animationValue.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [isAnimating]);

  // Wave bar configurations - heights and animation delays
  const waveData = [
    { height: 0.3, delay: 0 },
    { height: 0.5, delay: 0.1 },
    { height: 0.8, delay: 0.2 },
    { height: 1, delay: 0.3 },
    { height: 0.7, delay: 0.4 },
    { height: 0.9, delay: 0.5 },
    { height: 0.4, delay: 0.6 },
    { height: 0.6, delay: 0.7 },
    { height: 0.2, delay: 0.8 },
  ];

  const createWaveBarStyle = (baseHeight: number, delay: number) => {
    return useAnimatedStyle(() => {
      const animatedHeight = interpolate(
        animationValue.value,
        [0, 0.5, 1],
        [baseHeight * 0.5, baseHeight * 1.2, baseHeight * 0.5]
      );
      const scale = interpolate(
        animationValue.value,
        [0, 0.5, 1],
        [0.8, 1.1, 0.8]
      );
      return {
        height: (size * 0.3 * animatedHeight),
        transform: [{ scaleY: scale }],
        opacity: interpolate(animationValue.value, [0, 0.5, 1], [0.7, 1, 0.7]),
      };
    });
  };

  const circleStyle = useAnimatedStyle(() => {
    const borderOpacity = interpolate(
      animationValue.value,
      [0, 0.5, 1],
      [0.6, 1, 0.6]
    );
    return {
      borderColor: primaryColor,
      opacity: borderOpacity,
    };
  });

  return (
    <View style={[waveStyles.container, { width: size, height: size }]}>
      <ReanimatedAnimated.View
        style={[
          waveStyles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          circleStyle,
        ]}
      >
        <View style={waveStyles.waveContainer}>
          {waveData.map((wave, index) => (
            <ReanimatedAnimated.View
              key={index}
              style={[
                waveStyles.waveBar,
                {
                  backgroundColor: index === 4 ? primaryColor : secondaryColor,
                  width: size * 0.015,
                  borderRadius: size * 0.01,
                },
                createWaveBarStyle(wave.height, wave.delay),
              ]}
            />
          ))}
        </View>
      </ReanimatedAnimated.View>
    </View>
  );
};

const VoiceDetectionUI: React.FC<VoiceDetectionUIProps> = ({
  visible,
  isListening,
  audioLevel = 0.5,
  onAnimationComplete
}) => {
  // Animation values for the overlay
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Fade in and scale up the entire component
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete?.();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View 
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Main WaveCircle Component */}
        <WaveCircle
          size={250}
          primaryColor="#00BFFF"
          secondaryColor="#1E90FF"
          isAnimating={true}
        />

        {/* Status text */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.statusText}>
            {isListening ? 'Processing speech...' : 'Safe word detected!'}
          </Text>
          <Text style={styles.subText}>
            {isListening ? 'Analyzing voice command' : 'Starting emergency stream...'}
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
  },
});

const waveStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00BFFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    height: '60%',
  },
  waveBar: {
    minHeight: 4,
  },
});

export default VoiceDetectionUI;