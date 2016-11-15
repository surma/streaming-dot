(function (root) {
  'use strict';

  const isNode = typeof(process) === 'object';
  const doT = root.doT || require('../streaming-dot.js');
  const expect = root.chai && root.chai.expect || require('chai').expect;

  // Defined below depending on `isNode`
  let readStream, readStreamAsString, stringToStream;

  describe('doT', function () {
    it('compiles a template to functions', function () {
      const template = doT.compile('lol');
      return readStreamAsString(template({})) 
        .then(s => expect(s).to.equal('lol'));
    });

    it('compiles a template to JavaScript', function () {
      const template = doT.compile('lol', {noEval: true});
      expect(typeof(template)).to.equal('string');
    });

    it('inserts values correctly', function () {
      const template = doT.compile('{{=it.syncThing}}_placeholder_{{=it.asyncThing}}');
      return readStreamAsString(template({
        syncThing: 'test',
        asyncThing: new Promise(resolve => setTimeout(_ => resolve('async'), 10))
      })).then(s => expect(s).to.equal('test_placeholder_async'));
    });

    it('inserts literals correctly', function () {
      const template = doT.compile('{{=""+(1+1)}}_placeholder_{{=""+(5*5)}}');
      return readStreamAsString(template({
        syncThing: 'test',
        asyncThing: new Promise(resolve => setTimeout(_ => resolve('async'), 10))
      })).then(s => expect(s).to.equal('2_placeholder_25'));
    });


    it('inserts streams correctly', function () {
      const template = doT.compile('{{~it.input1}}_placeholder_{{~it.input2}}');
      return readStreamAsString(template({
        input1: stringToStream('stream1'),
        input2: stringToStream('stream2')
      })).then(s => expect(s).to.equal('stream1_placeholder_stream2'));
    });

    it('handles conditionals correctly', function () {
      const template = doT.compile('{{?it.c1}}C1{{?}}_placeholder_{{?it.c2}}C2{{?}}');
      return readStreamAsString(template({
        c1: false,
        c2: true
      })).then(s => expect(s).to.equal('_placeholder_C2'));
    });

    // Node-specific tests
    if(isNode) {
      describe('in node', function () {
        it('handles waiting correctly', function () {
          const template = doT.compile('{{~it.r}}');
          let chunks = [Buffer.from('a'), Buffer.from('b')];
          let r = new require('stream').Readable({
            read: function () {
              let chunk = chunks.shift();
              if (!chunk) this.push(null);
              setTimeout(_ => this.push(chunk), 300);
            }
          });
          return readStreamAsString(template({r: r}))
            .then(s => expect(s).to.equal('ab'));
        });
      });
    }
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
      return new require('stream').Readable({
        read: function() {
          this.push(Buffer.from(s.substr(0, s.length/2)));
          this.push(Buffer.from(s.substr(s.length/2)));
          this.push(null);
        }
      });
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