var endpoint = require('../../lib/endpoints'),
    Hapi = require('hapi'),
    resourceLoader = require('../../lib/api/resource-loader'),
    path = require('path');

describe('endpoints#page', function() {
  var server,
      pageOptions,
      options;

  beforeEach(function(done) {
    server = new Hapi.Server(0, {
      labels: ['api']
    });

    server.start(done);

    options = {branch: 'foo'};
    pageOptions = {
      cacheResources: true,
      poolSize: 5,
      host: 'localhost:' + server.info.port,
      configVar: 'phoenixShared',
      userConfig: function(req) {
        return options;
      }
    };

    this.stub(resourceLoader, 'routeInfo', function(branch, route) {
      expect(branch).to.equal('foo');
      expect(route).to.equal('/foo/{path*}');
      return {
        serverRender: true,
        js: ['1234/base.js', '1234/foo.js', '1234/bar.js'],
        css: ['1234/base@2x.css', '1234/foo@2x.css']
      };
    });
    this.stub(resourceLoader, 'index', function() {
      return __dirname + '/../artifacts/server-side.html';
    });
  });

  it('should run finalize', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    var finalized;
    pageOptions.finalize = function(req, response, isServer) {
      expect(isServer).to.be.true;
      finalized = true;
    };

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(finalized).to.be.true;
      expect(res.payload).to.match(/\$serverCache/);
      expect(res.payload).to.match(/<div id="output">(\nit ran){3}/);

      done();
    });
  });

  it('should route to server side without config', function(done) {
    resourceLoader.routeInfo.restore();
    this.stub(resourceLoader, 'routeInfo', function(branch, route) {
      expect(branch).to.not.exist;
      expect(route).to.equal('/foo/{path*}');
      return {
        serverRender: true,
        js: ['1234/base.js', '1234/foo.js', '1234/bar.js'],
        css: ['1234/base@2x.css', '1234/foo@2x.css']
      };
    });
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    delete pageOptions.userConfig;

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
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

  it('should route to server side with serverRoute config', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    options = {
      serverRoute: {
        '/foo/{path*}': true
      },
      branch: 'foo'
    };
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/\$serverCache/);

      done();
    });
  });
  it('should route to index with serverRoute config disabled', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    var finalized;
    pageOptions.finalize = function(req, response, isServer) {
      expect(isServer).to.be.false;
      finalized = true;
    };

    options = {
      serverRoute: {
        '/foo/{path*}': false
      },
      branch: 'foo'
    };
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(finalized).to.be.true;
      expect(res.payload).to.not.match(/\$serverCache/);

      done();
    });
  });
  it('should route to index with serverRoute all disabled', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side.js.test';
    });

    options = {
      serverRoute: false,
      branch: 'foo'
    };
    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.not.match(/\$serverCache/);

      done();
    });
  });
  it('should log and output the default index file on server side', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-error.js.test';
    });

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
    server.inject({
      method: 'get',
      url: '/foo/bar/bat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.not.match(/\$serverCache/);
      expect(res.payload).to.not.match(/<div id="output">(\nit ran){3}/);
      expect(res.payload).to.match(/module.exports = require\(/);

      done();
    });
  });

  it('should log and output the default index file on server side on navigate error', function(done) {
    this.stub(resourceLoader, 'asset', function(path) {
      return __dirname + '/../artifacts/server-side-loadUrl-error.js.test';
    });

    server.route({path: '/foo/{path*}', method: 'GET', config: {handler: endpoint.page('app', pageOptions)} });
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
          expect(res.payload).to.match(/module.exports = require\(/);

          setTimeout(done, 15);
        });
      }, 15);
    });
  });
});
