import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { CustomText } from '..';
import { Metrix, Utills } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODES = ['AUDIO', 'VIDEO'];
const ITEM_WIDTH = 80;
const CONTAINER_WIDTH = SCREEN_WIDTH;
const CENTER_OFFSET = (CONTAINER_WIDTH - ITEM_WIDTH) / 2;

type ModeSelectorProps = {
  threatModes: any[];
  mode: string;
  setMode: (mode: string) => void;
  setModeMsg: (msg: string) => void;
  callback: () => void;
};

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  threatModes,
  mode,
  setMode,
  setModeMsg,
  callback = () => {},
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0); // Start with AUDIO
  const translateX = useSharedValue(-selectedIndex * ITEM_WIDTH + CENTER_OFFSET);
  const isGestureActive = useSharedValue(false);

  // Initialize based on current mode
  useEffect(() => {
    const index = MODES.findIndex(m => m === mode);
    if (index !== -1 && index !== selectedIndex) {
      setSelectedIndex(index);
      translateX.value = -index * ITEM_WIDTH + CENTER_OFFSET;
    }
  }, [mode]);

  const updateSelectedIndex = (newIndex: number) => {
    setSelectedIndex(newIndex);
    const selectedMode = MODES[newIndex];
    setMode(selectedMode);
    
    // Set mode message - COMMENTED OUT to remove notifications
    // const message = selectedMode === 'AUDIO' ? 'Audio Stream' : 'Video Stream';
    // setModeMsg(message);
    
    callback();
  };

  const animateToIndex = (index: number) => {
    'worklet';
    const targetTranslateX = -index * ITEM_WIDTH + CENTER_OFFSET;
    translateX.value = withSpring(targetTranslateX, {
      damping: 20,
      stiffness: 200,
    });
    runOnJS(updateSelectedIndex)(index);
  };

  const handleTap = (index: number) => {
    animateToIndex(index);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isGestureActive.value = true;
    })
    .onUpdate((event) => {
      const newTranslateX = -selectedIndex * ITEM_WIDTH + CENTER_OFFSET + event.translationX;
      const maxTranslateX = CENTER_OFFSET;
      const minTranslateX = -(MODES.length - 1) * ITEM_WIDTH + CENTER_OFFSET;
      
      translateX.value = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
    })
    .onEnd((event) => {
      isGestureActive.value = false;
      const velocity = event.velocityX;
      const currentPosition = translateX.value;
      
      // Calculate which index we should snap to
      let targetIndex = Math.round((-currentPosition + CENTER_OFFSET) / ITEM_WIDTH);
      
      // Adjust based on velocity for more natural feel
      if (Math.abs(velocity) > 500) {
        if (velocity > 0 && targetIndex > 0) {
          targetIndex -= 1;
        } else if (velocity < 0 && targetIndex < MODES.length - 1) {
          targetIndex += 1;
        }
      }
      
      // Clamp to valid range
      targetIndex = Math.max(0, Math.min(MODES.length - 1, targetIndex));
      
      animateToIndex(targetIndex);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderModeItem = (modeText: string, index: number) => {
    const animatedItemStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * ITEM_WIDTH,
        index * ITEM_WIDTH,
        (index + 1) * ITEM_WIDTH,
      ];
      
      const translateXForItem = -translateX.value + CENTER_OFFSET;
      
      const scale = interpolate(
        translateXForItem,
        inputRange,
        [0.8, 1.2, 0.8],
        Extrapolate.CLAMP
      );
      
      const opacity = interpolate(
        translateXForItem,
        inputRange,
        [0.5, 1, 0.5],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    // Check if this is the currently selected mode
    const isSelected = index === selectedIndex;

    return (
      <TouchableOpacity
        key={modeText}
        activeOpacity={0.7}
        onPress={() => handleTap(index)}
        style={styles.modeItem}
      >
        <Animated.View style={animatedItemStyle}>
          <CustomText.RegularText style={[
            styles.modeText,
            {
              color: isSelected 
                ? Utills.selectedThemeColors().Yellow 
                : Utills.selectedThemeColors().PrimaryTextColor, // Light gray for unselected
              fontWeight: isSelected ? '700' : '700',
              fontSize: isSelected ? 16 : 18, // Bigger font for unselected, larger for selected
            }
          ]}>
            {modeText}
          </CustomText.RegularText>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.selectorContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modesContainer, animatedStyle]}>
            {MODES.map((modeText, index) => renderModeItem(modeText, index))}
          </Animated.View>
        </GestureDetector>
        
        {/* Center indicator line removed */}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '15%', // Reduced from 18% to bring it closer to the red circle
    left: 0,
    right: 0,
    height: 80,
    zIndex: 99,
  },
  selectorContainer: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  modeItem: {
    width: ITEM_WIDTH,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeText: {
    // fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    // Removed static color - now handled dynamically in renderModeItem
  },
  // Removed centerIndicator style completely
});