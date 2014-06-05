# Hula-Hoop

Server-side rendering components for [Lumbar][] + [Thorax][] + [Hapi][] stacks.

Provides common endpoints and libraries implementing:

- Route-based [Fruit-loops][] server-side rendering
- Automatic fail over to client-side rendering
- Application resource loading and serving
- Conditional branch loading

## Usage

```javascript
var HulaHoop = require('hula-hoop');

// Setup resource handling
HulaHoop.api.resourceLoader.register(appName, [
  {name: 'main', version: '1.0.0', path: './build'}
]);
server.route([
  {
    path: '/r/{path*}',
    method: 'GET',
    handler: HulaHoop.endpoints.resources(),
    config: {
      cache: {
        expiresIn: 365*24*60*60*1000
      }
    }
  }
]);

// Setup the user endpoint routing
var pageHandler = HulaHoop.endpoints.page(appName, {
  host: 'foo.com',
  resourceRoot: '/r/'
});

server.route(
  HulaHoop.api.resourceLoader.routes().map(function(route) {
    return {
      path: route,
      method: 'GET',
      handler: pageHandler,
      config: {
        cache: {
          expiresIn: 5*60*1000,
          privacy: 'private'
        }
      }
    };
  })
);
```

This assumes that `./build` has the contents of the built Thorax application and the `module-map.json` file has been generated via the `hapi-routes` grunt task.

## Server vs. Client Side Rendering

Hula-hoop is able to conditionally return either server rendered HTML content or a simplified page suitable for complete client-side rendering. This optimizes the use of Fruit Loops page instances to the cases that are going to benefit and allows allows for rendering failover, should errors occur in supported server side cases.

This behavior is controlled via the `module-map.json` file and generally should be transparent for most users. It may be AB tested via the `serverRoute` config option, discussed in the `endpoints.page` documentation below.

## Resources and Branches

Hula-hoop maintains a list of all resources that are involved with running a given Thorax application via the `api.resourceLoader` API. Resources registered through this API can easily be served to clients and concurrently used for server-side rendering.

Additionally, it can serve multiple versions of an application on the same endpoint in support of application-level AB testing or staged deploys. This is done by swapping the served index files through the `resourceLoader.index` API.


## API

### endpoints.page(app, options)

Conditionally renders the requests using client-side or server-side rendering based on:
- `serverRoute` flag specified in `module-map.json`
- `userConfig` flag `serverRoute` flag
  - `serverRoute === false` disabled all server-side rendering
  - `serverRoute[hapiPath] === false` disable server-side rendering for a specific route

Should an error occur while rendering the server-side page, the response will failover to the client-side rendering after logging the response.

`options` is the combined list of options for both the `endpoints.serverSide` and `endpoints.clientSide` handlers discussed below.

One distinction is that `finalize` is passed an additional parameter specifying whether or not server side rendering was used to generate the final response. `finalize(req, response, wasServerSide)`

On caching, this endpoint will emit custom cache headers if server-side rendering is utilized, based on the resultant cache calculated from the AJAX requests made during the page's execution cycle. Any cache values defined on the hapi route definition will be utilized for the client-side response only.

### endpoints.serverSide(options)

Renders the given request using the server-side rendering engine. Errors are treated as fatal WRT the response lifecycle.

Options include:

- `host`: Host value used to generate `window.location` and perform relative AJAX calls. Example: `github.com`.
- `resourcesRoot`: Root prefix that is stripped to map client resources to server files. Example: `/resources/scripts`
- `poolSize`: Maximum number of page instances to maintain in the pool. This defaults to `5` and should be tuned for both the memory and traffic load of particular applications while in production.
- `cacheResources`: Boolean flag. True to cache loaded html and script resources indefinitely.
- `userConfig(req)`: Used to generate the configuration for a given request. Used primarily to retrieve the `branch` field to select the rendering branch to utilize.
- `ajaxCache`: Catbox cache used to cache AJAX responses retrieved via page execution.
- `beforeExec(page, next)`: Fruit Loops pool `beforeExec` method. Can be used to initialize pages to known states. Example:

```javascript
    function(page, next) {
      // Provide a default seed value (and also avoid a NPE in lumbar loader due to missing
      // screen object
      page.window.devicePixelRatio = 2;
      page.window.phoenixConfig = siteConfig;
      next();
    }
```

- `cleanup(page, next)`: Fruit loops Pool `cleanup` method. Used to perform cleanup after a response has been sent to the user, but before the page object is returned to the pool. Example:

```javascript
    function(page, next) {
      page.window.Backbone.history.trigger('cleanup');

      next();
    }
```

- `maxServerExpires`: Maximum cache timeout for server side responses, in seconds. Defaults to 24 hours.

Many of theses options map directly to Fruit Loops Pool options, whose [documentation][fruit-loops-pool] contains additional information.

Logging:
- `['server-side', 'pool']`: Navigation started. Includes page instances in existence and free as well as the number of queued requests in the data section.
- `['server-side', 'error']`: Error occurred while executing application logic.
- `['server-side', 'exec']`: Successful server-side rendering execution. Data includes various metadata regarding the response.


### endpoints.clientSide(app, options)

Renders the index for a given `app` in a manner suitable for client side rendering. If a config is generated for the user, this will be inlined in the response.

`options`:
- `configVar`: Required JavaScript identifier that will receive the inlined config. This may be any valid, assignable JavaScript construct. Ex: `var foo`, `Foo.bar`.
- `userConfig(req)`: Used to generate the configuration for a given request. The return value's `branch` field will be used to select the resource branch to render.
- `finalize(req, response)`: Allows arbitrary modification of `response` prior to successful return. This can be used to attach state or custom headers to the response, etc.
- `heartbeat`: Truthy to enable simplified success only response

### api.resourceLoader

Maintains a versioned list of files and routes associated with the webapp.

#### .register(app, resources)

Registers the set of resources supported by a given application.

- `app`: any unique string that identifies this particular application
- `resources`: Array of resource objects:

```json
  [
    {
      "name": "a",
      "version": "1.0.0",
      "path": "./mweb-a"
    },
    {
      "name": "b",
      "version": "1.1.0",
      "path": "./mweb-b"
    }
  ]
```

Each resource object defines:

- `name`: Name of the branch for this resource. This is the value used when using the `index` API below.
- `version`: Semver value of this version. If omitted name will be used to determine the default index file.
- `path`: Path to the directory containing this branch's source.

Within the resource directory, the `index.html` and `module-map.json` files are given special treatment. All other files must not have duplicates and should be versioned via a system such as [lumbar-long-expires][].

`module-map.json` contains the route information for the application and will not be exposed as a resource available for consumption on the `asset` or `assetContainer` APIs. If using Lumbar, this can be generated using the [hapi-routes](#hapi-routes) grunt task included in this project.

#### .index(app, branch)

Retrieves the index file path for a given application and branch. Should the `branch` not be found, the index file from the highest versioned branch will be returned. Branches that are not versioned will use the last sorted name.

#### .asset(path)

Retrieves the file system path for a given resource path.

#### .assetContainer(path)

Retrieves the root directory that contains the file with the given resource path.

#### .routeInfo(branch, route)

Returns the module map metadata for a given app branch and route.

#### .routes()

Returns all routes supported by all registered apps and versions.


## Grunt Tasks

### hapi-routes

Generates the module-map file utilized by `resourceLoader` to track the routes supported by a given application.

```javascript
  grunt.initConfig({
    'hapi-routes': {
      map: {
        options: {
          package: 'web',
          dest: buildDir + '/module-map.json'
        }
      },
      release: {
        options: {
          package: 'web',
          dest: 'build/' + releasePrefix + '/module-map.json'
        }
      }
    }
  });

  grunt.loadNpmTasks('hula-hoop');
```

Note that using this task requires that [lumbar][] be installed as a sibling of hula-hoops at build time. Any arguments passed in the options field will be forwarded to the lumbar constructor, allowing for plugins and libraries to be specified.

[Fruit-Loops]: https://github.com/walmartlabs/fruit-loops
[fruit-loops-pool]: https://github.com/walmartlabs/fruit-loops#pooloptions
[hapi]: https://github.com/spumko/hapi
[lumbar]: https://github.com/walmartlabs/lumbar
[lumbar-long-expires]: https://github.com/walmartlabs/lumbar-long-expires
[thorax]: https://github.com/walmartlabs/thorax
