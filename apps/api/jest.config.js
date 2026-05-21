export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/../../tests'],
  setupFiles: ['<rootDir>/../../tests/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/../../tests/setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
}
