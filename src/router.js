Class({
  $singleton: true,

  /** Route State Constants */
  $const: {
    ENTER: 'enter',
    PRE_MODEL: 'preModel',
    MODEL: 'model',
    POST_MODEL: 'postModel',
    RENDER: 'render',
    READY: 'ready',
    RESIGN: 'resign',
    PAUSE: 'pause',
    EXIT: 'exit',
    RESUME: 'resume',
    SHOW: 'show',
    HIDE: 'hide',
    ABORT: 'abort',
    DESTROY: 'destroy'
  },

  /** Route URI parser and dispatcher */
  routeParser: new wpm.RouteParser(),

  /** Router configuration */
  config: wpm.config('router'),

  registeredPaths: {},     // Flagging paths to verify if a route path is registered
  routeTable: {},          // Mapping of paths to Route resolving chain (i.e: '/inbox/sent' -> [InboxRoute, InboxSentRoute])
  lazyRoutes: {},          // Mapping of unresolved paths to Route resolving chain (i.e: '/inbox' -> ['/inbox', InboxSentRoute])

  activeURI: null,         // Active URL
  routes: {},              // Resolved route mapping (uri -> array of Route instances) (i.e: '/inbox/sent?a=b' -> [InboxRoute's instance for '/inbox/sent?a=b', InboxSentRoute's instance for '/inbox/sent?a=b'])

  /**
   * Register a route. This method should be used internally inside wpm.Route only and nowhere else except unit tests.
   *
   * @param {Class}  Route Route class.
   * @param {String} path Route path.
   * @param {String} template Route template.
   */
  registerRoute: function(Route, path, template) {
    if (this.registeredPaths[path]) {
      return console.error('wpm: Route (path:', path + ') already registered');
    }
    else {
      Route.path = path;                                                           // Make path and template available on class level
      Route.template = template;
      Route.instances = {};
      this.registeredPaths[path] = true;                                           // Mark path is resolved

      var tokens = path.split('|');                                                // Check if path is a nested path
      if (tokens.length === 2) {                                                   // Nested route found (i.e: /inbox|/new)
        var parentPath = tokens[0];                                                // parent path: /inbox
        var nestedPath = tokens.join('');                                          // nested path: /inbox/new

        Route.parentPath = parentPath;                                             // Save parentPath to Route.parenPath
        this.routeParser.register(nestedPath, this.makeRouteHandler(nestedPath));  // Register nestedPath with parser

        console.log('wpm: Nested route (path:', path + ') registered as (path:', nestedPath + ')');

        if (!tokens[1]) {                                                          // Set isDefault if Route is a default route
          Route.isDefault = true;
        }

        var routeTableItem = this.routeTable[parentPath];                          // If Route's parent exists in routeTable, copy the parent's item,
        var parentNotResolved;

        /* TODO REFACTOR THIS */

        if (routeTableItem) {                                                      // append Route into it, then resigter in routeTable
          routeTableItem = routeTableItem.slice(0);                                //
          if (routeTableItem[routeTableItem.length - 1].isDefault) {               // If parent Route has a default route, remove it
            routeTableItem.pop();
          }
          routeTableItem.push(Route);                                              // Push Route into routeTableItem
          this.routeTable[nestedPath] = routeTableItem;                            // Register into routeTable

          parentPath = routeTableItem[0];
          if (typeof(parentPath) === 'string') {                                   // If parent Route is not resolved then add routeTableItem
            this.lazyRoutes[parentPath] = this.lazyRoutes[parentPath] || [];
            this.lazyRoutes[parentPath].push({ path: nestedPath, Route: Route});   // into lazyRoutes
          }
        }
        else {
          parentNotResolved = true;
          routeTableItem = [parentPath, Route];
          this.routeTable[nestedPath] = routeTableItem;                            // parentPath will be resolved later when ParentRoute is available (lazy loading)
          this.lazyRoutes[parentPath] = this.lazyRoutes[parentPath] || [];
          this.lazyRoutes[parentPath].push({ path: nestedPath, Route: Route});
        }
        path = nestedPath;
      }
      else if (tokens.length > 2) {                                                // Log error if there are more than one pipe
        return console.error('wpm: Invalid nested route (path:', path + ')');
      }
      else {
        this.routeParser.register(path, this.makeRouteHandler(path));              // Register as a standalone route

        if (!this.routeTable[path]) {                                              // If routeTable contains path already, a default
          this.routeTable[path] = [Route];                                         // route is already registered. If not then register
        }                                                                          // Route under key path

        console.log('wpm: Route (path:', path + ') registered');
      }

      /* TODO REFACTOR THIS TO A METHOD */

      // Now path is resolved, try to resolve its lazy dependencies
      var lazyRoutesEntries = this.lazyRoutes[path];
      var routeTableEntry = this.routeTable[path];
      if (lazyRoutesEntries && routeTableEntry) {
        var lazySize = lazyRoutesEntries.length;
        var entry;

        while (lazySize--) {
          entry = lazyRoutesEntries[lazySize];

          // Default nested route
          if (entry.path === path && entry.Route.isDefault) {
            if (!routeTableEntry[routeTableEntry.length - 1].isDefault) {
              routeTableEntry.push(entry.Route);
              lazyRoutesEntries.splice(lazySize, 1);
            }
            continue;
          }

          // Replace placeholder inside routeTable elements by actual Route classes
          var unresolveRouteTableEntry = this.routeTable[entry.path];
          if (unresolveRouteTableEntry[0] === path) {
            unresolveRouteTableEntry.shift();
            for (var i = 0, len = routeTableEntry.length; i < len; i++) {
              var e = routeTableEntry[len - i - 1];
              unresolveRouteTableEntry.unshift(e);
            }
            if (typeof(unresolveRouteTableEntry[0]) === 'string') {
              this.lazyRoutes[unresolveRouteTableEntry[0]].push({ path: entry.path, Route: unresolveRouteTableEntry[unresolveRouteTableEntry.length -1]});
            }
            lazyRoutesEntries.splice(lazySize, 1);
          }
        }
      }
    }
  },

  /**
   * Transition to a new route using push. New uri will be pushed into history.
   *
   * @param {String} uri Route uri.
   */
  transitionTo: function(uri, queryParams) {
    uri = this.removeBasePathFromURI(uri) + (queryParams ? this.serialize(queryParams) : '');

    this.startRoutingWithURI(uri, true);
  },

  /**
   * Transition to a new route using push but destroy previous route. New uri will be pushed into history.
   *
   * @param {String} uri Route uri.
   */
  navigateTo: function(uri, queryParams) {
    uri = this.removeBasePathFromURI(uri) + (queryParams ? this.serialize(queryParams) : '');

    this.startRoutingWithURI(uri, true, false, true);
  },

  /**
   * Replace current route with another route from a path. New route will replace current route.
   *
   * @param {String} uri Route uri.
   */
  replaceWith: function(uri, queryParams) {
    uri = this.removeBasePathFromURI(uri) + (queryParams ? this.serialize(queryParams) : '');
    this.startRoutingWithURI(uri);
  },

  /** Helper browser 'popstate' event listener. */
  popStateListener: function() {
    var uri = this.removeBasePathFromURI(this.routeURIFromLocation());
    this.startRoutingWithURI(uri, false, true);
  },

  /**
   * Go to previous route.
   */
  back: function() {
    window.history.back();
  },

  /**
   * Go to next route.
   */
  next: function() {
    window.history.go(1);
  },

  /**
   * Get route URI from current browser location (aka window.location.href).
   *
   * @returns {String} Route URI including query parameters and hash (if any) which does not have location.origin.
   * @private
   */
  routeURIFromLocation: function() {
    var loc = window.location;
    var origin = loc.origin || loc.protocol + '//' + loc.host;
    return loc.href.replace(origin, '');
  },

  /**
   * Make a route handler to comply with RouteParser.
   *
   * @param {String} path Route path (i.e: /browse/:id).
   * @private
   */
  makeRouteHandler: function(path) {
    return function startRouting(args, uri, isPush, isPop, isNavigate) {
      return this.startRouting(args, uri, path, isPush, isPop, isNavigate);
    };
  },

  /**
   * Start routing with a uri.
   *
   * @param {String}  uri    URI to be routed (i.e /browse/1001/202?flag&debug=true).
   * @param {Boolean} isPush Flag to determine if a push state should be made.
   * @param {Boolean} isPop  Flag to determine if routing from a popstate.
   * @private
   */
  startRoutingWithURI: function(uri, isPush, isPop, isNavigate) {
    console.log('wpm: Start routing URI:', uri);
    var resolver = this.routeParser.resolve(uri);

    if (resolver) {
      return resolver.handler.call(this, resolver.args, uri, isPush, isPop, isNavigate);
    }
    else {
      console.error('wpm: No route to handle URI:', uri); // TODO Add 404 support
    }
  },

  /**
   * Route a 'linkTo' type URI. A linkTo uri is uri specified in any element href
   * element (for example <a href="..."/> or custom <div href="..."/>). If uri is
   * handled by a route, it will be processed, otherwise, let browse handle it.
   * @param {String} uri   URI to route.
   * @param {Event}  event Native event object from the event.
   */
  routeLinkToURI: function(uri, event) {
    var resolver = this.routeParser.resolve(uri);
    if (resolver) {
      event.stopPropagation();
      event.preventDefault();

      this.navigateTo(uri);
    }
  },

  /**
   * Set state for a route.
   *
   * @param   {Object}   route Route.
   * @param   {String}   state State to set.
   * @returns {Function} A function that set route state to state.
   * @private
   */
  setRouteState: function(route, state) {
    return function(data) {
      console.log('wpm: Route (path:', route.path + ', uri:', route.uri + ') resolving hook "' + state + '"');
      route.state = state;
      return data; // Dispatch whatever being passed from previous resolver
    };
  },

  /**
   * Helper method to update browser (location, title, etc...) when transition to a route.
   *
   * @param   {Object}  route  Route which takes control.
   * @param   {Boolean} isPush Flag to determine if transition is a push state.
   * @param   {Boolean} isPop  Flaf to determine if transition is a pop state. If isPop is true, it will override isPush.
   * @private
   */
  updateBrowser: function(route, isPush, isPop) {
    var history = window.history;
    var uri = this.config.basePath ? this.config.basePath + route.uri : route.uri;

    if (!isPop) {
      if (isPush) {
        history.pushState(null, null, uri);
      }
      else {
        history.replaceState(null, null, uri);
      }
    }
    if (route.title && route.title !== document.title) {
      document.title = route.title;
    }
  },

  /**
   * Start routing a URI. This method will decide to start the route or resume it if it exits.
   *
   * @param   {Object}   args Route parameters, including query parameters and hash parameter.
   * @param   {String}   uri    Route URI.
   * @param   {Boolean}  isPush Flag to decide to push a new page into browser history.
   * @param   {Boolean}  isPop  Flag to determine if a popstate event drives this method.
   * @private
   */
  startRouting: function(args, uri, path, isPush, isPop, isNavigate) {
    var self = this;
    var promise = new Promise(function(fulfill) { fulfill(); }).then();
    var activeRoutes = self.activeURI && self.routes[self.activeURI];
    var routes = this.routes[uri];
    var routeExits = !!routes;

    routes = routeExits ? routes : self.lookupResolvedRouteInstances(path, uri, args);

    if (activeRoutes) {
      if (self.activeURI === uri) {
        return console.log('wpm: Transition to active route. Do nothing.');
      }

      promise = self.resignActiveRoutes(promise, activeRoutes, routes);
    }

    if (!routeExits) {
      promise = promise.then(function() {
        return self.activateRoutes(args, uri, isPush, isPop, activeRoutes, routes);
      });
    }
    else {
      promise = promise.then(function() {
        return self.resumeRoutes(args, uri, isPush, isPop, activeRoutes, routes);
      });
    }

    promise = promise.then(function() {
      // If isNavigate then resolve previous route's exit() and destroy it
      if (isNavigate && activeRoutes && activeRoutes.length) {
        var route = activeRoutes[activeRoutes.length - 1];

        if (route.state === self.PAUSE) {
          var promise = new Promise(function(fulfill) { fulfill(); }).then();

          promise = promise.
            then(self.setRouteState(route, self.EXIT)).
            then(route.exit.bind(route)).
            then(function() {
              self.destroyRoute(route);
            });
          return promise;
        }

      }
    }, function() {
      if (activeRoutes) {
        return self.restoreActiveRouters(activeRoutes);
      }
    });

    return promise;
  },

  /**
   * Resign active routes. Route instances in active routes are used by the incoming
   * routes are skipped. Otherwise, they will be resolved.
   *
   * @param   {Promise} promise      Promise passing from startRouting.
   * @param   {Array}   activeRoutes Array of active routes.
   * @param   {Array}   routes       Array of incoming routes.
   * @private
   */
  resignActiveRoutes: function(promise, activeRoutes, routes) {
    var self = this;
    var index = activeRoutes.length;
    var route;

    while (index--) {
      route = activeRoutes[index];
      if (routes && routes.indexOf(route) !== -1) {
        break;
      }

      if (route.state === self.READY) {                                             // Resign route when its state is READY
        promise = promise                                                           //
                    .then(self.setRouteState(route, self.RESIGN))                   // Set state to RESIGN
                    .then(route.resign.bind(route));                                // Resolve RESIGN
      }
      else {
        promise = promise.then(self.setRouteState(route, self.ABORT));              // If route is not READY then just set its state to ABORT
        self.destroyRoute(route);
      }
    }
    return promise;
  },

  /**
   * Restore active routes. This method is called when incoming routes are failed
   * to resolve.
   * @param  {Array}  routes Active routes to be restored.
   */
  restoreActiveRouters: function(routes) {
    var self = this;
    var promise = new Promise(function(fulfill) { fulfill(); }).then();
    var index = routes.length;
    var route;

    while (index--) {
      route = routes[index];

      if (route.state === self.HIDE) {
        promise = promise
                    .then(route.resume.bind(route))
                    .then(self.setRouteState(route, self.READY))
                    .then(route.show.bind(route));
      }
      else if (route.state === self.RESIGN) {
        promise = promise
                    .then(route.resume.bind(route))
                    .then(self.setRouteState(route, self.READY));
      }
    }

    return promise;
  },

  /**
   * Look up resolved instances to resolve a URI. Each Route instance is instantiated to resolve its routing registered path
   * with unique set of parameters passing from URI. For example a URI like '/browse/1234?foo=bar' would have two resolved instances: an
   * IndexRoute instance instantited for path '/' and args {id: 1234, queryParams: {foo: 'bar' }} and a BrowseRoute instance
   * instantiated for path '/browse/:id' and args {id: 1234, queryParams: {foo: 'bar' }}. Instances are shareable among
   * URIs. For example IndexRoute instance for path '/' and args {id: 1234, queryParams: {foo: 'bar' }} with URI '/browse/1234?foo=bar'
   * is sharable with URI '/inbox/1234?foo=bar'.
   *
   * @param   {String} path   Route path (i.e: /browse/:id)
   * @param   {String} uri    URI to resolve.
   * @param   {Object} args Parameters (including query parameters and hash parameter) extracted from uri.
   * @returns {Array}  Array of resolved instances used to resolve uri. For example [indexInstance, browseInstance]
   */
  lookupResolvedRouteInstances: function(path, uri, args) {
    var self = this;
    var id = self.idFromArgs(args);

    if (self.routes[uri]) {
      return self.routes[uri];
    }

    var routeTableEntry = self.routeTable[path];                                    // Get routable entry for path
    var index = routeTableEntry && routeTableEntry.length;                          // Get number of instances to resolve path
    var resolvedInstances = [];
    var RouteClass, instance;

    var queryParams = args.queryParams || {};
    var hashParam = args.hashParam;

    delete args.hashParam;
    delete args.queryParams;

    while (index--) {
      RouteClass = routeTableEntry[index];                                          // Get RouteClass at index
      instance = RouteClass.instances[id];                                          // Verify if instance exists

      if (!instance) {                                                              // If not then create one
        instance = RouteClass.instances[id] = new RouteClass();                     // and put into RouteClass.instances

        instance.id = id;
        instance.Class = RouteClass;
        instance.data = {
          args: Object.freeze(args),
          queryParams: Object.freeze(queryParams),
          hash: hashParam,
          model: null,
          i18n: Object.freeze(instance.i18n)
        };

        self.makeReadonly(instance, 'id', 'Class', 'data');                         // Make id, Class, data, args, queryParams, hash, i18n read only
        self.makeReadonly(instance.data, 'args', 'queryParams', 'hash', 'i18n');
      }

      resolvedInstances.unshift(instance);                                          // Order: parent -> nested parent -> ... -> child route
    }

    return (self.routes[uri] = resolvedInstances);                                  // Assign to routes and return
  },

  /** Helper method to return a reject promise if URI is transitioned */
  rejectWhenTransitioned: function(uri, route) {
    var self = this;

    return function(data) {
      if (uri !== self.activeURI || route.state === self.ABORT) {
        if (route.state !== self.ABORT) {
          var activeRoutes = self.routes[self.activeURI];
          var len = activeRoutes.length;
          while (len--) {
            if (route == activeRoutes[len]) {
              console.log('wpm: Ignore rejecting, route is reused in future routes');
              return data;
            }
          }
        }
        self.destroyRoute(route);
        route.state = self.DESTROY;
        console.log('wpm: Resolving aborted for URI:', uri, '. Transition to:', self.activeURI);
        return new Promise(function(fulfill, reject) { reject(); });
      }
      return data; // Dispatch whatever being passed from previous resolver
    };
  },

  destroyRoute: function(route) {
    var routes = this.routes[route.uri];
    var len = routes && routes.length;
    var index = len;
    var r;

    if (len) {
      console.log('wpm: Destroy routes:', routes);
      delete this.routes[route.uri];                                  // remove reference from Router.routes
    }
    else {
      console.warn('wpm: Route:', route, 'already destroyed');
    }

    while (index--) {
      r = routes[index];

      if (r.state === this.EXIT || r.state === this.ABORT) {
        console.log('wpm: Destroy abort/exit route:', r);
        r.unobserve();                                                // Call unobserve() to remove data observer
        r.destroy();                                                  // Call destroy() to remove data reference, if any
      }
      else {
        console.log('wpm: Ignore destroying non-exit route:', r, 'state:', r.state);
      }
    }
  },

  /**
   * Hide, Pause, or Exit active routes.
   *
   * @param   {Array}   activeRoutes Array of active routes.
   * @param   {Boolean} shouldPause  Flag to determine the routes should pause.
   * @param   {Boolean} shouldHide   Flag to determine the routes should hide.
   */
  deactivateActiveRoutes: function(activeRoutes, shouldPause, shouldHide) {
    var self = this;
    var executed;

    if (activeRoutes) {
      return function() {
        if (executed) {
          return;
        }

        var len = activeRoutes.length;
        var promise = new Promise(function(fulfill) { fulfill(); }).then();
        var activeURI = self.activeURI;
        var route;

        executed = true;

        var destroyRouteIfExit = function(route, shouldPause) {
          return function() {
            if (!shouldPause) {
              self.destroyRoute(route);
            }
          };
        };

        while (len--) {
          route = activeRoutes[len];

          if (route && route.uri !== activeURI && (route.state === self.RESIGN || route.state === self.HIDE)) {
            if (shouldHide) {
              console.log('wpm: Deactivate routes:', activeRoutes, '- Hiding:', route, 'state:', route.state);
              promise = promise
                .then(self.setRouteState(route, self.HIDE))
                .then(route.hide.bind(route));
            }
            else {
              console.log('wpm: Deactivate routes:', activeRoutes, '- ' + (shouldPause ? 'Pause:' : 'Exit:'), route, 'state:', route.state);
              promise = promise
                .then(self.setRouteState(route, shouldPause ? self.PAUSE : self.EXIT))
                .then(route.hide.bind(route)) // TODO route.hide() should be smart enough to ignore if route is hidden already
                .then(route[shouldPause ? 'pause' : 'exit'].bind(route))
                .then(destroyRouteIfExit(route, shouldPause));
            }
          }
        }
        return promise;
      };
    }
  },

  /**
   * Activate routes for an URI. This method resolves methods and hooks from Route instances bound to uri. Methods
   * and hooks are resolved from top down. Meaning parent route will be resolved first, then nested route.
   *
   * @param   {Object}   args       Parameters including query parameters and hash parameter.
   * @param   {String}   uri          URI.
   * @param   {Boolean}  isPush       Flag to decide if a new page should be pushed to browser history.
   * @param   {Boolean}  isPop        Flag to determine if the activation came from a popstate event.
   * @param   {Array}    activeRoutes Array of active route instances.
   * @param   {Array}    routes       Array of route instances used to resolve uri.
   * @private
   */
  activateRoutes: function(args, uri, isPush, isPop, activeRoutes, routes) {
    var self = this;
    var shouldPause = isPop || isPush;
    var route;

    self.activeURI = uri;

    if (routes) {
      console.log('wpm: Activate routes:', routes, 'isPush:', !!isPush, 'isPop:', !!isPop);

      var promise = new Promise(function(fulfill) { fulfill(); }).then();
      var prerender = function(route) {
        return function(preModel) {
            if (preModel !== undefined) {                    // If hook 'preModel' returns non-undefined value
              console.log('wpm: Pre-render route, preModel:', preModel);
              return route.mount(route.render(preModel));    // then try to resolve render() (loading state)
            }
          };
      };
      var hideInactiveRoutes = self.deactivateActiveRoutes(activeRoutes, shouldPause, true);
      var pauseOrExitInactiveRoutes = self.deactivateActiveRoutes(activeRoutes, shouldPause, false);
      var setDataModel = function(route) { return function(model) { if (model) { route.data.model = model; } }; };
      var makeFailFn = function(route) {
        return function() {
          if (pauseOrExitInactiveRoutes) {
            pauseOrExitInactiveRoutes();
          }
          if (route.state !== self.DESTROY) {
            return route.fail.apply(route, arguments);
          }
        };
      };
      var parentRoute, i, len, last, lastItem, shouldSkip;

      for (i = 0, len = routes.length, last = len - 1; i < len; i++) {
        lastItem = (i === last);
        route = routes[i];
        route.parentRoute = parentRoute;
        route.uri = uri;
        parentRoute = route;
        shouldSkip = route.state === self.READY; // For activated route, skip resolving

        if (!shouldSkip) {
          promise = promise
            .then(self.setRouteState(route, self.ENTER))
            .then(route.enter.bind(route))
            .then(self.rejectWhenTransitioned(uri, route))

            .then(self.resolveRenderTo(route))
            .then(self.rejectWhenTransitioned(uri, route))
            .then(self.setRouteState(route, self.PRE_MODEL))
            .then(route.preModel.bind(route))
            .then(prerender(route))

            .then(self.rejectWhenTransitioned(uri, route))
            .then(self.setRouteState(route, self.MODEL))
            .then(route.model.bind(route))

            .then(self.rejectWhenTransitioned(uri, route))
            .then(self.setRouteState(route, self.POST_MODEL))
            .then(route.postModel.bind(route))
            .then(setDataModel(route))
            .then(route.observe.bind(route));

          promise = promise
            .then(self.rejectWhenTransitioned(uri, route))
            .then(self.setRouteState(route, self.RENDER))
            .then(route.render.bind(route))
            .then(route.mount.bind(route));
        }

        if (lastItem) {
          promise = promise
            .then(hideInactiveRoutes)
            .then(self.updateBrowserForRoute(route, isPush, isPop));
        }

        if (!shouldSkip) {
          promise = promise
            .then(route.show.bind(route));
        }

        if (lastItem) {
          promise = promise.then(pauseOrExitInactiveRoutes);
        }

        if (!shouldSkip) {
          promise = promise
            .then(self.setRouteState(route, self.READY))
            .then(route.ready.bind(route));

          promise = promise
            .then(null, makeFailFn(route));
        }
      }

      return promise;
    }
  },

  /**
   * Resume existing routes.
   *
   * @param   {Object}   args       Parameters including query parameters and hash parameter.
   * @param   {String}   uri          URI.
   * @param   {Boolean}  isPush       Flag to decide if a new page should be pushed to browser history.
   * @param   {Boolean}  isPop        Flag to determine if the activation came from a popstate event.
   * @param   {Array}    activeRoutes Array of active route instances.
   * @param   {Array}    routes       Array of route instances used to resolve uri.
   * @private
   */
  resumeRoutes: function(args, uri, isPush, isPop, activeRoutes, routes) {
    var self = this;
    var promise = new Promise(function(fulfill) { fulfill(); }).then();
    var shouldPause = isPop || isPush;
    var hideInactiveRoutes = self.deactivateActiveRoutes(activeRoutes, shouldPause, true);
    var pauseOrExitInactiveRoutes = self.deactivateActiveRoutes(activeRoutes, shouldPause, false);
    var len = routes.length;
    var index = 0;
    var last, parentRoute, route, didResolvePrevious;

    self.activeURI = uri;
    console.log('wpm: Resume uri:', uri);

    while (index < len) {
      route = routes[index++];
      route.uri = uri;

      last = (index === len);
      parentRoute = route;

      if (route.state === self.PAUSE) {
        if (last) {
          didResolvePrevious = true;
          promise = promise
            .then(hideInactiveRoutes);
        }

        promise = promise.then(self.setRouteState(route, self.RESUME))
          .then(route.resume.bind(route))
          .then(self.rejectWhenTransitioned(uri, route))
          .then(route.render.bind(route))
          .then(self.rejectWhenTransitioned(uri, route))
          .then(route.mount.bind(route));

        if (last) {
          promise = promise
            .then(pauseOrExitInactiveRoutes)
            .then(self.updateBrowserForRoute(route, isPush, isPop));
        }

        promise = promise
          .then(self.rejectWhenTransitioned(uri, route))
          .then(route.show.bind(route))
          .then(self.setRouteState(route, self.READY))
          .then(route.ready.bind(route))
          .then(self.rejectWhenTransitioned(uri, route));
      }
      else if (route.state !== self.READY) {
        console.error('wpm: Route (path:', route.path + ', uri:', route.uri + ', state:', route.state + ') cannot be resumed properly');
      }
      else if (route.state === self.READY) {
        continue;
      }
    }

    if (!didResolvePrevious) {
      promise = promise
        .then(hideInactiveRoutes)
        .then(pauseOrExitInactiveRoutes)
        .then(self.updateBrowserForRoute(route, isPush, isPop));
    }

    return promise;
  },

  /** Helper to remove base path from uri */
  removeBasePathFromURI: function(uri) {
    if (this.config.basePath) {
      uri = uri.replace(this.config.basePath, '');
    }
    return uri;
  },

  /** Helper method to generate unique id from URI parameters. Note that default nesting route will have same id as its parent */
  idFromArgs: function(args) {
    var queryParams = args.queryParams;

    delete args.queryParams;                                         // Temporary remove queryParams from args
    var id = this.serialize(args) + this.serialize(queryParams);     // shareableRouteKey = path + serialize(args)
    args.queryParams = queryParams;                                  // Restore args
    return id;
  },

  /** Helper method to return a function to resolve renderTo property for a route */
  resolveRenderTo: function(route) {
    var self = this;
    return function() {
      route.renderTo = (route.parentRoute && route.parentRoute.outlet) || route.renderTo || self.config.appRootElement || document.body;
    };
  },

  /** Helper method to resolve updating browser when a route is resolved */
  updateBrowserForRoute: function(route, isPush, isPop) {
    var self = this;
    return function() {
      self.updateBrowser(route, isPush, isPop);
    };
  },

  /**
   * Reset router for framework internal purpose and testing.
   *
   * @private
   */
  reset: function() {
    for (var key in this.routes) {
      var entries = this.routes[key];
      for (var index in entries) {
        entries[index].unobserve();
      }
    }
    this.routeParser = new wpm.RouteParser();
    this.registeredPaths = {};
    this.routeTable = {};
    this.lazyRoutes = {};
    this.routes = {};
    this.activeURI = null;
  },

  /**
   * Serialize an object to query string.
   * @param   {Object} obj Object to serialize.
   * @returns {String} Query string representation of the object.
   * @private
   */
  serialize: function(obj) {
    var str = obj && Object.keys(obj).sort().reduce(function(a, k) {
      a.push(k + '=' + encodeURIComponent(obj[k]));
      return a;
    }, []).join('&');
    return str ? '?' + str : '';
  },

  performComponentAction: function(action, event, element) {
    var registryActions = wpm.registry.actions;
    var registryElements = registryActions.elements;
    var index = registryElements.length;
    var container, component, fn, args, found;

    while (index--) {
      container = registryElements[index];
      if (container.contains(element)) {
        found = true; // element inside a registered container bound to a component
        break;
      }
    }

    // Found registered element, dispatch action to its handler counterpart
    if (found) {
      component = registryActions.handlers[index];

      var actions = component.actions;
      var useNoSuchAction;

      fn = actions && actions[action.name];

      if (!fn && actions.noSuchAction) {
        fn = actions.noSuchAction;
        useNoSuchAction = true;
      }

      if (fn) {
        args = args || this.buildArgumentsForAction(action, event, element, component);
        console.log('wpm: Perform component action:', action, 'event:', event, 'element:', element, 'component:', component);

        // Add action as first param if noSuchAction is used
        if (useNoSuchAction) {
          args.unshift(action);
        }

        return (fn.apply(component, args) === true);
      }
    }

    // Return true let performAction() know it should perform
    return true;
  },

  /**
   * Perform an action. This method is usually called by route-actions.
   * @param {Object}  action  Action object.
   * @param {Object}  event   Native event object.
   * @param {Element} element Action DOM element.
   * @protected Use internally inside wpm.
   */
  performAction: function(action, event, element) {
    var self = this;
    var activeRoutes = self.activeURI && self.routes[self.activeURI];

    if (activeRoutes) {
      if (this.performComponentAction(action, event, element) !== true) {
        return;
      }

      var len = activeRoutes.length;
      var route, fn, args;

      while (len--) {
        route = activeRoutes[len];
        fn = route.actions && route.actions[action.name];

        if (fn) {
          args = args || self.buildArgumentsForAction(action, event, element, route);
          console.log('wpm: Perform route action:', action, 'event:', event, 'element:', element, 'route:', route);
          if (fn.apply(route, args) !== true) { // Bubbling action only if child's handler returns true
            return;
          }
        }
      }
    }
  },

  /**
   * Build arguments for action handler.
   * @param   {Object}  action  Action object parsed from action attribute.
   * @param   {Event}   event   Native event object.
   * @param   {Element} element Action target.
   * @param   {Object}  route   Route to handle action.
   * @returns {Array}   Array of arguments used to pass into action handler.
   * @private
   */
  buildArgumentsForAction: function(action, event, element, route) {
    var tokens = action.args;
    var size = tokens.length;
    var values = [];
    var data = route.data;
    var token, value;

    while (size--) {
      token = tokens[size];
      value = this.getObjectProperty(data, token);
      if (value === undefined) {
        if (token === 'true') {
          value = true;
        }
        else if (token === 'false') {
          value = false;
        }
        else if (!/^[a-z]+/i.test(token)) {                  // if value is undefined then check if token is not a
          value = this.convertValue(token, true);            // property path (like i18n.hello) -> token is an actual value: set value = token
        }
      }
      else {
        value = value && this.convertValue(value) || value;
      }
      values.unshift(value);
    }

    values.push(event, element); // Two last args always are event and element

    return values;
  },

  convertValue: function(value, shouldRemoveQuotes) {
    var numberValue = Number(value);

    if (numberValue == value) {
      return numberValue;
    }

    return shouldRemoveQuotes ? value.replace(/^['"]|['"]$/g, '') : value;
  },

  /**
   * Get object property with string key (@see http://bit.ly/1TIyvGZ).
   * @param   {Object} object Object. For example: {model: {items: [{id: 1, name: 'WPM'}, {id: 2, name: 'JSFace'}]}}
   * @param   {String} prop   string key. For example "model.items[1].name".
   * @param   {Object} info extra info to set flag that prop exists in object or not.
   * @returns {Object} Value for prop in object, or underfined if not found.
   * @private
   */
  getObjectProperty: function(object, prop) {
    prop = prop.replace(/\[(\w+)\]/g, '.$1');

    var parts = prop.split('.');
    var last = parts.pop();
    var l = parts.length;
    var i = 1;
    var current = parts[0];

    while (l > 0 && (object = object[current]) && i < l) {
      current = parts[i];
      i++;
    }

    return object && object[last];
  },

  /**
   * Set object property with string key.
   * @param   {Object} object Object. For example: {model: {items: [{id: 1, name: 'WPM'}, {id: 2, name: 'JSFace'}]}}
   * @param   {String} prop   string key. For example "model.items[1].name".
   * @param   {Object} value  New value of property.
   * @private
   */
  setObjectProperty: function(object, prop, value) {
    prop = prop.replace(/\[(\w+)\]/g, '.$1');

    var parts = prop.split('.');
    var last = parts.pop();
    var l = parts.length;
    var i = 1;
    var current = parts[0];

    while (l > 0 && (object = object[current]) && i < l) {
      current = parts[i];
      i++;
    }

    if (object && object[last] !== value) {
      console.log('wpm: Update binding property:', prop, 'new value:', value);
      object[last] = value;
    }
  },

  /**
   * Helper method to make readonly properties for an object.
   * Call makeReadonly(object, 'property1', 'property2',....).
   * @private
   */
  makeReadonly: function() {
    var args = [].slice.call(arguments);
    var object = args.shift();
    var len = args.length;
    var property, value;

    while (len--) {
      property = args[len];
      value = object[property];
      Object.defineProperty(object, property, {value: value, writable: false, enumerable: true});
    }
  },

  /**
   * Event handler when a route's data has changed.
   * @param {Object} route Route which has data property changed.
   */
  routeDataChanged: function(route) {
    this.rerenderRoute(route);
  },

  /**
   * Rerender a route.
   * @param {Obj} route Route instance.
   */
  rerenderRoute: function(route) {
    var self = this;
    var activeRoutes = self.activeURI && self.routes[self.activeURI];
    var index;

    if (activeRoutes) {
      index = activeRoutes.indexOf(route);

      if (index !== -1) {
        var promise = new Promise(function(fulfill) { fulfill(); }).then();
        var parentRoute = route.parentRoute;
        var len = activeRoutes.length;
        var activeURI = self.activeURI;
        var r;

        while (index < len) {
          r = activeRoutes[index++];
          if (r.state === self.READY) {
            console.log('wpm: Route data changed -> rerender', r);
            r.parentRoute = parentRoute;
            parentRoute = r;
            promise = promise
              .then(self.rejectWhenTransitioned(activeURI, r))
              .then(r.render.bind(r))
              .then(r.mount.bind(r))
              .then(null, r.fail.bind(r));
          }
          else {
            console.log('wpm: Route data changed but route is not active. Skip rerendering. State:', r.state, 'Route:', r);
          }
        }
      }
      else {
        console.log('wpm: Cannot rerender inactive route:', route);
      }
    }
    else {
      console.warn('wpm: Cannot rerender route. No active routes found');
    }
  },

  /**
   * Sync binding when event happens on a binding DOM element.
   * @param {String}  bindingSelector Binding selector. For example "model.name".
   * @param {Element} element         Native DOM element where change event happens.
   * @param {Object}  value           Value of element.
   * @param {Array}   parents         Array of element's hierarchy parents.
   */
  syncBindingFromTarget: function(bindingSelector, element, value, parents) {
    var self = this;
    var activeRoutes = self.activeURI && self.routes[self.activeURI];

    if (activeRoutes) {
      var len = activeRoutes.length;
      var route;

      while (len--) {
        route = activeRoutes[len];

        if (parents.indexOf(route.dom) !== -1) {
          self.setObjectProperty(route.data, bindingSelector, value);
          break;
        }
      }
    }
  },

  /**
   * Class main entry point.
   * @param {Object} Router Router singleton class.
   */
  main: function(Router) {
    wpm.registerService('router', Router);                                                    // Register an instance of Router as service 'router'
    window.addEventListener('popstate', Router.popStateListener.bind(Router));                // Listen to 'popstate' event
    wpm.Router = Router;                                                                      // Export Router under wpm

    // Schedule observe-js' Platform.performMicrotaskCheckpoint on browsers not yet support Object.observe
    if (!Object.observe) {
      setTimeout(function performMicrotaskCheckpoint() {
        window.Platform.performMicrotaskCheckpoint();
        setTimeout(performMicrotaskCheckpoint, 0);
      }, 0);
    }
  }
});
