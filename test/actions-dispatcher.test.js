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

module('Route Actions', {
  beforeEach: function() {
    Router.reset();
  },
  afterEach: function() {
    window.history.replaceState(null, null, junitPath);
  }
});

test('Simple click', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(event, element) {
        ok(true, 'Click handler is bound properly');
        ok(!!event, 'Event should be passed properly');
        ok(!!element, 'Element should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Simple click with parentheses', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere()">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(event, element) {
        ok(!!event, 'Event should be passed properly');
        ok(!!element, 'Element should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing a integer value', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(1)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(value) {
        deepEqual(value, 1, 'Value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing a float value', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(1.23456789)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(value) {
        deepEqual(value, 1.23456789, 'Value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing a string value', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(\'hello\')">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(value) {
        deepEqual(value, 'hello', 'Value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing boolean true', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(true)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(value) {
        deepEqual(value, true, 'Value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing boolean false', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(false)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(value) {
        deepEqual(value, false, 'Value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing numbers, booleans, string', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(1234, 1.234, false, \'string\', true)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(intValue, floatValue, falseValue, stringValue, trueValue) {
        deepEqual(intValue, 1234, 'Int value should be passed properly');
        deepEqual(floatValue, 1.234, 'Float value should be passed properly');
        deepEqual(falseValue, false, 'False value should be passed properly');
        deepEqual(stringValue, 'string', 'String value should be passed properly');
        deepEqual(trueValue, true, 'True value should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Passing single argument directly from data', function(assert) {
  var done = assert.async();
  var html = '<div><h1 action="clickHere1(id)">Hi</h1><h2 action="clickHere2(hash)"></h2></div>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      this.data.id = 9999;
    },

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere1: function(id) {
        equal(id, 9999, 'direct data property should be passed properly');
        click($(renderTo).find('h2'));
      },
      clickHere2: function(hash) {
        equal(hash, 'top', 'hash argument should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234?#top');
});

test('Passing multiple arguments directly from data', function(assert) {
  var done = assert.async();
  var html = '<div><h1 action="clickHere(id, name, hash)">Hi</h1></div>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      this.data.id = 2015;
      this.data.name = 'Web Package Manager';
    },

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(id, name) {
        equal(id, 2015, 'first direct data property should be passed properly');
        equal(name, 'Web Package Manager', 'second direct data property should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234?#top');
});

test('Passing arguments from data.queryParams', function(assert) {
  var done = assert.async();
  var html = '<div><h1 action="clickHere(queryParams.id, queryParams.name)">Hi</h1></div>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(id, name) {
        equal(id, 2015, 'first direct data property should be passed properly');
        equal(name, 'Web Package Manager', 'second direct data property should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234?id=2015&name=Web Package Manager');
});

test('Passing arguments from data.args', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id/:name',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(id, name, event, element) {
        equal(id, 1234, 'first direct data property should be passed properly');
        equal(name, 'Web Package Manager', 'second direct data property should be passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Passing whole arguments', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(args) {
        deepEqual(args, this.data.args, 'args is not passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234');
});

test('Passing whole model', function(assert) {
  var done = assert.async();

  var html = '<h1 action="clickHere(model)">Hi</h1>';
  var modelData = {name: 'Web Package Manager', year: 2015};

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      return modelData;
    },

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(model) {
        deepEqual(model, modelData, 'model is not passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234');
});

test('Passing whole queryParams', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(queryParams)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(queryParams) {
        deepEqual(queryParams, this.data.queryParams, 'queryParams is not passed properly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234');
});

test('Passing model data by key', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(model.name)">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      return { name: 'IBM' };
    },

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(name) {
        deepEqual(name, this.data.model.name, 'Passing model data by key not working');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234');
});

test('Passing model value by index', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(model[1])">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id',
    template: 'demo',
    renderTo: renderTo,

    model: function() {
      return ['IBM', 'Apple', 'Microsoft'];
    },

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(name) {
        deepEqual(name, this.data.model[1], 'Passing model item not working');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234');
});

test('Passing multiple data', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name, i18n.hello)">Hi</h1>';
  var i18n_signup = {
    hello: 'Hello World',
    welcome: 'Welcome to %place'
  };

  registerHandlebarsTemplate('demo', html);
  wpm.i18n('signup', i18n_signup);

  Class(Route, {
    path: '/browse/:id/:name',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      click($(renderTo).find('h1'));
    },

    actions: {
      clickHere: function(id, name, hello) {
        equal(id, this.data.args.id, 'parameter should be passed properly into action handler');
        equal(name, this.data.args.name, 'parameter should be passed properly into action handler');
        equal(hello, this.data.i18n.hello, 'i18n should be passed correctly');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Keydown action', function(assert) {
  var done = assert.async();
  var html = '<input id="myinput" type="text" action="keydown:onChange(args.id, args.name)">Hi</input>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/browse/:id/:name',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      var element = document.getElementById('myinput');
      keydown(element);
    },

    actions: {
      onChange: function(id, name, event, element) {
        equal(id, this.data.args.id, 'parameter should be passed properly into action handler');
        equal(name, this.data.args.name, 'parameter should be passed properly into action handler');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Intercept on parent route', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name)">Hi</h1>';

  registerHandlebarsTemplate('plain', '<div>Plain template: <div outlet></div></div>');
  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'plain',
    renderTo: renderTo,

    actions: {
      clickHere: function(id, name) {
        equal(id, this.data.args.id, 'parameter should be passed properly into action handler');
        equal(name, this.data.args.name, 'parameter should be passed properly into action handler');
        done();
      }
    }
  });

  Class(Route, {
    path: '/|browse/:id/:name',
    template: 'demo',
    ready: function() {
      click($(renderTo).find('h1'));
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Not bubbling action by default', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name)">Hi</h1>';

  registerHandlebarsTemplate('plain', '<div>Plain template: <div outlet></div></div>');
  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'plain',
    renderTo: renderTo,

    actions: {
      clickHere: function(id, name) {
        notOk(true, 'parent action should not be called when child already handles the action');
      }
    }
  });

  Class(Route, {
    path: '/|browse/:id/:name',
    template: 'demo',
    ready: function() {
      click($(renderTo).find('h1'));
    },
    actions: {
      clickHere: function(id, name) {
        equal(id, this.data.args.id, 'parameter should be passed properly into action handler');
        equal(name, this.data.args.name, 'parameter should be passed properly into action handler');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Children intercept actions from parent', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name)">Hi</h1>';

  registerHandlebarsTemplate('plain', '<div>Plain template: <div outlet></div>' + html + '</div>');
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'plain',
    renderTo: renderTo,

    actions: {
      clickHere: function(id, name) {
        notOk(true, 'When intercepted, parent action handled should not be called');
      }
    }
  });

  Class(Route, {
    path: '/|browse/:id/:name',
    template: 'demo',
    ready: function() {
      click($(renderTo).find('h1'));
    },
    actions: {
      clickHere: function(id, name) {
        ok(true, 'Action intercepted successfully');
        done();
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Bubbling action by return true in action handler', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere(args.id, args.name)">Hi</h1>';

  registerHandlebarsTemplate('plain', '<div>Plain template: <div outlet></div>' + html + '</div>');
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'plain',
    renderTo: renderTo,

    actions: {
      clickHere: function(id, name) {
        ok(true, 'Action bubbling handled properly. Parent got action');
        done();
      }
    }
  });

  Class(Route, {
    path: '/|browse/:id/:name',
    template: 'demo',
    ready: function() {
      click($(renderTo).find('h1'));
    },
    actions: {
      clickHere: function(id, name) {
        ok(true, 'Action bubbling handled properly. Child is able to intercept parent action');
        return true;
      }
    }
  });

  Router.transitionTo('/browse/1234/Web Package Manager');
});

test('Multiple actions', function(assert) {
  var done = assert.async();
  var html = '<h1 action="clickHere|mousedown:mousedown">Hi</h1>';

  registerHandlebarsTemplate('demo', html);

  Class(Route, {
    path: '/',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      var element = $(renderTo).find('h1');
      click(element);
      mousedown(element);
    },

    actions: {
      clickHere: function(event, element) {
        ok(true, 'Click handler is bound properly');
        ok(!!event, 'Event should be passed properly');
        ok(!!element, 'Element should be passed properly');
      },
      mousedown: function() {
        ok(true, 'Mousedown event should be bound');
        done();
      }
    }
  });

  Router.transitionTo('/');
});

test('Handle linkTo link from <a/> tag', function(assert) {
  var done = assert.async();
  var home = '<a id="goto-demo" href="/demo">Hi</a>';

  registerHandlebarsTemplate('home', home);
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'home',
    renderTo: renderTo,

    ready: function() {
      click(document.getElementById('goto-demo'));
    }
  });

  Class(Route, {
    path: '/demo',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      ok(true, 'linkTo event is handled properly on an anchor tag');
      done();
    }
  });

  Router.transitionTo('/');
});

test('Handle linkTo link from child of <a/> tag', function(assert) {
  var done = assert.async();
  var home = '<a href="/demo"><span id="goto-demo">Hi</span></a>';

  registerHandlebarsTemplate('home', home);
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'home',
    renderTo: renderTo,

    ready: function() {
      click(document.getElementById('goto-demo'));
    }
  });

  Class(Route, {
    path: '/demo',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      ok(true, 'linkTo event is handled properly on an anchor tag');
      done();
    }
  });

  Router.transitionTo('/');
});

test('Handle linkTo link from a <div/> tag', function(assert) {
  var done = assert.async();
  var home = '<div id="goto-demo" href="/demo">Hi</div>';

  registerHandlebarsTemplate('home', home);
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'home',
    renderTo: renderTo,

    ready: function() {
      click(document.getElementById('goto-demo'));
    }
  });

  Class(Route, {
    path: '/demo',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      ok(true, 'linkTo event is handled properly on an anchor tag');
      done();
    }
  });

  Router.transitionTo('/');
});

test('Handle linkTo link from child of <div/> tag', function(assert) {
  var done = assert.async();
  var home = '<div href="/demo"><span id="goto-demo">Hi</span></div>';

  registerHandlebarsTemplate('home', home);
  registerHandlebarsTemplate('demo', '<p>Nothing here</p>');

  Class(Route, {
    path: '/',
    template: 'home',
    renderTo: renderTo,

    ready: function() {
      click(document.getElementById('goto-demo'));
    }
  });

  Class(Route, {
    path: '/demo',
    template: 'demo',
    renderTo: renderTo,

    ready: function() {
      ok(true, 'linkTo event is handled properly on an anchor tag');
      done();
    }
  });

  Router.transitionTo('/');
});
