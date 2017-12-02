const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const extractToCSS = new ExtractTextPlugin({
    filename: "./css/[name].css",
    disable: false
});
module.exports = {// See https://webpack.js.org/concepts/
    devtool: 'source-map',
    context: path.resolve(__dirname, './'),
    entry: {
        main: './src/js/main.js',
    },
    output: {
        path: path.resolve(__dirname, './dist/'),
        publicPath: "../",
        filename: './js/[name].bundle.js',
    },
    module: {
        rules: [// See: https://webpack.js.org/configuration/module/#rule, https://webpack.js.org/concepts/loaders/
        {// Sass loader
            test: /\.sass$/,
            use: extractToCSS.extract({
                use: [{
                    loader: "css-loader"
                }, 
                {
                    loader: "postcss-loader",
                    options: {
                        plugins: function () {
                            return [
                                require('autoprefixer')
                            ];
                        }
                    }
                }, 
                {
                    loader: "resolve-url-loader"
                }, 
                {
                    loader: "sass-loader",
                    options: {
                        indentedSyntax: 'sass',
                        sourceMap: true
                    }
                }],
                fallback: "style-loader"
            })
        },
        {// Stylus loader
            test: /\.styl$/,
            use: extractToCSS.extract({
                use: [{
                    loader: "css-loader"
                }, 
                {
                    loader: "postcss-loader",
                    options: {
                        plugins: function () {
                            return [
                                require('autoprefixer')
                            ];
                        }
                    }
                }, 
                {
                    loader: "resolve-url-loader"
                }, 
                {
                    loader: "stylus-loader",
                    options: {
                        sourceMap: true
                    }
                }],
                fallback: "style-loader"
            })
        },
        {// CSS loader
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
                use: [{
                    loader: "css-loader"
                }, 
                {
                    loader: "postcss-loader",
                    options: {
                        plugins: function () {
                            return [
                                require('autoprefixer')
                            ];
                        }
                    }
                }],
                fallback: "style-loader"
            }),
        },
        {// Mustache loader
            test: /\.html$/,
            use: "mustache-loader"
        },
        // {// JSON loader
        //   test: /\.json$/,
        //   use: 'json-loader' // NOT NEEDED ANYMORE https://webpack.js.org/guides/migrating/#json-loader-is-not-required-anymore
        // },
        // {// Image loader (Compressing Images)
        //     test: /\.(jpe?g|png|gif|svg)$/i,
        //     exclude: [/fonts/],
        //     use: [{
        //         loader: 'file-loader?hash=sha512&digest=hex&name=../images/export/[name].[ext]',
        //     }, {
        //         loader: 'image-webpack-loader',
        //         options: {
        //             bypassOnDebug: true,
        //             // optimizationLevel: 7,
        //             // interlaced: false,
        //             // mozjpeg: {
        //             //     progressive: true,
        //             // },
        //             gifsicle: {
        //                 interlaced: false,
        //             },
        //             pngquant: {
        //                 quality: '100',
        //                 optimizationLevel: 7,
        //                 speed: 3,
        //             },
        //         },
        //     }]
        // },
        {// Image loader (Resolving Images path)
            test: /\.(jpe?g|png|gif|svg)$/i,
            exclude: [/fonts/],
            use: [{
                loader:'file-loader',
                options: {
                    name: 'images/[name].[ext]'
                }
            }]

        },
        {// Font loader
            test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
            use: [{
                loader: 'file-loader',
                options: {
                    name: 'fonts/[name].[ext]'
                }
            }]
        }, 
        {// Allows jquery to be used everywhere and not just in our bundled js
            test: require.resolve('jquery'),
            use: [{
                loader: 'expose-loader',
                options: 'window.jQuery'
            }, 
            {
                loader: 'expose-loader',
                options: 'jQuery'
            }, 
            {
                loader: 'expose-loader',
                options: '$'
            }]
        }]
    },
    resolve: {
        alias: {
            "jquery-mobile": "jquery-mobile/dist/jquery.mobile" //webpack couldn't find jquery-mobile so I set the path myself
        },
    },
    plugins: [
        require('autoprefixer'),
        extractToCSS, // see first few line to see the definition and the output
        new webpack.ProvidePlugin({
          $ : "jquery",
          jQuery: 'jquery',
          'window.jQuery': 'jquery',
          Backbone : "backbone",
          _ : "underscore",
      }),
    ]
};

// Tuto: https://blog.madewithenvy.com/getting-started-with-webpack-2-ed2b86c68783
// Doc: https://webpack.js.org

// NOTE: const is like var

// NOTE: __dirname refers to the directory where this webpack.config.js lives, which in this blogpost is the project root.

// NOTE: in the output, [name] stands for the entry name of your entry, in this case it's main

// NOTE: queries are now options so if you have something like: {loader: 'image-webpack-loader?bypassOnDebug&optimizationLevel=7&interlaced=false'}, you can turn it into {loader: 'image-webpack-loader', options: {bypassOnDebug: true, optimizationLevel: 7, interlaced: false}
// See https://webpack.js.org/guides/migrating/#what-are-options-