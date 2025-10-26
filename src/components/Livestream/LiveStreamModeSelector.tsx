import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface LiveStreamModeSelectorProps {
  currentMode: 'AUDIO' | 'VIDEO';
  onModeChange: (mode: 'AUDIO' | 'VIDEO') => void;
  translateX: SharedValue<number>;
  modeIndex: SharedValue<number>;
}

export default function LiveStreamModeSelector({ 
  currentMode, 
  onModeChange, 
  translateX, 
  modeIndex 
}: LiveStreamModeSelectorProps) {
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const progress = modeIndex.value + translateX.value / screenWidth;

    return {
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 1],
            [0, 80] // Distance between mode buttons
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.modesWrapper}>
        <Animated.View style={[styles.indicator, indicatorAnimatedStyle]} />

        <TouchableOpacity 
          style={styles.modeButton} 
          onPress={() => onModeChange('AUDIO')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.modeText,
            currentMode === 'AUDIO' && styles.modeTextActive
          ]}>
            AUDIO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modeButton} 
          onPress={() => onModeChange('VIDEO')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.modeText,
            currentMode === 'VIDEO' && styles.modeTextActive
          ]}>
            VIDEO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'center',
    marginVertical: 20,
  },
  modesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: 80,
    height: 2,
    borderRadius: 1,
    // backgroundColor: '#FFFFFF',
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  modeText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFD700', // Yellow for active mode
  },
});
