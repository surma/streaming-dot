import { terser } from "rollup-plugin-terser";

import simpleTS from "./rollup-plugins/simple-ts.js";

export default [
  // Browser library
  {
    input: "src/streaming-dot.ts",
    output: {
      dir: "build",
      format: "esm",
    },
    plugins: [
      simpleTS("."),
      terser({
        mangle: true,
      }),
    ],
  },
];
