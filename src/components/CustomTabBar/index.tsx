import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/reducers';
import { Images, Metrix, NavigationService, Utills } from '../../config'

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation }) => {
  const cameraMode = useSelector((state: RootState) => state.home.cameraMode);
  const threatAlertMode = useSelector((state: RootState) => state.home.threatAlertMode);
  
  const tabsData = [
    { name: 'HeadsUp', icon: Images.HeadsUp },
    { name: 'Safe Zones', icon: Images.Map },
    { name: 'LiveStream', icon: Images.HomeActive },
    { name: 'Premium', icon: Images.Premium },
    { name: 'Settings', icon: Images.SettingsActive },
  ];

  const isVideoMode = cameraMode === 'VIDEO';
  const currentRoute = state.routes[state.index];
  const isOnLiveStream = currentRoute.name === 'LiveStream';
  const shouldShowTransparent = isVideoMode && isOnLiveStream;

  return (
    <View style={[
      styles.tabContainer,
      {
        backgroundColor: shouldShowTransparent ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tabData = tabsData.find(tab => tab.name === route.name);
        const showAlert = route.name === 'Safe Zones' && threatAlertMode;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.tabIconContainer}>
              <Image
                source={tabData?.icon}
                style={[
                  styles.tabIcon,
                  {
                    tintColor: isFocused ? '#FFFFFF' : '#999999',
                  }
                ]}
                resizeMode="contain"
              />
              {showAlert && (
                <View style={styles.alertIndicator}>
                  <Text style={styles.alertText}>!</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.tabLabel,
              {
                color: isFocused ? '#FFFFFF' : '#999999',
              }
            ]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: Metrix.VerticalSize(110),
    paddingTop: Metrix.VerticalSize(15),
    paddingBottom: Metrix.VerticalSize(40),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabIcon: {
    width: 25,
    height: 25,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CustomTabBar;