var endpoint = require('../../lib/endpoints'),
    Hapi = require('hapi'),
    resourceLoader = require('../../lib/api/resource-loader'),
    path = require('path');

describe('endpoints', function() {
  var server,
      options,
      appConfig,
      caching;

  beforeEach(function(done) {
    caching = this.spy(function(request, reply) {
      reply({'winning': true});
    });
    server = new Hapi.Server(0, {
      labels: ['api']
    });

    server.start(done);
  });

});
