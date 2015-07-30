/*globals $, test, ok, wpm, Class, equal, notOk, deepEqual, module, window, document*/

var Router = wpm.Router;
var path = Router.routeURIFromLocation();
var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;
var registerHtmlTemplate = wpm.TemplateHelpers.registerHtmlTemplate;

module('Template', {
  beforeEach: function() {
    Router.routes = {};
    Router.routeHandlers = {};
    wpm.registry.templates = {};
  },
  afterEach: function() {
    window.history.replaceState(null, null, path);
  }
});

test('Register an HTML template', function() {
  var templateId = 'signin';
  var content = '<h1>Hello World<h1>';

  registerHtmlTemplate(templateId, content);

  var renderer = wpm.template(templateId);

  ok(!!renderer, 'Template engine should be registered');
});

test('Render an Handlebars template', function() {
  var templateId = 'signin';
  var content = 'Hi {{name}}';
  var msg = 'Hi WPM';

  registerHandlebarsTemplate(templateId, content);

  var renderer = wpm.template(templateId);
  var output = renderer({name: 'WPM'});

  equal(output, msg, 'Handlebars engine should render properly');
});
