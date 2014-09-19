var endpoint = require('../../lib/endpoints'),
    Hapi = require('hapi'),
    resourceLoader = require('../../lib/api/resource-loader'),
    path = require('path');

describe('endpoints#serverSide', function() {
  var server,
      options,
      caching,
      expired;

  var pageOptions;

  beforeEach(function(done) {
    caching = this.spy(function(request, reply) {
      reply({'winning': true});
    });
    expired = this.spy(function(req, reply) {
      reply({'winning': true})
          .header('cache-control', 'max-age=-50');
    });

    server = new Hapi.Server(0, {
      labels: ['api']
    });
    server.route({
      method: 'GET',
      path: '/caching',
      handler: caching,
      config: {
        cache: {
          expiresIn: 15*60*1000
        }
      }
    });
    server.route({
      method: 'GET',
      path: '/timeout',
      handler: function() {
      }
    });
    server.route({
      method: 'GET',
      path: '/expired',
      handler: expired
    });
    server.route({
      method: 'GET',
      path: '/private',
      handler: caching,
      config: {
        cache: {
          expiresIn: 15*60*1000,
          privacy: 'private'
        }
      }
    });
    server.route({
      method: 'GET',
      path: '/no-cache',
      handler: caching
    });

    server.start(function() {
      options = {branch: 'foo'};
      pageOptions = {
        ajax: {},
        cacheResources: true,
        poolSize: 5,
        host: 'localhost:' + server.info.port
      };

      done();
    });

    this.stub(resourceLoader, 'index', function() {
      return __dirname + '/../artifacts/server-side.html';
    });
  });

  it('should route to server side', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/\$serverCache/);
      expect(res.payload).to.match(/<div id="output">(\nit ran){3}/);

      done();
    });
  });

  it('should trigger cleanup', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-cleanup.js.test';
    });

    pageOptions.cleanup = function(page, next) {
      page.window.Test.trigger('cleanup');
      next();
    };

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.not.match(/cleanup/);

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(res.payload).to.match(/cleanup/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should route to server side with serverRoute config', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    options.local = {
      serverRoute: {
        '/foo/{path*}': true
      },
      branch: 'foo'
    };
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/\$serverCache/);

      done();
    });
  });
  it('should throw on server side error', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-error.js.test';
    });

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.not.match(/\$serverCache/);
      expect(res.payload).to.not.match(/<div id="output">(\nit ran){3}/);
      expect(res.payload).to.match(/An internal server error occurred/);

      done();
    });
  });

  it('should throw on server side queue full error', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    pageOptions.poolSize = 1;
    pageOptions.maxQueue = 1;
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });

    var counter = 0,
        serverCount = 0,
        errorCount = 0,
        logCount = 0;
    server.on('request', function(request, event, tags) {
      if (tags['queue-full']) {
        logCount++;
      }
    });
    function complete(res) {
      try {
        counter++;

        if (/\$serverCache/.test(res.payload)) {
          serverCount++;
        } else if (/An internal server error occurred/.test(res.payload)) {
          errorCount++;
        }

        if (counter >= 3) {
          expect(serverCount).to.equal(2);
          expect(errorCount).to.equal(1);
          expect(logCount).to.equal(1);
          done();
        }
      } catch (err) {
        counter = -1;
        throw err;
      }
    }

    server.inject({method: 'get', url: '/foo/bar/bat', payload: '' }, complete);
    server.inject({method: 'get', url: '/foo/bar/bat', payload: '' }, complete);
    server.inject({method: 'get', url: '/foo/bar/bat', payload: '' }, complete);
  });

  it('should throw on server side queue timeout error', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    pageOptions.poolSize = 1;
    pageOptions.queueTimeout = 1;
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });

    var counter = 0,
        serverCount = 0,
        errorCount = 0,
        logCount = 0;
    server.on('request', function(request, event, tags) {
      if (tags['queue-timeout']) {
        logCount++;
      }
    });
    function complete(res) {
      try {
        counter++;

        if (/\$serverCache/.test(res.payload)) {
          serverCount++;
        } else if (/An internal server error occurred/.test(res.payload)) {
          errorCount++;
        }

        if (counter >= 2) {
          expect(serverCount).to.equal(1);
          expect(errorCount).to.equal(1);
          expect(logCount).to.equal(1);
          done();
        }
      } catch (err) {
        counter = -1;
        throw err;
      }
    }

    server.inject({method: 'get', url: '/foo/bar/bat', payload: '' }, complete);
    server.inject({method: 'get', url: '/foo/bar/bat', payload: '' }, complete);
  });

  it('should throw on server side on navigate error', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-loadUrl-error.js.test';
    });

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/\$serverCache/);
      expect(res.payload).to.not.match(/module.exports = require\(/);

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(res.payload).to.match(/An internal server error occurred/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should cache ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-caching.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(caching.callCount).to.equal(1);
      expect(res.payload).to.match(/<div id="output">(\ndata: true){3}/);

      expect(res.headers['cache-control']).to.match(/max-age=(900|899), must-revalidate/);

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(caching.callCount).to.equal(1);
          expect(res.payload).to.match(/<div id="output">(\ndata: true){4}/);

          expect(res.headers['cache-control']).to.match(/max-age=(900|899), must-revalidate/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should priate cache ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-private-caching.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(caching.callCount).to.equal(1);
      expect(res.payload).to.match(/<div id="output">(\ndata: true){3}/);

      expect(res.headers['cache-control']).to.match(/max-age=(900|899), must-revalidate, private/);

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(caching.callCount).to.equal(2);
          expect(res.payload).to.match(/<div id="output">(\ndata: true){4}/);

          expect(res.headers['cache-control']).to.match(/max-age=(900|899), must-revalidate, private/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should not cache no-cache ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-no-caching.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(caching.callCount).to.equal(1);
      expect(res.payload).to.match(/<div id="output">(\ndata: true){3}/);

      expect(res.headers['cache-control']).to.equal('no-cache');

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(caching.callCount).to.equal(2);
          expect(res.payload).to.match(/<div id="output">(\ndata: true){4}/);

          expect(res.headers['cache-control']).to.equal('no-cache');

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should not cache expired cache ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-expired-caching.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(expired.callCount).to.equal(1);
      expect(res.payload).to.match(/<div id="output">(\ndata: true){3}/);

      expect(res.headers['cache-control']).to.equal('no-cache');

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(expired.callCount).to.equal(2);
          expect(res.payload).to.match(/<div id="output">(\ndata: true){4}/);

          expect(res.headers['cache-control']).to.equal('no-cache');

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should timeout ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-timeout.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});
    pageOptions.ajax.timeout = 100;

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/<div id="output">(\ndata: ETIMEDOUT){3}/);

      expect(res.headers['cache-control']).to.match(/no-cache/);

      setTimeout(function() {
        server.inject({
          method: 'get',
          url: '/foo/bar/bat',
          payload: ''
        }, function(res) {
          expect(res.payload).to.match(/<div id="output">(\ndata: ETIMEDOUT){4}/);

          expect(res.headers['cache-control']).to.match(/no-cache/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });

  it('should redirect properly', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-redirect.js.test';
    });
    pageOptions.ajax.cache = server.cache('fruit-loops', {});

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.statusCode).to.equal(302);
      expect(res.headers.location).to.match(/\/winning/);

      done();
    });
  });

  it('should be max cached without ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.headers['cache-control']).to.equal('max-age=' + (24*60*60) + ', must-revalidate');
      done();
    });
  });

  it('should be max cached without ajax requests', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });
    pageOptions.maxServerExpires = 1*60*60;
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.serverSide('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.headers['cache-control']).to.equal('max-age=' + (1*60*60) + ', must-revalidate');
      done();
    });
  });
});
