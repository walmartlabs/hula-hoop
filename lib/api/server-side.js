var FruitLoops = require('fruit-loops'),
    path = require('path'),
    resourceLoader = require('./resource-loader');

module.exports = function(app, options) {
  var pools = {};

  return function(req, reply) {
    var publicConfig = (options.publicConfig && options.publicConfig(req, reply)) || {},
        branchName = publicConfig.branch,
        pool = pools[branchName];
    if (!pool) {
      // Warn: This value will be reused across multiple requests. The sources should be consistent
      // in their output but their is a chance that they are not and different pool instances could
      // see different output behaviors.
      pool = pools[branchName] = createPool(app, branchName, options);
    }

    // Using pre for metadata here as it retains less data than the request object and
    // can be populated with any abitrary content from the user.
    pool.navigate(req.url.path, req.pre, reply);

    req.log(['server-side', 'pool'], pool.info());
  };
};

function createPool(app, branch, options) {
  var indexPath = resourceLoader.index(app, branch);

  return FruitLoops.pool({
    index: indexPath,

    poolSize: options.poolSize || 5,
    maxQueue: options.maxQueue,
    queueTimeout: options.queueTimeout,

    ajax: options.ajax,

    cacheResources: options.cacheResources,

    host: options.host,

    beforeExec: options.beforeExec,
    navigated: function(page, existingPage) {
      page.pending.push('beforeNavigate', 1);
      var beforeNavigate = options.beforeNavigate || function(page, existingPage, next) {next();};
      beforeNavigate(page, existingPage, function() {
        page.pending.pop('beforeNavigate', 1);
        // Default to emitting after all pending events occur
        page.emit('events');

        // Create a random 3 digit number to help ensure uniqueness from _.uniqueId
        // across different sessions.
        var pad = '000',
            id = ((Math.random() * 1000) | 0);
        id = (pad+id).slice(-pad.length);

        // Reset the unique id counter on each request. When combined with the _reqId
        // this should provide a per-request unique value
        if (page.window._resetIdCounter) {
          page.window._resetIdCounter(id);
        } else {
          // Deprecated: Support legacy values for a bit longer.
          page.window._idCounter = 0;
          page.window._reqId = id;
        }

        if (existingPage) {
          // We need to reset the location value as backbone caches it
          page.exec(function() {
            page.window.Backbone.history.loadUrl();
          });
        }
      });
    },
    cleanup: options.cleanup && function(page, next) {
      // Defer cleanup until after the emit has a chance to run
      setTimeout(function() {
        page.exec(function() {
          options.cleanup(page, next);
        });
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
