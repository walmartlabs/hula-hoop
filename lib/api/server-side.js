var FruitLoops = require('fruit-loops'),
    path = require('path'),
    resourceLoader = require('./resource-loader');

module.exports = function(app, options) {
  var pools = {};

  return function(req, reply) {
    var userConfig = (options.userConfig && options.userConfig(req, reply)) || {},
        branchName = userConfig.branch,
        pool = pools[branchName];
    if (!pool) {
      // Warn: This value will be reused across multiple requests. The sources should be consistent
      // in their output but their is a chance that they are not and different pool instances could
      // see different output behaviors.
      pool = pools[branchName] = createPool(app, branchName, options);
    }

    pool.navigate(req.url.path, reply);
    req.log(['server-side', 'pool'], pool.info());
  };
};

function createPool(app, branch, options) {
  var indexPath = resourceLoader.index(app, branch);

  return FruitLoops.pool({
    poolSize: options.poolSize || 5,
    index: indexPath,

    ajaxCache: options.ajaxCache,
    cacheResources: options.cacheResources,

    host: options.host,

    beforeExec: options.beforeExec,
    navigated: function(page, existingPage) {
      // Default to emitting after all pending events occur
      page.emit('events');

      // Reset the unique id counter on each request. When combined with the _reqId
      // this should provide a per-request unique value
      page.window._idCounter = 0;

      if (existingPage) {
        // Create a random 3 digit number to help ensure uniqueness from _.uniqueId
        // across different sessions.
        var pad = '000',
            id = ((Math.random() * 1000) | 0);
        id = (pad+id).slice(-pad.length);

        page.window._reqId = id;

        // We need to reset the location value as backbone caches it
        page.window.Backbone.history.location = page.window.location;
        page.exec(function() {
          page.window.Backbone.history.loadUrl();
        });
      }
    },
    cleanup: options.cleanup && function(page, next) {
      // Defer cleanup until after the emit has a chance to run
      setTimeout(function() {
        // Not exec here as this is a critical path that will blow up if we fail
        options.cleanup(page, next);
      }, 10);
    },
    resolver: function(href, window) {
      var original = href,
          candidate;

      // Remap the external URL space to the local file system
      if (options.resourceRoot) {
        href = path.relative(options.resourceRoot, href);
      }

      // Add -server suffix to all javascript source files if such a file exists
      if (!/-server/.test(href)) {
        href = resourceLoader.asset(href.replace(/\.js$/, '-server.js'))
            || resourceLoader.asset(href);
      } else {
        href = resourceLoader.asset(href);
      }

      if (!href) {
        throw new Error('Unable to lookup url: ' + original);
      }
      return href;
    }
  });
}
