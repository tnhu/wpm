/*globals test, ok, equal, notOk, module*/

var Router = wpm.Router;
var Route = wpm.Route;
var junitPath = Router.routeURIFromLocation();
var renderTo = $('#qunit-fixture')[0];
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

module('Nested Route', {
  beforeEach: function() {
    Router.reset();

    // Register an empty template
    registerHandlebarsTemplate('empty', '');
  },
  afterEach: function() {
    window.history.replaceState(null, null, junitPath);
  }
});

test('Outlet element', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo,

    ready: function() {
      ok(!!this.outlet, 'Outlet element is not set properly');
      done();
    }
  });

  Router.transitionTo('/inbox');
});

test('Default nested route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox-default"><h1>Inbox</h1><div outlet></div></div>');
  registerHandlebarsTemplate('inbox-list', '<p class="list">List</p>');

  var uri = '/inbox';

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|',
    template: 'inbox-list',

    ready: function() {
      ok(true, 'Nested route is ready');
      ok(!!$('#inbox-default').length, 'parent route should be rendered');
      ok(!!$('#inbox-default p.list').length, 'default sub route should be rendered');
      equal($('#inbox-default p.list').text(), 'List', 'default sub route content should be rendered');
      equal(Router.routeURIFromLocation(), uri, 'Browse location should match with nested route uri');
      done();
    }
  });

  Router.transitionTo('/inbox');
});

test('Second nested route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox-nested"><h1>Inbox</h1><div outlet></div></div>');
  registerHandlebarsTemplate('inbox-new', '<p class="new">New</p>');

  var uri = '/inbox/new';

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      ok(true, 'Nested route is ready');
      ok(!!$('#inbox-nested').length, 'parent route should be rendered');
      ok(!!$('#inbox-nested p.new').length, 'sub route should be rendered');
      equal($('#inbox-nested p.new').text(), 'New', 'sub route content should be rendered');
      equal(Router.routeURIFromLocation(), uri, 'Browse location should match with nested route uri');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('Third level nested route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');

  var uri = '/inbox/new/draft';

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',

    template: 'inbox-new',

    ready: function() {
      ok(true, 'Second level is rendered correctly');
    }
  });

  Class(Route, {
    path: '/inbox/new|/draft',

    template: 'inbox-draft',

    ready: function() {
      ok(true, 'Third level route is rendered');

      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      equal($('#inbox p.new p.draft').text(), 'Draft', 'sub route content should be rendered');
      equal(Router.routeURIFromLocation(), uri, 'Browse location should match with nested route uri');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('Transition directly to child route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('index', '<div id="index"><div outlet></div></div>');
  registerHandlebarsTemplate('inbox', '<p id="inbox">Inbox</p>');

  Class(Route, {
    path: '/',
    template: 'index',
    renderTo: renderTo,

    fail: function() {
      notOk(true, 'Parent fail() should not be called');
    },

    ready: function() {
      ok(true, 'Parent ready() should be called');
    },

    resign: function() {
      notOk(true, 'Parent resign() should not be called');
    },

    pause: function() {
      notOk(true, 'Parent pause() should not be called');
    }
  });

  Class(Route, {
    path: '/|inbox',
    template: 'inbox',

    ready: function() {
      ok(true, 'Child ready() should be called');
      equal(this.state, 'ready', 'Child status should be ready');
      equal(this.parentRoute.state, 'ready', 'Parent status should be ready');
      done();
    }
  });

  Router.transitionTo('/inbox');
});

test('Parent transitions to its child', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('index', '<div id="index"><div outlet></div></div>');
  registerHandlebarsTemplate('inbox', '<p id="inbox">Inbox</p>');

  Class(Route, {
    path: '/',
    template: 'index',
    renderTo: renderTo,

    fail: function() {
      notOk(true, 'Parent fail() should not be called');
    },

    ready: function() {
      ok(true, 'Parent ready() should be called');
      Router.transitionTo('/inbox');
    },

    resign: function() {
      notOk(true, 'Parent resign() should not be called');
    },

    pause: function() {
      notOk(true, 'Parent pause() should not be called');
    }
  });

  Class(Route, {
    path: '/|inbox',
    template: 'inbox',

    ready: function() {
      ok(true, 'Child ready() should be called');
      equal(this.state, 'ready', 'Child status should be ready');
      equal(this.parentRoute.state, 'ready', 'Parent status should be ready');
      done();
    }
  });

  Router.transitionTo('/');
});

test('queryParams in child and parent routes', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('index', '<div id="index"><div outlet></div></div>');
  registerHandlebarsTemplate('inbox', '<p id="inbox">Inbox</p>');

  var queryParams = {a: "1", b: "2", c: "3"};

  Class(Route, {
    path: '/',
    template: 'index',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/|inbox',
    template: 'inbox',

    ready: function() {
      ok(true, 'Child ready() should be called');
      deepEqual(this.data.queryParams, queryParams, 'queryParams in child not set properly');
      deepEqual(this.parentRoute.data.queryParams, queryParams, 'queryParams in parent route not set properly');
      done();
    }
  });

  Router.transitionTo('/inbox?a=1&b=2&c=3');
});


test('Second and default level nested route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');
  registerHandlebarsTemplate('inbox-new', '<p class="new">New</p>');
  registerHandlebarsTemplate('inbox-list', '<p>List</p>');

  var uri = '/inbox/new';

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|',
    template: 'inbox-list',

    ready: function() {
      notOk(true, 'Default route should not be called during sub-route routing');
    }
  });

  Class(Route, {
    path: '/inbox|/new',

    template: 'inbox-new',

    ready: function() {
      ok(true, 'Nested route is ready');
      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      equal($('#inbox p.new').text(), 'New', 'sub route content should be rendered');
      equal(Router.routeURIFromLocation(), uri, 'Browse location should match with nested route uri');
      done();
    }
  });

  Router.transitionTo(uri);
});

test('Hide and deactivate nested routes', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');                // /inbox/new/draft
  registerHandlebarsTemplate('inbox-sent', '<p class="sent">Sent</p>');                   // /inbox/sent

  var draftURI = '/inbox/new/draft?a=b&c=d';
  var sentURI = '/inbox/sent?a=b&c=d';

  var draftResign, draftHide, newResign, newHide;

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      ok(true, 'Second level is rendered correctly');
    },

    resign: function() {
      newResign = true;
    },

    hide: function() {
      newHide = true;
      Route.prototype.hide.call(this);
    }
  });

  Class(Route, {
    path: '/inbox/new|/draft',
    template: 'inbox-draft',

    ready: function() {
      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      equal($('#inbox p.new p.draft').text(), 'Draft', 'sub route content should be rendered');

      ok($('#inbox').is(':visible'), 'parent route /inbox shoud be visible');
      ok($('#inbox .new').is(':visible'), 'parent route /inbox/new shoud be visible');
      ok($('#inbox .new .draft').is(':visible'), 'route /inbox/new/draft shoud be visible');

      equal(Router.routeURIFromLocation(), draftURI, 'Browse location should match with nested route uri');

      // Transition to /inbox/sent
      Router.transitionTo(sentURI);
    },

    resign: function() {
      draftResign = true;
    },

    hide: function() {
      draftHide = true;
      Route.prototype.hide.call(this);
    }
  });

  Class(Route, {
    path: '/inbox|/sent',
    template: 'inbox-sent',

    ready: function() {
      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      equal($('#inbox p.new p.draft').text(), 'Draft', 'sub route content should be rendered');
      equal(Router.routeURIFromLocation(), sentURI, 'Browse location should match with nested route uri');

      ok($('#inbox').is(':visible'), 'parent route /inbox shoud be visible');
      ok($('#inbox .sent').is(':visible'), 'route /inbox/sent shoud be visible');

      // /inbox/new and /inbox/new/draft should be hidden
      notOk($('#inbox .new').is(':visible'), 'inactive route /inbox/new shoud be hidden');
      notOk($('#inbox .new .draft').is(':visible'), 'route /inbox/new/draft shoud be hidden');

      ok(draftResign, 'Draft resign() should be called');
      ok(draftHide, 'Draft hide() should be called');

      ok(newResign, 'Inbox New resign() should be called');
      ok(newHide, 'Inbox new hide() should be called');
      done();
    }
  });

  Router.transitionTo(draftURI);
});

test('Reject resign request', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');                // /inbox/new/draft
  registerHandlebarsTemplate('inbox-sent', '<p class="sent">Sent</p>');                   // /inbox/sent

  var draftURI = '/inbox/new/draft?a=b&c=d';
  var sentURI = '/inbox/sent?a=b&c=d';
  var runOnce;

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
    },

    resign: function() {
      notOk(true, 'parent resign() should not be called when child already resigned');
    },

    hide: function() {
      Route.prototype.hide.call(this);
      notOk(true, 'parent hide() should not be called when child already resigned');
    }
  });

  Class(Route, {
    path: '/inbox/new|/draft',
    template: 'inbox-draft',

    ready: function() {
      console.log(this.path, 'at state', this.state);

      if (!runOnce) {
        runOnce = true;
        Router.transitionTo(sentURI);
      }
    },

    resign: function() {
      console.log(this.path, 'at state', this.state);
      return new Promise(function(fulfill, reject) {
        reject();
      }).then();
    },

    resume: function() {
      ok(true, 'resign() works properly - trigger ready() for the second time');
      done();
    },

    hide: function() {
      Route.prototype.hide.call(this);
      notOk(true, 'hide() should not be called when already resigned');
    }
  });

  Class(Route, {
    path: '/inbox|/sent',
    template: 'inbox-sent',

    ready: function() {
      notOk(true, 'ready() should not be called');
    }
  });

  Router.transitionTo(draftURI);
});

test('Resume nested route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');                // /inbox/new/draft
  registerHandlebarsTemplate('inbox-sent', '<p class="sent">Sent</p>');                   // /inbox/sent

  var draftURI = '/inbox/new/draft?a=b&c=d';
  var sentURI = '/inbox/sent?a=b&c=d';

  var resumeDraft, resumeNew;

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      if (resumeDraft) {
        resumeNew = true;
      }
    }
  });

  Class(Route, {
    path: '/inbox/new|/draft',
    template: 'inbox-draft',

    ready: function() {
      if (!resumeDraft) {
        Router.transitionTo(sentURI);  // Transition to /inbox/sent
      }
      else {
        equal(Router.routeURIFromLocation(), draftURI, 'Location should be set properly');
        ok(true, 'resumed route ready() is called properly');
        ok(resumeNew, 'resume parent route ready() should be called');
        done();
      }
    }
  });

  Class(Route, {
    path: '/inbox|/sent',
    template: 'inbox-sent',

    ready: function() {
      resumeDraft = true;
      window.history.go(-1);
    }
  });

  Router.transitionTo(draftURI);
});

test('Transition from default route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-listing', '<p class="listing">Default View</p>');     // /inbox default view
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|',
    template: 'inbox-listing',
    ready: function() {
      Router.transitionTo('/inbox/new');
    }
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      ok(!!$('#inbox').length, 'parent route should be rendered');
      notOk($('#inbox p.listing').is(':visible'), 'Default route should be hidden');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      ok($('#inbox p.new').is(':visible'), 'sub route should be visible');
      done();
    }
  });

  Router.transitionTo('/inbox');
});

test('Transition back to parent route', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-listing', '<p class="listing">Default View</p>');     // /inbox default view
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/',
    template: 'inbox-listing',
    ready: function() {
      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok($('#inbox p.listing').is(':visible'), 'Default route should be hidden');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      notOk($('#inbox p.new').is(':visible'), 'sub route should be visible');
      done();
    }
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      Router.transitionTo('/inbox/');
    }
  });

  Router.transitionTo('/inbox/new');
});

test('Transition back to parent route (2)', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-listing', '<p class="listing">Default View</p>');     // /inbox default view
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo,
    ready: function() {
      ok(true, 'Default route should be routed before default nested route.');
    }
  });

  Class(Route, {
    path: '/inbox|',
    template: 'inbox-listing',
    ready: function() {
      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok($('#inbox p.listing').is(':visible'), 'Default route should be hidden');
      ok(!!$('#inbox p.new').length, 'sub route should be rendered');
      notOk($('#inbox p.new').is(':visible'), 'sub route should be visible');
      done();
    }
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      Router.transitionTo('/inbox');
    }
  });

  Router.transitionTo('/inbox/new');
});

test('Transition back and forth', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-listing', '<p class="listing">Default View</p>');     // /inbox default view
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new

  var runOnce;

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo,
    ready: function() {
      if (!runOnce) {
        Router.transitionTo('/inbox/listing');
        runOnce = true;
      }
      else {
        notOk(true, 'parent route should not be re-rendered when transitioning to its children');
      }
    },
    resign: function() {
      notOk(true, 'parent resign() should not be called when transitioning to its children');
    }
  });

  Class(Route, {
    path: '/inbox|/listing',
    template: 'inbox-listing',
    ready: function() {
      Router.transitionTo('/inbox/new');
    }
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',

    ready: function() {
      ok($('#inbox').is(':visible'), 'sub route should be visible');
      ok($('#inbox p.new').is(':visible'), 'new route should be visible');
      notOk($('#inbox p.listing').is(':visible'), 'listing route should not be visible');

      ok(!!$('#inbox').length, 'parent route should be rendered');
      ok(!!$('#inbox p.new').length, 'new route should be rendered');
      ok(!!$('#inbox p.listing').length, 'listing route should be rendered');
      done();
    }
  });

  Router.transitionTo('/inbox');
});

test('Transition from sub to not-yet-created parent', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');                // /inbox/new/draft

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new'
  });

  Class(Route, {
    path: '/inbox/new|/draft',
    template: 'inbox-draft',
    ready: function() {
      this.router.transitionTo('/inbox/new');
    },

    pause: function() {
      ok(true, 'pause() is called properly');
      notOk($('#inbox p.draft').is(':visible'), 'Draft should not be visible');
      done();
    }
  });

  Router.replaceWith('/inbox/new/draft');
});

test('Resume an active route from its child', function(assert) {
  var done = assert.async();

  registerHandlebarsTemplate('inbox', '<div id="inbox"><h1>Inbox</h1><div outlet></div></div>');   // /inbox
  registerHandlebarsTemplate('inbox-new', '<p class="new">New<div outlet></div></p>');             // /inbox/new
  registerHandlebarsTemplate('inbox-draft', '<p class="draft">Draft</p>');                // /inbox/new/draft

  var runOnce;

  Class(Route, {
    path: '/inbox',
    template: 'inbox',
    renderTo: renderTo
  });

  Class(Route, {
    path: '/inbox|/new',
    template: 'inbox-new',
    ready: function() {
      if (!runOnce) {
        this.router.transitionTo('/inbox/new/draft');
        runOnce = true;
      }
      else {
        notOk(true, 'parent ready() should not be called when transition from an active child');
      }
    }
  });

  Class(Route, {
    path: '/inbox/new|/draft',
    template: 'inbox-draft',
    ready: function() {
      ok(true, 'Transition to parent');
      this.router.transitionTo('/inbox/new');
    },
    pause: function() {
      ok(true, 'ready() is called properly');
      notOk($('#inbox p.draft').is(':visible'), 'Draft should not be visible');
      done();
    }
  });

  Router.replaceWith('/inbox/new');
});
