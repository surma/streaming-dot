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

function decodeArrayOfBuffers(arr) {
  const dec = new TextDecoder();
  return arr.map((v) => dec.decode(v, { stream: true })).join("");
}

describe("tagged-template dot", function () {
  it("concatenates strings and values", async function () {
    const stream = dot`A${"B"}C`;
    const values = await collect(stream);
    expect(decodeArrayOfBuffers(values)).to.equal("ABC");
  });
});
