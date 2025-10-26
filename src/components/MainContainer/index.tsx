import React, {ReactNode} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Colors, Metrix, Utills} from '../../config';

type MainContainerProps = {
  children: ReactNode;
  customeStyle?: StyleProp<ViewStyle>;
  hidden?: boolean;
  mainContainerStyle?: StyleProp<ViewStyle>;
  barStyle?: 'default' | 'light-content' | 'dark-content';
  barBg?: string;
  isFlatList?: boolean;
};

export const MainContainer: React.FC<MainContainerProps> = ({
  children,
  customeStyle,
  hidden = false,
  mainContainerStyle,
  barStyle = 'dark-content',
  barBg = Utills.selectedThemeColors().Base,
  isFlatList,
}) => {
  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={20}>
      <SafeAreaView style={[{flex: 1}, mainContainerStyle]}>
        <StatusBar
          hidden={hidden}
          barStyle={barStyle}
          backgroundColor={barBg}
        />
        {!isFlatList ? (
          <TouchableWithoutFeedback
            style={{flex: 1}}
            onPress={Keyboard.dismiss}>
            <View style={[styles.container, customeStyle]}>{children}</View>
          </TouchableWithoutFeedback>
        ) : (
          <View style={[styles.container, customeStyle]}>{children}</View>
        )}
      </SafeAreaView>
      {/* <NoInternet isOffline={true} /> */}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(20),
    // borderWidth: 1,
    // backgroundColor: 'white',
  },
});
