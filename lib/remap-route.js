// Remaps a backbone-style route to a hapi-style route.
// Note that neither system supports all of the features of the other so conflicts may occur.
// These situations are left to the application to resolve.
module.exports = function(route) {
  // (/:foo) -> /{foo?}
  // (:foo) -> {foo?}
  // :foo -> {foo}
  // *foo -> {foo*}
  route = route
      .replace(/\(\/:(\w+?)\)/g, '/{$1?}')
      .replace(/\(:(\w+?)\)/g, '{$1?}')
      .replace(/:(\w+)/g, '{$1}')
      .replace(/\*(\w+)/g, '{$1*}');

  return '/' + route;
};
