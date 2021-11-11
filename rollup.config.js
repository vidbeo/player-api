import { terser } from 'rollup-plugin-terser'; // remove whitespace, comments etc from production build
//import replace from '@rollup/plugin-replace'; // add variables to the bundle
import { nodeResolve } from '@rollup/plugin-node-resolve'; // if want to use commonjs modules
import commonjs from '@rollup/plugin-commonjs'; // if want to use commonjs modules
import babel from "@rollup/plugin-babel"; // for transpiling for UMD
//import pkg from "./package.json"; // so can use its name

const isLocal = (typeof process.env.STAGE !== 'undefined' && process.env.STAGE === 'local');
console.log(`Create a ${isLocal ? 'development' : 'production'} bundle`);

export default [
  // UMD
  {
    input: './src/api.js',
    watch: {
      include: './src/**',
      clearScreen: false
    },
    plugins: [
      commonjs(), // else get 'default' isnot exported errors
      nodeResolve(),
      babel({
        babelHelpers: "bundled",
      }),
      /*
      replace({
        preventAssignment: true,
        values: {
          __LOGGING_ENABLED__: isLocal,
          __EMBED_BASE_URL__: 'embed.vidbeo.com'
        }
      }),
      */
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
      format: 'umd',  // wraps it with AMD/CommonJS
      name: 'Vidbeo.Player',
      sourcemap: isLocal ? 'inline' : false
    }
  },

  // ESM and CJS (don't transpile or minify)
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
      }),
      /*
      replace({
        preventAssignment: true,
        values: {
          __LOGGING_ENABLED__: isLocal,
          __EMBED_BASE_URL__: 'embed.vidbeo.com'
        }
      })
      */
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