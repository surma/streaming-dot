import simpleTS from "./rollup-plugins/simple-ts.js";
import { terser } from "rollup-plugin-terser";

export default [
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
