import React from 'react';
import {View, StyleSheet, Dimensions, StatusBar} from 'react-native';
import Lottie from 'lottie-react-native';

const {width, height} = Dimensions.get('window');

const SplashScreenComponent = () => {
  console.log('🎬 SplashScreenComponent is rendering');
  
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Lottie
        source={require('../../assets/animations/meditation.json')}
        autoPlay={true}
        loop={true}
        style={styles.animation}
        resizeMode="contain"
        onAnimationFinish={() => {
          console.log('✅ Animation finished');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
  },
  animation: {
    width: width * 0.8,
    height: height * 0.8,
  },
});

export default SplashScreenComponent;