const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Standalone package (not an npm workspace member). If we later decide to
// import src/shared directly, add watchFolders + nodeModulesPaths here.
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
