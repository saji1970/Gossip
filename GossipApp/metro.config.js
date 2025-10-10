const {getDefaultConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Increase memory limit to prevent out of memory errors
config.maxWorkers = 2;

// Disable new architecture to fix TurboModule issues
config.resolver.platforms = ['android', 'native', 'ios'];

module.exports = config;