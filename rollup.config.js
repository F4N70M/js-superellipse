const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');

module.exports = {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/superellipse.js',
            format: 'umd',
            name: 'Superellipse',
            sourcemap: false
        },
        {
            file: 'dist/superellipse.min.js',
            format: 'umd',
            name: 'Superellipse',
            plugins: [terser()],
            sourcemap: false
        }
    ],
    plugins: [resolve(), commonjs()]
};