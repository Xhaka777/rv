import DataHandler from '../../services/dataHandler.service';

const DefaultColors = {
  Base: '#000000',
  // Base: '#FFFFFF',
  PrimaryTextColor: '#FFFFFF',
  TextInputBaseColor: '#FFFFFF',
  WhiteOpacity: (opacity = '0.5') => `rgba(255, 255, 255, ${opacity})`,
  BlackOpacity: (opacity = '0.5') => `rgba(0, 0, 0, ${opacity})`,
  DisabledColor: (opacity = '0.5') => `rgba(20, 60, 133, ${opacity})`,
  BaseOpacity: (opacity = '0.5') => `rgba(0, 0, 0, ${opacity})`,
  PrimaryColorOpacity: (opacity = '0.5') => `rgba(51, 153, 102,${opacity})`,
  WhiteTwentyOpacity: 'rgba(255, 255, 255, 0.2)',
  Primary: '#0f8ce9',
  Secondary: '#1B2043',
  Yellow: '#FFC000',
  Blue: '#0096C7',
  // Text Colors
  SecondaryTextColor: '#757575',
  TertiaryTextColor: '#FCB706',
  LightGreyText: 'rgba(154, 154, 154, 0.8)',
  SuccessTextColor: '#00b050',
  ErrorTextColor: '#FF8179',
  PrimaryOpacity: '#624CFD14',
  NotFocussed: '#888888',
  Danger: 'red',
  Red: '#ED2939',
  Grey: '#00000020',
  Success: '#1cd50f',
  LightGreen: '#7eda8c',
  TextInputBorderColor: 'rgba(146, 146, 146, 0.49)',
  DotGrey: '#757575',
  TextInputPlaceholserColor: '#BBBBBB',
  InActiveTabBar: '#A6A6A6',
  LineColor: '#20233C',
  Transparent: 'transparent',
};

const DarkModeColors = {
  ...DefaultColors,
  Base: '#121212',
  PrimaryTextColor: '#FFFFFF',
  TextInputBaseColor: '#121212',
};

// let selectedTheme = (isDark?: boolean) =>
//   isDark ? DarkModeColors : DefaultColors;

export default {DefaultColors, DarkModeColors};
