var endpoint = require('../../lib/endpoints'),
    Hapi = require('hapi'),
    resourceLoader = require('../../lib/api/resource-loader');

describe('endpoints - resources', function() {
  var server;

  beforeEach(function(done) {
    server = new Hapi.Server(0, {
      labels: ['api']
    });

    server.start(done);
  });

  describe('#resources', function() {
    describe('#path', function() {
      it('should return the directory path', function(done) {
        this.stub(resourceLoader, 'assetContainer', function(path) {
          return path.replace(/\/\//g, '/');
        });
        var req = { params: { path: '//directory' } };
        expect(endpoint.resources().directory.path(req)).to.equal('/directory');
        done();
      });

      it('should return gibberish when no path is found', function(done) {
        this.stub(resourceLoader, 'assetContainer', function(path) {
          return '';
        });
        var req = { params: { path: '/directory' } };
        expect(endpoint.resources().directory.path(req)).to.eql(Hapi.error.notFound());
        done();
      });
    });
  });

  describe('#index', function() {
    it('should return the requested path', function(done) {
      this.stub(resourceLoader, 'assetContainer', function(path) {
        return 'test/artifacts';
      });
      server.route({ path: '/r/phoenix/{platform}/index.html', method: 'GET', handler: endpoint.index() });
      server.inject('/r/phoenix/mweb/index.html', function(res) {
        expect(res.statusCode).to.equal(200);
        expect(res.payload).to.match(/<div id="mweb"><\/div>/);
        done();
      });
    });

    it('should handle unknown paths', function(done) {
      this.stub(resourceLoader, 'assetContainer', function(path) {
        return '';
      });
      server.route({ path: '/r/phoenix/{platform}/index.html', method: 'GET', handler: endpoint.index() });
      server.inject('/r/phoenix/mweb/index.html', function(res) {
        expect(res.statusCode).to.equal(404);
        done();
      });
    });
  });
});
