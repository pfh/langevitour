const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/langevitour.js',
    output: {
        filename: 'langevitour-pack.js',
        path: path.resolve(__dirname,'inst','htmlwidgets','lib'),
        library: 'langevitour',
    }
};
