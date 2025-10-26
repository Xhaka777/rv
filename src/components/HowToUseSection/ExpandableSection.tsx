import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ExpandableSectionProps {
  title: string;
  content: string;
}

export default function ExpandableSection({ title, content }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    animatedHeight.value = withTiming(isExpanded ? 0 : 1, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      animatedHeight.value,
      [0, 1],
      [0, contentHeight],
      Extrapolate.CLAMP
    );

    return {
      height,
      opacity: animatedHeight.value,
    };
  });

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height !== contentHeight) {
      setContentHeight(height);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <Text style={styles.title}>{title}</Text>
        {isExpanded ? (
          <ChevronUp size={20} color="#fff" />
        ) : (
          <ChevronDown size={20} color="#fff" />
        )}
      </TouchableOpacity>

      <Animated.View style={[styles.contentContainer, animatedStyle]}>
        <View style={styles.content} onLayout={onContentLayout}>
          <Text style={styles.contentText}>{content}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  contentContainer: {
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    paddingTop: 0,
    position: 'absolute',
    width: '100%',
  },
  contentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
    opacity: 0.9,
  },
});
