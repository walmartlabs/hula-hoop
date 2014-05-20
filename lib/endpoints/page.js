var _ = require('underscore'),
    api = require('../api'),
    endpoints = require('./index');

exports.page = function(app, options) {
  var clientOptions, serverOptions;

  // If the user provided a finalize method, wrap this so we can provide the source data
  if (options.finalize) {
    clientOptions = _.defaults({
      finalize: function(req, response) {
        options.finalize(req, response, false);
      }
    }, options);

    serverOptions = _.defaults({
      finalize: function(req, response) {
        options.finalize(req, response, true);
      }
    }, options);
  }

  var clientSide = endpoints.clientSide(app, clientOptions || options),
      serverSide = endpoints.serverSide(app, serverOptions || options);

  return function(req, reply) {
    var config = (options.userConfig && options.userConfig(req, reply)) || {},
        branch = config.branch,
        routeInfo = api.resourceLoader.routeInfo(branch, req.route.path),
        routeAB = config.serverRoute && config.serverRoute[req.route.path];

    if ((routeInfo && routeInfo.serverRender) && (routeAB !== false)) {
      serverSide(req, function(err, data) {
        if (err) {
          clientSide(req, reply);
        } else {
          return reply(undefined, data);
        }
      });
    } else {
      clientSide(req, reply);
    }
  };
};
