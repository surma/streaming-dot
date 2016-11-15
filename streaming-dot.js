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
      evaluate: /\{\{(([^\}]+|\\.)+)\}\}/g,
      interpolate: /\{\{=\s*([^\}]+)\}\}/g,
      stream: /\{\{~\s*([^\}]+)\}\}/g,
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
    var streamToGenerator;
    if (c.node) {
      streamToGenerator = 
`var s=(r)=>{
var d=!1,l,b=[];
r.on('end',_=>{d=!0;l&&l()});
r.on('data',c=>(l&&(v=>{var t=l;l=null;t(v)})||(d=>b.push(d)))(c));
return i={next:_=>({done:b.length===0&&d,value:P(b.shift()||new Promise(r=>l=r))}),[Symbol.iterator]:_=>i};};`;
    } else {
      streamToGenerator = 
`var s = (r) => {
r=r.getReader();
var d=!1;
return i={next:_=>({done:d,value:r.read().then(v=>{d=v.done;return P(v.value)})}),[Symbol.iterator]:_=>i};
};`;
    }

    tmpl = promiseBind + streamToGenerator +
        "var g=function*(){yield P('"
        + tmpl
            .replace(/'|\\/g, "\\$&")
            .replace(c.interpolate, function(_, code) {
              return "');yield P(" + unescape(code) + ");yield P('";
            })
            .replace(c.conditional, function(_, code) {
              if (code) { // {{?<something>}} === if
                return "');yield P(" + unescape(code) + ").then(v=>v&&P('"
              } else { // {{?}} === "endif"
                return "'));yield P('";
              }
            })
            .replace(c.stream, function(_, code) {
              return "');yield* s(" + unescape(code) + ");yield P('";
            })
            .replace(c.evaluate, function(_, code) {
              return "');" + unescape(code) + ";yield P('";
            })
            .replace(/\n/g, "\\n")
            .replace(/\t/g, '\\t')
            .replace(/\r/g, "\\r")
         + "');}();";

    if(c.node) {
      tmpl += 
`var e=new EE(),
d=g.next();
P(d.value).then(function f(v){
if(d.done)return e.emit('end');
v&&e.emit('data',Buffer.from(v));
d=g.next();
return P(d.value).then(f);
});
return e;`;
    } else {
      tmpl +=
`var e=new TextEncoder();
return new ReadableStream({
pull: c=>{
var v=g.next();
if(v.done)return c.close();
v.value.then(d=>{
if(typeof(d)=="string")d=e.encode(d);
d&&c.enqueue(d);
});
return v.value;
}});`;
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
