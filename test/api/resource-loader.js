var fs = require('fs'),
    resourceLoader = require('../../lib/api/resource-loader');

describe('resource-loader', function() {
  beforeEach(function() {
    this.stub(fs, 'readdirSync', function(name) {
      var err;

      if (/bazbaz$/.test(name)) {
        return [
          'baz',
          'VERSION'
        ];
      } else if (/baz$/.test(name)) {
        return [
          'index.html',
          'bat',
          'bar',
          'VERSION'
        ];
      } else if (/bat$/.test(name)) {
        return [
          'index.html',
          'foo',
          'bar',
          'module-map.json'
        ];
      } else if (/boz$/.test(name)) {
        return [
          'index.html',
          'baz'
        ];
      } else if (/io-error$/.test(name)) {
        err = new Error();
        err.code = 'FAIL';
        throw err;
      } else {
        err = new Error();
        err.code = 'ENOTDIR';
        throw err;
      }
    });
  });
  afterEach(function() {
    resourceLoader.reset();
  });

  describe('#register', function() {
    it('should fail if passed no resources', function() {
      expect(function() {
        resourceLoader.register('appName!');
      }).to.throw('No resources defined');
      expect(function() {
        resourceLoader.register('appName!', []);
      }).to.throw('No resources defined');
    });
    it('should ignore missing resources when requested', function() {
      expect(function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'bazbaz'},
          {name: 'bar', version: '2.0.0', path: 'foo', allowMissing: true}
        ]);

        var info = [
          {
            name: 'appName!',
            versions: [{
              info: 'custom blerg: ' + process.cwd() + '/bazbaz/VERSION',
              name: 'foo'
            }]
          }
        ];

        expect(resourceLoader.info()).to.eql(info);
      });
    });
  });

  describe('#info', function() {
    beforeEach(function() {
      this.stub(fs, 'readFileSync', function(name) {
        // Mock out module-map.json files
        if (/\/VERSION/.test(name)) {
          return 'custom blerg: ' + name;
        } else {
          throw new Error('should not read');
        }
      });
    });
    it('should return a list of resources', function(done) {
      resourceLoader.register('appName!', [
        {name: 'foo', version: '1.0.0', path: 'bazbaz'},
        {name: 'bar', version: '2.0.0', path: 'bat'}
      ]);

      var info = [
        {
          name: 'appName!',
          versions: [
            {
              info: '2.0.0',
              name: 'bar'
            },
            {
              info: 'custom blerg: ' + process.cwd() + '/bazbaz/VERSION',
              name: 'foo'
            }
          ]
        }
      ];
      expect(resourceLoader.info()).to.eql(info);
      expect(resourceLoader.info()).to.eql(info);
      done();
    });
    it('should handle IO errors', function() {
      expect(function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'io-error'}
        ]);
        resourceLoader.info();
      }).to.throw();
    });
  });

  describe('route info', function() {
    var useCircus;

    beforeEach(function() {
      this.stub(fs, 'readFileSync', function(name) {
        // Mock out module-map.json files
        if (/\/baz\//.test(name)) {
          return JSON.stringify([
            '/foo',
            '/foo/{path*}'
          ]);
        } else if (/\/circus.json$/.test(name)) {
          return JSON.stringify({
            hulahoop: {
              'modules': [
                {'js': [{href: 'bundle.js'}], 'css': [{href: '0.bundle.css'}], 'serverRender': true},
                {'js': [{href: '1.bundle.js'}], 'css': [{href: '1.bundle.css'}], 'serverRender': true},
                {'js': [{href: '2.bundle.js'}]},
                {'css': [{href: '3.bundle.css'}], 'serverRender': true}
              ],
              'routes': {
                '/': 1,
                '/foo/{path*}': 2,
                '/hai': 3
              }
            },
            'chunks': [
              {'js': 'bundle.js', 'css': '0.bundle.css'},
              {'js': '1.bundle.js', 'css': '1.bundle.css'},
              {'js': '2.bundle.js'},
              {'css': '3.bundle.css'}
            ],
            'published': {
              '2.bundle.js': 'it worked!'
            },
            'modules': {
              '0': {
                'chunk': 0,
                'name': 'oh-hai/src/client/index'
              },
              '1': {
                'chunk': 1,
                'name': 'oh-hai/src/client/hai'
              },
              '2': {
                'chunk': 2,
                'name': 'oh-hai/src/client/views/hai'
              },
              '3': {
                'chunk': 3,
                'name': 'oh-hai/src/client/views/hai.handlebars'
              }
            },
            'files': [
              'oh-hai.js',
              'oh-hai.js.map',
              '1.oh-hai.js',
              '1.oh-hai.js.map'
            ],
            'entry': 'oh-hai.js',
            'serverRender': true
          });
        } else {
          return JSON.stringify({
            'modules': {
              'documents': {
                'js': ['base.js', 'documents.js'],
                'css': ['base@2x.css']
              },
              'home': {
                'js': ['base.js', 'home.js'],
                'css': ['base@2x.css', 'home@2x.css'],
                'serverRender': true
              }
            },
            'routes': {
              '/foo': 'documents',
              '/foo/{path*}': 'home',
              '/home': 'home'
            },
            'loadPrefix': 'prefix!'
          });
        }
      });
      this.stub(fs, 'existsSync', function(name) {
        if (/\/circus.json$/.test(name)) {
          return useCircus;
        } else if (/\/module-map.json/.test(name)) {
          return !useCircus;
        } else {
          return true;
        }
      });
    });
    afterEach(function() {
      useCircus = false;
    });

    describe('#routes', function() {
      it('should load routes', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'}
        ]);

        expect(resourceLoader.routes()).to.eql(['/foo', '/foo/{path*}']);
        expect(resourceLoader.routes()).to.eql(['/foo', '/foo/{path*}']);
      });
      it('should remove duplicates', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.routes()).to.eql(['/foo', '/foo/{path*}', '/home']);
      });
      it('should not expose module-map', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.assetContainer('module-map.json')).to.not.exist;
      });
    });
    describe('#routeInfo', function() {
      it('should return proper info for a particular branch', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.routeInfo('bar', '/foo')).to.eql({
          js: ['base.js', 'documents.js'],
          css: ['base@2x.css']
        });
        expect(resourceLoader.routeInfo('bar', '/foo/{path*}')).to.eql({
          js: ['base.js', 'home.js'],
          css: ['base@2x.css', 'home@2x.css'],
          serverRender: true
        });
      });
      it('should return latests info if no branch is supplied', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.routeInfo(undefined, '/foo')).to.eql({
          js: ['base.js', 'documents.js'],
          css: ['base@2x.css']
        });
        expect(resourceLoader.routeInfo(undefined, '/foo/{path*}')).to.eql({
          js: ['base.js', 'home.js'],
          css: ['base@2x.css', 'home@2x.css'],
          serverRender: true
        });
      });
      it('should handle simple module-map', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.routeInfo('foo', '/foo')).to.not.exist;
        expect(resourceLoader.routeInfo('foo', '/home')).to.not.exist;
      });
      it('should handle simple circus declaration', function() {
        useCircus = true;

        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.routeInfo(undefined, '/')).to.eql({
          js: [{href: '1.bundle.js'}],
          css: [{href: '1.bundle.css'}],
          serverRender: true
        });
        expect(resourceLoader.routeInfo(undefined, '/foo/{path*}')).to.eql({
          js: [{href: 'it worked!'}]
        });
        expect(resourceLoader.routeInfo(undefined, '/hai')).to.eql({
          css: [{href: '3.bundle.css'}],
          serverRender: true
        });
      });
    });
    describe('#loadPrefix', function() {
      it('should return load prefix', function() {
        resourceLoader.register('appName!', [
          {name: 'foo', version: '1.0.0', path: 'baz'},
          {name: 'bar', version: '2.0.0', path: 'bat'}
        ]);

        expect(resourceLoader.loadPrefix()).to.equal('prefix!');
        expect(resourceLoader.loadPrefix('bar')).to.equal('prefix!');
        expect(resourceLoader.loadPrefix('foo')).to.not.exist;
      });
    });
  });
  describe('#asset', function() {
    beforeEach(function() {
      resourceLoader.register('appName!', [
        {name: 'foo', version: '1.0.0', path: 'baz'},
        {name: 'bar', version: '2.0.0', path: 'bat'}
      ]);
    });

    it('should return newest path', function() {
      expect(resourceLoader.asset('foo')).to.match(/bat\/foo$/);
      expect(resourceLoader.asset('bar')).to.match(/bat\/bar$/);
      expect(resourceLoader.asset('bat/foo')).to.match(/baz\/bat\/foo$/);
      expect(resourceLoader.asset('bat/bar')).to.match(/baz\/bat\/bar$/);
    });
    it('should handle double slash', function() {
      expect(resourceLoader.asset('bat//foo')).to.match(/baz\/bat\/foo$/);
      expect(resourceLoader.asset('bat//bar')).to.match(/baz\/bat\/bar$/);
    });
    it('should handle undefined input', function() {
      expect(resourceLoader.asset()).to.not.exist;
    });
    it('should return missing', function() {
      expect(resourceLoader.asset('notBar')).to.not.exist;
    });
    it('should not return module-map', function() {
      expect(resourceLoader.asset('module-map.json')).to.not.exist;
    });
    it('should cache file list', function() {
      expect(fs.readdirSync).to.not.have.been.called;

      expect(resourceLoader.asset('foo')).to.match(/bat\/foo$/);
      expect(fs.readdirSync.callCount).to.equal(14);

      expect(resourceLoader.asset('foo')).to.match(/bat\/foo$/);
      expect(fs.readdirSync.callCount).to.equal(14);
    });
  });
  describe('#assetContainer', function() {
    beforeEach(function() {
      resourceLoader.register('appName!', [
        {name: 'foo', version: '1.0.0', path: 'baz'},
        {name: 'bar', version: '2.0.0', path: 'bat'}
      ]);
    });

    it('should return newest container', function() {
      expect(resourceLoader.assetContainer('foo')).to.match(/bat$/);
      expect(resourceLoader.assetContainer('bar')).to.match(/bat$/);
      expect(resourceLoader.assetContainer('bat/foo')).to.match(/baz$/);
      expect(resourceLoader.assetContainer('bat/bar')).to.match(/baz$/);
    });
    it('should handle double slash', function() {
      expect(resourceLoader.assetContainer('bat//foo')).to.match(/baz$/);
      expect(resourceLoader.assetContainer('bat//bar')).to.match(/baz$/);
    });
    it('should handle undefined input', function() {
      expect(resourceLoader.assetContainer()).to.not.exist;
      expect(resourceLoader.assetContainer(null)).to.not.exist;
    });
    it('should return missing', function() {
      expect(resourceLoader.assetContainer('notBar')).to.not.exist;
    });
  });
  describe('#index', function() {
    beforeEach(function() {
      resourceLoader.register('appName!', [
        {name: 'foo', version: '1.0.0', path: 'baz'},
        {name: 'bar', version: '2.0.0', path: 'bat'}
      ]);
    });

    it('should throw without an app', function() {
      expect(function() {
        resourceLoader.index();
      }).to.throw('Must specify app name');
    });
    it('should return known branches', function() {
      resourceLoader.reset();
      resourceLoader.register('appName!', [
        {name: 'foo-bar', version: '1.0.0', path: 'baz'},
        {name: 'bar-baz', version: '2.0.0', path: 'bat'}
      ]);
      expect(resourceLoader.index('appName!', 'foo-bar')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('appName!', 'bar-baz')).to.match(/bat\/index.html$/);
      expect(resourceLoader.index('appName!')).to.match(/bat\/index.html$/);

      resourceLoader.reset();
      resourceLoader.register('appName!', [
        {name: 'bar-baz', version: '2.0.0', path: 'bat'},
        {name: 'foo-bar', version: '1.0.0', path: 'baz'}
      ]);
      expect(resourceLoader.index('appName!', 'foo-bar')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('appName!', 'bar-baz')).to.match(/bat\/index.html$/);
      expect(resourceLoader.index('appName!')).to.match(/bat\/index.html$/);
    });
    it('should handle multiple apps', function() {
      resourceLoader.reset();
      resourceLoader.register('appName!', [
        {name: 'foo-bar', version: '1.0.0', path: 'baz'},
        {name: 'bar-baz', version: '2.0.0', path: 'bat'}
      ]);
      // Exec here to verify that addition is working
      expect(resourceLoader.index('appName!', 'foo-bar')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('appName!', 'bar-baz')).to.match(/bat\/index.html$/);

      resourceLoader.register('another!', [
        {name: 'bar-baz', version: '2.0.0', path: 'foo/boz'}
      ]);
      expect(resourceLoader.index('appName!', 'foo-bar')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('another!', 'bar-baz')).to.match(/foo\/boz\/index.html$/);
    });
    it('should not require version value', function() {
      resourceLoader.reset();
      resourceLoader.register('appName!', [
        {name: 'foo-bar', path: 'baz'},
        {name: 'bar-baz', path: 'bat'}
      ]);
      expect(resourceLoader.index('appName!', 'foo-bar')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('appName!', 'bar-baz')).to.match(/bat\/index.html$/);
      expect(resourceLoader.index('appName!')).to.match(/baz\/index.html$/);
    });
    it('should throw on duplicate', function() {
      resourceLoader.reset();

      resourceLoader.register('appName!', [
        {name: 'foo-bar', version: '1.0.0', path: 'baz'},
        {name: 'bar-baz', version: '2.0.0', path: 'bat'}
      ]);
      resourceLoader.register('another!', [
        {name: 'foo-bar', version: '1.0.0', path: 'baz'}
      ]);

      expect(function() {
        expect(resourceLoader.index('appName!', 'bar')).to.match(/baz\/index.html$/);
      }).to.throw(/Duplicate resource/);

    });
    it('should handle non-tagged', function() {
      expect(resourceLoader.index('appName!', 'foo')).to.match(/baz\/index.html$/);
      expect(resourceLoader.index('appName!', 'bar')).to.match(/bat\/index.html$/);
    });
    it('should default to the latest', function() {
      expect(resourceLoader.index('appName!')).to.match(/bat\/index.html$/);
      expect(resourceLoader.index('appName!', 'aintFuckingHere')).to.match(/bat\/index.html$/);
    });
  });
});
