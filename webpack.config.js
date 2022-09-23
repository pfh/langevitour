const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/langevitour.ts',
    output: {
        filename: 'langevitour-pack.js',
        path: path.resolve(__dirname,'inst','htmlwidgets','lib'),
        library: 'langevitour',
    },
    
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    }
};
