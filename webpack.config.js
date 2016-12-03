var path       = require('path');
var webpack = require("webpack");
module.exports = {
  entry : {
    main: './src/assets/index.js'
  },
  output: {
    path    : __dirname,
    filename: 'dist/assets/js/[name].bundle.js'
  },
  module: {
    loaders: [
      { test  : /\.js$/, loader: 'babel-loader', query : {
        presets: ['es2015']
      }}
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({minimize: true})
  ]
};
