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
      options: {
        output: {
          publicPath: '/r/',
          component: 'hula-hoop'
        }
      },
      chunks: [],
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
      chunkDependencies: {
        'hula-hoop_1': {
          js: [{href: 'js.js', id: 'foo'}],
          css: [{href: 'css.css', id: 'foo'}]
        }
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
        'hula-hoop_1': {
          js: [{href: 'js.js', attr: 'data-circus-jsid="foo"'}],
          css: [{href: 'css.css', attr: 'data-circus-cssid="foo"'}],
          serverRender: false
        }
      },
      routes: {
        '/foo': 'hula-hoop_1'
      }
    });
  });

  it('should handle published resources', function() {
    json = {
      chunks: {
        1: {js: 'js.js', css: 'css.css'}
      },
      chunkDependencies: {
        'hula-hoop_1': {
          js: [{href: '//foo/js.js', id: 'foo'}],
          css: [{href: '//bar/css.css', id: 'foo'}]
        }
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
        'hula-hoop_1': {
          js: [{href: '//foo/js.js', attr: 'data-circus-jsid="foo"'}],
          css: [{href: '//bar/css.css', attr: 'data-circus-cssid="foo"'}],
          serverRender: false
        }
      },
      routes: {
        '/foo': 'hula-hoop_1'
      }
    });
  });
  it('should handle published resources', function() {
    json = {
      chunks: {
        1: {js: 'js.js', css: 'css.css'}
      },
      chunkDependencies: {
        'hula-hoop_1': {
          js: [{href: '//foo/js.js', id: 'foo'}],
          css: [{href: '//bar/css.css', id: 'foo'}]
        }
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

    compilation.chunks = [{
      modules: [{
        dependencies: [
          {
            Class: {name: 'RequireRouterListing' },
            data: {
              type: 'ObjectExpression',
              properties: [
                {key: {name: 'root'}, value: {value: '/bar/'}}
              ]
            }
          },
          {
            Class: {name: 'RequireRouterListing' },
            data: {
              type: 'ObjectExpression',
              properties: []
            }
          },
          {
            Class: {name: 'RequireRouterListing' }
          }
        ]
      }
      ]
    }];

    var converter = new RouterConverter();
    converter.apply(compiler);

    expect(json.hulahoop).to.eql({
      modules: {
        'hula-hoop_1': {
          js: [{href: '//foo/js.js', attr: 'data-circus-jsid="foo"'}],
          css: [{href: '//bar/css.css', attr: 'data-circus-cssid="foo"'}],
          serverRender: false
        }
      },
      routes: {
        '/bar/foo': 'hula-hoop_1'
      }
    });
  });
  it('should handle missing resources', function() {
    compilation.options.output.publicPath = '';
    json = {
      chunks: {
        1: {}
      },
      chunkDependencies: {
        'hula-hoop_1': {
          js: [{href: 'js.js', id: 'foo'}],
          css: [{href: 'css.css', id: 'foo'}]
        }
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
        'hula-hoop_1': {
          js: [{href: 'js.js', attr: 'data-circus-jsid="foo"'}],
          css: [{href: 'css.css', attr: 'data-circus-cssid="foo"'}],
          serverRender: false
        }
      },
      routes: {
        '/foo': 'hula-hoop_1'
      }
    });
  });
  it('should ignore projects without routes', function() {
    var converter = new RouterConverter();
    converter.apply(compiler);

    expect(json).to.eql({
    });
  });

  it('should error when missing chunkDependencies', function() {
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

    expect(function() {
      var converter = new RouterConverter();
      converter.apply(compiler);
    }).to.throw(/Must be run in conjunction with the chunk dependencies plugin/);
  });
});
