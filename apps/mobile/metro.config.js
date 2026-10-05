const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// SVG importés comme composants react-native-svg (icônes et illustrations du Figma).
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo')
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg')
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg']

module.exports = config
