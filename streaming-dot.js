/**! 
 * doT.js
 * 2011-2014, Laura Doktorova, https://github.com/olado/doT
 * Made streamable by Surma <surma@google.com>
 * Licensed under the MIT license.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      factory(exports);
  } else {
      factory((root.doT = {}));
  }
}(this, function (exports) {
  "use strict";

  Object.assign(exports, {
    version: "1.0.1",
    templateSettings: {
      evaluate: /\{\{(([^\}]+|\\.)+)\}\}/g,
      interpolate: /\{\{=\s*([^\}]+)\}\}/g,
      stream: /\{\{~\s*([^\}]+)\}\}/g,
      conditional: /\{\{\?(\?)?\s*([^\}]*)?\}\}/g,
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
r.then(r=>{
r.on('end',_=>{d=!0;l&&l()});
r.on('data',c=>(l&&(v=>{var t=l;l=null;t(v)})||(d=>b.push(d)))(c));
});
return i={next:_=>({done:b.length===0&&d,value:P(b.shift()||new Promise(r=>l=r))}),[Symbol.iterator]:_=>i};};`;
    } else {
      streamToGenerator = 
`var s = (r) => {
r=r.then(r=>r.getReader());
var d=!1;
return i={next:_=>({done:d,value:r.then(r=>r.read()).then(v=>{d=v.done;return P(v.value)})}),[Symbol.iterator]:_=>i};
};`;
    }

    tmpl = promiseBind + streamToGenerator +
        "var g=function*(){yield P('"
        + tmpl
            .replace(/'|\\/g, "\\$&")
            .replace(c.interpolate, function(_, code) {
              return "');yield P(" + unescape(code) + ");yield P('";
            })
            .replace(c.conditional, function(_, els, code) {
              if (code && !els) { // {{?<something>}} === if
                return "');yield P(" + unescape(code) + ").then(v=>v&&P('";
              } else if (!code && els) { // {{??}} === else
                return "')||P('";
              } else { // {{?}} === "endif"
                return "'));yield P('";
              }
            })
            .replace(c.stream, function(_, code) {
              return "');yield* s(P(" + unescape(code) + "));yield P('";
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
`var r = new R({read:function f() {
var d=g.next();
if(d.done) return r.push(null);
P(d.value).then(v=>{if(v)return r.push(Buffer.from(v));else f()});
}});
return r;
`;
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
        const f = new Function(c.varname, 'R', tmpl); 
        return it => f(it, require('stream').Readable);
      } 
      return new Function(c.varname, tmpl);
    } catch (e) {
      console.log("Could not create a template function: " + tmpl);
      throw e;
    }
  };
}));
