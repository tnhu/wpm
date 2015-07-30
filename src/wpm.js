/*!
  Web Package Manager
  Copyright (c) Tan Nhu
  MIT License: https://github.com/tnhu/wpm
*/
Class({
  $singleton: true,

  registry: {
    modules: {},             // map of modules for wpm.get/set
    settings: {},            // maps of settings
    services: {},            // map of services
    helpers: {},             // map of helpers
    actions: {               // map of action handlers
      elements: [],          //   DOM element where actions are routed
      handlers: []           //   Handlers
    },
    globalEventHandlers: [], // custom event handlers (i.e: listen to click event on document to close modal)
    templates: {}            // map of template engine instances { templateId: template renderer }
  },

  set: function(alias, Module) {
    this.registry.modules[alias] = Module;
  },

  get: function(alias) {
    return this.registry.modules[alias];
  },

  registerService: function(name, handler) {
    // TODO Prevent registering same service
    this.registry.services[name] = handler;
  },

  registerHelper: function(name, handler) {
    // TODO Prevent registering same helper
    this.registry.helpers[name] = handler;
  },

  registerTemplate: function(templateId, renderer) {
    this.registry.templates[templateId] = renderer;
  },

  registerActionsHandlerForElement: function(element, handler) {
    var actions = this.registry.actions;

    if (handler && actions.elements.indexOf(element) === -1) {
      actions.elements.push(element);
      actions.handlers.push(handler);
    }
  },

  unregisterActionsHandlerForElement: function(element) {
    var actions = this.registry.actions;
    var index = actions.elements.indexOf(element);

    if (index !== -1) {
      actions.elements.splice(index, 1);
      actions.handlers.splice(index, 1);
    }
  },

  registerGlobalEventHandler: function(handler) {
    var globalEventHandlers = this.registry.globalEventHandlers;

    if (globalEventHandlers.indexOf(handler) === -1) {
      globalEventHandlers.push(handler);
    }
  },

  unregisterGlobalEventHandler: function(handler) {
    var globalEventHandlers = this.registry.globalEventHandlers;
    var index = globalEventHandlers.indexOf(handler) ;

    if (index !== -1) {
      globalEventHandlers.splice(index, 1);
    }
  },

  lookupRegistry: function(registryName, registryEntry) {
    if (registryName && typeof(registryName) === 'string') {
      return {
        get: function() {
          var entry = registryEntry[registryName];

          if (!entry) {
            console.error('wpm: registry not found for name:', registryName);
          }
          else {
            return entry;
          }
        }
      };
    }
  },

  service: function(name) {
    return this.lookupRegistry(name, this.registry.services);
  },

  helper: function(name) {
    return this.lookupRegistry(name, this.registry.helpers);
  },

  template: function(templateId) {
    return this.registry.templates[templateId];
  },

  config: function(key, map) {
    if (!map && typeof(key) === 'object') {
      for (var _key in key) {
        this.config(_key, key[_key]);
      }
    }

    var settings = this.registry.settings;
    settings = settings[key] = settings[key] || {};

    if (map) {
      for (var k in map) {
        settings[k] = map[k];
      }
    }
    return settings;
  },

  i18n: function(moduleName, map) {
    var i18n = this.config('i18n:' + moduleName, map);
    var app, key;

    if (!map && moduleName !== 'app') {
      app = this.config('i18n:app');

      for (key in app) {
        if (!i18n[key]) {
          i18n[key] = app[key];
        }
      }
    }
    return i18n;
  },

  //--- UTILITIES ---//

  createElementFromHTML: function(html) {
    var dom = document.createElement('div');
    dom.innerHTML = html;

    if (dom.children.length > 1) {
      console.log('wpm: Warning: HTML content has more than one roots:', html);
    }

    return dom.firstChild;
  },

  main: function(wpm) {
    window.wpm = wpm;
  }
});
