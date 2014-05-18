var api = require('../../lib/api'),
    endpoint = require('../../lib/endpoints'),
    Hapi = require('hapi'),
    resourceLoader = require('../../lib/api/resource-loader');

describe('endpoints#clientSide', function() {
  var server,
      options;

  beforeEach(function(done) {
    options = {branch: 'foo'};
    server = new Hapi.Server(0, {
      labels: ['api']
    });

    server.start(done);

    this.stub(resourceLoader, 'index', function() { return 'index.js'; });
    server.route({path: '/', method: 'GET', config: {
      handler: endpoint.clientSide('app', {
        configVar: 'foo',
        userConfig: function(req) {
          return options;
        },
        finalize: function(req, response) {
          response.header('edge-control', 'bypass-cache');
        }
      })
    } });
    server.route({path: '/heartbeat', method: 'GET', config: {
      handler: endpoint.clientSide('app', {heartbeat: true})
    } });
  });

  it('should render client content', function(done) {
    server.inject({
      method: 'get',
      url: '/',
      payload: ''
    }, function(res) {
      expect(res.payload).to.match(/"branch":"foo/);
      expect(res.headers['edge-control']).to.equal('bypass-cache');
      done();
    });
  });
  it('should return ok for heartbeat', function(done) {
    server.inject({
      method: 'get',
      url: '/heartbeat',
      payload: ''
    }, function(res) {
      expect(res.payload).to.equal('ok');
      done();
    });
  });
  it('should handle inline errors', function(done) {
    this.stub(api.clientSide, 'inline', function(app, configVar, config, callback) {
      return callback(new Error('bang'));
    });

    server.inject({
      method: 'get',
      url: '/',
      payload: ''
    }, function(res) {
      expect(res.statusCode).to.equal(500);
      expect(res.payload).to.match(/An internal server error occurred/);  // Nothing to recover from
      done();
    });
  });
});
