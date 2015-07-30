/*jshint*/
/*globals module, test, ok, wpm, equal, notEqual, notOk, deepEqual*/

var RouteParser = wpm.RouteParser;

module('Parser', {
  beforeEach: function() {
  },
  afterEach: function() {
  }
});

test('Test separateUriString', function() {
  var parser = new RouteParser();

  deepEqual(parser.separateUriString(), { route: '', query: '', hash: '' }, 'called without parameter');
  deepEqual(parser.separateUriString(true), { route: '', query: '', hash: '' }, 'called with non-string parameter');
  deepEqual(parser.separateUriString(''), { route: '', query: '', hash: '' }, 'called with an empty string');
  deepEqual(parser.separateUriString('/?a=b'), { route: '/', query: 'a=b', hash: '' }, 'index without route name');
  deepEqual(parser.separateUriString('/?a=b&c=d&e'), { route: '/', query: 'a=b&c=d&e', hash: '' }, 'a parameter without equal');
  deepEqual(parser.separateUriString('/signup?a=b&c=d&e'), { route: '/signup', query: 'a=b&c=d&e', hash: '' }, 'route with a name');
  deepEqual(parser.separateUriString('/signup-sso?a=b&c=d&e'), { route: '/signup-sso', query: 'a=b&c=d&e', hash: '' }, 'route with name having a dash');
    deepEqual(parser.separateUriString('/signup?a=b&c=d&e#topic'), { route: '/signup', query: 'a=b&c=d&e', hash: 'topic' }, 'route with a hash');
    deepEqual(parser.separateUriString('/signup?a=b&c=d&e#topic1#topic2'), { route: '/signup', query: 'a=b&c=d&e', hash: 'topic1#topic2' }, 'route with two hashes');
});

test('Test queryParams', function() {
  var parser = new RouteParser();
  var queryParams = parser.queryParams;

  deepEqual(queryParams(''), {}, 'empty string param');
  deepEqual(queryParams('a'), { 'a': true }, 'param without value defaulted to true');
  deepEqual(queryParams('a&b'), { 'a': true, b: true }, 'two args without values');
  deepEqual(queryParams('a&b=1'), { 'a': true, 'b': '1' }, 'one default, one with value');
  deepEqual(queryParams('foobar=1&b'), { 'foobar': '1', 'b': true }, 'longer param with one param defaulted');
  deepEqual(queryParams('foo-bar=1&b'), { 'foo-bar': '1', 'b': true }, 'param with dash');
  deepEqual(queryParams('foo-bar=1&b=1'), { 'foo-bar': '1', 'b': '1' }, 'param with dash and value');
  deepEqual(queryParams('foo-bar-foo-bar=1&b'), { 'foo-bar-foo-bar': '1', 'b': true }, 'multiple dashes');

  deepEqual(queryParams('name=Tan Nhu&company=Cloudtenna Inc.'), { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' }, 'value with spaces');
  deepEqual(queryParams('name=Tan%20Nhu&company=Cloudtenna%20Inc.'), { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' }, 'values are encoded');
});

test('Register a route with a handler', function() {
  var parser = new RouteParser();

  var index = function() {
    return 'index';
  };

  var post = function() {
    return 'post';
  };

  parser.register('/', index);
  parser.register('/post', post);

  var resolver = parser.resolve('/');

  ok(resolver, 'resolved should be returned for a registered uri');
  equal(resolver.handler(resolver.args), 'index');
});

test('Resolve a unregisted route', function() {
  var parser = new RouteParser();

  equal(parser.resolve('/foobar'), undefined);
});

test('Register a registered route should be ignored', function() {
  var parser = new RouteParser();
  var handler1IsCalled, handler2IsCalled;

  var index1 = function() {
    handler1IsCalled = true;
    return 'index1';
  };

  var index2 = function() {
    handler2IsCalled = true;
    return 'index2';
  };

  parser.register('/', index1);
  parser.register('/', index2);

  var resolver = parser.resolve('/');
  equal(resolver.handler(resolver.args), 'index1');
  ok(handler1IsCalled, 'First handler should be called');
  notOk(handler2IsCalled, 'Second handler should not be called');
});

test('Unregister a route', function() {
  var parser = new RouteParser();

  function handler(args) {
    return args;
  }

  parser.register('/', handler);
  parser.register('/post', handler);
  parser.register('/inbox', handler);
  parser.register('/dashboard', handler);

  var resolver = parser.resolve('/?a=b');
  equal(resolver.handler(resolver.args), resolver.args);
  equal(parser.routes.length, 4);

  parser.unregister('/');
  equal(parser.routes.length, 3, 'Parser should reduce routes to 3');
  notOk(parser.resolve('/?a=b'), 'Resove a unregistered route should return undefine');

  parser.unregister('/post');
  equal(parser.routes.length, 2);

  parser.unregister('/inbox');
  ok(parser.routes.length, 1);

  parser.unregister('/dashboard');
  equal(parser.routes.length, 0);
});

test('Parameters passing to route handlers', function() {
  var parser = new RouteParser();

  var handler = function(args) {
    return args;
  };

  var verifier = function(route, uri, expectedParams) {
    parser.unregister(route);
    parser.register(route, handler);
    var resolver = parser.resolve(uri);

    if (resolver) {
      deepEqual(resolver.handler(resolver.args), expectedParams, 'Verify ' + uri);
    }
  };

  verifier('/', '/', { queryParams: {} });
  verifier('/', '/?a', { queryParams: { a: true } });
  verifier('/', '/?a&b', { queryParams: { a: true, b: true } });
  verifier('/', '/?foobar=1&b', { queryParams: { foobar: '1', b: true } });
  verifier('/', '/?foo-bar=1&b', { queryParams: { 'foo-bar': '1', b: true } });
  verifier('/', '/?name=Tan Nhu&company=Cloudtenna Inc.', { queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });
  verifier('/', '/?name=Tan%20Nhu&company=Cloudtenna%20Inc.', { queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });

  verifier('/signin', '/signin', { queryParams: {} });
  verifier('/signin', '/signin?a', { queryParams: { a: true } });
  verifier('/signin', '/signin?a&b', { queryParams: { a: true, b: true } });
  verifier('/signin', '/signin?foobar=1&b', { queryParams: { foobar: '1', b: true } });
  verifier('/signin', '/signin?foo-bar=1&b', { queryParams: { 'foo-bar': '1', b: true } });
  verifier('/signin', '/signin?name=Tan Nhu&company=Cloudtenna Inc.', { queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });
  verifier('/signin', '/signin?name=Tan%20Nhu&company=Cloudtenna%20Inc.', { queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });

  verifier('/signin/:companyId', '/signin/101', { companyId: '101', queryParams: {} });
  verifier('/signin/:companyId', '/signin/101?a', { companyId: '101', queryParams: { a: true } });
  verifier('/signin/:companyId', '/signin/101?a&b', { companyId: '101', queryParams: { a: true, b: true } });
  verifier('/signin/:companyId', '/signin/101?foobar=1&b', { companyId: '101', queryParams: { foobar: '1', b: true } });
  verifier('/signin/:companyId', '/signin/101?foo-bar=1&b', { companyId: '101', queryParams: { 'foo-bar': '1', b: true } });
  verifier('/signin/:companyId', '/signin/101?name=Tan Nhu&company=Cloudtenna Inc.', { companyId: '101', queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });
  verifier('/signin/:companyId', '/signin/101?name=Tan%20Nhu&company=Cloudtenna%20Inc.', { companyId: '101', queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });

  verifier('/signin/:companyId/:treeId', '/signin/101/202', { treeId: '202', companyId: '101', queryParams: {} });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?a', { treeId: '202', companyId: '101', queryParams: { a: true } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?a&b', { treeId: '202', companyId: '101', queryParams: { a: true, b: true } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?foobar=1&b', { treeId: '202', companyId: '101', queryParams: { foobar: '1', b: true } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?foo-bar=1&b', { treeId: '202', companyId: '101', queryParams: { 'foo-bar': '1', b: true } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?name=Tan Nhu&company=Cloudtenna Inc.', { treeId: '202', companyId: '101', queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?name=Tan%20Nhu&company=Cloudtenna%20Inc.', { treeId: '202', companyId: '101', queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' } });
  verifier('/signin/:companyId/:treeId', '/signin/101/202?name=Tan%20Nhu&company=Cloudtenna%20Inc.#top', { treeId: '202', companyId: '101', queryParams:   { 'name': 'Tan Nhu', 'company': 'Cloudtenna Inc.' }, hashParam: 'top' });
});
