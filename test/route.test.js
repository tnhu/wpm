/*globals test, ok, equal, notOk, deepEqual, module*/

var Router = wpm.Router;
var Route = wpm.Route;
var junitPath = Router.routeURIFromLocation();
var renderTo = $('#qunit-fixture')[0];
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

module('Route', {
  beforeEach: function() {
    Router.reset();

    // Register an empty template
    registerHandlebarsTemplate('empty', '', 'html');
  },
  afterEach: function() {
    window.history.replaceState(null, null, junitPath);
  }
});

test('startRoutingWithURI unvalid uri should return undefined', function() {
  notOk(Router.startRoutingWithURI('/foobar-1234'), 'startRoutingWithURI should throw error when route is not registered');
});

test('lifecycle', function(assert ) {
  var counter = 0;
  var path = '/signup/:invitationId';
  var uri = '/signup/123456?foo=bar#hash';
  var done = assert.async();

  Class(Route, {
    path: path,
    template: 'empty',

    enter: function() {
      counter++; // 1
    },

    preModel: function() {
      counter++; // 2
    },

    model: function() {
      counter++; // 3
    },

    render: function() {
      counter++; // 4
    },

    ready: function() {
      counter++; // 5
      equal(counter, 5, 'Hooks are not called properly');
      deepEqual(this.data, { args: { invitationId: "123456" }, queryParams: { foo: 'bar' }, hash: 'hash', model: null, i18n: {} }, 'Params are not passed to route instance ');
      equal(this.path, path, 'Handler path is not assigned correctly');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('i18n', function(assert ) {
  var path = '/signup/:invitationId';
  var uri = '/signup/123456?foo=bar#hash';
  var done = assert.async();
  var i18n_signup = {
    hello: 'Hello World',
    welcome: 'Welcome to %place'
  };

  Class(Route, {
    path: path,
    template: 'empty',
    i18n: wpm.i18n('signup'),

    ready: function() {
      deepEqual(this.data, { args: { invitationId: "123456" }, queryParams: { foo: 'bar' }, hash: 'hash', model: null, i18n: i18n_signup }, 'Params are not passed to route instance ');
      equal(this.path, path, 'Handler path is not assigned correctly');
      done();
    }
  });

  wpm.i18n('signup', i18n_signup);

  Router.transitionTo(uri);
});

test('Merge actions', function(assert ) {
  var Mixin1 = Class({
    actions: {
      foo1: function() {
        return 'foo1 from mixin1';
      },
      foo2: function() {
        return 'foo2 from mixin1';
      },
      foo3: function() {
        return 'foo3 from mixin1';
      }
    }
  });

  var Mixin2 = Class({
    actions: {
      foo2: function() {
        return 'foo2 from mixin2';
      },
      bar: function() {
        return 'bar from mixin2';
      }
    }
  });

  var R = Class([Route, Mixin1, Mixin2], {
    path: '/foo',
    template: 'empty',
    actions: {
      foo1: function() {
        return 'foo from route';
      }
    }
  });

  var route = new R();
  equal(route.actions.foo1(), 'foo from route');
  equal(route.actions.foo2(), 'foo2 from mixin2');
  equal(route.actions.foo3(), 'foo3 from mixin1');
  equal(route.actions.bar(), 'bar from mixin2');
});

test('Route properties accessing', function(assert ) {
  var path = '/signup/:invitationId/:companyId';
  var uri = '/signup/12345/67890?foo=foo1&bar=bar1#hash';
  var done = assert.async();
  var i18n_signup = {
    hello: 'Hello World',
    welcome: 'Welcome to %place'
  };
  wpm.i18n('signup', i18n_signup);

  Class(Route, {
    path: path,
    template: 'empty',
    i18n: wpm.i18n('signup'),

    ready: function() {
      var args = { invitationId: '12345', companyId: '67890' };
      var queryParams = { foo: 'foo1', bar: 'bar1' };
      var hash = 'hash';
      var id = this.id;

      this.data = null;
      deepEqual(this.data, { args: args, queryParams: queryParams, hash: hash, model: null, i18n: i18n_signup }, 'Params are not passed to route instance ');
      // Make sure data.args, queryParams, hash and this.id are readonly
      this.id = null;
      equal(this.id, id, 'id should be readonly');
      this.data.args = null;
      ok(!!this.data.args, 'data.args should be readonly');
      deepEqual(this.data.args, args, 'data.args should be readonly');
      this.data.queryParams = null;
      ok(!!this.data.queryParams, 'data.queryParams should be readonly');
      deepEqual(this.data.queryParams, queryParams, 'data.queryParams should be readonly');
      this.data.hash = null;
      ok(!!this.data.hash, 'data.hash should be readonly');
      equal(this.data.hash, hash, 'data.hash should be readonly');
      this.data.i18n.hello = null;
      deepEqual(this.data.i18n, i18n_signup, 'data.i18n should be readonly');
      this.data.i18n = null;
      ok(!!this.data.i18n, 'data.i18n should be readonly');
      deepEqual(this.data.i18n, i18n_signup, 'data.i18n should be readonly');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('preModel() returns null should not invoke render()', function(assert) {
  var counter = 0;
  var path = '/signup/:invitationId';
  var template = 'empty';
  var uri = '/signup/123456?foo=bar#hash';
  var done = assert.async();

  Class(Route, {
    path: path,
    template: template,

    preModel: function() {
      return undefined;
    },

    render: function() {
      counter++;
      equal(counter, 1, 'render() should be called once when preModel() returns null');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('preModel() returns non-null should invoke render()', function(assert) {
  var counter = 0;
  var path = '/signup/123456?foo=bar#hash';
  var done = assert.async();

  Class(Route, {
    path: '/signup/:invitationId',
    template: 'empty',

    preModel: function() {
      return 'something';
    },

    render: function() {
      counter++;
      Route.prototype.render.apply(this, arguments);
    },

    ready: function() {
      equal(counter, 2, 'render() must be called twice when preModel() returns !null');
      done();
    }
  });

  Router.transitionTo(path);
});

test('preModel() returns a promise should invoke render()', function(assert) {
  var counter = 0;
  var path = '/signup/123456?foo=bar#hash';
  var done = assert.async();

  Class(Route, {
    path: '/signup/:invitationId',
    template: 'empty',

    preModel: function() {
      return $.get(window.location.href);
    },

    render: function() {
      counter++;
    },

    ready: function() {
      equal(counter, 2, 'render() must be called twice when preModel() returns !null');
      done();
    }
  });

  Router.transitionTo(path);
});

test('Transition to another route from enter()', function(assert) {
  var paths = { browse: '/browse/:id', signin: '/signin' };
  var uris = { browse: '/browse/123', signin: '/signin?foo=bar' };
  var done = assert.async();
  var isSignedIn = false;
  var browseRoute;

  Class(Route, {
    path: paths.browse,
    template: 'empty',

    enter: function() {
      browseRoute = this;
      if (!isSignedIn) {
        this.router.transitionTo(uris.signin);
      }
    },

    preModel: function() {
      notOk(true, 'preModel() must not be called when push() is executed');
    },

    model: function() {
      notOk(true, 'model() must not be called when push() is executed');
    },

    ready: function() {
      notOk(true, 'ready() must not be called when push() is executed');
    }
  });

  Class(Route, {
    path: paths.signin,
    template: 'empty',

    enter: function() {
      ok(true, 'signin\'s enter() must be called');
    },

    ready: function() {
      equal(browseRoute.state, 'destroy', 'Transition a route before its ready() must set state to "destroy');
      ok(true, 'ready() must be called');
      equal(Router.routeURIFromLocation(), uris.signin, 'Location must match with route path');
      done();
    }
  });

  Router.transitionTo(uris.browse);
});

test('Transition to another route from preModel()', function(assert) {
  var paths = { browse: '/browse/:id', signin: '/signin' };
  var uris = { browse: '/browse/123', signin: '/signin?foo=bar' };
  var done = assert.async();
  var isSignedIn = false;

  Class(Route, {
    path: paths.browse,
    template: 'empty',

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      if (!isSignedIn) {
        this.router.transitionTo(uris.signin);
      }
    },

    model: function() {
      notOk(true, 'model() must not be called when push() is executed');
    },

    ready: function() {
      notOk(true, 'ready() must not be called when push() is executed');
    }
  });

  Class(Route, {
    path: paths.signin,
    template: 'empty',

    enter: function() {
      ok(true, 'signin\'s enter() must be called');
    },

    ready: function() {
      ok(true, 'ready() must be called');
      equal(Router.routeURIFromLocation(), uris.signin, 'Location must match with route path');
      done();
    }
  });

  Router.transitionTo(uris.browse);
});

test('Transition to another route from model()', function(assert) {
  var paths = { browse: '/browse/:id', signin: '/signin' };
  var uris = { browse: '/browse/123', signin: '/signin?foo=bar' };
  var done = assert.async();
  var isSignedIn = false;

  Class(Route, {
    template: 'empty',
    path: paths.browse,

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      ok(true, 'preModel() must be called');
    },

    model: function() {
      if (!isSignedIn) {
        this.router.transitionTo(uris.signin);
      }
    },

    ready: function() {
      notOk(true, 'ready() must not be called when push() is executed');
    }
  });

  Class(Route, {
    template: 'empty',
    path: paths.signin,

    enter: function() {
      ok(true, 'signin\'s enter() must be called');
    },

    ready: function() {
      ok(true, 'ready() must be called');
      equal(Router.routeURIFromLocation(), uris.signin, 'Location must match with route path');
      done();
    }
  });

  Router.transitionTo(uris.browse);
});

test('Transition to another route from ready()', function(assert) {
  var paths = { browse: '/browse/:id', signin: '/signin' };
  var uris = { browse: '/browse/123', signin: '/signin?foo=bar' };
  var done = assert.async();
  var isSignedIn = false;
  var browseRoute;

  registerHandlebarsTemplate('browse-abc', '<h1 id="browse-abc">Browse</h1>', 'html');
  registerHandlebarsTemplate('signin-abc', '<h1 id="signin-abc">Sign In</h1>', 'html');

  Class(Route, {
    path: paths.browse,
    template: 'browse-abc',
    renderTo: renderTo,

    enter: function() {
      browseRoute = this;
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      ok(true, 'preModel() must be called');
    },

    model: function() {
      ok(true, 'model() must be called');
    },

    ready: function() {
      ok($('#browse-abc').length === 1, 'Template must be rendered when ready()');
      ok($('#browse-abc').is(':visible'), 'Template content must be visible when ready()');
      if (!isSignedIn) {
        this.router.transitionTo(uris.signin);
      }
    }
  });

  Class(Route, {
    path: paths.signin,
    template: 'signin-abc',
    renderTo: renderTo,

    enter: function() {
      ok(true, 'signin\'s enter() must be called');
    },

    ready: function() {
      ok(true, 'ready() must be called');
      equal(browseRoute.state, 'pause', 'Transitioned route\'s state must be "pause"');
      equal(Router.routeURIFromLocation(), uris.signin, 'Location must match with route path');
      notOk($('#browse-abc').is(':visible'), 'Template content of the first route must be hidden when ready()');
      ok($('#signin-abc').length === 1, 'Template of the second route must be rendered when ready()');
      ok($('#signin-abc').is(':visible'), 'Template content of the second route must be visible when ready()');
      done();
    }
  });

  Router.transitionTo(uris.browse);
});

test('fail() on enter()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    enter: function() {
      return $.get('/some-invalid-url');
    },

    preModel: function() {
      notOk(true, 'preModel() must not be called');
    },

    model: function() {
      notOk(true, 'model() must not be called');
    },

    render: function() {
      notOk(true, 'render() must not be called');
    },

    ready: function() {
      notOk(true, 'ready() must not be called');
    },

    fail: function(error) {
      equal(this.state, 'enter', 'route should fail at enter');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('fail() on preModel()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      return $.get('/some-invalid-url');
    },

    model: function() {
      notOk(true, 'model() must not be called');
    },

    render: function() {
      notOk(true, 'render() must not be called');
    },

    ready: function() {
      notOk(true, 'ready() must not be called');
    },

    fail: function(error) {
      equal(this.state, 'preModel', 'route should fail at preModel');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('fail() on model()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      ok(true, 'preModel() must be called');
    },

    model: function() {
      return $.get('/some-invalid-url');
    },

    render: function() {
      notOk(true, 'render() must not be called');
    },

    ready: function() {
      notOk(true, 'ready() must not be called');
    },

    fail: function(error) {
      equal(this.state, 'model', 'route should fail at model');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('fail() on render()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      ok(true, 'preModel() must be called');
    },

    model: function() {
      ok(true, 'model() must be called');
    },

    render: function() {
      return $.get('/some-invalid-url');
    },

    ready: function() {
      notOk(true, 'ready() must not be called');
    },

    fail: function(error) {
      equal(this.state, 'render', 'route should fail at render');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('fail() on ready()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    enter: function() {
      ok(true, 'enter() must be called');
    },

    preModel: function() {
      ok(true, 'preModel() must be called');
    },

    model: function() {
      ok(true, 'model() must be called');
    },

    render: function() {
      ok(true, 'render() must be called');
    },

    ready: function() {
      return $.get('/some-invalid-url');
    },

    fail: function(error) {
      equal(this.state, 'ready', 'route should fail at ready');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('Transition from route to route with same type', function(assert) {
  var done = assert.async();
  var counter = 0;
  var firstPath = '/browse/1';
  var secondPath = '/browse/2';

  Class(Route, {
    path: '/browse/:id',
    template: 'empty',

    ready: function() {
      counter++;
      if (counter === 1) {
        ok(true, 'First transition should be made');
        equal(Router.routeURIFromLocation(), firstPath, 'Route location is not set on address bar correctly for first transition');
        this.router.transitionTo(secondPath);
      }
      else if (counter === 2) {
        ok(true, 'Second transition should be made');
        equal(Router.routeURIFromLocation(), secondPath, 'Route location is not set on address bar correctly for first transition');
        done();
      }
      else {
        notOk(true, 'Third transition should not be made');
      }
    }
  });

  Router.transitionTo(firstPath);
});

test('JavaScript error inside Route should be redirected to fail()', function(assert) {
  var done = assert.async();
  var exception = 'there is some error';

  Class(Route, {
    path: '/browse_enter/:id',
    template: 'empty',

    enter: function() { throw exception; },
    preModel: function() {},
    model: function() {},
    render: function() {},
    ready: function() {},

    fail: function(error) {
      equal(this.state, 'enter', 'enter() should throw an exception');
      equal(error, exception, 'wrong exception is thrown');
      this.router.transitionTo('/browse_premodel/123');
    }
  });

  Class(Route, {
    path: '/browse_premodel/:id',
    template: 'empty',

    enter: function() {},
    preModel: function() { throw exception; },
    model: function() {},
    render: function() {},
    ready: function() {},

    fail: function(error) {
      equal(this.state, 'preModel', 'preModel() should throw an exception');
      equal(error, exception, 'wrong exception is thrown');
      this.router.transitionTo('/browse_model/123');
    }
  });

  Class(Route, {
    path: '/browse_model/:id',
    template: 'empty',

    enter: function() {},
    preModel: function() {},
    model: function() { throw exception; },
    render: function() {},
    ready: function() {},

    fail: function(error) {
      equal(this.state, 'model', 'model() should throw an exception');
      equal(error, exception, 'wrong exception is thrown');
      this.router.transitionTo('/browse_ready/123');
    }
  });

  Class(Route, {
    path: '/browse_ready/:id',
    template: 'empty',

    enter: function() {},
    preModel: function() {},
    model: function() {},
    render: function() {},
    ready: function() { throw exception; },

    fail: function(error) {
      equal(this.state, 'ready', 'ready() should throw an exception');
      equal(error, exception, 'wrong exception is thrown');
      done();
    }
  });

  Router.transitionTo('/browse_enter/123');
});

test('JavaScript error inside Route should be redirected to fail() - cont', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse_enter/:id',
    template: 'empty',

    enter: function() {
      // Throw some error here
      helloworld;
    },
    preModel: function() {},
    model: function() {},
    render: function() {},
    ready: function() {},

    fail: function(error) {
      equal(this.state, 'enter', 'enter() should throw an exception');
      ok(error, 'error object should be thrown');
      ok(error.message.indexOf('helloworld') !== -1, '"' + error.message + '" should contain helloworld');
      ok(error.name, 'error.name should be provided');
      ok(error.stack, 'stack should be provided as: ' + error.stack);
      done();
    }
  });

  Router.transitionTo('/browse_enter/123');
});

test('Title should be updated accordingly', function(assert) {
  var done = assert.async();
  var runOnce;

  Class(Route, {
    path: '/index',
    template: 'empty',
    title: 'Index',

    ready: function() {
      equal(document.title, 'Index', 'Index title should be updated properly');
      if (!runOnce) {
        runOnce = true;
        this.router.transitionTo('/signin');
      }
      else {
        equal(document.title, 'Index', 'Index title should be updated properly on resume()');
        done();
      }
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'empty',
    title: 'Sign In',
    ready: function() {
      equal(document.title, 'Sign In', 'Sign In title should be updated properly');
      this.router.replaceWith('/index');
    }
  });

  Router.transitionTo('/index');
});
