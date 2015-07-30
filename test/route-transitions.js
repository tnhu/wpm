/*globals $, test, ok, module, notEqual*/

var Router = wpm.Router;
var Route = wpm.Route;
var path = Router.routeURIFromLocation();
var renderTo = $('#qunit-fixture')[0];
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

module('Route Transitions', {
  beforeEach: function() {
    Router.reset();
  },
  afterEach: function() {
    $('#wpm-div').remove();
    window.history.replaceState(null, null, path);
  }
});

test('replaceWith', function(assert) {
  var done = assert.async();
  var isSignedIn, firstIndexInstance;

  registerHandlebarsTemplate('index', '<div class="index"><div outlet></div></div>');
  registerHandlebarsTemplate('signin', '<div class="signin"><div outlet></div></div>');

  Class(Route, {
    path: '/',
    template: 'index',
    renderTo: renderTo,

    constructor: function IndexRoute() {
    },

    ready: function() {
      if (!isSignedIn) {
        isSignedIn = true;
        firstIndexInstance = this;
        ok(true, 'first / route routed properly');
        this.router.replaceWith('/signin');
      }
      else {
        ok(true, 'second / route routed properly');
        notEqual(this, firstIndexInstance, 'Second route should have second instance');
        done();
      }
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin',
    renderTo: renderTo,

    constructor: function SignInRoute() {
    },

    ready: function() {
      ok(true, '/signin route routed properly');
      this.router.replaceWith('/');
    },

    exit: function() {
      ok(true, 'exit() is called properly');
    },

    unobserve: function() {
      ok(true, 'unobserve() is called properly');
      return Route.prototype.unobserve.apply(this, arguments);
    },

    destroy: function() {
      ok(true, 'destroy() is called properly');
      return Route.prototype.destroy.apply(this, arguments);
    }
  });

  Router.transitionTo('/');
});

test('abort at enter()', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('browse', '<div id="browse">Browse<div outlet></div></div>');
  registerHandlebarsTemplate('signin', '<div id="signin">SignIn<div outlet></div></div>');

  Class(Route, {
    path: '/signout',

    enter: function() {
      this.router.replaceWith('/signin');
    }
  });

  Class(Route, {
    path: '/browse',
    template: 'browse',
    renderTo: renderTo,

    ready: function() {
      this.router.transitionTo('/signout');
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin',
    renderTo: renderTo,

    ready: function() {
      ok(true, '/signin route routed properly');
      ok($('#browse').is(':hidden'), 'browse route should not be visible');
      done();
    }
  });

  Router.transitionTo('/browse');
});

test('navigateTo()', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('index1', '<h1 id="index1">Index 1</h1>');
  registerHandlebarsTemplate('index2', '<h1 id="index2">Index 2</h1>');
  registerHandlebarsTemplate('index3', '<h1 id="index3">Index 3</h1>');

  Class(Route, {
    path: '/1',
    template: 'index1',
    renderTo: renderTo,
    ready: function() {
      Router.navigateTo('/2');
    },
    resign: function() {
      ok(true, 'index1 resign() called properly');
    },
    pause: function() {
      ok(true, 'index1 pause() called properly');
    },
    exit: function() {
      ok(true, 'index1 exit() called properly');
    }
  });

  Class(Route, {
    path: '/2',
    template: 'index2',
    renderTo: renderTo,
    ready: function() {
      Router.navigateTo('/3');
    },
    resign: function() {
      ok(true, 'index2 resign() called properly');
    },
    pause: function() {
      ok(true, 'index2 pause() called properly');
    },
    exit: function() {
      ok(true, 'index2 exit() called properly');
      Route.prototype.exit.apply(this, arguments);

      setTimeout(function() {
        ok(!!document.getElementById('index3'), 'index3 should be placed in DOM');
        ok(!document.getElementById('index1'), 'index1 should be removed from DOM');
        ok(!document.getElementById('index2'), 'index2 should be removed from DOM');
        done();
      }, 3100);
    }
  });

  Class(Route, {
    path: '/3',
    template: 'index3',
    renderTo: renderTo
  });

  Router.navigateTo('/1');
});
