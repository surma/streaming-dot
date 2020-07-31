/**!
 *
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

type AcceptableStreamPayload = ArrayBuffer | ArrayBufferView | string;
type AcceptableItems = AcceptableStreamPayload | ReadableStream<AcceptableStreamPayload> | AcceptableStreamPayload[];
type AcceptableItem = AcceptableItems | Promise<AcceptableItems>;

async function streamForEach<T>(stream: ReadableStream<T>, f: (v: T) => Promise<void> | void): Promise<void> {
	const reader = stream.getReader();
	while(true) {
		const {value, done} = await reader.read();
		if(done) {
			reader.releaseLock();
			return;
		}
		await f(value!);
	}
}

function streamFromIterable(it: Iterable<AcceptableItem>): ReadableStream<AcceptableItem> {
  return new ReadableStream({
    start(controller) {
      for (const v of it) {
        controller.enqueue(v);
      }
      controller.close();
    },
  });
}

export function ifUnsettled(p: Promise<AcceptableItem>, v: AcceptableItem): Promise<AcceptableItem> {
	return Promise.race([
		p,
		Promise.resolve(v)
	]);
}

export function stream(streams: ReadableStream<AcceptableItem>): ReadableStream<ArrayBuffer> {
	return new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			await streamForEach(streams, async value => {
				if(typeof value === "string") {
					controller.enqueue(encoder.encode(value));
				} else if (value instanceof ArrayBuffer) {
					controller.enqueue(value);
				} else if (ArrayBuffer.isView(value)) {
					controller.enqueue(value.buffer);
				} else if ('then' in value && typeof value.then === 'function') {
					await streamForEach(stream(streamFromIterable([await value])), value => controller.enqueue(value));
				} else if (Array.isArray(value)) {
					const newStream = streamFromIterable(value);
					await streamForEach(stream(newStream), value => controller.enqueue(value));
				} else if(value instanceof ReadableStream) {
					await streamForEach(stream(value), value => controller.enqueue(value));
				}
			});
			controller.close();
		}
	});
}

function streamIterable(it: Iterable<AcceptableItem>): ReadableStream<ArrayBuffer> {
	return stream(new ReadableStream({
		start(controller) {
			for(const v of it) {
				controller.enqueue(v);
			}
			controller.close();
		}
	}));
}

export function dot(strs: string[], ...variables: AcceptableItem[]) {
	return stream(new ReadableStream({
		start(controller) {
			// `strs` is readonly, so we can’t use `shift()`
			let idx = 0;
			while(idx < variables.length) {
				controller.enqueue(strs[idx]);
				controller.enqueue(variables[idx]);
				idx++
			}
			controller.enqueue(strs[idx]);
			controller.close();
		}
	}));
}
