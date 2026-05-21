module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': '<rootDir>/tests/ts-transformer.cjs',
  },
};
