/**
 * WARN: These methods cache the projects list so should only be called
 *    after all projects have been loaded.
 */

var _ = require('underscore'),
    fs = require('fs'),
    semver = require('semver'),
    path = require('path');

// Maintains a list of all registered resources, by app
var resources = {},

    // Module map information by branch
    moduleMap,

    // List of routes implemented by client-side implementations
    clientRoutes,

    // Maps external urls to the associated resource directory
    pathCache,

    // Stores a list of index file paths for each branch and app
    indexCache,

    // The branch with the highest priority version/name
    highestBranch;

exports.register = function(app, appResources) {
  if (!appResources || !appResources.length) {
    throw new Error('No resources defined');
  }

  resources[app] = appResources;

  if (pathCache) {
    generateAppCache(appResources, app);
  }
};

exports.routes = function() {
  if (!pathCache) {
    generateCache();
  }

  return clientRoutes;
};
exports.loadPrefix = function(branch) {
  if (!moduleMap) {
    generateCache();
  }

  var map = moduleMap[branch || highestBranch];
  return map && map.loadPrefix;
};
exports.routeInfo = function(branch, route) {
  if (!moduleMap) {
    generateCache();
  }

  var map = moduleMap[branch || highestBranch] || {routes: {}, modules: {}},
      moduleName = map.routes[route];
  return map.modules[moduleName];
};

exports.info = function() {
  if (!pathCache) {
    generateCache();
  }

  var versions = {};
  _.each(pathCache, function(resourceDirectory, name) {
    if (/VERSION$/.test(name)) {
      if (!versions[resourceDirectory]) {
        versions[resourceDirectory] = fs.readFileSync(path.join(resourceDirectory, name));
      }
    }
  });
  return _.map(resources, function(app, name) {
    return {
      name: name,
      versions: _.map(app, function(version) {
        var fullPath = path.resolve(version.path);
        return {
          name: version.name,
          info: versions[fullPath] || version.version
        };
      })
    };
  });
};

exports.asset = function(path) {
  if (!path) {
    return;
  }

  path = path.replace(/\/\//g, '/');

  var container = exports.assetContainer(path);
  if (container) {
    return container + '/' + path;
  }
};
exports.assetContainer = function(path) {
  if (!path) {
    return;
  }

  if (!pathCache) {
    generateCache();
  }
  path = path.replace(/\/\//g, '/');
  return pathCache[path];
};
exports.index = function(app, branch) {
  if (!app) {
    throw new Error('Must specify app name');
  }

  if (!indexCache) {
    generateCache();
  }
  return indexCache[app][branch] || exports.asset('index.html');
};
exports.reset = function() {
  pathCache = undefined;
  indexCache = undefined;
  resources = {};
  moduleMap = undefined;
};

function generateCache() {
  pathCache = {};
  indexCache = {};
  clientRoutes = [];
  moduleMap = {};

  _.each(resources, generateAppCache);
}

function generateAppCache(resources, app) {
  var appResources = {};

  resources = resources.sort(function(a, b) {
    var verA = a.version || '0.0.0',
        verB = b.version || '0.0.0';
    if (semver.gt(verA, verB)) {
      return -1;
    } else if (semver.lt(verA, verB)) {
      return 1;
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  highestBranch = resources[0].name;

  indexCache[app] = {};
  resources.forEach(function(instance) {
    var absolutePath = path.resolve(instance.path),
        instanceName = instance.name;

    filelist(absolutePath).forEach(function(file) {
      var path = file.substring(absolutePath.length + 1);
      if (path === 'module-map.json') {
        return;
      }

      if (!pathCache[path]) {
        pathCache[path] = absolutePath;
        appResources[path] = absolutePath;
      } else if (!appResources[path] && path !== 'index.html') {
        throw new Error('Duplicate resource "' + path + '" found in "' + app + '"  Conflict: "' + pathCache[path] + '"' + absolutePath);
      }
      if (path === 'index.html') {
        indexCache[app][instanceName] = file;
      }
    });

    if (fs.existsSync(absolutePath + '/module-map.json')) {
      var map = JSON.parse(fs.readFileSync(absolutePath + '/module-map.json').toString());

      if (map.routes) {
        moduleMap[instanceName] = map;
      }

      clientRoutes = clientRoutes.concat(map.routes ? _.keys(map.routes) : map);
    }
  });

  clientRoutes = _.uniq(clientRoutes).sort();
}

function filelist(path) {
  function readdir(path) {
    try {
      return fs.readdirSync(path).map(function(child) { return path + '/' + child; });
    } catch (err) {
      if (err.code === 'ENOTDIR') {
        return;
      } else {
        throw err;
      }
    }
  }
  var list = [path];
  for (var i = 0; i < list.length; i++) {
    var item = list[i],
        children = readdir(item);
    if (children) {
      list[i] = undefined;
      list.push.apply(list, children);
    }
  }
  return list.filter(function(item) { return item; });
}
