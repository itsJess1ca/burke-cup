const path       = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry : {
    main: './src/index.ts'
  },
  output: {
    path    : 'dist',
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader"
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {from: 'src/assets', to: 'assets'}
    ]),
    new HtmlWebpackPlugin({
      title: 'cup-overlay',
      template: 'src/index.ejs',
      chunksSortMode: 'dependency',
      inject: 'head'
    }),
    new webpack.optimize.UglifyJsPlugin({minimize: true})
  ]
};
