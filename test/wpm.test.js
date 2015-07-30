/*global module, test, ok, equal, notOk*/

module('Framework', {
  beforeEach: function() {
  },
  afterEach: function() {
  }
});

var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

test('wpm global namespace', function() {
  ok(wpm, 'wpm global namespace should be an object');
  ok(wpm.registry, 'registry must be defined');
  ok(wpm.registry.services, 'registry.services must be defined');
  ok(wpm.registry.helpers, 'registry.helpers must be defined');
});

test('registerService()', function() {
  var SESSION = 'session';

  var SessionService = Class({
    $singleton: true,

    isSignedIn: function() {
      return true;
    }
  });

  var LoginRoute = Class({
    session: wpm.service(SESSION)
  });

  wpm.registerService(SESSION, SessionService);

  var loginRoute = new LoginRoute();

  ok(loginRoute.session, 'registerService() failed to register a service');
  equal(loginRoute.session.isSignedIn(), true, 'registerService() does not work properly');
});

test('service()', function() {
  ok(wpm.service, 'service() should be defined');
  notOk(wpm.service(), 'call service() without param should return falsy');

  var service = wpm.service('non-exist');
  ok(service, 'call service() with a valid param should return getter description');
  ok(service.get, 'description should be returned');
  notOk(service.set, 'set description should not be returned');
});

test('registerHelper()', function() {
  var UTILS = 'utils';

  var Utils = Class({
    $singleton: true,

    ping: function(value) {
      return value;
    }
  });

  var LoginRoute = Class({
    utils: wpm.helper(UTILS)
  });

  wpm.registerHelper(UTILS, Utils);

  var loginRoute = new LoginRoute();

  equal(loginRoute.utils, Utils, 'registerHelper() failed to register a service');
  equal(loginRoute.utils.ping('pong'), 'pong', 'registerHelper() does not work properly');
});

test('template()', function() {
  ok(wpm.template, 'template() should be defined');
  notOk(wpm.template(), 'call template() without param should return falsy');

  var template = wpm.template('non-exist');
  notOk(template, 'call template() with a valid param should return falsy');
});

test('registerTemplate()', function() {
  registerHandlebarsTemplate('signin', '<h1>Hello World<h1>');

  equal(wpm.template('signin')(), '<h1>Hello World<h1>', 'template is not registered properly');
});
