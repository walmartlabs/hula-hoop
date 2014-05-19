var api = require('../api'),
    endpoints = require('./index');

exports.page = function(app, options) {
  var clientSide = endpoints.clientSide(app, options),
      serverSide = endpoints.serverSide(app, options);

  return function(req, reply) {
    var config = options.userConfig(req, reply),
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
