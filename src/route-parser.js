/**
 * RouterParser provides APIs to register a route pattern and resolve an actual path.
 * @class
 * @license Some portions based on Route - github.com/amccollum/route by Andrew McCollum (MIT)
 */
Class({
  routes: null,

  /**
   * Constructor.
   */
  constructor: function() {
    this.routes = [];
  },

  /**
   * Split a uri string into route, query, and hash structure.
   * @param   {string} path path (i.e: /search?q=JavaScript#section1)
   * @returns {object} object which has three fields { query:'q=JavaScript', route:'/search', hash:'section1' }
   * @private
   */
  separateUriString: function(uri) {
    var result = { route: '', query: '', hash: '' };

    if (typeof(uri) !== 'string' || !uri) {
      return result;
    }

    var tokens = uri.split('#');

    if (tokens.length > 1) {
      result.hash = uri.substring(tokens[0].length + 1);
      uri = tokens[0];
    }
    uri = uri.split('?');
    result.route = uri[0];
    result.query = uri.length === 1 ? result.query : uri[1];

    return result;
  },

  /**
   * Parse query parameters from a query path.
   * @param   {string} queryPath query path (i.e: a=1&b=2&c=.
   * @returns {object} query args object as { name: value }
   * @private
   */
  queryParams: function(queryString) {
    var args = {};

    if (typeof(queryString) === 'string' && queryString.length) {
      var re = /([^&=]+)=?([^&]*)/g;
      var match, value;

      while ((match = re.exec(queryString))) {
        value = match[2] === '' ? true : decodeURIComponent(match[2]);
        args[decodeURIComponent(match[1])] = value;
      }
    }
    return args;
  },

  /**
   * Register a route pattern with a handler.
   * @param {String}   routePattern Route pattern (i.e '/posts/:id')
   * @param {Function} fn Handler
   */
  register: function(routePattern, fn) {
    var args, pattern, routes;

    if (typeof routePattern === 'object') {
      routes = routePattern;
    }
    else {
      routes = {};
      routes[routePattern] = fn;
    }

    function replacer(args) {
      return function(all, op, name) {
        args.push(name);
        switch (op) {
        case ':':
          return '([^/]*)';
        case '*':
          return '(.*?)';
        }
      };
    }

    for (routePattern in routes) {
      fn = routes[routePattern];
      pattern = "^" + routePattern + "$";
      pattern = pattern.replace(/([?=,\/])/g, '\\$1');
      pattern = pattern.replace(/\[(.*?)\]/g, '[[$1]]');
      args = ['URI_PATH'];
      pattern = pattern.replace(/(:|\*)([\w\d]+)/g, replacer(args));

      pattern = pattern.replace(/\[\[(.*?)\]\]/g, '(?:$1)?');
      this.routes.push({
        route: routePattern,
        args: args,
        pattern: new RegExp(pattern),
        fn: fn
      });
    }
  },

  /**
   * Unregister a route.
   * @param {String} route Route pattern (i.e '/posts/:id')
   */
  unregister: function(route) {
    for (var index in this.routes) {
      if (this.routes[index].route === route) {
        return this.routes.splice(index, 1);
      }
    }
  },

  /**
   * Resolve a uri.
   * @param {String} uri uri to resolve (i.e: /signin?foo=bar)
   * @returns {Map}  Map of { hanlder:, args: } or null if there's no handler registed to handle the uri.
   */
  resolve: function(uri) {
    var parts = this.separateUriString(uri);
    var queryParams = this.queryParams(parts.query);

    uri = parts.route;

    var args, i, m, value, _i, _j, _len, _len1, _ref, route;
    _ref = this.routes;

    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      route = _ref[_i];

      if ((m = route.pattern.exec(uri))) {
        args = {};
        for (i = _j = 0, _len1 = m.length; _j < _len1; i = ++_j) {
          value = m[i];
          args[route.args[i]] = decodeURIComponent(value);
        }

        // Remove URI_PATH (it's confused and not useful to use) (TODO: Better way to remove URL_PATH)
        delete args.URI_PATH;

        args.queryParams = queryParams;
        if (parts.hash) {
          args.hashParam = parts.hash;
        }
        return { handler: route.fn, args: args };
      }
    }
    return null;
  },

  main: function (RouteParser) {
    wpm.RouteParser = RouteParser;
  }
});
