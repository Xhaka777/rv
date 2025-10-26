import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface WaveformVisualizerProps {
  audioLevels: number[];
  isPlaying: boolean;
  position: number;
  duration: number;
}

export default function WaveformVisualizer({
  audioLevels,
  isPlaying,
  position,
  duration,
}: WaveformVisualizerProps) {
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      // Start pulsing animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animationValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(animationValue, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      animationValue.setValue(0);
    }
  }, [isPlaying]);

  const renderWaveform = () => {
    const barWidth = 3;
    const barSpacing = 1;
    const maxHeight = 80;
    const centerY = 50;
    
    const totalBars = Math.floor(300 / (barWidth + barSpacing));
    const progress = duration > 0 ? position / duration : 0;
    const currentBarIndex = Math.floor(progress * totalBars);

    return audioLevels.slice(0, totalBars).map((level, index) => {
      const barHeight = Math.max(4, level * maxHeight);
      const x = index * (barWidth + barSpacing) + 10;
      const y = centerY - barHeight / 2;
      
      // Bars before current position are slightly dimmed
      const opacity = index <= currentBarIndex ? 1 : 0.6;
      
      // Add slight variation to make it look more dynamic
      const heightVariation = isPlaying ? Math.sin(Date.now() * 0.01 + index * 0.5) * 0.1 + 1 : 1;
      const adjustedHeight = barHeight * heightVariation;
      const adjustedY = centerY - adjustedHeight / 2;

      return (
        <Rect
          key={index}
          x={x}
          y={adjustedY}
          width={barWidth}
          height={adjustedHeight}
          fill="#FFFFFF"
          opacity={opacity}
          rx={1}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.waveformContainer,
          {
            shadowOpacity: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 320 100">
          {renderWaveform()}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B7280',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 10,
    elevation: 10,
  },
});