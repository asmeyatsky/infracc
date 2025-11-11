module.exports = {
  transformIgnorePatterns: [
    'node_modules/(?!(react-force-graph-2d|force-graph|d3-*)/)',
  ],
  moduleNameMapper: {
    '^react-force-graph-2d$': '<rootDir>/src/__mocks__/react-force-graph-2d.js',
  },
};
