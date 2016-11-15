(function (root) {
  const isNode = typeof(process) === 'object';
  const doT = root.doT || require('../streaming-dot.js');
  const expect = root.chai && this.chai.expect || require('chai').expect;

  let readStream, readStreamAsString;

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
  }

  describe('doT', function() {
    it('compiles a template', function() {
      const template = doT.compile('lol');
      return readStreamAsString(template({})) 
        .then(s => expect(s).to.equal('lol'));
    });
  });
})(this);