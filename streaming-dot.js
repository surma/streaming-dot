/**! 
 * doT.js
 * 2011-2014, Laura Doktorova, https://github.com/olado/doT
 * Made streamable by Surma <surma@google.com>
 * Licensed under the MIT license.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      factory(exports, require('events'));
  } else {
      factory((root.doT = {}));
  }
}(this, function (exports, EventEmitter) {
  "use strict";

  Object.assign(exports, {
    version: "1.0.0",
    templateSettings: {
      evaluate:    /\{\{(([^\}]+|\\.)+)\}\}/g,
      interpolate: /\{\{=([^\}]+)\}\}/g,
      stream: /\{\{~([^\}]+)\}\}/g,
      conditional: /\{\{\?\s*([^\}]*)\}\}/g,
      node: typeof(process) === 'object',
      varname: "it",
    }
  });

  function unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

  exports.compile = function(tmpl, c, def) {
    c = Object.assign({}, exports.templateSettings, c);
    var promiseBind = "var P=Promise.resolve.bind(Promise);";
    var readableStreamToGenerator = `
    var s = (r) => {
      r = r.getReader();
      var done = false;
      return {
        next: _ => ({done, value: r.read().then(v => {done = v.done; return P(v.value)})}),
        [Symbol.iterator]: function(){return this}
      };
    };
    `

    tmpl = promiseBind + readableStreamToGenerator +
        "var g=function* () {yield P('"
        + tmpl
            .replace(/'|\\/g, "\\$&")
            .replace(c.interpolate, function(m, code) {
              return "');yield P(" + unescape(code) + ");yield P('";
            })
            .replace(c.conditional, function(m, code) {
              if (code) { // {{?<something>}} === if
                return "');yield P(" + unescape(code) + ").then(v=>v&&P('"
              } else { // {{?}} === "endif"
                return "'));yield P('";
              }
            })
            .replace(c.stream, function(m, code) {
              return "');yield* s(" + unescape(code) + ");yield P('";
            })
            .replace(c.evaluate, function(m, code) {
              return "');" + unescape(code) + ";yield P('";
            })
            .replace(/\n/g, "\\n")
            .replace(/\t/g, '\\t')
            .replace(/\r/g, "\\r")
         + "');}();";

    if(c.node) {
      tmpl += 
        `var e = new EE();
        var p = P();
        for(let v of g) {
          p = p.then(_ => v).then(v => v && e.emit('data', Buffer.from(v)));
        }
        p.then(_ => e.emit('end'));
        return e`;
    } else {
      tmpl +=
        `var e=new TextEncoder();return new ReadableStream({
          pull: ctr => {
            var v = g.next();
            if (v.done) return ctr.close();
            v.value.then(data => {
              if (typeof(data) === "string") data = e.encode(data);
              data && ctr.enqueue(data);
            });
            return v.value;
          }
        });`;
    }

    try {
      if (c.noEval) return tmpl;
      if (c.node) {
        const f = new Function(c.varname, 'EE', tmpl); 
        return it => f(it, EventEmitter);
      } 
      return new Function(c.varname, tmpl);
    } catch (e) {
      console.log("Could not create a template function: " + tmpl);
      throw e;
    }
  };
}));
