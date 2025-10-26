import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function SimpleSplashScreen() {
    const animation = useRef<LottieView>(null);

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <View style={styles.welcome}>

                <LottieView style={{ flex: 1 }} source={require('../../assets/animations/splash.json')} autoPlay loop />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 100
  },
    lottie: {
        flex: 1,
        width: width,
        height: height,
    },
    welcome: {
        height: 300,
        aspectRatio: 1,
    },
});
