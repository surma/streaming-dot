module.exports = function(config) {
  const configuration = {
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'streaming-dot.js',
      'node_modules/chai/chai.js',
      'test/*.test.js'
    ],
    exclude: [
    ],
    preprocessors: {
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: true,
    concurrency: Infinity,
    customLaunchers: {
        Chrome_travis_ci: {
            base: 'Chrome',
            flags: ['--no-sandbox']
        }
    }
  };

  if (process.env.TRAVIS) {
      configuration.browsers = ['Chrome_travis_ci'];
  }

  config.set(configuration);
};