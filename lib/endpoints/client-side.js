var api = require('../api');

exports.clientSide = function(app, options) {
  return function(req, reply) {
    // Sync here. If async behaviors are needed then hapi methods are recommended
    // to calculate the config prior to handler execution.
    var config = options.userConfig && options.userConfig(req);

    var routeInfo = api.resourceLoader.routeInfo(config && config.branch, req.route.path);
    api.clientSide.inline(app, options.configVar, config, routeInfo, options, function(err, data) {
      if (err) {
        reply(err);
      } else {
        var response = reply(undefined, options.heartbeat ? 'ok' : data);
        if (options.finalize) {
          options.finalize(req, response);
        }
      }
    });
  };
};
