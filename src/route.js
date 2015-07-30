Class({
  /**
   * Intercept sup-classes and register them as routes.
   * @param {Class}  Route Route class
   * @param {Class}  parent Parent class
   * @param {Object} api Route api
   */
  $ready: function(Route, parent, api) {
    if (this !== Route) {
      if (api.path) {
        Route.parent = null;
        wpm.Router.registerRoute(Route, api.path, api.template);

        // Merge actions
        var index = parent && parent.length;
        var RouteActions = Route.prototype.actions || {};
        var pa, actions, key;

        while (index--) {
          pa = parent[index];
          actions = pa.prototype && pa.prototype.actions;

          for (key in actions) {
            if (!RouteActions[key]) {
              RouteActions[key] = actions[key];
            }
          }
        }
        Route.prototype.actions = RouteActions;
      }
      else {
        throw 'wpm: Route must have a valid path';
      }
    }
  },

  /** Readonly route instance unique id */
  id: null,

  /**
   * Route's state (either 'enter', 'preModel', 'model', 'render', 'ready', 'resign', 'pause', 'resume', or 'exit').
   * @readonly
   */
  state: null,

  /**
   * URI which an instance of Route is bound with
   * @readonly
   */
  uri: null,

  /** Router service. */
  router: wpm.service('router'),

  /** i18n service */
  i18n: wpm.i18n('app'),

  /**
   * jQuery element(s) representing the route after rendering.
   * @readonly
   */
  dom: null,

  /**
   * Outlet's DOM element representing placeholder where children will be rendered to.
   * @readonly
   */
  outlet: null,

  /** DOM location where the route will be rendered to */
  renderTo: null,

  /** Parent route */
  parentRoute: null,

  /** Route title */
  title: null,

  /**
   * Enter hook. This is the first method wpm will invoke
   * when it starts routing a route. Use this hook to cancel route route
   * by rejecting router's promisse using route.push() or route.replace().
   */
  enter: function() {},

  /**
   * Hook for retrieveing initial data model to render route when model() is not yet
   * resolved. Use this to render route in blank/empty state (for example, loading mode).
   * If preModel() returns undefined, route initial state will not be rendered.
   */
  preModel: function() {},

  /** Hook for retrieving data model for route. wpm calls this method after enter(). */
  model: function() {},

  /**
   * Hook for filtering and saving data model. wpm calls this medhod when model() is resolved successfully.
   * Return value of this method is used to resolve render().
   */
  postModel: function(model) {
    return model;
  },

  /**
   * Observe change on data property and rerender route, if needed.
   * @param   {Object} model Model object.
   * @returns {Object} The model itself.
   */
  observe: function() {
    var self = this;
    var READY = wpm.Router.READY;

    this.unobserve();                                                          // unobserve, if there's an observer
    this.observer = new DeepObserver(this.data);                               // Create a new DeepObserver instance
    this.observer.open(function(added, removed, changed, getOldValueFn) {      // When data is changed, call router.routeDataChanged
      if (self.state === READY && !self.pauseDataObserver) {
        console.log('wpm: Data changed on route:', self);
        self.router.routeDataChanged(self);                                    // Route does not render itself, pass to router
      }
    });
  },

  /**
   * Ubobserve data property change.
   */
  unobserve: function() {
    if (this.observer) {
      this.observer.close();
      delete this.observer;
    }
  },

  /**
   * Render route. wpm calls this method after model() is resolved.
   * @param {Object} model any data model returned from preModel() or postModel().
   * @returns {String} HTML content.
   */
  render: function() {
    if (!this.template) {
      throw 'Render failed on route (path: ' + this.path + '): template is not defined';
    }

    var renderer = wpm.template(this.template);
    if (!renderer) {
      throw 'Render failed on route (path: ' + this.path + ', template: ' + this.template + '). Renderer not found.';
    }

    return renderer(this.data);
  },

  /**
   * Mount HTML content generated by render() to document.
   * @param {String} html HTML content returned from render().
   */
  mount: function(html) {
    var rendererData = {};
    html = html || '<div></div>';

    if (!this.renderer) {
      this.renderer = this.Class.renderer;
    }

    if (!this.renderer) {
      this.renderer = this.Class.renderer = window.htmlRenderer(this.renderTo, html, rendererData);
      this.Class.renderer.element = rendererData.element;
    }
    else {
      this.renderer(html);
    }

    this.dom = this.renderer.element;
    this.renderer.route = this;                       // renderer points to active route
    this.outlet = this.dom.querySelector('[outlet]');
    this.reflectDomBindingsToProperties();
    this.router.makeReadonly(this, 'renderer', 'dom', 'outlet');  // TODO refactor makeReadOnly out of wpm.Router

    // console.log('wpm: Route (path:', this.path + ', template:', this.template + ', uri:', this.uri + ') rendered');
  },

  /**
   * Unmount route content, remove its DOM.
   * @param   {Object} data Data passed from previous resolver.
   * @returns {Object} data.
   */
  unmount: function(data) {
    if (this.dom) {
      this.dom.remove();
    }
    return data; // return whatever passed from previous resolver
  },

  /**
   * Reflect DOM bindings to properties. This method is called once when route is mounted. Route's binding DOMs are
   * queried and values are set back to its route binding properties.
   */
  reflectDomBindingsToProperties: function() {
    var self = this;
    var elements = this.dom.querySelectorAll('[binding]');

    if (elements && elements.length) {
      elements = [].slice.call(elements);

      this.unobserve();                // temporarily disable data observer

      elements.forEach(function(element) {
        var bindingSelector = element.getAttribute('binding');
        var nodeName = element.nodeName.toLowerCase();

        if (element.type === 'checkbox') {
           self.router.setObjectProperty(self.data, bindingSelector, element.checked);
        }
        else if (element.type === 'radio' && element.checked) {
           self.router.setObjectProperty(self.data, bindingSelector, element.value);
        }
        else if (element.type !== 'radio' && ['input', 'textarea', 'select'].indexOf(nodeName) !== -1) {
           self.router.setObjectProperty(self.data, bindingSelector, element.value);
        }
      });

      this.renderer(this.render());    // re-render (if value change in properties triggers a vdom diff)
      this.observe();                  // enable data observer again
    }
  },

  /** Ready hook. wpm calls this method after render() is resolved, or route is ready. */
  ready: function() {},

  /**
   * Resign hook. wpm calls this method to ask the active route to resign. If the
   * active route returns a reject Promise, it will retain its active status. This hook gives active
   * route a chance to save its working states before being put into background.
   */
  resign: function() {},

  /**
   * Pause hook. wpm calls this method when a route already lost
   * its active state (aka transition to another route).
   */
  pause: function() {},

  /**
   * Resume hook. wpm calls this method when a route gains its
   * active state again.
   */
  resume: function() {},

  /**
   * Exit hook. wpm calls this method when an active route is replaced
   * by another route.
   */
  exit: function() {},

  /**
   * Fail hook. wpm calls this method if any error occurs during a route transition.
   * @param {Object} error Error detailed object.
   * @param {String} hook Hook name ('enter', 'preModel', 'model', 'render', 'ready', 'pause', 'resume', or 'exit').
   */
  fail: function(error) {
    var stack = error && error.stack || '';

    if (this.state !== 'abort') {
      stack = stack ? '. Location: ' + stack : stack;
      console.error('wpm: Route', this.path, '(uri:', this.uri + ') failed at state "' + this.state + '". Error:', error, stack);
    }
    else {
      console.log('wpm: Route', this.path, '(uri:', this.uri + ') aborted.');
    }
  },

  /**
   * Hide route.
   */
  hide: function() {
    if (this.renderer.route === this) {
      this.dom.style.display = 'none';                                         // TODO Add plugin mechanism to add extra thing like animation and optimize
    }
  },

  /**
   * Show route.
   */
  show: function() {
    this.dom.style.display = '';                                               // TODO Add plugin mechanism to add extra thing like animation and optimize
  },

  /**
   * Clean up route when it exits. This method is called by wpm's scheduler. Don't call it directly.
   */
  destroy: function() {
    delete this.Class.instances[this.id];
    var self = this;
    var timeout = 3000;

    // Schedule to clean up references
    setTimeout(function() {
      if (self.renderer && self.renderer.route === self) {                     // If no other has claimed renderer.route
        if (self.dom.parentNode) {
          self.dom.parentNode.removeChild(self.dom);                             // then remove dom completely
        }
        delete self.Class.renderer;                                            // and remove reference from Class
      }
      for (var prop in self) {                                                 // Remove other references
        delete self[prop];
      }
    }, timeout);
  },

  /**
   * Refresh route. Refresh will try to resolve model(), then render(), then ready() without changing route state.
   */
  refresh: function() {
    console.error('TO BE IMPLEMENTED');
  },

  /** Main entry point. */
  main: function(Route) {
    wpm.Route = Route;
  }
});