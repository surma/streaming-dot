import { test } from "uvu";
import * as assert from "./assert.js";
import { dot, ifUnsettled } from "../build/streaming-dot.js";

async function collect(stream) {
  let buffer = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      return buffer;
    }
    buffer.push(value);
  }
}

function streamFromIterable(it) {
  return new ReadableStream({
    start(controller) {
      for (const v of it) {
        controller.enqueue(v);
      }
      controller.close();
    },
  });
}

function decodeArrayOfBuffers(arr) {
  const dec = new TextDecoder();
  return arr.map((v) => dec.decode(v, { stream: true })).join("");
}

test("concatenates strings", async function () {
  const stream = dot`A${"B"}C`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "ABC");
});

test("can handle streams of strings", async function () {
  const otherStream = streamFromIterable(["1", "2", "3"]);
  const stream = dot`A${otherStream}B`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "A123B");
});

test("can handle binary streams", async function () {
  const otherStream = streamFromIterable([new Uint8Array(["65"]).buffer]);
  const stream = dot`1${otherStream}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1A2");
});

test("can handle arrays", async function () {
  const stream = dot`1${["A", "B", "C"]}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1ABC2");
});

test("can handle arrays of streams", async function () {
  const streams = ["A", "B", "C"].map((v) => streamFromIterable([v]));
  const stream = dot`1${streams}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1ABC2");
});

test("can handle promises", async function () {
  const stream = dot`1${Promise.resolve("A")}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1A2");
});

test("can handle unsettled promises", async function () {
  const promise = new Promise((resolve) =>
    setTimeout(() => resolve("X"), 1000)
  );
  const stream = dot`1${ifUnsettled(promise, "A")}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1A2");
});

test("can handle responses", async function () {
  const response = new Response("A");
  const stream = dot`1${response}2`;
  const values = await collect(stream);
  assert.is(decodeArrayOfBuffers(values), "1A2");
});
