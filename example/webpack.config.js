module.exports = {
    entry: './src/js/index.js',
    output: {
        path: './public/js/',
        filename: 'index.js'
    },

    module: {
        loaders: [
            {
                test: /\.js/, 
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    }
};
