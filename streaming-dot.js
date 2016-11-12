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
      // evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
      interpolate: /\{\{=([\s\S]+?)\}\}/g,
      // conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
      // iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
      varname: "it",
      parse: true,
      node: false
    },
    template: undefined
  });

  var startend = { start: "'); yield Promise.resolve(", end: "); yield Promise.resolve('"};
  
  function unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

  exports.template = function(tmpl, c, def) {
    c = Object.assign({}, exports.templateSettings, c);
    var sid = 0, indv;

    tmpl = 
      `const g = (function* () {
        yield Promise.resolve('`
         + tmpl.replace(/'|\\/g, "\\$&")
            .replace(c.interpolate, function(m, code) {
              return startend.start + unescape(code) + startend.end;
            })
         + `');
      })();`;

    if(c.node) {
      
      tmpl += 
        `const emitter = new EventEmitter();
        let p = Promise.resolve();
        for(let v of g) {
          p = 
            p
              .then(_ => v)
              .then(v => emitter.emit('data', v)); 
        }
        p.then(_ => emitter.emit('end'));
        return emitter`;
    } else {
      tmpl +=
        `return new ReadableStream({
          pull: ctr => {
            const v = g.next();
            v.value.then(data => {
              if (v.done) {
                return ctr.close();
              }
              ctr.enqueue(data);
            });
            return v.value;
          }
        });`;
    }

      // .replace(c.conditional || skip, function(m, elsecase, code) {
      // 	return elsecase ?
      // 		(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
      // 		(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
      // })
      // .replace(c.iterate || skip, function(m, iterate, vname, iname) {
      // 	if (!iterate) return "';} } out+='";
      // 	sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
      // 	return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
      // 		+vname+"=arr"+sid+"["+indv+"+=1];out+='";
      // })
      // .replace(c.evaluate || skip, function(m, code) {
      // 	return "';" + unescape(code) + "w.write('";
      // })
      // + "');return out;")
      // .replace(/\n/g, "\\n").replace(/\t/g, '\\t').replace(/\r/g, "\\r")
      // .replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, "");
      //.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

    try {
      if (!c.parse) {
        return tmpl;
      }
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
