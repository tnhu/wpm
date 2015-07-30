/*globals test, ok, equal, notOk, deepEqual, module*/

var Router = wpm.Router;
var Route = wpm.Route;

var registerHandlebarsTemplate = wpm.TemplateHelpers.registerHandlebarsTemplate;

registerHandlebarsTemplate('index1', '<h1 style="zoom: {{size}}px">Index 1</h1>');

Class(Route, {
  path: '/test/tmp.html',
  template: 'index1',
  enter: function() {
    var self = this;
    var delta = 0.5;
    self.data.size = 10;

    function run() {
      self.data.size += 0.25;
      if (self.data.size > 100) {
        self.data.size = 10;
      }
      window.requestAnimationFrame(run);
    }

    window.requestAnimationFrame(run);
  }
});

Router.replaceWith('/test/tmp.html');
