(function (root) {
  const isNode = typeof(process) === 'object';
  const doT = root.doT || require('../streaming-dot.js');
  const expect = root.chai && this.chai.expect || require('chai').expect;

  // Defined below depending on `isNode`
  let readStream, readStreamAsString, stringToStream;

  describe('doT', function () {
    it('compiles a template', function () {
      const template = doT.compile('lol');
      return readStreamAsString(template({})) 
        .then(s => expect(s).to.equal('lol'));
    });

    it('inserts values correctly', function () {
      const template = doT.compile('{{=it.syncThing}}_placeholder_{{=it.asyncThing}}');
      return readStreamAsString(template({
        syncThing: 'test',
        asyncThing: new Promise(resolve => setTimeout(_ => resolve('async'), 10))
      })).then(s => expect(s).to.equal('test_placeholder_async'));
    });

    it('inserts streams correctly', function () {
      const template = doT.compile('{{~it.input1}}_placeholder_{{~it.input2}}');
      return readStreamAsString(template({
        input1: stringToStream('stream1'),
        input2: stringToStream('stream2')
      })).then(s => expect(s).to.equal('stream1_placeholder_stream2'));
    })    
    
    it('handles conditionals correctly', function () {
      const template = doT.compile('{{?it.c1}}C1{{?}}_placeholder_{{?it.c2}}C2{{?}}');
      return readStreamAsString(template({
        c1: false,
        c2: true
      })).then(s => expect(s).to.equal('_placeholder_C2'));
    });;
  });

  if (isNode) {
    readStream = function readStreamNode(s) {
      return new Promise(resolve => {
        var buffers = [];
        s.on('data', chunk => buffers.push(chunk));
        s.on('end', _ => resolve(Buffer.concat(buffers)));
      });
    }

    readStreamAsString = function readStreamAsStringNode(s) {
      return readStream(s)
        .then(buffer => buffer.toString());
    }

    stringToStream = function stringToStreamWeb(s) {
      var Readable = require('stream').Readable;
      var r = new Readable();
      r.push(Buffer.from(s));
      r.push(null);
      return r;
    };
  } else {
    readStream = function readStreamWeb(s) {
      let buffer = [];
      const reader = s.getReader();
      return reader.read().then(function process(v) {
        if (v.done) return new Uint8Array(buffer);
        buffer = [...buffer, ...v.value];
        return reader.read().then(process);
      });
    };

    readStreamAsString = function readStreamAsStringWeb(s) {
      return readStream(s)
        .then(buffer => new TextDecoder().decode(buffer));
    };

    stringToStream = function stringToStreamWeb(s) {
      return new Response(s).body; // lol
    };
  }


})(this);