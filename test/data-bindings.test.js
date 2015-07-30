/*globals test, ok, wpm, Class, equal, module, deepEqual, notOk*/

var Router = wpm.Router;
var Route = wpm.Route;

var junitPath = Router.routeURIFromLocation();
var renderTo = $('#qunit-fixture')[0];

var click = wpm.TestUtils.click;
var keydown = wpm.TestUtils.keydown;
var mousedown = wpm.TestUtils.mousedown;
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

// With Babel turned on:
// var {click, keydown, mousedown} = wpm.TestUtils;

module('Data bindings', {
  beforeEach: function() {
    Router.reset();
  },
  afterEach: function() {
    window.history.replaceState(null, null, junitPath);
  }
});

test('Route data properties -> DOM values', function(assert) {
  var done = assert.async();
  var html = '<h1 id="foo">{{message}}</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    enter: function() {
      this.data.message = 'Hello World';
    },

    ready: function() {
      var message = $('#foo').text();
      equal(message, 'Hello World', 'Binding from route to DOM is not handled properly');
      done();
    }
  });

  Router.transitionTo('/');
});

test('Route data.model properties -> DOM values', function(assert) {
  var done = assert.async();
  var html = '<h1 id="foo">{{model.message}}</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      return {message: 'Hello World'};
    },

    ready: function() {
      var message = $('#foo').text();
      equal(message, 'Hello World', 'Binding from route to DOM is not handled properly');
      done();
    }
  });

  Router.transitionTo('/');
});

test('Route data.args properties -> DOM values', function(assert) {
  var done = assert.async();
  var html = '<h1 id="foo">{{args.message}}</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/:message',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      var message = $('#foo').text();
      equal(message, 'Hello World', 'Binding from route to DOM is not handled properly');
      done();
    }
  });

  Router.transitionTo('/Hello World');
});

test('Route data.hash properties -> DOM values', function(assert) {
  var done = assert.async();
  var html = '<h1 id="foo">{{hash}}</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/:message',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      var message = $('#foo').text();
      equal(message, 'top_right_bottom_left', 'Binding from route to DOM is not handled properly');
      done();
    }
  });

  Router.transitionTo('/Hello World#top_right_bottom_left');
});

test('Route data.queryParams properties -> DOM values', function(assert) {
  var done = assert.async();
  var html = '<h1 id="foo">{{queryParams.message}}</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      var message = $('#foo').text();
      equal(message, 'Hello World', 'Binding from route to DOM is not handled properly');
      done();
    }
  });

  Router.transitionTo('/?message=Hello World');
});

test('DOM input values -> Route data', function(assert) {
  var done = assert.async();
  var html = '<div><input id="foo" type="text" binding="message" value="{{message}}"></div>';
  var msg = 'Today is a good day';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    enter: function() {
      this.data.message = msg;
    },

    ready: function() {
      equal(this.data.message, msg, 'Binding from DOM to route is not handled properly'); // data.message !== undefined, DOM input must reflect
      var message = $('#foo').val();
      equal(message, msg, 'DOM input does not relect data properties properly');
      done();
    }
  });

  Router.transitionTo('/?message=Hello World');
});
