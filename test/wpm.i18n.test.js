/*global module, test, ok, equal, notOk*/

module('i18n', {
  beforeEach: function() {
  },
  afterEach: function() {
  }
});

test('extend i18n from app', function() {
  delete wpm.registry.settings['i18n:app'];
  delete wpm.registry.settings['i18n:signin'];

  var app = {
    title: 'app',
    foo: 'foo'
  };
  var signin = {
    title: 'signin',
    bar: 'bar'
  };
  var result = {
    foo: 'foo',
    title: 'signin',
    bar: 'bar'
  };

  wpm.i18n('app', app);
  wpm.i18n('signin', signin);

  deepEqual(wpm.i18n('app'), app, 'app i18n should be set properly');
  deepEqual(wpm.i18n('signin'), result, 'extend app i18n should be set properly');
});

test('add extra keys into pre-defined i18n', function() {
  delete wpm.registry.settings['i18n:app'];
  delete wpm.registry.settings['i18n:signin'];

  var app = {
    title: 'app',
    foo: 'foo'
  };
  var signin = {
    title: 'signin',
    bar: 'bar'
  };
  var result = {
    foo: 'foo',
    title: 'signin',
    bar: 'bar',
    name: 'wpm'
  };

  wpm.i18n('app', app);
  wpm.i18n('signin', signin);
  wpm.i18n('signin', {
    name: 'wpm'
  });

  deepEqual(wpm.i18n('app'), app, 'app i18n should be set properly');
  deepEqual(wpm.i18n('signin'), result, 'extend app i18n should be set properly');
});
