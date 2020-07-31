import { dot } from "/base/build/streaming-dot.js";

export async function collect(stream) {
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

describe("tagged-template dot", function () {
  it("concatenates strings", async function () {
    const stream = dot`A${"B"}C`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("ABC");
  });

  it("can handle streams of strings", async function () {
    const otherStream = streamFromIterable(["1", "2", "3"]);
    const stream = dot`A${otherStream}B`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("A123B");
  });

  it("can handle binary streams", async function () {
    const otherStream = streamFromIterable([new Uint8Array(["65"]).buffer]);
    const stream = dot`1${otherStream}2`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("1A2");
  });

  it("can handle arrays", async function () {
    const stream = dot`1${["A", "B", "C"]}2`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("1ABC2");
  });
  it("can handle arrays of streams", async function () {
    const streams = ["A", "B", "C"].map((v) => streamFromIterable([v]));
    const stream = dot`1${streams}2`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("1ABC2");
  });
});
