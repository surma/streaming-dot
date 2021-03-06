# Streaming doT 
[![Build Status](https://travis-ci.org/surma/streaming-dot.svg?branch=master)](https://travis-ci.org/surma/streaming-dot)

Streaming doT is a [doT]-based streaming templating language. 

Quick facts:

* Generates a stream
* Can consume streams and promises
* Built for Node and for the web (with ServiceWorkers in mind)
* 2KB small (1KB gzip’d)
* Conditionals built-in
* Compiles templates to JavaScript
* Templates can contain arbitrary JavaScript

## Usage

### `doT.compile(templateString, opts)`
Compiles `templateString` to JavaScript. By default, it returns a function that takes the data object as an argument. Inside the template string the following expressions can be used:

* `{{=<value>}}`: Inserts `<value>` into the template. `<value>` must be a string, a `Uint8Array` or a Promise that resolves to a value of any of these types. The data object is accessible as `it`.
* `{{?<value>}}...A...{{??}}...B...{{?}}`: Only inserts A if `<value>` is truthy or is a Promise that resolves to a truthy value. Otherwise, B is inserted. The B block is optional.
* `{{~<value>}}`: Inserts `<value>` into the template. `<value>` must be a stream.
* `{{<code>}}`: Inserts `<code>` into the [generator function]. The code can `yield` Promises to insert their value into the template. For example, `{{=it.name}}` is equivalent to `{{yield Promise.resolve(it.name)}}`

`opts` is an object with any subset of the following default values:

```js
{
  evaluate: /\{\{(([^\}]+|\\.)+)\}\}/g,
  interpolate: /\{\{=\s*([^\}]+)\}\}/g,
  stream: /\{\{~\s*([^\}]+)\}\}/g,
  conditional: /\{\{\?(\?)?\s*([^\}]*)?\}\}/g,
  node: typeof(process) === 'object',
  noEval: false,
  varname: "it"
}
```

* `evaluate`, `interpolate`, `stream` and `conditional` are the RegExps for the previously mentioned template expressions.
* `node`: If `true`, the generated code will be targeted for Node, otherwise for browsers.
* `noEval`: If `true`, return the functions code instead of a callable. 
* `varname`: The name under which the data object is accessible in the template expressions. 

## Compatibility

| Browser | Support | Links |
|---------|---------|-------|
| Node    | ✅ ≥5   |       |
| Chrome  | ✅ ≥52  | |
| Firefox | ⏰ In Development | Missing [ReadableStream] on fetch (https://bugzilla.mozilla.org/show_bug.cgi?id=1128959) |
| Safari  | ⏰ In Development | Missing TextDecoder ([polyfillable][TextDecoder polyfill]) |
| Edge    | ⏰ In Development | Missing TextDecoder ([polyfillable][TextDecoder polyfill]) and ReadableStream ([polyfillable][ReadableStream polyfill]) |

## Current shortcomings and potential tripwires

* The parser itself is not streaming (i.e. `doT.compile()` cannot consume a stream).
* ~~Currently, the body of a conditional cannot contain template expressions~~
* Nested conditionals are not possible due to the RegExp-based nature of the parser

## Example

A fully runnable example can be found in the `example` folder. It is a node webserver using streaming doT as a templating language. The website has a service worker that uses streaming doT as well.

To run the example, start the webserver by running `node index.js` in the `example` folder or visit https://streaming-dot-example.hyperdev.space/ for a hosted version of the example code (thanks [HyperDev]).

### Template

```
{{~it.header}}

<h1>This is a doT template</h1>
<h2>
  This content was generated
  {{?it.location}}
    {{=it.location}}
  {{??}}
    server-side (refresh for ServiceWorker)
  {{?}}
</h2>

{{~it.footer}}}
```

### Node

```js
function handler(req, res) {
  fs.readFile('app/index.dot', 'utf-8', (_, data) => {
    var template = doT.compile(data);
    var stream = template({
      header: fs.createReadStream('app/header.partial.html'),
      footer: fs.createReadStream('app/footer.partial.html'),
    });
    res.set('Content-Type', 'text/html');
    stream.pipe(res)
  });
}
```

### ServiceWorker

```js
self.onfetch = event => event.respondWith(
  getTemplateSomehow()
    .then(body => {
      const template = doT.compile(body);
      const response = template({
        header: caches.match('/header.partial.html').then(r => r.body),
        footer: caches.match('/footer.partial.html').then(r => r.body),
        serviceworker: timeoutPromise(2000).then(_ => true)
      });
      return new Response(response, {headers: {'Content-Type': 'text/html'}});
);
```

## License
Apache 2.0

---
Version 1.1.1

[doT]: https://github.com/olado/doT
[HyperDev]: https://hyperdev.com/
[generator function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*
[TextDecoder polyfill]: https://github.com/inexorabletash/text-encoding
[ReadableStream polyfill]: https://github.com/creatorrr/web-streams-polyfill
