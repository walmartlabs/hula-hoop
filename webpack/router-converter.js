var _ = require('underscore'),
    remapRoute = require('../lib/remap-route');

module.exports = exports = function() {};

exports.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('circus-json', function(json) {

      var prefix;
      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            if (dependency.Class && dependency.Class.name === 'RequireRouterListing'
                && dependency.data && dependency.data.type === 'ObjectExpression') {

              var root = _.find(dependency.data.properties, function(prop) {
                return prop.key.name === 'root';
              });
              if (root) {
                prefix = root.value.value;
              }
            }
          });
        });
      });

      if (json.routes) {
        if (!json.chunkDependencies) {
          throw new Error('Must be run in conjunction with the chunk dependencies plugin');
        }

        var componentName = compilation.options.output.component;
        var remapped = {
          routes: {},
          modules: {}
        };

        // Record the route to chunk mapping
        _.each(json.routes, function(moduleId, route) {
          remapped.routes[remapRoute(route, prefix)] = componentName + '_' + json.modules[moduleId].chunk;
        });

        _.each(json.chunks, function(chunk, id) {
          var dependencies = json.chunkDependencies[componentName + '_' + id];

          remapped.modules[componentName + '_' + id] = {
            js: _.map(dependencies.js, function(dependency) {
              return {href: dependency.href, attr: 'data-circus-jsid="' + dependency.id + '"'};
            }),
            css: _.map(dependencies.css, function(dependency) {
              return {href: dependency.href, attr: 'data-circus-cssid="' + dependency.id + '"'};
            }),

            serverRender: !!json.serverRender
          };
        });

        json.hulahoop = remapped;
      }
    });
  });
};
