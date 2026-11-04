module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.[cm]?[jt]s$': '<rootDir>/tests/ts-transformer.cjs',
  },
  // The patched sanitizer's parser dependencies ship ESM; transform them for Jest's CJS runner.
  transformIgnorePatterns: ['/node_modules/(?!(sanitize-html|htmlparser2|entities|domhandler|domutils|domelementtype|dom-serializer)/)'],
};
