# Release Notes

## Development

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v1.2.0...master)

## v1.2.0 - April 15th, 2015
- Handle root parameter from loader - 2b6c026

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v1.1.1...v1.2.0)

## v1.1.1 - March 19th, 2015
- Fix failing tests missed in last commit - 9c20dc9
- Add resourceRoot mapping to cjs response resources - df9f720

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v1.1.0...v1.1.1)

## v1.1.0 - March 18th, 2015
- [#15](https://github.com/walmartlabs/hula-hoop/pull/15) - Improve resource embedding in CJS responses ([@kpdecker](https://api.github.com/users/kpdecker))
- [#12](https://github.com/walmartlabs/hula-hoop/pull/12) - Hapi 8 migration ([@nvcexploder](https://api.github.com/users/nvcexploder))

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v1.0.0...v1.1.0)

## v1.0.0 - December 15th, 2014
- [#9](https://github.com/walmartlabs/hula-hoop/issues/9) - Add support for circus.json route lists ([@kpdecker](https://api.github.com/users/kpdecker))
- Add better error for missing index file - 5ac6498

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.9.0...v1.0.0)

## v0.9.0 - November 19th, 2014
- [#8](https://github.com/walmartlabs/hula-hoop/pull/8) - Add beforeNavigate hook ([@Candid](https://api.github.com/users/Candid))

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.8.1...v0.9.0)

## v0.8.1 - October 19th, 2014
- Make loadHtml always async - 4b0d3e1

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.8.0...v0.8.1)

## v0.8.0 - October 11th, 2014
- Use window._resetIdCounter for id reset - 19d7c55

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.7.1...v0.8.0)

## v0.7.1 - September 29th, 2014
- Defer client side rendering for page operations - 58418e9

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.7.0...v0.7.1)

## v0.7.0 - September 19th, 2014
- [#6](https://github.com/walmartlabs/hula-hoop/pull/6) - Expose maxQueue and queueTimeout server options ([@kpdecker](https://api.github.com/users/kpdecker))
- Fix failing unit tests under new catbox - 3a159b3

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.6.0...v0.7.0)

## v0.6.0 - September 10th, 2014
- Require publicConfig endpoint for branch selection - ed1a041
- Expose req.pre in metadata - e1a80f4

Compatibility notes:
- `publicConfig` must now be passed in order to support multiple branches for server side rendering.

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.5.0...v0.6.0)

## v0.5.0 - September 8th, 2014
- Update for ajax options object - 7117a89

Compatibility notes:
- `ajaxCache` and `ajaxTimeout` config options moved to `ajax.cache` and `ajax.timeout`

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.4.0...v0.5.0)

## v0.4.0 - September 2nd, 2014
- Use client side rendering pipeline for 500s - 8b0af87
- Fix timeout test for cached timeout invalidate - a8f4557

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.3.0...v0.4.0)

## v0.3.0 - September 2nd, 2014
- Forward fruit loops metadata on page exec - 0699c45
- Allow for global ajax timeouts - 13a4495
- Update tests to run in Hapi 6 - 401ccc5

Compatibility notes:
- See Fruit Loops 0.11.0 release notes

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.2.1...v0.3.0)

## v0.2.1 - July 28th, 2014
- Use exec for cleanup error handler - ea73f15

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.2.0...v0.2.1)

## v0.2.0 - July 8th, 2014
- Expose fruit-loops status response - 42e8f41

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.1.0...v0.2.0)

## v0.1.0 - June 9th, 2014
- Update hapi-routes task for latest lumbar - 1126d42
- Add resourceLoader.loadPrefix API - 740d2a6
- Add example expires to resources config example - 1c88e64
- Update directory not found handling for hapi 5 - 911b71e
- Add test for Hapi 5 behavior change - 189a306

Compatibility notes:
- Lumbar 4.0 is now expected for users of the hapi-routes grunt task

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.0.2...v0.1.0)

## v0.0.2 - May 19th, 2014
- Update usage example to working version - e9076e1
- Make hapi-routes more generic - 0785e73
- Allow page exec without userConfig callback - 97dcecf
- Expose handlers, not config from resource endpoint - 05a9515
- Allow resourceLoader.routeInfo to run sans branch - bcae562

[Commits](https://github.com/walmartlabs/hula-hoop/compare/v0.0.1...v0.0.2)

## v0.0.1 - May 19th, 2014
- Initial release

[Commits](https://github.com/walmartlabs/hula-hoop/compare/09f802d...v0.0.1)
