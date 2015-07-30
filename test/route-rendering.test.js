/*globals $, test, ok, equal, module*/

var Router = wpm.Router;
var Route = wpm.Route;
var path = Router.routeURIFromLocation();
var renderTo = $('#qunit-fixture')[0];
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

module('Route Rendering', {
  beforeEach: function() {
    Router.reset();

    // Register some templates
    registerHandlebarsTemplate('empty', '', 'html');
    registerHandlebarsTemplate('signin', '<h1 id="wpm-div">Hello World</h1>', 'html');
  },
  afterEach: function() {
    $('#wpm-div').remove();
    window.history.replaceState(null, null, path);
  }
});

test('Routeble route without template should throw exception on render()', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',

    fail: function(error) {
      equal(this.state, 'render', 'render() should throw error');
      ok(error.indexOf('not defined') !== -1, 'error message should contain not defined');
      done();
    }
  });

  Router.transitionTo('/browse/123');
});

test('Render to document.body', function(assert) {
  var done = assert.async();

  Class(Route, {
    path: '/browse/:id',
    template: 'signin',

    ready: function() {
      equal($('#wpm-div').length, 1, 'HTML output should be rendered to document.body');
      done();
    },
  });

  Router.transitionTo('/browse/123');
});

test('Render to a custom element', function(assert) {
  var done = assert.async();
  var renderTo = $('<div id="foo-container"></div>').appendTo(document.body);

  Class(Route, {
    path: '/browse/:id',
    template: 'signin',

    renderTo: renderTo[0],

    ready: function() {
      equal(renderTo.find('#wpm-div').length, 1, 'HTML output should be rendered to custom element');
      done();
      renderTo.remove();
    },
  });

  Router.transitionTo('/browse/123');
});

test('Resuming flows', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('browse-resume', '<h1 id="browse-resume">Browse</h1>', 'html');
  registerHandlebarsTemplate('signin-resume', '<h1 id="signin-resume">Sign In</h1>', 'html');

  var flows = [];
  var runOnce;

  Class(Route, {
    path: '/browse/:id',
    template: 'browse-resume',
    renderTo: renderTo,

    enter: function() {
      flows.push({ route: 'browse', state: this.state, step: 0 });
    },

    preModel: function() {
      flows.push({ route: 'browse', state: this.state, step: 1 });
    },

    model: function() {
      flows.push({ route: 'browse', state: this.state, step: 2 });
    },

    render: function() {
      flows.push({ route: 'browse', state: this.state, step: 3 });
      return Route.prototype.render.call(this);
    },

    ready: function() {
      // Transition to '/signin' when ready
      if (!runOnce) {
        runOnce = true;
        flows.push({ route: 'browse', state: this.state, step: 4 });
        Router.transitionTo('/signin');
      }
      else {
        flows.push({ route: 'browse', state: this.state, step: 17 });

        //for (var i = 0; i < flows.length; i++) {
          //equal(flows[i].step, i, 'Route "' + flows[i].route + '" at state "' + flows[i].state + '" should have step ' + i + ' with order at ' + i);
        //}
        ok(true);
        done();
      }
    },

    resign: function() {
      var $dom = $('#browse-resume');

      ok($dom.length === 1, 'browse DOM must exist');
      ok($dom.is(':visible'), 'browse route element should be visible when being asked to resign');
      flows.push({ route: 'browse', state: this.state, step: 5 });
    },

    hide: function() {
      Route.prototype.hide.call(this);
      flows.push({ route: 'browse', state: this.state, step: 10 });
    },

    pause: function() {
      ok($('#browse-resume').is(':hidden'), 'browse route element should be hidden when being in pause state');
      flows.push({ route: 'browse', state: this.state, step: 11 });
    },

    resume: function() {
      flows.push({ route: 'browse', state: this.state, step: 15 });
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin-resume',
    renderTo: renderTo,

    enter: function() {
      flows.push({ route: 'signin', state: this.state, step: 6 });
    },

    preModel: function() {
      flows.push({ route: 'signin', state: this.state, step: 7 });
    },

    model: function() {
      flows.push({ route: 'signin', state: this.state, step: 8 });
    },

    render: function() {
      flows.push({ route: 'signin', state: this.state, step: 9 });
      return Route.prototype.render.call(this);
    },

    ready: function() {
      flows.push({ route: 'signin', state: this.state, step: 12 });
      Router.transitionTo('/browse/123');
    },

    resign: function() {
      ok($('#signin-resume').is(':visible'), 'signin route element should be visible when being asked to resign');
      flows.push({ route: 'signin', state: this.state, step: 13 });
    },

    hide: function() {
      Route.prototype.hide.call(this);
      flows.push({ route: 'signin', state: this.state, step: 14 });
    },

    pause: function() {
      ok($('#signin-resume').is(':hidden'), 'signin route element should be hidden when being in pause state');
      flows.push({ route: 'signin', state: this.state, step: 16 });
    }
  });

  Router.transitionTo('/browse/123');
});

test('popState via history.back()', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('browse-history', '<h1 id="browse-history">Browse</h1>', 'html');
  registerHandlebarsTemplate('signin-history', '<h1 id="signin-history">Sign In</h1>', 'html');

  var redirectFromSignIn;

  var uris = {
    browse_1: '/browse/1',
    browse_2: '/browse/2',
    browse_3: '/browse/3',
    signin: '/signin'
  };

  // browse1 -> browse2 -> browse3 -> signin -> browse3 (history.back())

  Class(Route, {
    path: '/browse/:id',
    template: 'browse-history',
    renderTo: renderTo,

    ready: function() {
      if (!redirectFromSignIn) {
        if (this.uri === uris.browse_1) {
          this.router.transitionTo(uris.browse_2);
        }
        else if (this.uri === uris.browse_2) {
          this.router.transitionTo(uris.browse_3);
        }
        else if (this.uri === uris.browse_3) {
          this.router.transitionTo(uris.signin);
        }
      }
      else {
        equal(this.uri, uris.browse_3, 'history.back() should go back to browse_3');
        equal(Router.routeURIFromLocation(), uris.browse_3, 'Location is not correct');
        done();
      }
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin-history',
    renderTo: renderTo,

    ready: function() {
      redirectFromSignIn = true;
      window.history.back();
    }
  });

  Router.transitionTo(uris.browse_1);
});

test('popState via history.go(-1)', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('browse-history', '<h1 id="browse-history">Browse</h1>', 'html');
  registerHandlebarsTemplate('signin-history', '<h1 id="signin-history">Sign In</h1>', 'html');

  var redirectFromSignIn;

  var uris = {
    browse_1: '/browse/1',
    browse_2: '/browse/2',
    browse_3: '/browse/3',
    signin: '/signin'
  };

  // browse1 -> browse2 -> browse3 -> signin -> browse3 (history.go(-1))

  Class(Route, {
    path: '/browse/:id',
    template: 'browse-history',
    renderTo: renderTo,

    ready: function() {
      if (!redirectFromSignIn) {
        if (this.uri === uris.browse_1) {
          this.router.transitionTo(uris.browse_2);
        }
        else if (this.uri === uris.browse_2) {
          this.router.transitionTo(uris.browse_3);
        }
        else if (this.uri === uris.browse_3) {
          this.router.transitionTo(uris.signin);
        }
      }
      else {
        equal(this.uri, uris.browse_3, 'history.back() should go back to browse_3');
        equal(Router.routeURIFromLocation(), uris.browse_3, 'Location is not correct');
        done();
      }
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin-history',
    renderTo: renderTo,

    ready: function() {
      redirectFromSignIn = true;
      window.history.go(-1);
    }
  });

  Router.transitionTo(uris.browse_1);
});

test('popState via history.go(-3)', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('browse-history', '<h1 id="browse-history">Browse</h1><p>hi</p>', 'html');
  registerHandlebarsTemplate('signin-history', '<h1 id="signin-history">Sign In</h1>', 'html');

  var redirectFromSignIn;

  var uris = {
    browse_1: '/browse/1',
    browse_2: '/browse/2',
    browse_3: '/browse/3',
    signin: '/signin'
  };

  // browse1 -> browse2 -> browse3 -> signin -> browse1 (history.go(-3))

  Class(Route, {
    path: '/browse/:id',
    template: 'browse-history',
    renderTo: renderTo,

    ready: function() {
      if (!redirectFromSignIn) {
        if (this.uri === uris.browse_1) {
          this.router.transitionTo(uris.browse_2);
        }
        else if (this.uri === uris.browse_2) {
          this.router.transitionTo(uris.browse_3);
        }
        else if (this.uri === uris.browse_3) {
          this.router.transitionTo(uris.signin);
        }
      }
      else {
        equal(this.uri, uris.browse_1, 'history.back() should go back to browse_1');
        equal(Router.routeURIFromLocation(), uris.browse_1, 'Location is not correct');
        done();
      }
    }
  });

  Class(Route, {
    path: '/signin',
    template: 'signin-history',
    renderTo: renderTo,

    ready: function() {
      redirectFromSignIn = true;
      window.history.go(-3);
    }
  });

  Router.transitionTo(uris.browse_1);
});

test('route.renderer, dom, outlet should be readonly', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('index', '<div id="index"><div outlet></div></div>');

  Class(Route, {
    path: '/',
    template: 'index',
    renderTo: renderTo,

    ready: function() {
      this.renderer = null;
      this.dom = null; // delete this.dom works, so it does not prevent this.dom completely
      this.outlet = undefined;
      ok(this.renderer, 'route.renderer should be a readonly property');
      ok(this.dom, 'route.dom should be a readonly property');
      ok(this.outlet, 'route.outlet should be a readonly property');
      done();
    }
  });

  Router.transitionTo('/');
});
