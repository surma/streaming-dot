import * as process from "process";
import * as http from "http";
import { promises as fsp } from "fs";

import * as rollup from "rollup";
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";

import puppeteer from "puppeteer";
import superstatic from "superstatic";
import connect from "connect";

const PORT = 13370;

async function main() {
  await bundleTestSuite();
  const server = await startServer();
  try {
    const { total, passed } = await Promise.race([
      runTestSuite(),
      timeout(10000).then(() => {
        throw Error("Tests took longer than 10s");
      })
    ]);
    console.log({ passed, total });
    if (total !== passed) {
      throw Error("Not all tests passed");
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    server.close();
  }
}

async function startServer() {
  const app = connect();
  app.use(
    superstatic({
      config: {
        public: ".test-build"
      }
    })
  );
  return app.listen(PORT);
}

async function bundleTestSuite() {
  const config = {
    input: "tests/runner.js",
    output: {
      dir: ".test-build",
      format: "esm"
    },
    plugins: [
      resolve(),
      {
        async buildStart() {
          this.emitFile({
            type: "asset",
            fileName: "index.html",
            source: await fsp.readFile("tests/index.html")
          });
        }
      }
    ]
  };
  const bundle = await rollup.rollup(config);
  await bundle.generate(config.output);
  await bundle.write(config.output);
}

function runTestSuite() {
  return new Promise(async resolve => {
    const browser = await puppeteer.launch({ product: "chrome" });
    const page = await browser.newPage();
    let total = -1;
    let passed = -1;
    page.on("console", ev => {
      const text = ev.text();
      if (/Total:/i.test(text)) {
        total = parseInt(text.split(":", 2)[1]);
      } else if (/Passed:/i.test(text)) {
        passed = parseInt(text.split(":", 2)[1]);
      }
      if (total !== -1 && passed !== -1) {
        browser.close();
        resolve({ total, passed });
      }
    });
    await page.goto(`http://localhost:${PORT}`);
  });
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
