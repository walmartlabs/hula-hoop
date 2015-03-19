var _ = require('underscore'),
    resourceLoader = require('./resource-loader'),
    fs = require('fs');

var cache = {};

exports = module.exports = {
  loadHtml: function(app, branch, callback) {
    branch = branch || '$default';

    if (cache[branch]) {
      setImmediate(function() {
        callback(undefined, cache[branch]);
      });
      return;
    }

    var indexFile = resourceLoader.index(app, branch);
    if (!indexFile) {
      throw new Error('Unknown index file for app "' + app + '" on branch "' + branch + '"');
    }

    fs.readFile(indexFile, function(err, data) {
      if (err) {
        return callback(err);
      }

      data = data.toString();

      var omit = false;
      var directives = data.split(/<!-- (hula-hoop: .*?) -->/).map(function(directive) {
          if (/^hula-hoop:\s*(.*)$/.test(directive)) {
            if ('end ' + omit === RegExp.$1) {
              omit = false;
              return;
            } else if (omit) {
              callback(new Error('Nested embed found: ' + directive));
              callback = undefined;
            }

            var embed = RegExp.$1;
            if (/begin\s+(.*)$/.test(embed)) {
              omit = embed = RegExp.$1;
            }
            return {embed: embed};
          } else if (directive && !omit) {
            return {text: directive};
          }
        });
      directives = _.compact(directives);

      // Insert the config embed if we do not have an explicit one
      if (!_.find(directives, function(directive) { return directive.embed === 'config'; })) {
        var insertConfig = _.findIndex(directives, function(directive) {
          return directive.embed === 'scripts'
              || (directive.text && directive.text.indexOf('<script') >= 0);
        });

        var insertBefore = directives[insertConfig];
        if (!insertBefore) {
          directives.push({embed: 'config'});
        } else if (insertBefore.text) {
          var scriptIndex = insertBefore.text.indexOf('<script');

          directives.splice(insertConfig, 1,
              {text: insertBefore.text.substring(0, scriptIndex)},
              {embed: 'config'},
              {text: insertBefore.text.substring(scriptIndex)});
        } else {
          directives.splice(insertConfig, 0, {embed: 'config'});
        }
      }

      cache[branch] = directives;

      callback && callback(undefined, cache[branch]);
    });
  },

  embeds: function(configVar, config, routeInfo) {
    routeInfo = routeInfo || {};
    config = config || '';

    if (config && !configVar) {
      throw new Error('Config var not specified');
    }

    var ret = {
      script: (routeInfo.js || []).map(function(script) {
        return '<script type="text/javascript" src="' + script.href + '"'
            + (script.attr ? ' ' + script.attr : '') + '></script>\n';
      }).join(''),
      link: (routeInfo.css || []).map(function(link) {
        return '<link rel="stylesheet" href="' + link.href + '"'
            + (link.attr ? ' ' + link.attr : '') + '>\n';
      }).join('')
    };

    if (config) {
      ret.config = '<script type="text/javascript">'
          + configVar
          + ' = '
          + JSON.stringify(config)
          + ';</script>\n';
    }

    return ret;
  },

  inline: function(app, configVar, config, routeInfo, callback) {
    var embeds = exports.embeds(configVar, config, routeInfo);

    exports.loadHtml(app, config && config.branch, function(err, data) {
      if (err) {
        return callback(err);
      }

      data = data.map(function(data) {
        return embeds[data.embed] || data.text || '';
      }).join('');

      callback(undefined, data);
    });
  },

  reset: function() {
    cache = {};
  }
};
