import pkg from './package.json';

export default [
  {
    input: 'src/index.js',
    external: ['@svgdotjs/svg.js', 'canvas', 'gif.js'],
    output: [{ file: pkg.main, format: 'es' }]
  }
];
