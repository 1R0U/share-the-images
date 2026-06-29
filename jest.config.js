module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/(?!.*node_modules)|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg)',
  ],
};
