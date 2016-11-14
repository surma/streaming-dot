(function () {
  var doT = this.doT || require('../streaming-dot.js');
  var expect = this.chai && this.chai.expect || require('chai').expect;

  function readStream(s) {
    var buffer = [];
    var reader = s.getReader();
    return reader.read().then(function process(v) {
      if (v.done) return new Uint8Array(buffer);
      buffer = [...buffer, ...v.value];
      return reader.read().then(process);
    });
  }

  function readStreamAsString(s) {
    return readStream(s)
      .then(buffer => new TextDecoder().decode(buffer));
  }

  describe('doT', function() {
    it('compiles a template', function() {
      var template = doT.compile('lol');
      return readStreamAsString(template({})) 
        .then(s => expect(s).to.equal('lol'));
    });
  });
})();