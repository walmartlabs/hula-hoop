var RouterConverter = require('../../webpack/router-converter');

describe('webpack router-converter', function() {
  var compiler,
      compilation,
      json;
  beforeEach(function() {
    json = {};

    compiler = {
      plugin: function(name, callback) {
        expect(name).to.equal('compilation');
        callback(compilation);
      }
    };

    compilation = {
      plugin: function(name, callback) {
        expect(name).to.equal('circus-json');
        callback(json);
      }
    };
  });

  it('should provide hula-hoop map structure', function() {
    json = {
      chunks: {
        1: {js: 'js.js', css: 'css.css'}
      },
      modules: {
        1: {
          chunk: 1
        }
      },
      routes: {
        'foo': 1
      }
    };

    var converter = new RouterConverter();
    converter.apply(compiler);

    expect(json.hulahoop).to.eql({
      modules: {
        1: {js: ['js.js'], css: ['css.css'], serverRender: false}
      },
      routes: {
        '/foo': 1
      }
    });
  });
  it('should handle missing resources', function() {
    json = {
      chunks: {
        1: {}
      },
      modules: {
        1: {
          chunk: 1
        }
      },
      routes: {
        'foo': 1
      }
    };

    var converter = new RouterConverter();
    converter.apply(compiler);

    expect(json.hulahoop).to.eql({
      modules: {
        1: {serverRender: false}
      },
      routes: {
        '/foo': 1
      }
    });
  });
  it('should ignore projects without routes', function() {
    var converter = new RouterConverter();
    converter.apply(compiler);

    expect(json).to.eql({
    });
  });
});
