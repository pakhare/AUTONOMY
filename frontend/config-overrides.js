const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    assert: require.resolve("assert"),
    util: require.resolve("util"),
    // Notice the '.js' extension here:
    process: require.resolve("process/browser.js"),
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser.js",
    }),
  ]);

  config.module.rules.unshift({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  });

  return config;
};
