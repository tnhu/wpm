// Template helpers for testing
Class({
  constructor: function TemplateHelpers() {
  },

  registerHtmlTemplate: function(id, content) {
    wpm.registry.templates[id] = function() {
      return content;
    };
  },

  registerHandlebarsTemplate: function(id, content) {
    wpm.registry.templates[id] = window.Handlebars.compile(content);
  },

  main: function(TemplateHelpers) {
    wpm.TemplateHelpers = new TemplateHelpers();
  }
});
