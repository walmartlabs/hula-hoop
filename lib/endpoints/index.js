var _ = require('underscore'),
    api = require('../api'),
    Hapi = require('hapi');

exports.index = function() {
  return {
    handler: function(req, reply) {
      var path = api.resourceLoader.asset(req.params.platform + '/index.html');
      if (!path) {
        reply(Hapi.error.notFound());
      } else {
        reply.file(path);
      }
    },
    cache: {
      expiresIn: 60*60*1000
    }
  };
};
exports.resources = function() {
  return {
    handler: {
      directory: {
        lookupCompressed: true,
        path: function(req) {
          var ret = api.resourceLoader.assetContainer(req.params.path);

          // Force a failure on not found as passing empty string to hapi will evaluate against
          // the root
          if (!ret) {
            // Throwing the Hapi.error.notFound instance is not triggering the proper 404 that we need
            // in production (although it does work locally. Use a path that is unlikely to conflict
            // With actual files
            // See: https://github.com/spumko/hapi/issues/1574
            return 'quijibo?!??//??////?\\/quijibo';
          }

          return ret;
        }
      }
    },
    cache: {
      expiresIn: 365*24*60*60*1000
    }
  };
};
