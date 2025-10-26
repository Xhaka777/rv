/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { Component } from 'react';
import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import { name as appName } from './app.json';
import { Provider } from 'react-redux';
import configureStore from './src/redux/Store';
import DataHandler from './src/services/dataHandler.service';
import { PersistGate } from 'redux-persist/integration/react';
import { SimpleSplashScreen, VideoSplashScreen, GifSplashScreen } from './src/components';
import { Images } from './src/config';
import LottieView from 'lottie-react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const { runSaga, store, persistor } = configureStore();
DataHandler.setStore(store);

const SPLASH_SHOWN_KEY = '@splash_shown';

class AppView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showSplash: true,
      isLoading: true, // Add loading state to handle async check
    };
  }

  async componentDidMount() {
    try {
      // Check if splash has been shown before
      const hasShownSplash = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);

      if (hasShownSplash === 'true') {
        // Skip splash if already shown
        this.setState({
          showSplash: false,
          isLoading: false
        });
      } else {
        // Show splash and mark as shown
        this.setState({ isLoading: false });

        // Hide splash after 3 seconds
        setTimeout(async () => {
          this.setState({ showSplash: false });
          // Mark splash as shown
          await AsyncStorage.setItem(SPLASH_SHOWN_KEY, 'true');
        }, 2550);
      }
    } catch (error) {
      console.error('Error checking splash status:', error);
      // Fallback: show splash normally
      this.setState({ isLoading: false });
      setTimeout(() => {
        this.setState({ showSplash: false });
      }, 2550);
    }
  }

  render() {
    // Show loading state while checking AsyncStorage
    if (this.state.isLoading) {
      return null; // Or a simple loading indicator
    }

    if (this.state.showSplash) {
      return (
        <LottieView
          source={require('./src/assets/animations/ROVE_short_R4.json')}
          autoPlay
          loop={false} // Set to false since it's a one-time animation
          style={{ flex: 1, backgroundColor: '#000' }}
        />
      );
    }

    return (
      <>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <KeyboardProvider>
              <App />
            </KeyboardProvider>
          </PersistGate>
        </Provider>
      </>
    );
  }
}

AppRegistry.registerComponent(appName, () => AppView);