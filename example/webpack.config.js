module.exports = {
    entry: './index.js',
    output: {
        path: './public/js/',
        filename: 'index.js'
    },

    module: {
        loaders: [
            {
                test: /node_modules[\\\/]auth0-lock[\\\/].*\.js$/, 
                loaders: [ 'transform-loader/cacheable?brfs', 'transform-loader/cacheable?packageify' ]
            },
            {
                test: /node_modules[\\\/]auth0-lock[\\\/].*\.ejs$/, 
                loader: 'transform-loader/cacheable?ejsify'
            },
            {
                test: /\.json$/, 
                loader: 'json'
            },
            {
                test: /\.js/, 
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    }
};
