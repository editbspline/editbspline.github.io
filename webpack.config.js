const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

module.exports = {
  entry: {
    app: './src/index.js',
    requestIdleCallback: './shims/requestIdleCallback.js',
  },
  externals: {
    mathjax: 'MathJAX',
  },
  mode: 'production',
  module: {
    rules: [
      {
        exclude: path.resolve(__dirname, 'node_modules/@babel/runtime'),
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: true,
            },
          },
        ],
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  plugins: [ ],
};
