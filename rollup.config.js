import { terser } from 'rollup-plugin-terser'; // remove whitespace, comments etc
import { nodeResolve } from '@rollup/plugin-node-resolve'; // if want to use commonjs modules
import commonjs from '@rollup/plugin-commonjs'; // if want to use commonjs modules
import babel from "@rollup/plugin-babel"; // for transpiling for UMD

const isLocal = (typeof process.env.STAGE !== 'undefined' && process.env.STAGE === 'local');
console.log(`Create a ${isLocal ? 'development' : 'production'} bundle`);

export default [
  {
    input: './src/api.js',
    watch: {
      include: './src/**',
      clearScreen: false
    },
    plugins: [
      commonjs(), // else get 'default' is not exported errors
      nodeResolve(),
      babel({
        babelHelpers: "bundled",
      }),
      // ... and minify:
      terser({
        ecma: 2020,
        mangle: { toplevel: !isLocal },
        compress: {
          module: !isLocal,
          toplevel: !isLocal,
          unsafe_arrows: !isLocal,
          drop_console: !isLocal,
          drop_debugger: !isLocal
        },
        output: { quote_style: 1 }
      })
    ],
    output: {
      file: './dist/api.js',
      format: 'umd',
      name: 'Vidbeo.Player',
      sourcemap: isLocal ? 'inline' : false
    }
  },
  {
    input: './src/api.js',
    watch: {
      include: './src/**',
      clearScreen: false
    },
    plugins: [
      commonjs(),
      nodeResolve(),
      babel({
        babelHelpers: "bundled",
      })
    ],
    output: [
      {
        file: './dist/api.es.js',
        format: 'es',
        sourcemap: isLocal ? 'inline' : false
      }
    ],
  },
];