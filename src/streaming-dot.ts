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

export type AcceptableStreamPayload = ArrayBuffer | ArrayBufferView | string;
export type AcceptableItem = AcceptableStreamPayload | ReadableStream<AcceptableStreamPayload>;

export function stream(streams: ReadableStream<AcceptableItem>): ReadableStream<ArrayBuffer> {
	const {readable, writable} = new TransformStream<ArrayBuffer>();	
	const reader = streams.getReader();
	let writer = writable.getWriter();
	const encoder = new TextEncoder();
	(async function() {
		while(true) {
			const {value, done} = await reader.read();
			if(done) {
				return;
			}
			if(typeof value === "string") {
				writer.write(encoder.encode(value));
			} else if (value instanceof ArrayBuffer) {
				writer.write(value);
			} else if (ArrayBuffer.isView(value)) {
				writer.write(value.buffer);
			} else if(value instanceof ReadableStream) {
				writer.releaseLock();
				// TODO: Are these options good defaults? Should they be made configurable?
				await stream(value).pipeTo(writable, {preventClose: true, preventAbort: true});
				writer = writable.getWriter();
			}

		}
	})().finally(() => writer.close());
	return readable;
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
			while(variables.length > 0) {
				controller.enqueue(strs.shift()!);
				controller.enqueue(variables.shift()!);
			}
			controller.enqueue(strs.shift()!);
			controller.close();
		}
	}));
}
