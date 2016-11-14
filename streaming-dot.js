// doT.js
// 2011-2014, Laura Doktorova, https://github.com/olado/doT
// Made streamable by Surma 2016, Surma <surma@google.com>
// Licensed under the MIT license.


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
      conditional: /\{\{\?\s*([^\}]*)\}\}/g,
      varname: "it",
    }
  });

  function unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

  exports.compile = function(tmpl, c, def) {
    c = Object.assign({}, exports.templateSettings, c);

    tmpl = "var P=Promise.resolve.bind(Promise);var g=function* () {yield P('"
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
            .replace(c.evaluate, function(m, code) {
              return "');" + unescape(code) + ";yield P('";
            })
         + "');}();";

    if(c.node) {
      tmpl += 
        `var e = new EventEmitter();
        var p = P();
        for(let v of g) {
          p = p.then(_ => v).then(v => v && e.emit('data', v));
        }
        p.then(_ => e.emit('end'));
        return e`;
    } else {
      tmpl +=
        `return new ReadableStream({
          pull: ctr => {
            var v = g.next();
            if (v.done) return ctr.close();
            v.value.then(data=>data&&ctr.enqueue(data));
            return v.value;
          }
        });`;
    }

    try {
      if (c.noEval) return tmpl;
      if (c.node) {
        const f = new Function(c.varname, 'EventEmitter', tmpl);
        return it => f(it, EventEmitter);
      } 
      return new Function(c.varname, tmpl);
    } catch (e) {
      console.log("Could not create a template function: " + tmpl);
      throw e;
    }
  };
}));
