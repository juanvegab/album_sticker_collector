const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase v10+ ships ESM-only packages (@firebase/*) that Metro can't resolve
// by default. Disabling package exports makes Metro fall back to the CJS entry
// points, and adding "cjs" lets it parse those files correctly.
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push("cjs");

module.exports = withNativeWind(config, { input: "./global.css" });
