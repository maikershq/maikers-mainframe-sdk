import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/browser/index.js',
      format: 'umd',
      name: 'MainframeSDK',
      sourcemap: true,
      globals: {
        // Mark external dependencies that should not be bundled
        '@solana/web3.js': 'solanaWeb3',
        '@coral-xyz/anchor': 'anchor',
        'fs/promises': 'undefined'
      }
    },
    {
      file: 'dist/browser/index.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  external: [
    // External dependencies that should not be bundled
    '@solana/web3.js',
    '@coral-xyz/anchor',
    'libsodium-wrappers-sumo',
    'fs/promises'
  ],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false,
      outDir: 'dist/browser'
    }),
    isProduction && terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: {
        reserved: ['MainframeSDK']
      }
    })
  ].filter(Boolean)
};
