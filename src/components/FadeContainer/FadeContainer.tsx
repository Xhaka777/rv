import {Animated, StyleSheet, Text, View, ViewStyle} from 'react-native';
import React, {useEffect, useState} from 'react';
import {Colors, Utills} from '../../config';
import {useThemeHook} from '../../hooks';

type FadeContainerProps = {
  children: React.ReactNode;
  mainViewStyle?: ViewStyle;
};

export const FadeContainer: React.FC<FadeContainerProps> = ({
  children,
  mainViewStyle,
}) => {
  // const {Colors} = useThemeHook();
  const [isLoading, setIsLoading] = useState(true);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Simulating an asynchronous task, such as loading data or assets
    setTimeout(() => {
      setIsLoading(false); // Set isLoading to false when the task is complete
      Animated.timing(opacity, {
        toValue: 1, // Increase opacity to 1 for a smooth fade-in effect
        duration: 500, // Adjust the duration as desired
        useNativeDriver: true, // Enable native driver for better performance
      }).start();
    }, 100); // Simulating a 2-second delay for demonstration purposes
  }, []);

  return isLoading ? (
    <View
      style={{flex: 1, backgroundColor: Utills.selectedThemeColors().Base}}
    />
  ) : (
    <Animated.View style={[{opacity, flex: 1}, mainViewStyle]}>
      {children}
    </Animated.View>
  );
};

interface FadeContainerStyles {}
const styles = StyleSheet.create<FadeContainerStyles>({});
