var api = require('../api');

exports.clientSide = function(app, options) {
  return function(req, reply) {
    // Sync here. If async behaviors are needed then hapi methods are recommended
    // to calculate the config prior to handler execution.
    var config = options.userConfig && options.userConfig(req);

    api.clientSide.inline(app, options.configVar, config, function(err, data) {
      if (err) {
        reply(err);
      } else {
        var response = reply(undefined, options.heartbeat ? 'ok' : data);
        options.finalize && options.finalize(req, response);
      }
    });
  };
};
