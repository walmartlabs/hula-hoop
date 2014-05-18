# Hula-Hoop

Server-side rendering components for Thorax + Hapi stacks.

Provides common endpoints and libraries implementing:

- Application resource loading and serving
- Conditional branch loading

## Resources and Branches

Hula-hoop maintains a list of all resources that are involved with running a given Thorax application via the `api.resourceLoader` API. Resources registered through this API can easily be served to clients and concurrently used for server-side rendering.

Additionally, it can serve multiple versions of an application on the same endpoint in support of application-level AB testing or staged deploys. This is done by swapping the served index files through the `resourceLoader.index` API.

## API

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

Returns the module map metadata for a given app brbanch and route.

#### .routes()

Returns all routes supported by all registered apps and versions.



[lumbar-long-expires]: https://github.com/walmartlabs/lumbar-long-expires
