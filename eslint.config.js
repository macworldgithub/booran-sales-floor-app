// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Existing network-backed screens use effects to enter their loading state.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
