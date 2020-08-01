import { promises as fsp } from "fs";

import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";

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
  // Tests
  {
    input: "tests/runner.js",
    output: {
      dir: ".test-build",
      format: "esm",
    },
    plugins: [
      resolve(),
      {
        async buildStart() {
          this.emitFile({
            type: "asset",
            fileName: "index.html",
            source: await fsp.readFile("tests/index.html"),
          });
        },
      },
    ],
  },
];
