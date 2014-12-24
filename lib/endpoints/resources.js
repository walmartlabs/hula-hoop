var api = require('../api'),
    Boom = require('boom');

exports.index = function() {
  return function(req, reply) {
    var path = api.resourceLoader.asset(req.params.platform + '/index.html');
    if (!path) {
      reply(Boom.notFound());
    } else {
      reply.file(path);
    }
  };
};
exports.resources = function() {
  return {
    directory: {
      lookupCompressed: true,
      path: function(req) {
        var ret = api.resourceLoader.assetContainer(req.params.path);

        // Force a failure on not found as passing empty string to hapi will evaluate against
        // the root
        if (!ret) {
          return Boom.notFound();
        }

        return ret;
      }
    }
  };
};
