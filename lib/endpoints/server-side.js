var api = require('../api');

exports.serverSide = function(app, options) {
  var serverSide = api.serverSide(app, options);

  return function(req, reply) {
    var maxServerExpires = ('maxServerExpires' in options) ? options.maxServerExpires : 24*60*60;

    serverSide(req, function(err, data, metadata) {
      if (err) {
        req.log(['server-side', 'error'], 'Failed to load server-side:' + err.stack);

        // Rewrap to ensure hapi compliance with the upstream errors
        var toThrow = new Error(err.message);
        toThrow.stack = err.stack;
        reply(toThrow);
      } else {
        req.log(['server-side', 'exec'], {redirect: data.redirect, pageId: metadata.pageId, pageCount: metadata.pageCount});

        var response,
            cache = 'no-cache',
            privacy;

        if (data.redirect) {
          response = reply().redirect(data.redirect);
        } else {
          response = reply(undefined, data);
        }

        // Calculate caching headersc
        if (!metadata.cache['no-cache']) {
          // After upgrading to hapi 2.0 or higher we will want to convert this to custom
          // cache-control header generation, handling the private, no-cache, and max-age cases.
          // We can't do this under 1.0 as there is no conditional and the header will always be
          // set to ttl + the config data below.
          var ttl = metadata.cache.expires - Date.now();
          ttl = Math.min(Math.max(ttl, 0), maxServerExpires*1000);

          if (ttl > 0) {
            privacy = metadata.cache.private ? ', private' : '';
            cache = 'max-age=' + Math.floor(ttl / 1000) + ', must-revalidate' + privacy;
          }
        }

        response.header('cache-control', cache);

        if (options.finalize) {
          options.finalize(req, response);
        }
      }
    });
  };
};
