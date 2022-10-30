/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {'^.+\\.ts?$': 'ts-jest'},
  testRegex: '/tests/.*\\.(test|spec)?\\.(ts)$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};