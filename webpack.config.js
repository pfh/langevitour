import path from 'node:path';

export default {
    mode: 'production',
    devtool: 'source-map',
    entry: './lib/langevitour.js',
    output: {
        filename: 'langevitour-pack.js',
        path: path.resolve('inst','htmlwidgets','lib'),
        library: 'langevitour',
    },
};
