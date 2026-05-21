const path = require('node:path')

const testsRoot = path.join(__dirname, '../../tests')

module.exports = {
  testEnvironment: 'node',
  roots: [testsRoot],
  setupFilesAfterEnv: [path.join(testsRoot, 'setup.mjs')],
  moduleDirectories: ['node_modules', path.join(__dirname, 'node_modules')],
}
