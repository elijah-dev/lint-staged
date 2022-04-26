module.exports = {
  plugins: [
    [
      'transform-imports',
      {
        /**
         * Transform `import { join } from 'node:path'` to `import { join } from 'path',
         * because the former gets transpiled into `const { path } = require('node:path')`
         * which is not supported in Node.js 12. This isn't required unless babel is used,
         * because the native ESM import would support the node: protocol.
         */
        '^node:(.*)$': {
          skipDefaultConversion: true,
          transform: '${1}',
        },
      },
    ],
  ],
  presets: [['@babel/preset-env', { modules: 'cjs', targets: { node: 'current' } }]],
}
