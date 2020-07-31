# Streaming doT

Streaming doT is tagged template literal for creating streamed responses.

Quick facts:

- Tagged template literal `` dot`...` ``.
- Creates a WHATWG `ReadableStream` of `ArrayBuffer` for direct compatibility with `Response`.
- Input can be strings, arrays, `ArrayBuffer`s, `ReadableStream`s and `Promise`s.
- Strings will automatically be encoded using UTF-8.
- 430B Brotli’d.
- Works in Firefox, Safari, Edge and Chrome.
- Written in TypeScript.

## Quickstart

```js
import { dot } from "streaming-dot";

new Response(dot`
	<!doctype html>
	${caches.match("/header.html")}
	${fetch("/article.html?body-only=true")}
	<h1>Other articles</h1>
	<ul>
		${(await idb.get("cached-articles")).map(
      (article) => dot`
					<li><a href="${article.link}">${article.title}</a></li>
				`
    )}
	</ul>
	${caches.match("/footer.html")}
`);
```

## API

### `dot`

Tagged template literal. See example above.

## Compatibility

Streaming doT does not use `TransformStream`, or `WritableStream` and therefore works in all major browers.

## Node

Planned, but not done yet.

---

Apache 2.0
