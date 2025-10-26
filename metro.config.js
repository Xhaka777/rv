const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

// Get the default Metro configuration
const defaultConfig = getDefaultConfig(__dirname);

// Your custom Metro configuration
const customConfig = {};

// Merge the default config with custom configurations
const mergedConfig = mergeConfig(defaultConfig, customConfig);

// Wrap with Reanimated's Metro config
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);
