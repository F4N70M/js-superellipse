const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');

const fs = require('fs');
// Читаем файл с комментарием
const headerComment = fs.readFileSync('src/header.js', 'utf8');
const headerCommentMin = fs.readFileSync('src/header.min.js', 'utf8');

module.exports = {
	input: 'src/index.js',
	output: [
		{
			file: 'dist/superellipse.js',
			format: 'umd',
			name: 'Superellipse',
			banner: headerComment,
			sourcemap: true
		},
		{
			file: 'dist/superellipse.min.js',
			format: 'umd',
			name: 'Superellipse',
			banner: headerCommentMin,
			plugins: [terser({
				mangle: {
					properties: {
						regex: /^_/
					}
				}
			})],
			sourcemap: true
		}
	],
	plugins: [resolve(), commonjs()]
};