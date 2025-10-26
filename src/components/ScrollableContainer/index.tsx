import React, {ReactNode} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  SafeAreaView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Metrix} from '../../config';

type ScrollableContainerProps = {
  children: ReactNode;
  customeStyle?: StyleProp<ViewStyle>;
  hidden?: boolean;
  mainContainerStyle?: StyleProp<ViewStyle>;
};

export const ScrollableContainer: React.FC<ScrollableContainerProps> = ({
  children,
  customeStyle,
  hidden = false,
  mainContainerStyle,
}) => {
  return (
    <SafeAreaView style={[{flex: 1}, mainContainerStyle]}>
      <StatusBar
        hidden={hidden}
        barStyle="light-content"
        backgroundColor={'#ffffff'}
      />
      <ScrollView
      showsVerticalScrollIndicator={false}
        style={[styles.container, customeStyle]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Metrix.HorizontalSize(30),
    paddingVertical: Metrix.VerticalSize(20),
    // borderWidth: 1,
    // backgroundColor: 'white',
  },
});
