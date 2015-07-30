/*globals test, ok, wpm, Class, equal, module, deepEqual*/

var Router = wpm.Router;
var Route = wpm.Route;

module('Router', {
  beforeEach: function() {
    Router.reset();
  },
  afterEach: function() {
  }
});

test('Router general checks', function() {
  ok(Router, 'Router should be defined');

  var router = new Router();
  ok(router, 'router instance should be initialized');
});

test('Get route from window.location', function() {
  var route = Router.routeURIFromLocation();

  ok(route, 'route instance should be initialized');
});

test('Router as a service', function() {
  var LoginRoute = Class({
    router: wpm.service('router')
  });

  var loginRoute = new LoginRoute();
  var router = loginRoute.router;

  ok(router, 'router is not injected as a service properly');
});

test('Register a route via a route', function() {
  var IndexRoute = Class(Route, {
    path: '/'
  });

  var RouteClasses = Router.routeTable['/'];
  deepEqual(RouteClasses, [IndexRoute], 'Router is not registered property');
});

test('Double route registering', function() {
  Class(Route, {
    path: '/'
  });

  Class(Route, {
    path: '/'
  });

  ok(Router.routeTable['/'], 'Route should be registered properly');
  equal(Object.keys(Router.routeTable).length, 1, 'Double route registering should be ignored');
});

test('Test routeMapping', function() {
  var IndexRoute = Class(Route, {
    path: '/'
  });

  equal(Object.keys(Router.routeTable).length, 1, 'routeTable is not updated properly');
  deepEqual(Router.routeTable['/'], [IndexRoute], 'Value inside routeTable is not assigned properly');

  var HomeRoute = Class(Route, {
    path: '/home'
  });

  equal(Object.keys(Router.routeTable).length, 2, 'routeTable is not updated properly');
  deepEqual(Router.routeTable['/home'], [HomeRoute], 'Value inside routeTable is not assigned properly');

  var InboxRoute = Class(Route, {
    path: '/home|/inbox'
  });

  equal(Object.keys(Router.routeTable).length, 3, 'routeTable is not updated properly');
  deepEqual(Router.routeTable['/home/inbox'], [HomeRoute, InboxRoute], 'Nested route is not assigned properly');
});

test('Test routeMapping, ParentRoute is registered after its Child', function() {
  var IndexRoute = Class(Route, {
    path: '/'
  });

  equal(Object.keys(Router.routeTable).length, 1, 'routeTable is not updated properly');
  deepEqual(Router.routeTable['/'], [IndexRoute], 'Value inside routeTable is not assigned properly');

  var InboxRoute = Class(Route, {
    path: '/home|/inbox'
  });

  var HomeRoute = Class(Route, {
    path: '/home'
  });

  equal(Object.keys(Router.routeTable).length, 3, 'routeTable is not updated properly');
  deepEqual(Router.routeTable['/home'], [HomeRoute], 'Value inside routeTable is not assigned properly');
  deepEqual(Router.routeTable['/home/inbox'], [HomeRoute, InboxRoute], 'Nested route is not assigned properly');
});

test('routeMapping with routes imported randomly', function() {
  var InboxDefault = Class(Route, {
    path: '/home/inbox|',
    constructor: function InboxDefault() {}
  });

  var InboxSent = Class(Route, {
    path: '/home/inbox|/sent',
    constructor: function InboxSent() {}
  });

  var InboxNew = Class(Route, {
    path: '/home/inbox|/new',
    constructor: function InboxNew() {}
  });

  var InboxDraft = Class(Route, {
    path: '/home/inbox/new|/draft',
    constructor: function InboxDraft() {}
  });

  var HomeDefaultRoute = Class(Route, {
    path: '/home|',
    constructor: function HomeDefault() {}
  });

  var HomeRoute = Class(Route, {
    path: '/|home',
    constructor: function HomeRoute() {}
  });

  var InboxRoute = Class(Route, {
    path: '/home|/inbox',
    constructor: function InboxRoute() {}
  });

  var IndexRoute = Class(Route, {
    path: '/',
    constructor: function IndexRoute() {}
  });

  deepEqual(Router.routeTable['/'], [IndexRoute], 'Value inside routeTable is not assigned properly');
  deepEqual(Router.routeTable['/home'], [IndexRoute, HomeRoute, HomeDefaultRoute], 'Default Route is not registered properly');
  deepEqual(Router.routeTable['/home/inbox'], [IndexRoute, HomeRoute, InboxRoute, InboxDefault], 'Nested route /home/inbox is not assigned properly');
  deepEqual(Router.routeTable['/home/inbox/new'], [IndexRoute, HomeRoute, InboxRoute, InboxNew], 'Nested route /home/inbox is not assigned properly');
  deepEqual(Router.routeTable['/home/inbox/sent'], [IndexRoute, HomeRoute, InboxRoute, InboxSent], 'Nested route /home/inbox/sent is not assigned properly');
  deepEqual(Router.routeTable['/home/inbox/new/draft'], [IndexRoute, HomeRoute, InboxRoute, InboxNew, InboxDraft], 'Nested route /home/inbox/new/draft is not assigned properly');
});
