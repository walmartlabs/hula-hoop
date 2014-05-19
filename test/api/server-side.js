var serverSide = require('../../lib/api/server-side'),
    FruitLoops = require('fruit-loops'),
    resourceLoader = require('../../lib/api/resource-loader'),
    Url = require('url');

describe('serverSide handler', function() {
  beforeEach(function() {
    this.stub(resourceLoader, 'index', function() {
      return __dirname + '/../artifacts/server-side.html';
    });
    this.stub(resourceLoader, 'asset', function() {
      return __dirname + '/../artifacts/server-side-ids.js.test';
    });
  });

  it('should load proper branch and config', function() {
    var navigate = this.spy();

    this.stub(FruitLoops, 'pool', function() {
      return {
        info: function() {
          return {info: true};
        },
        navigate: navigate
      };
    });

    var app = {};
    var options = {
      cacheResources: true,
      host: 'foo.com',
      userConfig: function(req) {
        return req.pre.config.user;
      }
    };
    serverSide(app, options)({
      url: Url.parse('http://localhost:8080/foo?bar=baz'),
      log: function() {},
      pre: {
        config: {
          user: {
            branch: 'foo'
          }
        }
      }
    });
    expect(resourceLoader.index).to.have.been.calledWith(app, 'foo');

    var args = FruitLoops.pool.firstCall.args[0];
    expect(args.poolSize).to.equal(5);
    expect(args.index).to.equal(__dirname + '/../artifacts/server-side.html');
    expect(args.cacheResources).to.be.true;
    expect(args.host).to.equal('foo.com');

    expect(navigate).to.have.been.calledOnce;
    expect(navigate).to.have.been.calledWith('/foo?bar=baz');
  });

  it('should have proper data input and output', function(done) {
    var handler = serverSide({}, {poolSize: 4, host: 'foo.com'});
    var req = {
      url: Url.parse('http://localhost:8080/foo?bar=baz'),
      pre: {
        config: {
          user: {
            branch: 'foo'
          }
        }
      },
      log: this.spy()
    };

    handler(req, function(err, response) {
      expect(err).to.not.exist;
      expect(response).to.be.a('string');
      expect(resourceLoader.asset.callCount).to.equal(3);
      expect(resourceLoader.asset).to.have.been.calledWith('foo-server.js');
      expect(resourceLoader.asset).to.have.been.calledWith('baz-server.js');
      expect(resourceLoader.asset).to.have.been.calledWith('bat-server.js');
      resourceLoader.asset.reset();
      expect(resourceLoader.asset).to.not.have.been.called;

      expect(response).to.match(/0_idCounter: 0 _reqId: undefined location: http:\/\/foo.com\/foo\?bar=baz/);

      setTimeout(function() {
        req.log.calledWith(['server-side', 'pool'], {queued: 0, pages: 1, free: 0});

        req.url.path = '/bar';
        handler(req, function(err, response) {
          expect(err).to.not.exist;
          expect(response).to.be.a('string');
          expect(resourceLoader.asset).to.not.have.been.called;

          expect(response).to.match(/0_idCounter: 0 _reqId: \d\d\d location: http:\/\/foo.com\/bar/);
          done();
        });
      }, 15);
    });
  });

  it('should handle asset lookup errors', function(done) {
    resourceLoader.asset.restore();
    this.stub(resourceLoader, 'asset', function() {});

    var handler = serverSide({}, {poolSize: 5, host: 'foo.com'});
    var req = {
      url: Url.parse('http://localhost:8080/foo?bar=baz'),
      pre: {
        config: {
          user: {
            branch: 'foo'
          }
        }
      },
      log: this.spy()
    };

    handler(req, function(err, response) {
      expect(err).to.match(/Unable to lookup url: foo.js/);
      expect(response).to.not.exist;
      done();
    });
  });

  it('should handle server script files', function(done) {
    resourceLoader.index.restore();
    this.stub(resourceLoader, 'index', function() {
      return __dirname + '/../artifacts/server-script.html';
    });

    var handler = serverSide({}, {poolSize: 5, host: 'foo.com', resourceRoot: '/baz/bat/'});
    var req = {
      url: Url.parse('http://localhost:8080/foo?bar=baz'),
      pre: {
        config: {
          user: {
            branch: 'foo'
          }
        }
      },
      log: this.spy()
    };

    handler(req, function(err, response) {
      expect(err).to.not.exist;
      expect(response).to.match(/_idCounter: 0 _reqId: undefined location: http:\/\/foo.com\/foo\?bar=baz/);
      done();
    });
  });

  it('should call cleanup after emit', function(done) {
    var complete;

    var options = {
      poolSize: 5,
      host: 'foo.com',
      cleanup: function(page) {
        expect(resourceLoader.asset).to.have.been.calledWith('foo-server.js');

        expect(complete).to.be.true;
        done();
      }
    };

    var handler = serverSide({}, options);
    var req = {
      url: Url.parse('http://localhost:8080/foo?bar=baz'),
      pre: {
        config: {
          user: {
            branch: 'foo'
          }
        }
      },
      log: this.spy()
    };

    handler(req, function(err, response) {
      complete = true;
    });
  });
});
