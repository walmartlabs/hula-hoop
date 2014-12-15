var _ = require('underscore'),
    remapRoute = require('../lib/remap-route');

module.exports = exports = function ServerRenderFlagPlugin() {
};

exports.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('circus-json', function(json) {
      if (json.routes) {
        var remapped = {
          routes: {},
          modules: {}
        };
        _.each(json.routes, function(moduleId, route) {
          remapped.routes[remapRoute(route)] = json.modules[moduleId].chunk;
        });
        _.each(json.chunks, function(chunk, id) {
          var newChunk = remapped.modules[id] = {};
          if (chunk.js) {
            newChunk.js = [chunk.js];
          }
          if (chunk.css) {
            newChunk.css = [chunk.css];
          }

          newChunk.serverRender = !!json.serverRender;
        });

        json.hulahoop = remapped;
      }
    });
  });
};
