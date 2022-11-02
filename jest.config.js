/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {'^.+\\.(ts|mjs)?$': 'ts-jest'},
  testRegex: '/tests/.*\\.(test|spec)?\\.(ts)$',

  // If you require modules without specifying a file extension, these are the extensions Jest will look for, in left-to-right order.
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
};